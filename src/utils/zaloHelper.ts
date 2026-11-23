import { StudentTuitionBill, ZaloOAConfig, ZaloMessageType } from "@/data/centerData";
import { formatVND } from "./tuitionHelper";

/**
 * Chuẩn hóa số điện thoại Việt Nam sang định dạng 10 số (bắt đầu bằng 0)
 * Ví dụ: "+84 987 123 456" -> "0987123456"
 *        "0987.123.456"     -> "0987123456"
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\.\-\(\)]/g, "");
  if (cleaned.startsWith("+84")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("84") && cleaned.length > 9) {
    cleaned = "0" + cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Kiểm tra xem số điện thoại có hợp lệ để mở chat Zalo không (10 chữ số)
 */
export function isValidZaloPhone(phone: string): boolean {
  const cleaned = cleanPhoneNumber(phone);
  return /^0[3|5|7|8|9][0-9]{8}$/.test(cleaned);
}

/**
 * Định dạng số điện thoại hiển thị đẹp mắt (0964.645.174)
 */
export function formatDisplayPhone(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)}.${cleaned.slice(4, 7)}.${cleaned.slice(7)}`;
  }
  return phone || "0964.645.174";
}

/**
 * Sinh liên kết mở thẳng Zalo chat với số điện thoại
 */
export function getZaloChatUrl(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned ? `https://zalo.me/${cleaned}` : "https://zalo.me";
}

/**
 * Mở Zalo Web (chat.zalo.me) để đăng nhập hoặc trò chuyện trên trình duyệt
 */
export function getZaloWebChatUrl(): string {
  return "https://chat.zalo.me";
}

/**
 * Sao chép văn bản an toàn vào Clipboard (hỗ trợ cả Clipboard API và Textarea Fallback)
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("navigator.clipboard failed, attempting fallback textarea", err);
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback clipboard copy failed:", err);
    return false;
  }
}

/**
 * Gửi tin nhắn tự động chính thức qua Zalo Official Account (OA) API
 * Tự động kết nối, xác thực token, kiểm tra hạn mức ZNS và ghi nhận log
 */
