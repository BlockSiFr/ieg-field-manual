import { json } from "../shared/http.js";
import { stripeConfig, stripeEnabled } from "../shared/commerce.js";

export default async function (context, req) {
  const cfg = stripeConfig();
  const ready = stripeEnabled(cfg) && !!cfg.priceDigital;
  context.res = json(200, {
    ok: true,
    service: "dastor-api",
    ts: new Date().toISOString(),
    commerce: {
      ready,
      provider: cfg.provider,
      hasKey: cfg.secretKey.startsWith("sk_"),
      hasPrice: !!cfg.priceDigital,
      enabledFlag: cfg.commerceEnabled,
    },
  });
}
