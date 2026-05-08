import type { SVGProps } from "react";

export function ArrowRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden stroke="currentColor" fill="none" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14m-4 4 4-4-4-4" />
    </svg>
  );
}

export function CheckCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="none" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.5} className="text-emerald-400" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        className="text-emerald-600"
      />
    </svg>
  );
}

export function Stars() {
  return (
    <div className="flex gap-1 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="h-4 w-4" viewBox="0 0 20 20" aria-hidden fill="currentColor">
          <path d="M10 14.174 4.764 17.06l1.003-5.845-4.261-4.157 5.892-.867L10 .62l2.642 5.578 5.892.867-4.261 4.157 1.003 5.846z" />
        </svg>
      ))}
    </div>
  );
}
