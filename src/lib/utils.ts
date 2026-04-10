import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO, isValid } from "date-fns";
import type { LeadStage } from "@/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting - Irish format DD/MM/YYYY
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return format(d, "dd/MM/yyyy");
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return format(d, "dd/MM/yyyy HH:mm");
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDaysAgo(date: string | null | undefined): string {
  if (!date) return "Never";
  const d = parseISO(date);
  if (!isValid(d)) return "Never";
  return formatDistanceToNow(d, { addSuffix: true });
}

// Currency formatting - Euros
export function formatEuro(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatEuroCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value >= 1_000_000) {
    return `€${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `€${(value / 1_000).toFixed(0)}k`;
  }
  return formatEuro(value);
}

// Lead score helpers
export type ScoreColor = "red" | "amber" | "green";

export function getScoreColor(score: number): ScoreColor {
  if (score <= 40) return "red";
  if (score <= 70) return "amber";
  return "green";
}

export function getScoreBadgeClass(score: number): string {
  const color = getScoreColor(score);
  if (color === "red") return "score-red";
  if (color === "amber") return "score-amber";
  return "score-green";
}

// Stage helpers
export const STAGE_ORDER: LeadStage[] = [
  "New Lead",
  "Cold Called",
  "Pending Demo",
  "Demo Scheduled",
  "Demo Done",
  "Proposal Sent",
  "Closed Won",
  "Closed Lost",
];

export const STAGE_COLORS: Record<LeadStage, { bg: string; text: string; cssClass: string }> = {
  "New Lead": { bg: "#E0F2FE", text: "#0369A1", cssClass: "stage-new" },
  "Cold Called": { bg: "#F1F5F9", text: "#475569", cssClass: "stage-cold-called" },
  "Pending Demo": { bg: "#FEF3C7", text: "#D97706", cssClass: "stage-pending-demo" },
  "Demo Scheduled": { bg: "#FDE68A", text: "#B45309", cssClass: "stage-demo-scheduled" },
  "Demo Done": { bg: "#DBEAFE", text: "#1D4ED8", cssClass: "stage-demo-done" },
  "Proposal Sent": { bg: "#EDE9FE", text: "#7C3AED", cssClass: "stage-proposal-sent" },
  "Closed Won": { bg: "#D1FAE5", text: "#059669", cssClass: "stage-closed-won" },
  "Closed Lost": { bg: "#FEE2E2", text: "#DC2626", cssClass: "stage-closed-lost" },
};

export function getStagePillClass(stage: LeadStage): string {
  return STAGE_COLORS[stage]?.cssClass ?? "stage-new";
}

// Time greeting
export function getGreeting(): { greeting: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { greeting: "Good morning", emoji: "🌤️" };
  if (hour < 17) return { greeting: "Good afternoon", emoji: "☀️" };
  return { greeting: "Good evening", emoji: "🌙" };
}

// Avatar initials
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Avatar color based on name
const AVATAR_COLORS = [
  "#1B3A6B", "#2C5DB4", "#7C3AED", "#059669",
  "#D97706", "#DC2626", "#0369A1", "#B45309",
];

export function getAvatarColor(name: string | null | undefined): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Lead scoring algorithm
export function calculateLeadScore(params: {
  deal_value: number | null;
  stage: LeadStage;
  follow_up_date: string | null;
  has_calls: boolean;
  has_documents: boolean;
  has_notes: boolean;
}): number {
  let score = 0;

  // Deal value points (up to 30)
  const dv = params.deal_value ?? 0;
  if (dv >= 100000) score += 30;
  else if (dv >= 50000) score += 20;
  else if (dv >= 20000) score += 12;
  else if (dv >= 5000) score += 6;

  // Stage points (up to 30)
  const stagePoints: Record<LeadStage, number> = {
    "New Lead": 0,
    "Cold Called": 5,
    "Pending Demo": 10,
    "Demo Scheduled": 15,
    "Demo Done": 20,
    "Proposal Sent": 25,
    "Closed Won": 30,
    "Closed Lost": 0,
  };
  score += stagePoints[params.stage] ?? 0;

  // Follow-up within 7 days (+15)
  if (params.follow_up_date) {
    const fu = parseISO(params.follow_up_date);
    const now = new Date();
    const diffDays = (fu.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays >= 0 && diffDays <= 7) score += 15;
  }

  // Activity bonuses
  if (params.has_calls) score += 10;
  if (params.has_documents) score += 10;
  if (params.has_notes) score += 5;

  return Math.min(100, score);
}

// Stale lead check (no activity in 14 days, not closed)
export function isLeadStale(
  lastContactedAt: string | null,
  stage: LeadStage
): boolean {
  if (stage === "Closed Won" || stage === "Closed Lost") return false;
  if (!lastContactedAt) return true;
  const d = parseISO(lastContactedAt);
  const daysSince = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > 14;
}

// CSV helpers
export function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function arrayToCSV(data: Record<string, unknown>[], headers: string[]): string {
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      const str = String(val);
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}
