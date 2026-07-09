import React from "react";

export default function LegalText({ sections }) {
  return (
    <div className="space-y-8">
      {sections.map((s, i) => (
        <div key={i}>
          <h2 className="font-heading text-sm font-extrabold tracking-[0.18em] text-ink mb-3">
            {s.title}
          </h2>
          <div className="space-y-3 text-sm text-ink/70 leading-relaxed">
            {Array.isArray(s.body)
              ? s.body.map((p, j) => <p key={j}>{p}</p>)
              : <p>{s.body}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
