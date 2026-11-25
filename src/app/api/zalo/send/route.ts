import { NextRequest, NextResponse } from "next/server";
import { multiZaloBotManager } from "@/server/zaloBotService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      phone, 
      userId, 
      groupId, 
      groupUrl, 
      groupName,
      className,
      message,
      accountId,
      senderRole,
      senderPhone 
    } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Nội dung tin nhắn không được để trống." },
        { status: 400 }
      );
    }

    const res = await multiZaloBotManager.sendMessageFromAccount({
      phone,
      userId,
      groupId,
      groupUrl,
      groupName,
      className,
      message,
      accountId,
      senderRole,
      senderPhone,
    });

    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi xử lý gửi tin Zalo" },
      { status: 500 }
    );
  }
}
