import { contactSchema } from "../shared/validation.js";
import { upsertContact, recordActivity } from "../shared/crm.js";
import { json, rateLimit, clientKey } from "../shared/http.js";

export default async function (context, req) {
  if (!rateLimit(clientKey(req), 5)) {
    context.res = json(429, { ok: false, error: "Too many requests." });
    return;
  }
  const body = req.body ?? {};
  // Support JSON client posts and legacy form posts
  const normalized = {
    name: body.name,
    email: body.email || body.workEmail,
    organization: body.organization,
    message: body.message || "DASTOR assessment request",
    consent: body.consent === true || body.consent === "on" || body.consent === "true",
  };
  const parsed = contactSchema.safeParse(normalized);
  if (!parsed.success) {
    context.res = json(400, { ok: false, error: "Invalid contact request." });
    return;
  }
  const [firstName, ...rest] = parsed.data.name.split(" ");
  const contact = await upsertContact({
    firstName: firstName || parsed.data.name,
    lastName: rest.join(" ") || "Contact",
    workEmail: parsed.data.email,
    organization: parsed.data.organization || "Unspecified",
    role: "assessment",
    consentVersion: process.env.CONSENT_VERSION || "1.0",
    consentTimestamp: new Date().toISOString(),
    requestTimestamp: new Date().toISOString(),
    resourceRequested: "assessment",
  });
  await recordActivity({ contactId: contact.contactId, type: "assessment_requested" });
  context.res = json(200, { ok: true, queued: !!contact.queued });
}
