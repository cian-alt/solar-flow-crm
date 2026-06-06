/**
 * Import the SEAI registered solar-contractor list into the Solar Flow `leads` table.
 *
 * Usage:
 *   node scripts/import-seai-leads.js
 *
 * Prerequisites (run ONCE in the Supabase SQL editor):
 *   alter table public.leads
 *     add column if not exists seai_registration_number text,
 *     add column if not exists website text,
 *     add column if not exists ai_notes text;
 *
 *   -- allow the 'SEAI List' lead source
 *   alter table public.leads drop constraint if exists leads_lead_source_check;
 *   alter table public.leads add constraint leads_lead_source_check
 *     check (lead_source is null or lead_source in
 *       ('Website','Referral','Cold Call','LinkedIn','Trade Show','Google Ads',
 *        'Facebook Ads','Partner','Other','SEAI List'));
 *
 * Auth: writes go through RLS, which requires a privileged role. Add
 *   SUPABASE_SERVICE_ROLE_KEY=...   to .env.local
 * (falls back to the anon key with a warning, which RLS will likely block).
 */

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(ROOT, ".env.local") });

const CSV_PATH = path.join(ROOT, "seai-leads.csv");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const KEY = SERVICE_KEY || ANON_KEY;

// ── helpers ──────────────────────────────────────────────────────────────────

const clean = (v) => (v == null ? "" : String(v).trim());
const lower = (v) => clean(v).toLowerCase();

function buildNote(reg, coverage) {
  return `SEAI Reg: ${reg || "N/A"} | Covers: ${coverage || "N/A"}`;
}

// Append the SEAI line to ai_notes unless it (or the same reg) is already present.
function appendNote(existingNotes, reg, coverage) {
  const line = buildNote(reg, coverage);
  const cur = existingNotes || "";
  if (cur.includes(line)) return cur;
  if (reg && cur.includes(`SEAI Reg: ${reg}`)) return cur;
  return cur ? `${cur}\n${line}` : line;
}

// Some CSV rows have Company and Registration number swapped
// (e.g. Company="50751", Registration number="Get Switched Ltd").
function normalizeRow(row) {
  let company = clean(row["Company"]);
  let reg = clean(row["Registration number"]);
  if (/^\d+$/.test(company) && reg && !/^\d+$/.test(reg)) {
    [company, reg] = [reg, company];
  }
  const mobile = clean(row["Mobile"]);
  const phone = clean(row["Phone"]);
  const county = clean(row["County"]).split(",")[0].trim(); // first county in the list
  return {
    company,
    reg,
    phone: mobile || phone || null, // prefer Mobile over Phone
    email: clean(row["Email"]) || null,
    website: clean(row["Website"]) || null,
    coverage: clean(row["Domestic Nondomestic"]) || null,
    county: county || null,
  };
}

async function fetchAllLeads(supabase) {
  const all = [];
  const size = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("leads")
      .select("id, company_name, email, phone, county, website, seai_registration_number, ai_notes")
      .range(from, from + size - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return all;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !KEY) {
    console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase key in .env.local");
    process.exit(1);
  }
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`✗ CSV not found at ${CSV_PATH}`);
    process.exit(1);
  }
  if (!SERVICE_KEY) {
    console.warn("⚠ SUPABASE_SERVICE_ROLE_KEY not set — using anon key. RLS will likely reject writes.");
    console.warn("  Add SUPABASE_SERVICE_ROLE_KEY=... to .env.local and re-run.\n");
  }

  const supabase = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });

  // Verify the required columns exist before touching any data.
  const probe = await supabase.from("leads").select("seai_registration_number, website, ai_notes").limit(1);
  if (probe.error) {
    console.error("✗ Required columns are missing. Run this SQL in Supabase first:\n");
    console.error("  alter table public.leads");
    console.error("    add column if not exists seai_registration_number text,");
    console.error("    add column if not exists website text,");
    console.error("    add column if not exists ai_notes text;\n");
    console.error("  alter table public.leads drop constraint if exists leads_lead_source_check;");
    console.error("  alter table public.leads add constraint leads_lead_source_check");
    console.error("    check (lead_source is null or lead_source in");
    console.error("      ('Website','Referral','Cold Call','LinkedIn','Trade Show','Google Ads',");
    console.error("       'Facebook Ads','Partner','Other','SEAI List'));\n");
    console.error("  (Supabase said: " + probe.error.message + ")");
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: false, relax_column_count: true });
  console.log(`Read ${rows.length} rows from seai-leads.csv`);

  // Build in-memory lookup of existing leads (1 query instead of 500).
  const existing = await fetchAllLeads(supabase);
  const byCompany = new Map();
  const byEmail = new Map();
  for (const l of existing) {
    if (l.company_name) byCompany.set(lower(l.company_name), l);
    if (l.email) byEmail.set(lower(l.email), l);
  }
  console.log(`Loaded ${existing.length} existing leads for matching\n`);

  let created = 0;
  let updated = 0;
  let errors = 0;
  let processed = 0;

  for (const row of rows) {
    processed++;
    const r = normalizeRow(row);

    if (!r.company) {
      // Nothing to key on — count as an error so the totals stay honest.
      errors++;
      console.error(`  ! Row ${processed}: empty company name, skipped`);
      if (processed % 50 === 0) console.log(`… processed ${processed}/${rows.length} (created ${created}, updated ${updated}, errors ${errors})`);
      continue;
    }

    const match = byCompany.get(lower(r.company)) || (r.email ? byEmail.get(lower(r.email)) : null);

    try {
      if (match) {
        const updates = { updated_at: new Date().toISOString() };
        if (r.phone) updates.phone = r.phone;
        if (r.email) updates.email = r.email;
        if (r.website) updates.website = r.website;
        if (r.county) updates.county = r.county;
        if (r.reg) updates.seai_registration_number = r.reg;
        const newNotes = appendNote(match.ai_notes, r.reg, r.coverage);
        if (newNotes !== (match.ai_notes || "")) updates.ai_notes = newNotes;

        const { error } = await supabase.from("leads").update(updates).eq("id", match.id);
        if (error) throw error;

        // keep in-memory state fresh for duplicate CSV rows
        Object.assign(match, updates);
        updated++;
      } else {
        const insertRow = {
          company_name: r.company,
          contact_name: "", // CSV has no contact name; column is NOT NULL
          phone: r.phone,
          email: r.email,
          website: r.website,
          county: r.county,
          seai_registration_number: r.reg || null,
          contractor_type: "Solar",
          lead_source: "SEAI List",
          stage: "New Lead",
          ai_notes: buildNote(r.reg, r.coverage),
        };
        const { data, error } = await supabase
          .from("leads")
          .insert(insertRow)
          .select("id, company_name, email, ai_notes, seai_registration_number")
          .single();
        if (error) throw error;

        byCompany.set(lower(data.company_name), data);
        if (data.email) byEmail.set(lower(data.email), data);
        created++;
      }
    } catch (err) {
      errors++;
      console.error(`  ! ${r.company}: ${err.message || err}`);
    }

    if (processed % 50 === 0) {
      console.log(`… processed ${processed}/${rows.length} (created ${created}, updated ${updated}, errors ${errors})`);
    }
  }

  console.log(`\nDone — ${created} created, ${updated} updated, ${errors} errors`);
}

main().catch((err) => {
  console.error("Fatal error:", err.message || err);
  process.exit(1);
});
