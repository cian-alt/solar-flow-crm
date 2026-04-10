import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import type { ContractForRevenue } from "./contractRevenue";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MRRMetrics {
  /** Sum of monthly_price from phases active today (Closed Won, monthly contracts). */
  currentMRR: number;
  /** Sum of monthly_price from phases with future end_date (committed recurring revenue). */
  projectedMRR: number;
  /** Monthly price from phases that started this month, on leads closed this month. */
  newMRRThisMonth: number;
  /** currentMRR equivalent for last calendar month — used to compute the trend indicator. */
  lastMonthMRR: number;
}

export interface ForecastMonth {
  /** Short month name, e.g. "Apr" */
  month: string;
  /** MRR from active monthly contract phases that overlap this calendar month. */
  contracted: number;
  /** contracted + pipeline_leads_estimate (deal_value / 12 for Demo Done + Proposal Sent). */
  pipeline: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a YYYY-MM-DD string for a Date object without timezone issues. */
function toDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** True if a phase (identified by start/end date strings) overlaps a given month range. */
function phaseOverlapsMonth(
  phaseStart: string,
  phaseEnd: string,
  monthStartStr: string,
  monthEndStr: string
): boolean {
  return phaseStart <= monthEndStr && phaseEnd >= monthStartStr;
}

// ── calculateMRR ──────────────────────────────────────────────────────────────

/**
 * Derives MRR metrics from signed monthly contracts.
 * Only `payment_type = 'monthly'` contracts on `stage = 'Closed Won'` leads are counted.
 * All calculations are pure and deterministic for a given `today` value.
 *
 * @param contracts - Normalised contract rows including embedded phases and lead info
 * @param today     - Reference date (defaults to now; injectable for testing)
 */
export function calculateMRR(
  contracts: ContractForRevenue[],
  today: Date = new Date()
): MRRMetrics {
  const todayStr = toDateStr(today);
  const thisMonthStartStr = toDateStr(startOfMonth(today));
  const thisMonthEndStr = toDateStr(endOfMonth(today));
  const lastMonthStartStr = toDateStr(startOfMonth(subMonths(today, 1)));
  const lastMonthEndStr = toDateStr(endOfMonth(subMonths(today, 1)));

  let currentMRR = 0;
  let projectedMRR = 0;
  let newMRRThisMonth = 0;
  let lastMonthMRR = 0;

  for (const contract of contracts) {
    if (!contract.lead || contract.lead.stage !== "Closed Won") continue;
    if (contract.payment_type !== "monthly") continue;

    const closedStr = toDateStr(new Date(contract.lead.updated_at));

    for (const phase of contract.phases ?? []) {
      if (!phase.start_date || !phase.end_date || !phase.monthly_price) continue;

      const price = phase.monthly_price;
      const { start_date: start, end_date: end } = phase;

      // ① Current MRR — today falls within this phase
      if (start <= todayStr && end >= todayStr) {
        currentMRR += price;
      }

      // ② Projected MRR — phase still has future billing
      if (end > todayStr) {
        projectedMRR += price;
      }

      // ③ New MRR this month — deal closed this month AND phase starts this month
      if (
        closedStr >= thisMonthStartStr &&
        closedStr <= thisMonthEndStr &&
        start >= thisMonthStartStr &&
        start <= thisMonthEndStr
      ) {
        newMRRThisMonth += price;
      }

      // ④ Last-month MRR — used for trend indicator on the Current MRR card
      if (phaseOverlapsMonth(start, end, lastMonthStartStr, lastMonthEndStr)) {
        lastMonthMRR += price;
      }
    }
  }

  return { currentMRR, projectedMRR, newMRRThisMonth, lastMonthMRR };
}

// ── forecastRevenue ───────────────────────────────────────────────────────────

/**
 * Builds MRR forecast data for the current month + `months` future months.
 *
 * - `contracted` = MRR from signed monthly-payment contracts in that calendar month
 * - `pipeline`   = contracted + (deal_value / 12) for leads in Demo Done / Proposal Sent
 *
 * @param contracts - Normalised contract rows
 * @param leads     - All leads (stage + deal_value only required)
 * @param months    - Number of future months to forecast beyond the current month
 * @param today     - Reference date (defaults to now; injectable for testing)
 */
export function forecastRevenue(
  contracts: ContractForRevenue[],
  leads: Array<{ stage: string; deal_value: number | null }>,
  months: number = 3,
  today: Date = new Date()
): ForecastMonth[] {
  // Pipeline estimate is constant across all forecast months
  const pipelineEstimate = Math.round(
    leads
      .filter((l) => l.stage === "Demo Done" || l.stage === "Proposal Sent")
      .reduce((sum, l) => sum + (l.deal_value ?? 0) / 12, 0)
  );

  return Array.from({ length: months + 1 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthStartStr = toDateStr(startOfMonth(d));
    const monthEndStr = toDateStr(endOfMonth(d));

    let contracted = 0;
    for (const contract of contracts) {
      if (!contract.lead || contract.lead.stage !== "Closed Won") continue;
      if (contract.payment_type !== "monthly") continue;
      for (const phase of contract.phases ?? []) {
        if (!phase.start_date || !phase.end_date || !phase.monthly_price) continue;
        if (phaseOverlapsMonth(phase.start_date, phase.end_date, monthStartStr, monthEndStr)) {
          contracted += phase.monthly_price;
        }
      }
    }

    return {
      month: format(d, "MMM"),
      contracted,
      pipeline: contracted + pipelineEstimate,
    };
  });
}
