export interface Principle {
  id: number;
  name: string;
  description: string;
  dashboard_adaptation: string;
}

export const PRINCIPLES: Record<number, Principle> = {
  1: { id: 1, name: "Reciprocity", description: "Emotion→logic sequence", dashboard_adaptation: "Free AI briefing before engagement ask" },
  2: { id: 2, name: "Commitment & Consistency", description: "Small ask first", dashboard_adaptation: "Profile setup leads to richer signals" },
  3: { id: 3, name: "Social Proof", description: "Cross-source validation", dashboard_adaptation: "Signal cluster source counts, engagement bars" },
  4: { id: 4, name: "Authority", description: "Expert credibility signals", dashboard_adaptation: "Market regime badges, signal strength labels" },
  5: { id: 5, name: "Liking", description: "Brand affinity / aesthetic", dashboard_adaptation: "Time-on-dashboard, theme engagement" },
  6: { id: 6, name: "Scarcity & Urgency", description: "Time-sensitive signals", dashboard_adaptation: "Action urgency labels (NOW, THIS WEEK)" },
  7: { id: 7, name: "Loss Aversion", description: "Fear of missing", dashboard_adaptation: "Red negative-change indicators, missed signals" },
  8: { id: 8, name: "Anchoring", description: "First value anchors perception", dashboard_adaptation: "First-seen flow values, heatmap sort choices" },
  9: { id: 9, name: "Framing", description: "Opportunity vs risk framing", dashboard_adaptation: "A/B briefing language: opportunity vs risk" },
  10: { id: 10, name: "Endowment Effect", description: "Ownership increases value", dashboard_adaptation: "Personalized 'Your Signals' vs generic headers" },
  11: { id: 11, name: "Curiosity Gap", description: "Teaser → reveal", dashboard_adaptation: "Collapsed clusters, truncated action rationale" },
  12: { id: 12, name: "Completion Bias", description: "Progress drives action", dashboard_adaptation: "Profile completeness %, engagement bars" },
  13: { id: 13, name: "Default Effect", description: "Pre-selected wins", dashboard_adaptation: "Default view, default filter, panel state" },
  14: { id: 14, name: "Decoy Effect", description: "Third option anchors choice", dashboard_adaptation: "Three confidence levels make medium feel safe" },
  15: { id: 15, name: "Peak-End Rule", description: "Last moment matters", dashboard_adaptation: "Session summary, critical signal highlight timing" },
  16: { id: 16, name: "Cognitive Ease", description: "Simplicity reduces friction", dashboard_adaptation: "Keyboard shortcut adoption, search patterns" },
  17: { id: 17, name: "Goal Gradient", description: "Closer = faster action", dashboard_adaptation: "Action urgency progression, refresh acceleration" },
  18: { id: 18, name: "Mere Exposure", description: "Repetition builds preference", dashboard_adaptation: "Persistent vs dismissible elements, return visits" },
  19: { id: 19, name: "Serial Position", description: "First/last items recalled", dashboard_adaptation: "Action card ordering, cluster position clicks" },
  20: { id: 20, name: "Novelty Seeking", description: "New triggers attention", dashboard_adaptation: "NEW badges on fresh signals" },
};

export type ConversionType = "primary" | "secondary" | "micro";

export interface EventDefinition {
  description: string;
  principle_ids: number[];
  conversion_type: ConversionType;
  properties: Record<string, string>;
}

