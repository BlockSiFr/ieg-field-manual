import { json, rateLimit, clientKey } from "../shared/http.js";
import { createCheckoutSession, stripeEnabled, stripeConfig } from "../shared/commerce.js";

function siteUrl() {
  return (process.env.PUBLIC_SITE_URL || "https://dastor.blocksifr.com").replace(/\/$/, "");
}

export default async function (context, req) {
  try {
    if (!rateLimit(clientKey(req), 12)) {
      context.res = json(429, { ok: false, error: "Too many requests." });
      return;
    }
    const cfg = stripeConfig();
    if (!stripeEnabled(cfg)) {
      context.res = json(503, {
        ok: false,
        error: "Commerce configuring",
        commerceEnabled: cfg.commerceEnabled,
        hasKey: cfg.secretKey.startsWith("sk_"),
        hasPrice: !!cfg.priceDigital,
      });
      return;
    }

    const body = req.body || {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode.trim().toUpperCase() : "";
    const gift = body.gift === true || body.gift === "1";
    const productId = gift ? "dastor-team-seat" : "dastor-digital";
    const priceId = gift && cfg.priceTeamSeat ? cfg.priceTeamSeat : cfg.priceDigital;

    const successUrl = `${siteUrl()}/purchase/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl()}/purchase?canceled=1`;

    const session = await createCheckoutSession({
      priceId,
      customerEmail: email || undefined,
      clientRef: inviteCode || undefined,
      successUrl,
      cancelUrl,
      quantity: 1,
      metadata: {
        productId,
        inviteCode,
        gift: gift ? "1" : "0",
        source: "dastor.blocksifr.com",
      },
    });

    console.info(JSON.stringify({ event: "dastor_checkout_started", sessionId: session.id, gift, hasInvite: !!inviteCode }));
    context.res = json(200, { ok: true, id: session.id, url: session.url });
  } catch (err) {
    console.error(JSON.stringify({ event: "checkout_error", message: String(err?.message || "internal").slice(0, 160) }));
    context.res = json(500, { ok: false, error: "Unable to start checkout." });
  }
}
