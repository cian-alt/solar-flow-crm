import { cn } from "@/lib/utils";

type SkeletonVariant = "text" | "card" | "avatar";

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
  lines?: number;
}

export default function Skeleton({
  variant = "text",
  width,
  height,
  className,
  lines = 1,
}: SkeletonProps) {
  if (variant === "avatar") {
    const size = height ?? width ?? 40;
    return (
      <span
        className={cn("skeleton block rounded-full shrink-0", className)}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn("skeleton block", className)}
        style={{
          width: width ?? "100%",
          height: height ?? 120,
          borderRadius: 16,
        }}
        aria-hidden="true"
      />
    );
  }

  // text variant — renders multiple lines
  if (lines > 1) {
    return (
      <div className={cn("flex flex-col gap-2", className)} aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            className="skeleton block h-4"
            style={{
              width: i === lines - 1 ? "60%" : width ?? "100%",
              borderRadius: 6,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <span
      className={cn("skeleton block h-4", className)}
      style={{ width: width ?? "100%", borderRadius: 6 }}
      aria-hidden="true"
    />
  );
}
