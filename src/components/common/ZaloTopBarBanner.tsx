"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useCenter } from "@/context/CenterContext";
import { ZaloAccountRole } from "@/data/centerData";
import { 
  Send, 
  CheckCircle2, 
  Settings2,
  PhoneCall,
  X,
  AlertTriangle,
} from "lucide-react";
import ZaloAccountModal from "./ZaloAccountModal";
import { buildZaloAccountKey, formatDisplayPhone } from "@/utils/zaloHelper";

interface ZaloTopBarBannerProps {
  activeRole: ZaloAccountRole | "PARENT";
  staffId?: string;
  staffName?: string;
  staffPhone?: string;
}

export default function ZaloTopBarBanner({
  activeRole,
  staffId,
  staffName,
  staffPhone,
}: ZaloTopBarBannerProps) {
  const { userAccounts, currentUserAccount } = useCenter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"ACCOUNT" | "LOGS" | "TEST">("ACCOUNT");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const adminAccount = useMemo(
    () => userAccounts.find((a) => a.role === "ADMIN") || (currentUserAccount?.role === "ADMIN" ? currentUserAccount : undefined),
    [userAccounts, currentUserAccount]
  );

  const accountKey = useMemo(
    () =>
      buildZaloAccountKey({
        role: activeRole,
        staffId: staffId || currentUserAccount?.staffId,
        phone: staffPhone || currentUserAccount?.phone,
        userId: currentUserAccount?.id,
      }),
    [activeRole, staffId, staffPhone, currentUserAccount]
  );

  // Trạng thái bot Zalo thực từ API server (độc lập tuyệt đối theo từng tài khoản)
  const [botConnected, setBotConnected] = useState(false);
  const [botUser, setBotUser] = useState<{ name: string; phone?: string } | null>(null);

  useEffect(() => {
    if (activeRole === "PARENT") return;
    let mounted = true;
    setBotConnected(false);
    setBotUser(null);

    const checkBot = async () => {
      try {
        const query = new URLSearchParams({
          role: activeRole,
          account: accountKey,
          phone: staffPhone || currentUserAccount?.phone || "",
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
    const interval = setInterval(checkBot, 6000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [activeRole, accountKey, staffPhone, currentUserAccount?.phone]);

  // Giao diện cho Phụ Huynh
  if (activeRole === "PARENT") {
    const hotlineRaw = adminAccount?.phone || "";
    const hotlineDisplay = formatDisplayPhone(hotlineRaw) || hotlineRaw;
    const ownerName = adminAccount?.name || "Chủ Trung Tâm";

    if (isCollapsed) {
      return (
        <div className="bg-slate-900 text-slate-300 text-[11px] px-3 py-1 flex items-center justify-between border-b border-slate-800">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            💬 Hotline Zalo Trung Tâm: <strong className="text-white">{hotlineDisplay}</strong>
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
              {hotlineDisplay} ({ownerName})
            </span>
            <span className="text-[10.5px] px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">
              ● Trực Tuyến
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hotlineRaw && (
              <a
                href={`https://zalo.me/${hotlineRaw.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-0.8 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] transition shadow-2xs flex items-center gap-1"
              >
                <PhoneCall className="w-3 h-3" />
                <span>Nhắn Zalo</span>
              </a>
            )}
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
  const roleTitle =
    staffRole === "ADMIN"
      ? "Zalo Quản Trị"
      : staffRole === "TEACHER"
      ? "Zalo Giáo Viên"
      : "Zalo Trợ Giảng";

  const displayName =
    staffName ||
    currentUserAccount?.name ||
    (staffRole === "ADMIN" ? "Quản Trị Viên" : staffRole === "TEACHER" ? "Giáo Viên" : "Trợ Giảng");

  const resolvedPhone = staffPhone || currentUserAccount?.phone || "";
  const formattedPhone = formatDisplayPhone(resolvedPhone) || resolvedPhone;

  const handleOpenModal = (tab: "ACCOUNT" | "LOGS" | "TEST") => {
    setModalTab(tab);
    setIsModalOpen(true);
  };

  if (isCollapsed) {
    return (
      <>
        <div className="bg-slate-900 text-slate-300 text-[11px] px-3 py-1 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${botConnected ? "bg-emerald-400" : "bg-amber-400"}`}></span>
            <span>
              💬 Zalo Riêng: <strong>{displayName}</strong> {formattedPhone ? `(${formattedPhone})` : ""} •{" "}
              {botConnected ? `Đã kết nối (${botUser?.name || "Bot sẵn sàng"})` : "Chưa kết nối"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="text-slate-400 hover:text-white text-[10.5px] underline cursor-pointer"
          >
            Hiển thị thanh Zalo
          </button>
        </div>

        <ZaloAccountModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          activeRole={activeRole}
          staffId={staffId}
          staffName={displayName}
          staffPhone={resolvedPhone}
          initialTab={modalTab}
        />
      </>
    );
  }

  return (
    <>
      <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-3 sm:px-4 lg:px-6 py-1.5 text-xs shadow-2xs select-none">
        <div className="max-w-7xl 2xl:max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
          {/* CỘT TRÁI */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 font-bold text-white shrink-0">
              <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10.5px]">
                💬
              </span>
              <span className="text-blue-300 font-semibold">{roleTitle}:</span>
              <span className="text-white">{displayName}</span>
              {formattedPhone && (
                <span className="font-mono text-amber-300 font-bold bg-white/10 px-1.5 py-0.2 rounded text-[11px]">
                  {formattedPhone}
                </span>
              )}
            </div>

            {botConnected ? (
              <button
                type="button"
                onClick={() => handleOpenModal("ACCOUNT")}
                className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-bold text-[10px] flex items-center gap-1.5 shrink-0 hover:bg-emerald-500/25 transition cursor-pointer"
                title={`Bot Zalo riêng của ${displayName} đang hoạt động`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Zalo Riêng: Đã Kết Nối ({botUser?.name || displayName})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenModal("ACCOUNT")}
                className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-[10px] flex items-center gap-1.5 shrink-0 hover:bg-rose-500/30 transition cursor-pointer"
                title="Tài khoản này chưa đăng nhập Bot Zalo. Bấm để quét mã QR riêng."
              >
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Zalo Riêng: Chưa Kết Nối (Bấm Quét QR)</span>
              </button>
            )}

            <span className="hidden lg:inline text-slate-400 text-[10.5px]">
              • Phiên Zalo tách biệt hoàn toàn theo từng tài khoản
            </span>
          </div>

          {/* CỘT PHẢI */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenModal("TEST")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-[11px] transition border border-white/10 active:scale-95 cursor-pointer"
              title="Thử nghiệm gửi tin Zalo bằng Bot riêng của bạn"
            >
              <Send className="w-3 h-3 text-amber-300" />
              <span>Gửi Tin Thử</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenModal("ACCOUNT")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition shadow-2xs active:scale-95 cursor-pointer"
              title="Quét mã QR đăng nhập hoặc đổi tài khoản Zalo riêng"
            >
              <Settings2 className="w-3 h-3" />
              <span>{botConnected ? "Quản Lý Zalo" : "Đăng Nhập QR"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer ml-1"
              title="Thu gọn thanh Zalo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <ZaloAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activeRole={activeRole}
        staffId={staffId}
        staffName={displayName}
        staffPhone={resolvedPhone}
        initialTab={modalTab}
      />
    </>
  );
}
