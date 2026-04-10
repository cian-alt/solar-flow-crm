import { cn } from "@/lib/utils";
import type { LeadStage } from "@/types/database";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "stage";

interface BadgeProps {
  variant?: BadgeVariant;
  stage?: LeadStage;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<Exclude<BadgeVariant, "stage">, string> = {
  default: "bg-slate-100 text-slate-600",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
};

const stageClassMap: Record<LeadStage, string> = {
  "New Lead": "stage-new",
  "Cold Called": "stage-cold-called",
  "Pending Demo": "stage-pending-demo",
  "Demo Scheduled": "stage-demo-scheduled",
  "Demo Done": "stage-demo-done",
  "Proposal Sent": "stage-proposal-sent",
  "Closed Won": "stage-closed-won",
  "Closed Lost": "stage-closed-lost",
};

export default function Badge({
  variant = "default",
  stage,
  children,
  className,
}: BadgeProps) {
  const baseClasses =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium leading-none whitespace-nowrap";

  if (variant === "stage" && stage) {
    return (
      <span className={cn(baseClasses, stageClassMap[stage], className)}>
        {children}
      </span>
    );
  }

  return (
    <span className={cn(baseClasses, variantClasses[variant as Exclude<BadgeVariant, "stage">], className)}>
      {children}
    </span>
  );
}
