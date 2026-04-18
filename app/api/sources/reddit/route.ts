import { NextResponse } from "next/server";
import { fetchReddit } from "@/lib/sources/reddit";

export async function GET() {
  return NextResponse.json(await fetchReddit());
}
