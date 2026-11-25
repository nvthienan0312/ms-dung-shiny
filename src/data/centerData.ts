import { UserAccount } from "@/types/auth";

export interface ScheduleSlot {
  id: string;
  dayOfWeek: number; // 2: Thứ 2, 3: Thứ 3, ..., 7: Thứ 7, 8: Chủ Nhật
  dayLabel: string;  // "Thứ 2", "Thứ 3", ..., "Chủ Nhật"
  startTime: string; // "19:00"
  endTime: string;   // "20:30"
  teacherId?: string;      // GV phụ trách ca học này (nếu phân công riêng theo buổi)
  teacherName?: string;
  assistantId?: string;    // Trợ giảng phụ trách ca học này
  assistantName?: string;
  classroom?: string;      // Phòng học riêng cho ca học này (tùy chọn)
}

export interface ClassroomItem {
  id: string;
  name: string;
  capacity: number;
  equipment: string;
  notes?: string;
}

export interface CourseItem {
  id: string;
  code?: string; // Không bắt buộc (giữ để tương thích dữ liệu cũ)
  name: string;
  level: "KIDS" | "PRIMARY" | "SECONDARY" | "IELTS" | "COMMUNICATION";
  monthlyFee?: number; // Tương thích ngược
  standardFeePerLesson?: number; // Học phí chuẩn tính theo buổi (VNĐ/buổi)
  description: string;
}

export interface StaffItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "TEACHER" | "ASSISTANT";
  specialty: string;
  avatarUrl: string;
  activeClassesCount: number;
  status: "ACTIVE" | "INACTIVE";
  hourlyRate: number; // Tiền lương theo giờ (VNĐ/giờ) phục vụ tính bảng công & lương
}

export type TuitionStatus = "PAID" | "UNPAID" | "OVERDUE";

export interface StudentItem {
  id: string;
  studentCode: string;
  fullName: string;
  dob: string; // Năm sinh (VD: "2019") hoặc YYYY-MM-DD ở dữ liệu cũ
  birthYear?: string; // Năm sinh rõ ràng (VD: "2019")
  gender: "Nam" | "Nữ";
  parentName: string;
  parentPhone: string;
  parentEmail?: string; // Không bắt buộc (đã thay thế hiển thị bằng note)
  note?: string;        // Ghi chú học sinh (VD: "em trai Tuấn Vũ K2")
  classId?: string;
  className?: string;
  monthlyFee?: number;          // Tương thích ngược
  feePerLesson?: number;        // Học phí theo buổi (VNĐ/buổi, VD: 200.000)
  fixedDiscount?: number;       // Giảm trừ học phí cố định hàng tháng (VNĐ)
  fixedDiscountNote?: string;   // Lý do giảm trừ cố định (VD: "Ưu đãi anh chị em học cùng")
  tuitionStatus: TuitionStatus; // "PAID" (Đã đóng tháng này) | "UNPAID" (Chưa đóng) | "OVERDUE" (Quá hạn)
  currentBillingMonth: string;  // Kỳ học phí hiện tại (ví dụ: "Tháng 11/2026")
  lastPaidMonth?: string;       // Tháng nộp gần nhất (ví dụ: "Tháng 11/2026")
  tuitionDueDate: string;       // Hạn đóng học phí tháng (ví dụ: "10/11/2026")
  remainingLessons?: number;    // Giữ để tương thích ngược
  zaloFriendshipStatus?: "FRIENDED" | "NOT_FRIENDED"; // "FRIENDED" (Đã kết bạn Zalo) | "NOT_FRIENDED" (Chưa kết bạn)
  learningStatus?: "STUDYING" | "DROPPED"; // "STUDYING" (Đang theo học) | "DROPPED" (Đã nghỉ hẳn - Bảo lưu dữ liệu PH)
  droppedDate?: string;                    // Ngày học sinh nghỉ học chính thức (VD: "2026-11-05")
  droppedReason?: string;                  // Lý do nghỉ học (VD: "Chuyển nơi cư trú", "Bận lịch học trường công")
}

export interface ClassItem {
  id: string;
  code?: string; // Không bắt buộc (giữ để tương thích dữ liệu cũ)
  name: string;
  courseId: string;
  courseName: string;
  classroom: string;          // Phòng học mặc định (có thể cấu hình riêng theo từng buổi trong schedules)
  teacherId: string;
  teacherName: string;
  assistantId: string;
  assistantName: string;
  schedules: ScheduleSlot[]; // Hỗ trợ nhiều ngày trong tuần với giờ, GV/TA và phòng học riêng
  currentStudents: number;    // Đếm số học sinh trong lớp
  monthlyFee?: number;        // Tương thích ngược
  feePerLesson?: number;      // Học phí tính theo buổi (VNĐ/buổi)
  colorTheme: string;         // Mã màu hiển thị trên TKB để phân biệt rõ từng lớp
  zaloGroupUrl?: string;      // Link nhóm Zalo của lớp (VD: "https://zalo.me/g/shinystarters01")
  zaloGroupId?: string;       // ID nhóm Zalo thật của bot để tự động gửi trực tiếp 100% không cần Ctrl+V
}

// Phân công dạy thay / trực ca thay
export interface SessionSubstitution {
  id: string;
  classId: string;
  dateStr: string;            // Định dạng "YYYY-MM-DD"
  subTeacherId?: string;
  subTeacherName?: string;
  subAssistantId?: string;
  subAssistantName?: string;
  reason: string;
  createdAt: string;
}

// 3 Trạng thái điểm danh theo yêu cầu trung tâm: Có mặt, Vắng mặt, Muộn
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export interface AttendanceRecord {
  id: string;
  classId: string;
  dateStr: string;            // Định dạng "YYYY-MM-DD"
  studentId: string;
  studentName: string;
  status: AttendanceStatus;   // "PRESENT" | "ABSENT" | "LATE"
  lateMinutes?: number;       // Số phút muộn (ví dụ: 5, 10, 15, 30)
  note?: string;              // Ghi chú lý do vắng / muộn
  markedAt: string;           // Thời điểm điểm danh
  markedBy: string;           // Người điểm danh (Trợ giảng / Giáo viên)
}

// ==============================================================
// NHẬT KÝ BUỔI HỌC (CLASS LOG) & ĐÁNH GIÁ HỌC VIÊN & BÀI TẬP VỀ NHÀ
// ==============================================================

