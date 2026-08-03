import { useEffect, useMemo, useState } from "react";
import { track } from "@/lib/analytics";

type Props = {
  commerceEnabled?: boolean;
  initialInvite?: string;
  gift?: boolean;
};

function readInvite() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("invite") || localStorage.getItem("dastor_invite") || "";
}

/**
 * Build-time PUBLIC_COMMERCE_ENABLED unlocks the CTA. We also probe /api/health
 * so a restored Functions backend is visible even before the next static rebuild.
 */
async function probeCommerceReady(): Promise<boolean> {
  try {
    const res = await fetch("/api/health", { method: "GET", cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean; commerce?: { ready?: boolean } };
    if (data?.commerce && typeof data.commerce.ready === "boolean") return data.commerce.ready;
    return data?.ok === true;
  } catch {
    return false;
  }
}

export default function CheckoutButton({ commerceEnabled = false, initialInvite = "", gift = false }: Props) {
  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState(initialInvite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [liveReady, setLiveReady] = useState(commerceEnabled);

  useEffect(() => {
    const code = initialInvite || readInvite();
    if (code) {
      setInvite(code.toUpperCase());
      try {
        localStorage.setItem("dastor_invite", code.toUpperCase());
      } catch {
        /* ignore */
      }
    }
  }, [initialInvite]);

  useEffect(() => {
    let alive = true;
    if (commerceEnabled) {
      setLiveReady(true);
      return;
    }
    void probeCommerceReady().then((ok) => {
      if (alive) setLiveReady(ok);
    });
    return () => {
      alive = false;
    };
  }, [commerceEnabled]);

  const enabled = commerceEnabled || liveReady;
  const label = useMemo(() => (gift ? "Gift a seat" : "Get Instant Access"), [gift]);

  async function startCheckout(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!enabled) {
      setError("Commerce is configuring. Sample chapter remains available.");
      return;
    }
    setBusy(true);
    track(gift ? "dastor_gift_seat_started" : "dastor_checkout_started", { gift });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || undefined,
          inviteCode: invite.trim() || undefined,
          gift,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Unable to start checkout.");
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Unable to reach checkout.");
      setBusy(false);
    }
  }

  return (
    <form className="checkout-form" onSubmit={startCheckout}>
      <label>
        Work email <span className="optional">(optional: Stripe will collect if blank)</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          placeholder="you@company.com"
        />
      </label>
      {invite ? (
        <p className="invite-chip" role="status">
          Invite attached: <code>{invite}</code>
        </p>
      ) : null}
      <button className="btn btn-primary" type="submit" disabled={busy || !enabled}>
        {busy ? "Opening secure checkout…" : label}
      </button>
      {!enabled ? (
        <p className="meta warn">
          Commerce configuring: checkout stays disabled until Stripe price and keys are live.{" "}
          <a href="/sample">Sample chapter remains available</a>.
        </p>
      ) : (
        <p className="meta">Hosted Stripe Checkout. No card data touches this site.</p>
      )}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <style>{`
        .checkout-form { display: grid; gap: 1rem; max-width: 28rem; }
        .checkout-form label { display: grid; gap: .4rem; font-family: var(--font-mono); font-size: .7rem; letter-spacing: .12em; text-transform: uppercase; color: var(--dastor-text-muted); }
        .checkout-form input { font-family: var(--font-serif); font-size: 1rem; padding: .75rem .9rem; border: 1px solid var(--dastor-line-light); background: var(--dastor-carbon); color: var(--dastor-text-light); }
        .optional { text-transform: none; letter-spacing: 0; font-family: var(--font-serif); color: #5c574f; }
        .invite-chip { margin: 0; font-size: .9rem; color: var(--dastor-paper-muted); }
        .invite-chip code { font-family: var(--font-mono); color: var(--dastor-paper); }
        .warn { color: #c4a35a; }
        .warn a { color: var(--dastor-paper); }
        .error { color: #e07068; margin: 0; }
      `}</style>
    </form>
  );
}
