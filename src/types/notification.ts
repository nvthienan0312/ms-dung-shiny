// Type definitions for Independent Notification System & Zalo Integrations
// Ms. Dung Shiny English Center Management System

export type NotificationMessageType = 
  | "HOMEWORK"           // BTVN (Giao bài tập, nhắc nộp, kết quả chấm)
  | "LESSON_SCHEDULE"    // Lịch học (Lịch cố định tuần, lịch học bù, đổi ca, nghỉ lễ)
  | "STUDENT_FEEDBACK"   // Đánh giá học sinh (Nhận xét buổi học, lưu ý riêng, bài thi tháng)
  | "TUITION"            // Học phí (Thông báo đầu tháng, nhắc hạn ngày 10, quá hạn, nợ gộp)
  | "MAKEUP_CLASS"       // Lớp học bù (Khảo sát lịch rảnh, thông báo ca bù, báo cáo buổi bù)
  | "GENERAL";           // Thông báo chung từ trung tâm

export type NotificationStatus = 
  | "DRAFT"              // Bản nháp đang soạn
  | "SCHEDULED"          // Đã lập lịch chờ gửi
  | "READY_TO_SEND"      // Sẵn sàng gửi (đang trong hàng đợi)
  | "SENDING"            // Đang mở cuộc trò chuyện
  | "SENT"               // Đã gửi thành công (sau khi người dùng xác nhận thủ công)
  | "FAILED"             // Gửi thất bại / Lỗi số điện thoại
  | "CANCELLED";         // Đã hủy

export type NotificationChannel = 
  | "ZALO_PERSONAL_DEEPLINK"  // Kênh Zalo Cá Nhân qua Deeplink chính thức (Thủ công có xác nhận)
  | "ZALO_OA_ZNS"             // Kênh Zalo Doanh nghiệp ZNS (Requires Additional Authorization)
  | "SMS_BRANDNAME"           // Kênh SMS Brandname (Dự phòng tương lai)
  | "INTERNAL_PORTAL";        // Kênh Cổng Phụ Huynh nội bộ

export interface StudentParentMappingItem {
  studentId: string;
  studentCode: string;
  studentName: string;
  classId: string;
  className: string;
  parentName: string;
  parentPhone: string;
  normalizedPhone: string;     // Số chuẩn hóa 10 số (bắt đầu bằng 0)
  isValidZaloPhone: boolean;   // Số điện thoại hợp lệ cho Zalo
  hasParentPortalAccess: boolean;
  notes?: string;
}

export interface MessageTemplateItem {
  id: string;
  type: NotificationMessageType;
  title: string;
  description: string;
  contentPattern: string;      // Nội dung mẫu có chứa placeholders: {studentName}, {className}...
  availableVariables: string[];
  isDefault: boolean;
  authorRole: "ADMIN" | "TEACHER" | "ASSISTANT";
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledNotificationItem {
  id: string;
  templateId?: string;
  type: NotificationMessageType;
  title: string;
  content: string;
  
  // Thông tin người nhận
  studentId?: string;
  studentCode?: string;
  studentName?: string;
  className?: string;
  recipientName: string;
  recipientPhone: string;
  
  // Thông tin người gửi
  senderId?: string;
  senderName: string;
  senderPhone: string;
  senderRole: "ADMIN" | "TEACHER" | "ASSISTANT";
  
  // Lập lịch & Kênh gửi
  channel: NotificationChannel;
  scheduledTime?: string;     // ISO String hoặc ngày giờ định sẵn
  createdAt: string;
  
  // Trạng thái & Xác nhận
  status: NotificationStatus;
  openedAt?: string;          // Thời điểm mở Zalo qua Deeplink
  confirmedAt?: string;       // Thời điểm người dùng bấm nút "Xác Nhận Đã Gửi Thành Công"
  confirmedBy?: string;       // Tên người dùng đã bấm xác nhận
  confirmationNote?: string;  // Ghi chú khi xác nhận
  
  // Dữ liệu mở rộng
  metadata?: Record<string, any>;
}

// Notification Provider Interface
// Hỗ trợ kiến trúc đa kênh (Zalo Cá Nhân, Zalo OA, SMS Brandname...)
export interface NotificationSendResult {
  success: boolean;
  status: NotificationStatus;
  requiresManualConfirmation: boolean;
  redirectUrl?: string;       // Deeplink mở Zalo nếu là kênh thủ công
  copiedText?: string;        // Nội dung đã copy vào clipboard
  message: string;
  externalMessageId?: string;
}

export interface INotificationProvider {
  id: string;
  name: string;
  channel: NotificationChannel;
  isAvailable: boolean;
  requiresManualStep: boolean; // Zalo Personal = true; Zalo OA = false
  description: string;
  
  sendNotification(payload: ScheduledNotificationItem): Promise<NotificationSendResult>;
}

// Model cấu hình Settings -> Integrations -> Zalo Personal Account
export interface ZaloPersonalAccountIntegration {
  id: string;
  role: "ADMIN" | "TEACHER" | "ASSISTANT";
  staffId?: string;
  phoneNumber: string;
  accountName: string;
  isConnected: boolean;
  connectionStatus: "CONNECTED" | "DISCONNECTED" | "PENDING_CONFIGURATION";
  authorizationStatus: "OFFICIALLY_SUPPORTED_DEEPLINK" | "UNAUTHORIZED";
  lastConnectedAt?: string;
  notes?: string;
}