export type StudentAttitude = "EXCELLENT" | "GOOD" | "NEEDS_FOCUS";
export type HomeworkSubmissionType = "VIDEO" | "AUDIO" | "WORKBOOK" | "WORKSHEET" | "BOTH";

export interface StudentRemark {
  studentId: string;
  studentName: string;
  attitude: StudentAttitude;  // "EXCELLENT" (Xuất sắc) | "GOOD" (Tích cực) | "NEEDS_FOCUS" (Cần tập trung hơn)
  quickTags: string[];        // Ví dụ: ["Phát âm chuẩn", "Hăng hái phát biểu", "Tự tin giao tiếp"]
  feedback: string;           // Nhận xét chi tiết cho từng bé
  zaloSentAt?: string;        // Thời điểm gửi Zalo nhận xét riêng cho phụ huynh
}

export interface ClassLogItem {
  id: string;
  classId: string;
  className: string;
  dateStr: string;            // Định dạng "YYYY-MM-DD"
  lessonContent?: string;     // [MỚI] Nội dung buổi học gộp chung: Chủ đề, từ vựng, ngữ pháp & tình hình lớp học
  lessonTopic: string;        // Ví dụ: "Unit 4: My Loving Family & Fun Hobbies"
  vocabularyTaught?: string;  // Từ vựng đã học
  grammarFocus?: string;      // Ngữ pháp trọng tâm
  homeworkTitle: string;      // Tên bài tập về nhà
  homeworkDescription: string;// Hướng dẫn chi tiết cách làm
  homeworkDeadline: string;   // Hạn nộp bài (ví dụ: "2026-11-08 20:00")
  submissionType: HomeworkSubmissionType; // Hình thức nộp: VIDEO (Quay video), WORKBOOK (Workbook/Worksheet/Vở viết), BOTH (Cả hai)
  attachmentFileName?: string;// [MỚI] Tên file bài tập đính kèm nếu có (PDF, Word, Ảnh...)
  attachmentFileSize?: string;// [MỚI] Dung lượng file đính kèm (ví dụ: "350 KB")
  attachmentUrl?: string;     // [MỚI] URL file đính kèm
  generalFeedback?: string;   // Nhận xét chung toàn lớp về tinh thần buổi học
  studentRemarks: StudentRemark[]; // Đánh giá riêng từng học viên trong lớp
  status: "DRAFT" | "PUBLISHED";   // Bản nháp hoặc Đã phát hành gửi phụ huynh
  publishedAt?: string;
  zaloSentAt?: string;        // Ngày giờ gửi Zalo lần gần nhất tới phụ huynh
  zaloRecipientCount?: number;// Số lượng phụ huynh đã nhận qua Zalo
  authorName: string;         // Tên nhân sự tạo/cập nhật nhật ký (GV hoặc TA)
}

// ==============================================================
// 1. KIỂM TRA BTVN SÁCH WORKBOOK TẠI LỚP (DO TRỢ GIẢNG PHỤ TRÁCH)
// ==============================================================
export type WorkbookCheckStatus = "DONE" | "NOT_DONE" | "INCOMPLETE" | "FORGOT_BOOK";

export interface WorkbookCheckRecord {
  id: string;
  classId: string;
  dateStr: string;            // Định dạng "YYYY-MM-DD"
  studentId: string;
  studentName: string;
  status: WorkbookCheckStatus;// "DONE" (Đã làm bài) | "NOT_DONE" (Chưa làm bài) | "INCOMPLETE" (Làm thiếu) | "FORGOT_BOOK" (Quên mang sách)
  note?: string;              // Ghi chú thêm
  checkedBy: string;          // Tên trợ giảng kiểm tra
  checkedAt: string;          // Thời điểm kiểm tra
  notifiedToParent: boolean;  // Đã bắn thông báo cho PH hay chưa
  notificationMessage?: string;// "Hôm nay cô kiểm tra sách/vở thấy con chưa làm bài tập về nhà Unit 4..."
}

// ==============================================================
// 2. LƯU Ý RIÊNG TỪNG HỌC SINH TỪNG BUỔI (GV & TA GỬI RIÊNG PHỤ HUYNH)
// ==============================================================
export type IncidentTag = 
  | "TALKING_IN_CLASS" 
  | "FORGOT_SUPPLIES" 
  | "DISRUPTIVE" 
  | "TIRED_UNWELL" 
  | "OUTSTANDING_PRAISE" 
  | "OTHER";

export interface StudentIncidentNote {
  id: string;
  classId: string;
  className: string;
  dateStr: string;            // Định dạng "YYYY-MM-DD"
  studentId: string;
  studentName: string;
  tag: IncidentTag;
  tagLabel: string;           // "Nói chuyện riêng", "Quên đồ dùng học tập", "Mệt mỏi / Buồn ngủ", ...
  content: string;            // Nội dung lưu ý chi tiết gửi phụ huynh
  senderRole: "TEACHER" | "ASSISTANT";
  senderName: string;         // Tên GV hoặc TA gửi
  sentAt: string;
}

// ==============================================================
// 3. BÁO CÁO BÀI THI ĐỊNH KỲ HÀNG THÁNG (DO GIÁO VIÊN PHỤ TRÁCH)
// ==============================================================
export interface MonthlyExamReport {
  id: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  monthStr: string;           // Ví dụ: "Tháng 10/2026"
  examTitle: string;          // Ví dụ: "Bài kiểm tra định kỳ Tháng 10 (Cambridge Flyers Mock Test)"
  listeningScore: number;     // e.g. 9.0
  speakingScore: number;      // e.g. 9.5
  readingWritingScore: number;// e.g. 8.5
  totalScore: number;         // e.g. 9.0
  maxScore: number;           // 10
  pdfFileName: string;        // "Bai_Kiem_Tra_Thang_10_Nguyen_Hoang_My.pdf"
  pdfFileSize: string;        // "2.4 MB"
  pdfFileUrl?: string;        // Đường dẫn file PDF
  teacherFeedback: string;    // Nhận xét chi tiết bài thi & tình hình học tập tháng vừa qua
  strengths: string;          // Điểm mạnh trong tháng
  areasForImprovement: string;// Điểm cần cải thiện
  teacherName: string;        // Tên giáo viên lập báo cáo
  sentAt?: string;
  status: "DRAFT" | "SENT_TO_PARENT";
}

