import { NextResponse } from "next/server";

function denyUnknownAdminApiRoute() {
  return NextResponse.json({ error: "Forbidden." }, { status: 403 });
}

export async function GET() {
  return denyUnknownAdminApiRoute();
}

export async function POST() {
  return denyUnknownAdminApiRoute();
}

export async function PUT() {
  return denyUnknownAdminApiRoute();
}

export async function PATCH() {
  return denyUnknownAdminApiRoute();
}

export async function DELETE() {
  return denyUnknownAdminApiRoute();
}
