"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useCenter } from "@/context/CenterContext";
import { ZaloAccountRole, ZaloMessageType, ZaloMessageLog } from "@/data/centerData";
import { 
  CheckCircle2, 
  Smartphone, 
  QrCode, 
  RefreshCw, 
  X, 
  Send, 
  Clock, 
  Trash2, 
  Eye, 
  ShieldCheck,
  Search,
  Sparkles,
  AlertTriangle,
  LogOut,
  Loader2,
  UserCheck
} from "lucide-react";
import { buildZaloAccountKey, isValidZaloPhone, formatDisplayPhone, cleanPhoneNumber } from "@/utils/zaloHelper";

interface ZaloAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: ZaloAccountRole;
  staffId?: string;
  staffName?: string;
  staffPhone?: string;
  initialTab?: "ACCOUNT" | "LOGS" | "TEST";
}

export default function ZaloAccountModal({
  isOpen,
  onClose,
  activeRole,
  staffId,
  staffName,
  staffPhone,
  initialTab = "ACCOUNT",
}: ZaloAccountModalProps) {
  const {
    zaloMessageLogs,
    clearZaloMessageLogs,
    sendZaloMessageToParent,
    currentUserAccount,
  } = useCenter();

  const [activeTab, setActiveTab] = useState<"ACCOUNT" | "LOGS" | "TEST">(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<ZaloMessageLog | null>(null);
  const [searchLogKeyword, setSearchLogKeyword] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("ALL");

  // State gửi thử nghiệm (không dùng tên/SĐT demo)
  const [testTargetMode, setTestTargetMode] = useState<"CLOUD" | "PHONE">("CLOUD");
  const [testPhone, setTestPhone] = useState<string>("");
  const [testRecipientName, setTestRecipientName] = useState<string>("Phụ huynh học sinh");
  const [testTemplate, setTestTemplate] = useState<ZaloMessageType>("INCIDENT_NOTE");
  const [testContent, setTestContent] = useState<string>(
    "Trung tâm xin gửi tin nhắn kiểm tra kết nối từ hệ thống Quản lý lớp học. Trân trọng!"
  );
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

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

  const displayOwnerName = staffName || currentUserAccount?.name || "Tài khoản hiện tại";
  const resolvedPhone = staffPhone || currentUserAccount?.phone || "";

  // Trạng thái bot Zalo thực ĐỘC LẬP của đúng user hiện tại
  const [botStatus, setBotStatus] = useState<{
    isConnected: boolean;
    status: string;
    qrCode?: string | null;
    qrRemainingSec?: number;
    isExpired?: boolean;
    user?: { id?: string; name: string; avatar?: string; phone?: string } | null;
  }>({
    isConnected: false,
    status: "idle",
  });
  const [isFetchingQr, setIsFetchingQr] = useState(false);
  const isFetchingQrRef = useRef(false);

  const showToast = (msg: string) => {
    setErrorBanner(null);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRequestBotQr = useCallback(
    async (forceNew: boolean = false) => {
      if (isFetchingQrRef.current) return;
      isFetchingQrRef.current = true;
      setIsFetchingQr(true);
      setErrorBanner(null);

      try {
        const res = await fetch("/api/zalo/request-qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: accountKey,
            role: activeRole,
            phone: resolvedPhone,
            forceNew,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.qrCode) {
          setBotStatus((prev) => ({
            ...prev,
            qrCode: data.qrCode,
            status: "ready",
            qrRemainingSec: 60,
            isExpired: false,
          }));
        } else if (res.ok && data.alreadyConnected) {
          setBotStatus((prev) => ({ ...prev, isConnected: true, status: "connected" }));
        } else if (!data.success && data.message) {
          setErrorBanner(data.message);
        }
      } catch (err: any) {
        setErrorBanner(err?.message || "Không thể kết nối máy chủ tạo mã QR.");
      } finally {
        isFetchingQrRef.current = false;
        setIsFetchingQr(false);
      }
    },
    [accountKey, activeRole, resolvedPhone]
  );

  // Polling trạng thái Bot riêng của tài khoản này khi Modal đang mở
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const checkBotStatus = async () => {
      try {
        const query = new URLSearchParams({
          role: activeRole,
          account: accountKey,
          phone: resolvedPhone,
        });
        const res = await fetch(`/api/zalo/status?${query.toString()}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setBotStatus(data);

          if (data.isExpired && !data.isConnected && data.qrCode && !isFetchingQrRef.current) {
            setBotStatus((prev) => ({ ...prev, status: "expired", qrCode: null }));
          }
        }
      } catch (_e) {}
    };

    checkBotStatus();
    const interval = setInterval(checkBotStatus, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, activeRole, accountKey, resolvedPhone]);

  const handleDisconnect = async () => {
    setIsFetchingQr(true);
    try {
      await fetch("/api/zalo/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: accountKey,
          role: activeRole,
          phone: resolvedPhone,
        }),
      });
      setBotStatus({ isConnected: false, status: "idle", qrCode: null, user: null });
      showToast("Đã đăng xuất phiên Zalo của tài khoản này.");
    } catch (_e) {
      setErrorBanner("Không thể đăng xuất, vui lòng thử lại.");
    } finally {
      setIsFetchingQr(false);
    }
  };

  const handleSwitchZaloAccount = async () => {
    await handleDisconnect();
    await handleRequestBotQr(true);
  };

  const handleSendTestMessage = async () => {
    if (!botStatus.isConnected) {
      setErrorBanner("Tài khoản Zalo này chưa quét mã QR đăng nhập. Vui lòng quét QR ở tab Kết Nối trước.");
      return;
    }
    if (testTargetMode === "PHONE" && !isValidZaloPhone(testPhone)) {
      setErrorBanner("Vui lòng nhập số điện thoại Zalo hợp lệ (10 chữ số)!");
      return;
    }
    if (!testContent.trim()) {
      setErrorBanner("Nội dung tin nhắn thử nghiệm không được để trống!");
      return;
    }

    setIsSendingTest(true);
    setErrorBanner(null);

    try {
      if (testTargetMode === "CLOUD") {
        const res = await fetch("/api/zalo/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "self",
            message: testContent.trim(),
            accountId: accountKey,
            senderRole: activeRole,
            senderPhone: resolvedPhone,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          showToast("Đã gửi tin nhắn thử nghiệm vào Cloud của tôi thành công!");
        } else {
          setErrorBanner(data?.error || data?.message || "Gửi vào Cloud của tôi thất bại.");
        }
      } else {
        const res = await sendZaloMessageToParent({
          recipientPhone: testPhone.trim(),
          recipientName: testRecipientName.trim() || "Phụ huynh",
          messageType: testTemplate,
          title: "Tin Nhắn Thử Nghiệm Zalo",
          content: testContent.trim(),
          senderRole: activeRole,
          senderStaffId: staffId || currentUserAccount?.staffId,
          senderName: botStatus.user?.name || displayOwnerName,
          senderPhone: resolvedPhone,
          openChatWindow: false,
        });
        if (res.success) {
          showToast(res.message);
          setActiveTab("LOGS");
        } else {
          setErrorBanner(res.message);
        }
      }
    } catch (err: any) {
      setErrorBanner(err?.message || "Lỗi kết nối khi gửi thử nghiệm.");
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!isOpen) return null;

  // Chỉ hiển thị nhật ký tin của tài khoản hiện tại (hoặc tất cả nếu ADMIN)
  const scopedLogs = zaloMessageLogs.filter((log) => {
    if (activeRole === "ADMIN") return true;
    const logPhone = cleanPhoneNumber(log.senderPhone || "");
    const myPhone = cleanPhoneNumber(resolvedPhone || "");
    if (myPhone && logPhone) return logPhone === myPhone;
    return log.senderRole === activeRole;
  });

  const filteredLogs = scopedLogs.filter((log) => {
    const kw = searchLogKeyword.trim().toLowerCase();
    const matchSearch =
      !kw ||
      log.recipientName.toLowerCase().includes(kw) ||
      log.recipientPhone.includes(searchLogKeyword) ||
      (log.studentName && log.studentName.toLowerCase().includes(kw)) ||
      (log.className && log.className.toLowerCase().includes(kw)) ||
      log.content.toLowerCase().includes(kw);

    const matchType = filterType === "ALL" || log.messageType === filterType;
    return matchSearch && matchType;
  });

  const statusBadgeText =
    botStatus.isConnected
      ? "Đã Kết Nối"
      : botStatus.status === "scanned"
      ? "Đã quét QR — Vui lòng bấm Xác nhận trên điện thoại"
      : botStatus.status === "ready"
      ? "Đang chờ quét mã QR"
      : botStatus.status === "generating"
      ? "Đang tạo mã QR..."
      : botStatus.status === "expired"
      ? "Mã QR đã hết hạn"
      : "Chưa Kết Nối";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center shadow-xs border border-white/20">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg">Kết Nối Zalo Cá Nhân (Bot Riêng)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                  {activeRole === "ADMIN" ? "Quản Trị Viên" : activeRole === "TEACHER" ? "Giáo Viên" : "Trợ Giảng"}
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Tài khoản: <strong>{displayOwnerName}</strong>
                {resolvedPhone ? ` (${formatDisplayPhone(resolvedPhone) || resolvedPhone})` : ""} • Không dùng chung giữa các tài khoản
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

        {/* TABS */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("ACCOUNT")}
            className={`px-3 py-2 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "ACCOUNT"
                ? "border-blue-600 text-blue-700 bg-white rounded-t-xl"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Đăng Nhập QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TEST")}
            className={`px-3 py-2 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "TEST"
                ? "border-blue-600 text-blue-700 bg-white rounded-t-xl"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kiểm Tra Gửi Tin</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("LOGS")}
            className={`px-3 py-2 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "LOGS"
                ? "border-blue-600 text-blue-700 bg-white rounded-t-xl"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Nhật Ký ({scopedLogs.length})</span>
          </button>
        </div>

        {/* ALERTS */}
        {toastMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
        {errorBanner && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorBanner}</span>
          </div>
        )}

        {/* BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === "ACCOUNT" && (
            <div className="space-y-4">
              {/* Isolation Notice */}
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Phiên Zalo độc lập ({accountKey}):</strong> Chỉ tài khoản đang đăng nhập này sử dụng. Giáo viên, Trợ giảng hay Admin khác tuyệt đối không thể gửi hoặc xem phiên Zalo của bạn.
                </div>
              </div>

              {botStatus.isConnected ? (
                <div className="p-5 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50/50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={
                          botStatus.user?.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(accountKey)}`
                        }
                        alt={botStatus.user?.name || displayOwnerName}
                        className="w-14 h-14 rounded-2xl bg-white border-2 border-emerald-400 p-0.5 shadow-sm"
                      />
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10.5px] font-bold mb-1">
                          <UserCheck className="w-3 h-3" />
                          <span>ĐÃ KẾT NỐI ZALO THÀNH CÔNG</span>
                        </div>
                        <h4 className="font-bold text-base text-slate-900">
                          {botStatus.user?.name || displayOwnerName}
                        </h4>
                        {botStatus.user?.phone && (
                          <p className="text-xs font-mono text-slate-600">
                            {formatDisplayPhone(botStatus.user.phone) || botStatus.user.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isFetchingQr}
                        onClick={handleSwitchZaloAccount}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isFetchingQr ? "animate-spin" : ""}`} />
                        <span>Đổi Nick Zalo Khác</span>
                      </button>

                      <button
                        type="button"
                        disabled={isFetchingQr}
                        onClick={handleDisconnect}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Đăng Xuất</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/80 border border-emerald-200 text-xs text-slate-700 leading-relaxed">
                    Bot Zalo của bạn đang hoạt động bình thường. Khi bạn bấm gửi thông báo, hệ thống sẽ gửi thẳng từ chính tài khoản Zalo này (đúng nhóm lớp hoặc đúng SĐT phụ huynh đã chọn).
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Quét Mã QR Để Liên Kết Zalo</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Trạng thái: <strong className="text-blue-700">{statusBadgeText}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isFetchingQr}
                      onClick={() => handleRequestBotQr(true)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-60 shrink-0"
                    >
                      {isFetchingQr ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <QrCode className="w-3.5 h-3.5" />
                      )}
                      <span>{botStatus.qrCode ? "Làm Mới Mã QR" : "Tạo Mã QR Đăng Nhập"}</span>
                    </button>
                  </div>

                  {botStatus.qrCode ? (
                    <div className="flex flex-col sm:flex-row items-center gap-5 bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs">
                      <div className="shrink-0 p-2 bg-white border-2 border-blue-100 rounded-2xl shadow-xs">
                        <img
                          src={botStatus.qrCode}
                          alt="Mã QR Đăng Nhập Zalo"
                          className="w-48 h-48 object-contain"
                        />
                      </div>

                      <div className="space-y-2.5 text-xs text-slate-700 flex-1">
                        <div className="font-bold text-blue-800 text-sm">
                          Hướng dẫn quét nhanh trong 10 giây:
                        </div>
                        <ol className="space-y-1.5 list-decimal list-inside leading-relaxed">
                          <li>Mở ứng dụng <strong>Zalo</strong> trên điện thoại của bạn.</li>
                          <li>Bấm biểu tượng <strong>Quét QR</strong> ở góc trên cùng bên phải màn hình Zalo.</li>
                          <li>Đưa camera vào mã QR bên trái và bấm <strong>Đăng nhập</strong> trên điện thoại.</li>
                        </ol>
                        {typeof botStatus.qrRemainingSec === "number" && botStatus.qrRemainingSec > 0 && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Mã QR tự hết hạn sau: {botStatus.qrRemainingSec}s</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-2">
                      <QrCode className="w-10 h-10 text-blue-500 mx-auto opacity-80" />
                      <p className="text-xs font-semibold text-slate-700">
                        Bấm nút <strong>&quot;Tạo Mã QR Đăng Nhập&quot;</strong> ở trên để hiển thị mã QR cho riêng tài khoản này.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Hệ thống sẽ tự động nhận diện ngay khi bạn bấm xác nhận trên điện thoại (không cần thao tác thêm).
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "TEST" && (
            <div className="space-y-3.5">
              {!botStatus.isConnected && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Bạn chưa kết nối Bot Zalo. Vui lòng chuyển sang tab <strong>Đăng Nhập QR</strong> để quét mã trước khi gửi thử.
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTestTargetMode("CLOUD")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    testTargetMode === "CLOUD"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  ☁️ Gửi vào Cloud của tôi (An toàn nhất)
                </button>
                <button
                  type="button"
                  onClick={() => setTestTargetMode("PHONE")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    testTargetMode === "PHONE"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  📱 Gửi tới SĐT chỉ định
                </button>
              </div>

              {testTargetMode === "PHONE" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số Điện Thoại Nhận (10 số):
                    </label>
                    <input
                      type="tel"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="Nhập SĐT Zalo người nhận..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên Người Nhận:
                    </label>
                    <input
                      type="text"
                      value={testRecipientName}
                      onChange={(e) => setTestRecipientName(e.target.value)}
                      placeholder="Nhập tên người nhận..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mẫu Nội Dung Thử Nghiệm:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { type: "INCIDENT_NOTE" as const, label: "Nhận xét buổi học" },
                    { type: "TUITION" as const, label: "Thông báo học phí" },
                    { type: "MAKEUP_NOTICE" as const, label: "Lịch học bù" },
                    { type: "HOMEWORK_REMINDER" as const, label: "Nhắc nộp BTVN" },
                  ].map((tpl) => (
                    <button
                      key={tpl.type}
                      type="button"
                      onClick={() => {
                        setTestTemplate(tpl.type);
                        setTestContent(
                          tpl.type === "INCIDENT_NOTE"
                            ? "Thầy cô gửi nhận xét buổi học: Hôm nay con tương tác rất tốt. Ba Mẹ động viên con tiếp tục phát huy nhé ạ!"
                            : tpl.type === "TUITION"
                            ? "Thông báo học phí tháng mới: Trung tâm đã cập nhật chi tiết số buổi học và đơn giá trên Sổ liên lạc ạ."
                            : tpl.type === "MAKEUP_NOTICE"
                            ? "Thông báo lịch học bù: Ba Mẹ vui lòng theo dõi ngày giờ học bù trên Sổ liên lạc giúp con ạ."
                            : "Nhắc bài tập về nhà: Ba Mẹ nhắc con hoàn thành bài tập đúng hạn nhé ạ!"
                        );
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                        testTemplate === tpl.type
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nội Dung Tin Nhắn:
                </label>
                <textarea
                  rows={4}
                  value={testContent}
                  onChange={(e) => setTestContent(e.target.value)}
                  className="w-full p-3 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  disabled={isSendingTest || !botStatus.isConnected}
                  onClick={handleSendTestMessage}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingTest ? "Đang gửi..." : "Gửi Thử Qua Bot Zalo"}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "LOGS" && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchLogKeyword}
                    onChange={(e) => setSearchLogKeyword(e.target.value)}
                    placeholder="Tìm theo người nhận, SĐT, học sinh, lớp, nội dung..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none"
                  >
                    <option value="ALL">Tất cả loại tin</option>
                    <option value="CLASS_LOG">Nhóm Zalo Lớp</option>
                    <option value="INCIDENT_NOTE">Nhận xét buổi học</option>
                    <option value="TUITION">Thông báo học phí</option>
                    <option value="TUITION_REMINDER">Nhắc nợ học phí</option>
                    <option value="MAKEUP_NOTICE">Thông báo học bù</option>
                    <option value="MAKEUP_REPORT">Báo cáo buổi bù</option>
                  </select>

                  {scopedLogs.length > 0 && activeRole === "ADMIN" && (
                    <button
                      onClick={clearZaloMessageLogs}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Xóa lịch sử nhật ký"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                  Chưa có nhật ký tin nhắn nào cho tài khoản này.
                </div>
              ) : (
                <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            <Sparkles className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-slate-900 truncate block">
                              {log.recipientName} ({log.recipientPhone})
                            </span>
                            <span className="text-[10.5px] text-slate-500">
                              Người gửi: <strong>{log.senderName}</strong> •{" "}
                              {new Date(log.sentAt).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              {new Date(log.sentAt).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                            ✓ Đã gửi
                          </span>
                          <button
                            onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                            title="Xem chi tiết nội dung"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-xl font-mono text-[11px]">
                        {log.content}
                      </p>

                      {selectedLog?.id === log.id && (
                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between text-blue-900 font-bold border-b border-blue-200 pb-1">
                            <span>Chi Tiết Tin Nhắn Đã Gửi</span>
                            <span className="text-[10px] font-mono text-blue-700">Mã: {log.id}</span>
                          </div>
                          <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 bg-white p-3 rounded-xl border border-blue-100">
                            {log.content}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${botStatus.isConnected ? "bg-emerald-500" : "bg-slate-400"}`}></span>
            <span>
              Bot riêng: <strong>{displayOwnerName}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
