"use client";

import React, { useState, useMemo } from "react";
import { useCenter } from "@/context/CenterContext";
import { StudentTuitionBill, TuitionBillStatus } from "@/data/centerData";
import { 
  calculateMonthLessons, 
  formatVND, 
  getStudentDebtSummary, 
  generateTuitionReminderMessage,
  StudentDebtSummary 
} from "@/utils/tuitionHelper";
import {
  CreditCard,
  DollarSign,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Bell,
  Edit3,
  Printer,
  ChevronRight,
  Calendar,
  User,
  Users,
  ShieldCheck,
  Sparkles,
  ArrowUpDown,
  BookOpen,
  Receipt,
  FileCheck,
  HelpCircle,
  X,
  Check,
  QrCode,
  Layers,
  MessageSquare,
  AlertOctagon,
  FileSpreadsheet,
  PlusCircle,
  MinusCircle,
  RotateCcw
} from "lucide-react";
import ZaloBatchQueueModal, { ZaloQueueItem } from "@/components/common/ZaloBatchQueueModal";
import EditZaloMessageModal from "@/components/common/EditZaloMessageModal";
import { generateTuitionReminderZaloMessage, generateTuitionZaloMessage } from "@/utils/zaloHelper";
import { getCurrentBillingMonth } from "@/utils/dateHelper";

