import { Suspense } from "react";
import { CheckoutClient } from "@/components/CheckoutClient";
import { loadPublicPriceBootstrap } from "@/lib/server/public-assessment-bootstrap";

export default async function CheckoutPage() {
  const bootstrapPriceInr = await loadPublicPriceBootstrap();
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading checkout…</div>}>
      <CheckoutClient bootstrapPriceInr={bootstrapPriceInr} />
    </Suspense>
  );
}
