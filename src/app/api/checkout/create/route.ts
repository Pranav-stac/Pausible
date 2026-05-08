import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import Razorpay from "razorpay";
import { verifyIdToken } from "@/lib/api/verify-user";
import { getAdminFirestore } from "@/lib/firebase/server";
import { DEFAULT_PRICE_INR, lookupDiscountPercent, priceAfterDiscount } from "@/lib/pricing";

const bodySchema = z.object({
  attemptId: z.string(),
  provider: z.enum(["stripe", "razorpay", "paypal"]),
  referralCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const json: unknown = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  const user = await verifyIdToken(authHeader);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: "Firestore admin not configured" }, { status: 503 });

  const attemptSnap = await db.collection("attempts").doc(parsed.data.attemptId).get();
  if (!attemptSnap.exists) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  if (String(attemptSnap.get("uid")) !== user.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const referral = parsed.data.referralCode ?? "";
  const discount = lookupDiscountPercent(referral);
  const amountInr = priceAfterDiscount(DEFAULT_PRICE_INR, discount);
  const amountPaise = Math.max(100, Math.round(amountInr * 100));

  const origin =
    req.headers.get("origin") ??
    req.headers.get("referer") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  if (parsed.data.provider === "stripe") {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    const stripe = new Stripe(secret);
    const okUrl = new URL("/api/checkout/stripe-return", origin);
    okUrl.searchParams.set("attemptId", parsed.data.attemptId);
    const cancelUrl = new URL("/checkout", origin);
    cancelUrl.searchParams.set("attemptId", parsed.data.attemptId);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${okUrl.toString()}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl.toString(),
      client_reference_id: parsed.data.attemptId,
      metadata: { uid: user.uid, attemptId: parsed.data.attemptId },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "inr",
            unit_amount: amountPaise,
            product_data: { name: "Pausible fitness behavioral assessment" },
          },
        },
      ],
    });

    return NextResponse.json({ url: session.url });
  }

  if (parsed.data.provider === "razorpay") {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });

    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: parsed.data.attemptId.slice(0, 40),
      notes: { uid: user.uid, attemptId: parsed.data.attemptId },
    });

    return NextResponse.json({
      razorpay: {
        keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        name: "Pausible",
      },
    });
  }

  if (parsed.data.provider === "paypal") {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !secret) return NextResponse.json({ error: "PayPal not configured" }, { status: 503 });

    const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      return NextResponse.json({ error: "PayPal auth failed" }, { status: 503 });
    }

    const orderRes = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "INR", value: amountInr.toFixed(2) },
            custom_id: `${user.uid}:${parsed.data.attemptId}`,
          },
        ],
        application_context: {
          return_url: `${origin}/api/checkout/paypal-return`,
          cancel_url: `${origin}/checkout?attemptId=${encodeURIComponent(parsed.data.attemptId)}`,
        },
      }),
    });

    const order = (await orderRes.json()) as {
      id?: string;
      links?: { href: string; rel: string; method: string }[];
    };

    const approve = order.links?.find((l) => l.rel === "approve")?.href;
    if (!approve) return NextResponse.json({ error: "Unable to create PayPal order" }, { status: 503 });
    return NextResponse.json({ url: approve });
  }

  return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
}