export default function TuitionManager() {
  const {
    classes,
    students,
    studentTuitionBills,
    calculateClassTuitionBills,
    updateStudentTuitionBill,
    sendTuitionBill,
    sendClassTuitionBills,
    markTuitionBillPaid,
    markTuitionBillUnpaid,
    sendTuitionReminder,
    sendTuitionReminderToUnpaid,
    markMultiMonthTuitionPaid,
    autoTriggerMonthlyTuition,
    renderZaloTemplate,
  } = useCenter();

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentBillingMonth());
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TuitionBillStatus | "MULTI_MONTH_DEBT">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Modal Sửa Học Phí (Tách riêng Phụ thu + và Giảm trừ -)
  const [editingBill, setEditingBill] = useState<StudentTuitionBill | null>(null);
  const [editLessons, setEditLessons] = useState<number>(8);
  const [editFeePerLesson, setEditFeePerLesson] = useState<number>(200000);
  const [editSurcharge, setEditSurcharge] = useState<number>(0);
  const [editSurchargeNote, setEditSurchargeNote] = useState<string>("");
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editDiscountNote, setEditDiscountNote] = useState<string>("");
  const [editStatus, setEditStatus] = useState<TuitionBillStatus>("SENT");
  const [revertBillConfirm, setRevertBillConfirm] = useState<StudentTuitionBill | null>(null);

  // Modal Thu Tiền (Cash / VietQR - Hỗ trợ thu đơn hoặc thu gộp nhiều tháng)
  const [collectingBill, setCollectingBill] = useState<StudentTuitionBill | null>(null);
  const [collectionMethod, setCollectionMethod] = useState<"VIETQR" | "CASH" | "BANK_TRANSFER">("VIETQR");
  const [collectionTrxCode, setCollectionTrxCode] = useState<string>("");
  const [collectionNote, setCollectionNote] = useState<string>("");
  const [collectMode, setCollectMode] = useState<"SINGLE" | "ALL_DEBT">("SINGLE");

  // Modal Xem & In Phiếu Thu (Đơn tháng hoặc Gộp nhiều tháng)
  const [receiptBill, setReceiptBill] = useState<StudentTuitionBill | null>(null);
  const [receiptMultiMonthBills, setReceiptMultiMonthBills] = useState<StudentTuitionBill[] | null>(null);

  // Modal Xem Chi Tiết Lịch Học Của Tháng
  const [viewingScheduleClassId, setViewingScheduleClassId] = useState<string | null>(null);

  // Modal Gửi Nhắc Nhở Hàng Loạt Cho Phụ Huynh Chưa Đóng
  const [isBulkReminderOpen, setIsBulkReminderOpen] = useState<boolean>(false);
  const [selectedBulkBillIds, setSelectedBulkBillIds] = useState<string[]>([]);
  const [reminderTemplate, setReminderTemplate] = useState<"MONTH_START" | "DUE_APPROACHING" | "OVERDUE_SINGLE" | "MULTI_MONTH_DEBT">("MONTH_START");
  const [reminderChannel, setReminderChannel] = useState<"ALL" | "APP_PORTAL" | "SMS">("APP_PORTAL");
  const [isZaloQueueOpen, setIsZaloQueueOpen] = useState<boolean>(false);
  const [zaloQueueItems, setZaloQueueItems] = useState<ZaloQueueItem[]>([]);
  const [zaloQueueTitle, setZaloQueueTitle] = useState<string>("Hàng Đợi Gửi Nhắc Nhở Học Phí Zalo");

  // Modal Chỉnh Sửa Tin Nhắn Zalo Trước Khi Gửi (Đơn lẻ: Hóa đơn hoặc Nhắc nhở)
  const [editZaloModal, setEditZaloModal] = useState<{
    isOpen: boolean;
    bill: StudentTuitionBill;
    type: "BILL" | "REMINDER";
    initialContent: string;
  } | null>(null);

  // Modal Xem Chi Tiết Công Nợ Nhiều Tháng
  const [inspectingStudentDebt, setInspectingStudentDebt] = useState<{
    studentId: string;
    studentName: string;
    parentName: string;
    parentPhone: string;
    className: string;
    debtSummary: StudentDebtSummary;
  } | null>(null);

  // Lọc danh sách hóa đơn học phí theo tháng
  const monthBills = useMemo(() => {
    return studentTuitionBills.filter((b) => b.billingMonth === selectedMonth);
  }, [studentTuitionBills, selectedMonth]);

  // Danh sách các hóa đơn chưa đóng trong kỳ tháng hiện tại
  const unpaidBillsInMonth = useMemo(() => {
    return monthBills.filter((b) => {
      if (selectedClassId !== "ALL" && b.classId !== selectedClassId) return false;
      return b.status === "SENT" || b.status === "OVERDUE" || b.status === "DRAFT";
    });
  }, [monthBills, selectedClassId]);

  // Lọc theo lớp, trạng thái và tìm kiếm
  const filteredBills = useMemo(() => {
    return monthBills.filter((b) => {
      if (selectedClassId !== "ALL" && b.classId !== selectedClassId) return false;
      
      if (statusFilter === "MULTI_MONTH_DEBT") {
        const debt = getStudentDebtSummary(b.studentId, studentTuitionBills);
        if (!debt.isMultiMonthDebt) return false;
      } else if (statusFilter !== "ALL" && b.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const currentStu = students.find((s) => s.id === b.studentId);
        const effectivePhone = (currentStu?.parentPhone || b.parentPhone).toLowerCase();
        const effectiveParent = (currentStu?.parentName || b.parentName).toLowerCase();
        const effectiveName = (currentStu?.fullName || b.studentName).toLowerCase();
        const matchName = effectiveName.includes(query);
        const matchCode = b.studentCode.toLowerCase().includes(query);
        const matchPhone = effectivePhone.includes(query);
        const matchParent = effectiveParent.includes(query);
        if (!matchName && !matchCode && !matchPhone && !matchParent) return false;
      }
      return true;
    });
  }, [monthBills, selectedClassId, statusFilter, searchQuery, studentTuitionBills, students]);

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedBills = useMemo(() => {
    return filteredBills.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  }, [filteredBills, safeCurrentPage, pageSize]);

  // Thống kê tổng quan cho Kỳ học phí đã chọn
  const summary = useMemo(() => {
    const targetBills = selectedClassId === "ALL" 
      ? monthBills 
      : monthBills.filter((b) => b.classId === selectedClassId);

    const totalStudentsCount = targetBills.length;
    const paidBills = targetBills.filter((b) => b.status === "PAID");
    const unpaidBills = targetBills.filter((b) => b.status === "SENT" || b.status === "OVERDUE");
    const draftBills = targetBills.filter((b) => b.status === "DRAFT");
    const overdueBills = targetBills.filter((b) => b.status === "OVERDUE");

    const totalCalculated = targetBills.reduce((acc, b) => acc + b.finalAmount, 0);
    const totalPaid = paidBills.reduce((acc, b) => acc + b.finalAmount, 0);
    const totalRemaining = unpaidBills.reduce((acc, b) => acc + b.finalAmount, 0);

    const completionRate = totalStudentsCount > 0 
      ? Math.round((paidBills.length / totalStudentsCount) * 100) 
      : 0;

    // Tính số học viên nợ từ 2 tháng trở lên (trên toàn trung tâm hoặc lớp)
    const targetStudents = selectedClassId === "ALL" 
      ? students 
      : students.filter((s) => s.classId === selectedClassId);

    const multiMonthDebtList = targetStudents
      .map((s) => ({
        student: s,
        debtSummary: getStudentDebtSummary(s.id, studentTuitionBills),
      }))
      .filter((item) => item.debtSummary.isMultiMonthDebt);

    const totalMultiMonthDebtAmount = multiMonthDebtList.reduce(
      (sum, item) => sum + item.debtSummary.totalDebtAmount, 
      0
    );

    return {
      totalStudentsCount,
      paidCount: paidBills.length,
      unpaidCount: unpaidBills.length,
      draftCount: draftBills.length,
      overdueCount: overdueBills.length,
      totalCalculated,
      totalPaid,
      totalRemaining,
      completionRate,
      multiMonthDebtCount: multiMonthDebtList.length,
      totalMultiMonthDebtAmount,
      multiMonthDebtList,
    };
  }, [monthBills, selectedClassId, students, studentTuitionBills]);

  // Mở modal sửa học phí (tách riêng Phụ thu + và Giảm trừ -)
  const handleOpenEdit = (bill: StudentTuitionBill) => {
    setEditingBill(bill);
    setEditLessons(bill.lessonCount);
    setEditFeePerLesson(bill.feePerLesson);
    const sur = bill.surcharge !== undefined ? bill.surcharge : (bill.adjustmentAmount > 0 ? bill.adjustmentAmount : 0);
    const disc = bill.discount !== undefined ? bill.discount : (bill.adjustmentAmount < 0 ? Math.abs(bill.adjustmentAmount) : 0);
    setEditSurcharge(sur);
    setEditSurchargeNote(bill.surchargeNote || (bill.adjustmentAmount > 0 ? (bill.notes || "") : ""));
    setEditDiscount(disc);
    setEditDiscountNote(bill.discountNote || (bill.adjustmentAmount < 0 ? (bill.notes || "") : ""));
    setEditStatus(bill.status);
  };

  // Lưu chỉnh sửa học phí (công thức: Học phí = Số buổi × Đơn giá + Phụ thu - Giảm trừ)
  const handleSaveEdit = () => {
    if (!editingBill) return;
    const safeSurcharge = Math.max(0, editSurcharge || 0);
    const safeDiscount = Math.max(0, editDiscount || 0);
    const calculatedAmount = editLessons * editFeePerLesson;
    const adjustmentAmount = safeSurcharge - safeDiscount;
    const finalAmount = calculatedAmount + safeSurcharge - safeDiscount;

    // Xử lý đổi trạng thái đóng tiền nếu Admin có thay đổi
    if (editStatus !== editingBill.status) {
      if (editStatus === "PAID") {
        markTuitionBillPaid(editingBill.id, "VIETQR", undefined, "Admin cập nhật Đã Nộp trong hộp thoại chỉnh sửa");
      } else if (editingBill.status === "PAID") {
        markTuitionBillUnpaid(editingBill.id, editStatus, "Admin chuyển lại Chưa Nộp trong hộp thoại chỉnh sửa");
      }
    }

    updateStudentTuitionBill(editingBill.id, {
      lessonCount: editLessons,
      feePerLesson: editFeePerLesson,
      calculatedAmount,
      surcharge: safeSurcharge,
      surchargeNote: editSurchargeNote.trim(),
      discount: safeDiscount,
      discountNote: editDiscountNote.trim(),
      adjustmentAmount,
      finalAmount,
      status: editStatus,
      notes: [
        safeSurcharge > 0 ? `Phụ thu: ${editSurchargeNote || "Phụ phí"}` : "",
        safeDiscount > 0 ? `Giảm trừ: ${editDiscountNote || "Học bổng/Ưu đãi"}` : "",
      ].filter(Boolean).join(" | "),
    });

    showToast(`✓ Đã cập nhật học phí của học viên ${editingBill.studentName}!`);
    setEditingBill(null);
  };

  // Khôi phục tự động tính theo lịch của lớp
  const handleRecalculateSingle = () => {
    if (!editingBill) return;
    const targetClass = classes.find((c) => c.id === editingBill.classId);
    if (!targetClass) return;

    const { lessonCount } = calculateMonthLessons(selectedMonth, targetClass.schedules);
    const actualLessons = lessonCount > 0 ? lessonCount : 8;
    const fee = targetClass.feePerLesson || 200000;

    setEditLessons(actualLessons);
    setEditFeePerLesson(fee);
    setEditSurcharge(0);
    setEditSurchargeNote("");
    setEditDiscount(0);
    setEditDiscountNote("");
    showToast(`🔄 Đã khôi phục số buổi theo lịch chuẩn (${actualLessons} buổi × ${formatVND(fee)})!`);
  };

  // Mở modal thu tiền
  const handleOpenCollect = (bill: StudentTuitionBill) => {
    setCollectingBill(bill);
    setCollectionMethod("VIETQR");
    setCollectionTrxCode(`VQR-${Date.now().toString().slice(-6)}`);
    setCollectionNote(`Đóng học phí ${bill.billingMonth} qua chuyển khoản`);
    
    // Kiểm tra xem bé có nợ nhiều tháng không
    const debt = getStudentDebtSummary(bill.studentId, studentTuitionBills);
    if (debt.isMultiMonthDebt) {
      setCollectMode("ALL_DEBT"); // Mặc định gợi ý thu gộp
    } else {
      setCollectMode("SINGLE");
    }
  };

  // Xác nhận thu tiền (hỗ trợ thu đơn hoặc thu gộp)
  const handleConfirmCollect = () => {
    if (!collectingBill) return;

    const debt = getStudentDebtSummary(collectingBill.studentId, studentTuitionBills);

    if (collectMode === "ALL_DEBT" && debt.isMultiMonthDebt) {
      const allBillIds = debt.unpaidBills.map((b) => b.id);
      markMultiMonthTuitionPaid(
        collectingBill.studentId,
        allBillIds,
        collectionMethod,
        collectionTrxCode,
        collectionNote || `Đóng gộp ${debt.debtMonthsCount} kỳ học phí (${debt.monthsList.join(", ")})`
      );
      showToast(`✓ Đã xác nhận thu GỘP ${formatVND(debt.totalDebtAmount)} (${debt.debtMonthsCount} tháng) của bé ${collectingBill.studentName}!`);
    } else {
      markTuitionBillPaid(
        collectingBill.id,
        collectionMethod,
        collectionTrxCode,
        collectionNote
      );
      showToast(`✓ Đã xác nhận thu học phí ${formatVND(collectingBill.finalAmount)} của bé ${collectingBill.studentName}!`);
    }

    setCollectingBill(null);
  };

  // Mở modal cho phép Admin xem & chỉnh sửa tin nhắn Zalo trước khi gửi hóa đơn
  const handleOpenZaloBillModal = (bill: StudentTuitionBill) => {
    let content: string;
    try {
      const studentObj = students.find((s) => s.id === bill.studentId);
      const effectiveStudent = studentObj?.fullName || bill.studentName || "Học sinh";
      const effectiveParent = studentObj?.parentName || bill.parentName || "Phụ huynh";
      const feePerLessonStr = `${(bill.feePerLesson || 200000).toLocaleString("vi-VN")}đ`;
      const finalAmountStr = `${(bill.finalAmount || 0).toLocaleString("vi-VN")}đ`;
      const baseFeeStr = `${((bill.lessonCount || 8) * (bill.feePerLesson || 200000)).toLocaleString("vi-VN")}đ`;

      content = renderZaloTemplate("tuitionFirstOfMonth", {
        month: bill.billingMonth,
        billingMonth: bill.billingMonth,
        studentName: effectiveStudent,
        studentNameUpper: effectiveStudent.toUpperCase(),
        parentName: effectiveParent,
        className: bill.className,
        classNameUpper: bill.className.toUpperCase(),
        totalSessions: String(bill.lessonCount || 8),
        lessonCount: String(bill.lessonCount || 8),
        feePerLesson: feePerLessonStr,
        baseFee: baseFeeStr,
        finalAmount: finalAmountStr,
        amount: finalAmountStr,
        dueDate: bill.dueDate || "10",
        transferContent: `HP ${effectiveStudent.toUpperCase()} ${bill.className.toUpperCase()} ${bill.billingMonth.replace(/[^0-9]/g, "")}`,
        hotline: "0964.645.174",
        bankInfo: "MB Bank | STK: 0964645174 | NGUYEN THI DUNG",
      });
    } catch {
      content = generateTuitionZaloMessage(bill, bill.studentName, bill.parentName, bill.className);
    }
    setEditZaloModal({
      isOpen: true,
      bill,
      type: "BILL",
      initialContent: content,
    });
  };

  // Mở modal cho phép Admin xem & chỉnh sửa tin nhắn Zalo trước khi gửi nhắc nhở
  const handleOpenZaloReminderModal = (bill: StudentTuitionBill) => {
    const debt = getStudentDebtSummary(bill.studentId, studentTuitionBills);
    let content: string;
    try {
      const studentObj = students.find((s) => s.id === bill.studentId);
      const effectiveStudent = studentObj?.fullName || bill.studentName || "Học sinh";
      const effectiveParent = studentObj?.parentName || bill.parentName || "Phụ huynh";
      const finalAmountStr = `${(bill.finalAmount || 0).toLocaleString("vi-VN")}đ`;
      const totalDebtStr = `${(debt.totalDebtAmount || bill.finalAmount || 0).toLocaleString("vi-VN")}đ`;
      const tplKey = debt.isMultiMonthDebt ? "tuitionMultiMonth" : (bill.status === "OVERDUE" ? "tuitionOverdue" : "tuitionDueDate");

      content = renderZaloTemplate(tplKey as any, {
        month: bill.billingMonth,
        billingMonth: bill.billingMonth,
        studentName: effectiveStudent,
        studentNameUpper: effectiveStudent.toUpperCase(),
        parentName: effectiveParent,
        className: bill.className,
        classNameUpper: bill.className.toUpperCase(),
        finalAmount: finalAmountStr,
        amount: finalAmountStr,
        dueDate: bill.dueDate || "10",
        transferContent: debt.isMultiMonthDebt
          ? `NOP NO HP ${effectiveStudent.toUpperCase()} ${bill.className.toUpperCase()}`
          : `HP ${effectiveStudent.toUpperCase()} ${bill.className.toUpperCase()} ${bill.billingMonth.replace(/[^0-9]/g, "")}`,
        hotline: "0964.645.174",
        bankInfo: "MB Bank | STK: 0964645174 | NGUYEN THI DUNG",
        totalDebt: totalDebtStr,
        totalDebtAmount: totalDebtStr,
        debtCount: String(debt.debtMonthsCount || 1),
        debtMonths: debt.monthsList?.join(", ") || bill.billingMonth,
        unpaidMonths: debt.monthsList?.join(", ") || bill.billingMonth,
      });
    } catch {
      content = generateTuitionReminderZaloMessage(
        bill,
        bill.studentName,
        bill.parentName,
        bill.className,
        debt.isMultiMonthDebt ? "MULTI_MONTH" : (bill.status === "OVERDUE" ? "OVERDUE" : "DUE_DATE"),
        debt.totalDebtAmount,
        debt.monthsList
      );
    }
    setEditZaloModal({
      isOpen: true,
      bill,
      type: "REMINDER",
      initialContent: content,
    });
  };

  // Xác nhận gửi tin nhắn Zalo đã qua chỉnh sửa câu từ (Tự động gửi, không cần Ctrl+V)
  const handleConfirmSendEditedZalo = (editedContent: string) => {
    if (!editZaloModal) return;
    if (editZaloModal.type === "BILL") {
      sendTuitionBill(editZaloModal.bill.id, false, editedContent);
      showToast(`⚡ Đã tự động gửi hóa đơn học phí tới PH bé ${editZaloModal.bill.studentName} qua Zalo!`);
    } else {
      sendTuitionReminder(editZaloModal.bill.id, false, editedContent);
      showToast(`⚡ Đã tự động gửi tin nhắc nhở học phí tới PH bé ${editZaloModal.bill.studentName} qua Zalo!`);
    }
    setEditZaloModal(null);
  };

  // Gửi thông báo học phí cho 1 học sinh (Mở modal chỉnh sửa)
  const handleSendSingle = (bill: StudentTuitionBill) => {
    handleOpenZaloBillModal(bill);
  };

  // Gửi thông báo học phí toàn bộ lớp (Kích hoạt Hàng đợi tự động gửi giãn cách 2-3 phút chống spam)
  const handleSendEntireClass = () => {
    const draftBills = studentTuitionBills.filter((b) =>
      (selectedClassId === "ALL" || b.classId === selectedClassId) &&
      b.billingMonth === selectedMonth &&
      b.status === "DRAFT"
    );

    if (draftBills.length === 0) {
      showToast(`ℹ️ Không có học sinh nào ở trạng thái Chờ Gửi trong kỳ ${selectedMonth}.`);
      return;
    }

    const targetClassName = selectedClassId === "ALL" 
      ? "Toàn Trung Tâm" 
      : (classes.find((c) => c.id === selectedClassId)?.name || "Lớp Học");

    const items: ZaloQueueItem[] = draftBills.map((b) => {
      const studentObj = students.find((s) => s.id === b.studentId);
      const isFriended = studentObj?.zaloFriendshipStatus !== "NOT_FRIENDED";
      const effectivePhone = studentObj?.parentPhone || b.parentPhone;
      const effectiveParent = studentObj?.parentName || b.parentName || "Phụ huynh";
      const effectiveStudent = studentObj?.fullName || b.studentName || "Học sinh";
      const finalAmountStr = `${(b.finalAmount || 0).toLocaleString("vi-VN")}đ`;
      const feePerLessonStr = `${(b.feePerLesson || 200000).toLocaleString("vi-VN")}đ`;

      let message: string;
      try {
        message = renderZaloTemplate("tuitionFirstOfMonth", {
          month: b.billingMonth,
          billingMonth: b.billingMonth,
          studentName: effectiveStudent,
          studentNameUpper: effectiveStudent.toUpperCase(),
          parentName: effectiveParent,
          className: b.className,
          classNameUpper: b.className.toUpperCase(),
          totalSessions: String(b.lessonCount || 8),
          lessonCount: String(b.lessonCount || 8),
          feePerLesson: feePerLessonStr,
          baseFee: `${((b.lessonCount || 8) * (b.feePerLesson || 200000)).toLocaleString("vi-VN")}đ`,
          finalAmount: finalAmountStr,
          amount: finalAmountStr,
          dueDate: b.dueDate || "10",
          transferContent: `HP ${effectiveStudent.toUpperCase()} ${b.className.toUpperCase()} ${b.billingMonth.replace(/[^0-9]/g, "")}`,
          hotline: "0964.645.174",
          bankInfo: "MB Bank | STK: 0964645174 | NGUYEN THI DUNG",
        });
      } catch {
        message = generateTuitionZaloMessage(b, effectiveStudent, effectiveParent, b.className);
      }

      return {
        id: b.id,
        studentId: b.studentId,
        studentName: effectiveStudent,
        parentName: effectiveParent,
        parentPhone: effectivePhone,
        className: b.className,
        messageType: "TUITION",
        title: `Thông Báo Học Phí ${b.billingMonth}: ${effectiveStudent}`,
        content: message,
        isFriended,
        status: "PENDING",
      };
    });

    setZaloQueueTitle(`Hàng Đợi Tự Động Gửi Học Phí (${targetClassName} - Giãn Cách 2-3 Phút)`);
    setZaloQueueItems(items);
    setIsZaloQueueOpen(true);
  };

  // Mở modal gửi nhắc nhở hàng loạt cho phụ huynh chưa đóng
  const handleOpenBulkReminder = () => {
    const unpaidIds = unpaidBillsInMonth.map((b) => b.id);
    setSelectedBulkBillIds(unpaidIds);
    setIsBulkReminderOpen(true);
  };

  // Thực hiện gửi nhắc nhở hàng loạt
  const handleConfirmBulkReminder = () => {
    if (selectedBulkBillIds.length === 0) {
      showToast("⚠️ Vui lòng chọn ít nhất 1 phụ huynh để gửi nhắc nhở!");
      return;
    }

    sendTuitionReminderToUnpaid(selectedBulkBillIds);
    showToast(`🚀 Đã gửi nhắc nhở học phí thành công tới ${selectedBulkBillIds.length} phụ huynh qua Cổng Phụ Huynh!`);
    setIsBulkReminderOpen(false);
  };

  // Kích hoạt Trình Hàng Đợi Gửi Chậm Zalo (Giãn cách an toàn 2-3 phút)
  const handleStartZaloQueue = () => {
    if (selectedBulkBillIds.length === 0) {
      showToast("⚠️ Vui lòng chọn ít nhất 1 phụ huynh để chạy hàng đợi gửi Zalo!");
      return;
    }

    const targetBills = studentTuitionBills.filter((b) => selectedBulkBillIds.includes(b.id));
    const items: ZaloQueueItem[] = targetBills.map((b) => {
      const studentObj = students.find((s) => s.id === b.studentId);
      const isFriended = studentObj?.zaloFriendshipStatus !== "NOT_FRIENDED";
      const effectivePhone = studentObj?.parentPhone || b.parentPhone;
      const effectiveParent = studentObj?.parentName || b.parentName || "Phụ huynh";
      const effectiveStudent = studentObj?.fullName || b.studentName || "Học sinh";
      const debt = getStudentDebtSummary(b.studentId, studentTuitionBills);
      const finalAmountStr = `${(b.finalAmount || 0).toLocaleString("vi-VN")}đ`;
      const totalDebtStr = `${(debt.totalDebtAmount || b.finalAmount || 0).toLocaleString("vi-VN")}đ`;
      const tplKey = debt.isMultiMonthDebt ? "tuitionMultiMonth" : (b.status === "OVERDUE" ? "tuitionOverdue" : "tuitionDueDate");

      let message: string;
      try {
        message = renderZaloTemplate(tplKey as any, {
          month: b.billingMonth,
          billingMonth: b.billingMonth,
          studentName: effectiveStudent,
          studentNameUpper: effectiveStudent.toUpperCase(),
          parentName: effectiveParent,
          className: b.className,
          classNameUpper: b.className.toUpperCase(),
          finalAmount: finalAmountStr,
          amount: finalAmountStr,
          dueDate: b.dueDate || "10",
          transferContent: debt.isMultiMonthDebt
            ? `NOP NO HP ${effectiveStudent.toUpperCase()} ${b.className.toUpperCase()}`
            : `HP ${effectiveStudent.toUpperCase()} ${b.className.toUpperCase()} ${b.billingMonth.replace(/[^0-9]/g, "")}`,
          hotline: "0964.645.174",
          bankInfo: "MB Bank | STK: 0964645174 | NGUYEN THI DUNG",
          totalDebt: totalDebtStr,
          totalDebtAmount: totalDebtStr,
          debtCount: String(debt.debtMonthsCount || 1),
          debtMonths: debt.monthsList?.join(", ") || b.billingMonth,
          unpaidMonths: debt.monthsList?.join(", ") || b.billingMonth,
        });
      } catch {
        message = generateTuitionReminderZaloMessage(
          b,
          effectiveStudent,
          effectiveParent,
          b.className,
          debt.isMultiMonthDebt ? "MULTI_MONTH" : (b.status === "OVERDUE" ? "OVERDUE" : "DUE_DATE"),
          debt.totalDebtAmount,
          debt.monthsList
        );
      }

      return {
        id: b.id,
        studentId: b.studentId,
        studentName: effectiveStudent,
        parentName: effectiveParent,
        parentPhone: effectivePhone,
        className: b.className,
        messageType: "TUITION_REMINDER",
        title: `Nhắc Học Phí ${b.billingMonth}: ${effectiveStudent}`,
        content: message,
        isFriended,
        status: "PENDING",
      };
    });

    setZaloQueueTitle("Hàng Đợi Tự Động Gửi Nhắc Nhở Học Phí Zalo (Giãn Cách 2-3 Phút)");
    setZaloQueueItems(items);
    setIsBulkReminderOpen(false);
    setIsZaloQueueOpen(true);
  };

  // Tự động tính học phí theo lịch
  const handleTriggerAutoCalculate = () => {
    if (selectedClassId === "ALL") {
      classes.forEach((c) => calculateClassTuitionBills(c.id, selectedMonth));
      showToast(`⚡ Đã tự động tính học phí theo lịch tháng cho toàn bộ các lớp (${selectedMonth})!`);
    } else {
      const cls = classes.find((c) => c.id === selectedClassId);
      calculateClassTuitionBills(selectedClassId, selectedMonth);
      showToast(`⚡ Đã tự động tính học phí lớp ${cls?.name || ""} (${selectedMonth})!`);
    }
  };

  // Cài cảnh báo ngày 01 đầu tháng
  const handleTriggerMonthStartWarning = () => {
    autoTriggerMonthlyTuition(selectedMonth);
    showToast(`🔔 Đã kích hoạt cảnh báo đóng học phí ngày 01 đầu tháng (Kỳ ${selectedMonth} - Hạn chót 10/11)!`);
  };

  // Gửi nhắc nhở đóng học phí đơn lẻ (Mở modal chỉnh sửa trước khi gửi)
  const handleSendReminder = (bill: StudentTuitionBill) => {
    handleOpenZaloReminderModal(bill);
  };

  // Lấy chi tiết lịch học của một lớp
  const scheduleDetails = useMemo(() => {
    if (!viewingScheduleClassId) return null;
    const targetClass = classes.find((c) => c.id === viewingScheduleClassId);
    if (!targetClass) return null;
    return {
      classItem: targetClass,
      ...calculateMonthLessons(selectedMonth, targetClass.schedules),
    };
  }, [viewingScheduleClassId, classes, selectedMonth]);

  // Preview tin nhắn mẫu trong modal nhắc nhở hàng loạt
  const reminderPreviewText = useMemo(() => {
    if (unpaidBillsInMonth.length === 0) return "";
    const sampleBill = unpaidBillsInMonth[0];
    const sampleDebt = getStudentDebtSummary(sampleBill.studentId, studentTuitionBills);
    return generateTuitionReminderMessage(reminderTemplate, sampleBill, sampleDebt);
  }, [reminderTemplate, unpaidBillsInMonth, studentTuitionBills]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-amber-500/50 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header & Mindset Quy Định Học Phí */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5" /> Quản Lý Học Phí
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-slate-200">
                Kỳ {selectedMonth}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              Quản Lý & Thu Học Phí Học Sinh
            </h2>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTriggerAutoCalculate}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5"
              title="Tự động tính số buổi theo lịch và đơn giá cho lớp/học sinh"
            >
              <Sparkles className="w-4 h-4" />
              <span>Tự Động Tính Theo Lịch</span>
            </button>
            <button
              onClick={handleTriggerMonthStartWarning}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
              title="Kích hoạt ngày 01 đầu tháng: Quét học phí và cài đặt cảnh báo hạn nộp 10/11"
            >
              <Bell className="w-4 h-4 text-amber-300" />
              <span>Cài Cảnh Báo Ngày 01</span>
            </button>
            <button
              onClick={handleOpenBulkReminder}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              title="Gửi tin nhắn Zalo tới SĐT phụ huynh & hiển thị thông báo trên Cổng App"
            >
              <MessageSquare className="w-4 h-4" />
              <span>💬 Gửi Nhắc Nợ Zalo ({unpaidBillsInMonth.length} PH)</span>
            </button>
            <button
              onClick={handleSendEntireClass}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              title="Gửi tin nhắn Zalo thông báo học phí tới 100% phụ huynh cả lớp & phát hành trên Cổng App"
            >
              <Send className="w-4 h-4" />
              <span>💬 Gửi Zalo Toàn Lớp</span>
            </button>
          </div>
        </div>

        {/* 5 Thẻ KPI Tracking Đóng Học Phí & Nợ Nhiều Tháng */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-700/60">
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
              <span>Tổng Dự Thu ({summary.totalStudentsCount} HS)</span>
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-mono font-extrabold text-white">
              {formatVND(summary.totalCalculated)}
            </div>
            <div className="text-[10.5px] text-slate-400 mt-1">
              Bao gồm {summary.draftCount} bản nháp
            </div>
          </div>

          <div className="bg-emerald-500/15 backdrop-blur-md p-3 rounded-2xl border border-emerald-500/30">
            <div className="flex items-center justify-between text-xs text-emerald-200 mb-1">
              <span>Đã Thu (PAID)</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg font-mono font-extrabold text-emerald-300">
              {formatVND(summary.totalPaid)}
            </div>
            <div className="text-[10.5px] text-emerald-300 font-semibold mt-1 flex items-center justify-between">
              <span>{summary.paidCount} HS đã hoàn tất</span>
              <span className="font-mono bg-emerald-950/60 px-1 py-0.2 rounded text-[10px]">
                {summary.completionRate}%
              </span>
            </div>
          </div>

          <div className="bg-amber-500/15 backdrop-blur-md p-3 rounded-2xl border border-amber-500/30">
            <div className="flex items-center justify-between text-xs text-amber-200 mb-1">
              <span>Chưa Thu (PENDING)</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg font-mono font-extrabold text-amber-300">
              {formatVND(summary.totalRemaining)}
            </div>
            <div className="text-[10.5px] text-amber-300 mt-1">
              {summary.unpaidCount} HS đang chờ nộp
            </div>
          </div>

          <div className="bg-rose-500/15 backdrop-blur-md p-3 rounded-2xl border border-rose-500/30">
            <div className="flex items-center justify-between text-xs text-rose-200 mb-1">
              <span>Quá Hạn Tháng Này</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-lg font-mono font-extrabold text-rose-300">
              {summary.overdueCount} Học Viên
            </div>
            <div className="text-[10.5px] text-rose-300 mt-1">
              Hạn chót: Ngày 10 hàng tháng
            </div>
          </div>

          {/* KPI 5: Nợ Lũy Kế Nhiều Tháng */}
          <div 
            onClick={() => setStatusFilter("MULTI_MONTH_DEBT")}
            className="bg-purple-500/20 backdrop-blur-md p-3 rounded-2xl border border-purple-500/40 cursor-pointer hover:border-purple-400 transition"
          >
            <div className="flex items-center justify-between text-xs text-purple-200 mb-1">
              <span className="font-bold flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5 text-purple-400" />
                Nợ Nhiều Tháng (≥ 2T)
              </span>
              <span className="text-[10px] bg-purple-900/80 px-1.5 py-0.2 rounded text-purple-200 font-mono">
                {summary.multiMonthDebtCount} HS
              </span>
            </div>
            <div className="text-lg font-mono font-extrabold text-purple-300">
              {formatVND(summary.totalMultiMonthDebtAmount)}
            </div>
            <div className="text-[10.5px] text-purple-200 font-medium mt-1">
              Danh sách nợ gộp &rarr;
            </div>
          </div>
        </div>
      </div>

      {/* Bộ Chọn Lớp Học Dạng Tabs Pills Chuyên Nghiệp */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Quản lý học phí theo lớp học:
            </span>
          </div>

          {/* Chọn Kỳ Học Phí */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Kỳ học phí:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="Tháng 11/2026">Tháng 11/2026 (Hiện tại - Thu đầu tháng)</option>
              <option value="Tháng 12/2026">Tháng 12/2026 (Kỳ tiếp theo)</option>
              <option value="Tháng 10/2026">Tháng 10/2026 (Lịch sử đã thu)</option>
            </select>
          </div>
        </div>

        {/* Thanh chọn lớp */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedClassId("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 ${
              selectedClassId === "ALL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Tất Cả Các Lớp</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-mono">
              {students.length} HS
            </span>
          </button>

          {classes.map((cls) => {
            const classBills = monthBills.filter((b) => b.classId === cls.id);
            const paidCount = classBills.filter((b) => b.status === "PAID").length;
            const totalCount = classBills.length;
            const isSelected = selectedClassId === cls.id;

            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 border ${
                  isSelected
                    ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>{cls.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  isSelected ? "bg-slate-950/20 text-slate-950" : "bg-slate-200 text-slate-700"
                }`}>
                  {paidCount}/{totalCount} Đã Nộp
                </span>
              </button>
            );
          })}
        </div>

        {/* Thông tin lớp học đang chọn */}
        {selectedClassId !== "ALL" && (
          (() => {
            const currentClass = classes.find((c) => c.id === selectedClassId);
            if (!currentClass) return null;
            const { lessonCount, lessonDates } = calculateMonthLessons(selectedMonth, currentClass.schedules);
            const actualCount = lessonCount > 0 ? lessonCount : 8;
            const fee = currentClass.feePerLesson || 200000;

            return (
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-950 flex items-center gap-2">
                    <span>{currentClass.name} ({currentClass.code})</span>
                    <span className="text-[11px] font-normal text-slate-600">
                      — GV: {currentClass.teacherName} | TA: {currentClass.assistantName}
                    </span>
                  </div>
                  <div className="text-slate-600 flex items-center gap-3">
                    <span>Lịch học: <strong>{currentClass.schedules.map((s) => `${s.dayLabel} (${s.startTime} - ${s.endTime})`).join(", ")}</strong></span>
                    <span>•</span>
                    <span>Số buổi tháng {selectedMonth}: <strong className="text-indigo-700 font-bold">{actualCount} buổi</strong></span>
                    <span>•</span>
                    <span>Đơn giá: <strong className="text-emerald-700 font-mono font-bold">{formatVND(fee)}/buổi</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setViewingScheduleClassId(currentClass.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold text-[11px] hover:bg-amber-100 transition flex items-center gap-1 shadow-xs"
                    title="Xem chi tiết danh sách tất cả các ngày học trong tháng của lớp"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Xem {lessonDates.length} ngày học của tháng</span>
                  </button>
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Bộ Lọc & Tìm Kiếm Danh Sách */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Tìm kiếm */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Tìm tên học sinh, mã HS, SĐT phụ huynh..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Lọc Trạng Thái & Nợ Nhiều Tháng */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-thin pb-1">
          {[
            { key: "ALL", label: "Tất cả", count: monthBills.length },
            { key: "DRAFT", label: "Bản nháp", count: monthBills.filter((b) => b.status === "DRAFT").length },
            { key: "SENT", label: "Đã gửi thông báo", count: monthBills.filter((b) => b.status === "SENT").length },
            { key: "PAID", label: "Đã nộp", count: monthBills.filter((b) => b.status === "PAID").length },
            { key: "OVERDUE", label: "Quá hạn", count: monthBills.filter((b) => b.status === "OVERDUE").length },
            { 
              key: "MULTI_MONTH_DEBT", 
              label: "🚨 Nợ Nhiều Tháng", 
              count: summary.multiMonthDebtCount,
              badgeColor: "bg-purple-100 text-purple-900 border border-purple-300"
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key as any); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
                statusFilter === tab.key
                  ? tab.key === "MULTI_MONTH_DEBT"
                    ? "bg-purple-700 text-white font-bold shadow-xs"
                    : "bg-slate-900 text-white font-bold"
                  : tab.key === "MULTI_MONTH_DEBT"
                  ? "bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                statusFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bảng Danh Sách Học Phí Học Sinh */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Học Sinh & Phụ Huynh</th>
                <th className="py-3 px-3">Lớp Học</th>
                <th className="py-3 px-3 text-center">Số Buổi</th>
                <th className="py-3 px-3 text-right">Đơn Giá</th>
                <th className="py-3 px-3 text-right">Tiền Học Gốc</th>
                <th className="py-3 px-3 text-right text-emerald-800 bg-emerald-50/70 border-x border-emerald-100">Phụ Thu (+)</th>
                <th className="py-3 px-3 text-right text-rose-800 bg-rose-50/70 border-r border-rose-100">Giảm Trừ (-)</th>
                <th className="py-3 px-3 text-right">Tổng Cần Thu</th>
                <th className="py-3 px-3 text-center">Trạng Thái & Nợ</th>
                <th className="py-3 px-4 text-center">Thao Tác Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                    Không có học sinh nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                paginatedBills.map((bill) => {
                  const debt = getStudentDebtSummary(bill.studentId, studentTuitionBills);
                  const studentData = students.find((s) => s.id === bill.studentId);
                  const isDropped = studentData?.learningStatus === "DROPPED";

                  return (
                    <tr key={bill.id} className={`transition ${
                      debt.isMultiMonthDebt ? "bg-purple-50/30 hover:bg-purple-50/50" : "hover:bg-amber-50/30"
                    }`}>
                      {/* Học sinh & Phụ huynh */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span>{bill.studentName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {bill.studentCode}
                          </span>
                          {isDropped && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                              🛑 Đã nghỉ hẳn
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          PH: <strong className="text-slate-700">{students.find((s) => s.id === bill.studentId)?.parentName || bill.parentName}</strong> ({students.find((s) => s.id === bill.studentId)?.parentPhone || bill.parentPhone})
                        </div>

                        {/* Cảnh báo nợ nhiều tháng nếu có */}
                        {debt.isMultiMonthDebt && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 ${
                              debt.severityLevel === "CRITICAL"
                                ? "bg-rose-100 text-rose-900 border border-rose-300 animate-pulse"
                                : "bg-purple-100 text-purple-900 border border-purple-300"
                            }`}>
                              <AlertOctagon className="w-3 h-3 text-rose-600" />
                              Nợ {debt.debtMonthsCount} tháng ({formatVND(debt.totalDebtAmount)})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentStu = students.find((s) => s.id === bill.studentId);
                                setInspectingStudentDebt({
                                  studentId: bill.studentId,
                                  studentName: currentStu?.fullName || bill.studentName,
                                  parentName: currentStu?.parentName || bill.parentName,
                                  parentPhone: currentStu?.parentPhone || bill.parentPhone,
                                  className: bill.className,
                                  debtSummary: debt,
                                });
                              }}
                              className="text-[10px] text-indigo-700 hover:underline font-bold"
                              title="Bấm xem chi tiết các kỳ nợ và lịch sử nhắc nhở"
                            >
                              [Chi tiết nợ]
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Lớp học */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 block">
                          {bill.className}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Hạn nộp: {bill.dueDate}
                        </span>
                      </td>

                      {/* Số buổi trong tháng */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-200 font-mono font-bold text-indigo-900">
                          <span>{bill.lessonCount} buổi</span>
                        </div>
                        <span className="text-[9.5px] text-slate-400 block mt-0.5">
                          Theo lịch tháng
                        </span>
                      </td>

                      {/* Đơn giá 1 buổi */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                        {formatVND(bill.feePerLesson)}
                      </td>

                      {/* Tiền học gốc */}
                      <td className="py-3 px-3 text-right font-mono text-slate-800">
                        {formatVND(bill.calculatedAmount)}
                      </td>

                      {/* Khoản Phụ Thu (+) */}
                      <td className="py-3 px-3 text-right bg-emerald-50/30 border-x border-emerald-100/60">
                        {(bill.surcharge && bill.surcharge > 0) || (bill.adjustmentAmount > 0 && !bill.surcharge) ? (
                          <div>
                            <span className="font-mono font-bold text-emerald-700">
                              +{formatVND(bill.surcharge || bill.adjustmentAmount)}
                            </span>
                            {(bill.surchargeNote || (bill.adjustmentAmount > 0 && bill.notes)) && (
                              <span className="text-[10px] text-emerald-800 block truncate max-w-[110px] ml-auto font-medium" title={bill.surchargeNote || bill.notes}>
                                {bill.surchargeNote || bill.notes}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono">-</span>
                        )}
                      </td>

                      {/* Khoản Giảm Trừ (-) */}
                      <td className="py-3 px-3 text-right bg-rose-50/30 border-r border-rose-100/60">
                        {(bill.discount && bill.discount > 0) || (bill.adjustmentAmount < 0 && !bill.discount) ? (
                          <div>
                            <span className="font-mono font-bold text-rose-700">
                              -{formatVND(bill.discount || Math.abs(bill.adjustmentAmount))}
                            </span>
                            {(bill.discountNote || (bill.adjustmentAmount < 0 && bill.notes)) && (
                              <span className="text-[10px] text-rose-800 block truncate max-w-[110px] ml-auto font-medium" title={bill.discountNote || bill.notes}>
                                {bill.discountNote || bill.notes}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono">-</span>
                        )}
                      </td>

                      {/* Tổng Cần Thu */}
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono font-extrabold text-sm text-slate-950 block">
                          {formatVND(bill.finalAmount)}
                        </span>
                        <span className="text-[9.5px] text-emerald-700 font-medium">
                          Nghỉ không trừ
                        </span>
                      </td>

                      {/* Trạng thái & Nợ */}
                      <td className="py-3 px-3 text-center">
                        {bill.status === "DRAFT" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Bản Nháp
                          </span>
                        )}
                        {bill.status === "SENT" && (
                          <div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Đã Gửi TB
                            </span>
                            {bill.zaloSentAt && (
                              <span className="text-[9.5px] text-blue-700 font-bold block mt-0.5">
                                💬 Zalo Trung Tâm
                              </span>
                            )}
                            {bill.reminderSentCount > 0 && (
                              <span className="text-[9.5px] text-amber-700 block mt-0.5">
                                Đã nhắc {bill.reminderSentCount} lần
                              </span>
                            )}
                          </div>
                        )}
                        {bill.status === "PAID" && (
                          <div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ Đã Nộp
                            </span>
                            <span className="text-[9.5px] text-slate-500 block mt-0.5 font-mono">
                              {bill.paymentMethod === "CASH" ? "Tiền mặt" : "VietQR"}
                            </span>
                          </div>
                        )}
                        {bill.status === "OVERDUE" && (
                          <div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              ⚠️ Quá Hạn
                            </span>
                            <span className="text-[9.5px] text-rose-600 block mt-0.5">
                              Cần nhắc nhở
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Thao tác Admin */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Sửa học phí (Admin có quyền sửa) */}
                          <button
                            onClick={() => handleOpenEdit(bill)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="Chỉnh sửa học phí, số buổi, đơn giá hoặc giảm trừ"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Nếu là DRAFT -> Nút Bấm Gửi */}
                          {bill.status === "DRAFT" && (
                            <button
                              onClick={() => handleSendSingle(bill)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition flex items-center gap-1 shadow-xs"
                              title="Bấm gửi tin nhắn Zalo thông báo học phí tới phụ huynh & phát hành Cổng App"
                            >
                              <Send className="w-3 h-3" />
                              <span>💬 Gửi Zalo TB</span>
                            </button>
                          )}

                          {/* Nếu là SENT hoặc OVERDUE -> Thu tiền & Nhắc nhở */}
                          {(bill.status === "SENT" || bill.status === "OVERDUE") && (
                            <>
                              <button
                                onClick={() => handleOpenCollect(bill)}
                                className={`px-2 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 shadow-xs text-white ${
                                  debt.isMultiMonthDebt ? "bg-purple-600 hover:bg-purple-700" : "bg-emerald-600 hover:bg-emerald-700"
                                }`}
                                title={debt.isMultiMonthDebt ? `Bé nợ ${debt.debtMonthsCount} tháng: Có thể thu gộp toàn bộ công nợ` : "Xác nhận đã thu tiền học phí"}
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>{debt.isMultiMonthDebt ? "Thu Gộp/Đơn" : "Thu Tiền"}</span>
                              </button>
                              <button
                                onClick={() => handleSendReminder(bill)}
                                className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 transition"
                                title="Gửi nhắc nhở đóng học phí tới phụ huynh (Mở Zalo & Cổng PH)"
                              >
                                <Bell className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenZaloBillModal(bill)}
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition font-bold text-xs"
                                title="Xem & chỉnh sửa hóa đơn Zalo trước khi gửi phụ huynh"
                              >
                                💬
                              </button>
                            </>
                          )}

                          {/* Nếu là PAID -> Xem Phiếu Thu & Tùy chọn Đổi lại Chưa Nộp */}
                          {bill.status === "PAID" && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <button
                                onClick={() => {
                                  setReceiptBill(bill);
                                  setReceiptMultiMonthBills(null);
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer"
                                title="Xem và in phiếu thu học phí"
                              >
                                <Printer className="w-3 h-3 text-slate-600" />
                                <span>Phiếu Thu</span>
                              </button>
                              <button
                                onClick={() => setRevertBillConfirm(bill)}
                                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                                title="Chuyển lại về trạng thái Chưa nộp (phòng khi Admin bấm nhầm)"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-700" />
                                <span>Đổi Chưa Nộp</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="font-semibold text-slate-700">
            Hiển thị <span className="font-bold text-slate-900">{(safeCurrentPage - 1) * pageSize + 1} - {Math.min(safeCurrentPage * pageSize, filteredBills.length)}</span> trên tổng số <span className="font-bold text-slate-900">{filteredBills.length}</span> hóa đơn học phí
          </div>
          {filteredBills.length > pageSize && (
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
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: GỬI NHẮC NHỞ HÀNG LOẠT CHO PHỤ HUYNH CHƯA ĐÓNG */}
      {/* ============================================================== */}
      {isBulkReminderOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-rose-600" />
                  Gửi Nhắc Nhở Học Phí Cho Phụ Huynh Chưa Đóng
                </h4>
                <p className="text-xs text-slate-500">
                  Kỳ học phí: <strong className="text-slate-800">{selectedMonth}</strong> — Tổng {unpaidBillsInMonth.length} học viên chưa hoàn tất
                </p>
              </div>
              <button
                onClick={() => setIsBulkReminderOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* CHỈ DẪN RÕ RÀNG VỀ 2 KÊNH GỬI */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-2xl p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1">
                  <span>💬 KÊNH ZALO NGOÀI:</span>
                </span>
                <span className="text-slate-800 font-semibold text-[11.5px]">
                  Bắn tin nhắn Zalo trực tiếp tới SĐT phụ huynh (Hàng đợi giãn cách 2-3 phút chống spam)
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-[11px] shrink-0">
                📲 KÊNH NỘI BỘ: Cổng App
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Chọn Mẫu Tin Nhắn Nhắc Nhở */}
              <div>
                <label className="font-bold text-slate-800 block mb-2">
                  1. Chọn mẫu tin nhắn nhắc nhở:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      id: "MONTH_START",
                      title: "Thông Báo Thu Đầu Tháng",
                      desc: "Gửi ngày 01-05: Thông báo số buổi, đơn giá & hạn nộp ngày 10",
                      badge: "Đầu Tháng",
                    },
                    {
                      id: "DUE_APPROACHING",
                      title: "Nhắc Nhở Cận Hạn Nộp",
                      desc: "Gửi ngày 08-10: Cảnh báo sắp hết hạn nộp học phí định kỳ",
                      badge: "Cận Hạn",
                    },
                    {
                      id: "OVERDUE_SINGLE",
                      title: "Cảnh Báo Quá Hạn (Sau Ngày 10)",
                      desc: "Gửi sau ngày 10: Yêu cầu thanh toán gấp để chốt lớp",
                      badge: "Quá Hạn",
                    },
                    {
                      id: "MULTI_MONTH_DEBT",
                      title: "Thông Báo Công Nợ Nhiều Tháng",
                      desc: "Dành riêng cho HS nợ ≥ 2 tháng: Gộp tổng nợ các tháng",
                      badge: "Nợ ≥ 2 Tháng",
                    },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setReminderTemplate(tpl.id as any)}
                      className={`p-3 rounded-2xl border text-left transition ${
                        reminderTemplate === tpl.id
                          ? "bg-amber-500/10 border-amber-500 text-amber-950 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">{tpl.title}</span>
                        <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                          reminderTemplate === tpl.id ? "bg-amber-500 text-slate-950" : "bg-slate-200 text-slate-600"
                        }`}>
                          {tpl.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{tpl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Nội Dung Tin Nhắn Mẫu */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  2. Nội dung tin nhắn mẫu được cá nhân hóa:
                </label>
                <div className="p-3 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px] leading-relaxed border border-slate-800">
                  {reminderPreviewText || "Chưa có học sinh nào phù hợp."}
                </div>
              </div>

              {/* Kênh Gửi */}
              <div>
                <label className="font-bold text-slate-800 block mb-1.5">
                  3. Kênh gửi thông báo:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "APP_PORTAL", label: "Cổng Phụ Huynh", sub: "Gửi thông báo vào Cổng PH" },
                    { id: "SMS", label: "Tin Nhắn SMS", sub: "Gửi tin nhắn SMS trực tiếp tới SĐT" },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setReminderChannel(ch.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        reminderChannel === ch.id
                          ? "bg-slate-900 text-white font-bold border-slate-900"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="font-bold text-xs">{ch.label}</div>
                      <div className="text-[10px] opacity-75">{ch.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Danh Sách Phụ Huynh Nhận Tin (Có Checkbox) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800">
                    4. Danh sách học sinh nhận nhắc nhở ({selectedBulkBillIds.length} / {unpaidBillsInMonth.length}):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedBulkBillIds.length === unpaidBillsInMonth.length) {
                        setSelectedBulkBillIds([]);
                      } else {
                        setSelectedBulkBillIds(unpaidBillsInMonth.map((b) => b.id));
                      }
                    }}
                    className="text-[11px] text-indigo-700 hover:underline font-bold"
                  >
                    {selectedBulkBillIds.length === unpaidBillsInMonth.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  {unpaidBillsInMonth.map((b) => {
                    const isChecked = selectedBulkBillIds.includes(b.id);
                    const debt = getStudentDebtSummary(b.studentId, studentTuitionBills);

                    return (
                      <label
                        key={b.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 hover:border-amber-400 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBulkBillIds((prev) => [...prev, b.id]);
                              } else {
                                setSelectedBulkBillIds((prev) => prev.filter((id) => id !== b.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <span className="font-bold text-slate-900">{b.studentName}</span>
                            <span className="text-slate-500 text-[11px] ml-1.5">
                              — PH: {students.find((s) => s.id === b.studentId)?.parentName || b.parentName} ({students.find((s) => s.id === b.studentId)?.parentPhone || b.parentPhone})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {debt.isMultiMonthDebt && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                              Nợ {debt.debtMonthsCount}T
                            </span>
                          )}
                          <span className="font-mono font-bold text-slate-800">
                            {formatVND(b.finalAmount)}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBulkReminderOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkReminder}
                disabled={selectedBulkBillIds.length === 0}
                className="w-full sm:flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Chỉ phát hành thông báo nội bộ lên Sổ liên lạc Cổng Phụ Huynh (không gửi tin Zalo ra ngoài)"
              >
                <span>📲</span>
                <span>Chỉ Gửi Cổng App ({selectedBulkBillIds.length})</span>
              </button>
              <button
                type="button"
                onClick={handleStartZaloQueue}
                disabled={selectedBulkBillIds.length === 0}
                className="w-full sm:flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Bắn tin nhắn Zalo trực tiếp tới SĐT phụ huynh với cơ chế gửi chậm giãn cách 2-3 phút/tin"
              >
                <span>💬</span>
                <span>Bật Hàng Đợi Gửi Zalo ({selectedBulkBillIds.length} PH)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: XEM CHI TIẾT CÔNG NỢ NHIỀU THÁNG CỦA HỌC SINH */}
      {/* ============================================================== */}
      {inspectingStudentDebt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <AlertOctagon className="w-5 h-5 text-purple-600" />
                  Hồ Sơ Công Nợ Tồn Đọng Nhiều Tháng
                </h4>
                <p className="text-xs text-slate-500">
                  Học sinh: <strong className="text-slate-900">{inspectingStudentDebt.studentName}</strong> — Lớp {inspectingStudentDebt.className}
                </p>
              </div>
              <button
                onClick={() => setInspectingStudentDebt(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Thẻ Tổng Nợ Lũy Kế */}
              <div className="p-4 bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 rounded-2xl border border-purple-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-600 block text-[11px]">Tổng số tiền nợ học phí lũy kế:</span>
                  <div className="text-2xl font-mono font-black text-rose-800 mt-0.5">
                    {formatVND(inspectingStudentDebt.debtSummary.totalDebtAmount)}
                  </div>
                  <span className="text-[11px] text-purple-900 font-semibold mt-1 block">
                    Đang tồn đọng {inspectingStudentDebt.debtSummary.debtMonthsCount} kỳ học ({inspectingStudentDebt.debtSummary.monthsList.join(", ")})
                  </span>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-extrabold uppercase ${
                    inspectingStudentDebt.debtSummary.severityLevel === "CRITICAL"
                      ? "bg-rose-600 text-white animate-pulse"
                      : "bg-amber-500 text-slate-950 font-bold"
                  }`}>
                    {inspectingStudentDebt.debtSummary.severityLevel === "CRITICAL" ? "🚨 Báo Động Đỏ (≥ 3T)" : "⚠️ Cảnh Báo Nợ (2T)"}
                  </span>
                </div>
              </div>

              {/* Bảng Kê Từng Tháng Nợ */}
              <div>
                <span className="font-bold text-slate-800 block mb-1.5">
                  Bảng kê chi tiết các kỳ chưa thanh toán:
                </span>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Kỳ Thu</th>
                        <th className="py-2.5 px-2 text-center">Số Buổi</th>
                        <th className="py-2.5 px-2 text-right">Đơn Giá</th>
                        <th className="py-2.5 px-3 text-right">Học Phí</th>
                        <th className="py-2.5 px-2 text-center">Trạng Thái</th>
                        <th className="py-2.5 px-2 text-center">Đã Nhắc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {inspectingStudentDebt.debtSummary.unpaidBills.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-sans font-bold text-slate-900">
                            {b.billingMonth}
                          </td>
                          <td className="py-2.5 px-2 text-center">{b.lessonCount} buổi</td>
                          <td className="py-2.5 px-2 text-right">{formatVND(b.feePerLesson)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                            {formatVND(b.finalAmount)}
                          </td>
                          <td className="py-2.5 px-2 text-center font-sans">
                            <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                              b.status === "OVERDUE" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {b.status === "OVERDUE" ? "Quá hạn" : "Đã gửi TB"}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-500 font-sans">
                            {b.reminderSentCount || 0} lần
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectingStudentDebt(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const billToCollect = inspectingStudentDebt.debtSummary.unpaidBills[0];
                  setInspectingStudentDebt(null);
                  handleOpenCollect(billToCollect);
                }}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" />
                <span>Thu Tiền Gộp Toàn Bộ Các Tháng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: XÁC NHẬN THU HỌC PHÍ (HỖ TRỢ THU ĐƠN HOẶC THU GỘP NHIỀU THÁNG) */}
      {/* ============================================================== */}
      {collectingBill && (() => {
        const debt = getStudentDebtSummary(collectingBill.studentId, studentTuitionBills);
        const isMulti = debt.isMultiMonthDebt;
        const totalCollectAmount = collectMode === "ALL_DEBT" && isMulti 
          ? debt.totalDebtAmount 
          : collectingBill.finalAmount;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Xác Nhận Thu Học Phí
                  </h4>
                  <p className="text-xs text-slate-500">
                    {collectingBill.studentName} — {collectingBill.className}
                  </p>
                </div>
                <button
                  onClick={() => setCollectingBill(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Lựa chọn thu đơn tháng hay thu gộp nhiều tháng */}
                {isMulti && (
                  <div>
                    <label className="font-bold text-slate-800 block mb-1.5">
                      Bé đang nợ {debt.debtMonthsCount} tháng học phí! Chọn phương án thu:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCollectMode("SINGLE")}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          collectMode === "SINGLE"
                            ? "bg-slate-900 text-white border-slate-900 font-bold shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div className="text-xs">Chỉ Thu Kỳ Này</div>
                        <div className="text-[10px] opacity-80 font-mono mt-0.5">
                          {formatVND(collectingBill.finalAmount)}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCollectMode("ALL_DEBT")}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          collectMode === "ALL_DEBT"
                            ? "bg-purple-600 text-white border-purple-600 font-bold shadow-xs"
                            : "bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100"
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          Thu Gộp {debt.debtMonthsCount} Tháng
                        </div>
                        <div className="text-[10px] opacity-90 font-mono font-bold mt-0.5">
                          {formatVND(debt.totalDebtAmount)}
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                <div className={`p-4 rounded-2xl border text-center ${
                  collectMode === "ALL_DEBT" && isMulti 
                    ? "bg-purple-50 border-purple-200" 
                    : "bg-emerald-50 border-emerald-200"
                }`}>
                  <span className="text-slate-600 block text-[11px]">
                    {collectMode === "ALL_DEBT" && isMulti
                      ? `Số tiền thu GỘP ${debt.debtMonthsCount} tháng (${debt.monthsList.join(", ")}):`
                      : `Số tiền thu kỳ ${collectingBill.billingMonth}:`}
                  </span>
                  <span className={`text-2xl font-mono font-black block mt-1 ${
                    collectMode === "ALL_DEBT" && isMulti ? "text-purple-950" : "text-emerald-800"
                  }`}>
                    {formatVND(totalCollectAmount)}
                  </span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">
                    Hình thức thanh toán:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCollectionMethod("VIETQR")}
                      className={`p-2.5 rounded-xl border text-center transition flex items-center justify-center gap-2 font-bold ${
                        collectionMethod === "VIETQR"
                          ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Chuyển Khoản VietQR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectionMethod("CASH")}
                      className={`p-2.5 rounded-xl border text-center transition flex items-center justify-center gap-2 font-bold ${
                        collectionMethod === "CASH"
                          ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Tiền Mặt Tại Quầy</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mã giao dịch / Biên nhận:</label>
                  <input
                    type="text"
                    value={collectionTrxCode}
                    onChange={(e) => setCollectionTrxCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ghi chú giao dịch:</label>
                  <input
                    type="text"
                    value={collectionNote}
                    onChange={(e) => setCollectionNote(e.target.value)}
                    placeholder="Ghi chú nộp học phí..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCollectingBill(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCollect}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Xác Nhận Đã Thu</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* MODAL 4: IN PHIẾU THU / BIÊN LAI HỌC PHÍ */}
      {/* ============================================================== */}
      {receiptBill && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5">
            {/* Phiếu Thu Printable Zone */}
            <div id="tuition-receipt-print" className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-slate-800">
              {/* Header phiếu thu */}
              <div className="text-center border-b border-slate-300 pb-4 space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-700">
                  HỆ THỐNG ANH NGỮ MS. DUNG SHINY
                </span>
                <h3 className="text-xl font-black text-slate-950 uppercase">
                  BIÊN LAI THU HỌC PHÍ THÁNG
                </h3>
                <p className="text-[11px] text-slate-500">
                  Kỳ học phí: <strong className="text-slate-800">{receiptBill.billingMonth}</strong> — Mã biên nhận: <strong className="font-mono text-slate-800">{receiptBill.transactionCode || receiptBill.id}</strong>
                </p>
              </div>

              {/* Chi tiết học viên */}
              <div className="grid grid-cols-2 gap-2 text-xs py-1">
                <div>Học sinh: <strong className="text-slate-950">{receiptBill.studentName}</strong></div>
                <div>Mã học sinh: <strong className="font-mono text-slate-950">{receiptBill.studentCode}</strong></div>
                <div>Phụ huynh: <strong className="text-slate-950">{students.find((s) => s.id === receiptBill.studentId)?.parentName || receiptBill.parentName}</strong></div>
                <div>Số điện thoại: <strong className="font-mono text-slate-950">{students.find((s) => s.id === receiptBill.studentId)?.parentPhone || receiptBill.parentPhone}</strong></div>
                <div>Lớp học: <strong className="text-slate-950">{receiptBill.className}</strong></div>
                <div>Hạn đóng học phí: <strong className="text-slate-950">{receiptBill.dueDate}</strong></div>
              </div>

              {/* Bảng kê chi tiết học phí */}
              <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-200/80 font-bold text-slate-900 border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-3">Khoản Mục Thu</th>
                      <th className="py-2 px-2 text-center">Số Buổi</th>
                      <th className="py-2 px-2 text-right">Đơn Giá</th>
                      <th className="py-2 px-3 text-right">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white font-mono">
                    <tr>
                      <td className="py-2 px-3 font-sans text-slate-800">
                        Học phí định kỳ tháng {receiptBill.billingMonth}
                      </td>
                      <td className="py-2 px-2 text-center font-bold">{receiptBill.lessonCount} buổi</td>
                      <td className="py-2 px-2 text-right">{formatVND(receiptBill.feePerLesson)}</td>
                      <td className="py-2 px-3 text-right font-bold">{formatVND(receiptBill.calculatedAmount)}</td>
                    </tr>
                    {/* Khoản phụ thu (+) nếu có */}
                    {((receiptBill.surcharge && receiptBill.surcharge > 0) || (receiptBill.adjustmentAmount > 0 && !receiptBill.surcharge)) && (
                      <tr className="bg-emerald-50/50">
                        <td colSpan={3} className="py-2 px-3 font-sans text-emerald-900 font-medium">
                          + Phụ thu thêm: {receiptBill.surchargeNote || (receiptBill.adjustmentAmount > 0 ? receiptBill.notes : "") || "Phụ phí phát sinh"}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          +{formatVND(receiptBill.surcharge || receiptBill.adjustmentAmount)}
                        </td>
                      </tr>
                    )}
                    {/* Khoản giảm trừ (-) nếu có */}
                    {((receiptBill.discount && receiptBill.discount > 0) || (receiptBill.adjustmentAmount < 0 && !receiptBill.discount)) && (
                      <tr className="bg-rose-50/50">
                        <td colSpan={3} className="py-2 px-3 font-sans text-rose-900 font-medium">
                          - Giảm trừ / Học bổng: {receiptBill.discountNote || (receiptBill.adjustmentAmount < 0 ? receiptBill.notes : "") || "Học bổng / Ưu đãi"}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-rose-700">
                          -{formatVND(receiptBill.discount || Math.abs(receiptBill.adjustmentAmount))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-right text-slate-900 uppercase">
                        Tổng Số Tiền Đã Thanh Toán:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-base text-emerald-800 font-black">
                        {formatVND(receiptBill.finalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Thông tin thanh toán */}
              <div className="text-[11px] text-slate-500 space-y-1">
                <div>
                  Phương thức: <strong className="text-slate-800">{receiptBill.paymentMethod === "CASH" ? "Tiền mặt tại trung tâm" : "Chuyển khoản VietQR"}</strong>
                  {receiptBill.paidAt && <span> • Ngày thanh toán: {new Date(receiptBill.paidAt).toLocaleDateString("vi-VN")}</span>}
                </div>
              </div>

              {/* Chữ ký */}
              <div className="grid grid-cols-2 text-center text-xs pt-4">
                <div>
                  <span className="font-bold block text-slate-800">Người Nộp Tiền</span>
                  <span className="text-[10px] text-slate-400 italic block mt-0.5">(Ký & ghi rõ họ tên)</span>
                  <div className="h-12" />
                  <span className="font-semibold text-slate-700">{receiptBill.parentName}</span>
                </div>
                <div>
                  <span className="font-bold block text-slate-800">Người Thu Tiền / Quản Trị Viên</span>
                  <span className="text-[10px] text-slate-400 italic block mt-0.5">(Ký, đóng dấu trung tâm)</span>
                  <div className="h-12 flex items-center justify-center">
                    <span className="px-2 py-0.5 rounded border border-emerald-500 text-emerald-700 text-[10px] font-black uppercase rotate-[-6deg]">
                      ✓ ĐÃ THU ĐỦ TIỀN
                    </span>
                  </div>
                  <span className="font-semibold text-slate-700">Ms. Dung Shiny Center</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReceiptBill(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>In Biên Lai / Xuất PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: XEM CHI TIẾT LỊCH CÁC NGÀY HỌC TRONG THÁNG CỦA LỚP */}
      {/* ============================================================== */}
      {scheduleDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Danh Sách Ngày Học Trong Tháng
                </h4>
                <p className="text-xs text-slate-500">
                  {scheduleDetails.classItem.name} — Kỳ {selectedMonth}
                </p>
              </div>
              <button
                onClick={() => setViewingScheduleClassId(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 flex items-center justify-between">
                <span>Tổng số buổi theo lịch tháng:</span>
                <span className="font-mono font-extrabold text-sm text-indigo-950">
                  {scheduleDetails.lessonCount} buổi học
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-2">
                  Chi tiết các ngày diễn ra ca học:
                </span>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {scheduleDetails.lessonDates.map((dateStr, idx) => (
                    <div
                      key={dateStr}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs flex items-center justify-between"
                    >
                      <span className="text-slate-500 font-sans text-[11px]">Buổi {idx + 1}:</span>
                      <strong className="text-slate-900">{dateStr}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500">
                🛡️ Học sinh nghỉ học vào bất kỳ buổi nào đều tính đủ {scheduleDetails.lessonCount} buổi theo quy chế bảo lưu và thu tiền định kỳ theo tháng của trung tâm.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewingScheduleClassId(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
            >
              Đã Rõ
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: ADMIN CHỈNH SỬA HỌC PHÍ */}
      {/* ============================================================== */}
      {editingBill && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-amber-500" />
                  Chỉnh Sửa Học Phí Học Viên
                </h4>
                <p className="text-xs text-slate-500">
                  {editingBill.studentName} ({editingBill.studentCode}) — Lớp {editingBill.className}
                </p>
              </div>
              <button
                onClick={() => setEditingBill(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Nút khôi phục chuẩn */}
              <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-slate-700">Công thức chuẩn của lớp:</span>
                <button
                  type="button"
                  onClick={handleRecalculateSingle}
                  className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>🔄 Tự Động Tính Chuẩn Theo Lịch</span>
                </button>
              </div>

              {/* Số buổi & Đơn giá trên cùng 1 hàng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Số buổi trong tháng ({selectedMonth}):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editLessons}
                    onChange={(e) => setEditLessons(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Đơn giá 1 buổi (VNĐ):
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={editFeePerLesson}
                    onChange={(e) => setEditFeePerLesson(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Tiền học gốc subtotal */}
              <div className="p-2.5 bg-slate-100 rounded-xl flex items-center justify-between text-slate-700 font-medium">
                <span>Tiền học gốc ({editLessons} buổi × {formatVND(editFeePerLesson)}):</span>
                <strong className="font-mono text-slate-950 font-bold">{formatVND(editLessons * editFeePerLesson)}</strong>
              </div>

              {/* Khoản Phụ Thu / Cộng Thêm (+) */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-emerald-600" />
                    Khoản Phụ Thu / Cộng Thêm (+ VNĐ):
                  </span>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                    Cộng vào học phí (+)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] text-slate-600 block mb-0.5 font-medium">Số tiền phụ thu (+):</label>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={editSurcharge || ""}
                      onChange={(e) => setEditSurcharge(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      placeholder="0"
                      className="w-full px-3 py-1.5 rounded-xl border border-emerald-300 bg-white font-mono font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] text-slate-600 block mb-0.5 font-medium">Lý do phụ thu:</label>
                    <input
                      type="text"
                      value={editSurchargeNote}
                      onChange={(e) => setEditSurchargeNote(e.target.value)}
                      placeholder="VD: Giáo trình mới, Đồng phục..."
                      className="w-full px-3 py-1.5 rounded-xl border border-emerald-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Khoản Giảm Trừ / Học Bổng (-) */}
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-950 flex items-center gap-1.5">
                    <MinusCircle className="w-4 h-4 text-rose-600" />
                    Khoản Giảm Trừ / Học Bổng (- VNĐ):
                  </span>
                  <span className="text-[10px] text-rose-800 font-bold bg-rose-100 px-2 py-0.5 rounded-full">
                    Trừ khỏi học phí (-)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] text-slate-600 block mb-0.5 font-medium">Số tiền giảm trừ (-):</label>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={editDiscount || ""}
                      onChange={(e) => setEditDiscount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      placeholder="0"
                      className="w-full px-3 py-1.5 rounded-xl border border-rose-300 bg-white font-mono font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] text-slate-600 block mb-0.5 font-medium">Lý do giảm trừ:</label>
                    <input
                      type="text"
                      value={editDiscountNote}
                      onChange={(e) => setEditDiscountNote(e.target.value)}
                      placeholder="VD: Tặng 10% học bổng, Ưu đãi 2 con..."
                      className="w-full px-3 py-1.5 rounded-xl border border-rose-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Tổng thực thu preview */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Học phí thực tế cần nộp:
                </label>
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>
                        Tiền gốc: {editLessons} buổi × {formatVND(editFeePerLesson)} = <strong className="font-mono text-slate-800">{formatVND(editLessons * editFeePerLesson)}</strong>
                      </div>
                      {editSurcharge > 0 && (
                        <div className="text-emerald-700 font-semibold">
                          + Phụ thu: +{formatVND(editSurcharge)} {editSurchargeNote && `(${editSurchargeNote})`}
                        </div>
                      )}
                      {editDiscount > 0 && (
                        <div className="text-rose-700 font-semibold">
                          - Giảm trừ: -{formatVND(editDiscount)} {editDiscountNote && `(${editDiscountNote})`}
                        </div>
                      )}
                    </div>
                    <div className="text-xl font-mono font-black text-amber-950 mt-1">
                      {formatVND((editLessons * editFeePerLesson) + (editSurcharge || 0) - (editDiscount || 0))}
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-200/90 text-amber-950 font-bold px-2.5 py-1.5 rounded-xl">
                    Tự Động Tính
                  </span>
                </div>
              </div>

              {/* Trạng thái đóng học phí (Admin có toàn quyền đổi Đã Nộp <-> Chưa Nộp nếu ấn nhầm) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs">
                    Trạng thái đóng tiền (Admin kiểm soát):
                  </label>
                  <span className="text-[10.5px] text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                    Sửa được nếu ấn nhầm
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: "PAID", label: "✓ Đã Nộp Tiền", activeClass: "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400 font-bold" },
                    { id: "SENT", label: "💬 Chưa Nộp (Đã gửi)", activeClass: "border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-400 font-bold" },
                    { id: "OVERDUE", label: "⚠️ Quá Hạn Nộp", activeClass: "border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-400 font-bold" },
                    { id: "DRAFT", label: "📝 Bản Nháp", activeClass: "border-slate-500 bg-slate-100 text-slate-900 ring-2 ring-slate-400 font-bold" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setEditStatus(st.id as TuitionBillStatus)}
                      className={`px-2 py-2 rounded-xl border text-center text-xs transition cursor-pointer ${
                        editStatus === st.id ? st.activeClass : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingBill(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL XÁC NHẬN HOÀN TÁC / ĐỔI HỌC PHÍ VỀ CHƯA NỘP */}
      {/* ============================================================== */}
      {revertBillConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">
                  Chuyển Lại Về Chưa Nộp
                </h4>
                <p className="text-xs text-slate-500">Phòng trường hợp Admin ấn nhầm đã thu tiền</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs">
              <div>Học viên: <strong className="text-slate-900">{revertBillConfirm.studentName}</strong> ({revertBillConfirm.studentCode})</div>
              <div>Lớp: <strong className="text-slate-900">{revertBillConfirm.className}</strong> — Kỳ: <strong className="text-slate-900">{revertBillConfirm.billingMonth}</strong></div>
              <div>Số tiền học phí: <strong className="text-emerald-700 font-mono text-sm">{formatVND(revertBillConfirm.finalAmount)}</strong></div>
              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                Hệ thống sẽ chuyển hóa đơn này về trạng thái <strong>Chưa nộp</strong>, xóa lịch sử thu tiền đã tạo và cập nhật công nợ học sinh.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRevertBillConfirm(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  markTuitionBillUnpaid(revertBillConfirm.id, revertBillConfirm.sentAt ? "SENT" : "DRAFT", "Admin chuyển lại về Chưa nộp");
                  showToast(`✓ Đã chuyển học phí bé ${revertBillConfirm.studentName} (${revertBillConfirm.billingMonth}) về trạng thái CHƯA NỘP!`);
                  setRevertBillConfirm(null);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition cursor-pointer shadow-sm"
              >
                Xác Nhận Đổi Về Chưa Nộp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HÀNG ĐỢI GỬI CHẬM ZALO TỰ ĐỘNG (GIÃN CÁCH 2-3 PHÚT CHỐNG SPAM) */}
      <ZaloBatchQueueModal
        isOpen={isZaloQueueOpen}
        onClose={() => setIsZaloQueueOpen(false)}
        title={zaloQueueTitle}
        initialItems={zaloQueueItems}
        onItemSentSuccess={(item) => {
          if (item.messageType === "TUITION") {
            sendTuitionBill(item.id, false);
          } else {
            sendTuitionReminder(item.id, false);
          }
        }}
        onAllCompleted={(count) => {
          showToast(`🎉 Đã hoàn thành gửi tự động Zalo cho ${count} phụ huynh học sinh!`);
        }}
        senderRole="ADMIN"
        senderName="Ms. Dung (Hotline Trung Tâm)"
        senderPhone="0964645174"
      />

      {/* MODAL CHỈNH SỬA TIN NHẮN ZALO TRƯỚC KHI GỬI (ĐƠN LẺ) */}
      {editZaloModal && (
        <EditZaloMessageModal
          isOpen={editZaloModal.isOpen}
          onClose={() => setEditZaloModal(null)}
          title={editZaloModal.type === "BILL" ? "Chỉnh Sửa Hóa Đơn Học Phí Zalo" : "Chỉnh Sửa Tin Nhắc Nhở Học Phí Zalo"}
          recipientName={students.find((s) => s.id === editZaloModal.bill.studentId)?.parentName || editZaloModal.bill.parentName}
          recipientPhone={students.find((s) => s.id === editZaloModal.bill.studentId)?.parentPhone || editZaloModal.bill.parentPhone}
          studentName={students.find((s) => s.id === editZaloModal.bill.studentId)?.fullName || editZaloModal.bill.studentName}
          className={editZaloModal.bill.className}
          initialContent={editZaloModal.initialContent}
          templateBadge={editZaloModal.type === "BILL" ? "Hóa Đơn Chi Tiết" : "Nhắc Nhở Đóng Phí"}
          onSend={handleConfirmSendEditedZalo}
        />
      )}
    </div>
  );
}
