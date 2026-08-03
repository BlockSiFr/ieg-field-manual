import { json, rateLimit, clientKey } from "../shared/http.js";
import { verifyAccessToken } from "../shared/entitlements.js";

export default async function (context, req) {
  if (!rateLimit(clientKey(req), 30)) {
    context.res = json(429, { ok: false, error: "Too many requests." });
    return;
  }
  const url = new URL(req.url || "http://local/api/access/verify", "http://local");
  const token =
    url.searchParams.get("token") ||
    req.query?.token ||
    req.headers?.["x-dastor-access"] ||
    "";
  const result = await verifyAccessToken(String(token));
  if (!result.ok) {
    context.res = json(401, { ok: false, error: "Access denied.", reason: result.error });
    return;
  }
  // No full email in analytics/logs beyond hashed claim surface to client as masked.
  const email = result.email || "";
  const masked = email.includes("@")
    ? `${email[0]}***@${email.split("@")[1]}`
    : undefined;
  context.res = json(200, {
    ok: true,
    productId: result.productId,
    expiresAt: result.expiresAt,
    inviteCode: result.inviteCode,
    bonusUnlocked: result.bonusUnlocked,
    emailMasked: masked,
    unlocked: true,
  });
}
