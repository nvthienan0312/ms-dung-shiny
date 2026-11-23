import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STORE_KEY = "main_center_data";

// Lấy dữ liệu toàn trung tâm từ Cloud PostgreSQL (Supabase)
export async function GET() {
  try {
    const record = await prisma.centerDataStore.findUnique({
      where: { key: STORE_KEY },
    });

    if (!record || !record.data) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "Chưa có dữ liệu trên Cloud Database. Hệ thống sẽ khởi tạo từ phiên hiện tại.",
      });
    }

    return NextResponse.json({
      success: true,
      data: record.data,
      updatedAt: record.updatedAt,
    });
  } catch (error: any) {
    console.error("[CLOUD SYNC GET ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Lỗi đọc dữ liệu từ Cloud Database",
      },
      { status: 500 }
    );
  }
}

// Lưu dữ liệu toàn trung tâm lên Cloud PostgreSQL (Supabase)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data } = body;

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { success: false, error: "Dữ liệu không hợp lệ để đồng bộ." },
        { status: 400 }
      );
    }

    const saved = await prisma.centerDataStore.upsert({
      where: { key: STORE_KEY },
      create: {
        key: STORE_KEY,
        data,
      },
      update: {
        data,
      },
    });

    return NextResponse.json({
      success: true,
      updatedAt: saved.updatedAt,
      message: "Đã lưu dữ liệu lên Cloud Database an toàn!",
    });
  } catch (error: any) {
    console.error("[CLOUD SYNC POST ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Lỗi lưu dữ liệu lên Cloud Database",
      },
      { status: 500 }
    );
  }
}
