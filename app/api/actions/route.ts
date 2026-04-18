import { NextResponse } from "next/server";
import { generateActions } from "@/lib/intelligence/actions";
import type { PulseSnapshot, BusinessProfile } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { snapshot, profile } = (await request.json()) as {
      snapshot: PulseSnapshot;
      profile: BusinessProfile;
    };

    const actions = generateActions(snapshot, profile);

    return NextResponse.json({ actions });
  } catch (error) {
    console.error("[actions] Error generating actions:", error);
    return NextResponse.json(
      { error: "Failed to generate actions" },
      { status: 500 }
    );
  }
}
