import { BusinessProfile } from "../types";

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  orgName: "My Org",
  description: "Web3 venture studio",
  edge: "Distribution",
  portfolio: [
    {
      name: "Example Project",
      category: "DeFi",
      stage: "MVP",
      focus: "Example focus area",
      keywords: ["defi", "trading"],
    },
  ],
  interests: ["AI", "DeFi", "Payments", "Crypto"],
  goals: ["Scale portfolio", "Find income opportunities", "Identify partnerships"],
  riskTolerance: "moderate",
  regions: ["Global"],
};

const STORAGE_KEY = "worldpulse_business_profile";

export function getBusinessProfile(): BusinessProfile {
  if (typeof window === "undefined") return DEFAULT_BUSINESS_PROFILE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_BUSINESS_PROFILE;
}

export function saveBusinessProfile(profile: BusinessProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
