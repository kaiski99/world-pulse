import { useEffect, useRef, useCallback } from "react";
import { EVENT_DEFINITIONS } from "./principles_map";

let dashboardState: {
  active_view: string;
  active_filter: string;
  has_data: boolean;
  cluster_count: number;
  action_count: number;
} = {
  active_view: "signals",
  active_filter: "all",
  has_data: false,
  cluster_count: 0,
  action_count: 0,
};

export function updateDashboardState(state: Partial<typeof dashboardState>) {
  Object.assign(dashboardState, state);
}

function getPostHog(): any {
  if (typeof window === "undefined") return null;
  return (window as any).__posthog;
}

export function trackEvent(eventName: string, properties: Record<string, any> = {}) {
  const posthog = getPostHog();
  if (!posthog) return;

  const def = EVENT_DEFINITIONS[eventName];
  posthog.capture(eventName, {
    ...properties,
    principle_ids: def?.principle_ids || [],
    conversion_type: def?.conversion_type || "micro",
    dashboard_state: { ...dashboardState },
    timestamp: new Date().toISOString(),
  });
}

export function trackConversion(eventName: string, properties: Record<string, any> = {}) {
  trackEvent(eventName, { ...properties, is_conversion: true });
}

export function trackTiming(eventName: string, durationMs: number, properties: Record<string, any> = {}) {
  trackEvent(eventName, { ...properties, duration_ms: durationMs });
}

export function useScrollDepth() {
  const firedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const thresholds = [25, 50, 75, 100];

    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);

      for (const t of thresholds) {
        if (pct >= t && !firedRef.current.has(t)) {
          firedRef.current.add(t);
          trackEvent("scroll_depth", { depth_pct: t });
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
}

export function useSessionTimer() {
  const startRef = useRef(Date.now());
  const refreshCountRef = useRef(0);
  const viewsRef = useRef<Set<string>>(new Set(["signals"]));

  const incrementRefresh = useCallback(() => {
    refreshCountRef.current++;
  }, []);

  const addView = useCallback((view: string) => {
    viewsRef.current.add(view);
  }, []);

  useEffect(() => {
    function handleUnload() {
      trackEvent("session_end", {
        duration_ms: Date.now() - startRef.current,
        refresh_count: refreshCountRef.current,
        views_visited: Array.from(viewsRef.current).join(","),
      });
    }
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  return { incrementRefresh, addView };
}

export function useBriefingReadTracker(expanded: boolean, hasSummary: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (expanded && hasSummary && !firedRef.current) {
      startRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        trackConversion("briefing_full_read", {
          time_visible_ms: Date.now() - startRef.current,
        });
      }, 10_000);
    } else if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [expanded, hasSummary]);
}
