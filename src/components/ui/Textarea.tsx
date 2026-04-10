import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, icon: Icon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <span className="absolute left-3 top-3 text-slate-400 pointer-events-none">
              <Icon size={16} />
            </span>
          )}
          <textarea
            ref={ref}
            id={inputId}
            rows={4}
            className={cn(
              "w-full rounded-xl border bg-white/70 backdrop-blur-sm text-sm text-slate-800 placeholder:text-slate-400",
              "border-slate-200 focus:border-[#1B3A6B] focus:ring-2 focus:ring-[#1B3A6B]/20 focus:outline-none",
              "transition-all duration-150 resize-none py-2.5",
              Icon ? "pl-9 pr-3" : "px-3",
              error && "border-red-400 focus:border-red-500 focus:ring-red-200",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
