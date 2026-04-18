import { NextResponse } from "next/server";
import { generateSummary } from "@/lib/ai/summarize";
import type { PulseSnapshot, BusinessProfile } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { snapshot, profile } = (await request.json()) as {
      snapshot: PulseSnapshot;
      profile?: BusinessProfile;
    };

    const summary = await generateSummary(snapshot, profile);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("[summarize] Error generating summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