// ==============================================================
// 4. BẢNG CHẤM CÔNG & XÁC NHẬN LƯƠNG NHÂN SỰ (TA & TEACHER)
// ==============================================================
export interface SessionWorkLog {
  id: string;
  dateStr: string;
  className: string;
  classroom: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  ratePerHour: number;
  amount: number;
  type: "REGULAR" | "SUBSTITUTION" | "MAKEUP";
}

export type StaffSalarySessionLog = SessionWorkLog;

export interface StaffSalaryTimesheet {
  id: string;
  staffId: string;
  staffName: string;
  role: "TEACHER" | "ASSISTANT";
  monthStr: string;           // Ví dụ: "Tháng 10/2026"
  hourlyRate: number;         // Tiền lương theo giờ
  totalHours: number;         // Tổng số giờ dạy/trực
  totalSessions: number;      // Tổng số ca hoàn thành
  baseSalary: number;         // totalHours * hourlyRate
  allowance: number;          // Phụ cấp đi lại
  bonus: number;              // Phụ cấp công việc
  deduction: number;          // Khác (Cộng hoặc Trừ: số dương là cộng, số âm là trừ)
  otherAdjustment?: number;   // Alias cho Khác (+/-)
  totalNetSalary: number;     // Thực lĩnh: baseSalary + allowance + bonus + otherAdjustment (hoặc deduction)
  sessionLogs: SessionWorkLog[];
  status: "DRAFT" | "SENT_TO_STAFF" | "PENDING_CONFIRMATION" | "CONFIRMED";
  sentAt?: string;            // Thời điểm Admin gửi bảng lương
  zaloSentAt?: string;        // Thời điểm gửi thông báo bảng lương qua Zalo
  confirmedAt?: string;
  feedbackNote?: string;      // Phản hồi của nhân sự nếu có
  adminNotes?: string;        // Ghi chú điều chỉnh của Admin
  paymentStatus?: "PAID" | "UNPAID"; // Trạng thái thanh toán chuyển khoản từ Admin
  paidAt?: string;
}

// ==============================================================
// 5. GIAO BÀI TẬP VỀ NHÀ PHONG CÁCH MICROSOFT TEAMS (ASSIGNMENTS)
// ==============================================================
export interface AssignmentItem {
  id: string;
  classId: string;
  className: string;
  sessionDate: string;          // Định dạng "YYYY-MM-DD"
  sessionTitle: string;         // Ví dụ: "Buổi 12: Unit 4 - My Loving Family & Hobbies"
  title: string;                // Tiêu đề bài tập
  instructions: string;         // Hướng dẫn làm bài chi tiết
  submissionType: HomeworkSubmissionType; // "VIDEO" | "AUDIO" | "WORKBOOK" | "WORKSHEET"
  dueDateTime: string;          // Ví dụ: "2026-11-08 20:00"
  points: number;               // Thang điểm (mặc định 10)
  referenceFileName?: string;   // Tên file tài liệu mẫu đính kèm (nếu có)
  status: "ACTIVE" | "CLOSED";
  createdAt: string;
  createdBy: string;
}

// ==============================================================
// 6. NỘP BÀI TẬP VỀ NHÀ CỦA HỌC VIÊN / PHỤ HUYNH (ONLINE HOMEWORK)
// ==============================================================
export interface HomeworkSubmission {
  id: string;
  assignmentId?: string;        // ID của Assignment (tránh nộp nhầm buổi)
  sessionTitle?: string;        // Tiêu đề buổi học (ví dụ: "Buổi 12: Unit 4 - Family")
  studentId: string;
  studentName: string;
  studentCode: string;
  classId: string;
  assignmentTitle: string;
  submissionType: HomeworkSubmissionType;
  mediaTitle: string;
  mediaUrl?: string;
  mediaStorageKey?: string;      // Khóa lưu Blob Video/Audio trong IndexedDB
  mediaMimeType?: string;        // MIME type (video/mp4, audio/mpeg, ...)
  mediaDuration?: string;
  workbookImageUrl?: string;     // [MỚI] Ảnh bài tập sách / vở viết nếu nộp BOTH hoặc WORKBOOK
  workbookStorageKey?: string;   // Khóa lưu Blob ảnh/file Workbook trong IndexedDB
  workbookMimeType?: string;     // MIME type tệp Workbook
  workbookImageFileName?: string;// [MỚI] Tên file ảnh sách bài tập
  workbookFileSize?: string;     // [MỚI] Dung lượng tệp sách bài tập
  attachmentFileName?: string;   // [MỚI] Tệp đính kèm từ máy tính / điện thoại
  attachmentFileSize?: string;   // [MỚI] Dung lượng tệp đính kèm
  attachmentFileUrl?: string;    // [MỚI] Đường dẫn tệp đính kèm
  commentFromStudent?: string;
  submittedAt: string;
  status: "GRADED" | "PENDING_GRADING";
  score?: number;
  taFeedback?: string;
  gradedBy?: string;
  gradedAt?: string;
}

// ==============================================================
// 6. ĐƠN XIN NGHỈ PHÉP CỦA PHỤ HUYNH (LEAVE REQUESTS)
// ==============================================================
export type LeaveReasonCategory = "SICK" | "FAMILY_BUSY" | "SCHOOL_EXAM" | "OTHER";

export interface ParentLeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  dateStr: string; // Ngày xin nghỉ YYYY-MM-DD
  reasonCategory: LeaveReasonCategory;
  reasonDetail: string;
  status: "APPROVED" | "PENDING";
  submittedAt: string;
}

// ==============================================================
// 7. GIAO DỊCH NẠP HỌC PHÍ VIETQR (TUITION PAYMENTS)
// ==============================================================
export interface TuitionPaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  billingMonth: string;       // Kỳ học phí theo tháng (ví dụ: "Tháng 11/2026")
  amountPaid: number;         // Tiền học phí đã đóng (VNĐ)
  paidAt: string;
  paymentMethod: "VIETQR" | "CASH";
  transactionCode: string;
  status: "COMPLETED" | "PENDING";
  note?: string;
  packageLessons?: number;    // Giữ để tương thích ngược
}

