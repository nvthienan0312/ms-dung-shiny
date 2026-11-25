"use client";

import { useState } from "react";
import { useCenter } from "@/context/CenterContext";
import { CourseItem } from "@/data/centerData";
import { Plus, X, Trash2, Coins, Edit3, Search, BookOpen, AlertCircle } from "lucide-react";

export default function CoursesManager() {
  const { courses, classes, addCourse, updateCourse, deleteCourse } = useCenter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    level: "KIDS" as CourseItem["level"],
    standardFeePerLesson: 200000,
    description: "",
  });

  const filteredCourses = courses.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingCourseId(null);
    setFormData({
      name: "",
      level: "KIDS",
      standardFeePerLesson: 200000,
      description: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (course: CourseItem) => {
    setEditingCourseId(course.id);
    const feePerLesson =
      course.standardFeePerLesson ||
      (course.monthlyFee ? Math.round(course.monthlyFee / 8) : 200000);
    setFormData({
      name: course.name,
      level: course.level,
      standardFeePerLesson: feePerLesson,
      description: course.description,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const feePerLesson = Math.max(0, Number(formData.standardFeePerLesson) || 200000);

    if (editingCourseId) {
      updateCourse(editingCourseId, {
        name: formData.name,
        level: formData.level,
        standardFeePerLesson: feePerLesson,
        monthlyFee: feePerLesson * 8,
        description: formData.description,
      });
    } else {
      addCourse({
        name: formData.name,
        level: formData.level,
        standardFeePerLesson: feePerLesson,
        monthlyFee: feePerLesson * 8,
        description: formData.description || "Khóa học chất lượng cao tại Ms. Dung Shiny",
      });
    }

    setIsModalOpen(false);
  };

  const handleDeleteCourse = (id: string) => {
    const res = deleteCourse(id);
    if (!res.success) {
      setErrorMessage(res.message || "Không thể xóa khóa học này");
    } else {
      setErrorMessage(null);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Alert banner if error occurs */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên chương trình, mã khóa học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-500/10 transition"
        >
          <Plus className="w-4 h-4" /> Thêm Khóa Học Mới
        </button>
      </div>

      {/* Courses Table View (Dạng Bảng Chuyên Nghiệp) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar mobile-tabs">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Tên Chương Trình</th>
                <th className="py-3.5 px-4">Cấp Độ Đào Tạo</th>
                <th className="py-3.5 px-4">Học Phí / Buổi (VNĐ)</th>
                <th className="py-3.5 px-4">Lớp Học Áp Dụng</th>
                <th className="py-3.5 px-4">Mục Tiêu / Mô Tả</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCourses.map((course) => {
                const classesInCourse = classes.filter((c) => c.courseId === course.id);
                const feePerLesson =
                  course.standardFeePerLesson ||
                  (course.monthlyFee ? Math.round(course.monthlyFee / 8) : 200000);
                return (
                  <tr key={course.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{course.name}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {course.level}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-amber-600 text-xs flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5" />
                        {feePerLesson.toLocaleString("vi-VN")} đ / buổi
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {classesInCourse.length > 0 ? (
                        <span className="font-semibold text-slate-800 bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                          {classesInCourse.length} lớp đang học
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa mở lớp</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {course.description}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(course)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 rounded-lg transition flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Sửa
                        </button>

                        {classesInCourse.length > 0 ? (
                          <span
                            title={`Đang có ${classesInCourse.length} lớp học áp dụng. Không thể xóa khóa học này.`}
                            className="p-1 text-slate-300 cursor-not-allowed inline-flex"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </span>
                        ) : deleteConfirmId === course.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
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
                            onClick={() => setDeleteConfirmId(course.id)}
                            title="Xóa khóa học"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm / Chỉnh Sửa Khóa Học */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingCourseId ? "Chỉnh Sửa Chương Trình Đào Tạo" : "Thêm Chương Trình Đào Tạo Mới"}
                </h3>
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
                <label className="font-semibold text-slate-700 block mb-1">Tên chương trình đào tạo *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Tiếng Anh Mầm Non Shiny Kids"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cấp độ</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                  >
                    <option value="KIDS">KIDS (Mầm non)</option>
                    <option value="PRIMARY">PRIMARY (Tiểu học)</option>
                    <option value="SECONDARY">SECONDARY (THCS)</option>
                    <option value="IELTS">IELTS</option>
                    <option value="COMMUNICATION">COMMUNICATION</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Học phí / buổi (VNĐ / Buổi) *</label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    required
                    value={formData.standardFeePerLesson}
                    onChange={(e) => setFormData({ ...formData, standardFeePerLesson: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mô tả chương trình</label>
                <textarea
                  rows={2}
                  placeholder="Mục tiêu đầu ra, phương pháp giảng dạy..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  {editingCourseId ? "Lưu Thay Đổi" : "Lưu Khóa Học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
