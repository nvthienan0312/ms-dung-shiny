"use client";

import React, { useState, useEffect, useMemo } from "react";
import { StaffItem, ClassItem } from "@/data/centerData";
import { useCenter } from "@/context/CenterContext";
import { 
  ArrowRightLeft, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  UserCheck, 
  Users, 
  Lock, 
  Calendar,
  CheckSquare,
  Square
} from "lucide-react";

interface StaffClassTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFromStaffId?: string | null;
  onSuccess?: (message: string) => void;
}

export default function StaffClassTransferModal({
  isOpen,
  onClose,
  initialFromStaffId,
  onSuccess,
}: StaffClassTransferModalProps) {
  const { staff: staffList, classes, transferStaffClasses } = useCenter();

  const [fromStaffId, setFromStaffId] = useState<string>("");
  const [toStaffId, setToStaffId] = useState<string>("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [lockFromStaffLogin, setLockFromStaffLogin] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Set initial fromStaffId
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsSubmitting(false);
      setLockFromStaffLogin(false);

      if (initialFromStaffId && staffList.some((s) => s.id === initialFromStaffId)) {
        setFromStaffId(initialFromStaffId);
      } else {
        // Mặc định chọn nhân sự đầu tiên có lớp phụ trách
        const firstWithClasses = staffList.find((s) =>
          classes.some(
            (c) => c.teacherId === s.id || c.assistantId === s.id || c.schedules.some((sch) => sch.teacherId === s.id || sch.assistantId === s.id)
          )
        );
        setFromStaffId(firstWithClasses?.id || staffList[0]?.id || "");
      }
    }
  }, [isOpen, initialFromStaffId, staffList, classes]);

  const fromStaff = useMemo(() => {
    return staffList.find((s) => s.id === fromStaffId);
  }, [staffList, fromStaffId]);

  // Các lớp do nhân sự bàn giao phụ trách
  const fromStaffClasses = useMemo(() => {
    if (!fromStaffId) return [];
    return classes.filter(
      (c) =>
        c.teacherId === fromStaffId ||
        c.assistantId === fromStaffId ||
        c.schedules.some((s) => s.teacherId === fromStaffId || s.assistantId === fromStaffId)
    );
  }, [fromStaffId, classes]);

  // Mặc định tick chọn tất cả lớp của nhân sự bàn giao khi đổi fromStaffId
  useEffect(() => {
    setSelectedClassIds(fromStaffClasses.map((c) => c.id));
  }, [fromStaffClasses]);

  // Danh sách nhân sự đủ điều kiện nhận bàn giao (CÙNG VAI TRÒ và KHÁC NGƯỜI GIAO)
  const eligibleToStaff = useMemo(() => {
    if (!fromStaff) return [];
    return staffList.filter((s) => s.role === fromStaff.role && s.id !== fromStaff.id);
  }, [fromStaff, staffList]);

  // Đặt toStaffId mặc định khi danh sách eligibleToStaff thay đổi
  useEffect(() => {
    if (eligibleToStaff.length > 0) {
      if (!eligibleToStaff.some((s) => s.id === toStaffId)) {
        setToStaffId(eligibleToStaff[0].id);
      }
    } else {
      setToStaffId("");
    }
  }, [eligibleToStaff, toStaffId]);

  const handleToggleClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClassIds.length === fromStaffClasses.length) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(fromStaffClasses.map((c) => c.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fromStaffId) {
      setErrorMessage("Vui lòng chọn nhân sự bàn giao.");
      return;
    }
    if (!toStaffId) {
      setErrorMessage("Vui lòng chọn nhân sự tiếp nhận bàn giao.");
      return;
    }
    if (selectedClassIds.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất 1 lớp học để bàn giao.");
      return;
    }

    setIsSubmitting(true);

    const result = transferStaffClasses(fromStaffId, toStaffId, selectedClassIds, {
      lockFromStaffLogin,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.message);
    } else {
      if (onSuccess) {
        onSuccess(result.message);
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-xl shadow-xs border border-white/20">
              <ArrowRightLeft className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Bàn Giao Lớp Giữa Các Nhân Sự</h3>
              <p className="text-xs text-indigo-100 mt-0.5">
                Chuyển giao quyền phụ trách các lớp học từ giáo viên / trợ giảng này sang nhân sự khác
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* CẢNH BÁO / LỖI NẾU CÓ */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* BƯỚC 1 & 2: CHỌN NGƯỜI GIAO VÀ NGƯỜI NHẬN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            {/* 1. NGƯỜI BÀN GIAO */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-bold">1</span>
                Nhân Sự Bàn Giao (Người giao) <span className="text-rose-500">*</span>
              </label>
              <select
                value={fromStaffId}
                onChange={(e) => setFromStaffId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {staffList.map((s) => {
                  const count = classes.filter(
                    (c) => c.teacherId === s.id || c.assistantId === s.id || c.schedules.some((sch) => sch.teacherId === s.id || sch.assistantId === s.id)
                  ).length;
                  return (
                    <option key={s.id} value={s.id}>
                      [{s.role === "TEACHER" ? "GV" : "TA"}] {s.fullName} ({count} lớp)
                    </option>
                  );
                })}
              </select>
              {fromStaff && (
                <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold ${
                      fromStaff.role === "TEACHER"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {fromStaff.role === "TEACHER" ? "👩‍🏫 Giáo viên" : "🧑‍💻 Trợ giảng"}
                  </span>
                  <span>• Phụ trách: <strong className="text-slate-800">{fromStaffClasses.length} lớp</strong></span>
                </div>
              )}
            </div>

            {/* 2. NGƯỜI TIẾP NHẬN */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">2</span>
                Nhân Sự Tiếp Nhận (Người nhận) <span className="text-indigo-500">*</span>
              </label>
              {eligibleToStaff.length === 0 ? (
                <div className="p-2 text-xs text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
                  Không có nhân sự nào khác cùng vai trò ({fromStaff?.role === "TEACHER" ? "Giáo viên" : "Trợ giảng"}) để tiếp nhận. Vui lòng thêm nhân sự mới trước.
                </div>
              ) : (
                <select
                  value={toStaffId}
                  onChange={(e) => setToStaffId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {eligibleToStaff.map((s) => {
                    const count = classes.filter(
                      (c) => c.teacherId === s.id || c.assistantId === s.id || c.schedules.some((sch) => sch.teacherId === s.id || sch.assistantId === s.id)
                    ).length;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.phone}) - Đang dạy {count} lớp
                      </option>
                    );
                  })}
                </select>
              )}
              <div className="text-[10.5px] text-slate-500 pt-0.5">
                * Chỉ hiển thị nhân sự cùng vai trò chuyên môn ({fromStaff?.role === "TEACHER" ? "Giáo viên" : "Trợ giảng"})
              </div>
            </div>
          </div>

          {/* BƯỚC 3: CHỌN CÁC LỚP CẦN BÀN GIAO */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold">3</span>
                Chọn các lớp bàn giao ({selectedClassIds.length} / {fromStaffClasses.length} lớp đã chọn):
              </label>

              {fromStaffClasses.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  {selectedClassIds.length === fromStaffClasses.length ? (
                    <>
                      <Square className="w-3.5 h-3.5" /> Bỏ chọn tất cả
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" /> Chọn tất cả các lớp
                    </>
                  )}
                </button>
              )}
            </div>

            {fromStaffClasses.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                Nhân sự <strong>{fromStaff?.fullName}</strong> hiện không phụ trách lớp học nào.
              </div>
            ) : (
              <div className="space-y-2 max-h-[36vh] overflow-y-auto pr-1">
                {fromStaffClasses.map((cls) => {
                  const isChecked = selectedClassIds.includes(cls.id);
                  const isPrimary =
                    fromStaff?.role === "TEACHER"
                      ? cls.teacherId === fromStaffId
                      : cls.assistantId === fromStaffId;

                  return (
                    <div
                      key={cls.id}
                      onClick={() => handleToggleClass(cls.id)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked
                          ? "bg-indigo-50/70 border-indigo-300 shadow-2xs"
                          : "bg-white border-slate-200 hover:border-slate-300 opacity-80"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by div click
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                              {cls.code}
                            </span>
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {cls.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {cls.schedules.map((s) => `T${s.dayOfWeek}: ${s.startTime}-${s.endTime}`).join(", ")}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" /> {cls.currentStudents || 0} HS
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isPrimary ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Phụ trách chính
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Phân ca lẻ
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* TÙY CHỌN DÀNH CHO TRƯỜNG HỢP NHÂN SỰ NGHỈ VIỆC */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={lockFromStaffLogin}
                onChange={(e) => setLockFromStaffLogin(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 mt-0.5 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  Đồng thời khóa quyền đăng nhập của nhân sự bàn giao
                </span>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Tích chọn nếu nhân sự này đã thôi việc / nghỉ hẳn tại trung tâm. Tài khoản của họ sẽ tự động bị khóa truy cập hệ thống ngay sau khi bàn giao xong.
                </p>
              </div>
            </label>
          </div>

          {/* MODAL FOOTER */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || eligibleToStaff.length === 0 || selectedClassIds.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl transition flex items-center gap-2 shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>{isSubmitting ? "Đang bàn giao..." : `Xác Nhận Bàn Giao (${selectedClassIds.length} lớp)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
