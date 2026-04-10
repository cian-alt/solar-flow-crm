import { cn } from "@/lib/utils";

interface SolarFlowLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export default function SolarFlowLogo({
  size = 32,
  className,
  showText = true,
}: SolarFlowLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Center circle */}
        <circle cx="16" cy="16" r="5.5" fill="#1B3A6B" />

        {/* 8 rays */}
        {/* Top */}
        <rect x="15" y="1" width="2" height="5" rx="1" fill="#1B3A6B" />
        {/* Bottom */}
        <rect x="15" y="26" width="2" height="5" rx="1" fill="#1B3A6B" />
        {/* Left */}
        <rect x="1" y="15" width="5" height="2" rx="1" fill="#1B3A6B" />
        {/* Right */}
        <rect x="26" y="15" width="5" height="2" rx="1" fill="#1B3A6B" />
        {/* Top-right diagonal */}
        <rect
          x="22.6"
          y="4.5"
          width="2"
          height="5"
          rx="1"
          fill="#1B3A6B"
          transform="rotate(45 23.6 7)"
        />
        {/* Bottom-left diagonal */}
        <rect
          x="7.4"
          y="22.5"
          width="2"
          height="5"
          rx="1"
          fill="#1B3A6B"
          transform="rotate(45 8.4 25)"
        />
        {/* Top-left diagonal */}
        <rect
          x="4.5"
          y="4.5"
          width="2"
          height="5"
          rx="1"
          fill="#1B3A6B"
          transform="rotate(-45 5.5 7)"
        />
        {/* Bottom-right diagonal */}
        <rect
          x="25.5"
          y="22.5"
          width="2"
          height="5"
          rx="1"
          fill="#1B3A6B"
          transform="rotate(-45 26.5 25)"
        />
      </svg>

      {showText && (
        <span
          className="font-bold text-[#1B3A6B] tracking-tight leading-none"
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: size * 0.5625,
          }}
        >
          Solar Flow
        </span>
      )}
    </div>
  );
}
