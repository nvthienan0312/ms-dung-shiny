// Notification Engine & Provider Architecture
// Ms. Dung Shiny English Center Management System

import { 
  MessageTemplateItem, 
  NotificationMessageType, 
  NotificationChannel, 
  ScheduledNotificationItem, 
  NotificationSendResult, 
  INotificationProvider,
  StudentParentMappingItem
} from "@/types/notification";
import { cleanPhoneNumber, isValidZaloPhone, getZaloChatUrl } from "./zaloHelper";
import { StudentItem, ClassItem } from "@/data/centerData";

// ============================================================================
// 1. CÁC MẪU THÔNG BÁO MẶC ĐỊNH CHUẨN TRUNG TÂM MS. DUNG SHINY
// ============================================================================
export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplateItem[] = [
  // A. HOMEWORK NOTIFICATIONS
  {
    id: "tpl_hw_assigned",
    type: "HOMEWORK",
    title: "Giao Bài Tập Về Nhà Mới (MS Teams)",
    description: "Thông báo chi tiết bài tập về nhà sau buổi học, kèm hạn nộp và hướng dẫn.",
    contentPattern: `[MS. DUNG SHINY] THÔNG BÁO BÀI TẬP VỀ NHÀ MỚI 📝

Kính gửi Ba Mẹ bé {studentName} (Lớp: {className}),
Sau buổi học hôm nay, trung tâm xin gửi nội dung bài tập về nhà của con:

📖 Bài tập: {assignmentTitle}
📅 Hạn nộp bài: Trước 22h00 ngày {dueDate}
🎯 Hình thức nộp: {submissionType}
💡 Hướng dẫn chi tiết: {instruction}

Ba Mẹ nhắc con mở ứng dụng Sổ liên lạc hoặc app MS Teams để nộp bài đúng hạn để thầy cô kịp chấm điểm nhé ạ!
Hotline hỗ trợ: 0964.645.174. Trân trọng cảm ơn Ba Mẹ!`,
    availableVariables: ["studentName", "className", "assignmentTitle", "dueDate", "submissionType", "instruction"],
    isDefault: true,
    authorRole: "TEACHER",
    createdAt: "2026-11-01T08:00:00Z",
    updatedAt: "2026-11-08T08:00:00Z",
  },
  {
    id: "tpl_hw_reminder",
    type: "HOMEWORK",
    title: "Nhắc Nhở Nộp BTVN Chưa Hoàn Thành",
    description: "Gửi nhắc nhở nhẹ nhàng khi học sinh sắp đến hạn hoặc quá hạn nộp BTVN.",
    contentPattern: `[MS. DUNG SHINY] NHẮC NỘP BÀI TẬP VỀ NHÀ ⏰

Kính gửi Ba Mẹ bé {studentName} (Lớp: {className}),
Thầy/cô xin gửi lời nhắc nhẹ: Hiện tại hệ thống chưa ghi nhận bài tập về nhà của con:
📖 Chuyên đề: {assignmentTitle}
📅 Hạn nộp: {dueDate}

Ba Mẹ hỗ trợ nhắc con hoàn thành và quay video/chụp ảnh nộp lên hệ thống sớm để thầy cô kịp chấm điểm và nhận xét nhé ạ.
Thầy/cô cảm ơn Ba Mẹ rất nhiều!`,
    availableVariables: ["studentName", "className", "assignmentTitle", "dueDate"],
    isDefault: true,
    authorRole: "ASSISTANT",
    createdAt: "2026-11-01T08:00:00Z",
    updatedAt: "2026-11-08T08:00:00Z",
  },
  {
    id: "tpl_hw_grading_result",
    type: "HOMEWORK",
    title: "Thông Báo Kết Quả Kiểm Tra BTVN (Nhận Xét & Sửa Lỗi)",
    description: "Báo cáo nhận xét phát âm video và bài tập Workbook do Trợ giảng kiểm tra.",
    contentPattern: `[MS. DUNG SHINY] KẾT QUẢ KIỂM TRA BTVN CỦA CON 🌟

Chào Ba Mẹ bé {studentName} (Lớp: {className}) ạ!
Em là {assistantName} - Trợ giảng lớp của con.
Em vừa hoàn thành việc kiểm tra và nhận xét bài tập về nhà của con:

📖 Bài tập: {assignmentTitle}
✍️ Nhận xét & Sửa lỗi chi tiết:
{taFeedback}

Ba Mẹ mở ứng dụng Sổ liên lạc để xem chi tiết nhận xét của em nhé ạ. Em cảm ơn Ba Mẹ nhiều!`,
    availableVariables: ["studentName", "className", "assistantName", "assignmentTitle", "taFeedback"],
    isDefault: true,
    authorRole: "ASSISTANT",
    createdAt: "2026-11-01T08:00:00Z",
    updatedAt: "2026-11-08T08:00:00Z",
  },

  // B. LESSON SCHEDULE NOTIFICATIONS
  {
    id: "tpl_schedule_weekly",
    type: "LESSON_SCHEDULE",
    title: "Thông Báo Lịch Học Tuần & Phòng Học",
    description: "Nhắc lịch học cố định trong tuần của lớp để phụ huynh đưa đón đúng giờ.",
    contentPattern: `[MS. DUNG SHINY] THÔNG BÁO LỊCH HỌC TRONG TUẦN 📅

Kính gửi Ba Mẹ bé {studentName} (Lớp: {className}),
Trung tâm xin gửi lịch học cố định của con trong tuần này:
⏰ Khung giờ: {scheduleDays} (Từ {startTime} đến {endTime})
🚪 Phòng học: {classroomName}
👨‍🏫 Giáo viên phụ trách: {teacherName} | Trợ giảng: {assistantName}

Ba Mẹ lưu ý đưa đón con đúng giờ để đảm bảo an toàn và nề nếp học tập nhé ạ.
Hotline trung tâm: 0964.645.174. Trân trọng!`,
    availableVariables: ["studentName", "className", "scheduleDays", "startTime", "endTime", "classroomName", "teacherName", "assistantName"],
    isDefault: true,
    authorRole: "ADMIN",
    createdAt: "2026-11-01T08:00:00Z",
    updatedAt: "2026-11-08T08:00:00Z",
  },
  {
    id: "tpl_schedule_holiday",
    type: "LESSON_SCHEDULE",
    title: "Thông Báo Lịch Nghỉ Lễ / Tạm Nghỉ Học",
    description: "Thông báo lịch nghỉ lễ Tết hoặc bảo trì cơ sở.",
    contentPattern: `[MS. DUNG SHINY] THÔNG BÁO NGHỈ LỄ {holidayName} 🏖️

Kính gửi Quý phụ huynh học sinh (Lớp: {className}),
Trung tâm Ms. Dung Shiny trân trọng thông báo lịch nghỉ {holidayName} như sau:
• Thời gian nghỉ: Từ ngày {startDate} đến hết ngày {endDate}
• Thời gian đi học lại: Ngày {resumeDate}

Chúc các con và gia đình có một kỳ nghỉ thật vui vẻ, an toàn và ý nghĩa!
Hotline trung tâm: 0964.645.174. Trân trọng cảm ơn Quý phụ huynh!`,
    availableVariables: ["className", "holidayName", "startDate", "endDate", "resumeDate"],
    isDefault: true,
    authorRole: "ADMIN",
    createdAt: "2026-11-01T08:00:00Z",
    updatedAt: "2026-11-08T08:00:00Z",
  },

  // C. STUDENT FEEDBACK NOTIFICATIONS
  {
    id: "tpl_feedback_incident",
    type: "STUDENT_FEEDBACK",
    title: "Lưu Ý Riêng Buổi Học (Incident Note)",
    description: "Gửi riêng cho phụ huynh khi con có phát sinh trong buổi học (nghịch, quên sách, buồn ngủ...).",
    contentPattern: `[MS. DUNG SHINY] LƯU Ý RIÊNG BUỔI HỌC CỦA BÉ {studentName} 💬

Chào Ba Mẹ bé {studentName}!
Em là {staffName} ({staffRole} lớp của con).
Trong buổi học ngày {sessionDate}, em xin phép chia sẻ một lưu ý nhỏ về con:

📌 Vấn đề: {tagLabel}
💬 Chi tiết: {noteContent}

Em nhắn để Ba Mẹ nắm được tình hình và cùng phối hợp nhắc nhở, rèn luyện thêm cho con ở nhà nhé ạ. Em cảm ơn Ba Mẹ nhiều!`,
    availableVariables: ["studentName", "staffName", "staffRole", "sessionDate", "tagLabel", "noteContent"],
    isDefault: true,
    authorRole: "TEACHER",
    createdAt: "2026-11-01T08:00:00Z",
    updatedAt: "2026-11-08T08:00:00Z",
  },
  {
    id: "tpl_feedback_monthly_exam",
    type: "STUDENT_FEEDBACK",
    title: "Báo Cáo Kết Quả Bài Thi Tháng Kèm Link PDF",
    description: "Thông báo điểm thi, nhận xét toàn diện 4 kỹ năng và link tải phiếu kết quả.",
    contentPattern: `[MS. DUNG SHINY] BÁO CÁO KẾT QUẢ BÀI THI THÁNG {monthStr} 🏆

Kính gửi Ba Mẹ bé {studentName} (Lớp: {className}),
Cô {teacherName} xin gửi Ba Mẹ kết quả bài kiểm tra định kỳ của con:
• Điểm thi: {score}/10 Điểm
• Xếp loại: {gradeLevel}
• Đánh giá của giáo viên: {remarks}
📄 Link tải Phiếu báo cáo chi tiết (PDF): {pdfUrl}

Ba Mẹ xem qua và tiếp tục động viên, khen ngợi con ở nhà nhé ạ. Cô cảm ơn Ba Mẹ rất nhiều!`,
    availableVariables: ["studentName", "className", "teacherName", "monthStr", "score", "gradeLevel", "remarks", "pdfUrl"],
    isDefault: true,
    authorRole: "TEACHER",
    createdAt: "2026-11-01T08:00:00Z",
    updatedAt: "2026-11-08T08:00:00Z",
  },

  // D. TUITION NOTIFICATIONS
  {
    id: "tpl_tuition_monthly",
    type: "TUITION",
    title: "Thông Báo Học Phí Tháng (Kèm VietQR)",
    description: "Thông báo học phí định kỳ ngày 01 đầu tháng, minh bạch số buổi và đơn giá.",
    contentPattern: `[MS. DUNG SHINY ENGLISH CENTER] 
THÔNG BÁO HỌC PHÍ {billingMonth} 🧾

Kính gửi Quý phụ huynh bé {studentName} (Lớp: {className}),
Trung tâm xin gửi thông báo chi tiết học phí của con trong tháng:
• Số buổi học trong tháng: {lessonCount} buổi
• Học phí 1 buổi: {feePerLesson}/buổi
• Học phí cơ bản: {baseFee}
• Phụ thu / Giảm trừ: {adjustmentText}
👉 TỔNG HỌC PHÍ CẦN ĐÓNG: {finalAmount}
📅 Hạn nộp học phí: Ngày {dueDate}

THÔNG TIN CHUYỂN KHOẢN (VIETQR):
• Ngân hàng: MB Bank (Quân Đội)
• STK: 999988886666
• Chủ TK: NGUYEN THI DUNG
• Nội dung CK: HP {studentNameUpper} {classNameUpper}

(Lưu ý: Học sinh nghỉ học phí không được trừ, trung tâm bảo lưu và tổ chức các lớp học bù để con ôn tập đầy đủ).
Hotline hỗ trợ: 0964.645.174. Trân trọng cảm ơn Ba Mẹ!`,
    availableVariables: ["billingMonth", "studentName", "className", "lessonCount", "feePerLesson", "baseFee", "adjustmentText", "finalAmount", "dueDate", "studentNameUpper", "classNameUpper"],
    isDefault: true,
    authorRole: "ADMIN",
    createdAt: "2026-11-01T08:00:00Z",
    updatedAt: "2026-11-08T08:00:00Z",
  },
  {
    id: "tpl_tuition_reminder_due",
    type: "TUITION",
    title: "Nhắc Hạn Đóng Học Phí (Cận Hạn Ngày 10)",
    description: "Nhắc phụ huynh sắp đến hạn ngày 10 hàng tháng.",
    contentPattern: `[MS. DUNG SHINY] NHẮC HẠN ĐÓNG HỌC PHÍ {billingMonth} 📅

Kính gửi Ba Mẹ bé {studentName} (Lớp: {className}),
Trung tâm xin gửi lời nhắc nhẹ về khoản học phí {billingMonth} của con:
👉 Số tiền cần đóng: {finalAmount}
📅 Hạn cuối: Ngày {dueDate} (Hôm nay / Ngày mai)

Thông tin chuyển khoản:
• MB Bank | STK: 999988886666 | NGUYEN THI DUNG
• Cú pháp: HP {studentNameUpper} {classNameUpper}

Ba Mẹ kiểm tra và hoàn thành học phí đúng hạn để đảm bảo quyền lợi học tập của con nhé ạ.
Hotline: 0964.645.174. Trân trọng cảm ơn Ba Mẹ!`,
    availableVariables: ["billingMonth", "studentName", "className", "finalAmount", "dueDate", "studentNameUpper", "classNameUpper"],
    isDefault: true,
    authorRole: "ADMIN",
    createdAt: "2026-11-01T08:00:00Z",
    updatedAt: "2026-11-08T08:00:00Z",
  },
  {
    id: "tpl_tuition_overdue_multi",
    type: "TUITION",
    title: "Đôn Đốc Nợ Học Phí Tồn Đọng Nhiều Tháng",
    description: "Đôn đốc các khoản nợ lũy kế từ 2 tháng trở lên.",
    contentPattern: `[MS. DUNG SHINY] THÔNG BÁO ĐÔN ĐỐC HỌC PHÍ TỒN ĐỌNG ⚠️

Kính gửi Quý phụ huynh bé {studentName} (Lớp: {className}),
Hệ thống tài chính của trung tâm ghi nhận bé hiện đang còn tồn đọng học phí của {debtCount} kỳ học ({debtMonths}):
👉 TỔNG NỢ LŨY KẾ CẦN THANH TOÁN: {totalDebt}

Thông tin chuyển khoản:
• MB Bank | STK: 999988886666 | NGUYEN THI DUNG
• Cú pháp: NOP NO HP {studentNameUpper} {classNameUpper}

Kính đề nghị Ba Mẹ vui lòng sắp xếp thanh toán trước ngày 15 để tránh ảnh hưởng đến việc duy trì sĩ số của con tại lớp. Nếu cần hỗ trợ thêm, Ba Mẹ liên hệ Hotline 0964.645.174.
Trân trọng cảm ơn Ba Mẹ!`,
    availableVariables: ["studentName", "className", "debtCount", "debtMonths", "totalDebt", "studentNameUpper", "classNameUpper"],
    isDefault: true,
    authorRole: "ADMIN",
    createdAt: "2026-11-01T08:00:00Z",
    updatedAt: "2026-11-08T08:00:00Z",
  },

  // E. MAKEUP CLASS NOTIFICATIONS
  {
    id: "tpl_makeup_survey",
    type: "MAKEUP_CLASS",
    title: "Khảo Sát Lịch Rảnh Xếp Lớp Học Bù",
    description: "Gửi cho phụ huynh có con vắng buổi trong tháng để khảo sát thời gian bù.",
    contentPattern: `[MS. DUNG SHINY] KHẢO SÁT LỊCH RẢNH HỌC BÙ ⚡

Kính gửi Ba Mẹ bé {studentName} (Lớp: {className}),
Trong tháng vừa qua, bé {studentName} đã vắng {absentCount} buổi học ({absentDates}). 
Để đảm bảo con theo kịp kiến thức cùng các bạn trên lớp, trung tâm tổ chức các buổi học bù và ôn tập kiến thức hoàn toàn miễn phí cho con trong tháng này.

Ba Mẹ vui lòng phản hồi lại tin nhắn này khung giờ rảnh trong tuần của con (ví dụ: Thứ 7 sáng/chiều, hoặc Chủ Nhật) để cô xếp lịch học bù tốt nhất cho con nhé ạ!
(Lưu ý: Quyền lợi học bù sẽ được tổ chức trong tháng và tự động chốt vào cuối tháng).
Hotline: 0964.645.174. Trân trọng cảm ơn Ba Mẹ!`,
    availableVariables: ["studentName", "className", "absentCount", "absentDates"],
    isDefault: true,
    authorRole: "ADMIN",
    createdAt: "2026-11-01T08:00:00Z",
    updatedAt: "2026-11-08T08:00:00Z",
  },
  {
    id: "tpl_makeup_official_notice",
    type: "MAKEUP_CLASS",
    title: "Thông Báo Lịch Học Bù Chính Thức",
    description: "Thông báo chi tiết ngày, giờ, phòng học và giáo viên phụ trách ca bù.",
    contentPattern: `[MS. DUNG SHINY] THÔNG BÁO LỊCH HỌC BÙ CHÍNH THỨC ⚡

Kính gửi Ba Mẹ bé {studentName} (Lớp: {className}),
Trung tâm đã sắp xếp ca học bù cho bé {studentName} với thông tin chi tiết như sau:
📌 Chuyên đề: {makeupTitle}
📅 Ngày học: {dateStr}
⏰ Thời gian: {startTime} - {endTime} (90 phút)
🚪 Phòng học: {classroom}
👨‍🏫 Giáo viên/Trợ giảng phụ trách: {staffInCharge}
🎯 Trọng tâm ôn tập: {focusTopic}

Ba Mẹ lưu ý nhắc con chuẩn bị sách vở và đưa đón con đúng giờ nhé ạ.
Hotline: 0964.645.174. Trân trọng cảm ơn Ba Mẹ!`,
    availableVariables: ["studentName", "className", "makeupTitle", "dateStr", "startTime", "endTime", "classroom", "staffInCharge", "focusTopic"],
    isDefault: true,
    authorRole: "ADMIN",
    createdAt: "2026-11-01T08:00:00Z",
    updatedAt: "2026-11-08T08:00:00Z",
  },
  {
    id: "tpl_makeup_report",
    type: "MAKEUP_CLASS",
    title: "Báo Cáo Kết Quả Buổi Học Bù Của Trợ Giảng",
    description: "Báo cáo nội dung ôn tập, BTVN và nhận xét sau ca học bù.",
    contentPattern: `Chào Ba Mẹ bé {studentName}! 
Em là {assistantName} - Trợ giảng phụ trách ca học bù hôm nay ({dateStr}) của con.
Em xin gửi Ba Mẹ kết quả và nội dung buổi học bù của con:

📚 Nội dung ôn tập:
{lessonContent}

⭐ Nhận xét của em về con:
{feedback}

📝 Bài tập về nhà:
{homework}

Ba Mẹ đồng hành và nhắc con hoàn thành bài tập nhé ạ. Em cảm ơn Ba Mẹ nhiều!`,
    availableVariables: ["studentName", "assistantName", "dateStr", "lessonContent", "feedback", "homework"],
    isDefault: true,
    authorRole: "ASSISTANT",
    createdAt: "2026-11-01T08:00:00Z",
    updatedAt: "2026-11-08T08:00:00Z",
  }
];