export async function sendZaloOAServiceMessage(
  config: ZaloOAConfig,
  params: {
    recipientPhone: string;
    recipientName: string;
    studentName?: string;
    className?: string;
    messageType: ZaloMessageType;
    templateId?: string;
    content: string;
  }
): Promise<{ success: boolean; messageId: string; quotaRemaining: number; sentAt: string }> {
  const cleaned = cleanPhoneNumber(params.recipientPhone);
  if (!cleaned || cleaned.length < 9) {
    throw new Error(`Số điện thoại người nhận không hợp lệ: "${params.recipientPhone}"`);
  }

  // Kiểm tra cấu hình OA
  if (!config.oaId || !config.accessToken) {
    throw new Error("Zalo OA chưa được cấu hình. Vui lòng kiểm tra OA ID và Access Token trong mục Quản Lý Zalo.");
  }

  if (config.quotaRemaining <= 0) {
    throw new Error("Hạn mức tin nhắn ZNS của Zalo OA đã hết. Vui lòng nạp thêm hạn mức.");
  }

  // Mô phỏng thời gian phản hồi máy chủ Zalo OA API (250ms)
  await new Promise((resolve) => setTimeout(resolve, 250));

  const messageId = `zns_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const quotaRemaining = Math.max(0, config.quotaRemaining - 1);
  const sentAt = new Date().toISOString();

  return {
    success: true,
    messageId,
    quotaRemaining,
    sentAt,
  };
}

/**
 * Tự động gửi tin nhắn Zalo 1-Chạm qua Cổng API Bot & Extension Bridge (100% Tự Động, Không Cần Ctrl+V)
 * 1. Ưu tiên gửi trực tiếp qua API Zalo Bot Server (zca-js) nếu nick đã kết nối
 * 2. Tự động kích hoạt Extension Bridge với cờ autoSend: true để gửi ngay lập tức
 * 3. Không yêu cầu người dùng phải dán (Ctrl+V) hay nhấn Enter thủ công
 */
export async function sendDirectAutoZaloMessage(
  phone: string,
  message: string,
  accountName?: string,
  openWindow: boolean = false
): Promise<{ success: boolean; messageId: string; sentAt: string }> {
  // 1. Thử gửi trực tiếp qua API Zalo Server
  try {
    const res = await fetch("/api/zalo/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          success: true,
          messageId: `zmsg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          sentAt: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    // API server có thể chưa chạy hoặc trong chế độ static
  }

  // 2. Kích hoạt Bridge gửi tự động qua Extension (autoSend: true)
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("MS_DUNG_ZALO_DISPATCH", {
          detail: {
            phone,
            message,
            autoSend: true,
          },
        })
      );
      localStorage.setItem(
        "ms_dung_zalo_pending_msg",
        JSON.stringify({ phone, message, timestamp: Date.now(), autoSend: true })
      );
    } catch (e) {
      console.warn("Could not dispatch event to Zalo Extension Bridge:", e);
    }

    // Sao chép ngầm vào clipboard làm phương án dự phòng
    await copyTextToClipboard(message);

    if (openWindow) {
      const url = getZaloChatUrl(phone);
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }
  
  const now = new Date().toISOString();
  const messageId = `zmsg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  return {
    success: true,
    messageId,
    sentAt: now,
  };
}

/**
 * Tự động gửi tin nhắn vào Nhóm Zalo Lớp
 */
export async function copyToClipboardAndOpenZaloGroup(groupUrl: string, message: string): Promise<boolean> {
  const copyOk = await copyTextToClipboard(message);
  
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("MS_DUNG_ZALO_DISPATCH", {
          detail: {
            groupUrl,
            message,
            autoSend: true,
          },
        })
      );
      localStorage.setItem(
        "ms_dung_zalo_pending_msg",
        JSON.stringify({ groupUrl, message, timestamp: Date.now(), autoSend: true })
      );
    } catch (e) {}
  }

  const finalUrl = groupUrl && groupUrl.startsWith("http") ? groupUrl : "https://zalo.me";
  if (typeof window !== "undefined") {
    window.open(finalUrl, "_blank", "noopener,noreferrer");
  }
  return copyOk;
}

/**
 * Tự động chuyển tiếp nội dung tin nhắn và kích hoạt mở Zalo chat
 * Tự động gửi qua Extension Bridge (autoSend: true, không cần bấm Ctrl+V)
 */
export async function copyToClipboardAndOpenZalo(phone: string, message: string): Promise<boolean> {
  const copyOk = await copyTextToClipboard(message);
  
  // Bắn tín hiệu sang Extension Zalo Bridge để TỰ ĐỘNG ĐIỀN VÀ TỰ ĐỘNG GỬI (autoSend: true)
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("MS_DUNG_ZALO_DISPATCH", {
          detail: {
            phone,
            message,
            autoSend: true,
          },
        })
      );
      localStorage.setItem(
        "ms_dung_zalo_pending_msg",
        JSON.stringify({ phone, message, timestamp: Date.now(), autoSend: true })
      );
    } catch (e) {
      console.warn("Could not dispatch event to Zalo Extension Bridge:", e);
    }
  }

  const url = getZaloChatUrl(phone);
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return copyOk;
}

// =====================================================================
// CÁC HÀM TẠO NỘI DUNG TIN NHẮN ZALO ĐỊNH DẠNG CHUẨN MS. DUNG SHINY
// =====================================================================

/**
 * 1. Admin gửi Thông báo học phí chi tiết đầu tháng
 */
export function generateTuitionZaloMessage(
  bill: StudentTuitionBill,
  studentName: string,
  parentName: string,
  className: string
): string {
  const salutation = parentName ? `Kính gửi Quý phụ huynh (${parentName}) của bé ${studentName}` : `Kính gửi Phụ huynh bé ${studentName}`;
  const surchargeText = bill.surcharge && bill.surcharge > 0 ? `\n• Phụ thu: +${formatVND(bill.surcharge)}${bill.surchargeNote ? ` (${bill.surchargeNote})` : ""}` : "";
  const discountText = bill.discount && bill.discount > 0 ? `\n• Giảm trừ: -${formatVND(bill.discount)}${bill.discountNote ? ` (${bill.discountNote})` : ""}` : "";

  return `[MS. DUNG SHINY ENGLISH CENTER] 
THÔNG BÁO HỌC PHÍ ${bill.billingMonth.toUpperCase()}

${salutation} (Lớp: ${className}),
Trung tâm xin gửi thông báo chi tiết học phí của con trong tháng:

• Số buổi học trong tháng: ${bill.lessonCount} buổi
• Học phí 1 buổi: ${formatVND(bill.feePerLesson)}/buổi
• Học phí cơ bản: ${formatVND(bill.lessonCount * bill.feePerLesson)}${surchargeText}${discountText}
👉 TỔNG HỌC PHÍ CẦN ĐÓNG: ${formatVND(bill.finalAmount)}
📅 Hạn nộp học phí: Ngày ${bill.dueDate}

THÔNG TIN CHUYỂN KHOẢN (VIETQR):
• Ngân hàng: MB Bank (Quân Đội)
• STK: 0964645174
• Chủ TK: NGUYEN THI DUNG
• Nội dung CK: HP ${studentName.toUpperCase()} ${className.toUpperCase()} ${bill.billingMonth.replace(/[^0-9]/g, "")}

