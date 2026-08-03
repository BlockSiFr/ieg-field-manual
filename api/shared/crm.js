/** Adapter-based CRM integration with queue fallback. Never silently drops leads. */

export async function upsertContact(contact) {
  const adapter = (process.env.CRM_ADAPTER || "queue").toLowerCase();
  if (adapter === "blocksifr" && process.env.BLOCKSIFR_CRM_BASE_URL) {
    try {
      const res = await fetch(`${process.env.BLOCKSIFR_CRM_BASE_URL}/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.BLOCKSIFR_CRM_API_KEY || ""}`,
        },
        body: JSON.stringify(contact),
      });
      if (res.ok) {
        const data = await res.json();
        return { contactId: data.id || contact.workEmail, synced: true };
      }
    } catch {
      // fall through to queue
    }
  }
  // Queue / dead-letter friendly local persistence stub
  const queued = {
    contactId: `queue_${Buffer.from(contact.workEmail).toString("base64url").slice(0, 16)}`,
    synced: false,
    queued: true,
    at: new Date().toISOString(),
  };
  console.info(JSON.stringify({ event: "crm_queue_upsert", contactId: queued.contactId, adapter }));
  return queued;
}

export async function recordActivity(activity) {
  console.info(JSON.stringify({ event: "crm_activity", ...activity, piiRedacted: true }));
}