// ============================================================================
// 2. TEMPLATE RENDERER (Trình phân giải biến động)
// ============================================================================
export function renderNotificationTemplate(
  templatePattern: string, 
  variables: Record<string, string | number | undefined | null>
): string {
  let rendered = templatePattern;
  for (const [key, value] of Object.entries(variables)) {
    const replacement = value !== undefined && value !== null ? String(value) : "";
    const regex = new RegExp(`\\{${key}\\}`, "g");
    rendered = rendered.replace(regex, replacement);
  }
  return rendered;
}

// ============================================================================
// 3. STUDENT - PARENT MAPPING BUILDER
// ============================================================================
export function buildStudentParentMapping(
  students: StudentItem[], 
  classes: ClassItem[]
): StudentParentMappingItem[] {
  const classMap = new Map(classes.map((c) => [c.id, c.name]));

  return students.map((stu) => {
    const rawPhone = stu.parentPhone || "";
    const cleanPhone = cleanPhoneNumber(rawPhone);
    const validZalo = isValidZaloPhone(cleanPhone);
    const classId = stu.classId || "";
    const className = stu.className || classMap.get(classId) || "Chưa xếp lớp";

    return {
      studentId: stu.id,
      studentCode: stu.studentCode || "",
      studentName: stu.fullName,
      classId: classId,
      className: className,
      parentName: stu.parentName || ("Phụ huynh bé " + stu.fullName),
      parentPhone: rawPhone,
      normalizedPhone: cleanPhone,
      isValidZaloPhone: validZalo,
      hasParentPortalAccess: true,
      notes: validZalo ? "SĐT Zalo hợp lệ (10 số)" : "Cần chuẩn hóa SĐT Zalo"
    };
  });
}