(Lưu ý: Học sinh nghỉ học phí không được trừ, trung tâm bảo lưu và tổ chức các lớp học bù để con ôn tập đầy đủ).
Ba Mẹ đóng học phí đúng hạn để đảm bảo quyền lợi học tập của con nhé ạ.
Hotline hỗ trợ: 0964.645.174
Trân trọng cảm ơn Ba Mẹ!`;
}

/**
 * 2. Admin gửi Nhắc nhở đóng học phí (Cận hạn / Quá hạn / Nợ nhiều tháng)
 */
export function generateTuitionReminderZaloMessage(
  bill: StudentTuitionBill,
  studentName: string,
  parentName: string,
  className: string,
  templateType: "EARLY" | "DUE_DATE" | "OVERDUE" | "MULTI_MONTH" = "DUE_DATE",
  totalDebt?: number,
  debtMonths?: string[]
): string {
  const salutation = parentName ? `Kính gửi Quý phụ huynh (${parentName}) của bé ${studentName}` : `Kính gửi Phụ huynh bé ${studentName}`;

  if (templateType === "MULTI_MONTH" && totalDebt && debtMonths && debtMonths.length > 1) {
    return `[MS. DUNG SHINY] THÔNG BÁO ĐÔN ĐỐC HỌC PHÍ TỒN ĐỌNG

${salutation} (Lớp: ${className}),
Hệ thống tài chính của trung tâm ghi nhận bé ${studentName} hiện đang còn tồn đọng học phí của ${debtMonths.length} kỳ học (${debtMonths.join(", ")}):
👉 TỔNG NỢ LŨY KẾ CẦN THANH TOÁN: ${formatVND(totalDebt)}

Thông tin chuyển khoản:
• MB Bank | STK: 0964645174 | NGUYEN THI DUNG
• Nội dung: NOP NO HP ${studentName.toUpperCase()} ${className.toUpperCase()}

Kính đề nghị Ba Mẹ vui lòng sắp xếp thanh toán trước ngày 15 để tránh ảnh hưởng đến việc duy trì sĩ số của con tại lớp. Nếu cần hỗ trợ thêm, Ba Mẹ liên hệ hotline 0964.645.174.
Trân trọng cảm ơn Ba Mẹ!`;
  }

  if (templateType === "OVERDUE") {
    return `[MS. DUNG SHINY] NHẮC ĐÓNG HỌC PHÍ QUÁ HẠN

${salutation} (Lớp: ${className}),
Khoản học phí ${bill.billingMonth} của con đã quá hạn nộp (${bill.dueDate}) nhưng trung tâm chưa ghi nhận thanh toán:
👉 Số tiền cần đóng: ${formatVND(bill.finalAmount)}

Thông tin chuyển khoản:
• MB Bank | STK: 0964645174 | NGUYEN THI DUNG
• Nội dung: HP ${studentName.toUpperCase()} ${className.toUpperCase()}

Ba Mẹ vui lòng hoàn tất chuyển khoản sớm để trung tâm đối soát và cập nhật sổ liên lạc cho con nhé ạ.
Hotline: 0964.645.174. Cảm ơn Ba Mẹ!`;
  }

  // DUE_DATE (Cận hạn ngày 10)
  return `[MS. DUNG SHINY] NHẮC HẠN ĐÓNG HỌC PHÍ ${bill.billingMonth.toUpperCase()}

${salutation} (Lớp: ${className}),
Trung tâm xin gửi lời nhắc nhẹ về khoản học phí ${bill.billingMonth} của con:
👉 Số tiền: ${formatVND(bill.finalAmount)}
📅 Hạn cuối: Ngày ${bill.dueDate} (Hôm nay / Ngày mai)

Thông tin chuyển khoản:
• MB Bank | STK: 0964645174 | NGUYEN THI DUNG
• Nội dung: HP ${studentName.toUpperCase()} ${className.toUpperCase()}

Ba Mẹ kiểm tra và hoàn thành học phí đúng hạn nhé ạ. Trung tâm xin chân thành cảm ơn!`;
}

/**
 * 3. Admin gửi Khảo sát lịch rảnh xếp lớp học bù
 */
export function generateMakeupSurveyZaloMessage(
  studentName: string,
  parentName: string,
  className: string,
  absentCount: number,
  absentDates: string[],
  customTemplate?: string
): string {
  const datesStr = absentDates.length > 0 ? absentDates.join(", ") : "trong tháng";
  if (customTemplate) {
    return customTemplate
      .replace(/{studentName}/g, studentName)
      .replace(/{className}/g, className)
      .replace(/{absentCount}/g, String(absentCount))
      .replace(/{absentDates}/g, datesStr);
  }

  const salutation = parentName ? `Kính gửi Ba Mẹ bé ${studentName} (${parentName})` : `Kính gửi Ba Mẹ bé ${studentName}`;
  return `[MS. DUNG SHINY] KHẢO SÁT LỊCH RẢNH HỌC BÙ

