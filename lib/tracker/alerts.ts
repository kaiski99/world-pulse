import type { TrackerEvent, TrackerSnapshot } from "./types";

export interface AlertConfig {
  quietHoursStart: number; // 0–23, e.g. 22 for 10 PM
  quietHoursEnd: number;   // 0–23, e.g. 7 for 7 AM
  dedupeWindowMs: number;  // don't re-fire same event within this window
}

const DEFAULT_CONFIG: AlertConfig = {
  quietHoursStart: 22,
  quietHoursEnd: 7,
  dedupeWindowMs: 4 * 60 * 60 * 1000, // 4 hours
};

const firedAlerts = new Map<string, number>();

function isQuietHours(config: AlertConfig): boolean {
  const hour = new Date().getHours();
  if (config.quietHoursStart > config.quietHoursEnd) {
    return hour >= config.quietHoursStart || hour < config.quietHoursEnd;
  }
  return hour >= config.quietHoursStart && hour < config.quietHoursEnd;
}

function dedupeKey(event: TrackerEvent): string {
  return `${event.type}:${event.tokenId ?? "global"}:${event.title}`;
}

function shouldFire(event: TrackerEvent, config: AlertConfig): boolean {
  // Only alert on specific event types
  const alertableTypes = ["regime_flip", "state_transition", "macro_surprise", "disqualifier_appeared"];
  if (!alertableTypes.includes(event.type)) return false;

  // State transitions: alert on CONFIRMED, TREND_RIDE, DIP_BUY entries only
  if (event.type === "state_transition") {
    const t = event.title;
    const alertable =
      t.includes("IMBALANCE_CONFIRMED") || t.includes("TREND_RIDE") || t.includes("DIP_BUY");
    if (!alertable) return false;
  }

  // Quiet hours
  if (isQuietHours(config) && event.severity !== "critical") return false;

  // Dedupe
  const key = dedupeKey(event);
  const lastFired = firedAlerts.get(key);
  if (lastFired && Date.now() - lastFired < config.dedupeWindowMs) return false;

  return true;
}

export interface Alert {
  event: TrackerEvent;
  channels: ("push" | "email")[];
  firedAt: string;
}

export function processAlerts(
  snapshot: TrackerSnapshot,
  config: AlertConfig = DEFAULT_CONFIG
): Alert[] {
  const alerts: Alert[] = [];

  for (const event of snapshot.events) {
    if (!shouldFire(event, config)) continue;

    const channels: ("push" | "email")[] = ["push"];
    if (event.severity === "critical") channels.push("email");

    alerts.push({
      event,
      channels,
      firedAt: new Date().toISOString(),
    });

    firedAlerts.set(dedupeKey(event), Date.now());
  }

  // Cleanup old dedupe entries
  const now = Date.now();
  for (const [key, time] of firedAlerts) {
    if (now - time > config.dedupeWindowMs * 2) firedAlerts.delete(key);
  }

  return alerts;
}

// Format alert for push notification / email body
export function formatAlertMessage(alert: Alert): { subject: string; body: string } {
  const evt = alert.event;
  const prefix = evt.severity === "critical" ? "[CRITICAL]" : "[ALERT]";
  return {
    subject: `${prefix} ${evt.title}`,
    body: evt.detail,
  };
}
