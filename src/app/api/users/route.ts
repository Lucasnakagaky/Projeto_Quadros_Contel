import { NextResponse } from "next/server";
import { listUsers } from "@/lib/store";
import { handleError } from "@/lib/api-utils";

export async function GET() {
  try {
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (err) {
    return handleError(err);
  }
}