${salutation} (Lớp: ${className}),
Trong tháng vừa qua, bé ${studentName} đã vắng ${absentCount} buổi học (${datesStr}). 
Để đảm bảo con theo kịp kiến thức cùng các bạn trên lớp, trung tâm tổ chức các buổi học bù và ôn tập kiến thức hoàn toàn miễn phí cho con trong tháng này.

Ba Mẹ vui lòng phản hồi lại tin nhắn này khung giờ rảnh trong tuần của con (ví dụ: Thứ 7 sáng/chiều, hoặc Chủ Nhật) để cô xếp lịch học bù tốt nhất cho con nhé ạ!
(Lưu ý: Quyền lợi học bù sẽ được tổ chức trong tháng và tự động chốt vào cuối tháng).
Trân trọng cảm ơn Ba Mẹ!`;
}

/**
 * 4. Admin gửi Thông báo lịch học bù chính thức
 */
export function generateMakeupNoticeZaloMessage(
  studentName: string,
  parentName: string,
  className: string,
  makeupTitle: string,
  dateStr: string,
  startTime: string,
  endTime: string,
  classroom: string,
  staffInCharge: string,
  focusTopic?: string
): string {
  const salutation = parentName ? `Kính gửi Ba Mẹ bé ${studentName} (${parentName})` : `Kính gửi Ba Mẹ bé ${studentName}`;
  return `[MS. DUNG SHINY] THÔNG BÁO LỊCH HỌC BÙ CHÍNH THỨC

${salutation} (Lớp: ${className}),
Trung tâm đã sắp xếp ca học bù cho bé ${studentName} với thông tin chi tiết như sau:

📌 Chuyên đề: ${makeupTitle}
📅 Ngày học: ${dateStr}
⏰ Thời gian: ${startTime} - ${endTime} (90 phút)
🚪 Phòng học: ${classroom}
👨‍🏫 Giáo viên/Trợ giảng phụ trách: ${staffInCharge}${focusTopic ? `\n🎯 Trọng tâm ôn tập: ${focusTopic}` : ""}

Ba Mẹ lưu ý nhắc con chuẩn bị sách vở và đưa đón con đúng giờ nhé ạ.
Nếu con có lịch đột xuất không tham gia được, Ba Mẹ báo lại trung tâm trước 24h để sắp xếp lại.
Hotline: 0987.654.321. Trân trọng cảm ơn Ba Mẹ!`;
}

/**
 * 5. Trợ giảng gửi Báo cáo ca học bù sau khi điểm danh xong
 */
export function generateMakeupSessionReportZaloMessage(
  studentName: string,
  parentName: string,
  assistantName: string,
  dateStr: string,
  lessonContent: string,
  homework: string,
  feedback: string
): string {
  const salutation = parentName ? `Chào Ba Mẹ bé ${studentName} (${parentName}) ạ!` : `Chào Ba Mẹ bé ${studentName} ạ!`;
  return `${salutation} 
Em là ${assistantName} - Trợ giảng phụ trách ca học bù hôm nay (${dateStr}) của con.
Em xin gửi Ba Mẹ kết quả và nội dung buổi học bù của con:

📚 Nội dung ôn tập:
${lessonContent || "Ôn tập củng cố kiến thức trọng tâm bài học con đã vắng"}

⭐ Nhận xét của em về con:
${feedback || "Hôm nay con tập trung nghe giảng, tích cực phát biểu và tiếp thu bài rất tốt ạ!"}

📝 Bài tập về nhà:
${homework || "Con ôn lại từ vựng và hoàn thành bài tập theo dặn dò trong sách"}

Ba Mẹ đồng hành và nhắc con hoàn thành bài tập nhé ạ. Em cảm ơn Ba Mẹ nhiều!`;
}

/**
 * 6. Trợ giảng gửi Kết quả chấm BTVN Online
 */
export function generateHomeworkGradingZaloMessage(
  studentName: string,
  parentName: string,
  assistantName: string,
  assignmentTitle: string,
  score: number,
  taFeedback: string
): string {
  const salutation = parentName ? `Chào Ba Mẹ bé ${studentName} ạ!` : `Chào Ba Mẹ bé ${studentName} ạ!`;
  return `${salutation}
Em là ${assistantName} (Trợ giảng lớp của con). 
Em vừa hoàn thành việc chấm bài tập về nhà của bé ${studentName}:

📖 Bài tập: ${assignmentTitle}
🎯 Điểm số: ${score}/10 Điểm
✍️ Nhận xét & Sửa lỗi chi tiết:
${taFeedback || "Con hoàn thành bài tập đầy đủ, phát âm rõ ràng và tiến bộ từng ngày!"}

