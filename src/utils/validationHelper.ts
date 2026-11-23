/**
 * validationHelper.ts - Bộ hàm Thẩm Định Dữ Liệu & Kiểm Thử Logic Nghiệp Vụ
 * Hệ Thống Quản Lý Trung Tâm Tiếng Anh Ms. Dung Shiny
 */

import {
  getTodayDateString,
  getCurrentTimeHHmm,
  isPastDateTime,
  isMakeupClassPast,
  formatDisplayDate,
} from "./dateHelper";
import { isDateInMonth } from "./makeupHelper";
import { MakeupClass, StudentItem } from "@/data/centerData";

// ============================================================================
// 1. THẨM ĐỊNH THỜI GIAN & LỚP HỌC BÙ (TEMPORAL VALIDATION)
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Thẩm định điều kiện tạo / cập nhật Lớp học bù
 * - Thời gian diễn ra không được ở quá khứ
 * - Ngày diễn ra phải thuộc đúng tháng quản lý
 * - Thời lượng > 0 và giờ bắt đầu < giờ kết thúc
 */
export function validateMakeupClassCreation(params: {
  title: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  monthStr: string;
}): ValidationResult {
  if (!params.title || !params.title.trim()) {
    return {
      isValid: false,
      errorCode: "EMPTY_TITLE",
      errorMessage: "Tên lớp học bù không được để trống.",
    };
  }

  if (!params.dateStr) {
    return {
      isValid: false,
      errorCode: "EMPTY_DATE",
      errorMessage: "Vui lòng chọn ngày diễn ra lớp học bù.",
    };
  }

  // 1. Kiểm tra ngày có thuộc tháng đang xét không
  if (!isDateInMonth(params.dateStr, params.monthStr)) {
    return {
      isValid: false,
      errorCode: "DATE_NOT_IN_MONTH",
      errorMessage: `Ngày diễn ra (${formatDisplayDate(params.dateStr)}) không thuộc ${params.monthStr}. Lớp học bù phải diễn ra trong cùng tháng.`,
    };
  }

  // 2. Kiểm tra giờ bắt đầu & giờ kết thúc
  if (params.startTime >= params.endTime) {
    return {
      isValid: false,
      errorCode: "INVALID_TIME_RANGE",
      errorMessage: `Khung giờ không hợp lệ: Giờ bắt đầu (${params.startTime}) phải sớm hơn giờ kết thúc (${params.endTime}).`,
    };
  }

  // 3. Kiểm tra thời điểm diễn ra đã qua chưa
  if (isPastDateTime(params.dateStr, params.endTime)) {
    return {
      isValid: false,
      errorCode: "CLASS_IN_PAST",
      errorMessage: `Thời gian diễn ra lớp học bù (${formatDisplayDate(params.dateStr)} lúc ${params.endTime}) đã qua so với thời điểm hiện tại (${formatDisplayDate(getTodayDateString())} ${getCurrentTimeHHmm()})! Vui lòng chọn thời gian trong tương lai.`,
    };
  }

  return { isValid: true };
}

/**
 * Thẩm định điều kiện Xếp học sinh vào Lớp học bù
 * - Lớp học bù KHÔNG ĐƯỢC ở trong quá khứ (dateStr + endTime < now)
 * - Lớp học bù chưa bị Đã hoàn thành (COMPLETED) hoặc Đã hủy (CANCELLED)
 * - Học sinh chưa từng được xếp vào ca này với cùng ngày vắng
 */
export function validateMakeupClassAssignment(params: {
  targetClass: MakeupClass;
  student: StudentItem;
  absentDateStr: string;
}): ValidationResult {
  const { targetClass, student, absentDateStr } = params;

  // 1. Kiểm tra lớp học bù đã kết thúc / quá khứ hay chưa
  if (isMakeupClassPast(targetClass)) {
    return {
      isValid: false,
      errorCode: "MAKEUP_CLASS_EXPIRED",
      errorMessage: `Không thể xếp học sinh vào lớp học bù này!\nLớp "${targetClass.title}" đã kết thúc vào ngày ${formatDisplayDate(targetClass.dateStr)} (lúc ${targetClass.endTime}).\nVui lòng tạo hoặc chọn một lớp học bù diễn ra trong tương lai!`,
    };
  }

  // 2. Kiểm tra trạng thái lớp
  if (targetClass.status === "COMPLETED") {
    return {
      isValid: false,
      errorCode: "MAKEUP_CLASS_COMPLETED",
      errorMessage: `Lớp học bù "${targetClass.title}" đã hoàn thành điểm danh và kết thúc, không thể thêm học sinh mới.`,
    };
  }

  if (targetClass.status === "CANCELLED") {
    return {
      isValid: false,
      errorCode: "MAKEUP_CLASS_CANCELLED",
      errorMessage: `Lớp học bù "${targetClass.title}" đã bị hủy, không thể xếp học sinh.`,
    };
  }

  // 3. Kiểm tra học sinh đã có trong lớp bù cho buổi vắng này chưa
  const alreadyInClass = targetClass.students.some(
    (s) => s.studentId === student.id && s.absentDateStr === absentDateStr
  );
  if (alreadyInClass) {
    return {
      isValid: false,
      errorCode: "ALREADY_ASSIGNED",
      errorMessage: `Bé ${student.fullName} đã được xếp vào lớp bù "${targetClass.title}" cho buổi vắng ngày ${formatDisplayDate(absentDateStr)}.`,
    };
  }

  return { isValid: true };
}

