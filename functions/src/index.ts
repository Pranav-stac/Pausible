import * as functions from "firebase-functions/v1";

/**
 * Placeholder HTTP function — extend with Razorpay/Stripe/PayPal webhooks and server-side rescoring.
 * Deploy: `cd functions && npm install && npm run build && firebase deploy --only functions`
 */
export const health = functions.https.onRequest((_req, res) => {
  res.status(200).send("Pausible functions OK");
});