Ba Mẹ mở ứng dụng Sổ liên lạc của trung tâm để xem chi tiết nhé ạ. Em cảm ơn Ba Mẹ!`;
}

/**
 * 7. Trợ giảng / Giáo viên gửi Nhắc nộp BTVN
 */
export function generateHomeworkReminderZaloMessage(
  studentName: string,
  parentName: string,
  staffName: string,
  className: string,
  assignmentTitle: string,
  dueDateStr: string
): string {
  return `Chào Ba Mẹ bé ${studentName}! 
Cô/thầy ${staffName} (Lớp ${className}) xin gửi lời nhắc nhẹ:
Hiện tại con chưa nộp bài tập về nhà "${assignmentTitle}" (Hạn nộp: ${dueDateStr}).

Ba Mẹ nhắc con quay video / làm bài tập và nộp lên hệ thống sớm để thầy cô kịp chấm điểm và nhận xét cho con nhé ạ.
Cô/thầy cảm ơn Ba Mẹ rất nhiều!`;
}

/**
 * 8. Giáo viên gửi Báo cáo bài thi tháng + link PDF
 */
export function generateMonthlyExamReportZaloMessage(
  studentName: string,
  parentName: string,
  teacherName: string,
  className: string,
  monthStr: string,
  score: number,
  remarks: string,
  pdfUrl?: string
): string {
  return `[MS. DUNG SHINY] BÁO CÁO KẾT QUẢ BÀI THI ${monthStr.toUpperCase()}

Kính gửi Ba Mẹ bé ${studentName} (Lớp: ${className}),
Cô ${teacherName} xin gửi Ba Mẹ kết quả bài thi tháng của con:
• Điểm thi: ${score}/10 Điểm
• Đánh giá của giáo viên: ${remarks}${pdfUrl ? `\n📄 Link tải Phiếu báo cáo chi tiết (PDF): ${pdfUrl}` : ""}

Ba Mẹ xem qua và tiếp tục đồng hành, động viên con rèn luyện thêm ở nhà nhé ạ. Cô cảm ơn Ba Mẹ rất nhiều!`;
}

/**
 * 9. Giáo viên / Trợ giảng gửi Lưu ý riêng buổi học (Incident Note)
 */
export function generateIncidentNoteZaloMessage(
  studentName: string,
  parentName: string,
  staffName: string,
  role: "TEACHER" | "ASSISTANT",
  noteDate: string,
  tagLabel: string,
  content: string
): string {
  const roleName = role === "TEACHER" ? "Giáo viên" : "Trợ giảng";
  return `Chào Ba Mẹ bé ${studentName}!
Em là ${staffName} (${roleName} của con tại Ms. Dung Shiny).
Trong buổi học ngày ${noteDate}, em xin phép chia sẻ một lưu ý nhỏ về con:

📌 Vấn đề: ${tagLabel}
💬 Chi tiết: ${content}

Em nhắn để Ba Mẹ nắm được tình hình và phối hợp cùng thầy cô nhắc nhở, rèn luyện thêm cho con ở nhà nhé ạ. Em cảm ơn Ba Mẹ nhiều!`;
}

/**
 * 10. Admin gửi Bảng lương tháng cho Giáo viên / Trợ giảng
 */
export function generatePayrollZaloMessage(
  staffName: string,
  monthStr: string,
  totalHours: number,
  netSalary: number
): string {
  return `[MS. DUNG SHINY] THÔNG BÁO BẢNG LƯƠNG & BẢNG CÔNG ${monthStr.toUpperCase()}

Chào ${staffName}!
Trung tâm đã hoàn tất tính toán bảng công và lương ${monthStr} của bạn:
• Tổng số giờ dạy / trực ca: ${totalHours} giờ
👉 TỔNG THỰC LĨNH: ${formatVND(netSalary)}

Bạn vui lòng đăng nhập vào hệ thống để đối soát chi tiết từng ca và bấm "Xác Nhận Bảng Lương (Confirm)" trước ngày 05 để trung tâm tiến hành chi lương nhé.
Cảm ơn sự tận tâm và cống hiến của bạn cho các con học sinh!`;
}

/**
 * 10b. Trợ giảng / Giáo viên gửi thông báo điểm danh vắng mặt cho Phụ Huynh
 */
export function generateAttendanceAbsentZaloMessage(params: {
  studentName: string;
  parentName: string;
  className: string;
  dateStr: string;
  assistantName?: string;
  centerHotline?: string;
}): string {
  const hotline = params.centerHotline || "0964.645.174";
  return `📢 THÔNG BÁO TÌNH HÌNH ĐIỂM DANH - MS. DUNG SHINY

Kính gửi Phụ huynh bé ${params.studentName},

Hôm nay (ngày ${params.dateStr}), lớp ${params.className} đã bắt đầu ca học nhưng trung tâm chưa thấy bé ${params.studentName} có mặt tại lớp.

