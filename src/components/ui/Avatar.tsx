import Image from "next/image";
import { cn } from "@/lib/utils";
import { getInitials, getAvatarColor } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

const sizeMap: Record<AvatarSize, { px: number; textClass: string }> = {
  sm: { px: 24, textClass: "text-[10px] font-semibold" },
  md: { px: 32, textClass: "text-xs font-semibold" },
  lg: { px: 40, textClass: "text-sm font-semibold" },
  xl: { px: 48, textClass: "text-base font-bold" },
};

export default function Avatar({
  name,
  src,
  size = "md",
  className,
}: AvatarProps) {
  const { px, textClass } = sizeMap[size];
  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex items-center justify-center shrink-0",
        className
      )}
      style={{ width: px, height: px, backgroundColor: bgColor }}
    >
      {src ? (
        <Image
          src={src}
          alt={name ?? "Avatar"}
          fill
          className="object-cover"
          sizes={`${px}px`}
        />
      ) : (
        <span className={cn("text-white select-none leading-none", textClass)}>
          {initials}
        </span>
      )}
    </div>
  );
}
