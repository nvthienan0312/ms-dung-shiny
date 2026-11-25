"use client";

import React, { useState, useEffect, useRef } from "react";
import { ZaloMessageType, ZaloAccountRole } from "@/data/centerData";
import { 
  Play, 
  Pause, 
  SkipForward, 
  Square, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Smartphone, 
  Send, 
  X, 
  ShieldCheck, 
  Sparkles,
  ExternalLink,
  Info
} from "lucide-react";
import { buildZaloAccountKey, formatDisplayPhone, copyTextToClipboard } from "@/utils/zaloHelper";

export interface ZaloQueueItem {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  className?: string;
  messageType: ZaloMessageType;
  title: string;
  content: string;
  isFriended?: boolean;
  status: "PENDING" | "SENDING" | "SENT" | "SKIPPED" | "FAILED";
  errorReason?: string;
  sentAt?: string;
}

interface ZaloBatchQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialItems: ZaloQueueItem[];
  onItemSentSuccess?: (item: ZaloQueueItem) => void;
  onAllCompleted?: (sentCount: number) => void;
  senderRole?: ZaloAccountRole;
  senderStaffId?: string;
  senderName?: string;
  senderPhone?: string;
}

export default function ZaloBatchQueueModal({
  isOpen,
  onClose,
  title,
  initialItems,
  onItemSentSuccess,
  onAllCompleted,
  senderRole = "ADMIN",
  senderStaffId,
  senderName = "Quản Trị Viên",
  senderPhone = "",
}: ZaloBatchQueueModalProps) {
  // Khoảng cách thời gian gửi (giây) - Mặc định 150 giây (2.5 phút)
  const [intervalSeconds, setIntervalSeconds] = useState<number>(150);
  // Bộ lọc chỉ gửi cho phụ huynh đã kết bạn
  const [onlyFriended, setOnlyFriended] = useState<boolean>(true);
  
  const [queueItems, setQueueItems] = useState<ZaloQueueItem[]>(initialItems);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isExtensionActive, setIsExtensionActive] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Kiểm tra Extension Zalo Bridge
  useEffect(() => {
    if (typeof window !== "undefined") {
      const active = !!(window as any).__MS_DUNG_ZALO_EXTENSION_INSTALLED__ || 
        document.documentElement.getAttribute("data-ms-dung-zalo-bridge") === "active";
      setIsExtensionActive(active);
    }
  }, [isOpen]);

  // Đồng bộ queueItems khi initialItems thay đổi
  useEffect(() => {
    setQueueItems(initialItems.map((item) => ({ ...item, status: "PENDING" })));
    setCurrentIndex(0);
    setIsRunning(false);
    setHasStarted(false);
    setCountdown(0);
  }, [initialItems, isOpen]);

  // Lọc danh sách khả dụng
  const eligibleItems = queueItems.filter((item) => {
    if (onlyFriended && item.isFriended === false) return false;
    return true;
  });

  const sentCount = queueItems.filter((i) => i.status === "SENT").length;
  const totalEligible = eligibleItems.length;
  const progressPercent = totalEligible > 0 ? Math.round((sentCount / totalEligible) * 100) : 0;

  // Thực hiện gửi tin nhắn cho học sinh hiện tại bằng đúng Bot của người gửi
  const executeSendItem = async (index: number) => {
    if (index >= eligibleItems.length) {
      setIsRunning(false);
      if (onAllCompleted) onAllCompleted(sentCount);
      return;
    }

    const currentItem = eligibleItems[index];
    if (!currentItem) return;

    // Cập nhật trạng thái đang gửi
    setQueueItems((prev) =>
      prev.map((i) => (i.id === currentItem.id ? { ...i, status: "SENDING", errorReason: undefined } : i))
    );

    const accountKey = buildZaloAccountKey({
      role: senderRole,
      staffId: senderStaffId,
      phone: senderPhone,
    });

    // 1. Thử gửi tự động qua đúng API bot server (zca-js) của người gửi
    let realApiSent = false;
    let errorReason = "";
    try {
      const apiRes = await fetch("/api/zalo/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: currentItem.parentPhone,
          message: currentItem.content,
          senderRole: senderRole,
          senderPhone: senderPhone,
          accountId: accountKey,
        }),
      });
      const apiData = await apiRes.json().catch(() => ({}));
      if (apiRes.ok && apiData?.success) {
        realApiSent = true;
      } else {
        errorReason = apiData?.error || apiData?.message || "Bot Zalo chưa kết nối hoặc không gửi được";
      }
    } catch (err: any) {
      errorReason = err?.message || "Lỗi kết nối máy chủ Zalo";
    }

    // 2. Chỉ fallback sang Extension Bridge nếu extension thực sự được cài đặt trên trình duyệt
    if (!realApiSent && isExtensionActive && typeof window !== "undefined") {
      try {
        window.dispatchEvent(
          new CustomEvent("MS_DUNG_ZALO_DISPATCH", {
            detail: {
              phone: currentItem.parentPhone,
              recipientName: currentItem.parentName,
              studentName: currentItem.studentName,
              message: currentItem.content,
              autoSend: true,
            },
          })
        );
        localStorage.setItem(
          "ms_dung_zalo_pending_msg",
          JSON.stringify({
            phone: currentItem.parentPhone,
            recipientName: currentItem.parentName,
            studentName: currentItem.studentName,
            message: currentItem.content,
            timestamp: Date.now(),
            autoSend: true,
          })
        );
        realApiSent = true;
      } catch (_e) {}
    }

    // Sao chép dự phòng vào clipboard nếu lỗi để thầy cô có thể dán tay nếu cần
    if (!realApiSent) {
      await copyTextToClipboard(currentItem.content);
      setQueueItems((prev) =>
        prev.map((i) =>
          i.id === currentItem.id
            ? { ...i, status: "FAILED", errorReason: errorReason || "Chưa kết nối Bot Zalo" }
            : i
        )
      );
      setIsRunning(false);
      return;
    }

    const nowIso = new Date().toISOString();
    const updatedItem: ZaloQueueItem = {
      ...currentItem,
      status: "SENT",
      sentAt: nowIso,
    };

    setQueueItems((prev) =>
      prev.map((i) => (i.id === currentItem.id ? updatedItem : i))
    );

    if (onItemSentSuccess) {
      onItemSentSuccess(updatedItem);
    }

    // Nếu còn bé tiếp theo -> Bắt đầu đếm ngược với độ trễ 2-3 phút kèm dao động ngẫu nhiên
    if (index + 1 < eligibleItems.length) {
      setCurrentIndex(index + 1);
      const jitter = intervalSeconds > 20 ? Math.floor(Math.random() * 11) - 5 : 0;
      setCountdown(Math.max(10, intervalSeconds + jitter));
    } else {
      setIsRunning(false);
      if (onAllCompleted) onAllCompleted(sentCount + 1);
    }
  };

  // Tham chiếu hàm gửi để tránh stale closure và thỏa mãn react-hooks/exhaustive-deps
  const executeSendItemRef = useRef(executeSendItem);
  executeSendItemRef.current = executeSendItem;

  // Vòng lặp đếm ngược của hàng đợi
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as any);
            executeSendItemRef.current(currentIndex);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, countdown, currentIndex]);

  // Bắt đầu chạy hàng đợi
  const handleStartQueue = () => {
    setHasStarted(true);
    setIsRunning(true);
    // Gửi ngay bé đầu tiên, sau đó mới đếm ngược cho các bé tiếp theo
    executeSendItem(currentIndex);
  };

  // Tạm dừng
  const handlePause = () => {
    setIsRunning(false);
  };

  // Tiếp tục chạy
  const handleResume = () => {
    setIsRunning(true);
  };

  // Bỏ qua học sinh hiện tại
  const handleSkip = () => {
    const currentItem = eligibleItems[currentIndex];
    if (currentItem) {
      setQueueItems((prev) =>
        prev.map((i) => (i.id === currentItem.id ? { ...i, status: "SKIPPED" } : i))
      );
    }
    if (currentIndex + 1 < eligibleItems.length) {
      setCurrentIndex((prev) => prev + 1);
      setCountdown(0);
      if (isRunning) {
        executeSendItem(currentIndex + 1);
      }
    } else {
      setIsRunning(false);
    }
  };

  // Gửi ngay bé hiện tại (bỏ qua đếm ngược)
  const handleSendNow = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(0);
    executeSendItem(currentIndex);
  };

  // Định dạng mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  const currentActiveItem = eligibleItems[currentIndex];
  const friendedCount = queueItems.filter((i) => i.isFriended !== false).length;
  const unFriendedCount = queueItems.length - friendedCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-xl shadow-xs border border-white/20">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">{title}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-slate-950">
                  Tự Động Gửi Chống Spam
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Người gửi: <strong>{senderName} ({senderPhone})</strong> • Tự động gửi 100% &amp; giãn cách 2-3 phút chống quét spam Zalo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CHỈ DẪN RÕ RÀNG VỀ KÊNH GỬI (ZALO NGOÀI VS NỘI BỘ) */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-b border-emerald-200 px-4 py-2.5 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-700 text-white font-black text-[11px] shadow-xs">
              💬 KÊNH GỬI: ZALO TRỰC TIẾP
            </span>
            <span className="font-semibold text-[11.5px] text-slate-800">
              Tin nhắn gửi trực tiếp tới tài khoản Zalo theo SĐT của {eligibleItems.length} phụ huynh
            </span>
          </div>
          <span className="text-[10.5px] text-indigo-800 bg-white border border-indigo-200 px-2 py-0.5 rounded-md font-bold shrink-0">
            📲 Kèm cập nhật nội bộ Sổ liên lạc Cổng App
          </span>
        </div>

        {/* BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* CẤU HÌNH THỜI GIAN GIÃN CÁCH & BỘ LỌC KẾT BẠN */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <label className="font-bold text-slate-800 block text-xs">
                  ⏱️ Khoảng cách giữa mỗi tin nhắn (Giãn cách an toàn chống spam):
                </label>
                <span className="text-[11px] text-slate-500">
                  Gửi mỗi tin sau 2-3 phút kết hợp dao động ngẫu nhiên để mô phỏng hành vi tự nhiên, bảo vệ 100% tài khoản Zalo.
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {[
                  { sec: 120, label: "2.0 phút" },
                  { sec: 150, label: "2.5 phút (Chuẩn)" },
                  { sec: 180, label: "3.0 phút (An toàn)" },
                  { sec: 10, label: "10s (Test nhanh)" },
                ].map((opt) => (
                  <button
                    key={opt.sec}
                    type="button"
                    disabled={hasStarted}
                    onClick={() => setIntervalSeconds(opt.sec)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer disabled:opacity-50 ${
                      intervalSeconds === opt.sec
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bộ lọc an toàn kết bạn */}
            <div className="pt-2 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={hasStarted}
                  checked={onlyFriended}
                  onChange={(e) => setOnlyFriended(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-800 text-[11.5px]">
                  🛡️ Chỉ gửi cho phụ huynh ĐÃ KẾT BẠN ZALO (Khuyên dùng - An toàn tuyệt đối)
                </span>
              </label>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  🟢 {friendedCount} Đã kết bạn
                </span>
                {unFriendedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    ⚠️ {unFriendedCount} Chưa kết bạn
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* TRẠNG THÁI KÊNH GỬI ZALO BOT */}
          <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isExtensionActive ? "bg-emerald-500" : "bg-blue-500"}`}></span>
              <span className="font-bold text-slate-800 text-[11px]">
                Kênh Gửi Bot Zalo Độc Lập ({senderRole}):
              </span>
              <span className="text-slate-600 text-[11px]">
                {isExtensionActive
                  ? "✅ Extension Zalo Bridge sẵn sàng hỗ trợ"
                  : `Gửi trực tiếp qua Bot Zalo riêng của ${senderName}${senderPhone ? ` (${senderPhone})` : ""}`}
              </span>
            </div>
          </div>

          {/* TIẾN ĐỘ VÀ BẢNG ĐIỀU KHIỂN HÀNG ĐỢI */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-blue-50/40 border border-blue-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">
                Tiến độ gửi: <strong>{sentCount} / {totalEligible}</strong> học sinh ({progressPercent}%)
              </span>
              {isRunning && countdown > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-mono font-bold text-xs animate-pulse">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Gửi bé tiếp theo sau: {formatTime(countdown)}</span>
                </div>
              )}
            </div>

            {/* Thanh tiến độ */}
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            {/* NÚT ĐIỀU KHIỂN */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                {!hasStarted ? (
                  <button
                    type="button"
                    disabled={totalEligible === 0}
                    onClick={handleStartQueue}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Bắt Đầu Gửi Hàng Đợi ({totalEligible} bé)</span>
                  </button>
                ) : isRunning ? (
                  <button
                    type="button"
                    onClick={handlePause}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Tạm Dừng</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResume}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Tiếp Tục Chạy</span>
                  </button>
                )}

                {hasStarted && isRunning && (
                  <button
                    type="button"
                    onClick={handleSendNow}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                    title="Gửi ngay lập tức, không chờ đồng hồ đếm ngược"
                  >
                    <Send className="w-3 h-3" />
                    <span>Gửi Ngay</span>
                  </button>
                )}

                {hasStarted && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                    title="Bỏ qua bé này và chuyển sang bé kế tiếp"
                  >
                    <SkipForward className="w-3 h-3" />
                    <span>Bỏ Qua</span>
                  </button>
                )}
              </div>

              {sentCount === totalEligible && totalEligible > 0 && (
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đã hoàn thành toàn bộ hàng đợi!
                </span>
              )}
            </div>
          </div>

          {/* THÔNG TIN HỌC SINH ĐANG ĐƯỢC XỬ LÝ */}
          {currentActiveItem && (
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                    {currentIndex + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 text-xs">
                      {currentActiveItem.studentName} ({currentActiveItem.className || "Lớp học"})
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Phụ huynh: {currentActiveItem.parentName} • SĐT: <strong>{formatDisplayPhone(currentActiveItem.parentPhone)}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {currentActiveItem.isFriended !== false ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                      🟢 Đã kết bạn
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                      ⚠️ Chưa kết bạn
                    </span>
                  )}
                </div>
              </div>

              {/* Hộp xem & chỉnh sửa nội dung sẽ gửi */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    ✏️ Nội dung tin nhắn gửi bé này (Có thể chỉnh sửa trực tiếp trước khi gửi):
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {currentActiveItem.content.length} ký tự
                  </span>
                </div>
                <textarea
                  value={currentActiveItem.content}
                  onChange={(e) => {
                    const newText = e.target.value;
                    setQueueItems((prev) =>
                      prev.map((it) => (it.id === currentActiveItem.id ? { ...it, content: newText } : it))
                    );
                  }}
                  rows={4}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans resize-y shadow-xs"
                  placeholder="Nhập hoặc chỉnh sửa nội dung tin nhắn gửi phụ huynh..."
                />
              </div>
            </div>
          )}

          {/* DANH SÁCH CHI TIẾT TẤT CẢ HỌC SINH TRONG HÀNG ĐỢI */}
          <div className="space-y-1.5">
            <span className="font-bold text-slate-700 text-xs uppercase tracking-wider block">
              Danh sách chi tiết ({eligibleItems.length} học sinh):
            </span>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
              {eligibleItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-2 rounded-xl border flex items-center justify-between text-xs transition ${
                    idx === currentIndex && isRunning
                      ? "bg-blue-50 border-blue-300 font-semibold shadow-2xs"
                      : item.status === "SENT"
                      ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                      : item.status === "FAILED"
                      ? "bg-rose-50/70 border-rose-200 text-rose-900"
                      : item.status === "SKIPPED"
                      ? "bg-slate-100 border-slate-200 text-slate-400 line-through"
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono font-bold w-5 text-slate-400 text-center">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate max-w-[130px]">{item.studentName}</span>
                        <span className="text-slate-500 font-mono text-[11px]">{item.parentPhone}</span>
                      </div>
                      {item.status === "FAILED" && item.errorReason && (
                        <div className="text-[10px] text-rose-700 truncate max-w-[260px]" title={item.errorReason}>
                          ⚠️ {item.errorReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === "SENT" && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ✓ Đã gửi
                      </span>
                    )}
                    {item.status === "FAILED" && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        ✗ Gửi lỗi
                      </span>
                    )}
                    {item.status === "SENDING" && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full animate-pulse">
                        Đang gửi...
                      </span>
                    )}
                    {item.status === "SKIPPED" && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                        Đã bỏ qua
                      </span>
                    )}
                    {item.status === "PENDING" && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Đang chờ
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Hàng đợi tự động đồng bộ sang Nhật ký tin Zalo</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>
  );
}
