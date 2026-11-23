"use client";

import { useState } from "react";
import { useCenter } from "@/context/CenterContext";
import { StaffItem } from "@/data/centerData";
import { 
  GraduationCap, 
  UserCheck, 
  Plus, 
  Mail, 
  Phone, 
  X, 
  Briefcase, 
  Edit3, 
  Trash2, 
  Search,
  Coins,
  ShieldCheck,
  KeyRound,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft
} from "lucide-react";
import { normalizePhoneNumber } from "@/utils/authHelper";
import StaffClassTransferModal from "./StaffClassTransferModal";

export default function StaffManager() {
  const { 
    staff: staffList, 
    classes, 
    addStaff, 
    updateStaff, 
    deleteStaff,
    userAccounts,
    toggleUserAccountPermission,
    resetStaffPassword
  } = useCenter();
  const [activeTab, setActiveTab] = useState<"ALL" | "TEACHER" | "ASSISTANT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferInitialStaffId, setTransferInitialStaffId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "TEACHER" as "TEACHER" | "ASSISTANT",
    specialty: "",
    hourlyRate: 250000,
  });

  const filteredStaff = staffList.filter((s) => {
    const matchesTab = activeTab === "ALL" || s.role === activeTab;
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      s.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedStaff = filteredStaff.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const handleOpenCreate = () => {
    setEditingStaffId(null);
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      role: "TEACHER",
      specialty: "",
      hourlyRate: 250000,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (stf: StaffItem) => {
    setEditingStaffId(stf.id);
    setFormData({
      fullName: stf.fullName,
      email: stf.email,
      phone: stf.phone,
      role: stf.role,
      specialty: stf.specialty,
      hourlyRate: stf.hourlyRate || (stf.role === "TEACHER" ? 250000 : 80000),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) return;

    if (editingStaffId) {
      updateStaff(editingStaffId, {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || "0900 000 000",
        role: formData.role,
        specialty: formData.specialty,
        hourlyRate: Number(formData.hourlyRate) || 0,
      });
    } else {
      addStaff({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || "0900 000 000",
        role: formData.role,
        specialty: formData.specialty || (formData.role === "TEACHER" ? "Giáo viên tiếng Anh" : "Trợ giảng"),
        hourlyRate: Number(formData.hourlyRate) || (formData.role === "TEACHER" ? 250000 : 80000),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.fullName)}`,
        status: "ACTIVE",
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Filter and Action Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 gap-2 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, email, SĐT..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { setActiveTab("ALL"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tất cả ({staffList.length})
            </button>
            <button
              onClick={() => { setActiveTab("TEACHER"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "TEACHER" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Giáo viên ({staffList.filter((s) => s.role === "TEACHER").length})
            </button>
            <button
              onClick={() => { setActiveTab("ASSISTANT"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "ASSISTANT" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Trợ giảng ({staffList.filter((s) => s.role === "ASSISTANT").length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTransferInitialStaffId(null);
              setIsTransferModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-indigo-600" /> Bàn Giao Lớp Giữa Các Nhân Sự
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-500/10 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm Giáo Viên / Trợ Giảng
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Staff Table View (Dạng Bảng Chuyên Nghiệp) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Nhân Sự & Vai Trò</th>
                <th className="py-3.5 px-4">Liên Hệ</th>
                <th className="py-3.5 px-4">Tài Khoản & Quyền Đăng Nhập</th>
                <th className="py-3.5 px-4">Chuyên Môn / Chứng Chỉ</th>
                <th className="py-3.5 px-4">Lương / Giờ</th>
                <th className="py-3.5 px-4">Lớp Đang Phụ Trách</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs italic">
                    Chưa có nhân sự nào trong danh sách. Bấm &quot;+ Thêm Nhân Sự Mới&quot; để tạo hồ sơ giáo viên / trợ giảng.
                  </td>
                </tr>
              ) : (
                paginatedStaff.map((staff) => {
                const assignedClasses = classes.filter(
                  (c) => c.teacherId === staff.id || c.assistantId === staff.id || c.schedules.some((s) => s.teacherId === staff.id || s.assistantId === staff.id)
                );
                const staffAccount = userAccounts.find(
                  (a) => a.staffId === staff.id || (a.role === staff.role && normalizePhoneNumber(a.phone) === normalizePhoneNumber(staff.phone))
                );

                return (
                  <tr key={staff.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={staff.avatarUrl}
                          alt={staff.fullName}
                          className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{staff.fullName}</div>
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                              staff.role === "TEACHER"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-blue-100 text-blue-800 border border-blue-200"
                            }`}
                          >
                            {staff.role === "TEACHER" ? "👩‍🏫 Giáo viên" : "🧑‍💻 Trợ giảng"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{staff.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{staff.phone}</span>
                        </div>
                      </div>
                    </td>

                    {/* Tài Khoản & Phân Quyền Đăng Nhập */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-800">
                          <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                          <span>{staff.phone}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {staffAccount?.isLoginAllowed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Đã Cấp Quyền
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <Lock className="w-3 h-3 text-rose-600" />
                              Chưa Phân Quyền
                            </span>
                          )}
                        </div>

                        {/* Thao tác phân quyền & reset mật khẩu của Admin */}
                        <div className="flex items-center gap-1 pt-0.5">
                          {staffAccount?.isLoginAllowed ? (
                            <button
                              onClick={() => {
                                toggleUserAccountPermission(staffAccount.id, false);
                                setActionFeedback(`Đã hủy quyền đăng nhập của ${staff.fullName}. Nhân sự sẽ không thể đăng nhập vào hệ thống.`);
                                setTimeout(() => setActionFeedback(null), 3000);
                              }}
                              className="px-2 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition flex items-center gap-1"
                              title="Hủy phân quyền đăng nhập"
                            >
                              <Lock className="w-2.5 h-2.5" /> Hủy quyền
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (staffAccount) {
                                  toggleUserAccountPermission(staffAccount.id, true);
                                  setActionFeedback(`Đã cấp quyền đăng nhập cho ${staff.fullName} thành công! Mật khẩu mặc định: 123456a@`);
                                  setTimeout(() => setActionFeedback(null), 3500);
                                }
                              }}
                              className="px-2 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition flex items-center gap-1 shadow-xs"
                              title="Cấp quyền đăng nhập cho nhân sự này"
                            >
                              <Unlock className="w-2.5 h-2.5 text-emerald-600" /> Cấp quyền
                            </button>
                          )}

                          {staffAccount && (
                            <button
                              onClick={() => {
                                const res = resetStaffPassword(staffAccount.id);
                                setActionFeedback(res.message);
                                setTimeout(() => setActionFeedback(null), 3000);
                              }}
                              className="px-1.5 py-0.5 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition flex items-center gap-0.5"
                              title="Đặt lại mật khẩu về mặc định 123456a@"
                            >
                              <KeyRound className="w-2.5 h-2.5 text-slate-500" /> Reset MK
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">{staff.specialty}</span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-amber-600 font-mono text-xs inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        {(staff.hourlyRate || 0).toLocaleString()} đ / h
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {assignedClasses.length > 0 ? (
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1">
                            {assignedClasses.map((cls) => (
                              <span
                                key={cls.id}
                                className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {cls.code}
                              </span>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTransferInitialStaffId(staff.id);
                              setIsTransferModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer hover:underline"
                            title={`Bàn giao ${assignedClasses.length} lớp của ${staff.fullName} cho nhân sự khác`}
                          >
                            <ArrowRightLeft className="w-2.5 h-2.5" /> Bàn giao lớp
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Chưa xếp lớp</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(staff)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 rounded-lg transition flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Sửa
                        </button>

                        {deleteConfirmId === staff.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                deleteStaff(staff.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-semibold"
                            >
                              Xóa
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px]"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(staff.id)}
                            title="Xóa nhân sự"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredStaff.length > pageSize && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 font-medium">
              Hiển thị <span className="font-bold text-slate-800">{(safeCurrentPage - 1) * pageSize + 1} - {Math.min(safeCurrentPage * pageSize, filteredStaff.length)}</span> trên tổng số <span className="font-bold text-slate-900">{filteredStaff.length}</span> nhân sự
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
              >
                &laquo; Đầu
              </button>
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
              >
                &lsaquo; Trước
              </button>
              <span className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg shadow-2xs">
                {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
              >
                Sau &rsaquo;
              </button>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
              >
                Cuối &raquo;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Thêm / Chỉnh Sửa Nhân Sự */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingStaffId ? "Chỉnh Sửa Thông Tin Nhân Sự" : "Thêm Giáo Viên / Trợ Giảng Mới"}
                </h3>
                <p className="text-xs text-slate-500">Cập nhật thông tin tài khoản và vai trò nhân sự</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Vai trò nhân sự *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "TEACHER" })}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition ${
                      formData.role === "TEACHER"
                        ? "border-amber-500 bg-amber-50 text-amber-900 font-bold"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    👩‍🏫 Giáo viên
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "ASSISTANT" })}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition ${
                      formData.role === "ASSISTANT"
                        ? "border-blue-500 bg-blue-50 text-blue-900 font-bold"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    🧑‍💻 Trợ giảng (TA)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cô Quỳnh Nga"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email đăng nhập *</label>
                <input
                  type="email"
                  required
                  placeholder="VD: quynhnga@center.edu.vn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="VD: 0988 123 456"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Mức lương theo giờ (VNĐ / giờ) *
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    required
                    min={0}
                    step={5000}
                    placeholder="VD: 250000"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono font-bold text-slate-800"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mức thù lao phục vụ tự động tính bảng chấm công và bảng lương theo giờ dạy/trực.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Chuyên môn / Ghi chú</label>
                <input
                  type="text"
                  placeholder="VD: IELTS 8.0, chuyên gia phát âm, TESOL"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold shadow hover:opacity-95 transition"
                >
                  {editingStaffId ? "Lưu Thay Đổi" : "Tạo Nhân Sự"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Bàn Giao Lớp Giữa Các Nhân Sự */}
      <StaffClassTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        initialFromStaffId={transferInitialStaffId}
        onSuccess={(msg) => {
          setActionFeedback(msg);
          setTimeout(() => setActionFeedback(null), 4000);
        }}
      />
    </div>
  );
}
