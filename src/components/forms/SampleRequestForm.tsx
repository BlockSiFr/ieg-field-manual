import { useMemo, useState, useEffect } from "react";
import { extractUtm } from "@/lib/utm";
import { track } from "@/lib/analytics";

type Status = "idle" | "submitting" | "success" | "error";

const LABELS: Record<string, { button: string; success: string }> = {
  "sample-chapter-1": {
    button: "Send me Chapter 1",
    success: "Your Chapter 1 PDF sample is ready. The secure link expires shortly.",
  },
  "framework-mapping": {
    button: "Send me the framework map",
    success: "Your framework mapping is ready. The secure link expires shortly.",
  },
  "assessment-checklist": {
    button: "Send me the checklist",
    success: "Your assessment checklist is ready. The secure link expires shortly.",
  },
  "threat-briefs": {
    button: "Send me the threat briefs",
    success: "Your threat briefs are ready. The secure link expires shortly.",
  },
};

const ALLOWED = new Set(Object.keys(LABELS));

type Props = {
  resourceRequested?: string;
};

export default function SampleRequestForm({ resourceRequested = "sample-chapter-1" }: Props) {
  const [resource, setResource] = useState(
    ALLOWED.has(resourceRequested) ? resourceRequested : "sample-chapter-1",
  );
  const labels = LABELS[resource] || {
    button: "Send me the resource",
    success: "Your download is ready. The secure link expires shortly.",
  };
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const utm = useMemo(() => (typeof window !== "undefined" ? extractUtm(window.location.search) : {}), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromResource = params.get("resource") || "";
    if (ALLOWED.has(fromResource)) setResource(fromResource);

    const fromUrl = params.get("invite");
    const stored = localStorage.getItem("dastor_invite");
    const code = (fromUrl || stored || "").toUpperCase();
    if (code) {
      setInviteCode(code);
      try {
        localStorage.setItem("dastor_invite", code);
      } catch {
        /* ignore */
      }
      void fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d?.ok) track("dastor_invite_accepted", { invite: "1" });
        })
        .catch(() => undefined);
    }
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");
    setDownloadUrl(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      firstName: String(fd.get("firstName") ?? ""),
      lastName: String(fd.get("lastName") ?? ""),
      workEmail: String(fd.get("workEmail") ?? ""),
      organization: String(fd.get("organization") ?? ""),
      role: String(fd.get("role") ?? ""),
      interest: String(fd.get("interest") ?? "") || undefined,
      consent: fd.get("consent") === "on",
      resourceRequested: resource,
      landingPage: typeof window !== "undefined" ? window.location.href : undefined,
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      inviteCode: inviteCode || undefined,
      utm,
    };

    try {
      const res = await fetch("/api/resources/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; downloadUrl?: string; error?: string; mode?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Request could not be completed.");
        return;
      }
      setStatus("success");
      setDownloadUrl(data.downloadUrl ?? null);
      setMessage(labels.success);
      track("dastor_sample_requested", { resource });
      if (data.downloadUrl) track("dastor_sample_downloaded", { resource });
    } catch {
      setStatus("error");
      setMessage("Network error. Try again, or contact privacy@blocksifr.com if this persists.");
    }
  }

  return (
    <form className="sample-form" onSubmit={onSubmit} noValidate>
      {inviteCode ? (
        <p className="invite-note" role="status">
          Practitioner invite applied: <code>{inviteCode}</code>
        </p>
      ) : null}
      <div className="grid">
        <label>
          First name
          <input name="firstName" required autoComplete="given-name" maxLength={80} />
        </label>
        <label>
          Last name
          <input name="lastName" required autoComplete="family-name" maxLength={80} />
        </label>
        <label className="wide">
          Work email
          <input name="workEmail" type="email" required autoComplete="email" maxLength={254} />
        </label>
        <label>
          Organization
          <input name="organization" required autoComplete="organization" maxLength={160} />
        </label>
        <label>
          Role
          <input name="role" required autoComplete="organization-title" maxLength={120} />
        </label>
        <label className="wide">
          Interest (optional)
          <input name="interest" maxLength={280} />
        </label>
      </div>
      <label className="consent">
        <input name="consent" type="checkbox" required />
        <span>
          I agree to receive the requested IEG Field Manual resource and related publication updates. See the{" "}
          <a href="/privacy">privacy notice</a>. Consent version 1.0.
        </span>
      </label>
      <button className="btn btn-primary" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Requesting…" : labels.button}
      </button>
      <p className="upsell">
        Prefer the full index? <a href="/manual">Read the Manual</a>
      </p>
      {message && (
        <p className={status === "error" ? "err" : "ok"} role="status">
          {message}
          {downloadUrl && (
            <>
              {" "}
              <a href={downloadUrl}>Download now</a>
            </>
          )}
        </p>
      )}
      <style>{`
        .sample-form { display:grid; gap:1rem; max-width:40rem; }
        .grid { display:grid; gap:1rem; grid-template-columns:1fr 1fr; }
        label { display:flex; flex-direction:column; gap:.35rem; font-family:var(--font-mono); font-size:.7rem; letter-spacing:.08em; text-transform:uppercase; }
        input[type="text"], input[type="email"], input:not([type]), input[type="checkbox"] + span { text-transform:none; letter-spacing:normal; font-family:var(--font-serif); font-size:1rem; }
        input:not([type="checkbox"]) { min-height:44px; padding:.65rem .8rem; border:1px solid var(--dastor-line-dark); background:#fff; color:var(--dastor-ink); }
        .wide { grid-column: 1 / -1; }
        .consent { display:flex; flex-direction:row; gap:.75rem; align-items:flex-start; text-transform:none; letter-spacing:normal; font-family:var(--font-serif); font-size:.95rem; }
        .consent input { margin-top:.25rem; min-width:1.1rem; min-height:1.1rem; }
        .ok { color:#1f5b2f; }
        .err { color: var(--dastor-signal); }
        .invite-note { margin:0; font-size:.9rem; color:#4a463f; }
        .invite-note code { font-family:var(--font-mono); }
        .upsell { margin:0; font-size:.95rem; color:#4a463f; }
        @media (max-width: 640px) { .grid { grid-template-columns:1fr; } }
      `}</style>
    </form>
  );
}
