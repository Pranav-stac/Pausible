import { NextRequest, NextResponse } from "next/server";
import { markAttemptPaidViaAdmin } from "@/lib/server/mark-attempt-paid";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("token");
  if (!orderId) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  const auth = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const authJson = (await auth.json()) as { access_token?: string };
  if (!authJson.access_token) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  const orderRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${authJson.access_token}`,
    },
  });
  const order = (await orderRes.json()) as {
    status?: string;
    purchase_units?: { custom_id?: string }[];
  };

  const custom = order.purchase_units?.[0]?.custom_id ?? "";
  const [uid, attemptId] = custom.split(":");
  if (!uid || !attemptId) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  const capture = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authJson.access_token}`,
      "Content-Type": "application/json",
    },
  });
  const captureJson = (await capture.json()) as {
    status?: string;
    purchase_units?: { payments?: { captures?: { id?: string }[] } }[];
  };

  if (captureJson.status !== "COMPLETED") {
    return NextResponse.redirect(new URL(`/checkout?attemptId=${encodeURIComponent(attemptId)}`, req.nextUrl));
  }

  const paymentId = captureJson.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? orderId;

  await markAttemptPaidViaAdmin({
    uid,
    attemptId,
    paymentProvider: "paypal",
    paymentId,
  });

  return NextResponse.redirect(new URL(`/results/${encodeURIComponent(attemptId)}`, req.nextUrl));
}