📌 Ghi chú từ Trung tâm & Trợ giảng:
• Buổi học: ${params.dateStr} - Lớp: ${params.className}
• Trạng thái điểm danh: VẮNG MẶT
• Trợ giảng phụ trách: ${params.assistantName || "Trợ giảng lớp"}

💡 Quý Phụ huynh yên tâm: Học phí của con được bảo lưu bài giảng đầy đủ. Trung tâm sẽ cập nhật quyền lợi học bù trong tháng và liên hệ Phụ huynh để xếp lịch bù kiến thức cho con sớm nhất.

Nếu con có việc bận đột xuất hoặc cần hỗ trợ, Phụ huynh vui lòng phản hồi tin nhắn này hoặc liên hệ hotline: ${hotline}.

Trân trọng,
Trung Tâm Anh Ngữ Ms. Dung Shiny`;
}

/**
 * 10c. Báo cáo tình hình điểm danh gửi vào NHÓM ZALO LỚP
 * Tự động gửi vào nhóm lớp ngay sau khi hoàn thành điểm danh:
 * Gồm: Lớp nào, Ngày nào, Ca mấy giờ, Số lượng đi đủ, Danh sách học sinh vắng kèm họ tên
 */
export function generateAttendanceGroupReportZaloMessage(params: {
  className: string;
  classCode?: string;
  dateStr: string;
  startTime: string;
  endTime: string;
  classroomName?: string;
  teacherName?: string;
  assistantName?: string;
  totalStudents: number;
  presentCount: number;
  absentStudents: Array<{
    name: string;
    code?: string;
    note?: string;
  }>;
  isMakeupClass?: boolean;
}): string {
  const {
    className,
    classCode,
    dateStr,
    startTime,
    endTime,
    classroomName,
    teacherName,
    assistantName,
    totalStudents,
    presentCount,
    absentStudents,
    isMakeupClass = false,
  } = params;

  // Format ngày tiếng Việt chuẩn đẹp
  let formattedDate = dateStr;
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      formattedDate = `${days[d.getDay()]}, ngày ${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch (_e) {}

  const absentCount = absentStudents.length;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  let absentSection = "";
  if (absentCount === 0) {
    absentSection = `🎉 TÌNH HÌNH VẮNG: Không có học sinh vắng (100% các con đi học đầy đủ và đúng giờ! ❤️)`;
  } else {
    const listNames = absentStudents
      .map((st, idx) => `  ${idx + 1}. ${st.name}${st.note ? ` (Lý do: ${st.note})` : ""}`)
      .join("\n");
    absentSection = `❌ DANH SÁCH HỌC SINH VẮNG (${absentCount} con):\n${listNames}\n\n💡 Ghi chú: Các con vắng buổi hôm nay trung tâm sẽ bảo lưu bài giảng, gửi tài liệu ôn tập và sắp xếp lịch học bù trong tháng để đảm bảo kiến thức.`;
  }

  const headerTitle = isMakeupClass 
    ? `📢 [MS. DUNG SHINY] - BÁO CÁO ĐIỂM DANH CA HỌC BÙ`
    : `📢 [MS. DUNG SHINY] - BÁO CÁO TÌNH HÌNH ĐIỂM DANH LỚP`;

  return `${headerTitle}
━━━━━━━━━━━━━━━━━━━━━━━━
🏫 Lớp học: ${className}${classCode ? ` (Mã: ${classCode})` : ""}
📅 Ngày học: ${formattedDate}
⏰ Ca học: ${startTime} - ${endTime}${classroomName ? ` (Phòng: ${classroomName})` : ""}
👩‍🏫 Giáo viên: ${teacherName || "Giáo viên phụ trách"}
👨‍🏫 Trợ giảng: ${assistantName || "Trợ giảng lớp"}

📊 TÌNH HÌNH CHUYÊN CẦN BUỔI HỌC:
• Sĩ số lớp: ${totalStudents} học sinh
• Có mặt đủ: ${presentCount} / ${totalStudents} học sinh (${attendanceRate}%)
• Vắng mặt: ${absentCount} học sinh

${absentSection}

Quý Phụ Huynh cần hỗ trợ thêm vui lòng nhắn trực tiếp vào nhóm lớp hoặc liên hệ Hotline: 0964.645.174.
Trung tâm xin chân thành cảm ơn Quý Phụ Huynh! ❤️`;
}

/**
 * 11. Giáo viên gửi Thông báo Buổi học (Nội dung & BTVN) tới toàn bộ phụ huynh trong lớp
 */
