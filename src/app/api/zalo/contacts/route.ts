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
    const contacts = await bot.getContacts();

    return NextResponse.json(contacts);
  } catch (error: any) {
    return NextResponse.json(
      { friends: [], groups: [], self: null, error: error?.message },
      { status: 500 }
    );
  }
}
