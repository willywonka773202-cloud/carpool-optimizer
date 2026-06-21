import * as React from "react";

type Variant = "primary" | "secondary" | "ghost" | "success" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-xl " +
  "transition duration-150 ease-out active:scale-[0.97] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 " +
  "disabled:opacity-50 disabled:cursor-not-allowed select-none";

const variants: Record<Variant, string> = {
  primary:
    "text-white bg-gradient-to-r from-blue-600 to-indigo-600 " +
    "hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-950/40",
  secondary:
    "text-slate-100 bg-slate-800/80 hover:bg-slate-700/80 " +
    "border border-white/10",
  ghost:
    "text-slate-200 bg-transparent hover:bg-white/5 border border-transparent",
  success:
    "text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/40",
  danger:
    "text-white bg-red-600 hover:bg-red-500",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-14 px-5 text-base",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "secondary", size = "md", fullWidth, className = "", type = "button", ...rest },
    ref
  ) {
    const cls = [
      base,
      variants[variant],
      sizes[size],
      fullWidth ? "w-full" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");
    return <button ref={ref} type={type} className={cls} {...rest} />;
  }
);