// ==============================================================
// 7.1. BẢNG TÍNH & HÓA ĐƠN HỌC PHÍ THEO THÁNG CỦA HỌC SINH (TUITION BILLS)
// Học phí = Số buổi trong tháng x Đơn giá 1 buổi. Học sinh nghỉ không được trừ tiền.
// ==============================================================
export type TuitionBillStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE";

export interface StudentTuitionBill {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  parentName: string;
  parentPhone: string;
  classId: string;
  className: string;
  billingMonth: string;          // ví dụ: "Tháng 11/2026"
  lessonCount: number;           // Số buổi trong tháng tính theo lịch
  feePerLesson: number;          // Học phí 1 buổi (VNĐ)
  calculatedAmount: number;      // Số buổi x Đơn giá 1 buổi
  surcharge?: number;            // Khoản Phụ thu / Cộng thêm (+) >= 0 (giáo trình, đồng phục, học liệu...)
  surchargeNote?: string;        // Lý do phụ thu
  discount?: number;             // Khoản Giảm trừ / Học bổng (-) >= 0 (học bổng, ưu đãi 2 con...)
  discountNote?: string;         // Lý do giảm trừ
  adjustmentAmount: number;      // Khoản điều chỉnh gộp = (surcharge || 0) - (discount || 0)
  finalAmount: number;           // Học phí thực tế cần nộp = calculatedAmount + (surcharge || 0) - (discount || 0)
  status: TuitionBillStatus;     // "DRAFT" | "SENT" | "PAID" | "OVERDUE"
  dueDate: string;               // Hạn nộp (ngày 10 hàng tháng, ví dụ "10/11/2026")
  sentAt?: string;               // Thời điểm Admin bấm gửi
  paidAt?: string;               // Thời điểm đóng tiền
  paymentMethod?: "VIETQR" | "CASH" | "BANK_TRANSFER";
  transactionCode?: string;      // Mã giao dịch
  notes?: string;                // Ghi chú tổng hợp của Admin
  reminderSentCount: number;     // Số lần đã gửi cảnh báo/nhắc nhở
  lastReminderAt?: string;
  zaloSentAt?: string;           // Thời điểm gửi thông báo học phí qua Zalo
  zaloLastReminderAt?: string;   // Thời điểm gửi nhắc nhở qua Zalo gần nhất
  policyNote?: string;           // "Học sinh nghỉ học phí không được trừ theo quy định trung tâm"
}

// ==============================================================
// 8. LỚP HỌC BÙ & QUYỀN LỢI HỌC BÙ TRONG THÁNG (MAKEUP CLASSES)
// ==============================================================
// Quy định: Học sinh vắng trong tháng được sắp xếp học bù trong tháng đó.
// Khi kết thúc tháng, nếu không học bù thì coi như mất quyền lợi (reset về 0 cho tháng mới).

export type MakeupClassStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export interface MakeupStudentEntry {
  studentId: string;
  studentName: string;
  studentCode: string;
  originalClassId: string;
  originalClassName: string;
  absentDateStr: string;          // Ngày nghỉ học gốc (cần bù)
  parentName: string;
  parentPhone: string;
  attendanceStatus: "REGISTERED" | "ATTENDED" | "ABSENT"; // Trạng thái tham gia buổi bù (Vắng buổi bù KHÔNG cộng dồn buổi vắng)
  exchangeNote?: string;          // Ghi chú sau khi trao đổi với phụ huynh
  notifiedAt?: string;            // Thời điểm gửi tin nhắn thông báo lịch học bù
  surveySentAt?: string;          // Thời điểm gửi tin nhắn khảo sát lịch rảnh
  zaloSurveySentAt?: string;      // Thời điểm gửi tin Zalo khảo sát lịch rảnh
  zaloNoticeSentAt?: string;      // Thời điểm gửi tin Zalo thông báo lịch học bù
}

export interface MakeupClass {
  id: string;
  title: string;                  // Tên lớp bù (VD: "Lớp Học Bù Shiny Kids - Ngữ pháp & Từ vựng Unit 4")
  targetClassId?: string;         // Lớp học cụ thể được chọn (hoặc "ALL" nếu ghép liên lớp)
  targetClassName?: string;
  monthStr: string;               // Tháng áp dụng (VD: "Tháng 11/2026")
  dateStr: string;                // Ngày diễn ra lớp bù (YYYY-MM-DD, vd: "2026-11-15")
  startTime: string;              // Giờ bắt đầu (vd: "09:00")
  endTime: string;                // Giờ kết thúc (vd: "10:30")
  durationHours: number;          // Số giờ dạy (để tính lương GV/TA)
  classroomId: string;            // Phòng học
  classroomName: string;
  teacherOrAssistantId: string;   // GV hoặc TA phụ trách
  teacherOrAssistantName: string;
  roleInCharge: "TEACHER" | "ASSISTANT";
  focusContent: string;           // Nội dung / Trọng tâm ôn tập
  lessonContent?: string;         // Chi tiết bài học đã dạy bù (nhật ký)
  homework?: string;              // Bài tập về nhà / dặn dò
  assistantFeedback?: string;     // Nhận xét của Trợ giảng / Giáo viên
  contentSentToParentsAt?: string; // Thời điểm trợ giảng gửi nội dung cho PH
  zaloReportSentAt?: string;      // Thời điểm gửi báo cáo buổi bù qua Zalo
  targetCourseOrLevel?: string;   // Cấp độ / Lớp hướng tới
  students: MakeupStudentEntry[]; // Danh sách học sinh đăng ký
  status: MakeupClassStatus;      // "SCHEDULED" | "COMPLETED" | "CANCELLED"
  notes?: string;                 // Ghi chú của Admin
  isSalaryRecorded?: boolean;     // Đã tính lương cho GV/TA chưa
  createdAt: string;
}

export interface ExpiredMakeupRecord {
  id: string;
  monthStr: string;               // Tháng bị hết hạn (VD: "Tháng 10/2026")
  studentId: string;
  studentName: string;
  studentCode: string;
  absentDateStr: string;          // Ngày vắng học trong tháng cũ
  originalClassId: string;
  originalClassName: string;
  expiredAt: string;              // Thời điểm kết thúc tháng reset
  reason: string;                 // "Hết hạn tháng - Mất quyền lợi học bù theo quy chế trung tâm"
}

