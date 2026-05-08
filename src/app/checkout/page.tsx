import { Suspense } from "react";
import { CheckoutClient } from "@/components/CheckoutClient";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading checkout…</div>}>
      <CheckoutClient />
    </Suspense>
  );
}
