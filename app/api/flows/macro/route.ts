import { NextResponse } from "next/server";
import { fetchMacroFlows } from "@/lib/flows/macro";

export async function GET() {
  return NextResponse.json(await fetchMacroFlows());
}
