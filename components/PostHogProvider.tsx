"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

    if (!key) return;

    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      autocapture: false,
    });

    (window as any).__posthog = posthog;

    posthog.capture("$pageview", { path: window.location.pathname });

    return () => {
      (window as any).__posthog = null;
    };
  }, []);

  return <>{children}</>;
}
