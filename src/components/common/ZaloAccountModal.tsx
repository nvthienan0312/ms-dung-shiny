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
  ExternalLink,
  Search,
  Sparkles,
  Edit2,
  Save,
  AlertTriangle,
  LogOut
} from "lucide-react";
import { cleanPhoneNumber, isValidZaloPhone, formatDisplayPhone } from "@/utils/zaloHelper";

interface ZaloAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: ZaloAccountRole;
  staffName?: string;
  staffPhone?: string;
  initialTab?: "ACCOUNT" | "LOGS" | "TEST";
}

export default function ZaloAccountModal({
  isOpen,
  onClose,
  activeRole,
  staffName,
  staffPhone,
  initialTab = "ACCOUNT",
}: ZaloAccountModalProps) {
  const {
    zaloAccounts,
    zaloMessageLogs,
    updateZaloAccount,
    connectZaloAccount,
    disconnectZaloAccount,
    clearZaloMessageLogs,
    sendZaloMessageToParent,
  } = useCenter();

  const [activeTab, setActiveTab] = useState<"ACCOUNT" | "LOGS" | "TEST">(initialTab);

  // Cập nhật tab khi prop initialTab thay đổi hoặc modal mở
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<ZaloMessageLog | null>(null);
  const [searchLogKeyword, setSearchLogKeyword] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("ALL");

  // State gửi thử nghiệm
  const [testPhone, setTestPhone] = useState<string>("0912 345 678");
  const [testRecipientName, setTestRecipientName] = useState<string>("Chị Thu Trang (PH bé Hoàng My)");
  const [testTemplate, setTestTemplate] = useState<ZaloMessageType>("INCIDENT_NOTE");
  const [testContent, setTestContent] = useState<string>(
    "Cô Sarah Johnson xin gửi nhận xét buổi học ngày 08/11/2026: Hôm nay bé Hoàng My rất chăm chỉ, phát âm chuẩn Unit 3 và hăng hái xung phong lên bảng. Ba Mẹ động viên con tiếp tục phát huy nhé ạ!"
  );
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  // State chỉnh sửa thông tin SĐT & Tên
  const [isEditingAccount, setIsEditingAccount] = useState<boolean>(false);
  const [inputPhone, setInputPhone] = useState<string>("");
  const [inputAccountName, setInputAccountName] = useState<string>("");

  // Trạng thái bot Zalo thực riêng biệt cho vai trò hiện tại
  const [botStatus, setBotStatus] = useState<{ 
    isConnected: boolean; 
    status: string; 
    qrCode?: string | null; 
    qrRemainingSec?: number;
    isExpired?: boolean;
    user?: { name: string; phone?: string } | null;
  }>({
    isConnected: false,
    status: "idle",
  });
  const [isFetchingQr, setIsFetchingQr] = useState(false);
  const isFetchingQrRef = useRef(false);

  const accountKey = activeRole.toLowerCase();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Lấy tài khoản Zalo tương ứng với vai trò hiện tại
  const currentZaloAccount = useMemo(() => {
    return zaloAccounts.find((a) => {
      if (activeRole === "ADMIN") return a.role === "ADMIN";
      if (staffPhone) return cleanPhoneNumber(a.phoneNumber) === cleanPhoneNumber(staffPhone);
      return a.role === activeRole;
    }) || {
      id: `zalo-${activeRole.toLowerCase()}-current`,
      role: activeRole,
      accountType: activeRole === "ADMIN" ? ("CENTER_HOTLINE" as const) : ("PERSONAL" as const),
      accountName: activeRole === "ADMIN" ? "Ms. Dung Shiny (Hotline Trung Tâm)" : (staffName ? `${staffName} (Zalo Cá Nhân)` : "Zalo Cá Nhân"),
      phoneNumber: activeRole === "ADMIN" ? "0964645174" : (staffPhone || "0901 234 567"),
      isConnected: false,
      connectedAt: new Date().toISOString(),
    };
  }, [zaloAccounts, activeRole, staffPhone, staffName]);

  // Yêu cầu sinh mã QR thật từ bot server
  const handleRequestBotQr = useCallback(async (forceNew: boolean = false) => {
    if (isFetchingQrRef.current) return;
    isFetchingQrRef.current = true;
    setIsFetchingQr(true);
    try {
      const res = await fetch("/api/zalo/request-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: accountKey,
          role: activeRole,
          phone: staffPhone,
          forceNew,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.qrCode) {
          setBotStatus((prev) => ({ 
            ...prev, 
            qrCode: data.qrCode, 
            status: "ready", 
            qrRemainingSec: 60,
            isExpired: false 
          }));
        }
      }
    } catch (_e) {} finally {
      isFetchingQrRef.current = false;
      setIsFetchingQr(false);
    }
  }, [accountKey, activeRole, staffPhone]);

  // Polling trạng thái Zalo bot ổn định (không lặp effect vô tận)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const checkBotStatus = async () => {
      try {
        const query = new URLSearchParams({
          role: activeRole,
          account: accountKey,
          phone: staffPhone || "",
        });
        const res = await fetch(`/api/zalo/status?${query.toString()}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setBotStatus(data);

          // Tự động đồng bộ context nếu bot server đã kết nối
          if (data.isConnected && !currentZaloAccount.isConnected) {
            connectZaloAccount(
              activeRole,
              undefined,
              currentZaloAccount.phoneNumber,
              currentZaloAccount.accountName,
              `sess-${Date.now()}`,
              "QR_CODE"
            );
          }

          // Tự động yêu cầu mã QR ngay khi mở modal nếu chưa kết nối và chưa có QR
          if (!data.isConnected && !data.qrCode && data.status === "idle" && !isFetchingQrRef.current) {
            handleRequestBotQr(false);
          }

          // Tự động làm mới QR khi hết hạn nếu đang mở tab chờ quét
          if (data.isExpired && !data.isConnected && !isFetchingQrRef.current) {
            handleRequestBotQr(true);
          }
        }
      } catch (_e) {}
    };

    checkBotStatus();
    const interval = setInterval(checkBotStatus, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, activeRole, accountKey, staffPhone, currentZaloAccount.isConnected, currentZaloAccount.phoneNumber, currentZaloAccount.accountName, connectZaloAccount, handleRequestBotQr]);

  // Ngắt kết nối nick bot hiện tại và kích hoạt quét nick khác ngay lập tức
  const handleSwitchToAnotherZalo = async () => {
    setIsFetchingQr(true);
    setBotStatus((prev) => ({ 
      ...prev, 
      isConnected: false, 
      qrCode: null, 
      status: "generating",
      user: null 
    }));
    try {
      await fetch("/api/zalo/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: accountKey,
          role: activeRole,
          phone: staffPhone,
        }),
      });
      disconnectZaloAccount(currentZaloAccount.id);
      showToast("🔄 Đang tạo mã QR mới để quét bằng tài khoản khác...");
      await handleRequestBotQr(true);
    } catch (_e) {} finally {
      setIsFetchingQr(false);
    }
  };

  // Đồng bộ thông tin SĐT khi mở hoặc đổi tài khoản
  useEffect(() => {
    if (isOpen && currentZaloAccount) {
      setInputPhone(currentZaloAccount.phoneNumber);
      setInputAccountName(currentZaloAccount.accountName);
      setIsEditingAccount(false);
    }
  }, [isOpen, currentZaloAccount]);

  // Lưu thông tin SĐT / Tên tài khoản Zalo đã sửa
  const handleSaveAccountInfo = () => {
    if (!isValidZaloPhone(inputPhone)) {
      alert("Vui lòng nhập số điện thoại Zalo hợp lệ (10 chữ số)!");
      return;
    }
    if (!inputAccountName.trim()) {
      alert("Tên tài khoản Zalo không được để trống!");
      return;
    }
    updateZaloAccount(currentZaloAccount.id, {
      phoneNumber: inputPhone.trim(),
      accountName: inputAccountName.trim(),
    });
    setIsEditingAccount(false);
    showToast(`✓ Đã lưu thay đổi số Zalo: ${inputPhone.trim()} (${inputAccountName.trim()})!`);
  };

  // Xác nhận đăng nhập Zalo thủ công
  const handleConfirmLogin = (method: "QR_CODE" | "ZALO_WEB_SYNC" = "QR_CODE") => {
    connectZaloAccount(
      activeRole,
      undefined,
      currentZaloAccount.phoneNumber,
      currentZaloAccount.accountName,
      `sess-${Date.now()}`,
      method as any
    );
    showToast(`🟢 Đã hoàn tất bước đăng nhập Zalo: ${currentZaloAccount.accountName} (${currentZaloAccount.phoneNumber})!`);
  };

  // Ngắt kết nối / Đăng xuất Zalo của tài khoản này
  const handleDisconnect = async () => {
    try {
      await fetch("/api/zalo/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: accountKey,
          role: activeRole,
          phone: staffPhone,
        }),
      });
    } catch (_e) {}
    disconnectZaloAccount(currentZaloAccount.id);
    setBotStatus((prev) => ({ ...prev, isConnected: false, status: "idle", qrCode: null }));
    showToast("⚠️ Đã đăng xuất khỏi phiên Zalo. Bạn có thể quét mã QR mới để đăng nhập tài khoản khác.");
  };

  // Gửi tin nhắn thử nghiệm
  const handleSendTestMessage = async () => {
    if (!isValidZaloPhone(testPhone)) {
      alert("Vui lòng nhập số điện thoại người nhận hợp lệ (10 chữ số)!");
      return;
    }
    if (!testContent.trim()) {
      alert("Vui lòng nhập nội dung tin nhắn thử nghiệm!");
      return;
    }

    setIsSendingTest(true);
    try {
      await sendZaloMessageToParent({
        recipientPhone: testPhone,
        recipientName: testRecipientName,
        messageType: testTemplate,
        title: "Tin Nhắn Thử Nghiệm Zalo",
        content: testContent.trim(),
        senderRole: activeRole,
        senderName: currentZaloAccount.accountName,
        senderPhone: currentZaloAccount.phoneNumber,
        openChatWindow: true,
      });

      showToast(`⚡ Đã tự động gửi tin nhắn thử nghiệm Zalo tới ${testRecipientName} (${testPhone}) thành công!`);
      setActiveTab("LOGS");
    } catch (err: any) {
      alert(`Gửi thất bại: ${err?.message || "Lỗi không xác định"}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!isOpen) return null;

  // Lọc danh sách nhật ký
  const filteredLogs = zaloMessageLogs.filter((log) => {
    const matchSearch =
      searchLogKeyword.trim() === "" ||
      log.recipientName.toLowerCase().includes(searchLogKeyword.toLowerCase()) ||
      log.recipientPhone.includes(searchLogKeyword) ||
      (log.studentName && log.studentName.toLowerCase().includes(searchLogKeyword.toLowerCase())) ||
      (log.className && log.className.toLowerCase().includes(searchLogKeyword.toLowerCase())) ||
      log.content.toLowerCase().includes(searchLogKeyword.toLowerCase());

    const matchType = filterType === "ALL" || log.messageType === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-xl shadow-xs border border-white/20">
              💬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Trung Tâm Gửi Tin Nhắn Zalo Tự Động</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                  {activeRole === "ADMIN" ? "Admin Hotline" : activeRole === "TEACHER" ? "Zalo Giáo Viên" : "Zalo Trợ Giảng"}
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                {activeRole === "ADMIN" 
                  ? "Admin đăng nhập Zalo Trung Tâm (0964645174) • Bấm gửi là tự động gửi tới phụ huynh" 
                  : activeRole === "TEACHER"
                  ? "Giáo viên gửi nhận xét, bài thi, BTVN và đăng trực tiếp vào Nhóm Zalo Lớp"
                  : "Trợ giảng gửi chấm BTVN, kiểm tra sách Workbook và báo cáo ca học bù"}
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

        {/* SUBTABS */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab("ACCOUNT")}
            className={`px-3 py-2 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "ACCOUNT"
                ? "border-blue-600 text-blue-700 bg-white rounded-t-xl"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Tài Khoản Zalo ({activeRole})</span>
          </button>

          <button
            onClick={() => setActiveTab("LOGS")}
            className={`px-3 py-2 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "LOGS"
                ? "border-blue-600 text-blue-700 bg-white rounded-t-xl"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Nhật Ký Tin Đã Gửi ({zaloMessageLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("TEST")}
            className={`px-3 py-2 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "TEST"
                ? "border-blue-600 text-blue-700 bg-white rounded-t-xl"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi Tin Thử Nghiệm</span>
          </button>
        </div>

        {/* TOAST MESSAGE */}
        {toastMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* BODY CONTENT */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: THÔNG TIN TÀI KHOẢN ZALO GẮN VỚI VAI TRÒ */}
          {activeTab === "ACCOUNT" && (
            <div className="space-y-4">
              {/* 1. THẺ THÔNG TIN TÀI KHOẢN & SỬA SỐ ĐIỆN THOẠI ZALO */}
              <div className="p-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <img
                        src={currentZaloAccount.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=DungShiny"}
                        alt={currentZaloAccount.accountName}
                        className="w-13 h-13 rounded-2xl bg-white border border-blue-300 p-1 shadow-xs"
                      />
                      <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[9px] text-white ${
                        botStatus.isConnected || currentZaloAccount.isConnected ? "bg-emerald-500" : "bg-rose-500"
                      }`}>
                        {botStatus.isConnected || currentZaloAccount.isConnected ? "✓" : "!"}
                      </span>
                    </div>

                    {!isEditingAccount ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm sm:text-base text-slate-900">
                            {currentZaloAccount.accountName}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-blue-100 text-blue-800">
                            {currentZaloAccount.accountType === "CENTER_HOTLINE" ? "Hotline Trung Tâm" : "Zalo Cá Nhân"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 font-mono mt-0.5 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                          <strong className="text-slate-800">{formatDisplayPhone(currentZaloAccount.phoneNumber)}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 flex-1 max-w-sm">
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-700 block">Tên Tài Khoản Zalo:</label>
                          <input
                            type="text"
                            value={inputAccountName}
                            onChange={(e) => setInputAccountName(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-700 block">Số Điện Thoại Zalo:</label>
                          <input
                            type="text"
                            value={inputPhone}
                            onChange={(e) => setInputPhone(e.target.value)}
                            placeholder="VD: 0964645174"
                            className="w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {!isEditingAccount ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingAccount(true)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Sửa SĐT / Tên Zalo</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSaveAccountInfo}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Lưu</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInputPhone(currentZaloAccount.phoneNumber);
                            setInputAccountName(currentZaloAccount.accountName);
                            setIsEditingAccount(false);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Trạng thái đăng nhập */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                  botStatus.isConnected || currentZaloAccount.isConnected
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      botStatus.isConnected || currentZaloAccount.isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                    }`}></span>
                    <span>
                      Trạng thái: <strong>{botStatus.isConnected || currentZaloAccount.isConnected ? `🟢 ĐÃ ĐĂNG NHẬP ZALO (${activeRole === "ADMIN" ? "Hotline Trung Tâm" : activeRole === "TEACHER" ? "Giáo Viên" : "Trợ Giảng"})` : "🔴 CHƯA ĐĂNG NHẬP ZALO"}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Nút đổi sang tài khoản Zalo khác */}
                    <button
                      type="button"
                      onClick={handleSwitchToAnotherZalo}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Ngắt nick hiện tại và sinh mã QR mới ngay để quét bằng nick Zalo khác"
                    >
                      <RefreshCw className={`w-3 h-3 ${isFetchingQr ? "animate-spin" : ""}`} />
                      <span>Quét Bằng Nick Khác</span>
                    </button>

                    {currentZaloAccount.isConnected && (
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline flex items-center gap-1 cursor-pointer"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Đăng Xuất</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. BƯỚC ĐĂNG NHẬP & QUÉT MÃ QR (ĐỘC LẬP TỪNG TÀI KHOẢN) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border-2 border-amber-300 space-y-3">
                <div className="flex items-center justify-between gap-2 text-amber-900 flex-wrap">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <h5 className="font-bold text-xs sm:text-sm">
                        Kết Nối Zalo Độc Lập Cho {activeRole === "ADMIN" ? "Quản Trị Viên (Hotline)" : activeRole === "TEACHER" ? "Giáo Viên" : "Trợ Giảng"}
                      </h5>
                      <p className="text-[11px] text-amber-800">
                        Mỗi vai trò sở hữu 1 phiên Zalo bot độc lập riêng biệt để gửi tin nhắn đến phụ huynh.
                      </p>
                    </div>
                  </div>

                  {botStatus.isConnected && (
                    <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Bot {activeRole} Đang Hoạt Động
                    </span>
                  )}
                </div>

                {/* Chọn phương thức đăng nhập */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* Cách 1: Quét mã QR từ Bot Server (Tự động làm mới khi hết hạn) */}
                  <div className="p-3.5 rounded-2xl bg-white border border-amber-200 space-y-2.5 flex flex-col items-center text-center shadow-xs">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                        <QrCode className="w-4 h-4 text-blue-600" />
                        <span>Quét Mã QR Đăng Nhập Zalo</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
                        Độc Lập {activeRole}
                      </span>
                    </div>

                    {/* Hiển thị QR từ bot server nếu có */}
                    {botStatus.qrCode ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <img
                          src={botStatus.qrCode}
                          alt="Zalo QR Code"
                          className="w-[160px] h-[160px] rounded-xl border border-slate-200 p-1.5 bg-white shadow-xs"
                        />
                        <div className="text-[10.5px] font-semibold text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Hiệu lực: <strong className="text-amber-700 font-mono">{botStatus.qrRemainingSec || 60}s</strong> (Tự động làm mới)</span>
                        </div>
                      </div>
                    ) : botStatus.isConnected ? (
                      <div className="w-full rounded-2xl border-2 border-emerald-300 bg-emerald-50/80 flex flex-col items-center justify-center gap-2 p-3 text-center">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-900">Bot {activeRole} Đã Kết Nối!</span>
                        <span className="text-[11px] text-emerald-700 font-semibold">{botStatus.user?.name || currentZaloAccount.accountName}</span>
                        <button
                          type="button"
                          onClick={handleSwitchToAnotherZalo}
                          className="mt-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 shadow-2xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3 text-blue-600" />
                          <span>🔄 Quét Bằng Nick Khác</span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-[160px] h-[160px] rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2">
                        <QrCode className="w-10 h-10 text-slate-300" />
                        <span className="text-[10px] text-slate-500">
                          {botStatus.status === "generating" ? "Đang tạo mã QR..." : "Bấm nút bên dưới để lấy QR"}
                        </span>
                      </div>
                    )}

                    {/* Các nút thao tác QR: Làm mới / Tạo mới / Quét nick khác */}
                    <div className="w-full space-y-1.5">
                      <button
                        type="button"
                        disabled={isFetchingQr || botStatus.status === "generating"}
                        onClick={() => handleRequestBotQr(true)}
                        className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-60"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetchingQr ? "animate-spin" : ""}`} />
                        <span>{isFetchingQr ? "Đang tạo mã QR mới..." : "🔄 Làm Mới Mã QR / Quét Nick Khác"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleConfirmLogin("QR_CODE")}
                        className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>📱 Tôi Đã Quét QR &amp; Đăng Nhập Xong</span>
                      </button>
                    </div>

                    <div className="text-[10.5px] text-slate-600 text-left space-y-0.5 w-full bg-slate-50 p-2 rounded-xl">
                      <p>• Dùng app Zalo trên điện thoại quét mã QR</p>
                      <p>• Mỗi vai trò lưu phiên riêng, tự động gửi độc lập</p>
                    </div>
                  </div>

                  {/* Cách 2: Đăng nhập trực tiếp trên Zalo Web */}
                  <div className="p-3.5 rounded-2xl bg-white border border-amber-200 space-y-2.5 flex flex-col justify-between shadow-xs">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                        <ExternalLink className="w-4 h-4 text-indigo-600" />
                        <span>Cách 2: Đăng Nhập Trên Zalo Web</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Mở trực tiếp trang <strong>Zalo Web (chat.zalo.me)</strong> trên trình duyệt, đăng nhập bằng số điện thoại <strong>{currentZaloAccount.phoneNumber}</strong>.
                      </p>

                      <button
                        type="button"
                        onClick={() => window.open("https://chat.zalo.me", "_blank", "noopener,noreferrer")}
                        className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>🌐 Mở chat.zalo.me Trên Tab Mới</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleConfirmLogin("ZALO_WEB_SYNC")}
                      className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>✅ Tôi Đã Đăng Nhập Xong Trên Zalo Web</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Hướng dẫn nguyên lý gửi tin & Sử dụng Zalo Web */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-blue-100 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Quy Trình Gửi Tin Nhắn Zalo Chuẩn 1-Chạm Trên Web &amp; App:
                  </h5>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                    100% An Toàn • Chống Khóa Số
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11.5px]">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">1</span>
                      <span>Đăng nhập Zalo 1 lần</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Mở <strong>Zalo Web (chat.zalo.me)</strong> hoặc Zalo App trên máy. Đăng nhập SĐT của bạn ({currentZaloAccount.phoneNumber}).
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11.5px]">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">2</span>
                      <span>Bấm &quot;Gửi Zalo&quot;</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Tại mục Học phí, BTVN, Điểm danh hay Nhóm lớp, bấm nút <strong>Gửi Zalo</strong>. Hệ thống tự động kích hoạt gửi trực tiếp.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11.5px]">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">3</span>
                      <span>Tự Động Gửi 1-Chạm</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Hệ thống tự động gửi trực tiếp qua Cổng Zalo Bot &amp; Extension Bridge (100% tự động, không cần dán Ctrl+V).
                    </p>
                  </div>
                </div>

                <ul className="space-y-1 text-slate-600 list-disc list-inside pt-1 border-t border-slate-200/60 text-[11.5px]">
                  <li>
                    <strong className="text-slate-800">Gửi Riêng Phụ Huynh (1-1):</strong> Điểm số, nhận xét buổi học riêng, lưu ý phát sinh, lịch học bù, học phí &amp; nhắc nợ.
                  </li>
                  <li>
                    <strong className="text-slate-800">Gửi Chung Nhóm Lớp:</strong> Giáo viên bấm <em>&quot;📢 Gửi Nhóm Zalo Lớp&quot;</em> tại Nhật ký buổi học để đăng nội dung bài học và BTVN chung.
                  </li>
                  <li>
                    <strong className="text-slate-800">Tài khoản gửi:</strong> Admin dùng Hotline (`0964645174`), Giáo viên dùng SĐT GV, Trợ giảng dùng SĐT TA.
                  </li>
                </ul>
              </div>

              {/* Danh sách các tài khoản Zalo trong hệ thống */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tài khoản Zalo các nhân sự khác trong trung tâm:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {zaloAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={acc.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=Staff"}
                          alt={acc.accountName}
                          className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">{acc.accountName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{acc.phoneNumber}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        acc.isConnected ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                      }`}>
                        {acc.isConnected ? "🟢 Đã kết nối" : "⚪ Chưa kết nối"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NHẬT KÝ TIN NHẮN ĐÃ GỬI (LOGS) */}
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

                  {zaloMessageLogs.length > 0 && (
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
                  Không tìm thấy tin nhắn Zalo nào phù hợp với bộ lọc.
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
                            💬
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-slate-900 truncate block">
                              {log.recipientName} ({log.recipientPhone})
                            </span>
                            <span className="text-[10.5px] text-slate-500">
                              Người gửi: <strong>{log.senderName}</strong> • {new Date(log.sentAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} {new Date(log.sentAt).toLocaleDateString("vi-VN")}
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

                      {/* Preview nội dung */}
                      <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-xl font-mono text-[11px]">
                        {log.content}
                      </p>

                      {/* Modal popup chi tiết nội dung nếu được chọn */}
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

          {/* TAB 3: GỬI TIN THỬ NGHIỆM */}
          {activeTab === "TEST" && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Công cụ thử nghiệm tin nhắn Zalo 1-Chạm:</strong> Cho phép kiểm tra nội dung và gửi tin nhắn thử nghiệm từ tài khoản Zalo hiện tại ({currentZaloAccount.accountName} - {currentZaloAccount.phoneNumber}) tới số điện thoại bất kỳ.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số Điện Thoại Nhận (Zalo Phụ Huynh):
                  </label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="VD: 0912345678"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ Tên Phụ Huynh:
                  </label>
                  <input
                    type="text"
                    value={testRecipientName}
                    onChange={(e) => setTestRecipientName(e.target.value)}
                    placeholder="VD: Phụ huynh học sinh"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mẫu Tin Nhắn Thử Nghiệm:
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
                        if (tpl.type === "INCIDENT_NOTE") {
                          setTestContent("Thầy cô trung tâm Ms. Dung Shiny xin gửi lời nhận xét: Hôm nay con rất chăm chỉ, tương tác sôi nổi và tiếp thu bài tốt. Ba Mẹ động viên con tiếp tục phát huy nhé ạ!");
                        } else if (tpl.type === "TUITION") {
                          setTestContent("[MS. DUNG SHINY] THÔNG BÁO HỌC PHÍ: Trung tâm gửi thông báo học phí tới Ba Mẹ theo số buổi học thực tế trong tháng. Hạn đóng: Ngày 10 hàng tháng.");
                        } else if (tpl.type === "MAKEUP_NOTICE") {
                          setTestContent("[MS. DUNG SHINY] THÔNG BÁO LỊCH HỌC BÙ: Trung tâm gửi lịch học bù bổ trợ kiến thức cho con trong tháng. Ba Mẹ theo dõi chi tiết trên Cổng Sổ liên lạc nhé ạ!");
                        } else if (tpl.type === "HOMEWORK_REMINDER") {
                          setTestContent("[MS. DUNG SHINY] NHẮC BÀI TẬP VỀ NHÀ: Ba Mẹ đồng hành và nhắc con hoàn thành bài tập nộp trên Sổ liên lạc của trung tâm nhé ạ!");
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                        testTemplate === tpl.type
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
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
                  Nội Dung Tin Nhắn Gửi Phụ Huynh:
                </label>
                <textarea
                  rows={4}
                  value={testContent}
                  onChange={(e) => setTestContent(e.target.value)}
                  className="w-full p-3 text-xs rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSendingTest}
                  onClick={handleSendTestMessage}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingTest ? "Đang gửi..." : "🚀 Gửi Thử Nghiệm Zalo"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Tài khoản phát: <strong>{currentZaloAccount.accountName} ({currentZaloAccount.phoneNumber})</strong></span>
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
