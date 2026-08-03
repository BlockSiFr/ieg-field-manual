import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyStripeWebhookSignature, parseCheckoutCompletedEvent } from "../../api/shared/commerce.js";
import { grantEntitlement, verifyAccessToken, recordInviteSampleConversion, acceptInvite } from "../../api/shared/entitlements.js";
import { buildAccessEmail } from "../../api/shared/email.js";

describe("stripe webhook signature", () => {
  it("accepts a valid v1 signature", async () => {
    const secret = "whsec_test_secret";
    const body = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_test" } } });
    const t = Math.floor(Date.now() / 1000).toString();
    const v1 = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
    const result = await verifyStripeWebhookSignature(body, `t=${t},v1=${v1}`, secret);
    expect(result.ok).toBe(true);
  });

  it("rejects a bad signature", async () => {
    const body = "{}";
    const result = await verifyStripeWebhookSignature(body, "t=1,v1=deadbeef", "whsec_x");
    expect(result.ok).toBe(false);
  });
});

describe("checkout event parse", () => {
  it("extracts email and metadata", () => {
    const parsed = parseCheckoutCompletedEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
          payment_status: "paid",
          customer_details: { email: "buyer@example.com" },
          metadata: { productId: "dastor-digital", inviteCode: "ABC123", gift: "0" },
        },
      },
    });
    expect(parsed?.customerEmail).toBe("buyer@example.com");
    expect(parsed?.inviteCode).toBe("ABC123");
    expect(parsed?.sessionId).toBe("cs_123");
  });
});

describe("entitlements", () => {
  it("grants and verifies an access token", async () => {
    const ent = await grantEntitlement({
      email: "buyer@example.com",
      stripeSessionId: `cs_${Date.now()}`,
    });
    expect(ent.accessToken.length).toBeGreaterThan(20);
    expect(ent.inviteCode.length).toBeGreaterThan(4);
    const verified = await verifyAccessToken(ent.accessToken);
    expect(verified.ok).toBe(true);
    expect(verified.inviteCode).toBe(ent.inviteCode);
  });

  it("counts invite sample conversions toward bonus threshold", async () => {
    process.env.VIRAL_INVITE_BONUS_THRESHOLD = "2";
    const ent = await grantEntitlement({
      email: "referrer@example.com",
      stripeSessionId: `cs_invite_${Date.now()}`,
    });
    const first = await recordInviteSampleConversion(ent.inviteCode);
    expect(first.counted).toBe(true);
    expect(first.bonusUnlocked).toBe(false);
    const second = await recordInviteSampleConversion(ent.inviteCode);
    expect(second.bonusUnlocked).toBe(true);
    const accepted = await acceptInvite({ inviteCode: ent.inviteCode, email: "friend@example.com" });
    expect(accepted.ok).toBe(true);
  });
});

describe("access email", () => {
  it("builds magic link and invite link", () => {
    const mail = buildAccessEmail({
      email: "buyer@example.com",
      accessToken: "tok_abc",
      downloadUrl: "https://example.test/manual?sig=1",
      inviteCode: "INVITE1",
      expiresAt: "2026-01-01T00:00:00.000Z",
    });
    expect(mail.accessLink).toContain("/access?token=tok_abc");
    expect(mail.inviteLink).toContain("invite=INVITE1");
    expect(mail.html).toContain("Open access");
  });
});
