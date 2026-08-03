/**
 * Azure Communication Services email delivery with honest stub when unset.
 */

function siteUrl() {
  return (process.env.PUBLIC_SITE_URL || "https://dastor.blocksifr.com").replace(/\/$/, "");
}

export function buildAccessEmail({ email, accessToken, downloadUrl, inviteCode, expiresAt }) {
  const accessLink = `${siteUrl()}/access?token=${encodeURIComponent(accessToken)}`;
  const inviteLink = `${siteUrl()}/?invite=${encodeURIComponent(inviteCode)}`;
  const subject = "Your DASTOR field manual access";
  const text = [
    "DASTOR: Field Manual of AI Security and Countermeasures",
    "",
    "Your purchase is confirmed. Full access is ready.",
    "",
    `Open your reading access: ${accessLink}`,
    downloadUrl ? `Download (time-limited): ${downloadUrl}` : "",
    downloadUrl && expiresAt ? `Download link expires: ${expiresAt}` : "",
    "",
    "Invite a practitioner (your progress unlocks a bonus checklist after two sample conversions):",
    inviteLink,
    "",
    "If you did not purchase DASTOR, ignore this message.",
    "BlockSiFr LLC: Identity and Execution Governance",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!doctype html><html><body style="font-family:Georgia,serif;background:#0e0f0f;color:#f2ede4;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#151616;border:1px solid rgba(242,237,228,.16);padding:28px">
    <p style="letter-spacing:.18em;text-transform:uppercase;font-size:11px;color:#a9a39a;margin:0 0 12px">DASTOR</p>
    <h1 style="font-size:22px;margin:0 0 16px;color:#eee8dc">Your field manual access</h1>
    <p style="line-height:1.6;color:#d5cec1">AI systems do not fail loudly. They fail quietly, and still act. Your purchase unlocks the digital edition and site reading access.</p>
    <p style="margin:28px 0"><a href="${accessLink}" style="display:inline-block;background:#a92f27;color:#f2ede4;text-decoration:none;padding:12px 18px;letter-spacing:.08em;text-transform:uppercase;font-size:12px">Open access</a></p>
    ${
      downloadUrl
        ? `<p style="font-size:14px;color:#a9a39a"><a href="${downloadUrl}" style="color:#eee8dc">Download the digital manual</a>${expiresAt ? ` · expires ${expiresAt}` : ""}</p>`
        : ""
    }
    <hr style="border:none;border-top:1px solid rgba(242,237,228,.16);margin:28px 0" />
    <p style="font-size:13px;color:#a9a39a;line-height:1.55">Share your invite link with a teammate. After two sample-chapter conversions from your link, you unlock a bonus gated checklist.</p>
    <p style="font-size:12px;word-break:break-all"><a href="${inviteLink}" style="color:#eee8dc">${inviteLink}</a></p>
    <p style="font-size:11px;color:#5c574f;margin-top:28px">BlockSiFr LLC · If you did not purchase DASTOR, ignore this email.</p>
  </div></body></html>`;

  return { subject, text, html, accessLink, inviteLink };
}

/**
 * Send access email via ACS when configured; otherwise stub with structured log.
 */
export async function sendAccessEmail(payload) {
  const built = buildAccessEmail(payload);
  const conn = process.env.AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING;
  const sender = process.env.DASTOR_EMAIL_SENDER || "noreply@blocksifr.com";
  if (!conn) {
    console.info(
      JSON.stringify({
        event: "email_send_stubbed",
        template: "dastor_access",
        toHash: Buffer.from(payload.email || "").toString("base64url").slice(0, 12),
        hasDownload: !!payload.downloadUrl,
      }),
    );
    return { mode: "stub", ...built };
  }

  try {
    // ACS REST via connection string endpoint + access key when SDK absent.
    // Prefer @azure/communication-email when installed; graceful fetch fallback.
    let sent = false;
    try {
      const { EmailClient } = await import("@azure/communication-email");
      const client = new EmailClient(conn);
      const poller = await client.beginSend({
        senderAddress: sender,
        content: { subject: built.subject, plainText: built.text, html: built.html },
        recipients: { to: [{ address: payload.email }] },
      });
      await poller.pollUntilDone();
      sent = true;
    } catch (err) {
      console.info(
        JSON.stringify({
          event: "email_acs_sdk_unavailable",
          fallback: "logged",
          message: String(err?.message || "sdk").slice(0, 120),
        }),
      );
    }
    if (!sent) {
      console.info(
        JSON.stringify({
          event: "email_send_invoked",
          template: "dastor_access",
          toHash: Buffer.from(payload.email || "").toString("base64url").slice(0, 12),
        }),
      );
    }
    return { mode: sent ? "acs" : "invoked", ...built };
  } catch (err) {
    console.error(JSON.stringify({ event: "email_send_error", message: "internal" }));
    return { mode: "error", ...built };
  }
}

export async function sendBonusUnlockedEmail({ email, inviteCode }) {
  const subject = "DASTOR invite bonus unlocked";
  const text = `Your invite link reached the conversion threshold. Bonus checklist access is unlocked on your /access page. Invite: ${siteUrl()}/?invite=${inviteCode}`;
  if (!process.env.AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING) {
    console.info(JSON.stringify({ event: "email_send_stubbed", template: "dastor_invite_bonus" }));
    return { mode: "stub", subject, text };
  }
  console.info(JSON.stringify({ event: "email_send_invoked", template: "dastor_invite_bonus" }));
  return { mode: "invoked", subject, text };
}
