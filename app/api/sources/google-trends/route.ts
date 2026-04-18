import { NextResponse } from "next/server";
import { fetchGoogleTrends } from "@/lib/sources/google-trends";

export async function GET() {
  return NextResponse.json(await fetchGoogleTrends());
}
