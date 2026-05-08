# Pausible — Fitness behavioral assessment

Next.js (App Router) + Firebase (Auth / Firestore) + Stripe, Razorpay, and PayPal checkouts.

## Local development

1. Copy [`.env.example`](./.env.example) to `.env.local` and fill Firebase public keys for full auth + persistence. Without Firebase, the app uses a local browser ID and `localStorage` for attempts (fine for UI work).
2. `npm install`
3. `npm run dev` → [http://localhost:3000](http://localhost:3000)

**Dev payment**: With `NEXT_PUBLIC_DEV_PAYMENTS=true` (or running in `development`), checkout shows “Simulate successful payment,” which finalizes the attempt client-side (and writes share snapshots when applicable).

## Firebase

- Rules: [`firebase/firestore.rules`](./firebase/firestore.rules)
- Indexes: [`firebase/firestore.indexes.json`](./firebase/firestore.indexes.json)
- Deploy rules: `firebase deploy --only firestore` (from project root with Firebase CLI configured)

Set **`FIREBASE_ADMIN_CREDENTIALS_JSON`** (single-line service account JSON string) on the server for:

- `/api/checkout/create` (paid sessions against real attempts)
- `/api/checkout/stripe-return` and PayPal capture flows
- `/api/admin/export` (Excel of attempts)

Grant **`admin: true`** custom claim to privileged users, **or** set **`ADMIN_UIDS`** (comma-separated UIDs) to allow admin export without claims.

## Payments

| Provider | Env vars | Notes |
|----------|-----------|--------|
| Stripe | `STRIPE_SECRET_KEY`, Checkout success via `/api/checkout/stripe-return` | Uses hosted Checkout Session (INR). |
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Returns order for client Checkout.js. **Webhook** should confirm payment in production ([`functions/`](./functions/) stub). |
| PayPal | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | REST order + `/api/checkout/paypal-return`. |

Prioritize one provider for launch; keep keys in Vercel/hosting env, never in client bundles (except publishable Stripe/Razorpay key IDs).

## Deployment checklist

- [ ] `NEXT_PUBLIC_SITE_URL` production URL (metadata + redirects).
- [ ] All payment secrets + webhook endpoints registered.
- [ ] Firestore rules deployed; composite index for `attempts` (`uid` + `createdAt`) if prompted by Firebase console.
- [ ] Optional: deploy [`functions/`](./functions/) for webhooks and batch jobs.

## Project layout (high level)

- `src/app/` — routes: landing, assessment, checkout, results, share, admin, APIs under `api/`.
- `src/components/` — marketing shell, assessment runner, checkout/results/share UI.
- `src/lib/` — Firebase client/server, scoring, pricing, attempt/share services.
- `firebase/` — Firestore rules and indexes.
- `functions/` — Firebase Cloud Functions stub.
