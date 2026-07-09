import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function CtaButton({ to, children, variant = "blue", className = "" }) {
  const variants = {
    blue: "bg-cta text-white hover:bg-cta/90",
    dark: "bg-ink text-white hover:bg-ink/90",
    outline: "border border-ink text-ink hover:bg-ink hover:text-white",
    cyan: "bg-cyanAccent text-ink hover:bg-cyanAccent/80",
  };
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-heading text-sm font-bold tracking-wide transition-all",
        variants[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}
