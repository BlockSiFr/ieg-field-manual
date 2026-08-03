import { json, rateLimit, clientKey } from "../shared/http.js";

const ALLOWED = new Set([
  "dastor_sample_requested",
  "dastor_sample_downloaded",
  "dastor_chapter_viewed",
  "dastor_stack_layer_selected",
  "dastor_assessment_requested",
  "dastor_manual_checkout_started",
]);

export default async function (context, req) {
  if (!rateLimit(clientKey(req), 30)) {
    context.res = json(429, { ok: false });
    return;
  }
  const event = String(req.body?.event || "");
  if (!ALLOWED.has(event)) {
    context.res = json(400, { ok: false, error: "Unknown event." });
    return;
  }
  // Never log raw PII or manuscript content
  console.info(JSON.stringify({ event, props: req.body?.props || {}, ts: new Date().toISOString() }));
  context.res = json(202, { ok: true });
}
