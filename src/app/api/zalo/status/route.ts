import { NextRequest, NextResponse } from "next/server";
import { multiZaloBotManager } from "@/server/zaloBotService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const account = searchParams.get("account") || searchParams.get("accountId");
    const role = searchParams.get("role");
    const phone = searchParams.get("phone");

    const bot = multiZaloBotManager.getBotInstance(account || undefined, role || undefined, phone || undefined);
    const status = bot.getStatus();

    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { isConnected: false, status: "error", error: error?.message },
      { status: 500 }
    );
  }
}
