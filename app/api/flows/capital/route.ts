import { NextResponse } from "next/server";
import { fetchCapitalFlows } from "@/lib/flows/capital";

export async function GET() {
  return NextResponse.json(await fetchCapitalFlows());
}
