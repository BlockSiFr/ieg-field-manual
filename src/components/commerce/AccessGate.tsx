import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

const TOKEN_KEY = "dastor_access_token";

type Claims = {
  ok: boolean;
  productId?: string;
  expiresAt?: string;
  inviteCode?: string;
  bonusUnlocked?: boolean;
  emailMasked?: string;
  unlocked?: boolean;
  error?: string;
};

export function readStoredToken() {
  if (typeof window === "undefined") return "";
  const q = new URLSearchParams(window.location.search).get("token");
  if (q) {
    try {
      localStorage.setItem(TOKEN_KEY, q);
    } catch {
      /* ignore */
    }
    return q;
  }
  return localStorage.getItem(TOKEN_KEY) || "";
}

export default function AccessGate() {
  const [token, setToken] = useState("");
  const [claims, setClaims] = useState<Claims | null>(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadExp, setDownloadExp] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = readStoredToken();
    setToken(t);
    if (t) void verify(t);
  }, []);

  async function verify(t: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/access/verify?token=${encodeURIComponent(t)}`);
      const data = (await res.json()) as Claims;
      setClaims(data);
      if (data.ok) {
        track("dastor_access_unlocked", { productId: data.productId || "dastor-digital" });
        try {
          localStorage.setItem(TOKEN_KEY, t);
          localStorage.setItem("dastor_unlocked", "1");
          if (data.inviteCode) localStorage.setItem("dastor_my_invite", data.inviteCode);
        } catch {
          /* ignore */
        }
      }
    } catch {
      setClaims({ ok: false, error: "verify_failed" });
    } finally {
      setBusy(false);
    }
  }

  async function mintDownload() {
    setBusy(true);
    try {
      const res = await fetch("/api/access/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok && data.downloadUrl) {
        setDownloadUrl(data.downloadUrl);
        setDownloadExp(data.expiresAt || "");
        track("dastor_sample_downloaded", { resource: "manual" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    const code = claims?.inviteCode;
    if (!code) return;
    const url = `${window.location.origin}/?invite=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track("dastor_share_clicked", { channel: "clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (!token) {
    return (
      <div className="access-panel">
        <p>Paste the access token from your purchase email, or open the magic link.</p>
        <label>
          Access token
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste token" />
        </label>
        <button className="btn btn-primary" type="button" disabled={!token || busy} onClick={() => verify(token)}>
          Unlock
        </button>
      </div>
    );
  }

  if (busy && !claims) return <p className="meta">Verifying access…</p>;

  if (!claims?.ok) {
    return (
      <div className="access-panel">
        <p role="alert">Access could not be verified. Request a fresh link from your purchase email or contact support.</p>
        <a className="btn btn-ghost" href="/purchase">
          Get Instant Access
        </a>
      </div>
    );
  }

  const inviteUrl =
    typeof window !== "undefined" && claims.inviteCode
      ? `${window.location.origin}/?invite=${encodeURIComponent(claims.inviteCode)}`
      : "";

  return (
    <div className="access-panel unlocked">
      <p className="eyebrow">Access granted</p>
      <h2 className="section-title" style={{ fontSize: "1.75rem" }}>
        Field manual unlocked
      </h2>
      <p className="meta">
        {claims.emailMasked ? `Entitled: ${claims.emailMasked}` : "Entitlement active"}
        {claims.expiresAt ? ` · valid until ${new Date(claims.expiresAt).toLocaleDateString()}` : ""}
      </p>

      <div className="actions">
        <button className="btn btn-primary" type="button" disabled={busy} onClick={mintDownload}>
          Download digital manual
        </button>
        <a className="btn btn-ghost" href="/chapters">
          Continue reading chapters
        </a>
      </div>
      {downloadUrl ? (
        <p>
          <a href={downloadUrl}>Open signed download</a>
          {downloadExp ? <span className="meta"> · expires {new Date(downloadExp).toLocaleString()}</span> : null}
        </p>
      ) : null}

      <div className="viral">
        <h3 className="eyebrow">Invite a practitioner</h3>
        <p>
          Share your invite link. After two teammates request the sample chapter through it, your bonus checklist unlocks
          {claims.bonusUnlocked ? " (unlocked)." : "."}
        </p>
        {inviteUrl ? (
          <p className="invite-url">
            <code>{inviteUrl}</code>
            <button className="btn btn-ghost" type="button" onClick={copyInvite}>
              {copied ? "Copied" : "Copy invite"}
            </button>
          </p>
        ) : null}
        <a className="btn btn-ghost" href="/purchase?gift=1">
          Gift a seat
        </a>
      </div>

      <style>{`
        .access-panel { display: grid; gap: 1.25rem; max-width: 40rem; }
        .access-panel label { display: grid; gap: .4rem; font-family: var(--font-mono); font-size: .7rem; letter-spacing: .12em; text-transform: uppercase; color: var(--dastor-text-muted); }
        .access-panel input { font-family: var(--font-mono); padding: .75rem .9rem; border: 1px solid var(--dastor-line-light); background: var(--dastor-carbon); color: var(--dastor-text-light); }
        .actions, .viral { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; }
        .viral { flex-direction: column; align-items: flex-start; margin-top: 1rem; padding-top: 1.5rem; border-top: 1px solid var(--dastor-line-light); }
        .invite-url { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; word-break: break-all; }
        .invite-url code { font-size: .8rem; color: var(--dastor-paper-muted); }
      `}</style>
    </div>
  );
}
