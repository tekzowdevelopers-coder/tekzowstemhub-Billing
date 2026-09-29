import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("tekzow_user_email");
  cookieStore.delete("tekzow_active_branch_id");
  return NextResponse.json({ success: true });
}