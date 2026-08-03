import { json, rateLimit, clientKey } from "../shared/http.js";
import {
  stripeConfig,
  verifyStripeWebhookSignature,
  parseCheckoutCompletedEvent,
} from "../shared/commerce.js";
import { grantEntitlement } from "../shared/entitlements.js";
import { createSignedManualUrl } from "../shared/storage.js";
import { sendAccessEmail } from "../shared/email.js";

function rawBody(req) {
  if (typeof req.rawBody === "string") return req.rawBody;
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString("utf8");
  if (typeof req.body === "string") return req.body;
  return JSON.stringify(req.body ?? {});
}

export default async function (context, req) {
  const cfg = stripeConfig();
  if (!cfg.commerceEnabled) {
    context.res = json(503, { ok: false, error: "Commerce disabled." });
    return;
  }
  if (!rateLimit(clientKey(req), 60, 60_000)) {
    context.res = json(429, { ok: false, error: "Too many requests." });
    return;
  }

  const payload = rawBody(req);
  const signature =
    (typeof req.headers?.get === "function" ? req.headers.get("stripe-signature") : null) ||
    req.headers?.["stripe-signature"] ||
    req.headers?.["Stripe-Signature"];

  const verified = await verifyStripeWebhookSignature(payload, signature, cfg.webhookSecret);
  if (!verified.ok) {
    context.res = json(401, { ok: false, error: "Unauthorized.", detail: verified.error });
    return;
  }

  let event;
  try {
    event = typeof payload === "string" ? JSON.parse(payload) : payload;
  } catch {
    context.res = json(400, { ok: false, error: "Invalid payload." });
    return;
  }

  if (event.type === "checkout.session.expired") {
    console.info(JSON.stringify({ event: "checkout_expired", sessionId: event.data?.object?.id }));
    context.res = json(200, { ok: true, ignored: true });
    return;
  }

  const completed = parseCheckoutCompletedEvent(event);
  if (!completed) {
    context.res = json(200, { ok: true, ignored: true, type: event.type });
    return;
  }
  if (completed.paymentStatus && completed.paymentStatus !== "paid" && completed.paymentStatus !== "no_payment_required") {
    context.res = json(200, { ok: true, deferred: true, paymentStatus: completed.paymentStatus });
    return;
  }
  if (!completed.customerEmail) {
    console.error(JSON.stringify({ event: "checkout_missing_email", sessionId: completed.sessionId }));
    context.res = json(422, { ok: false, error: "Checkout missing customer email." });
    return;
  }

  try {
    const entitlement = await grantEntitlement({
      email: completed.customerEmail,
      productId: completed.productId,
      stripeSessionId: completed.sessionId,
      referrerInvite: completed.inviteCode || completed.clientReferenceId || "",
      gift: completed.gift,
    });
    const signed = await createSignedManualUrl();
    const mail = await sendAccessEmail({
      email: entitlement.email,
      accessToken: entitlement.accessToken,
      downloadUrl: signed.downloadUrl,
      inviteCode: entitlement.inviteCode,
      expiresAt: signed.expiresAt,
    });
    console.info(
      JSON.stringify({
        event: "dastor_checkout_completed",
        entitlementId: entitlement.id,
        sessionId: completed.sessionId,
        emailMode: mail.mode,
      }),
    );
    context.res = json(200, {
      ok: true,
      entitlementId: entitlement.id,
      emailMode: mail.mode,
    });
  } catch (err) {
    console.error(JSON.stringify({ event: "webhook_grant_error", message: String(err?.message || "internal").slice(0, 160) }));
    context.res = json(500, { ok: false, error: "Unable to grant entitlement." });
  }
}
