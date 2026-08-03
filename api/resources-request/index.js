import { leadSchema } from "../shared/validation.js";
import { upsertContact, recordActivity } from "../shared/crm.js";
import { createSignedSampleUrl, createAccessReceipt } from "../shared/storage.js";
import { json, rateLimit, clientKey } from "../shared/http.js";
import { recordInviteSampleConversion } from "../shared/entitlements.js";
import { sendBonusUnlockedEmail } from "../shared/email.js";
import { resolveDeliverable } from "../shared/deliverables.js";

const GATED_LEAD_RESOURCES = new Set([
  "sample-chapter-1",
  "framework-mapping",
  "assessment-checklist",
  "threat-briefs",
]);

export default async function (context, req) {
  try {
    if (!rateLimit(clientKey(req))) {
      context.res = json(429, { ok: false, error: "Too many requests. Try again shortly." });
      return;
    }
    const parsed = leadSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      context.res = json(400, {
        ok: false,
        error: "Invalid request.",
        issues: parsed.error.issues.map((i) => i.path.join(".")),
      });
      return;
    }
    const data = parsed.data;
    if (!GATED_LEAD_RESOURCES.has(data.resourceRequested) || !resolveDeliverable(data.resourceRequested)) {
      context.res = json(400, { ok: false, error: "Unknown gated resource." });
      return;
    }
    const consentVersion = process.env.CONSENT_VERSION || "1.0";
    const contact = await upsertContact({
      ...data,
      consentVersion,
      consentTimestamp: new Date().toISOString(),
      requestTimestamp: new Date().toISOString(),
    });
    const ttl = Number(process.env.RESOURCE_LINK_TTL_MINUTES || 30);
    const signed = await createSignedSampleUrl(data.resourceRequested, ttl);
    const receipt = createAccessReceipt({
      resource: data.resourceRequested,
      contactId: contact.contactId,
      consentVersion,
      expiresAt: signed.expiresAt,
    });
    await recordActivity({ contactId: contact.contactId, type: "resource_requested", resource: data.resourceRequested });

    const inviteCode = typeof req.body?.inviteCode === "string" ? req.body.inviteCode.trim().toUpperCase() : "";
    if (inviteCode) {
      const viral = await recordInviteSampleConversion(inviteCode);
      if (viral.bonusUnlocked && viral.email) {
        await sendBonusUnlockedEmail({ email: viral.email, inviteCode });
      }
    }

    if (process.env.AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING) {
      console.info(JSON.stringify({ event: "email_send_invoked", template: "dastor_sample", contactId: contact.contactId }));
    } else {
      console.info(JSON.stringify({ event: "email_send_stubbed", contactId: contact.contactId }));
    }
    context.res = json(200, {
      ok: true,
      downloadUrl: signed.downloadUrl,
      expiresAt: signed.expiresAt,
      mode: signed.mode,
      receiptId: `rar_${Date.now()}`,
      crm: { synced: contact.synced, queued: !!contact.queued },
      accessReceipt: receipt,
    });
  } catch (err) {
    console.error(JSON.stringify({ event: "resources_request_error", message: "internal" }));
    context.res = json(500, { ok: false, error: "Unable to complete request." });
  }
}
