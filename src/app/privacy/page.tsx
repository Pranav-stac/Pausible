import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-3 py-16 sm:px-4">
      <Link href="/" className="text-sm font-semibold text-sky-700">
        ← Home
      </Link>
      <h1 className="mt-6 text-3xl font-semibold text-slate-900">Privacy</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        Placeholder privacy policy. Replace with jurisdiction-specific disclosure. Anonymous sessions may use a
        browser-scoped identifier; optional Google linking is governed by Firebase Auth.
      </p>
    </div>
  );
}
