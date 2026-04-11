/**
 * Pure commission calculation helpers for Solar Flow CRM HR module.
 * No browser APIs — safe to import from server components.
 */

/**
 * Onboarding commission = (onboardingFee + firstPhaseMonthlyPrice) × rate/100
 * Per spec: commission on the upfront onboarding fee + first month payment.
 */
export function calcOnboardingCommission(
  onboardingFee: number,
  firstPhaseMonthlyPrice: number,
  ratePercent: number
): number {
  const base = (onboardingFee ?? 0) + (firstPhaseMonthlyPrice ?? 0);
  return Math.round(base * (ratePercent / 100) * 100) / 100;
}

/**
 * Retention commission = monthlyPrice × rate/100
 * Applied to each active contract phase per month.
 */
export function calcRetentionCommission(
  monthlyPrice: number,
  ratePercent: number
): number {
  return Math.round((monthlyPrice ?? 0) * (ratePercent / 100) * 100) / 100;
}

/**
 * Irish Sick Leave Act 2022 statutory entitlement per year.
 * 3 days (2022), 5 days (2023), 7 days (2024–25), 10 days (2026+)
 */
export function irishSickLeaveEntitlement(year: number): number {
  if (year <= 2022) return 3;
  if (year === 2023) return 5;
  if (year <= 2025) return 7;
  return 10; // 2026+
}

/**
 * Irish statutory sick pay: 70% of normal daily wage, capped at €110/day.
 * (Sick Leave Act 2022, based on 260 working days / year)
 */
export function irishSickDailyPay(annualSalary: number): number {
  const dailyRate = (annualSalary ?? 0) / 260;
  return Math.min(dailyRate * 0.7, 110);
}

/** Working days between two YYYY-MM-DD strings (Mon–Fri, no public holidays). */
export function workingDaysBetween(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Irish public holidays (fixed dates; excludes Easter, which varies). */
export const IRISH_PUBLIC_HOLIDAYS = [
  "01-01", // New Year's Day
  "02-03", // St Brigid's Day (first Mon Feb — approximate, adjust as needed)
  "03-17", // St Patrick's Day
  "05-05", // May Bank Holiday (first Mon May — approximate)
  "06-02", // June Bank Holiday (first Mon June — approximate)
  "08-04", // August Bank Holiday (first Mon Aug — approximate)
  "10-27", // October Bank Holiday (last Mon Oct — approximate)
  "12-25", // Christmas Day
  "12-26", // St Stephen's Day
];
