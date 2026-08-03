/**
 * Signed URL generation. Prefers Azure Blob SAS when configured.
 * Falls back to API-local gated assets so customer downloads always work.
 */

import { localDeliverableUrl, resolveDeliverable, normalizeResourceId } from "./deliverables.js";

function parseAccountKey(connectionString) {
  const parts = Object.fromEntries(
    String(connectionString || "")
      .split(";")
      .filter(Boolean)
      .map((p) => {
        const i = p.indexOf("=");
        return i === -1 ? [p, ""] : [p.slice(0, i), p.slice(i + 1)];
      }),
  );
  return {
    accountName: parts.AccountName || process.env.AZURE_STORAGE_ACCOUNT_NAME || "",
    accountKey: parts.AccountKey || "",
  };
}

async function createSignedBlobUrl({ container, blobName, ttlMinutes, fallbackResourceId }) {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const fallbackId = fallbackResourceId || blobName.replace(/\.pdf$/i, "");

  if (!account || !conn) {
    if (resolveDeliverable(fallbackId) || resolveDeliverable(blobName)) {
      return localDeliverableUrl(fallbackId, ttlMinutes);
    }
    return localDeliverableUrl(fallbackId, ttlMinutes);
  }

  try {
    const { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } =
      await import("@azure/storage-blob");
    const { accountName, accountKey } = parseAccountKey(conn);
    const service = BlobServiceClient.fromConnectionString(conn);
    const client = service.getContainerClient(container).getBlobClient(blobName);
    const exists = await client.exists();
    if (!exists) {
      return localDeliverableUrl(fallbackId, ttlMinutes);
    }
    const expiresOn = new Date(Date.now() + ttlMinutes * 60_000);
    if (accountName && accountKey) {
      const sas = generateBlobSASQueryParameters(
        {
          containerName: container,
          blobName,
          permissions: BlobSASPermissions.parse("r"),
          expiresOn,
        },
        new StorageSharedKeyCredential(accountName, accountKey),
      ).toString();
      return {
        mode: "azure",
        downloadUrl: `${client.url}?${sas}`,
        expiresAt: expiresOn.toISOString(),
        blob: blobName,
      };
    }
  } catch (err) {
    console.error(JSON.stringify({ event: "signed_blob_fallback", message: String(err?.message || "error").slice(0, 160) }));
  }

  return localDeliverableUrl(fallbackId, ttlMinutes);
}

export async function createSignedSampleUrl(resourceId, ttlMinutes = 30) {
  const id = normalizeResourceId(resourceId) || "sample-chapter-1";
  const container = process.env.AZURE_STORAGE_CONTAINER_SAMPLES || "dastor-samples";
  // Prefer PDF for practitioner downloads; fall back to markdown then local assets.
  const primary = await createSignedBlobUrl({
    container,
    blobName: `${id}.pdf`,
    ttlMinutes,
    fallbackResourceId: id,
  });
  if (primary.mode === "azure") return primary;
  const mdAttempt = await createSignedBlobUrl({
    container,
    blobName: `${id}.md`,
    ttlMinutes,
    fallbackResourceId: id,
  });
  if (mdAttempt.mode === "azure") return mdAttempt;
  return primary;
}

/** Full digital manual — private container when present; local compiled asset otherwise. */
export async function createSignedManualUrl(ttlMinutes) {
  const ttl = ttlMinutes ?? Number(process.env.MANUAL_LINK_TTL_MINUTES || 60);
  const container = process.env.AZURE_STORAGE_CONTAINER_MANUAL || "dastor-manual-protected";
  const blobName = process.env.DASTOR_MANUAL_BLOB_NAME || "dastor-field-manual-digital.pdf";
  return createSignedBlobUrl({
    container,
    blobName,
    ttlMinutes: ttl,
    fallbackResourceId: "dastor-field-manual-digital",
  });
}

export function createAccessReceipt(input) {
  return {
    receiptVersion: "DASTOR-ACCESS-1.0",
    timestamp: new Date().toISOString(),
    resource: input.resource,
    contactId: input.contactId,
    consentVersion: input.consentVersion,
    expiresAt: input.expiresAt,
    decision: "ALLOW_TIMEBOXED",
  };
}
