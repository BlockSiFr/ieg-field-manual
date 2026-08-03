export type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

export function extractUtm(search: string | URLSearchParams): UtmParams {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const pick = (key: keyof UtmParams) => params.get(key) ?? undefined;
  return {
    utm_source: pick("utm_source"),
    utm_medium: pick("utm_medium"),
    utm_campaign: pick("utm_campaign"),
    utm_content: pick("utm_content"),
    utm_term: pick("utm_term"),
  };
}