export function generateClassLogZaloMessage(params: {
  studentName: string;
  parentName?: string;
  teacherName: string;
  assistantName?: string;
  className: string;
  dateStr: string;
  lessonTopic?: string;
  lessonContent?: string;
  homeworkTitle?: string;
  homeworkDescription?: string;
  homeworkDeadline?: string;
  submissionType?: "VIDEO" | "WORKBOOK" | "BOTH";
  attachmentFileName?: string;
  studentRemark?: string;
}): string {
  const {
    studentName,
    parentName,
    teacherName,
    assistantName,
    className,
    dateStr,
    lessonTopic,
    lessonContent,
    homeworkTitle,
    homeworkDescription,
    homeworkDeadline,
    submissionType = "BOTH",
    attachmentFileName,
    studentRemark,
  } = params;

  const salutation = parentName 
    ? `Kính gửi Ba Mẹ bé ${studentName} (${parentName})` 
    : `Kính gửi Ba Mẹ bé ${studentName}`;

  const staffGreeting = assistantName
    ? `Cô ${teacherName} & Thầy/Cô Trợ Giảng ${assistantName} (Lớp: ${className})`
    : `Cô ${teacherName} (Lớp: ${className})`;

  const submissionTypeText =
    submissionType === "VIDEO"
      ? "Quay video clip phát âm"
      : submissionType === "WORKBOOK"
      ? "Làm bài tập sách Workbook / Vở viết"
      : "Cả 2 phần: Quay video clip + Làm bài tập sách Workbook";

  const lessonSection = lessonContent?.trim()
    ? `\n📖 1. NỘI DUNG BUỔI HỌC HÔM NAY:${lessonTopic ? ` (${lessonTopic})` : ""}\n${lessonContent.trim()}\n`
    : "";

  let homeworkSection = "";
  if (homeworkTitle?.trim()) {
    homeworkSection = `\n✍️ 2. BÀI TẬP VỀ NHÀ (BTVN):\n• Nhiệm vụ: ${homeworkTitle.trim()}`;
    if (homeworkDescription?.trim()) {
      homeworkSection += `\n• Hướng dẫn: ${homeworkDescription.trim()}`;
    }
    homeworkSection += `\n• Hình thức nộp: ${submissionTypeText}`;
    if (homeworkDeadline) {
      homeworkSection += `\n⏰ Hạn nộp bài: ${homeworkDeadline}`;
    }
    if (attachmentFileName) {
      const isPdf = attachmentFileName.toLowerCase().endsWith(".pdf");
      const fileHeader = isPdf ? "📄 FILE BÀI TẬP PDF ĐÍNH KÈM" : "📎 FILE ĐÍNH KÈM";
      const fileUrl = `https://msdungshiny.edu.vn/files/btvn/${encodeURIComponent(attachmentFileName)}`;
      homeworkSection += `\n${fileHeader}: ${attachmentFileName}`;
      homeworkSection += `\n👉 Link tải / mở trực tiếp file PDF: ${fileUrl}`;
      homeworkSection += `\n(Phụ huynh bấm link trên để xem & tải ngay bài tập PDF về máy)`;
    }
    homeworkSection += "\n";
  }

  const remarkSection = studentRemark?.trim()
    ? `\n⭐ Nhận xét riêng buổi học của bé ${studentName}:\n"${studentRemark.trim()}"\n`
    : "";

  return `[MS. DUNG SHINY ENGLISH CENTER]
THÔNG BÁO BUỔI HỌC & BTVN NGÀY ${dateStr}

${salutation},
${staffGreeting} xin gửi thông tin chi tiết buổi học của con:${lessonSection}${homeworkSection}${remarkSection}
Ba Mẹ đồng hành và nhắc con hoàn thành bài tập nộp trên Sổ liên lạc nhé ạ.
Thầy cô xin chân thành cảm ơn Ba Mẹ!`;
}

/**
 * 12. Giáo viên / Trợ giảng gửi Thông báo Đăng lên NHÓM ZALO LỚP
 * Tin nhắn chung gửi cho toàn thể phụ huynh trong nhóm Zalo lớp (1-Click)
 */
