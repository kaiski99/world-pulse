import { NextResponse } from "next/server";
import { fetchHackerNews } from "@/lib/sources/hackernews";

export async function GET() {
  return NextResponse.json(await fetchHackerNews());
}