// ============================================================================
// 2. THẨM ĐỊNH SỐ ĐIỆN THOẠI & KÊNH GỬI THÔNG BÁO
// ============================================================================

/**
 * Thẩm định số điện thoại chuẩn Việt Nam (10 số, bắt đầu bằng 03, 05, 07, 08, 09)
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: false, errorCode: "EMPTY_PHONE", errorMessage: "Số điện thoại không được để trống." };
  }

  const cleaned = phone.replace(/[^0-9]/g, "");
  const normalized = cleaned.startsWith("84") ? "0" + cleaned.slice(2) : cleaned;

  if (normalized.length !== 10) {
    return {
      isValid: false,
      errorCode: "INVALID_LENGTH",
      errorMessage: `Số điện thoại phải có đúng 10 chữ số (hiện có ${normalized.length} số).`,
    };
  }

  if (!/^(03|05|07|08|09)\d{8}$/.test(normalized)) {
    return {
      isValid: false,
      errorCode: "INVALID_PREFIX",
      errorMessage: "Đầu số điện thoại không hợp lệ tại Việt Nam (hỗ trợ 03, 05, 07, 08, 09).",
    };
  }

  return { isValid: true };
}

// ============================================================================
// 3. PHÂN BIỆT RÕ RÀNG KÊNH GỬI (ZALO VS NỘI BỘ HỆ THỐNG)
// ============================================================================

export type MessageDeliveryChannel = "ZALO" | "IN_APP" | "HYBRID";

export interface ChannelMeta {
  channel: MessageDeliveryChannel;
  title: string;
  badgeText: string;
  badgeClasses: string;
  description: string;
  actionText: string;
}

export function getDeliveryChannelMeta(channel: MessageDeliveryChannel, contextTitle?: string): ChannelMeta {
  switch (channel) {
    case "ZALO":
      return {
        channel: "ZALO",
        title: "Tin Nhắn Zalo Phụ Huynh",
        badgeText: "💬 KÊNH GỬI: TIN NHẮN ZALO TRỰC TIẾP",
        badgeClasses: "bg-emerald-100 text-emerald-900 border-emerald-300",
        description: "Bắn tin nhắn trực tiếp tới ứng dụng Zalo cá nhân của phụ huynh theo SĐT (không yêu cầu PH phải vào web).",
        actionText: contextTitle ? `💬 Gửi Zalo: ${contextTitle}` : "💬 Gửi Tin Nhắn Zalo",
      };
    case "IN_APP":
      return {
        channel: "IN_APP",
        title: "Cổng Phụ Huynh Nội Bộ",
        badgeText: "📲 KÊNH NỘI BỘ: CỔNG PHỤ HUYNH",
        badgeClasses: "bg-blue-100 text-blue-900 border-blue-300",
        description: "Phát hành thông báo và tài liệu lên Sổ liên lạc Cổng Phụ Huynh (PH đăng nhập vào web trung tâm để xem).",
        actionText: contextTitle ? `📲 Phát Hành Cổng App: ${contextTitle}` : "📲 Phát Hành Nội Bộ",
      };
    case "HYBRID":
    default:
      return {
        channel: "HYBRID",
        title: "Đa Kênh: Zalo + Cổng Phụ Huynh",
        badgeText: "⚡ ĐA KÊNH: ZALO + CỔNG PHỤ HUYNH",
        badgeClasses: "bg-gradient-to-r from-emerald-100 to-indigo-100 text-slate-900 border-indigo-300",
        description: "Tự động gửi tin nhắn Zalo tới SĐT phụ huynh, đồng thời lưu trữ và đồng bộ lên Sổ liên lạc Cổng Phụ Huynh.",
        actionText: contextTitle ? `⚡ Gửi Zalo & Đồng Bộ App: ${contextTitle}` : "⚡ Gửi Đa Kênh",
      };
  }
}

// ============================================================================
// 4. BỘ KIỂM THỬ TỰ ĐỘNG (UNIT TEST RUNNER TRONG HỆ THỐNG)
// ============================================================================

export interface TestReportItem {
  id: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  error?: string;
}

export interface SystemTestReport {
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestReportItem[];
}

/**
 * Chạy toàn bộ các ca kiểm thử thẩm định logic ngày tháng, lớp học bù, SĐT và kênh gửi
 */
