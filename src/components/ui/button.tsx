import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "destructive" | "secondary";
type Size = "default" | "sm" | "icon";

const variantClasses: Record<Variant, string> = {
  default: "bg-blue-600 text-white hover:bg-blue-700",
  outline: "border border-slate-300 bg-white hover:bg-slate-50 text-slate-700",
  ghost: "hover:bg-slate-100 text-slate-700",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
};

const sizeClasses: Record<Size, string> = {
  default: "h-9 px-4 text-sm",
  sm: "h-8 px-3 text-sm",
  icon: "h-8 w-8 p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
