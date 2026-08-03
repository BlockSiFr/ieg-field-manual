export type DastorEventName =
  | "dastor_sample_requested"
  | "dastor_sample_downloaded"
  | "dastor_chapter_viewed"
  | "dastor_stack_layer_selected"
  | "dastor_assessment_requested"
  | "dastor_manual_checkout_started"
  | "dastor_checkout_started"
  | "dastor_checkout_completed"
  | "dastor_access_unlocked"
  | "dastor_invite_accepted"
  | "dastor_gift_seat_started"
  | "dastor_share_clicked";

/** Client analytics , never send PII or manuscript content. */
export function track(event: DastorEventName, props?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  if (import.meta.env.PUBLIC_ANALYTICS_ENABLED !== "true") return;
  const detail = { event, props: props ?? {}, ts: Date.now() };
  window.dispatchEvent(new CustomEvent("dastor:analytics", { detail }));
  // Optional App Insights / Clarity hooks can subscribe to dastor:analytics
}
