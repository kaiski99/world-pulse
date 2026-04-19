export interface ABTest {
  principle_id: number;
  flag_key: string;
  variants: string[];
  description: string;
  primary_metric: string;
}

export const AB_TESTS: Record<string, ABTest> = {
  "authority-badge-style": {
    principle_id: 4,
    flag_key: "authority-badge-style",
    variants: ["minimal", "prominent"],
    description: "Test whether prominent market regime badges increase action_engaged rate",
    primary_metric: "action_engaged",
  },
  "briefing-framing": {
    principle_id: 9,
    flag_key: "briefing-framing",
    variants: ["opportunity", "risk"],
    description: "Test opportunity vs risk framing in AI briefing language",
    primary_metric: "briefing_full_read",
  },
  "personalized-headers": {
    principle_id: 10,
    flag_key: "personalized-headers",
    variants: ["generic", "personalized"],
    description: 'Test "Your Signals" vs "Signals" headers',
    primary_metric: "cluster_expanded",
  },
  "default-view": {
    principle_id: 13,
    flag_key: "default-view",
    variants: ["signals", "flows"],
    description: "Test which default view drives more engagement",
    primary_metric: "view_switch",
  },
  "session-summary": {
    principle_id: 15,
    flag_key: "session-summary",
    variants: ["none", "show-summary"],
    description: "Test end-of-session summary modal impact on return rate",
    primary_metric: "dashboard_refresh",
  },
  "persistent-elements": {
    principle_id: 18,
    flag_key: "persistent-elements",
    variants: ["dismissible", "persistent"],
    description: "Test persistent vs dismissible market regime badge",
    primary_metric: "action_engaged",
  },
  "action-card-order": {
    principle_id: 19,
    flag_key: "action-card-order",
    variants: ["urgency-first", "confidence-first"],
    description: "Test action card ordering by urgency vs confidence",
    primary_metric: "action_engaged",
  },
  "new-signal-badge": {
    principle_id: 20,
    flag_key: "new-signal-badge",
    variants: ["no-badge", "show-new"],
    description: "Test NEW badge on recent signals for cluster expansion rate",
    primary_metric: "cluster_expanded",
  },
};

export function useFeatureFlag(flagKey: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const posthog = (window as any).__posthog;
  if (!posthog) return undefined;
  return posthog.getFeatureFlag(flagKey) as string | undefined;
}

export function getAllExperimentAssignments(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const posthog = (window as any).__posthog;
  if (!posthog) return {};

  const assignments: Record<string, string> = {};
  for (const test of Object.values(AB_TESTS)) {
    const val = posthog.getFeatureFlag(test.flag_key);
    if (val) assignments[test.flag_key] = val as string;
  }
  return assignments;
}