// Bảng màu phân biệt ĐẬM NÉT & RÕ RÀNG giữa các lớp học trên Thời Khóa Biểu
export interface ClassThemeDefinition {
  id: string;
  name: string;
  label: string;
  dot: string;
  // Tuần: Nền sáng nhẹ, viền đậm, chữ tối màu dễ đọc
  weeklyBg: string;
  weeklyBorder: string;
  weeklyHeader: string;
  weeklyTimeBg: string;
  // Tháng: Pill nền đặc màu sắc nét, chữ trắng nổi bật
  monthlyPillBg: string;
  // Backward compatibility / convenience aliases
  bg: string;
  border: string;
  text: string;
}

export const CLASS_THEMES: ClassThemeDefinition[] = [
  {
    id: "blue",
    name: "Xanh Dương (Kids Star)",
    label: "Xanh Dương",
    dot: "bg-blue-600",
    weeklyBg: "bg-blue-50/90",
    weeklyBorder: "border-blue-400",
    weeklyHeader: "text-blue-950",
    weeklyTimeBg: "bg-blue-600 text-white font-bold",
    monthlyPillBg: "bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm",
    bg: "bg-blue-50/90",
    border: "border-blue-400",
    text: "text-blue-900",
  },
  {
    id: "purple",
    name: "Tím Đậm (IELTS Target)",
    label: "Tím Đậm",
    dot: "bg-purple-600",
    weeklyBg: "bg-purple-50/90",
    weeklyBorder: "border-purple-400",
    weeklyHeader: "text-purple-950",
    weeklyTimeBg: "bg-purple-600 text-white font-bold",
    monthlyPillBg: "bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-sm",
    bg: "bg-purple-50/90",
    border: "border-purple-400",
    text: "text-purple-900",
  },
  {
    id: "emerald",
    name: "Xanh Lá Cây (Teens Explorer)",
    label: "Xanh Lá Cây",
    dot: "bg-emerald-600",
    weeklyBg: "bg-emerald-50/90",
    weeklyBorder: "border-emerald-400",
    weeklyHeader: "text-emerald-950",
    weeklyTimeBg: "bg-emerald-600 text-white font-bold",
    monthlyPillBg: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm",
    bg: "bg-emerald-50/90",
    border: "border-emerald-400",
    text: "text-emerald-900",
  },
  {
    id: "rose",
    name: "Hồng Đỏ (Phonics & Kids)",
    label: "Hồng Đỏ",
    dot: "bg-rose-600",
    weeklyBg: "bg-rose-50/90",
    weeklyBorder: "border-rose-400",
    weeklyHeader: "text-rose-950",
    weeklyTimeBg: "bg-rose-600 text-white font-bold",
    monthlyPillBg: "bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm",
    bg: "bg-rose-50/90",
    border: "border-rose-400",
    text: "text-rose-900",
  },
  {
    id: "amber",
    name: "Vàng Cam (Giao Tiếp)",
    label: "Vàng Cam",
    dot: "bg-amber-600",
    weeklyBg: "bg-amber-50/90",
    weeklyBorder: "border-amber-400",
    weeklyHeader: "text-amber-950",
    weeklyTimeBg: "bg-amber-600 text-white font-bold",
    monthlyPillBg: "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-sm",
    bg: "bg-amber-50/90",
    border: "border-amber-400",
    text: "text-amber-900",
  },
  {
    id: "cyan",
    name: "Xanh Mòng Két (VIP Lab)",
    label: "Xanh Mòng Két",
    dot: "bg-cyan-600",
    weeklyBg: "bg-cyan-50/90",
    weeklyBorder: "border-cyan-400",
    weeklyHeader: "text-cyan-950",
    weeklyTimeBg: "bg-cyan-600 text-white font-bold",
    monthlyPillBg: "bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-sm",
    bg: "bg-cyan-50/90",
    border: "border-cyan-400",
    text: "text-cyan-900",
  },
  {
    id: "indigo",
    name: "Xanh Chàm (Ngữ Pháp Nâng Cao)",
    label: "Xanh Chàm",
    dot: "bg-indigo-600",
    weeklyBg: "bg-indigo-50/90",
    weeklyBorder: "border-indigo-400",
    weeklyHeader: "text-indigo-950",
    weeklyTimeBg: "bg-indigo-600 text-white font-bold",
    monthlyPillBg: "bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm",
    bg: "bg-indigo-50/90",
    border: "border-indigo-400",
    text: "text-indigo-900",
  },
  {
    id: "orange",
    name: "Cam Đậm (Phản Xạ 1-1)",
    label: "Cam Đậm",
    dot: "bg-orange-600",
    weeklyBg: "bg-orange-50/90",
    weeklyBorder: "border-orange-400",
    weeklyHeader: "text-orange-950",
    weeklyTimeBg: "bg-orange-600 text-white font-bold",
    monthlyPillBg: "bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-sm",
    bg: "bg-orange-50/90",
    border: "border-orange-400",
    text: "text-orange-900",
  },
  {
    id: "teal",
    name: "Xanh Biển Ngọc (Du Học Cấp Tốc)",
    label: "Xanh Biển Ngọc",
    dot: "bg-teal-600",
    weeklyBg: "bg-teal-50/90",
    weeklyBorder: "border-teal-400",
    weeklyHeader: "text-teal-950",
    weeklyTimeBg: "bg-teal-600 text-white font-bold",
    monthlyPillBg: "bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm",
    bg: "bg-teal-50/90",
    border: "border-teal-400",
    text: "text-teal-900",
  },
  {
    id: "fuchsia",
    name: "Tím Sen (Kèm Bổ Trợ)",
    label: "Tím Sen",
    dot: "bg-fuchsia-600",
    weeklyBg: "bg-fuchsia-50/90",
    weeklyBorder: "border-fuchsia-400",
    weeklyHeader: "text-fuchsia-950",
    weeklyTimeBg: "bg-fuchsia-600 text-white font-bold",
    monthlyPillBg: "bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold shadow-sm",
    bg: "bg-fuchsia-50/90",
    border: "border-fuchsia-400",
    text: "text-fuchsia-900",
  },
  {
    id: "red",
    name: "Đỏ Ruby (IELTS Master)",
    label: "Đỏ Ruby",
    dot: "bg-red-600",
    weeklyBg: "bg-red-50/90",
    weeklyBorder: "border-red-400",
    weeklyHeader: "text-red-950",
    weeklyTimeBg: "bg-red-600 text-white font-bold",
    monthlyPillBg: "bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm",
    bg: "bg-red-50/90",
    border: "border-red-400",
    text: "text-red-900",
  },
  {
    id: "lime",
    name: "Xanh Đọt Chuối (Vỡ Lòng)",
    label: "Xanh Đọt Chuối",
    dot: "bg-lime-600",
    weeklyBg: "bg-lime-50/90",
    weeklyBorder: "border-lime-500",
    weeklyHeader: "text-lime-950",
    weeklyTimeBg: "bg-lime-600 text-white font-bold",
    monthlyPillBg: "bg-lime-600 hover:bg-lime-700 text-white font-bold shadow-sm",
    bg: "bg-lime-50/90",
    border: "border-lime-500",
    text: "text-lime-900",
  },
];

