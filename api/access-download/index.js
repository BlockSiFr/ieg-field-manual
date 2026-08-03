import { json, rateLimit, clientKey } from "../shared/http.js";
import { verifyAccessToken } from "../shared/entitlements.js";
import { createSignedManualUrl, createAccessReceipt } from "../shared/storage.js";

export default async function (context, req) {
  if (!rateLimit(clientKey(req), 10)) {
    context.res = json(429, { ok: false, error: "Too many requests." });
    return;
  }
  const body = req.body || {};
  const token = String(body.token || req.headers?.["x-dastor-access"] || "");
  const result = await verifyAccessToken(token);
  if (!result.ok) {
    context.res = json(401, { ok: false, error: "Access denied.", reason: result.error });
    return;
  }
  const signed = await createSignedManualUrl();
  const receipt = createAccessReceipt({
    resource: "dastor-field-manual-digital",
    contactId: result.entitlementId,
    consentVersion: process.env.CONSENT_VERSION || "1.0",
    expiresAt: signed.expiresAt,
  });
  console.info(JSON.stringify({ event: "dastor_manual_download_minted", entitlementId: result.entitlementId, mode: signed.mode }));
  context.res = json(200, {
    ok: true,
    downloadUrl: signed.downloadUrl,
    expiresAt: signed.expiresAt,
    mode: signed.mode,
    accessReceipt: receipt,
  });
}