export const EVENT_DEFINITIONS: Record<string, EventDefinition> = {
  // Primary conversions
  dashboard_refresh: {
    description: "User actively seeks updated intelligence",
    principle_ids: [1, 5, 17],
    conversion_type: "primary",
    properties: {
      source_count: "number",
      cluster_count: "number",
      has_actions: "boolean",
      has_summary: "boolean",
      fetch_duration_ms: "number",
    },
  },
  briefing_full_read: {
    description: "User reads entire AI briefing (10s+ visible)",
    principle_ids: [1, 4, 11],
    conversion_type: "primary",
    properties: {
      summary_length: "number",
      time_visible_ms: "number",
    },
  },
  action_engaged: {
    description: "User expands an action card to read full play",
    principle_ids: [6, 7, 9, 14],
    conversion_type: "primary",
    properties: {
      action_type: "string",
      urgency: "string",
      confidence: "string",
      position_index: "number",
    },
  },
  profile_saved: {
    description: "User saves business profile settings",
    principle_ids: [2, 10, 12],
    conversion_type: "primary",
    properties: {
      portfolio_count: "number",
      interest_count: "number",
      goal_count: "number",
      risk_tolerance: "string",
      region_count: "number",
      profile_completeness_pct: "number",
    },
  },

  // Secondary conversions
  view_switch: {
    description: "User changes between signals/flows/sources tabs",
    principle_ids: [13, 16],
    conversion_type: "secondary",
    properties: {
      from_view: "string",
      to_view: "string",
      trigger: "string",
    },
  },
  filter_used: {
    description: "User applies priority vertical filter",
    principle_ids: [8, 13, 16],
    conversion_type: "secondary",
    properties: {
      filter_value: "string",
      previous_filter: "string",
    },
  },
  cluster_expanded: {
    description: "User expands a signal cluster card",
    principle_ids: [3, 4, 11],
    conversion_type: "secondary",
    properties: {
      cluster_id: "string",
      cluster_name: "string",
      signal_strength: "string",
      source_count: "number",
      position_index: "number",
    },
  },
  search_used: {
    description: "User enters a search query",
    principle_ids: [16],
    conversion_type: "secondary",
    properties: {
      query_length: "number",
      action: "string",
    },
  },
  flow_table_expanded: {
    description: "User opens a collapsed flow table",
    principle_ids: [8, 11],
    conversion_type: "secondary",
    properties: {
      table_title: "string",
      row_count: "number",
    },
  },
  scroll_depth: {
    description: "Page scroll percentage milestones",
    principle_ids: [5, 15, 19],
    conversion_type: "secondary",
    properties: {
      depth_pct: "number",
      active_view: "string",
    },
  },

  // Micro conversions
  source_link_clicked: {
    description: "User clicks through to external source",
    principle_ids: [3],
    conversion_type: "micro",
    properties: {
      source_key: "string",
      item_title: "string",
    },
  },
  action_filter_changed: {
    description: "User filters action types",
    principle_ids: [13, 14],
    conversion_type: "micro",
    properties: {
      filter_type: "string",
      previous_filter: "string",
    },
  },
  keyboard_shortcut_used: {
    description: "User triggers a keyboard shortcut",
    principle_ids: [16],
    conversion_type: "micro",
    properties: {
      key: "string",
      action: "string",
    },
  },
  heatmap_sorted: {
    description: "User sorts the flow heatmap",
    principle_ids: [8],
    conversion_type: "micro",
    properties: {
      column: "string",
      sort_direction: "string",
    },
  },
  world_map_cluster_selected: {
    description: "User clicks a cluster on the world map",
    principle_ids: [19],
    conversion_type: "micro",
    properties: {
      cluster_id: "string",
      cluster_name: "string",
    },
  },
  source_retried: {
    description: "User retries a failed source",
    principle_ids: [17],
    conversion_type: "micro",
    properties: {
      source_key: "string",
    },
  },
  settings_page_visited: {
    description: "User navigates to settings",
    principle_ids: [2, 12],
    conversion_type: "micro",
    properties: {},
  },
  company_added: {
    description: "User adds a portfolio company",
    principle_ids: [2, 10],
    conversion_type: "micro",
    properties: {
      portfolio_count_after: "number",
    },
  },
  actions_panel_toggled: {
    description: "User opens/closes action center",
    principle_ids: [6, 11, 13],
    conversion_type: "micro",
    properties: {
      expanded: "boolean",
    },
  },
  summary_panel_toggled: {
    description: "User expands/collapses AI briefing",
    principle_ids: [1, 11],
    conversion_type: "micro",
    properties: {
      expanded: "boolean",
    },
  },
  session_end: {
    description: "User session ends (page unload)",
    principle_ids: [5, 15],
    conversion_type: "micro",
    properties: {
      duration_ms: "number",
      refresh_count: "number",
      views_visited: "string",
    },
  },
};