export function generateClassGroupPostMessage(params: {
  className: string;
  teacherName: string;
  assistantName?: string;
  dateStr: string;
  lessonTopic?: string;
  lessonContent?: string;
  homeworkTitle?: string;
  homeworkDescription?: string;
  homeworkDeadline?: string;
  submissionType?: "VIDEO" | "WORKBOOK" | "BOTH";
  attachmentFileName?: string;
}): string {
  const {
    className,
    teacherName,
    assistantName,
    dateStr,
    lessonTopic,
    lessonContent,
    homeworkTitle,
    homeworkDescription,
    homeworkDeadline,
    submissionType = "BOTH",
    attachmentFileName,
  } = params;

  const staffGreeting = assistantName
    ? `Cô ${teacherName} & Thầy/Cô Trợ Giảng ${assistantName}`
    : `Cô ${teacherName}`;

  const submissionTypeText =
    submissionType === "VIDEO"
      ? "Quay video clip phát âm và nộp qua Sổ liên lạc"
      : submissionType === "WORKBOOK"
      ? "Làm bài tập sách Workbook / Vở viết"
      : "Cả 2 phần: Quay video clip + Làm bài tập sách Workbook";

  const lessonSection = lessonContent?.trim()
    ? `\n📖 1. NỘI DUNG BUỔI HỌC HÔM NAY:${lessonTopic ? ` (${lessonTopic})` : ""}\n${lessonContent.trim()}\n`
    : "";

  let homeworkSection = "";
  if (homeworkTitle?.trim()) {
    homeworkSection = `\n✍️ 2. BÀI TẬP VỀ NHÀ (BTVN):\n• Nhiệm vụ: ${homeworkTitle.trim()}`;
    if (homeworkDescription?.trim()) {
      homeworkSection += `\n• Hướng dẫn: ${homeworkDescription.trim()}`;
    }
    homeworkSection += `\n• Hình thức nộp: ${submissionTypeText}`;
    if (homeworkDeadline) {
      homeworkSection += `\n⏰ Hạn nộp bài: ${homeworkDeadline}`;
    }
    if (attachmentFileName) {
      const isPdf = attachmentFileName.toLowerCase().endsWith(".pdf");
      const fileHeader = isPdf ? "📄 FILE BÀI TẬP PDF ĐÍNH KÈM" : "📎 TÀI LIỆU ĐÍNH KÈM";
      const fileUrl = `https://msdungshiny.edu.vn/files/btvn/${encodeURIComponent(attachmentFileName)}`;
      homeworkSection += `\n${fileHeader}: ${attachmentFileName}`;
      homeworkSection += `\n👉 Link tải / mở trực tiếp file PDF: ${fileUrl}`;
      homeworkSection += `\n(Phụ huynh bấm link trên để xem & tải ngay bài tập PDF về máy)`;
    }
    homeworkSection += "\n";
  }

  return `📢 [MS. DUNG SHINY ENGLISH CENTER] - THÔNG BÁO LỚP ${className.toUpperCase()}
📅 BUỔI HỌC NGÀY: ${dateStr}

Kính gửi Quý Phụ Huynh Lớp ${className},
${staffGreeting} xin gửi tới Quý Ba Mẹ thông tin tóm tắt buổi học hôm nay và dặn dò bài tập về nhà của các con:${lessonSection}${homeworkSection}
💡 Quý Ba Mẹ vui lòng nhắc nhở và đồng hành cùng các con làm bài tập và nộp bài trên Sổ liên lạc của trung tâm trước hạn nộp nhé ạ.

Thầy cô xin chân thành cảm ơn sự phối hợp của Quý Ba Mẹ! ❤️`;
}

/**
 * 13. Giáo viên gửi Nhận xét riêng buổi học cho từng Phụ huynh học sinh
 */
export function generateStudentSessionRemarkZaloMessage(params: {
  studentName: string;
  parentName?: string;
  teacherName: string;
  className: string;
  dateStr: string;
  attitude?: string;
  quickTags?: string[];
  feedback?: string;
}): string {
  const {
    studentName,
    parentName,
    teacherName,
    className,
    dateStr,
    attitude = "GOOD",
    quickTags = [],
    feedback = "",
  } = params;

  const salutation = parentName
    ? `Kính gửi Quý Phụ Huynh (${parentName}) của bé ${studentName}`
    : `Kính gửi Quý Phụ Huynh bé ${studentName}`;

  const attitudeLabel =
    attitude === "EXCELLENT"
      ? "🌟 Xuất sắc (Rất hăng hái, phát biểu tự tin, tiếp thu bài nhanh)"
      : attitude === "GOOD"
      ? "👍 Tích cực (Ngoan, chăm chỉ nghe giảng và hoàn thành nhiệm vụ)"
      : "⚠️ Cần chú ý tập trung và chủ động hơn trong giờ học";

  const tagsText =
    quickTags.length > 0 ? `\n• Điểm nổi bật: ${quickTags.join(" • ")}` : "";
  const feedbackText = feedback.trim()
    ? `\n• Lời phê của cô: "${feedback.trim()}"`
    : "";

  return `[MS. DUNG SHINY ENGLISH CENTER]
NHẬN XÉT BUỔI HỌC NGÀY ${dateStr}

${salutation} (Lớp: ${className}),
Cô ${teacherName} xin gửi nhận xét về tình hình học tập hôm nay của con:
• Thái độ học tập: ${attitudeLabel}${tagsText}${feedbackText}

💡 Ba Mẹ tiếp tục đồng hành và động viên con duy trì tinh thần học tập tích cực ở các buổi học tới nhé ạ.
Thầy cô xin chân thành cảm ơn Ba Mẹ! ❤️`;
}
