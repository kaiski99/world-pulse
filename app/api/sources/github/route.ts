import { NextResponse } from "next/server";
import { fetchGitHub } from "@/lib/sources/github";

export async function GET() {
  return NextResponse.json(await fetchGitHub());
}
