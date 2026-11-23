"use client";

import React, { useState, useEffect } from "react";
import { useCenter } from "@/context/CenterContext";
import { ZaloAccountRole } from "@/data/centerData";
import { 
  MessageSquare, 
  ExternalLink, 
  ShieldCheck, 
  Send, 
  CheckCircle2, 
  Clock, 
  Settings2,
  FileText,
  PhoneCall,
  ChevronDown,
  X,
  AlertTriangle,
  Wifi,
  WifiOff
} from "lucide-react";
import ZaloAccountModal from "./ZaloAccountModal";
import { cleanPhoneNumber, formatDisplayPhone, getZaloWebChatUrl } from "@/utils/zaloHelper";

interface ZaloTopBarBannerProps {
  activeRole: ZaloAccountRole | "PARENT";
  staffName?: string;
  staffPhone?: string;
}

export default function ZaloTopBarBanner({
  activeRole,
  staffName,
  staffPhone,
}: ZaloTopBarBannerProps) {
  const { zaloAccounts, zaloMessageLogs } = useCenter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"ACCOUNT" | "LOGS" | "TEST">("ACCOUNT");
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Trạng thái bot Zalo thực từ API server
  const [botConnected, setBotConnected] = useState(false);
  const [botUser, setBotUser] = useState<{ name: string; phone?: string } | null>(null);

  useEffect(() => {
    if (activeRole === "PARENT") return;
    let mounted = true;
    const checkBot = async () => {
      try {
        const query = new URLSearchParams({
          role: activeRole,
          account: activeRole.toLowerCase(),
          phone: staffPhone || "",
        });
        const res = await fetch(`/api/zalo/status?${query.toString()}`);
        if (res.ok && mounted) {
          const data = await res.json();
          setBotConnected(!!data.isConnected);
          setBotUser(data.user || null);
        }
      } catch (_e) {}
    };
    checkBot();
    const interval = setInterval(checkBot, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, [activeRole, staffPhone]);

  // Giao diện cho Phụ Huynh
  if (activeRole === "PARENT") {
    if (isCollapsed) {
      return (
        <div className="bg-slate-900 text-slate-300 text-[11px] px-3 py-1 flex items-center justify-between border-b border-slate-800">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            💬 Hotline Zalo Trung Tâm: <strong className="text-white">0964 645 174</strong>
          </span>
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="text-slate-400 hover:text-white text-[10.5px] underline cursor-pointer"
          >
            Mở rộng
          </button>
        </div>
      );
    }

    return (
      <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-3 sm:px-6 py-1.5 text-xs shadow-2xs">
        <div className="max-w-7xl 2xl:max-w-[1500px] mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-semibold text-amber-300 flex items-center gap-1">
              💬 Hotline Zalo Trung Tâm:
            </span>
            <span className="text-white font-mono font-bold">
              0964 645 174 (Ms. Dung Shiny)
            </span>
            <span className="text-[10.5px] px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">
              ● Trực Tuyến
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://zalo.me/0964645174"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-0.8 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] transition shadow-2xs flex items-center gap-1"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Nhắn Zalo</span>
            </a>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
              title="Thu gọn thanh Zalo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const staffRole = activeRole as ZaloAccountRole;

  // Tìm thông tin tài khoản Zalo tương ứng
  const currentZalo = zaloAccounts.find((a) => {
    if (staffRole === "ADMIN") return a.role === "ADMIN";
    if (staffPhone) return cleanPhoneNumber(a.phoneNumber) === cleanPhoneNumber(staffPhone);
    return a.role === staffRole;
  }) || {
    id: `zalo-${staffRole.toLowerCase()}-current`,
    role: staffRole,
    accountType: staffRole === "ADMIN" ? ("CENTER_HOTLINE" as const) : ("PERSONAL" as const),
    accountName: staffRole === "ADMIN" ? "Ms. Dung Shiny (Hotline Trung Tâm)" : (staffName ? `${staffName} (Zalo)` : "Zalo Cá Nhân"),
    phoneNumber: staffRole === "ADMIN" ? "0964645174" : (staffPhone || ""),
    isConnected: false,
  };

  const roleTitle =
    staffRole === "ADMIN"
      ? "Zalo Hotline Trung Tâm"
      : staffRole === "TEACHER"
      ? "Zalo Giáo Viên"
      : "Zalo Trợ Giảng";

  const displayName =
    staffRole === "ADMIN"
      ? "Ms. Dung Shiny"
      : staffName || (staffRole === "TEACHER" ? "Giáo Viên" : "Trợ Giảng");

  const formattedPhone = formatDisplayPhone(currentZalo.phoneNumber);

  const handleOpenModal = (tab: "ACCOUNT" | "LOGS" | "TEST") => {
    setModalTab(tab);
    setIsModalOpen(true);
  };

  if (isCollapsed) {
    return (
      <div className="bg-slate-900 text-slate-300 text-[11px] px-3 py-1 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>💬 Zalo Hub: <strong>{displayName}</strong> ({formattedPhone})</span>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="text-slate-400 hover:text-white text-[10.5px] underline cursor-pointer"
        >
          Hiển thị thanh Zalo
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-3 sm:px-4 lg:px-6 py-1.5 text-xs shadow-2xs select-none">
        <div className="max-w-7xl 2xl:max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
          
          {/* CỘT TRÁI: TINH GỌN - THÔNG TIN TÀI KHOẢN VÀ TRẠNG THÁI */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 font-bold text-white shrink-0">
              <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10.5px]">
                💬
              </span>
              <span className="text-blue-300 font-semibold">{roleTitle}:</span>
              <span className="text-white">{displayName}</span>
              <span className="font-mono text-amber-300 font-bold bg-white/10 px-1.5 py-0.2 rounded text-[11px]">
                {formattedPhone}
              </span>
            </div>

            {/* Trạng thái kết nối Zalo */}
            {botConnected || currentZalo.isConnected ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-bold text-[10px] flex items-center gap-1.5 shrink-0" title={`Zalo đã kết nối: ${botUser?.name || displayName}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Zalo: Đã Kết Nối ({botUser?.name || displayName})</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenModal("ACCOUNT")}
                className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-[10px] flex items-center gap-1.5 shrink-0 hover:bg-rose-500/30 transition cursor-pointer"
                title="Bấm vào đây để quét mã QR kết nối Zalo"
              >
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Zalo: Chưa Kết Nối (Quét QR)</span>
              </button>
            )}

            <span className="hidden lg:inline text-slate-400 text-[10.5px]">
              • Tự động gửi Zalo 100% (Không cần Ctrl+V) • Giãn cách 2-3 phút chống spam
            </span>
          </div>

          {/* CỘT PHẢI: BỘ NÚT TINH GỌN, KHÔNG RỐI MẮT */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {/* Nút Mở Zalo Web */}
            <button
              type="button"
              onClick={() => window.open(getZaloWebChatUrl(), "_blank", "noopener,noreferrer")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition shadow-2xs active:scale-95 cursor-pointer"
              title="Mở Zalo Web (chat.zalo.me)"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Zalo Web</span>
            </button>

            {/* Nút Gửi Tin Thử */}
            <button
              type="button"
              onClick={() => handleOpenModal("TEST")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-[11px] transition border border-white/10 active:scale-95 cursor-pointer"
              title="Thử nghiệm gửi tin Zalo"
            >
              <Send className="w-3 h-3 text-amber-300" />
              <span>Gửi Tin Thử</span>
            </button>

            {/* Nút Cài Đặt / Đổi Số */}
            <button
              type="button"
              onClick={() => handleOpenModal("ACCOUNT")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-[11px] transition border border-white/10 active:scale-95 cursor-pointer"
              title="Thay đổi số điện thoại Zalo hoặc quét mã QR đăng nhập"
            >
              <Settings2 className="w-3 h-3 text-indigo-300" />
              <span>Đổi SĐT / Đăng Nhập</span>
            </button>

            {/* Nút Thu Gọn */}
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer ml-1"
              title="Thu gọn thanh Zalo để màn hình rộng rãi hơn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* MODAL QUẢN LÝ TÀI KHOẢN ZALO */}
      <ZaloAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activeRole={activeRole}
        staffName={staffName}
        staffPhone={staffPhone}
        initialTab={modalTab}
      />
    </>
  );
}