export function runSystemValidationTests(): SystemTestReport {
  const results: TestReportItem[] = [];

  // TEST 1: Chặn xếp học sinh vào lớp học bù đã qua (ngày hôm qua)
  try {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const mockClass: MakeupClass = {
      id: "test-past-class",
      title: "Lớp Học Bù Hôm Qua",
      monthStr: "Tháng 11/2026",
      dateStr: yesterday,
      startTime: "18:00",
      endTime: "19:30",
      durationHours: 1.5,
      classroomId: "CR01",
      classroomName: "Phòng Shiny 1",
      teacherOrAssistantId: "STF01",
      teacherOrAssistantName: "Thầy Minh Đức",
      roleInCharge: "ASSISTANT",
      focusContent: "Ôn tập Unit 4",
      createdAt: new Date().toISOString(),
      students: [],
      status: "SCHEDULED",
    };
    const mockStudent: StudentItem = {
      id: "test-stu",
      studentCode: "STU999",
      fullName: "Nguyễn Văn Test",
      dob: "2018-01-01",
      gender: "Nam",
      parentName: "Mẹ Bé Test",
      parentPhone: "0912345678",
      parentEmail: "parent@test.com",
      monthlyFee: 1600000,
      tuitionStatus: "PAID",
      currentBillingMonth: "Tháng 11/2026",
      tuitionDueDate: "10/11/2026",
    };

    const res = validateMakeupClassAssignment({
      targetClass: mockClass,
      student: mockStudent,
      absentDateStr: yesterday,
    });

    results.push({
      id: "TEST_REJECT_PAST_MAKEUP_ASSIGNMENT",
      name: "Chặn xếp học sinh vào lớp học bù đã diễn ra (quá khứ)",
      passed: !res.isValid && res.errorCode === "MAKEUP_CLASS_EXPIRED",
      expected: "isValid = false (MAKEUP_CLASS_EXPIRED)",
      actual: `isValid = ${res.isValid} (${res.errorCode || "OK"})`,
    });
  } catch (e: any) {
    results.push({
      id: "TEST_REJECT_PAST_MAKEUP_ASSIGNMENT",
      name: "Chặn xếp học sinh vào lớp học bù đã diễn ra (quá khứ)",
      passed: false,
      expected: "isValid = false",
      actual: "Exception",
      error: e?.message,
    });
  }

  // TEST 2: Cho phép xếp học sinh vào lớp học bù trong tương lai
  try {
    const futureDate = new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0];
    const mockFutureClass: MakeupClass = {
      id: "test-future-class",
      title: "Lớp Học Bù Tuần Tới",
      monthStr: "Tháng 11/2026",
      dateStr: futureDate,
      startTime: "18:00",
      endTime: "19:30",
      durationHours: 1.5,
      classroomId: "CR01",
      classroomName: "Phòng Shiny 1",
      teacherOrAssistantId: "STF01",
      teacherOrAssistantName: "Thầy Minh Đức",
      roleInCharge: "ASSISTANT",
      focusContent: "Ôn tập Unit 5",
      createdAt: new Date().toISOString(),
      students: [],
      status: "SCHEDULED",
    };
    const mockStudent: StudentItem = {
      id: "test-stu",
      studentCode: "STU999",
      fullName: "Nguyễn Văn Test",
      dob: "2018-01-01",
      gender: "Nam",
      parentName: "Mẹ Bé Test",
      parentPhone: "0912345678",
      parentEmail: "parent@test.com",
      monthlyFee: 1600000,
      tuitionStatus: "PAID",
      currentBillingMonth: "Tháng 11/2026",
      tuitionDueDate: "10/11/2026",
    };

    const res = validateMakeupClassAssignment({
      targetClass: mockFutureClass,
      student: mockStudent,
      absentDateStr: getTodayDateString(),
    });

    results.push({
      id: "TEST_ALLOW_FUTURE_MAKEUP_ASSIGNMENT",
      name: "Cho phép xếp học sinh vào lớp học bù trong tương lai",
      passed: res.isValid,
      expected: "isValid = true",
      actual: `isValid = ${res.isValid}`,
    });
  } catch (e: any) {
    results.push({
      id: "TEST_ALLOW_FUTURE_MAKEUP_ASSIGNMENT",
      name: "Cho phép xếp học sinh vào lớp học bù trong tương lai",
      passed: false,
      expected: "isValid = true",
      actual: "Exception",
      error: e?.message,
    });
  }

  // TEST 3: Chặn tạo lớp học bù trong quá khứ
  try {
    const res = validateMakeupClassCreation({
      title: "Lớp bù quá khứ",
      dateStr: "2020-01-01",
      startTime: "17:00",
      endTime: "18:30",
      monthStr: "Tháng 01/2020",
    });

    results.push({
      id: "TEST_REJECT_CREATE_PAST_CLASS",
      name: "Chặn tạo lớp học bù với ngày giờ trong quá khứ",
      passed: !res.isValid && res.errorCode === "CLASS_IN_PAST",
      expected: "isValid = false (CLASS_IN_PAST)",
      actual: `isValid = ${res.isValid} (${res.errorCode || "OK"})`,
    });
  } catch (e: any) {
    results.push({
      id: "TEST_REJECT_CREATE_PAST_CLASS",
      name: "Chặn tạo lớp học bù với ngày giờ trong quá khứ",
      passed: false,
      expected: "isValid = false",
      actual: "Exception",
      error: e?.message,
    });
  }

  // TEST 4: Thẩm định SĐT hợp lệ và không hợp lệ
  try {
    const validRes = validatePhoneNumber("0912345678");
    const validDashedRes = validatePhoneNumber("0912-345-678");
    const invalidLengthRes = validatePhoneNumber("091234");
    const invalidPrefixRes = validatePhoneNumber("0123456789");

    const passed =
      validRes.isValid &&
      validDashedRes.isValid &&
      !invalidLengthRes.isValid &&
      invalidLengthRes.errorCode === "INVALID_LENGTH" &&
      !invalidPrefixRes.isValid &&
      invalidPrefixRes.errorCode === "INVALID_PREFIX";

    results.push({
      id: "TEST_VALIDATE_PHONE_NUMBER",
      name: "Thẩm định định dạng số điện thoại Việt Nam chuẩn",
      passed,
      expected: "Đúng 10 số, đầu 03/05/07/08/09 (hỗ trợ dấu gạch nối)",
      actual: passed ? "Hợp lệ tuyệt đối" : "Thất bại",
    });
  } catch (e: any) {
    results.push({
      id: "TEST_VALIDATE_PHONE_NUMBER",
      name: "Thẩm định định dạng số điện thoại Việt Nam chuẩn",
      passed: false,
      expected: "Passed",
      actual: "Exception",
      error: e?.message,
    });
  }

  // TEST 5: Chặn tạo lớp bù có khung giờ bắt đầu >= kết thúc
  try {
    const res = validateMakeupClassCreation({
      title: "Lớp bù giờ sai",
      dateStr: "2026-11-25",
      startTime: "19:00",
      endTime: "18:00",
      monthStr: "Tháng 11/2026",
    });

    results.push({
      id: "TEST_REJECT_INVALID_TIME_RANGE",
      name: "Chặn tạo lớp học bù nếu giờ bắt đầu >= giờ kết thúc",
      passed: !res.isValid && res.errorCode === "INVALID_TIME_RANGE",
      expected: "isValid = false (INVALID_TIME_RANGE)",
      actual: `isValid = ${res.isValid} (${res.errorCode || "OK"})`,
    });
  } catch (e: any) {
    results.push({
      id: "TEST_REJECT_INVALID_TIME_RANGE",
      name: "Chặn tạo lớp học bù nếu giờ bắt đầu >= giờ kết thúc",
      passed: false,
      expected: "isValid = false",
      actual: "Exception",
      error: e?.message,
    });
  }

  // TEST 6: Chặn tạo lớp bù có ngày nằm ngoài tháng quản lý
  try {
    const res = validateMakeupClassCreation({
      title: "Lớp bù tháng 12 trong view tháng 11",
      dateStr: "2026-12-05",
      startTime: "17:00",
      endTime: "18:30",
      monthStr: "Tháng 11/2026",
    });

    results.push({
      id: "TEST_REJECT_DATE_OUTSIDE_MONTH",
      name: "Chặn tạo lớp học bù nếu ngày không thuộc tháng đang quản lý",
      passed: !res.isValid && res.errorCode === "DATE_NOT_IN_MONTH",
      expected: "isValid = false (DATE_NOT_IN_MONTH)",
      actual: `isValid = ${res.isValid} (${res.errorCode || "OK"})`,
    });
  } catch (e: any) {
    results.push({
      id: "TEST_REJECT_DATE_OUTSIDE_MONTH",
      name: "Chặn tạo lớp học bù nếu ngày không thuộc tháng đang quản lý",
      passed: false,
      expected: "isValid = false",
      actual: "Exception",
      error: e?.message,
    });
  }

  // TEST 7: Chặn xếp trùng học sinh đã có trong lớp bù
  try {
    const futureDate = new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0];
    const existingStudentClass: MakeupClass = {
      id: "test-dup-class",
      title: "Lớp Đã Có Học Sinh",
      monthStr: "Tháng 11/2026",
      dateStr: futureDate,
      startTime: "18:00",
      endTime: "19:30",
      durationHours: 1.5,
      classroomId: "CR01",
      classroomName: "Phòng Shiny 1",
      teacherOrAssistantId: "STF01",
      teacherOrAssistantName: "Thầy Minh Đức",
      roleInCharge: "ASSISTANT",
      focusContent: "Ôn tập",
      createdAt: new Date().toISOString(),
      students: [
        {
          studentId: "stu-dup-1",
          studentName: "Nguyễn Văn Trùng",
          studentCode: "STU888",
          originalClassId: "CLS01",
          originalClassName: "Lớp Starters 1",
          parentName: "Mẹ Trùng",
          parentPhone: "0912345678",
          absentDateStr: "2026-11-10",
          attendanceStatus: "REGISTERED",
        },
      ],
      status: "SCHEDULED",
    };

    const res = validateMakeupClassAssignment({
      targetClass: existingStudentClass,
      student: {
        id: "stu-dup-1",
        studentCode: "STU888",
        fullName: "Nguyễn Văn Trùng",
        dob: "2018-01-01",
        gender: "Nam",
        parentName: "Mẹ Trùng",
        parentPhone: "0912345678",
        monthlyFee: 1600000,
        tuitionStatus: "PAID",
      } as any,
      absentDateStr: "2026-11-10",
    });

    results.push({
      id: "TEST_REJECT_DUPLICATE_ASSIGNMENT",
      name: "Chặn xếp trùng học sinh đã có trong lớp bù cho cùng ngày vắng",
      passed: !res.isValid && res.errorCode === "ALREADY_ASSIGNED",
      expected: "isValid = false (ALREADY_ASSIGNED)",
      actual: `isValid = ${res.isValid} (${res.errorCode || "OK"})`,
    });
  } catch (e: any) {
    results.push({
      id: "TEST_REJECT_DUPLICATE_ASSIGNMENT",
      name: "Chặn xếp trùng học sinh đã có trong lớp bù cho cùng ngày vắng",
      passed: false,
      expected: "isValid = false",
      actual: "Exception",
      error: e?.message,
    });
  }

  // TEST 8: Thẩm định phân biệt 2 kênh gửi tin (Zalo vs In-App)
  try {
    const zaloMeta = getDeliveryChannelMeta("ZALO");
    const appMeta = getDeliveryChannelMeta("IN_APP");
    const passed =
      zaloMeta.channel === "ZALO" &&
      zaloMeta.badgeText.includes("ZALO") &&
      appMeta.channel === "IN_APP" &&
      appMeta.badgeText.includes("CỔNG PHỤ HUYNH");

    results.push({
      id: "TEST_DELIVERY_CHANNEL_METADATA",
      name: "Phân biệt rạch ròi kênh Zalo bên ngoài vs Kênh Nội bộ Cổng Phụ Huynh",
      passed,
      expected: "Zalo có badge ZALO, Cổng App có badge CỔNG PHỤ HUYNH",
      actual: passed ? "Phân định chuẩn 100%" : "Thất bại",
    });
  } catch (e: any) {
    results.push({
      id: "TEST_DELIVERY_CHANNEL_METADATA",
      name: "Phân biệt rạch ròi kênh Zalo bên ngoài vs Kênh Nội bộ Cổng Phụ Huynh",
      passed: false,
      expected: "Passed",
      actual: "Exception",
      error: e?.message,
    });
  }

  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.length - passedTests;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
  };
}
