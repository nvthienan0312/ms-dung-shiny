import { NextRequest, NextResponse } from "next/server";
import { multiZaloBotManager } from "@/server/zaloBotService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }

    const { accountId, role, phone } = body;
    const bot = multiZaloBotManager.getBotInstance(accountId, role, phone);
    const res = await bot.disconnect();

    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi đăng xuất Zalo" },
      { status: 500 }
    );
  }
}
