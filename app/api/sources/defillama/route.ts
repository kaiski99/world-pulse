import { NextResponse } from "next/server";
import { fetchDeFiLlama } from "@/lib/sources/defillama";

export async function GET() {
  return NextResponse.json(await fetchDeFiLlama());
}
