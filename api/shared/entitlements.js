/**
 * Entitlements + invite codes. Uses Azure Table Storage when configured;
 * falls back to in-memory Map for local/dev (honest: not durable).
 */

import { randomBytes, createHash } from "node:crypto";

const memory = {
  entitlements: new Map(),
  tokens: new Map(),
  invites: new Map(),
};

function tableConn() {
  return process.env.TABLE_STORAGE_CONNECTION_STRING || process.env.AZURE_STORAGE_CONNECTION_STRING || "";
}

async function getTable(name) {
  const conn = tableConn();
  if (!conn) return null;
  const { TableClient } = await import("@azure/data-tables");
  const client = TableClient.fromConnectionString(conn, name);
  try {
    await client.createTable();
  } catch {
    // exists
  }
  return client;
}

export function mintAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function mintInviteCode() {
  return randomBytes(6).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Grant entitlement after verified Stripe checkout.completed.
 */
export async function grantEntitlement({
  email,
  productId = "dastor-digital",
  stripeSessionId,
  inviteCode,
  referrerInvite,
  gift = false,
}) {
  if (!email || !stripeSessionId) {
    throw new Error("entitlement_requires_email_and_session");
  }
  const accessToken = mintAccessToken();
  const ttlDays = Number(process.env.ACCESS_TOKEN_TTL_DAYS || 365);
  const grantedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000).toISOString();
  const id = `ent_${createHash("sha256").update(`${stripeSessionId}:${email}`).digest("hex").slice(0, 24)}`;
  const code = inviteCode || mintInviteCode();

  const record = {
    partitionKey: "entitlement",
    rowKey: id,
    id,
    email: email.toLowerCase(),
    productId,
    stripeSessionId,
    accessTokenHash: tokenHash(accessToken),
    status: "active",
    grantedAt,
    expiresAt,
    inviteCode: code,
    referrerInvite: referrerInvite || "",
    gift: !!gift,
    sampleConversions: 0,
    bonusUnlocked: false,
  };

  const table = await getTable("dastorEntitlements");
  if (table) {
    await table.upsertEntity(record, "Replace");
    await table.upsertEntity(
      {
        partitionKey: "token",
        rowKey: record.accessTokenHash,
        entitlementId: id,
        email: record.email,
        expiresAt,
        status: "active",
      },
      "Replace",
    );
    await table.upsertEntity(
      {
        partitionKey: "invite",
        rowKey: code,
        entitlementId: id,
        email: record.email,
        sampleConversions: 0,
        bonusUnlocked: false,
      },
      "Replace",
    );
  } else {
    memory.entitlements.set(id, record);
    memory.tokens.set(record.accessTokenHash, {
      entitlementId: id,
      email: record.email,
      expiresAt,
      status: "active",
    });
    memory.invites.set(code, {
      entitlementId: id,
      email: record.email,
      sampleConversions: 0,
      bonusUnlocked: false,
    });
    console.info(JSON.stringify({ event: "entitlement_memory_store", id, mode: "stub" }));
  }

  return {
    id,
    productId,
    email: record.email,
    grantedAt,
    expiresAt,
    accessToken,
    inviteCode: code,
    status: "active",
  };
}

export async function verifyAccessToken(token) {
  if (!token || token.length < 16) return { ok: false, error: "invalid_token" };
  const hash = tokenHash(token);
  const table = await getTable("dastorEntitlements");
  let row;
  if (table) {
    try {
      row = await table.getEntity("token", hash);
    } catch {
      return { ok: false, error: "not_found" };
    }
  } else {
    row = memory.tokens.get(hash);
    if (!row) return { ok: false, error: "not_found" };
  }
  if (row.status !== "active") return { ok: false, error: "inactive" };
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
    return { ok: false, error: "expired" };
  }
  let entitlement;
  if (table) {
    try {
      entitlement = await table.getEntity("entitlement", row.entitlementId);
    } catch {
      entitlement = null;
    }
  } else {
    entitlement = memory.entitlements.get(row.entitlementId);
  }
  return {
    ok: true,
    entitlementId: row.entitlementId,
    email: row.email,
    expiresAt: row.expiresAt,
    productId: entitlement?.productId || "dastor-digital",
    inviteCode: entitlement?.inviteCode || "",
    bonusUnlocked: !!entitlement?.bonusUnlocked,
  };
}

export async function recordInviteSampleConversion(inviteCode) {
  if (!inviteCode) return { counted: false };
  const code = String(inviteCode).toUpperCase();
  const threshold = Number(process.env.VIRAL_INVITE_BONUS_THRESHOLD || 2);
  const table = await getTable("dastorEntitlements");
  let invite;
  if (table) {
    try {
      invite = await table.getEntity("invite", code);
    } catch {
      return { counted: false };
    }
    const next = Number(invite.sampleConversions || 0) + 1;
    const bonusUnlocked = next >= threshold;
    await table.updateEntity(
      {
        partitionKey: "invite",
        rowKey: code,
        sampleConversions: next,
        bonusUnlocked,
        etag: invite.etag,
      },
      "Merge",
    );
    if (bonusUnlocked && invite.entitlementId) {
      try {
        await table.updateEntity(
          {
            partitionKey: "entitlement",
            rowKey: invite.entitlementId,
            bonusUnlocked: true,
            sampleConversions: next,
          },
          "Merge",
        );
      } catch {
        /* best-effort */
      }
    }
    return { counted: true, sampleConversions: next, bonusUnlocked, entitlementId: invite.entitlementId, email: invite.email };
  }
  invite = memory.invites.get(code);
  if (!invite) return { counted: false };
  invite.sampleConversions = (invite.sampleConversions || 0) + 1;
  invite.bonusUnlocked = invite.sampleConversions >= threshold;
  memory.invites.set(code, invite);
  const ent = memory.entitlements.get(invite.entitlementId);
  if (ent) {
    ent.sampleConversions = invite.sampleConversions;
    ent.bonusUnlocked = invite.bonusUnlocked;
  }
  return {
    counted: true,
    sampleConversions: invite.sampleConversions,
    bonusUnlocked: invite.bonusUnlocked,
    entitlementId: invite.entitlementId,
    email: invite.email,
  };
}

export async function acceptInvite({ inviteCode, email }) {
  const code = String(inviteCode || "").toUpperCase();
  if (!code) return { ok: false, error: "missing_code" };
  const table = await getTable("dastorEntitlements");
  let invite;
  if (table) {
    try {
      invite = await table.getEntity("invite", code);
    } catch {
      return { ok: false, error: "not_found" };
    }
  } else {
    invite = memory.invites.get(code);
    if (!invite) return { ok: false, error: "not_found" };
  }
  console.info(
    JSON.stringify({
      event: "invite_accepted",
      inviteCode: code,
      referrerEntitlement: invite.entitlementId,
      hasEmail: !!email,
    }),
  );
  return {
    ok: true,
    inviteCode: code,
    referrerEntitlementId: invite.entitlementId,
  };
}
