"use client";

import { useState } from "react";
import { useCenter } from "@/context/CenterContext";
import { ClassroomItem } from "@/data/centerData";
import { Plus, Search, Edit3, Trash2, X, AlertCircle, CheckCircle2, DoorOpen, Monitor, Users } from "lucide-react";

export default function ClassroomsManager() {
  const { classrooms, classes, addClassroom, updateClassroom, deleteClassroom } = useCenter();

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    capacity: 15,
    equipment: "Điều hòa, Smart TV, Bảng từ",
    notes: "",
  });

  const filteredRooms = classrooms.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.equipment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      name: "",
      capacity: 15,
      equipment: "Điều hòa, Smart TV, Bảng từ",
      notes: "",
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: ClassroomItem) => {
    setEditingId(room.id);
    setFormData({
      name: room.name,
      capacity: room.capacity,
      equipment: room.equipment,
      notes: room.notes || "",
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingId) {
      updateClassroom(editingId, {
        name: formData.name,
        capacity: Number(formData.capacity),
        equipment: formData.equipment,
        notes: formData.notes,
      });
    } else {
      addClassroom({
        name: formData.name,
        capacity: Number(formData.capacity),
        equipment: formData.equipment,
        notes: formData.notes,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const res = deleteClassroom(id);
    if (!res.success) {
      setErrorMessage(res.message || "Không thể xóa phòng học này");
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
            placeholder="Tìm theo tên phòng, trang thiết bị..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-500/10 transition"
        >
          <Plus className="w-4 h-4" /> Thêm Phòng Học Mới
        </button>
      </div>

      {/* Classrooms Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Tên Phòng Học</th>
                <th className="py-3.5 px-4">Sức Chứa</th>
                <th className="py-3.5 px-4">Trang Thiết Bị</th>
                <th className="py-3.5 px-4">Lớp Học Đang Sử Dụng</th>
                <th className="py-3.5 px-4">Ghi Chú</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRooms.map((room) => {
                const classesInRoom = classes.filter(
                  (c) => c.classroom === room.name || c.schedules.some((s) => s.classroom === room.name)
                );
                return (
                  <tr key={room.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <DoorOpen className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{room.name}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {room.capacity} Học sinh
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{room.equipment}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {classesInRoom.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {classesInRoom.map((cls) => (
                            <span
                              key={cls.id}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200"
                            >
                              {cls.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Đang trống lịch
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 italic">
                      {room.notes || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(room)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 rounded-lg transition flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Sửa
                        </button>

                        {classesInRoom.length > 0 ? (
                          <span
                            title={`Đang có ${classesInRoom.length} lớp học diễn ra tại phòng này. Không thể xóa.`}
                            className="p-1 text-slate-300 cursor-not-allowed inline-flex"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </span>
                        ) : deleteConfirmId === room.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(room.id)}
                              className="px-2 py-0.5 bg-red-600 text-white rounded text-[11px] font-semibold"
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
                            onClick={() => setDeleteConfirmId(room.id)}
                            title="Xóa phòng học"
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

      {/* Modal Thêm / Sửa Phòng Học */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingId ? "Chỉnh Sửa Phòng Học" : "Thêm Phòng Học Mới"}
                </h3>
                <p className="text-xs text-slate-500">Cấu hình sức chứa và trang thiết bị phòng học</p>
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
                <label className="font-semibold text-slate-700 block mb-1">Tên phòng học *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Phòng Shiny 203"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Sức chứa tối đa (Học sinh) *</label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  required
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Trang thiết bị</label>
                <input
                  type="text"
                  placeholder="VD: Điều hòa, Smart TV, Bảng từ..."
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ghi chú thêm</label>
                <textarea
                  rows={2}
                  placeholder="VD: Dành cho lớp mầm non, có camera trực tuyến..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  {editingId ? "Lưu Thay Đổi" : "Tạo Phòng Học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
