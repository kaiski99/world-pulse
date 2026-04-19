# World Pulse — Tracking Spec (20 Conversion-Psychology Principles)

## Setup

Add to `.env.local`:
```
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

No PII in event payloads. Emails hashed server-side via `lib/tracking/server.ts`.

---

## Event Catalog

### Primary Conversions

| Event | Trigger | Principle IDs | Properties |
|-------|---------|---------------|------------|
| `dashboard_refresh` | User clicks REFRESH or presses R | 1, 5, 17 | `source_count`, `cluster_count`, `has_actions`, `has_summary`, `fetch_duration_ms` |
| `briefing_full_read` | AI briefing panel visible for 10s+ | 1, 4, 11 | `time_visible_ms` |
| `action_engaged` | User expands an action card | 6, 7, 9, 14 | `action_type`, `urgency`, `confidence`, `position_index` |
| `profile_saved` | User saves business profile | 2, 10, 12 | `portfolio_count`, `interest_count`, `goal_count`, `risk_tolerance`, `region_count`, `profile_completeness_pct` |

### Secondary Conversions

| Event | Trigger | Principle IDs | Properties |
|-------|---------|---------------|------------|
| `view_switch` | Tab click or Tab key | 13, 16 | `from_view`, `to_view`, `trigger` (click/keyboard) |
| `filter_used` | Priority vertical filter click or 1-5 key | 8, 13, 16 | `filter_value`, `previous_filter` |
| `cluster_expanded` | Signal cluster card expand | 3, 4, 11 | `cluster_id`, `cluster_name`, `signal_strength`, `source_count`, `position_index` |
| `search_used` | Search input (500ms debounce) | 16 | `query_length`, `action` (typed/cleared) |
| `flow_table_expanded` | Flow table header click | 8, 11 | `table_title`, `row_count` |
| `scroll_depth` | Page scroll milestones | 5, 15, 19 | `depth_pct` (25/50/75/100) |

### Micro Conversions

| Event | Trigger | Principle IDs | Properties |
|-------|---------|---------------|------------|
| `source_link_clicked` | External source link click | 3 | `source_key`, `item_title` |
| `action_filter_changed` | Action type filter change | 13, 14 | `filter_type`, `previous_filter` |
| `keyboard_shortcut_used` | Any keyboard shortcut | 16 | `key`, `action` |
| `heatmap_sorted` | Heatmap column sort | 8 | `column` |
| `world_map_cluster_selected` | Map cluster click | 19 | `cluster_id`, `cluster_name` |
| `source_retried` | Retry failed source | 17 | `source_key` |
| `settings_page_visited` | Navigate to /settings | 2, 12 | — |
| `company_added` | Add portfolio company | 2, 10 | `portfolio_count_after` |
| `actions_panel_toggled` | Open/close action center | 6, 11, 13 | `expanded` |
| `summary_panel_toggled` | Expand/collapse AI briefing | 1, 11 | `expanded` |
| `session_end` | Page unload | 5, 15 | `duration_ms`, `refresh_count`, `views_visited` |

---

## 20 Principles → Dashboard Mapping

| # | Principle | Dashboard Adaptation | Key Events |
|---|-----------|---------------------|------------|
| 1 | Reciprocity | Free AI briefing before engagement | `dashboard_refresh`, `briefing_full_read`, `summary_panel_toggled` |
| 2 | Commitment | Profile setup → richer signals | `profile_saved`, `settings_page_visited`, `company_added` |
| 3 | Social Proof | Cross-source cluster validation | `cluster_expanded`, `source_link_clicked` |
| 4 | Authority | Market regime + signal strength labels | `briefing_full_read`, `cluster_expanded` |
| 5 | Liking | Aesthetic engagement, time on dashboard | `scroll_depth`, `session_end` |
| 6 | Scarcity | Action urgency labels (NOW/THIS WEEK) | `action_engaged`, `actions_panel_toggled` |
| 7 | Loss Aversion | Red negative-change indicators | `action_engaged` |
| 8 | Anchoring | First-seen flow values, sort choices | `filter_used`, `flow_table_expanded`, `heatmap_sorted` |
| 9 | Framing | A/B: opportunity vs risk in briefings | `action_engaged` |
| 10 | Endowment | Personalized headers, profile ownership | `profile_saved`, `company_added` |
| 11 | Curiosity Gap | Collapsed clusters, truncated rationale | `cluster_expanded`, `flow_table_expanded`, `actions_panel_toggled`, `summary_panel_toggled` |
| 12 | Completion Bias | Profile completeness % | `profile_saved`, `settings_page_visited` |
| 13 | Default Effect | Default view/filter/panel states | `view_switch`, `filter_used`, `action_filter_changed`, `actions_panel_toggled` |
| 14 | Decoy Effect | Three confidence levels | `action_engaged`, `action_filter_changed` |
| 15 | Peak-End Rule | Session summary, critical signal timing | `scroll_depth`, `session_end` |
| 16 | Cognitive Ease | Keyboard shortcut adoption, search | `keyboard_shortcut_used`, `search_used`, `view_switch`, `filter_used` |
| 17 | Goal Gradient | Action urgency progression, refresh pace | `source_retried`, `dashboard_refresh` |
| 18 | Mere Exposure | Persistent vs dismissible elements | A/B test: `persistent-elements` |
| 19 | Serial Position | Card ordering, position clicks | `scroll_depth`, `world_map_cluster_selected` |
| 20 | Novelty Seeking | NEW badges on fresh signals | A/B test: `new-signal-badge` |

---

## A/B Tests

| Flag Key | Principle | Variants | Primary Metric | Hypothesis |
|----------|-----------|----------|----------------|------------|
| `authority-badge-style` | 4 | minimal / prominent | `action_engaged` | Prominent regime badges increase action engagement |
| `briefing-framing` | 9 | opportunity / risk | `briefing_full_read` | Opportunity framing increases full reads |
| `personalized-headers` | 10 | generic / personalized | `cluster_expanded` | "Your Signals" increases cluster expansion |
| `default-view` | 13 | signals / flows | `view_switch` | Signals default drives more tab switching |
| `session-summary` | 15 | none / show-summary | `dashboard_refresh` | End-of-session summary increases return rate |
| `persistent-elements` | 18 | dismissible / persistent | `action_engaged` | Persistent regime badge increases action engagement |
| `action-card-order` | 19 | urgency-first / confidence-first | `action_engaged` | Urgency-first ordering drives more engagement |
| `new-signal-badge` | 20 | no-badge / show-new | `cluster_expanded` | NEW badges increase cluster expansion |

Configure these as Feature Flags in PostHog with multivariate testing enabled.

---

## Dashboard Config (PostHog)

Create 20 tiles, one per principle:

1. **Reciprocity** — Funnel: `dashboard_refresh` → `briefing_full_read`. Conversion rate.
2. **Commitment** — Funnel: `settings_page_visited` → `profile_saved`. Profile completeness distribution.
3. **Social Proof** — `cluster_expanded` rate by `source_count`. Higher source count → higher expansion?
4. **Authority** — `cluster_expanded` rate by `signal_strength`. CRITICAL vs WEAK expansion rate.
5. **Liking** — `session_end.duration_ms` distribution. Avg session duration trend.
6. **Scarcity** — `action_engaged` rate by `urgency`. NOW vs THIS WEEK vs WATCH.
7. **Loss Aversion** — `action_engaged` rate by `action_type`. Trades (loss-framed) vs yields.
8. **Anchoring** — `heatmap_sorted` column distribution. Which column users anchor on.
9. **Framing** — A/B: `briefing-framing` experiment results.
10. **Endowment** — A/B: `personalized-headers` experiment results.
11. **Curiosity Gap** — `cluster_expanded` / total cluster impressions. Expansion rate.
12. **Completion Bias** — `profile_completeness_pct` distribution. Correlation with return visits.
13. **Default Effect** — A/B: `default-view` experiment results.
14. **Decoy Effect** — `action_engaged` rate by `confidence` level.
15. **Peak-End Rule** — A/B: `session-summary` experiment results.
16. **Cognitive Ease** — `keyboard_shortcut_used` adoption rate over time.
17. **Goal Gradient** — `dashboard_refresh` frequency acceleration within sessions.
18. **Mere Exposure** — A/B: `persistent-elements` experiment results.
19. **Serial Position** — `cluster_expanded` rate by `position_index`. First/last effect.
20. **Novelty** — A/B: `new-signal-badge` experiment results.

---

## How to Add New Events

1. Add event definition to `lib/tracking/principles_map.ts` → `EVENT_DEFINITIONS`
2. Import `trackEvent` or `trackConversion` from `lib/tracking/events`
3. Call at the trigger point with properties matching the schema
4. Update this doc

## How to Add New A/B Tests

1. Add test config to `lib/tracking/ab-tests.ts` → `AB_TESTS`
2. Create Feature Flag in PostHog with matching `flag_key`
3. Use `useFeatureFlag(flagKey)` in the component to read the variant
4. Track the `variant_id` property on relevant events
5. Update this doc

## Privacy

- No PII in any event payload
- Emails hashed with SHA-256 server-side (`lib/tracking/server.ts`)
- PostHog configured with `autocapture: false` — only explicit events
- No session recordings enabled by default
