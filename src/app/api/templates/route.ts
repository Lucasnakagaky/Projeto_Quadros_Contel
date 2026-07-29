import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { handleError } from "@/lib/api-utils";

export async function GET() {
  try {
    const db = await readDb();
    return NextResponse.json(db.templates);
  } catch (err) {
    return handleError(err);
  }
}
