import { NextResponse } from "next/server";
import { fetchCoinGecko } from "@/lib/sources/coingecko";

export async function GET() {
  return NextResponse.json(await fetchCoinGecko());
}