// Xây dựng bản đồ màu sắc đảm bảo 100% KHÔNG BAO GIỜ TRÙNG MÀU giữa các lớp học
export function buildClassThemeMap(classesList: ClassItem[]): Map<string, ClassThemeDefinition> {
  const map = new Map<string, ClassThemeDefinition>();
  const usedThemeIds = new Set<string>();

  // Vòng 1: Gán cho các lớp có colorTheme hợp lệ và chưa bị lớp nào trước đó chiếm
  for (const cls of classesList) {
    if (cls.colorTheme && !usedThemeIds.has(cls.colorTheme) && CLASS_THEMES.some((t) => t.id === cls.colorTheme)) {
      const theme = CLASS_THEMES.find((t) => t.id === cls.colorTheme)!;
      map.set(cls.id, theme);
      usedThemeIds.add(cls.colorTheme);
    }
  }

  // Vòng 2: Gán màu còn trống trong bảng palette cho các lớp bị trùng hoặc chưa có màu
  let fallbackIndex = 0;
  for (const cls of classesList) {
    if (!map.has(cls.id)) {
      while (fallbackIndex < CLASS_THEMES.length && usedThemeIds.has(CLASS_THEMES[fallbackIndex].id)) {
        fallbackIndex++;
      }
      const freeTheme = CLASS_THEMES[fallbackIndex % CLASS_THEMES.length];
      map.set(cls.id, freeTheme);
      usedThemeIds.add(freeTheme.id);
      fallbackIndex++;
    }
  }

  return map;
}

// Hàm đảm bảo KHÔNG BAO GIỜ có 2 lớp trùng màu trên Thời Khóa Biểu
export function getUniqueClassTheme(classItem: ClassItem, allClasses: ClassItem[]): ClassThemeDefinition {
  const map = buildClassThemeMap(allClasses);
  return map.get(classItem.id) || CLASS_THEMES[0];
}

export const INITIAL_CLASSROOMS: ClassroomItem[] = [];

export const INITIAL_COURSES: CourseItem[] = [];

export const INITIAL_STAFF: StaffItem[] = [];
export const INITIAL_CLASSES: ClassItem[] = [];
export const INITIAL_STUDENTS: StudentItem[] = [];
export const INITIAL_SUBSTITUTIONS: SessionSubstitution[] = [];
export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];
export const INITIAL_CLASS_LOGS: ClassLogItem[] = [];
export const INITIAL_WORKBOOK_CHECKS: WorkbookCheckRecord[] = [];
export const INITIAL_INCIDENT_NOTES: StudentIncidentNote[] = [];
export const INITIAL_EXAM_REPORTS: MonthlyExamReport[] = [];
export const INITIAL_STAFF_TIMESHEETS: StaffSalaryTimesheet[] = [];
export const INITIAL_ASSIGNMENTS: AssignmentItem[] = [];
export const INITIAL_HOMEWORK_SUBMISSIONS: HomeworkSubmission[] = [];
export const INITIAL_LEAVE_REQUESTS: ParentLeaveRequest[] = [];
export const INITIAL_TUITION_PAYMENTS: TuitionPaymentRecord[] = [];
export const INITIAL_STUDENT_TUITION_BILLS: StudentTuitionBill[] = [];
export const INITIAL_MAKEUP_CLASSES: MakeupClass[] = [];
export const INITIAL_EXPIRED_MAKEUP_RECORDS: ExpiredMakeupRecord[] = [];

// ==============================================================
// 9. CẤU HÌNH TÀI KHOẢN ZALO & NHẬT KÝ TIN NHẮN (ZALO BRIDGE & LOGS)
// ==============================================================
export type ZaloAccountRole = "ADMIN" | "TEACHER" | "ASSISTANT";

export interface ZaloOAConfig {
  oaId: string;
  oaName: string;
  appId: string;
  secretKey: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  webhookUrl?: string;
  isConnected: boolean;
  quotaRemaining: number;
  templateIds: {
    tuitionNotice: string;
    tuitionReminder: string;
    classLog: string;
    homeworkResult: string;
    makeupSurvey: string;
  };
}

export const INITIAL_ZALO_OA_CONFIG: ZaloOAConfig = {
  oaId: "",
  oaName: "Ms. Dung Shiny English Center (Zalo OA)",
  appId: "",
  secretKey: "",
  accessToken: "",
  refreshToken: "",
  expiresAt: "",
  isConnected: false,
  quotaRemaining: 5000,
  templateIds: {
    tuitionNotice: "ZNS_TUITION_NOTICE_V1",
    tuitionReminder: "ZNS_TUITION_REMINDER_V1",
    classLog: "ZNS_CLASS_LOG_HOMEWORK_V1",
    homeworkResult: "ZNS_HOMEWORK_FEEDBACK_V1",
    makeupSurvey: "ZNS_MAKEUP_SURVEY_V1",
  },
};

export interface ZaloAccountConfig {
  id: string;
  role: ZaloAccountRole;
  staffId?: string; // Ví dụ "staff-t1", "staff-a1"
  accountType: "CENTER_HOTLINE" | "PERSONAL";
  accountName: string;
  phoneNumber: string;
  isConnected: boolean;
  connectedAt?: string;
  avatarUrl?: string;
  qrCodeUrl?: string;
  sessionId?: string;
  connectionMethod?: "QR_CODE" | "PHONE_PASSWORD_OTP" | "ZALO_WEB_SYNC";
}

