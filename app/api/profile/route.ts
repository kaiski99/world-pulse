import { NextResponse } from "next/server";
import { DEFAULT_BUSINESS_PROFILE } from "@/lib/config/business-profile";

export async function GET() {
  return NextResponse.json(DEFAULT_BUSINESS_PROFILE);
}
