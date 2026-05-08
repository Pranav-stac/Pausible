import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-3 py-16 sm:px-4">
      <Link href="/" className="text-sm font-semibold text-sky-700">
        ← Home
      </Link>
      <h1 className="mt-6 text-3xl font-semibold text-slate-900">Terms</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        Placeholder terms. Replace with counsel-reviewed copy before launch. Payments are processed by third-party
        providers; Pausible stores assessment responses per your Firebase security rules and product settings.
      </p>
    </div>
  );
}