export type ZaloMessageType = 
  | "TUITION" 
  | "TUITION_REMINDER" 
  | "MAKEUP_SURVEY" 
  | "MAKEUP_NOTICE" 
  | "MAKEUP_REPORT" 
  | "HOMEWORK_RESULT" 
  | "HOMEWORK_REMINDER" 
  | "EXAM_REPORT" 
  | "PAYROLL" 
  | "INCIDENT_NOTE"
  | "CLASS_LOG"
  | "ATTENDANCE";

export interface ZaloMessageLog {
  id: string;
  sentAt: string; // ISO string e.g. "2026-11-08T03:00:00"
  senderRole: ZaloAccountRole;
  senderName: string;
  senderPhone: string;
  senderAccountType: "CENTER_HOTLINE" | "PERSONAL";
  recipientName: string;
  recipientPhone: string;
  studentId?: string;
  studentName?: string;
  studentCode?: string;
  className?: string;
  messageType: ZaloMessageType;
  title: string;
  content: string;
  status: "SENT" | "PENDING";
}

export interface ZaloMasterTemplates {
  tuitionFirstOfMonth: string;
  tuitionDueDate: string;
  tuitionOverdue: string;
  tuitionMultiMonth: string;
  attendanceAbsent: string;
  attendanceGroupReport: string;
  classLogParent: string;
  classLogGroup: string;
  makeupSurvey: string;
  makeupSchedule: string;
  monthlyExam: string;
}

export interface ZaloSessionState {
  phoneNumber: string;
  accountName: string;
  role: ZaloAccountRole;
  isValid: boolean;
  lastHandshakeAt?: string;
  sessionExpiresAt?: string;
  handshakeToken?: string;
}

export const INITIAL_ZALO_SESSIONS: Record<ZaloAccountRole, ZaloSessionState> = {
  ADMIN: {
    role: "ADMIN",
    phoneNumber: "0964645174",
    accountName: "Ms. Dung Shiny (Hotline)",
    isValid: false,
    lastHandshakeAt: undefined,
    sessionExpiresAt: undefined,
    handshakeToken: undefined,
  },
  TEACHER: {
    role: "TEACHER",
    phoneNumber: "0901234567",
    accountName: "Giáo Viên Tiếng Anh",
    isValid: false,
    lastHandshakeAt: undefined,
    sessionExpiresAt: undefined,
    handshakeToken: undefined,
  },
  ASSISTANT: {
    role: "ASSISTANT",
    phoneNumber: "0909999888",
    accountName: "Trợ Giảng Shiny",
    isValid: false,
    lastHandshakeAt: undefined,
    sessionExpiresAt: undefined,
    handshakeToken: undefined,
  },
};

