import { json, rateLimit, clientKey } from "../shared/http.js";
import { acceptInvite } from "../shared/entitlements.js";

export default async function (context, req) {
  if (!rateLimit(clientKey(req), 20)) {
    context.res = json(429, { ok: false, error: "Too many requests." });
    return;
  }
  const body = req.body || {};
  const inviteCode = String(body.inviteCode || "").trim();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const result = await acceptInvite({ inviteCode, email });
  if (!result.ok) {
    context.res = json(404, { ok: false, error: "Invite not found." });
    return;
  }
  console.info(JSON.stringify({ event: "dastor_invite_accepted", inviteCode: result.inviteCode }));
  context.res = json(200, {
    ok: true,
    inviteCode: result.inviteCode,
    next: "/sample",
  });
}
