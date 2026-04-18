import { NextResponse } from "next/server";
import { fetchPolymarket } from "@/lib/sources/polymarket";

export async function GET() {
  return NextResponse.json(await fetchPolymarket());
}