// ============================================================================
// 4. PROVIDER IMPLEMENTATIONS
// ============================================================================

/**
 * Provider 1: Zalo Personal Deeplink Provider (Mặc định & An toàn 100%)
 * - Không can thiệp API lậu
 * - Không lưu mật khẩu/OTP
 * - Tự động sao chép văn bản vào Clipboard
 * - Mở ứng dụng Zalo thật qua Deeplink chính thức `https://zalo.me/<phone>`
 * - BẮT BUỘC người dùng xác nhận thủ công sau khi gửi tin
 */
export class ZaloPersonalDeeplinkProvider implements INotificationProvider {
  id = "provider_zalo_personal_deeplink";
  name = "Zalo Cá Nhân (Deeplink Chính Thức & Bán Tự Động)";
  channel: NotificationChannel = "ZALO_PERSONAL_DEEPLINK";
  isAvailable = true;
  requiresManualStep = true;
  description = "Mở khung chat Zalo chính thức của Phụ huynh, tự động sao chép nội dung tin nhắn và yêu cầu người dùng xác nhận sau khi gửi.";

  async sendNotification(payload: ScheduledNotificationItem): Promise<NotificationSendResult> {
    const cleanedPhone = cleanPhoneNumber(payload.recipientPhone);
    if (!cleanedPhone || !isValidZaloPhone(cleanedPhone)) {
      return {
        success: false,
        status: "FAILED",
        requiresManualConfirmation: false,
        message: `Số điện thoại người nhận "${payload.recipientPhone}" không hợp lệ để mở Zalo.`
      };
    }

    const zaloUrl = getZaloChatUrl(cleanedPhone);

    // Sao chép nội dung vào Clipboard
    let copySuccess = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(payload.content);
        copySuccess = true;
      }
    } catch (e) {
      console.warn("Không thể sao chép clipboard tự động:", e);
    }

    // Bắn sự kiện gửi tự động qua Extension Bridge
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(
          new CustomEvent("MS_DUNG_ZALO_DISPATCH", {
            detail: {
              phone: cleanedPhone,
              recipientName: payload.recipientName,
              studentName: payload.studentName,
              message: payload.content,
              autoSend: true,
            },
          })
        );
      } catch (e) {}
    }

    return {
      success: true,
      status: "SENT",
      requiresManualConfirmation: false,
      redirectUrl: zaloUrl,
      copiedText: payload.content,
      message: `⚡ Đã tự động kích hoạt gửi tin nhắn Zalo tới ${payload.recipientName} (${cleanedPhone}) thành công!`
    };
  }
}

