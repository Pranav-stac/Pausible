import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { markAttemptPaidViaAdmin } from "@/lib/server/mark-attempt-paid";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  const attemptId = req.nextUrl.searchParams.get("attemptId");
  const secret = process.env.STRIPE_SECRET_KEY;

  if (!sessionId || !attemptId || !secret) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const uid = String(session.metadata?.uid ?? "");
  const metaAttempt = String(session.metadata?.attemptId ?? "");
  if (!uid || metaAttempt !== attemptId) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (session.payment_status !== "paid") {
    return NextResponse.redirect(new URL(`/checkout?attemptId=${encodeURIComponent(attemptId)}`, req.nextUrl));
  }

  await markAttemptPaidViaAdmin({
    uid,
    attemptId,
    paymentProvider: "stripe",
    paymentId: String(session.payment_intent ?? session.id),
  });

  return NextResponse.redirect(new URL(`/results/${encodeURIComponent(attemptId)}`, req.nextUrl));
}
