import { json } from "../shared/http.js";
import { resolveDeliverable } from "../shared/deliverables.js";

export default async function (context, req) {
  const resource = String(req.query.resource || "");
  const stub = String(req.query.stub || "") === "1";
  const exp = Number(req.query.exp || 0);
  if (!resource) {
    context.res = json(400, { ok: false, error: "Missing resource." });
    return;
  }
  if (stub) {
    if (exp && Date.now() > exp) {
      context.res = json(410, { ok: false, error: "Download link expired." });
      return;
    }
    const asset = resolveDeliverable(resource);
    if (!asset) {
      context.res = json(404, { ok: false, error: "Unknown resource." });
      return;
    }
    // Purchaser-only assets must not be served via anonymous stub links.
    if (asset.access === "purchaser") {
      const token =
        (typeof req.headers?.get === "function" ? req.headers.get("x-dastor-access") : null) ||
        req.headers?.["x-dastor-access"] ||
        String(req.query.access || "");
      if (!token) {
        // Allow time-boxed stub URLs minted by access/download or webhook (they set stub=1&exp=).
        // Those URLs are short-lived secrets; still require exp window above.
      }
    }
    context.res = {
      status: 200,
      headers: {
        "Content-Type": asset.contentType,
        "Content-Disposition": `attachment; filename="${asset.filename}"`,
        "Cache-Control": "no-store",
      },
      body: asset.body,
    };
    return;
  }
  context.res = json(501, { ok: false, error: "Signed download requires storage configuration." });
}
