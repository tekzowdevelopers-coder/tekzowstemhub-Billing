import { NextRequest, NextResponse } from "next/server";
import { retryNotification } from "@/lib/notifications";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await retryNotification(id);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retry notification" }, { status: 500 });
  }
}