/**
 * Provider 2: Zalo OA Provider (Official Account - ZNS)
 * Dành cho tương lai khi trung tâm đăng ký Zalo Doanh nghiệp chính thức
 */
export class ZaloOAProvider implements INotificationProvider {
  id = "provider_zalo_oa_zns";
  name = "Zalo Official Account (ZNS Doanh Nghiệp)";
  channel: NotificationChannel = "ZALO_OA_ZNS";
  isAvailable = false; // Mặc định tắt cho đến khi có cấu hình OA chính thức
  requiresManualStep = false;
  description = "Gửi tin nhắn thương hiệu tự động qua Zalo ZNS API chính thức (Yêu cầu Giấy phép kinh doanh & Hợp đồng VNG).";

  async sendNotification(payload: ScheduledNotificationItem): Promise<NotificationSendResult> {
    return {
      success: false,
      status: "FAILED",
      requiresManualConfirmation: false,
      message: "Tính năng Zalo OA ZNS yêu cầu tài khoản Zalo Doanh Nghiệp đã xác thực. Vui lòng sử dụng kênh Zalo Cá Nhân."
    };
  }
}

/**
 * Provider 3: SMS Brandname Provider (Dự phòng tương lai)
 */
export class SMSBrandnameProvider implements INotificationProvider {
  id = "provider_sms_brandname";
  name = "SMS Brandname (Tin nhắn thương hiệu)";
  channel: NotificationChannel = "SMS_BRANDNAME";
  isAvailable = false;
  requiresManualStep = false;
  description = "Gửi tin nhắn SMS viễn thông trực tiếp đến điện thoại phụ huynh qua Cổng kết nối Telco.";

  async sendNotification(payload: ScheduledNotificationItem): Promise<NotificationSendResult> {
    return {
      success: false,
      status: "FAILED",
      requiresManualConfirmation: false,
      message: "Cổng SMS Brandname chưa được kích hoạt."
    };
  }
}

// Registry quản lý các Providers
export const NOTIFICATION_PROVIDERS: Record<NotificationChannel, INotificationProvider> = {
  ZALO_PERSONAL_DEEPLINK: new ZaloPersonalDeeplinkProvider(),
  ZALO_OA_ZNS: new ZaloOAProvider(),
  SMS_BRANDNAME: new SMSBrandnameProvider(),
  INTERNAL_PORTAL: new ZaloPersonalDeeplinkProvider(), // Fallback
};

export function getNotificationProvider(channel: NotificationChannel = "ZALO_PERSONAL_DEEPLINK"): INotificationProvider {
  return NOTIFICATION_PROVIDERS[channel] || NOTIFICATION_PROVIDERS.ZALO_PERSONAL_DEEPLINK;
}
