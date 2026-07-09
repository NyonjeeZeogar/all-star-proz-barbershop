import React from "react";

export default function SectionHeading({ label, title, align = "left", className = "" }) {
  const alignClass = align === "center" ? "items-center text-center" : "items-start text-left";
  return (
    <div className={`flex flex-col gap-2 ${alignClass} ${className}`}>
      {label && (
        <span className="font-heading text-xs font-bold tracking-[0.25em] text-ink/50">
          {label}
        </span>
      )}
      <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-ink text-balance">
        {title}
      </h1>
    </div>
  );
}
