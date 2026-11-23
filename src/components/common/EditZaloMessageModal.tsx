"use client";

import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  X, 
  RotateCcw, 
  Smartphone, 
  User, 
  Sparkles,
  ExternalLink,
  Users,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { copyTextToClipboard, formatDisplayPhone } from "@/utils/zaloHelper";

export interface EditZaloMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  recipientName: string;
  recipientPhone: string;
  studentName?: string;
  className?: string;
  initialContent: string;
  templateBadge?: string;
  isClassGroup?: boolean;
  initialGroupUrl?: string;
  initialGroupId?: string;
  senderRole?: "ADMIN" | "TEACHER" | "ASSISTANT";
  onSend: (editedContent: string, groupUrl?: string, groupId?: string) => void;
}

export default function EditZaloMessageModal({
  isOpen,
  onClose,
  title = "Chỉnh Sửa Tin Nhắn Zalo Trước Khi Gửi",
  recipientName,
  recipientPhone,
  studentName,
  className,
  initialContent,
  templateBadge = "Tin Nhắn Tự Động",
  isClassGroup = false,
  initialGroupUrl = "",
  initialGroupId = "",
  senderRole = "TEACHER",
  onSend,
}: EditZaloMessageModalProps) {
  const [content, setContent] = useState<string>(initialContent);
  const [groupUrl, setGroupUrl] = useState<string>(initialGroupUrl);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId);
  const [botGroups, setBotGroups] = useState<Array<{ id: string; groupId: string; name: string }>>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setGroupUrl(initialGroupUrl);
      setSelectedGroupId(initialGroupId);
      setCopied(false);

      if (isClassGroup) {
        setIsLoadingGroups(true);
        // Tải danh sách nhóm Zalo của bot đang kết nối để người dùng chọn hoặc tự động khớp
        fetch(`/api/zalo/contacts?role=${senderRole}&account=${senderRole.toLowerCase()}`)
          .then((res) => (res.ok ? res.json() : { groups: [] }))
          .then((data) => {
            const groups: Array<{ id: string; groupId: string; name: string }> = data.groups || [];
            setBotGroups(groups);

            // Tự động khớp nhóm theo tên lớp nếu chưa có selectedGroupId
            if (!initialGroupId && className && groups.length > 0) {
              const matched = groups.find(
                (g) =>
                  (g.name && className && (g.name.toLowerCase().includes(className.toLowerCase()) || className.toLowerCase().includes(g.name.toLowerCase())))
              );
              if (matched) {
                setSelectedGroupId(matched.groupId || matched.id);
              }
            }
          })
          .catch(() => {})
          .finally(() => setIsLoadingGroups(false));
      }
    }
  }, [isOpen, initialContent, initialGroupUrl, initialGroupId, isClassGroup, className, senderRole]);

  if (!isOpen) return null;

  const handleCopyOnly = async () => {
    await copyTextToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirmSend = () => {
    if (!content.trim()) {
      alert("Nội dung tin nhắn không được để trống!");
      return;
    }
    onSend(content.trim(), groupUrl.trim(), selectedGroupId.trim() || undefined);
    onClose();
  };

  const handleReset = () => {
    setContent(initialContent);
    setGroupUrl(initialGroupUrl);
    setSelectedGroupId(initialGroupId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-xl shadow-xs border border-white/20">
              💬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">{title}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                  {templateBadge}
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Bạn có toàn quyền chỉnh sửa câu chữ, thêm lời nhắn trước khi gửi đến phụ huynh
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

        {/* BANNER PHÂN BIỆT RÕ RÀNG KÊNH GỬI (ZALO VS NỘI BỘ) */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-b border-emerald-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1">
              <span>💬 KÊNH GỬI:</span> ZALO PHỤ HUYNH
            </span>
            <span className="text-slate-700 font-semibold text-[11.5px]">
              Gửi trực tiếp tới Zalo SĐT: <strong className="font-mono text-slate-900">{formatDisplayPhone(recipientPhone)}</strong>
            </span>
          </div>
          <span className="text-[11px] text-indigo-800 bg-white border border-indigo-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 shrink-0">
            <span>📲 Kèm Đồng Bộ Cổng App</span>
          </span>
        </div>

        {/* THÔNG TIN NGƯỜI NHẬN */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-slate-600">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Người nhận: <strong className="text-slate-900">{recipientName}</strong>
              {studentName && <span className="text-slate-500">(PH bé {studentName})</span>}
            </span>
            <span className="flex items-center gap-1 font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
              <Smartphone className="w-3 h-3 text-emerald-600" />
              {formatDisplayPhone(recipientPhone)}
            </span>
          </div>

          {className && (
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {className}
            </span>
          )}
        </div>

        {/* VÙNG CHỈNH SỬA NỘI DUNG */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col space-y-3 overflow-y-auto">
          {/* THIẾT LẬP NHÓM ZALO LỚP (TỰ ĐỘNG GỬI 100%, KHÔNG CẦN CTRL+V) */}
          {isClassGroup && (
            <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-indigo-50/90 border-2 border-indigo-200 rounded-2xl space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Kênh Gửi Nhóm Zalo Lớp:</span>
                </span>
                {botGroups.length > 0 ? (
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Bot {senderRole} Đang Có {botGroups.length} Nhóm</span>
                  </span>
                ) : isLoadingGroups ? (
                  <span className="text-[10px] text-indigo-600 animate-pulse">
                    Đang tìm danh sách nhóm Zalo của bot...
                  </span>
                ) : null}
              </div>

              {/* Dropdown danh sách nhóm thực tế trên bot */}
              {botGroups.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                    <span>Chọn nhóm Zalo muốn bắn tin:</span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Tự động bắn 1-chạm không cần phím tắt</span>
                  </label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-indigo-300 bg-white text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer"
                  >
                    <option value="">-- Chọn nhóm Zalo từ bot --</option>
                    {botGroups.map((g) => (
                      <option key={g.groupId || g.id} value={g.groupId || g.id}>
                        👥 {g.name} (ID: {g.groupId || g.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nhập link nhóm zalo */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <ExternalLink className="w-3 h-3 text-indigo-600" />
                    <span>Đường dẫn (Link) Nhóm Zalo Lớp:</span>
                  </span>
                  <span className="text-[10px] text-indigo-600 font-normal">Tự động lưu vào thông tin lớp</span>
                </label>
                <input
                  type="text"
                  value={groupUrl}
                  onChange={(e) => setGroupUrl(e.target.value)}
                  placeholder="Ví dụ: https://zalo.me/g/abcdef123"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono shadow-xs"
                />
              </div>

              {/* Badge thông báo cơ chế tự động */}
              <div className="p-2 rounded-xl bg-white border border-indigo-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-medium">Cơ chế phát tin:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span>⚡ 100% Tự Động Bắn Thẳng Vào Nhóm Zalo (Không bắt Ctrl+V)</span>
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-slate-800 flex items-center gap-1">
              <span>Nội Dung Tin Nhắn Zalo:</span>
              <span className="text-[11px] font-normal text-slate-500">(Có thể gõ thêm, sửa bớt tùy ý)</span>
            </label>
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              title="Khôi phục về nội dung mẫu ban đầu"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Khôi phục mẫu</span>
            </button>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="w-full p-3.5 rounded-2xl border border-slate-300 bg-white text-xs leading-relaxed text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans shadow-inner resize-y"
            placeholder="Nhập nội dung tin nhắn gửi phụ huynh..."
          />

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Độ dài: <strong className="text-slate-800 font-mono">{content.length}</strong> ký tự</span>
            <span className="text-emerald-700 font-medium">💡 Gợi ý: Giữ lại thông tin số tài khoản &amp; tên con để PH dễ đối soát</span>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleCopyOnly}
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Đã Sao Chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Chỉ Sao Chép Nội Dung</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmSend}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>💬 Bắn Tin Zalo Tới Phụ Huynh</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
