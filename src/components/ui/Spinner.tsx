import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4 border-[2px]",
  md: "w-6 h-6 border-[2px]",
  lg: "w-8 h-8 border-[3px]",
};

export default function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border-current border-r-transparent animate-spin",
        sizeClasses[size],
        "text-[#1B3A6B]",
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
