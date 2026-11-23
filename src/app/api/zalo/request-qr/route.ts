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

    const { accountId, role, phone, forceNew } = body;
    const bot = multiZaloBotManager.getBotInstance(accountId, role, phone);
    const res = await bot.initQrLogin(!!forceNew);

    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Lỗi tạo QR Zalo" },
      { status: 500 }
    );
  }
}
