/**
 * Dependency-free Stripe Checkout + webhook verification.
 * Mirrors Execution Exchange internal/billing/stripe.go patterns.
 */

const STRIPE_API = "https://api.stripe.com";

export function stripeConfig() {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || process.env.COMMERCE_WEBHOOK_SECRET || "",
    priceDigital: process.env.STRIPE_PRICE_DIGITAL || "",
    priceTeamSeat: process.env.STRIPE_PRICE_TEAM_SEAT || "",
    commerceEnabled: String(process.env.COMMERCE_ENABLED || "false") === "true",
    provider: (process.env.COMMERCE_PROVIDER || "stripe").toLowerCase(),
  };
}

export function stripeEnabled(cfg = stripeConfig()) {
  return cfg.commerceEnabled && cfg.provider === "stripe" && cfg.secretKey.startsWith("sk_");
}

async function stripePost(path, form, secretKey) {
  const body = new URLSearchParams(form).toString();
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.error?.message || text.slice(0, 200);
    throw new Error(`stripe ${path}: ${res.status} ${msg}`);
  }
  return data;
}

/**
 * @param {{ priceId: string, customerEmail?: string, clientRef?: string, successUrl: string, cancelUrl: string, metadata?: Record<string,string>, quantity?: number }} input
 */
export async function createCheckoutSession(input) {
  const cfg = stripeConfig();
  if (!stripeEnabled(cfg)) {
    throw new Error("stripe_not_configured");
  }
  const priceId = input.priceId || cfg.priceDigital;
  if (!priceId) {
    throw new Error("stripe_price_missing");
  }
  const form = {
    mode: "payment",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": String(input.quantity || 1),
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  };
  if (input.customerEmail) form.customer_email = input.customerEmail;
  if (input.clientRef) form.client_reference_id = input.clientRef;
  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) {
      if (v != null && v !== "") form[`metadata[${k}]`] = String(v).slice(0, 500);
    }
  }
  const session = await stripePost("/v1/checkout/sessions", form, cfg.secretKey);
  return { id: session.id, url: session.url };
}

/**
 * Verify Stripe-Signature header (t=, v1= HMAC-SHA256 of `${t}.${body}`).
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export async function verifyStripeWebhookSignature(rawBody, sigHeader, secret, toleranceSec = 300) {
  if (!secret) return { ok: false, error: "no_webhook_secret" };
  if (!sigHeader) return { ok: false, error: "missing_signature" };
  let ts = "";
  const v1s = [];
  for (const part of String(sigHeader).split(",")) {
    const [k, v] = part.trim().split("=", 2);
    if (k === "t") ts = v;
    if (k === "v1") v1s.push(v);
  }
  if (!ts || v1s.length === 0) return { ok: false, error: "malformed_signature" };
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(ts));
  if (toleranceSec > 0 && (Number.isNaN(age) || age > toleranceSec)) {
    return { ok: false, error: "stale_timestamp" };
  }
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  let match = false;
  for (const v1 of v1s) {
    const got = Buffer.from(v1, "utf8");
    if (got.length === expectedBuf.length && timingSafeEqual(got, expectedBuf)) {
      match = true;
      break;
    }
  }
  return match ? { ok: true } : { ok: false, error: "signature_mismatch" };
}

export function parseCheckoutCompletedEvent(event) {
  if (!event || event.type !== "checkout.session.completed") {
    return null;
  }
  const obj = event.data?.object || {};
  return {
    type: event.type,
    sessionId: obj.id || "",
    productId: obj.metadata?.productId || "dastor-digital",
    customerEmail: obj.customer_details?.email || obj.customer_email || "",
    clientReferenceId: obj.client_reference_id || "",
    inviteCode: obj.metadata?.inviteCode || "",
    gift: obj.metadata?.gift === "1",
    paymentStatus: obj.payment_status || "",
    amountTotal: obj.amount_total,
    currency: obj.currency,
  };
}
