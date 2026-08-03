import { useState } from "react";
import { track } from "@/lib/analytics";

type Status = "idle" | "submitting" | "success" | "error";

export default function AssessmentRequestForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      organization: String(fd.get("organization") ?? "").trim() || undefined,
      message: String(fd.get("message") ?? "").trim(),
      consent: fd.get("consent") === "on",
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Request could not be completed.");
        return;
      }
      setStatus("success");
      setMessage("Assessment request received. A BlockSiFr contact will follow up.");
      track("dastor_assessment_requested", { resource: "assessment" });
      e.currentTarget.reset();
    } catch {
      setStatus("error");
      setMessage("Network error. Try again, or email assessments via your BlockSiFr contact channel.");
    }
  }

  return (
    <form className="assessment-form" onSubmit={onSubmit} noValidate>
      <div className="grid">
        <label className="wide">
          Name
          <input name="name" required autoComplete="name" maxLength={120} />
        </label>
        <label className="wide">
          Work email
          <input name="email" type="email" required autoComplete="email" maxLength={254} />
        </label>
        <label className="wide">
          Organization
          <input name="organization" autoComplete="organization" maxLength={160} />
        </label>
        <label className="wide">
          Message
          <textarea name="message" required rows={5} maxLength={4000} />
        </label>
      </div>
      <label className="consent">
        <input name="consent" type="checkbox" required />
        <span>
          I request a IEG Field Manual assessment conversation and agree to the{" "}
          <a href="/privacy">privacy notice</a>.
        </span>
      </label>
      <button className="btn btn-primary" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting…" : "Request a IEG Assessment"}
      </button>
      {message ? (
        <p className={status === "error" ? "err" : "ok"} role="status">
          {message}
        </p>
      ) : null}
      <style>{`
        .assessment-form { display:grid; gap:1rem; max-width:40rem; margin-top:2rem; }
        .grid { display:grid; gap:1rem; grid-template-columns:1fr 1fr; }
        label { display:flex; flex-direction:column; gap:.35rem; font-family:var(--font-mono); font-size:.7rem; letter-spacing:.08em; text-transform:uppercase; color:var(--dastor-ink); }
        input:not([type="checkbox"]), textarea {
          text-transform:none; letter-spacing:normal; font-family:var(--font-serif); font-size:1rem;
          min-height:44px; padding:.65rem .8rem; border:1px solid var(--dastor-line-dark); background:#fff; color:var(--dastor-ink);
        }
        textarea { min-height:8rem; resize:vertical; }
        .wide { grid-column: 1 / -1; }
        .consent { display:flex; flex-direction:row; gap:.75rem; align-items:flex-start; text-transform:none; letter-spacing:normal; font-family:var(--font-serif); font-size:.95rem; }
        .consent input { margin-top:.25rem; min-width:1.1rem; min-height:1.1rem; }
        .ok { color:#1f5b2f; margin:0; }
        .err { color: var(--dastor-signal); margin:0; }
        @media (max-width: 640px) { .grid { grid-template-columns:1fr; } }
      `}</style>
    </form>
  );
}
