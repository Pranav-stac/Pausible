"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Why pay every time I retake the assessment?",
    a: "Each run captures a fresh behavioral snapshot with updated scoring, share tokens, and reporting overhead. History stays private, while your latest paid spotlight becomes the public card you can share.",
  },
  {
    q: "Do I need an account to start?",
    a: "No. We create a secure anonymous session behind the scenes so you can resume on this device. Optional Google sign-in helps sync history when you're ready.",
  },
  {
    q: "How are payments handled?",
    a: "Stripe, Razorpay, and PayPal are wired behind a unified checkout so you can pick what works in your geography. Webhooks unlock your results only after payment succeeds.",
  },
  {
    q: "What exactly gets shared publicly?",
    a: "Only the newest paid attempt renders on your public share page/token. Past attempts stay inside your private vault—no public route exposes them.",
  },
];

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="border-t border-slate-100 bg-white px-4 py-14 sm:px-6 lg:py-20" id="faq">
      <div className="mx-auto max-w-7xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500 sm:text-xs">FAQ</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Answers to common{" "}
          <span className="bg-linear-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">questions</span>
        </h2>
        <div className="mt-10 max-w-3xl space-y-3">
          {faqs.map((f, idx) => {
            const isOpen = open === idx;
            return (
              <div
                key={f.q}
                className="overflow-hidden rounded-3xl border border-slate-200/95 bg-white shadow-[0_8px_32px_-28px_rgba(15,23,42,0.12)] ring-1 ring-slate-100/90"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-900 sm:text-base"
                  onClick={() => setOpen(isOpen ? -1 : idx)}
                >
                  <span>{f.q}</span>
                  <span className="shrink-0 tabular-nums text-lg font-light text-slate-400">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen ? (
                  <div className="border-t border-slate-100 bg-slate-50/95 px-5 py-4">
                    <p className="text-sm leading-relaxed text-slate-600">{f.a}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
