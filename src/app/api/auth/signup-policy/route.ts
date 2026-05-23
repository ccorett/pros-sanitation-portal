import { getPublicSignupPolicy } from "@/lib/signup-access";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(getPublicSignupPolicy());
}
