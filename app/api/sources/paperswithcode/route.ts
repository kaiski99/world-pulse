import { NextResponse } from "next/server";
import { fetchPapersWithCode } from "@/lib/sources/paperswithcode";

export async function GET() {
  return NextResponse.json(await fetchPapersWithCode());
}
