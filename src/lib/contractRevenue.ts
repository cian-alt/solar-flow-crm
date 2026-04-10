import { parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";

export type ContractForRevenue = {
  onboarding_fee: number | null;
  payment_type: string;
  phases: Array<{ monthly_price: number; start_date: string; end_date: string }>;
  lead: { stage: string; updated_at: string } | null;
};

/** Inclusive month count between two YYYY-MM-DD strings. */
export function monthsBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  try {
    const s = parseISO(start);
    const e = parseISO(end);
    const diff =
      (e.getFullYear() - s.getFullYear()) * 12 +
      (e.getMonth() - s.getMonth()) +
      1;
    return Math.max(0, diff);
  } catch {
    return 0;
  }
}

/**
 * Returns the contract revenue attributable to a given calendar month.
 *
 * - Upfront contracts: full value (onboarding + all phase totals) is booked in
 *   the month the deal was closed.
 * - Monthly contracts: onboarding fee is booked in the close month; each phase
 *   contributes `monthly_price` in every calendar month it overlaps.
 */
export function contractRevenueForMonth(
  contracts: ContractForRevenue[],
  monthStart: Date,
  monthEnd: Date
): number {
  let total = 0;

  for (const contract of contracts) {
    if (!contract.lead || contract.lead.stage !== "Closed Won") continue;
    const closedAt = new Date(contract.lead.updated_at);

    if (contract.payment_type === "upfront") {
      // Entire contract value booked in the month the deal closed
      if (closedAt >= monthStart && closedAt < monthEnd) {
        total += contract.onboarding_fee ?? 0;
        for (const phase of contract.phases ?? []) {
          if (!phase.start_date || !phase.end_date) continue;
          const m = monthsBetween(phase.start_date, phase.end_date);
          total += (phase.monthly_price ?? 0) * m;
        }
      }
    } else {
      // Onboarding fee counts in the month the deal closed
      if (closedAt >= monthStart && closedAt < monthEnd) {
        total += contract.onboarding_fee ?? 0;
      }
      // Each phase contributes monthly_price in every month it overlaps
      for (const phase of contract.phases ?? []) {
        if (!phase.start_date || !phase.end_date) continue;
        try {
          const phaseStart = parseISO(phase.start_date);
          const phaseEnd = parseISO(phase.end_date);
          // Mid-month point to test overlap
          const midMonth = new Date((monthStart.getTime() + monthEnd.getTime()) / 2);
          if (
            isWithinInterval(midMonth, {
              start: startOfDay(phaseStart),
              end: endOfDay(phaseEnd),
            })
          ) {
            total += phase.monthly_price ?? 0;
          }
        } catch {
          // skip phases with malformed dates
        }
      }
    }
  }

  return total;
}

/** Total all-time revenue from a set of contracts (all phases, regardless of month). */
export function contractsTotalRevenue(contracts: ContractForRevenue[]): number {
  return contracts.reduce((sum, c) => {
    if (!c.lead || c.lead.stage !== "Closed Won") return sum;
    const fee = c.onboarding_fee ?? 0;
    const phasesTotal = (c.phases ?? []).reduce((ps, p) => {
      const m = monthsBetween(p.start_date ?? "", p.end_date ?? "");
      return ps + (p.monthly_price ?? 0) * m;
    }, 0);
    return sum + fee + phasesTotal;
  }, 0);
}
