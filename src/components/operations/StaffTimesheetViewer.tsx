"use client";

import { useState, useMemo } from "react";
import { useCenter } from "@/context/CenterContext";
import { MAKEUP_SESSION_FIXED_PAY } from "@/data/centerData";
import { getRollingTwoSalaryMonths, getCurrentBillingMonth } from "@/utils/dateHelper";
import { 
  Coins, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Check, 
  Printer, 
  ShieldCheck, 
  AlertCircle,
  MessageSquare,
  Lock
} from "lucide-react";

export interface StaffTimesheetViewerProps {
  currentStaffId?: string; // id của TA ("staff-ta1") hoặc GV ("staff-t1")
  userRole?: "ASSISTANT" | "TEACHER" | "ADMIN";
}

export default function StaffTimesheetViewer({
  currentStaffId = "",
  userRole = "ASSISTANT",
}: StaffTimesheetViewerProps) {
  const { staff, staffTimesheets, confirmStaffTimesheet } = useCenter();

  const rollingMonths = useMemo(() => getRollingTwoSalaryMonths(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentBillingMonth());
  const [feedbackNote, setFeedbackNote] = useState<string>("");
  const [showFeedbackInput, setShowFeedbackInput] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeStaff = useMemo(() => {
    return (
      staff.find((s) => s.id === currentStaffId) || {
        id: "",
        fullName: userRole === "TEACHER" ? "Giáo viên" : userRole === "ASSISTANT" ? "Trợ giảng" : "Quản trị viên",
        role: userRole,
      }
    );
  }, [staff, currentStaffId, userRole]);

  // Tìm bảng lương 2 tháng gần nhất của nhân sự này
  const staffRollingTimesheets = useMemo(() => {
    if (!activeStaff.id) return [];
    const allowed = new Set(rollingMonths);
    return staffTimesheets.filter((ts) => ts.staffId === activeStaff.id && allowed.has(ts.monthStr));
  }, [staffTimesheets, activeStaff, rollingMonths]);

  const timesheet = useMemo(() => {
    if (!activeStaff.id) return undefined;
    return (
      staffRollingTimesheets.find((ts) => ts.monthStr === selectedMonth) ||
      staffRollingTimesheets[0] ||
      staffTimesheets.find((ts) => ts.staffId === activeStaff.id && ts.monthStr === selectedMonth)
    );
  }, [staffRollingTimesheets, staffTimesheets, activeStaff, selectedMonth]);

  const displayMonth = timesheet?.monthStr || selectedMonth;

  const isDraft = timesheet?.status === "DRAFT";
  const isConfirmed = timesheet?.status === "CONFIRMED";
  const isReadyToConfirm = timesheet?.status === "SENT_TO_STAFF" || timesheet?.status === "PENDING_CONFIRMATION";

  const handleConfirm = () => {
    if (!timesheet) return;

    confirmStaffTimesheet(timesheet.id, feedbackNote);
    setToastMessage(`🎉 Bạn đã xác nhận bảng công và lương ${displayMonth} thành công! Admin đã nhận được phản hồi.`);
    setShowFeedbackInput(false);
    setTimeout(() => setToastMessage(null), 5000);
  };

  if (!timesheet) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          {rollingMonths.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMonth(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                selectedMonth === m
                  ? "bg-amber-500 text-slate-950 border-amber-500"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <Coins className="w-10 h-10 text-slate-300 mx-auto" />
        <h4 className="font-bold text-base text-slate-800">Chưa Có Bảng Lương {selectedMonth}</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Hiện tại chưa có dữ liệu bảng chấm công và lương {selectedMonth} được tạo cho nhân sự <strong className="text-slate-700">{activeStaff.fullName}</strong>. Vui lòng chọn tháng khác hoặc liên hệ Admin để được hỗ trợ.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
              <Coins className="w-5 h-5 text-amber-500" />
              Phiếu Chấm Công & Bảng Lương Cá Nhân ({displayMonth})
            </h3>
            <div className="flex items-center gap-1">
              {rollingMonths.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMonth(m)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition ${
                    displayMonth === m
                      ? "bg-slate-900 text-amber-300 border-slate-900"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {isConfirmed && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã Xác Nhận Chuẩn
              </span>
            )}
            {isReadyToConfirm && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 animate-pulse flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-700" /> Đã Nhận • Chờ Bạn Xác Nhận
              </span>
            )}
            {isDraft && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-500" /> Bản Nháp (Admin Đang Soạn)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Nhân sự: <strong className="text-slate-800">{activeStaff.fullName}</strong> • Vị trí: <strong className="text-slate-800">{activeStaff.role === "TEACHER" ? "Giáo viên giảng dạy" : "Trợ giảng (TA)"}</strong> • Đơn giá theo giờ: <strong className="text-amber-600 font-mono">{timesheet.hourlyRate.toLocaleString("vi-VN")} đ/giờ</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In Phiếu Lương</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-3 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Lifecycle Status Banner */}
      {isDraft && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-amber-950">
              Bảng Lương Đang Được Admin Rà Soát Nội Bộ (Chưa Gửi)
            </h4>
            <p className="text-xs text-amber-800 mt-1">
              Quản trị viên (Admin) đang tổng hợp số giờ đứng lớp, thưởng và phụ cấp của tháng này. Bảng lương hiện ở trạng thái <strong>Bản Nháp</strong> và chưa được gửi chính thức đến bạn. Khi Admin hoàn tất và bấm <em>&ldquo;Gửi Bảng Lương&rdquo;</em>, bạn sẽ có thể kiểm tra chi tiết và bấm Xác nhận (Confirm) tại đây.
            </p>
          </div>
        </div>
      )}

      {isReadyToConfirm && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h4 className="font-bold text-xs sm:text-sm text-blue-950">
                Admin Đã Gửi Bảng Lương Chính Thức Tháng {timesheet.monthStr}
              </h4>
              {timesheet.sentAt && (
                <span className="text-[11px] text-blue-700 font-mono">
                  Gửi lúc: {new Date(timesheet.sentAt).toLocaleString("vi-VN")}
                </span>
              )}
            </div>
            <p className="text-xs text-blue-800 mt-1">
              Vui lòng đối soát kĩ số giờ đứng lớp, đơn giá, các khoản thưởng/phụ cấp và tổng thực lĩnh bên dưới. Nếu mọi thứ chính xác, bạn hãy bấm <strong>Xác Nhận Bảng Lương Đúng</strong> để Admin tiến hành thanh toán chuyển khoản.
            </p>
            {timesheet.adminNotes && (
              <div className="mt-2.5 p-2.5 bg-white/90 rounded-lg border border-blue-200 text-xs text-slate-800">
                <span className="font-bold text-blue-900 flex items-center gap-1 mb-0.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-700" /> Lời Nhắn Từ Admin:
                </span>
                <p className="italic text-slate-700">{timesheet.adminNotes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isConfirmed && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h4 className="font-bold text-xs sm:text-sm text-emerald-950">
                Bạn Đã Xác Nhận Bảng Công & Lương Chính Xác
              </h4>
              {timesheet.confirmedAt && (
                <span className="text-[11px] text-emerald-800 font-mono">
                  Đã xác nhận: {new Date(timesheet.confirmedAt).toLocaleString("vi-VN")}
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-800 mt-1">
              Thông tin đã được đồng bộ về cho Chủ trung tâm (Admin). Admin sẽ tiến hành chi trả theo lịch thanh toán lương của trung tâm.
            </p>
            {timesheet.feedbackNote && (
              <div className="mt-2 p-2 bg-white/90 rounded-lg border border-emerald-200 text-xs text-slate-700">
                <span className="font-semibold text-emerald-950">Ghi chú bạn đã gửi kèm: </span>
                <span className="italic">&ldquo;{timesheet.feedbackNote}&rdquo;</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Timesheet Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-5">
        {/* Salary Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Số giờ đứng lớp:</span>
            <span className="text-xl font-bold font-mono text-slate-900">
              {timesheet.totalHours || 0} <span className="text-xs font-normal text-slate-500">giờ</span>
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">({timesheet.totalSessions || 0} ca học)</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Lương theo giờ (Base):</span>
            <span className="text-xl font-bold font-mono text-slate-900">
              {(timesheet.baseSalary || 0).toLocaleString("vi-VN")} <span className="text-xs font-normal text-slate-500">đ</span>
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">{timesheet.hourlyRate.toLocaleString("vi-VN")} đ/h</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Phụ cấp & Khác:</span>
            {(() => {
              const otherAdj = timesheet.otherAdjustment !== undefined ? timesheet.otherAdjustment : (timesheet.deduction || 0);
              const totalAllowanceBonus = (timesheet.allowance || 0) + (timesheet.bonus || 0) + otherAdj;
              return (
                <>
                  <span className={`text-xl font-bold font-mono ${totalAllowanceBonus >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {totalAllowanceBonus >= 0 ? `+${totalAllowanceBonus.toLocaleString("vi-VN")}` : `${totalAllowanceBonus.toLocaleString("vi-VN")}`} <span className="text-xs font-normal text-slate-500">đ</span>
                  </span>
                  <span className="text-[10.5px] text-slate-500 block mt-0.5 space-y-0.5">
                    <span>Đi lại: +{(timesheet.allowance || 0).toLocaleString("vi-VN")} đ</span> • <span>Công việc: +{(timesheet.bonus || 0).toLocaleString("vi-VN")} đ</span>
                    {otherAdj !== 0 && (
                      <span className={`block font-semibold ${otherAdj > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        Khoản khác: {otherAdj > 0 ? `+${otherAdj.toLocaleString("vi-VN")}` : `${otherAdj.toLocaleString("vi-VN")}`} đ
                      </span>
                    )}
                  </span>
                </>
              );
            })()}
          </div>

          <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-xl border border-amber-200">
            <span className="text-xs text-amber-900 font-bold block mb-1">TỔNG THỰC LĨNH:</span>
            <span className="text-2xl font-black font-mono text-amber-700">
              {(timesheet.totalNetSalary || 0).toLocaleString("vi-VN")} <span className="text-xs font-bold text-amber-800">đ</span>
            </span>
            <span className="text-[11px] text-amber-800 block mt-0.5">Lương ca + Phụ cấp đi lại/CV & Khác</span>
          </div>
        </div>

        {/* Detailed Work Log Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              Chi Tiết Từng Ca Dạy / Trực Ca Trong Tháng ({timesheet.sessionLogs?.length || 0} ca đã đối soát):
            </h4>
            <span className="text-[11px] text-slate-400">*Ghi nhận tự động từ Thời khóa biểu và Điểm danh</span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Ngày</th>
                  <th className="py-2.5 px-3">Lớp học</th>
                  <th className="py-2.5 px-3">Phòng</th>
                  <th className="py-2.5 px-3">Khung giờ</th>
                  <th className="py-2.5 px-3 text-center">Số giờ</th>
                  <th className="py-2.5 px-3 text-right">Đơn giá/h</th>
                  <th className="py-2.5 px-3 text-right">Thành tiền</th>
                  <th className="py-2.5 px-3 text-center">Loại ca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timesheet.sessionLogs?.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2 px-3 font-mono text-slate-800">{log.dateStr}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{log.className}</td>
                    <td className="py-2 px-3 text-slate-600">{log.classroom}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{log.startTime} - {log.endTime}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold">{log.durationHours}h</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">
                      {log.type === "MAKEUP"
                        ? `${MAKEUP_SESSION_FIXED_PAY.toLocaleString("vi-VN")} đ/ca`
                        : `${log.ratePerHour.toLocaleString("vi-VN")} đ`}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {(log.type === "MAKEUP" ? MAKEUP_SESSION_FIXED_PAY : log.amount).toLocaleString("vi-VN")} đ
                    </td>
                    <td className="py-2 px-3 text-center">
                      {log.type === "MAKEUP" ? (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-indigo-100 text-indigo-900 font-bold border border-indigo-300">
                          Lớp học bù ({MAKEUP_SESSION_FIXED_PAY.toLocaleString("vi-VN")}đ/ca)
                        </span>
                      ) : log.type === "SUBSTITUTION" ? (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-100 text-amber-900 font-bold border border-amber-300">
                          Dạy/Trực thay
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700">
                          Ca chính khóa
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Confirmation Action Box */}
        <div className="pt-3 border-t border-slate-100">
          {isDraft && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Bảng lương đang ở trạng thái <strong>Bản Nháp</strong>. Sau khi Admin chính thức bấm <em>&ldquo;Gửi Bảng Lương&rdquo;</em>, tính năng xác nhận sẽ mở tự động.
                </span>
              </div>
              <button
                type="button"
                disabled
                className="px-4 py-2 bg-slate-200 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed shrink-0 self-start sm:self-auto"
              >
                Chờ Admin Gửi Bảng Lương
              </button>
            </div>
          )}

          {isConfirmed && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                  ✓
                </div>
                <div>
                  <div className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                    <span>ĐÃ XÁC NHẬN BẢNG CÔNG & LƯƠNG CHÍNH XÁC</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="text-xs text-emerald-800 mt-0.5">
                    Xác nhận lúc: {new Date(timesheet.confirmedAt || "").toLocaleString("vi-VN")} bởi <strong>{activeStaff.fullName}</strong>.
                  </div>
                  {timesheet.feedbackNote && (
                    <div className="text-xs text-slate-700 italic mt-1">
                      Ghi chú phản hồi: &ldquo;{timesheet.feedbackNote}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              <span className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold text-xs shrink-0 self-start sm:self-auto shadow-2xs">
                Mộc Điện Tử: CONFIRMED
              </span>
            </div>
          )}

          {isReadyToConfirm && (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/60 rounded-2xl border border-amber-300 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h5 className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Xác Nhận Bảng Lương:
                  </h5>
                  <p className="text-xs text-amber-900 mt-0.5">
                    Đối soát số giờ làm và số tiền thực lĩnh trước khi xác nhận.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackInput(!showFeedbackInput)}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition"
                  >
                    💬 Có Thắc Mắc / Khiếu Nại
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95"
                  >
                    <Check className="w-4 h-4 text-white" />
                    <span>Xác Nhận Bảng Lương Đúng (Confirm)</span>
                  </button>
                </div>
              </div>

              {/* Input for feedback if staff has questions */}
              {showFeedbackInput && (
                <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2 animate-in fade-in">
                  <label className="text-xs font-bold text-slate-800 block">
                    Ghi chú thắc mắc hoặc giờ làm cần đối chiếu lại gửi Chủ trung tâm:
                  </label>
                  <textarea
                    rows={2}
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    placeholder="Ví dụ: Em có trực thêm ca ngày 18/10 từ 17:00 - 18:30 nhưng chưa thấy hiển thị trong bảng công..."
                    className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleConfirm}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition"
                    >
                      Gửi Xác Nhận Kèm Ghi Chú Này
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