export const DEFAULT_ZALO_MASTER_TEMPLATES: ZaloMasterTemplates = {
  tuitionFirstOfMonth: `📢 THÔNG BÁO HỌC PHÍ THÁNG {month} - MS. DUNG SHINY

Kính gửi Ba Mẹ bé {studentName} ({className}),
Trung tâm xin gửi thông báo học phí định kỳ tháng {month} của con:

• Số buổi học trong tháng: {totalSessions} buổi
• Đơn giá 1 buổi: {feePerLesson}
• Tổng học phí tháng {month}: {finalAmount}
⏰ Hạn hoàn thành: Ngày {dueDate}

💳 Quý Ba Mẹ có thể quét mã VietQR tự động trên Cổng Phụ Huynh hoặc chuyển khoản:
• Số tài khoản: 0964645174 - MB Bank
• Chủ tài khoản: NGUYEN THI DUNG
• Nội dung: {transferContent}

Trung tâm xin chân thành cảm ơn Ba Mẹ!
Hotline hỗ trợ: {hotline}`,

  tuitionDueDate: `⏰ NHẮC HẸN HẠN ĐÓNG HỌC PHÍ THÁNG {month} - MS. DUNG SHINY

Kính gửi Ba Mẹ bé {studentName} ({className}),
Hôm nay là cận hạn hoàn thành học phí tháng {month} (Hạn chót: Ngày {dueDate}).

• Số tiền cần thanh toán: {finalAmount}
• Cú pháp chuyển khoản: {transferContent}
• STK: 0964645174 - MB Bank (NGUYEN THI DUNG)

Quý Ba Mẹ vui lòng thanh toán sớm để trung tâm chốt danh sách sĩ số và giáo trình học tập của con nhé ạ.
Hotline: {hotline}`,

  tuitionOverdue: `⚠️ THÔNG BÁO HỌC PHÍ QUÁ HẠN THÁNG {month} - MS. DUNG SHINY

Kính gửi Ba Mẹ bé {studentName} ({className}),
Hệ thống ghi nhận học phí tháng {month} của con hiện đã quá hạn thanh toán ({dueDate}):

• Số tiền còn thiếu: {finalAmount}
• Tình trạng: Quá Hạn

Ba Mẹ vui lòng sắp xếp hoàn tất học phí trong hôm nay hoặc liên hệ hotline {hotline} để trung tâm hỗ trợ kịp thời.
Cảm ơn Quý Ba Mẹ!`,

  tuitionMultiMonth: `🚨 THÔNG BÁO CÔNG NỢ HỌC PHÍ LŨY KẾ - MS. DUNG SHINY

Kính gửi Ba Mẹ bé {studentName} ({className}),
Trung tâm xin thông báo tổng hợp công nợ học phí của con tính đến hiện tại:

• Số tháng chưa đóng: {debtCount} tháng ({unpaidMonths})
• TỔNG NỢ LŨY KẾ: {totalDebtAmount}

Quý Ba Mẹ vui lòng thanh toán gộp toàn bộ các kỳ nợ hoặc liên hệ trực tiếp Quản lý trung tâm qua hotline: {hotline} để giải quyết dứt điểm.
Trân trọng cảm ơn Ba Mẹ!`,

  attendanceAbsent: `📢 THÔNG BÁO TÌNH HÌNH ĐIỂM DANH - MS. DUNG SHINY

Kính gửi Phụ huynh bé {studentName},
Hôm nay (ngày {dateStr}), lớp {className} đã bắt đầu ca học nhưng trung tâm chưa thấy bé {studentName} có mặt tại lớp.

📌 Ghi chú:
• Trạng thái: VẮNG MẶT
• Phụ trách: {staffName}

💡 Quý Phụ huynh yên tâm: Học phí của con được bảo lưu bài giảng đầy đủ. Trung tâm sẽ cập nhật quyền lợi học bù trong tháng và sắp xếp lịch ôn tập bổ trợ kiến thức cho con sớm nhất.
Hotline: {hotline}`,

  attendanceGroupReport: `📢 [MS. DUNG SHINY] - BÁO CÁO TÌNH HÌNH ĐIỂM DANH LỚP
━━━━━━━━━━━━━━━━━━━━━━━━
🏫 Lớp học: {className}
📅 Ngày học: {dateStr}
⏰ Ca học: {timeSlot}
🏢 Phòng học: {roomName}
👩‍🏫 Giáo viên: {teacherName}
👨‍🏫 Trợ giảng: {assistantName}

📊 TÌNH HÌNH CHUYÊN CẦN BUỔI HỌC:
• Tổng sĩ số lớp: {totalStudents} học sinh
• Có mặt đủ: {presentCount} / {totalStudents} học sinh ({presentPercent}%)
• Vắng mặt: {absentCount} học sinh

{absentListSection}

💡 Lưu ý: Các bạn học sinh vắng mặt sẽ được trung tâm bảo lưu bài giảng và sắp xếp lịch học bù trong tháng để đảm bảo kiến thức.
Hotline hỗ trợ: {hotline}
Trung tâm xin chân thành cảm ơn Quý Phụ Huynh! ❤️`,

  classLogParent: `[MS. DUNG SHINY ENGLISH CENTER]
THÔNG BÁO BUỔI HỌC & BTVN NGÀY {dateStr}

Kính gửi Ba Mẹ bé {studentName} ({className}),
{staffGreeting} xin gửi thông tin chi tiết buổi học của con:

📖 1. NỘI DUNG BUỔI HỌC:{lessonTopic}
{lessonContent}

✍️ 2. BÀI TẬP VỀ NHÀ (BTVN):
• Nhiệm vụ: {homeworkTitle}
• Hướng dẫn: {homeworkDescription}
• Hình thức nộp: {submissionType}
⏰ Hạn nộp bài: {homeworkDeadline}
{attachmentFileSection}
Ba Mẹ đồng hành và nhắc con hoàn thành bài tập nộp trên Sổ liên lạc nhé ạ!`,

  classLogGroup: `📢 [MS. DUNG SHINY ENGLISH CENTER] - THÔNG BÁO LỚP {className}
📅 BUỔI HỌC NGÀY: {dateStr}

Kính gửi Quý Phụ Huynh Lớp {className},
{staffGreeting} xin gửi tới Quý Ba Mẹ thông tin buổi học hôm nay và dặn dò bài tập về nhà của các con:

📖 1. NỘI DUNG BUỔI HỌC:{lessonTopic}
{lessonContent}

✍️ 2. BÀI TẬP VỀ NHÀ (BTVN):
• Nhiệm vụ: {homeworkTitle}
• Hướng dẫn: {homeworkDescription}
• Hình thức nộp: {submissionType}
⏰ Hạn nộp bài: {homeworkDeadline}
{attachmentFileSection}
💡 Quý Ba Mẹ vui lòng nhắc nhở các con nộp bài trên Sổ liên lạc trước hạn nộp nhé ạ.
Thầy cô xin chân thành cảm ơn Quý Ba Mẹ! ❤️`,

  makeupSurvey: `📢 KHẢO SÁT LỊCH HỌC BÙ - TRUNG TÂM TIẾNG ANH MS. DUNG SHINY

Kính gửi Ba Mẹ bé {studentName} ({className}),
Trong tháng {month}, hệ thống ghi nhận con có {absentCount} buổi vắng (ngày {absentDates}).

Để đảm bảo quyền lợi học tập và bù đắp kiến thức đầy đủ cho con, trung tâm xin khảo sát các khung giờ con có thể tham gia học bù:
1. Chiều Thứ Bảy (14:30 - 16:00 hoặc 16:30 - 18:00)
2. Sáng Chủ Nhật (09:00 - 10:30)
3. Chiều Chủ Nhật (15:00 - 16:30)

Ba Mẹ phản hồi lại tin nhắn này khung giờ thuận tiện nhất để trung tâm chốt lịch và thông báo phòng học cho con nhé ạ.
Hotline: {hotline}`,

  makeupSchedule: `📢 THÔNG BÁO LỊCH HỌC BÙ CHÍNH THỨC - MS. DUNG SHINY

Kính gửi Ba Mẹ bé {studentName} ({className}),
Trung tâm xin gửi lịch ca học bù đã được sắp xếp cho con:

• Tên ca học bù: {makeupTitle}
• Ngày học: {dateStr}
• Khung giờ: {startTime} - {endTime}
• Phòng học: {classroomName}
• Phụ trách: {staffName}
• Trọng tâm ôn tập: {focusContent}

Ba Mẹ cho con đi học đúng giờ và mang theo đầy đủ sách vở nhé ạ.
Hotline: {hotline}`,

  monthlyExam: `[MS. DUNG SHINY] BÁO CÁO KẾT QUẢ BÀI THI {month}

Kính gửi Ba Mẹ bé {studentName} ({className}),
Cô {teacherName} xin gửi kết quả bài thi đánh giá năng lực tháng {month} của con:

• Điểm số: {score}/10 Điểm
• Nhận xét của cô: "{remarks}"
{pdfUrlSection}
Ba Mẹ xem chi tiết trên Cổng Sổ liên lạc của trung tâm nhé ạ!`
};

export const INITIAL_ZALO_ACCOUNTS: ZaloAccountConfig[] = [
  {
    id: "zalo-admin",
    role: "ADMIN",
    accountType: "CENTER_HOTLINE",
    accountName: "Ms. Dung Shiny (Hotline Trung Tâm)",
    phoneNumber: "0964645174",
    isConnected: false,
    connectedAt: undefined,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=DungShiny",
  },
];

export const INITIAL_ZALO_MESSAGE_LOGS: ZaloMessageLog[] = [];

// ==============================================================
// 7. DANH SÁCH TÀI KHOẢN NGƯỜI DÙNG & PHÂN QUYỀN (AUTH ACCOUNTS)
// ==============================================================
export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  // 1. Quản trị viên duy nhất (Admin - 0964645174 / 123)
  {
    id: "acc-admin-1",
    phone: "0964645174",
    password: "123",
    role: "ADMIN",
    name: "Ms. Dung (Chủ trung tâm)",
    isLoginAllowed: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=DungShiny",
  },
];
