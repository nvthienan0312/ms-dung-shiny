"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { 
  ClassItem, 
  CourseItem, 
  StaffItem, 
  StudentItem, 
  ClassroomItem,
  SessionSubstitution,
  AttendanceRecord,
  AttendanceStatus,
  CLASS_THEMES,
  INITIAL_CLASSES, 
  INITIAL_COURSES, 
  INITIAL_STAFF, 
  INITIAL_STUDENTS,
  INITIAL_CLASSROOMS,
  INITIAL_SUBSTITUTIONS,
  INITIAL_ATTENDANCE,
  INITIAL_CLASS_LOGS,
  INITIAL_WORKBOOK_CHECKS,
  INITIAL_INCIDENT_NOTES,
  INITIAL_EXAM_REPORTS,
  INITIAL_STAFF_TIMESHEETS,
  INITIAL_HOMEWORK_SUBMISSIONS,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_TUITION_PAYMENTS,
  INITIAL_STUDENT_TUITION_BILLS,
  INITIAL_ASSIGNMENTS,
  INITIAL_MAKEUP_CLASSES,
  INITIAL_EXPIRED_MAKEUP_RECORDS,
  ClassLogItem,
  WorkbookCheckRecord,
  StudentIncidentNote,
  MonthlyExamReport,
  StaffSalaryTimesheet,
  HomeworkSubmission,
  ParentLeaveRequest,
  TuitionPaymentRecord,
  StudentTuitionBill,
  TuitionBillStatus,
  AssignmentItem,
  MakeupClass,
  MakeupStudentEntry,
  ExpiredMakeupRecord,
  SessionWorkLog,
  MAKEUP_SESSION_FIXED_PAY,
  ZaloAccountConfig,
  ZaloMessageLog,
  ZaloAccountRole,
  ZaloMessageType,
  ZaloOAConfig,
  INITIAL_ZALO_OA_CONFIG,
  INITIAL_ZALO_ACCOUNTS,
  INITIAL_ZALO_MESSAGE_LOGS,
  INITIAL_USER_ACCOUNTS,
  ZaloMasterTemplates,
  DEFAULT_ZALO_MASTER_TEMPLATES,
  ZaloSessionState,
  INITIAL_ZALO_SESSIONS
} from "@/data/centerData";
import { 
  UserAccount, 
  UserRole, 
  ADMIN_DEFAULT_PHONE, 
  ADMIN_DEFAULT_PASSWORD, 
  STAFF_DEFAULT_PASSWORD 
} from "@/types/auth";
import { normalizePhoneNumber, getRoleName } from "@/utils/authHelper";
import { calculateMonthLessons, computeStudentTuitionBreakdown } from "@/utils/tuitionHelper";
import { 
  sendZaloOAServiceMessage, 
  copyToClipboardAndOpenZaloGroup,
  copyToClipboardAndOpenZalo,
  sendDirectAutoZaloMessage,
  generateTuitionZaloMessage,
  generateTuitionReminderZaloMessage,
  generateMakeupSurveyZaloMessage,
  generateMakeupNoticeZaloMessage,
  generateMakeupSessionReportZaloMessage,
  generateStudentSessionRemarkZaloMessage,
  cleanPhoneNumber,
  buildZaloAccountKey,
  formatDisplayPhone,
} from "@/utils/zaloHelper";
import {
  getTodayDateString,
  isMakeupClassPast,
  isWithinRollingTwoMonths,
  parseMonthYear,
  getDayOfWeekNumber,
} from "@/utils/dateHelper";

function calculateTimesheetMetrics(
  logs: SessionWorkLog[],
  hourlyRate: number,
  allowance: number,
  bonus: number,
  otherAdjustment: number,
  overrideTotalHours?: number
) {
  const safeLogs = logs || [];
  const makeupLogs = safeLogs.filter((l) => l.type === "MAKEUP");
  const makeupHours = makeupLogs.reduce((s, l) => s + (l.durationHours || 0), 0);
  const makeupPay = makeupLogs.length * MAKEUP_SESSION_FIXED_PAY;
  const calculatedTotalHours = Number(safeLogs.reduce((s, l) => s + (l.durationHours || 0), 0).toFixed(2));
  const totalHours = overrideTotalHours !== undefined ? overrideTotalHours : calculatedTotalHours;
  const regularHours = Math.max(0, totalHours - makeupHours);
  const baseSalary = Math.round(regularHours * hourlyRate) + makeupPay;
  const totalNetSalary = baseSalary + allowance + bonus + otherAdjustment;
  return {
    totalHours,
    totalSessions: safeLogs.length,
    baseSalary,
    totalNetSalary,
  };
}

function calcSlotDurationHours(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 1.5;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 1.5;
  const diff = (eh * 60 + em - (sh * 60 + sm)) / 60;
  return diff > 0 ? Number(diff.toFixed(2)) : 1.5;
}

const STORAGE_KEY = "ms_dung_shiny_center_data_v23_clean";
const LEGACY_STORAGE_KEY = "ms_dung_shiny_center_data_v22";

interface CenterContextType {
  classes: ClassItem[];
  courses: CourseItem[];
  staff: StaffItem[];
  students: StudentItem[];
  classrooms: ClassroomItem[];
  substitutions: SessionSubstitution[];
  attendance: AttendanceRecord[];
  classLogs: ClassLogItem[];
  workbookChecks: WorkbookCheckRecord[];
  incidentNotes: StudentIncidentNote[];
  monthlyExamReports: MonthlyExamReport[];
  staffTimesheets: StaffSalaryTimesheet[];
  homeworkSubmissions: HomeworkSubmission[];
  leaveRequests: ParentLeaveRequest[];
  tuitionPayments: TuitionPaymentRecord[];
  studentTuitionBills: StudentTuitionBill[];
  assignments: AssignmentItem[];
  makeupClasses: MakeupClass[];
  expiredMakeupRecords: ExpiredMakeupRecord[];
  zaloAccounts: ZaloAccountConfig[];
  zaloMessageLogs: ZaloMessageLog[];
  
  // Class actions
  addClass: (newCls: Omit<ClassItem, "id" | "currentStudents">) => void;
  updateClass: (id: string, updatedCls: Partial<ClassItem>) => void;
  deleteClass: (id: string) => void;

  // Student actions
  addStudent: (newStu: Omit<StudentItem, "id" | "studentCode">) => void;
  updateStudent: (id: string, updatedStu: Partial<StudentItem>) => void;
  deleteStudent: (id: string) => void;
  toggleStudentZaloFriendship: (studentId: string) => void;
  setStudentLearningStatus: (
    studentId: string, 
    status: "STUDYING" | "DROPPED", 
    reason?: string, 
    date?: string
  ) => void;

  // Staff actions
  addStaff: (newStf: Omit<StaffItem, "id" | "activeClassesCount">) => void;
  updateStaff: (id: string, updatedStf: Partial<StaffItem>) => void;
  deleteStaff: (id: string) => void;
  transferStaffClasses: (
    fromStaffId: string,
    toStaffId: string,
    classIds: string[],
    options?: { lockFromStaffLogin?: boolean }
  ) => { success: boolean; count: number; message: string };

  // Course actions
  addCourse: (newCrs: Omit<CourseItem, "id">) => void;
  updateCourse: (id: string, updatedCrs: Partial<CourseItem>) => void;
  deleteCourse: (id: string) => { success: boolean; message?: string };

  // Classroom actions
  addClassroom: (newRoom: Omit<ClassroomItem, "id">) => void;
  updateClassroom: (id: string, updatedRoom: Partial<ClassroomItem>) => void;
  deleteClassroom: (id: string) => { success: boolean; message?: string };

  // Substitution actions (Dạy thay / Trực thay)
  setSubstitution: (sub: Omit<SessionSubstitution, "id" | "createdAt">) => void;
  removeSubstitution: (classId: string, dateStr: string) => void;

  // Attendance actions (Điểm danh 1-chạm & trừ số buổi)
  saveAttendance: (
    classId: string,
    dateStr: string,
    records: Omit<AttendanceRecord, "id" | "markedAt" | "markedBy">[],
    markedBy: string
  ) => { success: boolean; message: string; deductedCount: number };
  getAttendanceForSession: (classId: string, dateStr: string) => AttendanceRecord[];

  // Class Log & Homework actions (Nhật ký buổi học & Nhận xét học viên)
  saveClassLog: (log: Omit<ClassLogItem, "id"> & { id?: string }) => { success: boolean; log: ClassLogItem };
  getClassLogForSession: (classId: string, dateStr: string) => ClassLogItem | undefined;
  deleteClassLog: (id: string) => void;

  // Workbook Check actions (Kiểm tra sách bài tập workbook tại lớp của trợ giảng)
  saveWorkbookChecks: (checks: WorkbookCheckRecord[]) => void;

  // Student Incident Notes (Lưu ý riêng từng học sinh từng buổi)
  addIncidentNote: (note: Omit<StudentIncidentNote, "id" | "sentAt">) => StudentIncidentNote;
  deleteIncidentNote: (id: string) => void;

  // Monthly Exam Reports (Báo cáo bài thi tháng kèm file PDF của giáo viên)
  saveMonthlyExamReport: (report: Omit<MonthlyExamReport, "id"> & { id?: string }) => MonthlyExamReport;

  // Staff Timesheet & Salary Confirmation (Bảng công & Xác nhận lương)
  confirmStaffTimesheet: (timesheetId: string, feedbackNote?: string) => void;
  updateStaffTimesheet: (timesheetId: string, updates: Partial<StaffSalaryTimesheet>) => void;
  recalculateStaffTimesheetHours: (timesheetId: string) => void;
  syncMonthlyTimesheets: (monthStr: string) => { count: number };
  sendTimesheetToStaff: (timesheetId: string | "ALL") => void;
  markTimesheetPaid: (timesheetId: string) => void;
  markTimesheetUnpaid: (timesheetId: string) => void;

  // Assignments (Giao bài tập theo từng buổi phong cách MS Teams)
  createAssignment: (assignment: Omit<AssignmentItem, "id" | "createdAt">) => AssignmentItem;
  updateAssignment: (id: string, updates: Partial<AssignmentItem>) => void;
  deleteAssignment: (id: string) => void;

  // Homework Submissions (Nộp bài tập trực tuyến & Trợ giảng kiểm tra)
  submitHomework: (submission: Omit<HomeworkSubmission, "id" | "submittedAt" | "status">) => HomeworkSubmission;
  gradeHomeworkSubmission: (submissionId: string, score: number | undefined, taFeedback: string, gradedBy: string) => void;

  // Parent Leave Requests (Phụ huynh xin nghỉ phép & bảo lưu buổi học)
  submitLeaveRequest: (request: Omit<ParentLeaveRequest, "id" | "submittedAt" | "status">) => ParentLeaveRequest;

  // Tuition Payments (Đóng học phí theo tháng qua VietQR)
  addTuitionPayment: (studentId: string, billingMonth: string, amountPaid: number, transactionCode?: string) => void;

  // Student Tuition Bills Management (Trình Quản Lý Học Phí Học Sinh - Admin độc quyền)
  calculateClassTuitionBills: (classId: string, billingMonth: string) => void;
  updateStudentTuitionBill: (billId: string, updates: Partial<StudentTuitionBill>) => void;
  sendTuitionBill: (billId: string, openZalo?: boolean, customMessage?: string) => void;
  sendClassTuitionBills: (classId: string, billingMonth: string) => void;
  markTuitionBillPaid: (billId: string, paymentMethod: "VIETQR" | "CASH" | "BANK_TRANSFER", transactionCode?: string, note?: string) => void;
  markTuitionBillUnpaid: (billId: string, revertToStatus?: "SENT" | "DRAFT" | "OVERDUE", note?: string) => void;
  sendTuitionReminder: (billId: string, openZalo?: boolean, customMessage?: string) => void;
  sendTuitionReminderToUnpaid: (targetBillIds: string[]) => void;
  markMultiMonthTuitionPaid: (studentId: string, billIds: string[], paymentMethod: "VIETQR" | "CASH" | "BANK_TRANSFER", transactionCode?: string, note?: string) => void;
  autoTriggerMonthlyTuition: (billingMonth: string) => void;

  // Makeup Classes Management (Lớp Học Bù & Quyền Lợi Học Bù Trong Tháng)
  createMakeupClass: (newClass: Omit<MakeupClass, "id" | "createdAt">) => MakeupClass;
  updateMakeupClass: (id: string, updates: Partial<MakeupClass>) => void;
  deleteMakeupClass: (id: string) => void;
  addStudentToMakeupClass: (makeupClassId: string, studentEntry: MakeupStudentEntry) => void;
  removeStudentFromMakeupClass: (makeupClassId: string, studentId: string, absentDateStr: string) => void;
  updateMakeupStudentAttendance: (makeupClassId: string, studentId: string, status: "REGISTERED" | "ATTENDED" | "ABSENT") => void;
  updateMakeupClassAttendance: (makeupClassId: string, records: { studentId: string; attendanceStatus: "ATTENDED" | "ABSENT" }[]) => { success: boolean; message: string };
  sendMakeupClassNotification: (makeupClassId: string, targetStudentIds?: string[]) => { success: boolean; message: string; count: number };
  sendMakeupSurveyToParents: (monthStr: string, targetStudentIds?: string[], customMessage?: string) => { success: boolean; message: string; count: number };
  sendMakeupContentToParents: (makeupClassId: string, contentData: { lessonContent: string; homework?: string; assistantFeedback?: string }) => { success: boolean; message: string };
  recordMakeupClassSalary: (makeupClassId: string) => { success: boolean; message: string };
  resetMonthlyMakeupBenefits: (monthStr: string) => { expiredCount: number; affectedStudentsCount: number };

  // Zalo Accounts & Message Logs
  updateZaloAccount: (id: string, updates: Partial<ZaloAccountConfig>) => void;
  connectZaloAccount: (
    role: ZaloAccountRole, 
    staffId?: string, 
    phoneNumber?: string, 
    accountName?: string,
    sessionId?: string,
    connectionMethod?: "QR_CODE" | "PHONE_PASSWORD_OTP" | "ZALO_WEB_SYNC"
  ) => void;
  disconnectZaloAccount: (id: string) => void;
  addZaloMessageLog: (log: Omit<ZaloMessageLog, "id" | "sentAt" | "status">) => ZaloMessageLog;
  clearZaloMessageLogs: () => void;
  getZaloAccountForUser: (role: ZaloAccountRole, staffId?: string) => ZaloAccountConfig | undefined;

  // Zalo Official Account (OA) & Nhóm Zalo Lớp
  zaloOAConfig: ZaloOAConfig;
  updateZaloOAConfig: (updates: Partial<ZaloOAConfig>) => void;
  testZaloOAConnection: () => Promise<{ success: boolean; message: string; quotaRemaining: number }>;
  sendZaloOAMessage: (params: {
    recipientPhone: string;
    recipientName: string;
    studentId?: string;
    studentName?: string;
    studentCode?: string;
    className?: string;
    messageType: ZaloMessageType;
    title: string;
    content: string;
  }) => Promise<{ success: boolean; message: string; quotaRemaining: number }>;
  sendZaloClassGroupMessage: (
    classId: string,
    messageText?: string,
    senderRole?: ZaloAccountRole,
    senderStaffId?: string,
    overrideGroupUrl?: string,
    overrideGroupId?: string
  ) => Promise<{ success: boolean; message: string; zaloGroupUrl?: string }>;
  sendZaloMessageToParent: (params: {
    recipientPhone: string;
    recipientName: string;
    studentId?: string;
    studentName?: string;
    studentCode?: string;
    className?: string;
    messageType: ZaloMessageType;
    title: string;
    content: string;
    senderRole?: ZaloAccountRole;
    senderStaffId?: string;
    senderName?: string;
    senderPhone?: string;
    openChatWindow?: boolean;
  }) => Promise<{ success: boolean; message: string; messageId: string }>;

  // Zalo Master Templates (Admin cấu hình tập trung toàn hệ thống)
  zaloTemplates: ZaloMasterTemplates;
  updateZaloTemplate: (key: keyof ZaloMasterTemplates, template: string) => void;
  resetZaloTemplates: () => void;
  renderZaloTemplate: (key: keyof ZaloMasterTemplates, tokens: Record<string, any>) => string;

  // Zalo Interactive Session Handshake & Tracking (Task 6 Option 3)
  zaloSessions: Record<ZaloAccountRole, ZaloSessionState>;
  verifyZaloSession: (role: ZaloAccountRole, phoneNumber: string, accountName?: string) => Promise<{ success: boolean; message: string }>;
  disconnectZaloSession: (role: ZaloAccountRole) => void;
  refreshZaloSession: (role: ZaloAccountRole) => void;
  isZaloSessionValid: (role: ZaloAccountRole) => boolean;

  // Auth & Account Management
  userAccounts: UserAccount[];
  currentUserAccount: UserAccount | null;
  login: (phone: string, password?: string, selectedRole?: UserRole) => { success: boolean; message: string; user?: UserAccount };
  logout: () => void;
  changeAdminPassword: (oldPass: string, newPass: string) => { success: boolean; message: string };
  updateAdminProfile: (updates: { name: string; phone: string }) => { success: boolean; message: string };
  toggleUserAccountPermission: (accountId: string, isAllowed: boolean) => void;
  setParentAccountPermissionByStudent: (studentId: string, isAllowed: boolean) => void;
  toggleAllParentPermissions: (isAllowed: boolean) => void;
  resetStaffPassword: (accountId: string) => { success: boolean; message: string };
  deleteUserAccount: (accountId: string) => void;
  setCurrentUserAccount: (account: UserAccount | null) => void;

  // Cloud Database Sync (Supabase PostgreSQL)
  cloudSyncStatus: "IDLE" | "SYNCING" | "SYNCED" | "ERROR";
  lastCloudSyncAt: string | null;
  triggerCloudSync: () => Promise<void>;
}

const CenterContext = createContext<CenterContextType | undefined>(undefined);

export function CenterProvider({ children }: { children: React.ReactNode }) {
  const [classes, setClasses] = useState<ClassItem[]>(INITIAL_CLASSES);
  const [courses, setCourses] = useState<CourseItem[]>(INITIAL_COURSES);
  const [staff, setStaff] = useState<StaffItem[]>(INITIAL_STAFF);
  const [students, setStudents] = useState<StudentItem[]>(INITIAL_STUDENTS);
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>(INITIAL_CLASSROOMS);
  const [substitutions, setSubstitutions] = useState<SessionSubstitution[]>(INITIAL_SUBSTITUTIONS);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [classLogs, setClassLogs] = useState<ClassLogItem[]>(INITIAL_CLASS_LOGS);
  const [workbookChecks, setWorkbookChecks] = useState<WorkbookCheckRecord[]>(INITIAL_WORKBOOK_CHECKS);
  const [incidentNotes, setIncidentNotes] = useState<StudentIncidentNote[]>(INITIAL_INCIDENT_NOTES);
  const [monthlyExamReports, setMonthlyExamReports] = useState<MonthlyExamReport[]>(INITIAL_EXAM_REPORTS);
  const [staffTimesheets, setStaffTimesheets] = useState<StaffSalaryTimesheet[]>(INITIAL_STAFF_TIMESHEETS);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<HomeworkSubmission[]>(INITIAL_HOMEWORK_SUBMISSIONS);
  const [leaveRequests, setLeaveRequests] = useState<ParentLeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [tuitionPayments, setTuitionPayments] = useState<TuitionPaymentRecord[]>(INITIAL_TUITION_PAYMENTS);
  const [studentTuitionBills, setStudentTuitionBills] = useState<StudentTuitionBill[]>(INITIAL_STUDENT_TUITION_BILLS);
  const [assignments, setAssignments] = useState<AssignmentItem[]>(INITIAL_ASSIGNMENTS);
  const [makeupClasses, setMakeupClasses] = useState<MakeupClass[]>(INITIAL_MAKEUP_CLASSES);
  const [expiredMakeupRecords, setExpiredMakeupRecords] = useState<ExpiredMakeupRecord[]>(INITIAL_EXPIRED_MAKEUP_RECORDS);
  const [zaloAccounts, setZaloAccounts] = useState<ZaloAccountConfig[]>(INITIAL_ZALO_ACCOUNTS);
  const [zaloMessageLogs, setZaloMessageLogs] = useState<ZaloMessageLog[]>(INITIAL_ZALO_MESSAGE_LOGS);
  const [zaloOAConfig, setZaloOAConfig] = useState<ZaloOAConfig>(INITIAL_ZALO_OA_CONFIG);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(INITIAL_USER_ACCOUNTS);
  const [currentUserAccount, setCurrentUserAccount] = useState<UserAccount | null>(null);
  const [zaloTemplates, setZaloTemplates] = useState<ZaloMasterTemplates>(DEFAULT_ZALO_MASTER_TEMPLATES);
  const [zaloSessions, setZaloSessions] = useState<Record<ZaloAccountRole, ZaloSessionState>>(INITIAL_ZALO_SESSIONS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<"IDLE" | "SYNCING" | "SYNCED" | "ERROR">("IDLE");
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<string | null>(null);
  const isCloudInitializedRef = useRef(false);
  const cloudSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper hàm chuẩn hóa và gán dữ liệu payload vào toàn bộ state của Trung tâm
  const applyDataPayload = useCallback((parsed: any) => {
    if (!parsed || typeof parsed !== "object") return;
    try {
      const loadedStaffList: StaffItem[] =
        parsed.staff && Array.isArray(parsed.staff) ? parsed.staff : [];
      setStaff(loadedStaffList);

      if (parsed.courses && Array.isArray(parsed.courses)) setCourses(parsed.courses);
      else setCourses([]);

      const rawClasses: ClassItem[] =
        parsed.classes && Array.isArray(parsed.classes) ? parsed.classes : [];

      let sanitizedStudentsList: StudentItem[] = [];
      if (parsed.students && Array.isArray(parsed.students)) {
        sanitizedStudentsList = parsed.students.map((s: any) => {
          const copy = { ...s };
          if (copy.fixedDiscount && copy.fixedDiscount > 0 && !(copy.discountPercent && copy.discountPercent > 0)) {
            const matchedCls = rawClasses.find((c) => c.id === copy.classId);
            const baseMonthly = (copy.feePerLesson || matchedCls?.feePerLesson || 200000) * 8;
            copy.discountPercent =
              baseMonthly > 0
                ? Math.min(100, Math.round((copy.fixedDiscount / baseMonthly) * 100))
                : 0;
            if (!copy.fixedDiscountNote && copy.discountPercent > 0) {
              copy.fixedDiscountNote = `Giảm ${copy.discountPercent}% học phí theo buổi`;
            }
          }
          delete copy.fixedDiscount;
          return copy as StudentItem;
        });
        setStudents(sanitizedStudentsList);
      } else {
        setStudents([]);
      }

      if (rawClasses.length > 0) {
        const usedThemes = new Set<string>();
        const sanitizedClasses = rawClasses.map((cls: ClassItem, idx: number) => {
          let tId = cls.colorTheme;
          if (!tId || usedThemes.has(tId) || !CLASS_THEMES.some((t) => t.id === tId)) {
            const free = CLASS_THEMES.find((t) => !usedThemes.has(t.id)) || CLASS_THEMES[idx % CLASS_THEMES.length];
            tId = free.id;
          }
          usedThemes.add(tId);
          return {
            ...cls,
            colorTheme: tId,
            currentStudents: sanitizedStudentsList.filter(
              (s) => s.classId === cls.id && s.learningStatus !== "DROPPED"
            ).length,
          };
        });
        setClasses(sanitizedClasses);
      } else {
        setClasses([]);
      }

      if (parsed.classrooms && Array.isArray(parsed.classrooms)) setClassrooms(parsed.classrooms);
      else setClassrooms([]);

      if (parsed.substitutions && Array.isArray(parsed.substitutions)) setSubstitutions(parsed.substitutions);
      else setSubstitutions([]);
      
      if (parsed.attendance && Array.isArray(parsed.attendance)) {
        setAttendance(parsed.attendance);
      } else {
        setAttendance([]);
      }

      if (parsed.classLogs && Array.isArray(parsed.classLogs)) {
        setClassLogs(parsed.classLogs);
      } else {
        setClassLogs([]);
      }

      if (parsed.workbookChecks && Array.isArray(parsed.workbookChecks)) {
        setWorkbookChecks(parsed.workbookChecks);
      } else {
        setWorkbookChecks([]);
      }

      if (parsed.incidentNotes && Array.isArray(parsed.incidentNotes)) {
        setIncidentNotes(parsed.incidentNotes);
      } else {
        setIncidentNotes([]);
      }

      if (parsed.monthlyExamReports && Array.isArray(parsed.monthlyExamReports)) {
        setMonthlyExamReports(parsed.monthlyExamReports);
      } else {
        setMonthlyExamReports([]);
      }

      let loadedTimesheets: StaffSalaryTimesheet[] = [];
      if (parsed.staffTimesheets && Array.isArray(parsed.staffTimesheets)) {
        loadedTimesheets = parsed.staffTimesheets.map((ts: StaffSalaryTimesheet) => {
          if (ts.paymentStatus === "PAID") return ts;
          const normalizedLogs = (ts.sessionLogs || []).map((l) =>
            l.type === "MAKEUP"
              ? { ...l, ratePerHour: MAKEUP_SESSION_FIXED_PAY, amount: MAKEUP_SESSION_FIXED_PAY }
              : l
          );
          const otherAdj = ts.otherAdjustment ?? ts.deduction ?? 0;
          const metrics = calculateTimesheetMetrics(
            normalizedLogs,
            ts.hourlyRate,
            ts.allowance,
            ts.bonus,
            otherAdj
          );
          return {
            ...ts,
            sessionLogs: normalizedLogs,
            totalHours: normalizedLogs.length > 0 ? metrics.totalHours : ts.totalHours,
            totalSessions: normalizedLogs.length > 0 ? metrics.totalSessions : ts.totalSessions,
            baseSalary:
              normalizedLogs.length > 0 ? metrics.baseSalary : Math.round(ts.totalHours * ts.hourlyRate),
            totalNetSalary:
              (normalizedLogs.length > 0 ? metrics.baseSalary : Math.round(ts.totalHours * ts.hourlyRate)) +
              ts.allowance +
              ts.bonus +
              otherAdj,
          };
        });
        setStaffTimesheets(loadedTimesheets);
      } else {
        setStaffTimesheets([]);
      }

      if (parsed.homeworkSubmissions && Array.isArray(parsed.homeworkSubmissions)) {
        setHomeworkSubmissions(parsed.homeworkSubmissions);
      } else {
        setHomeworkSubmissions([]);
      }

      if (parsed.leaveRequests && Array.isArray(parsed.leaveRequests)) {
        setLeaveRequests(parsed.leaveRequests);
      } else {
        setLeaveRequests([]);
      }

      if (parsed.tuitionPayments && Array.isArray(parsed.tuitionPayments)) {
        setTuitionPayments(parsed.tuitionPayments);
      } else {
        setTuitionPayments([]);
      }

      if (parsed.studentTuitionBills && Array.isArray(parsed.studentTuitionBills)) {
        const sanitizedBills = parsed.studentTuitionBills.map((b: StudentTuitionBill) => {
          const sur = b.surcharge !== undefined ? b.surcharge : (b.adjustmentAmount > 0 ? b.adjustmentAmount : 0);
          const stu = sanitizedStudentsList.find((s) => s.id === b.studentId);
          const effectivePct =
            b.discountPercent && b.discountPercent > 0
              ? b.discountPercent
              : b.status !== "PAID" && stu?.discountPercent && stu.discountPercent > 0
              ? stu.discountPercent
              : 0;
          const calc = b.calculatedAmount ?? b.lessonCount * b.feePerLesson;
          let disc = b.discount !== undefined ? b.discount : (b.adjustmentAmount < 0 ? Math.abs(b.adjustmentAmount) : 0);
          if (b.status !== "PAID" && effectivePct > 0) {
            disc = Math.round((calc * effectivePct) / 100);
          }
          return {
            ...b,
            calculatedAmount: calc,
            surcharge: sur,
            surchargeNote: b.surchargeNote || (b.adjustmentAmount > 0 ? (b.notes || "") : ""),
            discountPercent: effectivePct,
            discount: disc,
            discountNote:
              b.discountNote ||
              (effectivePct > 0
                ? `Giảm ${effectivePct}% học phí theo buổi`
                : b.adjustmentAmount < 0
                ? (b.notes || "")
                : ""),
            adjustmentAmount: sur - disc,
            finalAmount: Math.max(0, calc + sur - disc),
          };
        });
        setStudentTuitionBills(sanitizedBills);
      } else {
        setStudentTuitionBills([]);
      }

      if (parsed.assignments && Array.isArray(parsed.assignments)) {
        setAssignments(parsed.assignments);
      } else {
        setAssignments([]);
      }

      if (parsed.makeupClasses && Array.isArray(parsed.makeupClasses)) {
        setMakeupClasses(parsed.makeupClasses);

        // Tự động đồng bộ các lớp học bù vào bảng công nhân sự (120.000đ/ca cố định)
        const currentTs = loadedTimesheets;
        let tsUpdated = false;
        parsed.makeupClasses.forEach((mc: MakeupClass) => {
          const logId = `log-makeup-${mc.id}`;
          const targetTs = currentTs.find((t: StaffSalaryTimesheet) => t.staffId === mc.teacherOrAssistantId && t.monthStr === mc.monthStr);
          if (targetTs && !targetTs.sessionLogs?.some((l: SessionWorkLog) => l.id === logId)) {
            const dur = mc.durationHours || 1.5;
            const newLog: SessionWorkLog = {
              id: logId,
              dateStr: mc.dateStr,
              className: `[LỚP BÙ] ${mc.title}`,
              classroom: mc.classroomName,
              startTime: mc.startTime,
              endTime: mc.endTime,
              durationHours: dur,
              ratePerHour: MAKEUP_SESSION_FIXED_PAY,
              amount: MAKEUP_SESSION_FIXED_PAY,
              type: "MAKEUP",
            };
            targetTs.sessionLogs = [...(targetTs.sessionLogs || []), newLog];
            const adj = targetTs.otherAdjustment ?? targetTs.deduction ?? 0;
            const metrics = calculateTimesheetMetrics(
              targetTs.sessionLogs,
              targetTs.hourlyRate,
              targetTs.allowance,
              targetTs.bonus,
              adj
            );
            targetTs.totalHours = metrics.totalHours;
            targetTs.totalSessions = metrics.totalSessions;
            targetTs.baseSalary = metrics.baseSalary;
            targetTs.totalNetSalary = metrics.totalNetSalary;
            tsUpdated = true;
          }
        });
        if (tsUpdated) {
          setStaffTimesheets([...currentTs]);
        }
      } else {
        setMakeupClasses([]);
      }

      if (parsed.expiredMakeupRecords && Array.isArray(parsed.expiredMakeupRecords)) {
        setExpiredMakeupRecords(parsed.expiredMakeupRecords);
      } else {
        setExpiredMakeupRecords([]);
      }

      if (parsed.zaloAccounts && Array.isArray(parsed.zaloAccounts) && parsed.zaloAccounts.length > 0) {
        // Trạng thái ban đầu của Zalo luôn mặc định là CHƯA KẾT NỐI cho đến khi quét mã QR thật
        const defaultDisconnected = parsed.zaloAccounts.map((acc: ZaloAccountConfig) => ({
          ...acc,
          isConnected: false,
        }));
        setZaloAccounts(defaultDisconnected);
      } else {
        setZaloAccounts(INITIAL_ZALO_ACCOUNTS);
      }

      if (parsed.zaloMessageLogs && Array.isArray(parsed.zaloMessageLogs)) {
        setZaloMessageLogs(parsed.zaloMessageLogs);
      } else {
        setZaloMessageLogs([]);
      }

      if (parsed.zaloOAConfig && typeof parsed.zaloOAConfig === "object") {
        setZaloOAConfig((prev) => ({ ...prev, ...parsed.zaloOAConfig }));
      }

      if (parsed.userAccounts && Array.isArray(parsed.userAccounts)) {
        const hasAdmin = parsed.userAccounts.some((a: UserAccount) => a.phone === "0964645174" || a.id === "acc-admin-1");
        const list = [...parsed.userAccounts];
        if (!hasAdmin) {
          list.unshift(INITIAL_USER_ACCOUNTS[0]);
        }
        setUserAccounts(list);
      } else {
        setUserAccounts(INITIAL_USER_ACCOUNTS);
      }

      if (parsed.zaloTemplates && typeof parsed.zaloTemplates === "object") {
        setZaloTemplates({ ...DEFAULT_ZALO_MASTER_TEMPLATES, ...parsed.zaloTemplates });
      }

      if (parsed.zaloSessions && typeof parsed.zaloSessions === "object") {
        // Trạng thái ban đầu session Zalo luôn mặc định là chưa kết nối
        const resetSessions: Record<ZaloAccountRole, ZaloSessionState> = {
          ADMIN: { ...INITIAL_ZALO_SESSIONS.ADMIN, isValid: false },
          TEACHER: { ...INITIAL_ZALO_SESSIONS.TEACHER, isValid: false },
          ASSISTANT: { ...INITIAL_ZALO_SESSIONS.ASSISTANT, isValid: false },
        };
        setZaloSessions(resetSessions);
      }
    } catch (err) {
      console.error("Lỗi áp dụng dữ liệu trung tâm:", err);
    }
  }, []);

  // Khởi tạo dữ liệu: Đọc LocalStorage trước (Offline-First) + Đồng bộ Cloud Database (Supabase PostgreSQL)
  useEffect(() => {
    let isCancelled = false;

    async function initializeData() {
      let localParsed: any = null;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          localParsed = JSON.parse(saved);
          applyDataPayload(localParsed);
        } else {
          setClasses(INITIAL_CLASSES);
          setCourses(INITIAL_COURSES);
          setClassrooms(INITIAL_CLASSROOMS);
          setStaff(INITIAL_STAFF);
          setStudents(INITIAL_STUDENTS);
          setUserAccounts(INITIAL_USER_ACCOUNTS);
          setStudentTuitionBills(INITIAL_STUDENT_TUITION_BILLS);
          setZaloAccounts(INITIAL_ZALO_ACCOUNTS);
          setZaloOAConfig(INITIAL_ZALO_OA_CONFIG);
          setZaloMessageLogs(INITIAL_ZALO_MESSAGE_LOGS);
        }
      } catch (err) {
        console.error("Failed to load center data from local storage", err);
      }

      // Security requirement: Khi vào web hoặc reset web ==> Luôn quay lại phần đăng nhập, tránh rủi ro bảo mật
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("ms_dung_shiny_auth_session");
        } catch {}
      }
      setCurrentUserAccount(null);

      // Kết nối Cloud Database để lấy bản mới nhất xuyên suốt các lần deploy
      setCloudSyncStatus("SYNCING");
      try {
        const res = await fetch("/api/cloud-sync");
        if (isCancelled) return;

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            // Nạp dữ liệu mới nhất từ Supabase Cloud
            applyDataPayload(json.data);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
            } catch {}
            setCloudSyncStatus("SYNCED");
            setLastCloudSyncAt(json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString());
          } else {
            // Cơ sở dữ liệu Cloud còn trống (lần đầu setup) -> Tự động đẩy dữ liệu hiện tại lên Cloud
            const currentPayload = localParsed || {
              classes: INITIAL_CLASSES,
              courses: INITIAL_COURSES,
              staff: INITIAL_STAFF,
              students: INITIAL_STUDENTS,
              classrooms: INITIAL_CLASSROOMS,
              substitutions: INITIAL_SUBSTITUTIONS,
              attendance: INITIAL_ATTENDANCE,
              classLogs: INITIAL_CLASS_LOGS,
              workbookChecks: INITIAL_WORKBOOK_CHECKS,
              incidentNotes: INITIAL_INCIDENT_NOTES,
              monthlyExamReports: INITIAL_EXAM_REPORTS,
              staffTimesheets: INITIAL_STAFF_TIMESHEETS,
              homeworkSubmissions: INITIAL_HOMEWORK_SUBMISSIONS,
              leaveRequests: INITIAL_LEAVE_REQUESTS,
              tuitionPayments: INITIAL_TUITION_PAYMENTS,
              studentTuitionBills: INITIAL_STUDENT_TUITION_BILLS,
              assignments: INITIAL_ASSIGNMENTS,
              makeupClasses: INITIAL_MAKEUP_CLASSES,
              expiredMakeupRecords: INITIAL_EXPIRED_MAKEUP_RECORDS,
              zaloAccounts: INITIAL_ZALO_ACCOUNTS,
              zaloMessageLogs: INITIAL_ZALO_MESSAGE_LOGS,
              zaloOAConfig: INITIAL_ZALO_OA_CONFIG,
              userAccounts: INITIAL_USER_ACCOUNTS,
              zaloTemplates: DEFAULT_ZALO_MASTER_TEMPLATES,
              zaloSessions: INITIAL_ZALO_SESSIONS,
            };

            const postRes = await fetch("/api/cloud-sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data: currentPayload }),
            });

            if (postRes.ok) {
              const postJson = await postRes.json();
              setCloudSyncStatus("SYNCED");
              setLastCloudSyncAt(postJson.updatedAt ? new Date(postJson.updatedAt).toISOString() : new Date().toISOString());
            } else {
              setCloudSyncStatus("ERROR");
            }
          }
        } else {
          setCloudSyncStatus("ERROR");
        }
      } catch (cloudErr) {
        console.warn("Chưa thể kết nối Cloud DB, duy trì chế độ LocalStorage:", cloudErr);
        setCloudSyncStatus("ERROR");
      } finally {
        if (!isCancelled) {
          isCloudInitializedRef.current = true;
          setIsLoaded(true);
        }
      }
    }

    initializeData();

    return () => {
      isCancelled = true;
    };
  }, [applyDataPayload]);

  // Tự động lưu LocalStorage & Debounce 1.5s đẩy lên Cloud Database (Supabase) khi có bất kỳ thay đổi nào
  useEffect(() => {
    if (!isLoaded || !isCloudInitializedRef.current) return;

    const dataPayload = {
      classes,
      courses,
      staff,
      students,
      classrooms,
      substitutions,
      attendance,
      classLogs,
      workbookChecks,
      incidentNotes,
      monthlyExamReports,
      staffTimesheets,
      homeworkSubmissions,
      leaveRequests,
      tuitionPayments,
      studentTuitionBills,
      assignments,
      makeupClasses,
      expiredMakeupRecords,
      zaloAccounts,
      zaloMessageLogs,
      zaloOAConfig,
      userAccounts,
      zaloTemplates,
      zaloSessions,
    };

    // 1. Lưu LocalStorage tức thì
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataPayload));
    } catch (e) {
      console.error("Failed to save center data to storage", e);
    }

    // 2. Debounce lưu lên Cloud Database (Supabase)
    if (cloudSyncTimeoutRef.current) {
      clearTimeout(cloudSyncTimeoutRef.current);
    }

    setCloudSyncStatus("SYNCING");
    cloudSyncTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/cloud-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: dataPayload }),
        });
        if (res.ok) {
          const json = await res.json();
          setCloudSyncStatus("SYNCED");
          setLastCloudSyncAt(json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString());
        } else {
          console.error("Cloud sync HTTP error:", res.status);
          setCloudSyncStatus("ERROR");
        }
      } catch (err) {
        console.error("Network error during cloud sync:", err);
        setCloudSyncStatus("ERROR");
      }
    }, 1500);

    return () => {
      if (cloudSyncTimeoutRef.current) {
        clearTimeout(cloudSyncTimeoutRef.current);
      }
    };
  }, [
    classes,
    courses,
    staff,
    students,
    classrooms,
    substitutions,
    attendance,
    classLogs,
    workbookChecks,
    incidentNotes,
    monthlyExamReports,
    staffTimesheets,
    homeworkSubmissions,
    leaveRequests,
    tuitionPayments,
    studentTuitionBills,
    assignments,
    makeupClasses,
    expiredMakeupRecords,
    zaloAccounts,
    zaloMessageLogs,
    zaloOAConfig,
    userAccounts,
    zaloTemplates,
    zaloSessions,
    isLoaded,
  ]);

  // Hàm thủ công kích hoạt đồng bộ Cloud ngay lập tức
  const triggerCloudSync = async () => {
    setCloudSyncStatus("SYNCING");
    try {
      const dataPayload = {
        classes,
        courses,
        staff,
        students,
        classrooms,
        substitutions,
        attendance,
        classLogs,
        workbookChecks,
        incidentNotes,
        monthlyExamReports,
        staffTimesheets,
        homeworkSubmissions,
        leaveRequests,
        tuitionPayments,
        studentTuitionBills,
        assignments,
        makeupClasses,
        expiredMakeupRecords,
        zaloAccounts,
        zaloMessageLogs,
        zaloOAConfig,
        userAccounts,
        zaloTemplates,
        zaloSessions,
      };

      const res = await fetch("/api/cloud-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dataPayload }),
      });

      if (res.ok) {
        const json = await res.json();
        setCloudSyncStatus("SYNCED");
        setLastCloudSyncAt(json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString());
      } else {
        setCloudSyncStatus("ERROR");
      }
    } catch (err) {
      console.error("Manual cloud sync failed:", err);
      setCloudSyncStatus("ERROR");
    }
  };

  // Recalculate student counts for classes (Chỉ đếm học sinh đang theo học)
  const getStudentCountForClass = (classId: string, currentStudentList: StudentItem[]) => {
    return currentStudentList.filter((s) => s.classId === classId && s.learningStatus !== "DROPPED").length;
  };

  // CLASS ACTIONS
  const addClass = (newCls: Omit<ClassItem, "id" | "currentStudents">) => {
    const usedThemes = new Set(classes.map((c) => c.colorTheme));
    let finalColor = newCls.colorTheme;
    if (!finalColor || usedThemes.has(finalColor)) {
      const free = CLASS_THEMES.find((t) => !usedThemes.has(t.id)) || CLASS_THEMES[classes.length % CLASS_THEMES.length];
      finalColor = free.id;
    }
    const created: ClassItem = {
      ...newCls,
      id: `cls-${Date.now()}`,
      currentStudents: 0,
      colorTheme: finalColor,
    };
    setClasses((prev) => [created, ...prev]);
  };

  const updateClass = (id: string, updatedCls: Partial<ClassItem>) => {
    const oldClass = classes.find((cls) => cls.id === id);
    const nextFeePerLesson =
      updatedCls.feePerLesson !== undefined
        ? updatedCls.feePerLesson
        : oldClass?.feePerLesson;
    const nextSchedules = updatedCls.schedules ?? oldClass?.schedules;
    const nextClassName = updatedCls.name ?? oldClass?.name;

    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === id
          ? {
              ...cls,
              ...updatedCls,
              ...(nextFeePerLesson !== undefined
                ? { feePerLesson: nextFeePerLesson, monthlyFee: nextFeePerLesson * 8 }
                : {}),
            }
          : cls
      )
    );

    if (updatedCls.name || updatedCls.feePerLesson !== undefined) {
      setStudents((prev) =>
        prev.map((s) =>
          s.classId === id
            ? {
                ...s,
                ...(updatedCls.name ? { className: updatedCls.name } : {}),
                ...(updatedCls.feePerLesson !== undefined
                  ? { feePerLesson: updatedCls.feePerLesson, monthlyFee: updatedCls.feePerLesson * 8 }
                  : {}),
              }
            : s
        )
      );
    }

    if (
      updatedCls.feePerLesson !== undefined ||
      updatedCls.schedules !== undefined ||
      updatedCls.name
    ) {
      setStudentTuitionBills((prev) =>
        prev.map((bill) => {
          const stu = students.find((s) => s.id === bill.studentId);
          if (bill.classId !== id && stu?.classId !== id) return bill;
          if (bill.status === "PAID") {
            return nextClassName ? { ...bill, classId: id, className: nextClassName } : { ...bill, classId: id };
          }
          const newLessons = nextSchedules
            ? calculateMonthLessons(bill.billingMonth, nextSchedules).lessonCount || bill.lessonCount
            : bill.lessonCount;
          const newFee =
            updatedCls.feePerLesson !== undefined ? updatedCls.feePerLesson : bill.feePerLesson;
          const breakdown = computeStudentTuitionBreakdown({
            lessonCount: newLessons,
            feePerLesson: newFee,
            discountPercent: bill.discountPercent ?? stu?.discountPercent,
            surcharge: bill.surcharge || 0,
          });
          return {
            ...bill,
            classId: id,
            className: nextClassName || bill.className,
            lessonCount: newLessons,
            feePerLesson: newFee,
            calculatedAmount: breakdown.calculatedAmount,
            discountPercent: breakdown.discountPercent,
            discount: breakdown.discount,
            adjustmentAmount: breakdown.adjustmentAmount,
            finalAmount: breakdown.finalAmount,
          };
        })
      );
    }
  };

  const deleteClass = (id: string) => {
    setClasses((prev) => prev.filter((cls) => cls.id !== id));
    setStudents((prev) =>
      prev.map((s) => (s.classId === id ? { ...s, classId: undefined, className: undefined } : s))
    );
    setSubstitutions((prev) => prev.filter((sub) => sub.classId !== id));
    setAttendance((prev) => prev.filter((a) => a.classId !== id));
    setClassLogs((prev) => prev.filter((l) => l.classId !== id));
    setWorkbookChecks((prev) => prev.filter((w) => w.classId !== id));
    setIncidentNotes((prev) => prev.filter((n) => n.classId !== id));
    setMonthlyExamReports((prev) => prev.filter((r) => r.classId !== id));
    setAssignments((prev) => prev.filter((a) => a.classId !== id));
    setHomeworkSubmissions((prev) => prev.filter((sub) => sub.classId !== id));
    setLeaveRequests((prev) => prev.filter((lr) => lr.classId !== id));
    setStudentTuitionBills((prev) => prev.filter((b) => b.classId !== id || b.status === "PAID"));
    setMakeupClasses((prev) =>
      prev.map((mc) =>
        mc.targetClassId === id
          ? { ...mc, targetClassId: undefined, targetClassName: undefined }
          : mc
      )
    );
    setStaffTimesheets((prev) =>
      prev.map((ts) => {
        if (ts.paymentStatus === "PAID") return ts;
        const regPrefix = `log-reg-${id}-`;
        const taPrefix = `log-ta-${id}-`;
        if (!ts.sessionLogs?.some((l) => l.id.startsWith(regPrefix) || l.id.startsWith(taPrefix))) {
          return ts;
        }
        const remainingLogs = ts.sessionLogs.filter(
          (l) => !l.id.startsWith(regPrefix) && !l.id.startsWith(taPrefix)
        );
        const otherAdj = ts.otherAdjustment ?? ts.deduction ?? 0;
        const metrics = calculateTimesheetMetrics(
          remainingLogs,
          ts.hourlyRate,
          ts.allowance,
          ts.bonus,
          otherAdj
        );
        return {
          ...ts,
          sessionLogs: remainingLogs,
          totalHours: metrics.totalHours,
          totalSessions: metrics.totalSessions,
          baseSalary: metrics.baseSalary,
          totalNetSalary: metrics.totalNetSalary,
        };
      })
    );
  };

  // STUDENT ACTIONS
  const addStudent = (newStu: Omit<StudentItem, "id" | "studentCode">) => {
    const newCode = `MS-2026-${String(students.length + 1).padStart(3, "0")}`;
    const created: StudentItem = {
      ...newStu,
      id: `stu-${Date.now()}`,
      studentCode: newCode,
    };
    const nextStudents = [created, ...students];
    setStudents(nextStudents);

    // Tự động tạo tài khoản Phụ Huynh (Đăng nhập không cần mật khẩu)
    if (created.parentPhone) {
      const parentAcc: UserAccount = {
        id: `acc-parent-${created.id}`,
        phone: created.parentPhone,
        password: "", // Không cần mật khẩu
        role: "PARENT",
        name: created.parentName ? `${created.parentName} (PH bé ${created.fullName})` : `Phụ huynh em ${created.fullName}`,
        studentId: created.id,
        isLoginAllowed: true, // Tự động tạo để theo dõi tiến độ học tập
        createdAt: new Date().toISOString(),
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(created.parentName || created.fullName)}`,
      };
      setUserAccounts((prev) => [...prev, parentAcc]);
    }

    if (newStu.classId) {
      const count = getStudentCountForClass(newStu.classId, nextStudents);
      setClasses((prev) =>
        prev.map((c) => (c.id === newStu.classId ? { ...c, currentStudents: count } : c))
      );
    }
  };

  const updateStudent = (id: string, updatedStu: Partial<StudentItem>) => {
    const oldStudent = students.find((s) => s.id === id);
    const nextStudents = students.map((s) => (s.id === id ? { ...s, ...updatedStu } : s));
    setStudents(nextStudents);

    const currentStu = nextStudents.find((s) => s.id === id);
    const pName = updatedStu.parentName ?? currentStu?.parentName ?? "";
    const sName = updatedStu.fullName ?? currentStu?.fullName ?? "";
    const newPhone = updatedStu.parentPhone ?? currentStu?.parentPhone ?? "";
    const oldPhone = oldStudent?.parentPhone ?? "";

    // 1. Đồng bộ tài khoản Phụ Huynh (UserAccounts)
    if (updatedStu.parentPhone || updatedStu.parentName || updatedStu.fullName) {
      setUserAccounts((prev) => {
        const cleanOldPhone = normalizePhoneNumber(oldPhone);
        const hasExisting = prev.some(
          (acc) => acc.studentId === id || (acc.role === "PARENT" && normalizePhoneNumber(acc.phone) === cleanOldPhone)
        );

        if (hasExisting) {
          return prev.map((acc) => {
            if (acc.studentId === id || (acc.role === "PARENT" && normalizePhoneNumber(acc.phone) === cleanOldPhone)) {
              return {
                ...acc,
                studentId: id,
                phone: newPhone || acc.phone,
                name: pName ? `${pName} (PH bé ${sName})` : `Phụ huynh em ${sName}`,
              };
            }
            return acc;
          });
        } else if (newPhone) {
          // Tự động tạo mới tài khoản nếu chưa có
          const newAcc: UserAccount = {
            id: `acc_parent_${id}`,
            phone: newPhone,
            password: "",
            role: "PARENT",
            name: pName ? `${pName} (PH bé ${sName})` : `Phụ huynh em ${sName}`,
            studentId: id,
            isLoginAllowed: true,
            createdAt: new Date().toISOString(),
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(pName || sName)}`,
          };
          return [...prev, newAcc];
        }
        return prev;
      });

      // 2. Đồng bộ currentUserAccount nếu tài khoản đang đăng nhập là Phụ Huynh này
      if (
        currentUserAccount?.role === "PARENT" &&
        (currentUserAccount.studentId === id ||
          normalizePhoneNumber(currentUserAccount.phone) === normalizePhoneNumber(oldPhone) ||
          normalizePhoneNumber(currentUserAccount.phone) === normalizePhoneNumber(newPhone))
      ) {
        const updatedUser: UserAccount = {
          ...currentUserAccount,
          studentId: id,
          phone: newPhone || currentUserAccount.phone,
          name: pName ? `${pName} (PH bé ${sName})` : `Phụ huynh em ${sName}`,
        };
        setCurrentUserAccount(updatedUser);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("ms_dung_shiny_auth_session", JSON.stringify(updatedUser));
          } catch {}
        }
      }

      // 3. Đồng bộ Hóa đơn học phí (Tuition Bills) trên toàn bộ các tháng của học sinh
      setStudentTuitionBills((prev) =>
        prev.map((bill) => {
          if (bill.studentId === id) {
            return {
              ...bill,
              parentPhone: newPhone || bill.parentPhone,
              parentName: pName || bill.parentName,
              studentName: sName || bill.studentName,
            };
          }
          return bill;
        })
      );

      // 4. Đồng bộ Lớp học bù (Makeup Classes) trong danh sách học sinh đăng ký
      setMakeupClasses((prev) =>
        prev.map((mc) => ({
          ...mc,
          students: mc.students.map((entry) => {
            if (entry.studentId === id) {
              return {
                ...entry,
                parentPhone: newPhone || entry.parentPhone,
                parentName: pName || entry.parentName,
                studentName: sName || entry.studentName,
              };
            }
            return entry;
          }),
        }))
      );
    }

    // 4b. Tự động cập nhật hóa đơn chưa thanh toán nếu Admin thay đổi giảm trừ (%/VNĐ), đơn giá buổi hoặc chuyển lớp
    if (
      updatedStu.discountPercent !== undefined ||
      updatedStu.fixedDiscountNote !== undefined ||
      updatedStu.feePerLesson !== undefined ||
      updatedStu.classId !== undefined
    ) {
      const nextClass = classes.find((c) => c.id === (updatedStu.classId ?? currentStu?.classId));
      const nextFeePerLesson =
        updatedStu.feePerLesson ?? currentStu?.feePerLesson ?? nextClass?.feePerLesson;
      const nextDiscountPercent = Math.min(
        100,
        Math.max(0, updatedStu.discountPercent ?? currentStu?.discountPercent ?? 0)
      );
      const nextDiscountNote =
        (updatedStu.fixedDiscountNote ?? currentStu?.fixedDiscountNote)?.trim() ||
        (nextDiscountPercent > 0 ? `Giảm ${nextDiscountPercent}% học phí theo buổi` : "");

      setStudentTuitionBills((prev) =>
        prev.map((bill) => {
          if (bill.studentId !== id || bill.status === "PAID") return bill;
          const isManualCustomDiscount =
            (bill.discount || 0) > 0 &&
            !(bill.discountPercent && bill.discountPercent > 0) &&
            Boolean(bill.discountNote) &&
            !bill.discountNote?.includes("cố định") &&
            !bill.discountNote?.includes("%") &&
            bill.discountNote !== oldStudent?.fixedDiscountNote;

          const effectiveLessons =
            updatedStu.classId !== undefined && nextClass
              ? calculateMonthLessons(bill.billingMonth, nextClass.schedules).lessonCount ||
                bill.lessonCount
              : bill.lessonCount;
          const effectiveFee =
            nextFeePerLesson !== undefined ? nextFeePerLesson : bill.feePerLesson;
          const breakdown = computeStudentTuitionBreakdown({
            lessonCount: effectiveLessons,
            feePerLesson: effectiveFee,
            discountPercent: isManualCustomDiscount ? 0 : nextDiscountPercent,
            surcharge: bill.surcharge || 0,
          });
          const disc = isManualCustomDiscount ? (bill.discount || 0) : breakdown.discount;
          const adj = breakdown.surcharge - disc;
          const discNote = isManualCustomDiscount ? bill.discountNote : nextDiscountNote;

          return {
            ...bill,
            ...(nextClass ? { classId: nextClass.id, className: nextClass.name } : {}),
            lessonCount: effectiveLessons,
            feePerLesson: effectiveFee,
            calculatedAmount: breakdown.calculatedAmount,
            discountPercent: breakdown.discountPercent,
            discount: disc,
            discountNote: discNote,
            adjustmentAmount: adj,
            finalAmount: Math.max(0, breakdown.calculatedAmount + adj),
          };
        })
      );
    }

    // 5. Đồng bộ tên học sinh nếu đổi tên
    if (updatedStu.fullName && sName) {
      setAttendance((prev) =>
        prev.map((a) => (a.studentId === id ? { ...a, studentName: sName } : a))
      );
      setClassLogs((prev) =>
        prev.map((log) => ({
          ...log,
          studentRemarks: log.studentRemarks?.map((r) => (r.studentId === id ? { ...r, studentName: sName } : r)) || [],
        }))
      );
      setWorkbookChecks((prev) =>
        prev.map((w) => (w.studentId === id ? { ...w, studentName: sName } : w))
      );
      setIncidentNotes((prev) =>
        prev.map((note) => (note.studentId === id ? { ...note, studentName: sName } : note))
      );
      setMonthlyExamReports((prev) =>
        prev.map((rep) => (rep.studentId === id ? { ...rep, studentName: sName } : rep))
      );
      setHomeworkSubmissions((prev) =>
        prev.map((sub) => (sub.studentId === id ? { ...sub, studentName: sName } : sub))
      );
    }

    setClasses((prev) =>
      prev.map((cls) => ({
        ...cls,
        currentStudents: getStudentCountForClass(cls.id, nextStudents),
      }))
    );
  };

  const toggleStudentZaloFriendship = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        const current = s.zaloFriendshipStatus || "FRIENDED";
        const nextStatus = current === "FRIENDED" ? "NOT_FRIENDED" : "FRIENDED";
        return { ...s, zaloFriendshipStatus: nextStatus };
      })
    );
  };

  const setStudentLearningStatus = (
    studentId: string,
    status: "STUDYING" | "DROPPED",
    reason?: string,
    date?: string
  ) => {
    const nextStudents = students.map((s) => {
      if (s.id !== studentId) return s;
      return {
        ...s,
        learningStatus: status,
        droppedDate: status === "DROPPED" ? (date || getTodayDateString()) : undefined,
        droppedReason: status === "DROPPED" ? (reason || "Đã nghỉ học hẳn") : undefined,
      };
    });

    setStudents(nextStudents);

    setClasses((prev) =>
      prev.map((cls) => ({
        ...cls,
        currentStudents: getStudentCountForClass(cls.id, nextStudents),
      }))
    );
  };

  const deleteStudent = (id: string) => {
    const nextStudents = students.filter((s) => s.id !== id);
    setStudents(nextStudents);
    setUserAccounts((prev) => prev.filter((acc) => acc.studentId !== id));
    setClasses((prev) =>
      prev.map((cls) => ({
        ...cls,
        currentStudents: getStudentCountForClass(cls.id, nextStudents),
      }))
    );
    setAttendance((prev) => prev.filter((a) => a.studentId !== id));
    setWorkbookChecks((prev) => prev.filter((w) => w.studentId !== id));
    setIncidentNotes((prev) => prev.filter((n) => n.studentId !== id));
    setMonthlyExamReports((prev) => prev.filter((r) => r.studentId !== id));
    setHomeworkSubmissions((prev) => prev.filter((sub) => sub.studentId !== id));
    setLeaveRequests((prev) => prev.filter((lr) => lr.studentId !== id));
    setStudentTuitionBills((prev) => prev.filter((b) => b.studentId !== id || b.status === "PAID"));
    setMakeupClasses((prev) =>
      prev.map((mc) => ({
        ...mc,
        students: mc.students.filter((st) => st.studentId !== id),
      }))
    );
    setClassLogs((prev) =>
      prev.map((l) => ({
        ...l,
        studentRemarks: (l.studentRemarks || []).filter((r) => r.studentId !== id),
      }))
    );
  };

  // STAFF ACTIONS
  const addStaff = (newStf: Omit<StaffItem, "id" | "activeClassesCount">) => {
    const created: StaffItem = {
      ...newStf,
      id: `staff-${Date.now()}`,
      activeClassesCount: 0,
    };
    setStaff((prev) => [...prev, created]);

    // Tự động tạo tài khoản đăng nhập cho Giáo Viên / Trợ Giảng
    // Mật khẩu mặc định luôn là "123456a@"
    // Ban đầu isLoginAllowed = false (Chỉ admin mới có quyền phân quyền đăng nhập)
    const newStaffAccount: UserAccount = {
      id: `acc-${created.id}`,
      phone: created.phone,
      password: STAFF_DEFAULT_PASSWORD,
      role: created.role,
      name: created.fullName,
      staffId: created.id,
      isLoginAllowed: false, // Bắt buộc Admin phải phân quyền mới đăng nhập được!
      createdAt: new Date().toISOString(),
      avatarUrl: created.avatarUrl,
    };
    setUserAccounts((prev) => [...prev, newStaffAccount]);
  };

  const updateStaff = (id: string, updatedStf: Partial<StaffItem>) => {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...updatedStf } : s)));

    // Đồng bộ vào tài khoản người dùng
    setUserAccounts((prev) =>
      prev.map((acc) => {
        if (acc.staffId === id) {
          return {
            ...acc,
            phone: updatedStf.phone ?? acc.phone,
            name: updatedStf.fullName ?? acc.name,
            role: (updatedStf.role as UserRole) ?? acc.role,
            avatarUrl: updatedStf.avatarUrl ?? acc.avatarUrl,
          };
        }
        return acc;
      })
    );

    if (updatedStf.fullName) {
      setClasses((prev) =>
        prev.map((cls) => {
          let updatedCls = { ...cls };
          if (cls.teacherId === id) updatedCls.teacherName = updatedStf.fullName!;
          if (cls.assistantId === id) updatedCls.assistantName = updatedStf.fullName!;
          if (cls.schedules.some((s) => s.teacherId === id || s.assistantId === id)) {
            updatedCls.schedules = cls.schedules.map((sch) => ({
              ...sch,
              teacherName: sch.teacherId === id ? updatedStf.fullName! : sch.teacherName,
              assistantName: sch.assistantId === id ? updatedStf.fullName! : sch.assistantName,
            }));
          }
          return updatedCls;
        })
      );
    }
  };

  const deleteStaff = (id: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    setUserAccounts((prev) => prev.filter((acc) => acc.staffId !== id));
    setClasses((prev) =>
      prev.map((cls) => ({
        ...cls,
        teacherId: cls.teacherId === id ? "" : cls.teacherId,
        teacherName: cls.teacherId === id ? "Chưa phân công" : cls.teacherName,
        assistantId: cls.assistantId === id ? "" : cls.assistantId,
        assistantName: cls.assistantId === id ? "Chưa phân công" : cls.assistantName,
        schedules: cls.schedules.map((sch) => ({
          ...sch,
          teacherId: sch.teacherId === id ? "" : sch.teacherId,
          teacherName: sch.teacherId === id ? "Chưa phân công" : sch.teacherName,
          assistantId: sch.assistantId === id ? "" : sch.assistantId,
          assistantName: sch.assistantId === id ? "Chưa phân công" : sch.assistantName,
        })),
      }))
    );
    setSubstitutions((prev) =>
      prev
        .map((sub) => ({
          ...sub,
          subTeacherId: sub.subTeacherId === id ? undefined : sub.subTeacherId,
          subTeacherName: sub.subTeacherId === id ? undefined : sub.subTeacherName,
          subAssistantId: sub.subAssistantId === id ? undefined : sub.subAssistantId,
          subAssistantName: sub.subAssistantId === id ? undefined : sub.subAssistantName,
        }))
        .filter((sub) => sub.subTeacherId || sub.subAssistantId)
    );
    setStaffTimesheets((prev) => prev.filter((ts) => ts.staffId !== id || ts.paymentStatus === "PAID"));
  };

  const transferStaffClasses = (
    fromStaffId: string,
    toStaffId: string,
    classIds: string[],
    options?: { lockFromStaffLogin?: boolean }
  ): { success: boolean; count: number; message: string } => {
    const fromStaff = staff.find((s) => s.id === fromStaffId);
    const toStaff = staff.find((s) => s.id === toStaffId);

    if (!fromStaff || !toStaff) {
      return { success: false, count: 0, message: "Không tìm thấy thông tin nhân sự bàn giao hoặc tiếp nhận." };
    }
    if (fromStaff.role !== toStaff.role) {
      return { success: false, count: 0, message: "Nhân sự nhận bàn giao phải có cùng vai trò (Giáo viên hoặc Trợ giảng)." };
    }
    if (classIds.length === 0) {
      return { success: false, count: 0, message: "Vui lòng chọn ít nhất một lớp học để bàn giao." };
    }

    const isTeacher = fromStaff.role === "TEACHER";

    // 1. Cập nhật các lớp học được bàn giao
    setClasses((prevClasses) => {
      return prevClasses.map((cls) => {
        if (!classIds.includes(cls.id)) return cls;

        let newTeacherId = cls.teacherId;
        let newTeacherName = cls.teacherName;
        let newAssistantId = cls.assistantId;
        let newAssistantName = cls.assistantName;

        if (isTeacher) {
          if (cls.teacherId === fromStaffId) {
            newTeacherId = toStaffId;
            newTeacherName = toStaff.fullName;
          }
        } else {
          if (cls.assistantId === fromStaffId) {
            newAssistantId = toStaffId;
            newAssistantName = toStaff.fullName;
          }
        }

        // Cập nhật cả trong schedules
        const updatedSchedules = cls.schedules.map((slot) => {
          if (isTeacher) {
            if (slot.teacherId === fromStaffId) {
              return { ...slot, teacherId: toStaffId, teacherName: toStaff.fullName };
            }
          } else {
            if (slot.assistantId === fromStaffId) {
              return { ...slot, assistantId: toStaffId, assistantName: toStaff.fullName };
            }
          }
          return slot;
        });

        return {
          ...cls,
          teacherId: newTeacherId,
          teacherName: newTeacherName,
          assistantId: newAssistantId,
          assistantName: newAssistantName,
          schedules: updatedSchedules,
        };
      });
    });

    // 2. Tùy chọn khóa quyền đăng nhập của nhân sự bàn giao (nếu là trường hợp nghỉ việc)
    if (options?.lockFromStaffLogin) {
      setUserAccounts((prevAccounts) => {
        return prevAccounts.map((acc) => {
          if (acc.staffId === fromStaffId) {
            return { ...acc, isLoginAllowed: false };
          }
          return acc;
        });
      });
    }

    return {
      success: true,
      count: classIds.length,
      message: `Đã bàn giao thành công ${classIds.length} lớp học từ ${fromStaff.fullName} sang ${toStaff.fullName}!`,
    };
  };

  // COURSE ACTIONS
  const addCourse = (newCrs: Omit<CourseItem, "id">) => {
    const created: CourseItem = {
      ...newCrs,
      id: `crs-${Date.now()}`,
    };
    setCourses((prev) => [...prev, created]);
  };

  const updateCourse = (id: string, updatedCrs: Partial<CourseItem>) => {
    const oldCourse = courses.find((c) => c.id === id);
    const nextCourseFee =
      updatedCrs.standardFeePerLesson !== undefined
        ? updatedCrs.standardFeePerLesson
        : oldCourse?.standardFeePerLesson;

    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...updatedCrs } : c)));

    // Tự động link học phí/buổi & tên chương trình sang toàn bộ Lớp -> Học sinh -> Hóa đơn chưa thu
    const affectedClassIds = classes.filter((cls) => cls.courseId === id).map((cls) => cls.id);
    if (
      affectedClassIds.length > 0 &&
      (updatedCrs.standardFeePerLesson !== undefined || updatedCrs.name !== undefined)
    ) {
      setClasses((prev) =>
        prev.map((cls) =>
          cls.courseId === id
            ? {
                ...cls,
                ...(updatedCrs.name ? { courseName: updatedCrs.name } : {}),
                ...(updatedCrs.standardFeePerLesson !== undefined && nextCourseFee !== undefined
                  ? { feePerLesson: nextCourseFee, monthlyFee: nextCourseFee * 8 }
                  : {}),
              }
            : cls
        )
      );

      if (updatedCrs.standardFeePerLesson !== undefined && nextCourseFee !== undefined) {
        setStudents((prev) =>
          prev.map((stu) =>
            stu.classId && affectedClassIds.includes(stu.classId)
              ? { ...stu, feePerLesson: nextCourseFee, monthlyFee: nextCourseFee * 8 }
              : stu
          )
        );

        setStudentTuitionBills((prev) =>
          prev.map((bill) => {
            if (!affectedClassIds.includes(bill.classId) || bill.status === "PAID") return bill;
            const stu = students.find((s) => s.id === bill.studentId);
            const breakdown = computeStudentTuitionBreakdown({
              lessonCount: bill.lessonCount,
              feePerLesson: nextCourseFee,
              discountPercent: bill.discountPercent ?? stu?.discountPercent,
              surcharge: bill.surcharge || 0,
            });
            return {
              ...bill,
              feePerLesson: nextCourseFee,
              calculatedAmount: breakdown.calculatedAmount,
              discountPercent: breakdown.discountPercent,
              discount: breakdown.discount,
              adjustmentAmount: breakdown.adjustmentAmount,
              finalAmount: breakdown.finalAmount,
            };
          })
        );
      }
    }
  };

  const deleteCourse = (id: string): { success: boolean; message?: string } => {
    const course = courses.find((c) => c.id === id);
    if (!course) return { success: false, message: "Khóa học không tồn tại" };

    const inUseClasses = classes.filter((cls) => cls.courseId === id);
    if (inUseClasses.length > 0) {
      return {
        success: false,
        message: `Không thể xóa: Chương trình "${course.name}" đang có ${inUseClasses.length} lớp học áp dụng (${inUseClasses.map(c => c.name).join(", ")}). Vui lòng chuyển lớp sang khóa khác hoặc xóa các lớp trước!`,
      };
    }

    setCourses((prev) => prev.filter((c) => c.id !== id));
    return { success: true };
  };

  // CLASSROOM ACTIONS
  const addClassroom = (newRoom: Omit<ClassroomItem, "id">) => {
    const created: ClassroomItem = {
      ...newRoom,
      id: `room-${Date.now()}`,
    };
    setClassrooms((prev) => [...prev, created]);
  };

  const updateClassroom = (id: string, updatedRoom: Partial<ClassroomItem>) => {
    const oldRoom = classrooms.find((r) => r.id === id);
    setClassrooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...updatedRoom } : r)));

    // If room name changed, update classes and per-day schedules using that room
    if (oldRoom && updatedRoom.name && oldRoom.name !== updatedRoom.name) {
      setClasses((prev) =>
        prev.map((cls) => ({
          ...cls,
          classroom: cls.classroom === oldRoom.name ? updatedRoom.name! : cls.classroom,
          schedules: cls.schedules.map((s) =>
            s.classroom === oldRoom.name ? { ...s, classroom: updatedRoom.name! } : s
          ),
        }))
      );
    }
  };

  const deleteClassroom = (id: string): { success: boolean; message?: string } => {
    const room = classrooms.find((r) => r.id === id);
    if (!room) return { success: false, message: "Phòng học không tồn tại" };

    const inUseByClass = classes.find(
      (c) => c.classroom === room.name || c.schedules.some((s) => s.classroom === room.name)
    );
    if (inUseByClass) {
      return {
        success: false,
        message: `Không thể xóa: "${room.name}" đang được sử dụng bởi lớp "${inUseByClass.name}". Vui lòng đổi phòng học cho lớp trước!`,
      };
    }

    setClassrooms((prev) => prev.filter((r) => r.id !== id));
    return { success: true };
  };

  // SUBSTITUTION ACTIONS
  const setSubstitution = (sub: Omit<SessionSubstitution, "id" | "createdAt">) => {
    setSubstitutions((prev) => {
      const filtered = prev.filter(
        (s) => !(s.classId === sub.classId && s.dateStr === sub.dateStr)
      );
      const created: SessionSubstitution = {
        ...sub,
        id: `sub-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      return [...filtered, created];
    });
  };

  const removeSubstitution = (classId: string, dateStr: string) => {
    setSubstitutions((prev) =>
      prev.filter((s) => !(s.classId === classId && s.dateStr === dateStr))
    );
  };

  // ATTENDANCE ACTIONS (Điểm danh chuyên cần tại lớp)
  const saveAttendance = (
    classId: string,
    dateStr: string,
    records: Omit<AttendanceRecord, "id" | "markedAt" | "markedBy">[],
    markedBy: string
  ): { success: boolean; message: string; deductedCount: number } => {
    const nowStr = new Date().toISOString();

    // Điểm danh ghi nhận tình hình chuyên cần (PRESENT / ABSENT / LATE) của học viên trong lớp
    // Trung tâm thu học phí cố định theo tháng nên điểm danh KHÔNG trừ buổi học

    // Tạo bản ghi điểm danh mới
    const newRecords: AttendanceRecord[] = records.map((r, idx) => ({
      ...r,
      id: `att-${Date.now()}-${idx}`,
      markedAt: nowStr,
      markedBy: markedBy || "Trợ giảng",
    }));

    // Cập nhật mảng attendance
    setAttendance((prev) => {
      const filtered = prev.filter(
        (a) => !(a.classId === classId && a.dateStr === dateStr)
      );
      return [...filtered, ...newRecords];
    });

    return {
      success: true,
      message: `Đã lưu điểm danh thành công cho ${records.length} học sinh.`,
      deductedCount: 0,
    };
  };

  const getAttendanceForSession = (classId: string, dateStr: string): AttendanceRecord[] => {
    return attendance.filter((a) => a.classId === classId && a.dateStr === dateStr);
  };

  // ==============================================================
  // CLASS LOG & HOMEWORK ACTIONS
  // ==============================================================
  const saveClassLog = (logData: Omit<ClassLogItem, "id"> & { id?: string }) => {
    const logId = logData.id || `log-${Date.now()}`;
    const fullLog: ClassLogItem = {
      ...logData,
      id: logId,
    };

    setClassLogs((prev) => {
      // Tìm xem log cho lớp và ngày này đã tồn tại chưa
      const existingIdx = prev.findIndex(
        (l) => l.id === logId || (l.classId === fullLog.classId && l.dateStr === fullLog.dateStr)
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = fullLog;
        return next;
      }
      return [fullLog, ...prev];
    });

    return {
      success: true,
      log: fullLog,
    };
  };

  const getClassLogForSession = (classId: string, dateStr: string): ClassLogItem | undefined => {
    return classLogs.find((l) => l.classId === classId && l.dateStr === dateStr);
  };

  const deleteClassLog = (id: string) => {
    const targetLog = classLogs.find((l) => l.id === id);
    setClassLogs((prev) => prev.filter((l) => l.id !== id));
    if (targetLog) {
      const removedAssignIds = assignments
        .filter((a) => a.classId === targetLog.classId && a.sessionDate === targetLog.dateStr)
        .map((a) => a.id);
      if (removedAssignIds.length > 0) {
        setAssignments((prev) => prev.filter((a) => !removedAssignIds.includes(a.id)));
        setHomeworkSubmissions((prev) =>
          prev.filter((sub) => !sub.assignmentId || !removedAssignIds.includes(sub.assignmentId))
        );
      }
    }
  };

  // ==============================================================
  // 1. WORKBOOK CHECK ACTIONS (TRỢ GIẢNG KIỂM TRA SÁCH VỞ TẠI LỚP)
  // ==============================================================
  const saveWorkbookChecks = (checks: WorkbookCheckRecord[]) => {
    setWorkbookChecks((prev) => {
      if (checks.length === 0) return prev;
      const classId = checks[0].classId;
      const dateStr = checks[0].dateStr;
      const otherRecords = prev.filter(
        (r) => !(r.classId === classId && r.dateStr === dateStr)
      );
      return [...otherRecords, ...checks];
    });
  };

  // ==============================================================
  // 2. STUDENT INCIDENT NOTES ACTIONS (LƯU Ý RIÊNG TỪNG HỌC SINH TỪNG BUỔI)
  // ==============================================================
  const addIncidentNote = (noteData: Omit<StudentIncidentNote, "id" | "sentAt">) => {
    const newNote: StudentIncidentNote = {
      ...noteData,
      id: `inc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sentAt: new Date().toISOString(),
    };
    setIncidentNotes((prev) => [newNote, ...prev]);
    return newNote;
  };

  const deleteIncidentNote = (id: string) => {
    setIncidentNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // ==============================================================
  // 3. MONTHLY EXAM REPORT ACTIONS (BÁO CÁO BÀI THI THÁNG KÈM PDF CỦA GV)
  // ==============================================================
  const saveMonthlyExamReport = (reportData: Omit<MonthlyExamReport, "id"> & { id?: string }) => {
    const reportId = reportData.id || `exam-${Date.now()}`;
    const fullReport: MonthlyExamReport = {
      ...reportData,
      id: reportId,
      sentAt: reportData.status === "SENT_TO_PARENT" ? new Date().toISOString() : reportData.sentAt,
    };

    setMonthlyExamReports((prev) => {
      const idx = prev.findIndex((r) => r.id === reportId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = fullReport;
        return next;
      }
      return [fullReport, ...prev];
    });

    return fullReport;
  };

  // ==============================================================
  // 4. STAFF TIMESHEET CONFIRMATION & PAYROLL (BẢNG CÔNG & LƯƠNG NHÂN SỰ)
  // ==============================================================
  const confirmStaffTimesheet = (timesheetId: string, feedbackNote?: string) => {
    setStaffTimesheets((prev) =>
      prev.map((ts) => {
        if (ts.id !== timesheetId) return ts;
        return {
          ...ts,
          status: "CONFIRMED",
          confirmedAt: new Date().toISOString(),
          feedbackNote: feedbackNote || ts.feedbackNote,
        };
      })
    );
  };

  const updateStaffTimesheet = (timesheetId: string, updates: Partial<StaffSalaryTimesheet>) => {
    setStaffTimesheets((prev) =>
      prev.map((ts) => {
        if (ts.id !== timesheetId) return ts;
        const hourlyRate = updates.hourlyRate !== undefined ? updates.hourlyRate : ts.hourlyRate;
        const allowance = updates.allowance !== undefined ? updates.allowance : ts.allowance; // Phụ cấp đi lại
        const bonus = updates.bonus !== undefined ? updates.bonus : ts.bonus; // Phụ cấp công việc
        // Khác (Cộng hoặc trừ: số dương là cộng, số âm là trừ)
        const otherAdjustment = updates.otherAdjustment !== undefined 
          ? updates.otherAdjustment 
          : (updates.deduction !== undefined ? updates.deduction : (ts.otherAdjustment ?? ts.deduction ?? 0));
        const metrics = calculateTimesheetMetrics(
          ts.sessionLogs || [],
          hourlyRate,
          allowance,
          bonus,
          otherAdjustment,
          updates.totalHours
        );

        return {
          ...ts,
          ...updates,
          totalHours: metrics.totalHours,
          hourlyRate,
          allowance,
          bonus,
          deduction: otherAdjustment,
          otherAdjustment,
          baseSalary: metrics.baseSalary,
          totalNetSalary: metrics.totalNetSalary,
        };
      })
    );
  };

  const recalculateStaffTimesheetHours = (timesheetId: string) => {
    setStaffTimesheets((prev) =>
      prev.map((ts) => {
        if (ts.id !== timesheetId) return ts;
        const otherAdjustment = ts.otherAdjustment !== undefined ? ts.otherAdjustment : (ts.deduction || 0);
        const metrics = calculateTimesheetMetrics(
          ts.sessionLogs || [],
          ts.hourlyRate,
          ts.allowance,
          ts.bonus,
          otherAdjustment
        );

        return {
          ...ts,
          totalHours: metrics.totalHours,
          totalSessions: metrics.totalSessions,
          baseSalary: metrics.baseSalary,
          totalNetSalary: metrics.totalNetSalary,
          deduction: otherAdjustment,
          otherAdjustment,
        };
      })
    );
  };

  const syncMonthlyTimesheets = (monthStr: string): { count: number } => {
    const parsed = parseMonthYear(monthStr);
    if (!parsed) return { count: 0 };
    const { month, year } = parsed;
    const daysInMonth = new Date(year, month, 0).getDate();
    const staffLogsMap: Record<string, SessionWorkLog[]> = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dow = getDayOfWeekNumber(dateStr);

      classes.forEach((cls) => {
        (cls.schedules || []).forEach((slot) => {
          if (slot.dayOfWeek !== dow) return;
          const dur = calcSlotDurationHours(slot.startTime, slot.endTime);
          const sub = substitutions.find((s) => s.classId === cls.id && s.dateStr === dateStr);
          const roomName = slot.classroom || cls.classroom || "Phòng học";

          const baseTeacherId = slot.teacherId || cls.teacherId;
          const effTeacherId = sub?.subTeacherId || baseTeacherId;
          if (effTeacherId) {
            const stf = staff.find((s) => s.id === effTeacherId);
            const rate = stf?.hourlyRate || 250000;
            const isSub = Boolean(sub?.subTeacherId && sub.subTeacherId !== baseTeacherId);
            if (!staffLogsMap[effTeacherId]) staffLogsMap[effTeacherId] = [];
            staffLogsMap[effTeacherId].push({
              id: `log-reg-${cls.id}-${dateStr}-${slot.startTime}`,
              dateStr,
              className: cls.name,
              classroom: roomName,
              startTime: slot.startTime,
              endTime: slot.endTime,
              durationHours: dur,
              ratePerHour: rate,
              amount: Math.round(dur * rate),
              type: isSub ? "SUBSTITUTION" : "REGULAR",
            });
          }

          const baseAssistantId = slot.assistantId || cls.assistantId;
          const effAssistantId = sub?.subAssistantId || baseAssistantId;
          if (effAssistantId) {
            const stf = staff.find((s) => s.id === effAssistantId);
            const rate = stf?.hourlyRate || 100000;
            const isSub = Boolean(sub?.subAssistantId && sub.subAssistantId !== baseAssistantId);
            if (!staffLogsMap[effAssistantId]) staffLogsMap[effAssistantId] = [];
            staffLogsMap[effAssistantId].push({
              id: `log-ta-${cls.id}-${dateStr}-${slot.startTime}`,
              dateStr,
              className: cls.name,
              classroom: roomName,
              startTime: slot.startTime,
              endTime: slot.endTime,
              durationHours: dur,
              ratePerHour: rate,
              amount: Math.round(dur * rate),
              type: isSub ? "SUBSTITUTION" : "REGULAR",
            });
          }
        });
      });
    }

    // Thêm các ca Lớp học bù trong tháng (cố định 120.000đ/ca)
    makeupClasses.forEach((mc) => {
      if (mc.monthStr !== monthStr || !mc.teacherOrAssistantId) return;
      const dur = mc.durationHours || 1.5;
      if (!staffLogsMap[mc.teacherOrAssistantId]) staffLogsMap[mc.teacherOrAssistantId] = [];
      staffLogsMap[mc.teacherOrAssistantId].push({
        id: `log-makeup-${mc.id}`,
        dateStr: mc.dateStr,
        className: `[LỚP BÙ] ${mc.title}`,
        classroom: mc.classroomName || "Phòng học bù",
        startTime: mc.startTime,
        endTime: mc.endTime,
        durationHours: dur,
        ratePerHour: MAKEUP_SESSION_FIXED_PAY,
        amount: MAKEUP_SESSION_FIXED_PAY,
        type: "MAKEUP",
      });
    });

    let affectedCount = 0;
    setStaffTimesheets((prev) => {
      const updated = [...prev];
      staff.forEach((st) => {
        const autoLogs = staffLogsMap[st.id] || [];
        const existingIdx = updated.findIndex(
          (t) => t.staffId === st.id && t.monthStr === monthStr
        );
        if (existingIdx >= 0) {
          const existing = updated[existingIdx];
          if (existing.paymentStatus === "PAID") return;
          const customLogs = (existing.sessionLogs || []).filter(
            (l) => !l.id.startsWith("log-reg-") && !l.id.startsWith("log-ta-") && !l.id.startsWith("log-makeup-")
          );
          const mergedLogs = [...autoLogs, ...customLogs].sort((a, b) =>
            a.dateStr.localeCompare(b.dateStr)
          );
          const otherAdj = existing.otherAdjustment ?? existing.deduction ?? 0;
          const metrics = calculateTimesheetMetrics(
            mergedLogs,
            existing.hourlyRate,
            existing.allowance,
            existing.bonus,
            otherAdj
          );
          updated[existingIdx] = {
            ...existing,
            staffName: st.fullName,
            role: st.role,
            sessionLogs: mergedLogs,
            totalHours: metrics.totalHours,
            totalSessions: metrics.totalSessions,
            baseSalary: metrics.baseSalary,
            totalNetSalary: metrics.totalNetSalary,
          };
          affectedCount++;
        } else if (autoLogs.length > 0 || st.status === "ACTIVE") {
          const sortedLogs = [...autoLogs].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
          const metrics = calculateTimesheetMetrics(sortedLogs, st.hourlyRate, 0, 0, 0);
          updated.unshift({
            id: `ts-${st.id}-${month}${year}`,
            staffId: st.id,
            staffName: st.fullName,
            role: st.role,
            monthStr,
            hourlyRate: st.hourlyRate,
            totalHours: metrics.totalHours,
            totalSessions: metrics.totalSessions,
            baseSalary: metrics.baseSalary,
            allowance: 0,
            bonus: 0,
            deduction: 0,
            otherAdjustment: 0,
            totalNetSalary: metrics.totalNetSalary,
            status: "DRAFT",
            sessionLogs: sortedLogs,
          });
          affectedCount++;
        }
      });
      return updated;
    });

    return { count: affectedCount };
  };

  const sendTimesheetToStaff = (timesheetId: string | "ALL") => {
    const nowIso = new Date().toISOString();
    setStaffTimesheets((prev) =>
      prev.map((ts) => {
        if (timesheetId !== "ALL" && ts.id !== timesheetId) return ts;
        // Chỉ gửi nếu chưa được confirm
        if (ts.status === "CONFIRMED") return ts;
        return {
          ...ts,
          status: "SENT_TO_STAFF",
          sentAt: nowIso,
        };
      })
    );
  };

  const markTimesheetPaid = (timesheetId: string) => {
    setStaffTimesheets((prev) =>
      prev.map((ts) => {
        if (ts.id !== timesheetId) return ts;
        return {
          ...ts,
          paymentStatus: "PAID",
          paidAt: new Date().toISOString(),
        };
      })
    );
  };

  const markTimesheetUnpaid = (timesheetId: string) => {
    setStaffTimesheets((prev) =>
      prev.map((ts) => {
        if (ts.id !== timesheetId) return ts;
        return {
          ...ts,
          paymentStatus: "UNPAID",
          paidAt: undefined,
        };
      })
    );
  };

  // ==============================================================
  // 4b. ASSIGNMENTS (GIAO BÀI TẬP THEO BUỔI PHONG CÁCH MS TEAMS)
  // ==============================================================
  const createAssignment = (
    assignment: Omit<AssignmentItem, "id" | "createdAt">
  ): AssignmentItem => {
    const newAssignment: AssignmentItem = {
      ...assignment,
      id: `assign-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAssignments((prev) => [newAssignment, ...prev]);
    return newAssignment;
  };

  const updateAssignment = (id: string, updates: Partial<AssignmentItem>) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const deleteAssignment = (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    setHomeworkSubmissions((prev) => prev.filter((sub) => sub.assignmentId !== id));
  };

  // ==============================================================
  // 5. HOMEWORK SUBMISSIONS (NỘP BÀI TẬP VỀ NHÀ & CHẤM ĐIỂM)
  // ==============================================================
  const submitHomework = (
    submission: Omit<HomeworkSubmission, "id" | "submittedAt" | "status">
  ): HomeworkSubmission => {
    const newSubmission: HomeworkSubmission = {
      ...submission,
      id: `sub-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      status: "PENDING_GRADING",
    };
    setHomeworkSubmissions((prev) => [newSubmission, ...prev]);
    return newSubmission;
  };

  const gradeHomeworkSubmission = (
    submissionId: string,
    score: number | undefined,
    taFeedback: string,
    gradedBy: string
  ) => {
    setHomeworkSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id !== submissionId) return sub;
        return {
          ...sub,
          status: "GRADED",
          ...(score !== undefined ? { score } : { score: undefined }),
          taFeedback,
          gradedBy,
          gradedAt: new Date().toISOString(),
        };
      })
    );
  };

  // ==============================================================
  // 6. PARENT LEAVE REQUESTS (XIN NGHỈ PHÉP & BẢO LƯU BUỔI HỌC)
  // ==============================================================
  const submitLeaveRequest = (
    request: Omit<ParentLeaveRequest, "id" | "submittedAt" | "status">
  ): ParentLeaveRequest => {
    const newLeave: ParentLeaveRequest = {
      ...request,
      id: `leave-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      status: "APPROVED",
    };
    setLeaveRequests((prev) => [newLeave, ...prev]);

    // Tự động đánh dấu nghỉ phép bảo lưu trong điểm danh
    setAttendance((prev) => {
      const existingIdx = prev.findIndex(
        (a) => a.studentId === request.studentId && a.dateStr === request.dateStr
      );
      const leaveNote = `Nghỉ phép: ${request.reasonDetail}`;
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          status: "ABSENT",
          note: leaveNote,
          markedBy: "Hệ Thống (Đơn Xin Nghỉ Phép)",
          markedAt: new Date().toISOString(),
        };
        return next;
      }
      return [
        {
          id: `att-leave-${Date.now()}`,
          classId: request.classId,
          dateStr: request.dateStr,
          studentId: request.studentId,
          studentName: request.studentName,
          status: "ABSENT",
          note: leaveNote,
          markedBy: "Hệ Thống (Đơn Xin Nghỉ Phép)",
          markedAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });

    return newLeave;
  };

  // ==============================================================
  // 7. TUITION PAYMENTS (ĐÓNG HỌC PHÍ THEO THÁNG QUA VIETQR)
  // ==============================================================
  const addTuitionPayment = (
    studentId: string,
    billingMonth: string,
    amountPaid: number,
    transactionCode: string = `VQR-${Date.now().toString().slice(-6)}`
  ) => {
    const targetStudent = students.find((s) => s.id === studentId);
    if (!targetStudent) return;

    const newPayment: TuitionPaymentRecord = {
      id: `pay-${Date.now()}`,
      studentId,
      studentName: targetStudent.fullName,
      classId: targetStudent.classId || "",
      className: targetStudent.className || "",
      billingMonth,
      amountPaid,
      paidAt: new Date().toISOString(),
      paymentMethod: "VIETQR",
      transactionCode,
      status: "COMPLETED",
      note: `Đóng học phí ${billingMonth} qua chuyển khoản VietQR`,
    };

    setTuitionPayments((prev) => [newPayment, ...prev]);

    // Cập nhật trạng thái học phí của học viên sang ĐÃ ĐÓNG (PAID)
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          tuitionStatus: "PAID",
          lastPaidMonth: billingMonth,
        };
      })
    );
  };

  // ==============================================================
  // 8. TRÌNH QUẢN LÝ HỌC PHÍ HỌC SINH (STUDENT TUITION BILLS) - ADMIN
  // Học phí = Số buổi trong tháng x Đơn giá 1 buổi. Học sinh nghỉ không được trừ tiền.
  // ==============================================================
  const applyClassTuitionCalculation = (
    targetClass: ClassItem,
    billingMonth: string,
    prevBills: StudentTuitionBill[]
  ): StudentTuitionBill[] => {
    const linkedCourse = courses.find((c) => c.id === targetClass.courseId);
    const { lessonCount } = calculateMonthLessons(billingMonth, targetClass.schedules);
    const actualLessonCount = lessonCount > 0 ? lessonCount : 8;
    const baseClassFeePerLesson =
      targetClass.feePerLesson ||
      linkedCourse?.standardFeePerLesson ||
      (targetClass.monthlyFee ? Math.round(targetClass.monthlyFee / 8) : 200000);

    const match = billingMonth.match(/(\d{1,2})\/(\d{4})/);
    const monthStr = match ? match[1].padStart(2, "0") : "11";
    const yearStr = match ? match[2] : "2026";
    const dueDate = `10/${monthStr}/${yearStr}`;

    const classStudents = students.filter(
      (s) => s.classId === targetClass.id && s.learningStatus !== "DROPPED"
    );

    const updated = [...prevBills];
    classStudents.forEach((stu) => {
      const feePerLesson =
        stu.feePerLesson !== undefined && stu.feePerLesson > 0
          ? stu.feePerLesson
          : baseClassFeePerLesson;
      const baseBreakdown = computeStudentTuitionBreakdown({
        lessonCount: actualLessonCount,
        feePerLesson,
        discountPercent: stu.discountPercent,
      });
      const defaultDiscountNote =
        stu.fixedDiscountNote?.trim() ||
        (baseBreakdown.discountPercent > 0
          ? `Giảm ${baseBreakdown.discountPercent}% học phí theo buổi`
          : "");

      const existingIndex = updated.findIndex(
        (b) => b.studentId === stu.id && b.billingMonth === billingMonth
      );
      if (existingIndex >= 0) {
        const existing = updated[existingIndex];
        if (existing.status !== "PAID") {
          const sur = existing.surcharge || 0;
          const isManualCustomDiscount =
            (existing.discount || 0) > 0 &&
            !(existing.discountPercent && existing.discountPercent > 0) &&
            Boolean(existing.discountNote) &&
            !existing.discountNote?.includes("cố định") &&
            !existing.discountNote?.includes("%") &&
            existing.discountNote !== stu.fixedDiscountNote;
          const breakdown = computeStudentTuitionBreakdown({
            lessonCount: actualLessonCount,
            feePerLesson,
            discountPercent: isManualCustomDiscount ? 0 : stu.discountPercent,
            surcharge: sur,
          });
          const disc = isManualCustomDiscount ? (existing.discount || 0) : breakdown.discount;
          const adj = sur - disc;
          const discNote = isManualCustomDiscount ? existing.discountNote : defaultDiscountNote;
          updated[existingIndex] = {
            ...existing,
            classId: targetClass.id,
            className: targetClass.name,
            studentName: stu.fullName,
            parentName: stu.parentName,
            parentPhone: stu.parentPhone,
            lessonCount: actualLessonCount,
            feePerLesson,
            calculatedAmount: breakdown.calculatedAmount,
            surcharge: sur,
            discountPercent: breakdown.discountPercent,
            discount: disc,
            discountNote: discNote,
            adjustmentAmount: adj,
            finalAmount: Math.max(0, breakdown.calculatedAmount + adj),
            dueDate,
          };
        } else {
          updated[existingIndex] = {
            ...existing,
            classId: targetClass.id,
            className: targetClass.name,
            studentName: stu.fullName,
            parentName: stu.parentName,
            parentPhone: stu.parentPhone,
          };
        }
      } else {
        const newBill: StudentTuitionBill = {
          id: `bill-${monthStr}${yearStr}-${stu.id}`,
          studentId: stu.id,
          studentName: stu.fullName,
          studentCode: stu.studentCode,
          parentName: stu.parentName,
          parentPhone: stu.parentPhone,
          classId: targetClass.id,
          className: targetClass.name,
          billingMonth,
          lessonCount: actualLessonCount,
          feePerLesson,
          calculatedAmount: baseBreakdown.calculatedAmount,
          surcharge: 0,
          surchargeNote: "",
          discountPercent: baseBreakdown.discountPercent,
          discount: baseBreakdown.discount,
          discountNote: defaultDiscountNote,
          adjustmentAmount: baseBreakdown.adjustmentAmount,
          finalAmount: baseBreakdown.finalAmount,
          status: "DRAFT",
          dueDate,
          reminderSentCount: 0,
          policyNote: "Học sinh nghỉ học phí không được trừ theo quy định trung tâm",
        };
        updated.push(newBill);
      }
    });
    return updated;
  };

  const calculateClassTuitionBills = (classId: string, billingMonth: string) => {
    const targetClass = classes.find((c) => c.id === classId);
    if (!targetClass) return;
    setStudentTuitionBills((prev) => applyClassTuitionCalculation(targetClass, billingMonth, prev));
  };

  const updateStudentTuitionBill = (billId: string, updates: Partial<StudentTuitionBill>) => {
    setStudentTuitionBills((prev) =>
      prev.map((bill) => {
        if (bill.id !== billId) return bill;
        const newLessonCount =
          updates.lessonCount !== undefined ? Math.max(0, updates.lessonCount) : bill.lessonCount;
        const newFeePerLesson =
          updates.feePerLesson !== undefined ? Math.max(0, updates.feePerLesson) : bill.feePerLesson;
        const surcharge =
          updates.surcharge !== undefined ? Math.max(0, updates.surcharge) : (bill.surcharge || 0);
        const calculatedAmount = Math.round(newLessonCount * newFeePerLesson);

        let nextDiscountPercent =
          updates.discountPercent !== undefined
            ? Math.min(100, Math.max(0, updates.discountPercent))
            : (bill.discountPercent || 0);
        let discount = bill.discount || 0;
        if (updates.discountPercent !== undefined) {
          discount =
            nextDiscountPercent > 0 ? Math.round((calculatedAmount * nextDiscountPercent) / 100) : 0;
        } else if (updates.discount !== undefined) {
          discount = Math.max(0, updates.discount);
          if (updates.discount === 0) nextDiscountPercent = 0;
        } else if (
          nextDiscountPercent > 0 &&
          (updates.lessonCount !== undefined || updates.feePerLesson !== undefined)
        ) {
          discount = Math.round((calculatedAmount * nextDiscountPercent) / 100);
        }

        const newAdjustment =
          updates.adjustmentAmount !== undefined ? updates.adjustmentAmount : surcharge - discount;
        const finalAmount =
          updates.finalAmount !== undefined
            ? Math.max(0, updates.finalAmount)
            : Math.max(0, calculatedAmount + surcharge - discount);

        return {
          ...bill,
          ...updates,
          lessonCount: newLessonCount,
          feePerLesson: newFeePerLesson,
          calculatedAmount,
          surcharge,
          surchargeNote:
            updates.surchargeNote !== undefined ? updates.surchargeNote : bill.surchargeNote,
          discountPercent: nextDiscountPercent,
          discount,
          discountNote: updates.discountNote !== undefined ? updates.discountNote : bill.discountNote,
          adjustmentAmount: newAdjustment,
          finalAmount,
        };
      })
    );
  };

  const sendTuitionBill = (billId: string, openZalo: boolean = true, customMessage?: string) => {
    const nowIso = new Date().toISOString();
    setStudentTuitionBills((prev) =>
      prev.map((bill) => {
        if (bill.id !== billId) return bill;
        return {
          ...bill,
          status: "SENT",
          sentAt: nowIso,
          zaloSentAt: nowIso,
        };
      })
    );

    const targetBill = studentTuitionBills.find((b) => b.id === billId);
    if (targetBill) {
      const studentObj = students.find((s) => s.id === targetBill.studentId);
      const recipientPhone = studentObj?.parentPhone || targetBill.parentPhone;
      const recipientName = studentObj?.parentName || targetBill.parentName;
      const studentName = studentObj?.fullName || targetBill.studentName;

      const msg = customMessage || generateTuitionZaloMessage(
        targetBill,
        studentName,
        recipientName,
        targetBill.className
      );
      addZaloMessageLog({
        senderRole: "ADMIN",
        senderName: "Shiny English (Hotline Trung Tâm)",
        senderPhone: "0964645174",
        senderAccountType: "CENTER_HOTLINE",
        recipientName: recipientName,
        recipientPhone: recipientPhone,
        studentId: targetBill.studentId,
        studentName: studentName,
        className: targetBill.className,
        messageType: "TUITION",
        title: `Thông Báo Học Phí ${targetBill.billingMonth}`,
        content: msg,
      });

      // Tự động gửi tin Zalo tới phụ huynh (không cần Ctrl+V)
      if (recipientPhone) {
        sendDirectAutoZaloMessage(recipientPhone, msg, "Shiny English (Hotline Trung Tâm)", false);
      }

      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== targetBill.studentId) return s;
          return {
            ...s,
            tuitionStatus: s.tuitionStatus === "PAID" ? "PAID" : "UNPAID",
            currentBillingMonth: targetBill.billingMonth,
            tuitionDueDate: targetBill.dueDate,
          };
        })
      );
    }
  };

  const sendClassTuitionBills = (classId: string, billingMonth: string) => {
    const nowIso = new Date().toISOString();
    const updatedStudentIds: string[] = [];

    setStudentTuitionBills((prev) =>
      prev.map((bill) => {
        if (bill.classId === classId && bill.billingMonth === billingMonth && bill.status === "DRAFT") {
          updatedStudentIds.push(bill.studentId);
          const msg = generateTuitionZaloMessage(bill, bill.studentName, bill.parentName, bill.className);
          addZaloMessageLog({
            senderRole: "ADMIN",
            senderName: "Shiny English (Hotline Trung Tâm)",
            senderPhone: "0964645174",
            senderAccountType: "CENTER_HOTLINE",
            recipientName: bill.parentName,
            recipientPhone: bill.parentPhone,
            studentId: bill.studentId,
            studentName: bill.studentName,
            className: bill.className,
            messageType: "TUITION",
            title: `Thông Báo Học Phí ${bill.billingMonth}`,
            content: msg,
          });
          return {
            ...bill,
            status: "SENT",
            sentAt: nowIso,
            zaloSentAt: nowIso,
          };
        }
        return bill;
      })
    );

    if (updatedStudentIds.length > 0) {
      setStudents((prev) =>
        prev.map((s) => {
          if (!updatedStudentIds.includes(s.id)) return s;
          return {
            ...s,
            tuitionStatus: s.tuitionStatus === "PAID" ? "PAID" : "UNPAID",
            currentBillingMonth: billingMonth,
          };
        })
      );
    }
  };

  const markTuitionBillPaid = (
    billId: string,
    paymentMethod: "VIETQR" | "CASH" | "BANK_TRANSFER",
    transactionCode?: string,
    note?: string
  ) => {
    const targetBill = studentTuitionBills.find((b) => b.id === billId);
    if (!targetBill) return;

    const trxCode = transactionCode || (paymentMethod === "CASH" 
      ? `CASH-REC-${Date.now().toString().slice(-4)}`
      : `VQR-${Date.now().toString().slice(-6)}`);
    const paidAt = new Date().toISOString();

    setStudentTuitionBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b;
        return {
          ...b,
          status: "PAID",
          paidAt,
          paymentMethod,
          transactionCode: trxCode,
          notes: note ? (b.notes ? `${b.notes} | ${note}` : note) : b.notes,
        };
      })
    );

    // Đồng bộ sang học sinh
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== targetBill.studentId) return s;
        return {
          ...s,
          tuitionStatus: "PAID",
          lastPaidMonth: targetBill.billingMonth,
        };
      })
    );

    // Lưu vào lịch sử nạp tiền
    const newPayment: TuitionPaymentRecord = {
      id: `pay-${Date.now()}`,
      studentId: targetBill.studentId,
      studentName: targetBill.studentName,
      classId: targetBill.classId,
      className: targetBill.className,
      billingMonth: targetBill.billingMonth,
      amountPaid: targetBill.finalAmount,
      paidAt,
      paymentMethod: paymentMethod === "CASH" ? "CASH" : "VIETQR",
      transactionCode: trxCode,
      status: "COMPLETED",
      note: note || `Thu học phí ${targetBill.billingMonth} (${targetBill.lessonCount} buổi x ${targetBill.feePerLesson.toLocaleString("vi-VN")} đ)`,
    };
    setTuitionPayments((prev) => [newPayment, ...prev]);
  };

  const markTuitionBillUnpaid = (
    billId: string,
    revertToStatus?: "SENT" | "DRAFT" | "OVERDUE",
    note?: string
  ) => {
    const targetBill = studentTuitionBills.find((b) => b.id === billId);
    if (!targetBill) return;

    const nextStatus: TuitionBillStatus = revertToStatus || (targetBill.sentAt ? "SENT" : "DRAFT");

    setStudentTuitionBills((prev) =>
      prev.map((b) => {
        if (b.id !== billId) return b;
        return {
          ...b,
          status: nextStatus,
          paidAt: undefined,
          paymentMethod: undefined,
          transactionCode: undefined,
          notes: note ? (b.notes ? `${b.notes} | ${note}` : note) : b.notes,
        };
      })
    );

    // Đồng bộ sang học sinh
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== targetBill.studentId) return s;
        return {
          ...s,
          tuitionStatus: "UNPAID",
        };
      })
    );

    // Hủy hoặc xóa bản ghi nạp tiền trong lịch sử
    setTuitionPayments((prev) =>
      prev.filter(
        (p) =>
          !(
            p.studentId === targetBill.studentId &&
            p.billingMonth === targetBill.billingMonth &&
            (targetBill.transactionCode ? p.transactionCode === targetBill.transactionCode : true)
          )
      )
    );
  };

  const sendTuitionReminder = (billId: string, openZalo: boolean = true, customMessage?: string) => {
    const nowIso = new Date().toISOString();
    const targetBill = studentTuitionBills.find((b) => b.id === billId);
    if (targetBill) {
      const studentObj = students.find((s) => s.id === targetBill.studentId);
      const recipientPhone = studentObj?.parentPhone || targetBill.parentPhone;
      const recipientName = studentObj?.parentName || targetBill.parentName;
      const studentName = studentObj?.fullName || targetBill.studentName;

      const msg = customMessage || generateTuitionReminderZaloMessage(
        targetBill,
        studentName,
        recipientName,
        targetBill.className,
        targetBill.status === "OVERDUE" ? "OVERDUE" : "DUE_DATE"
      );
      addZaloMessageLog({
        senderRole: "ADMIN",
        senderName: "Shiny English (Hotline Trung Tâm)",
        senderPhone: "0964645174",
        senderAccountType: "CENTER_HOTLINE",
        recipientName: recipientName,
        recipientPhone: recipientPhone,
        studentId: targetBill.studentId,
        studentName: studentName,
        className: targetBill.className,
        messageType: "TUITION_REMINDER",
        title: `Nhắc Nhở Học Phí ${targetBill.billingMonth}`,
        content: msg,
      });

      // Tự động gửi tin nhắc nhở Zalo (không cần Ctrl+V)
      if (recipientPhone) {
        sendDirectAutoZaloMessage(recipientPhone, msg, "Shiny English (Hotline Trung Tâm)", false);
      }
    }

    setStudentTuitionBills((prev) =>
      prev.map((bill) => {
        if (bill.id !== billId) return bill;
        return {
          ...bill,
          reminderSentCount: (bill.reminderSentCount || 0) + 1,
          lastReminderAt: nowIso,
          zaloLastReminderAt: nowIso,
        };
      })
    );
  };

  const sendTuitionReminderToUnpaid = (targetBillIds: string[]) => {
    const nowIso = new Date().toISOString();
    targetBillIds.forEach((billId) => {
      const targetBill = studentTuitionBills.find((b) => b.id === billId);
      if (targetBill) {
        const msg = generateTuitionReminderZaloMessage(
          targetBill,
          targetBill.studentName,
          targetBill.parentName,
          targetBill.className,
          targetBill.status === "OVERDUE" ? "OVERDUE" : "DUE_DATE"
        );
        addZaloMessageLog({
          senderRole: "ADMIN",
          senderName: "Shiny English (Hotline Trung Tâm)",
          senderPhone: "0964645174",
          senderAccountType: "CENTER_HOTLINE",
          recipientName: targetBill.parentName,
          recipientPhone: targetBill.parentPhone,
          studentId: targetBill.studentId,
          studentName: targetBill.studentName,
          className: targetBill.className,
          messageType: "TUITION_REMINDER",
          title: `Nhắc Nhở Học Phí ${targetBill.billingMonth}`,
          content: msg,
        });
      }
    });

    setStudentTuitionBills((prev) =>
      prev.map((bill) => {
        if (targetBillIds.includes(bill.id)) {
          return {
            ...bill,
            reminderSentCount: (bill.reminderSentCount || 0) + 1,
            lastReminderAt: nowIso,
            zaloLastReminderAt: nowIso,
          };
        }
        return bill;
      })
    );
  };

  const markMultiMonthTuitionPaid = (
    studentId: string,
    billIds: string[],
    paymentMethod: "VIETQR" | "CASH" | "BANK_TRANSFER",
    transactionCode?: string,
    note?: string
  ) => {
    const targetStudent = students.find((s) => s.id === studentId);
    if (!targetStudent) return;

    const targetBills = studentTuitionBills.filter((b) => billIds.includes(b.id));
    if (targetBills.length === 0) return;

    const trxCode = transactionCode || (paymentMethod === "CASH"
      ? `CASH-MULTI-${Date.now().toString().slice(-4)}`
      : `VQR-MULTI-${Date.now().toString().slice(-6)}`);
    const paidAt = new Date().toISOString();
    const totalAmount = targetBills.reduce((acc, b) => acc + b.finalAmount, 0);
    const monthsStr = targetBills.map((b) => b.billingMonth).join(", ");

    setStudentTuitionBills((prev) =>
      prev.map((b) => {
        if (billIds.includes(b.id)) {
          return {
            ...b,
            status: "PAID",
            paidAt,
            paymentMethod,
            transactionCode: trxCode,
            notes: note ? (b.notes ? `${b.notes} | ${note}` : note) : b.notes,
          };
        }
        return b;
      })
    );

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          tuitionStatus: "PAID",
          lastPaidMonth: targetBills[targetBills.length - 1].billingMonth,
        };
      })
    );

    const newPayment: TuitionPaymentRecord = {
      id: `pay-multi-${Date.now()}`,
      studentId: targetStudent.id,
      studentName: targetStudent.fullName,
      classId: targetStudent.classId || "",
      className: targetStudent.className || "",
      billingMonth: `Thanh toán gộp: ${monthsStr}`,
      amountPaid: totalAmount,
      paidAt,
      paymentMethod: paymentMethod === "CASH" ? "CASH" : "VIETQR",
      transactionCode: trxCode,
      status: "COMPLETED",
      note: note || `Đóng gộp ${targetBills.length} kỳ học phí (${monthsStr})`,
    };
    setTuitionPayments((prev) => [newPayment, ...prev]);
  };

  const autoTriggerMonthlyTuition = (billingMonth: string) => {
    setStudentTuitionBills((prev) => {
      let nextBills = [...prev];
      classes.forEach((cls) => {
        nextBills = applyClassTuitionCalculation(cls, billingMonth, nextBills);
      });
      return nextBills;
    });
  };

  // ==============================================================
  // MAKEUP CLASSES ACTIONS (Quản Lý Lớp Học Bù & Quyền Lợi Học Bù)
  // ==============================================================
  // Tự động đồng bộ thù lao ca dạy bù vào bảng công nhân sự (như ca chính khóa & dạy thay)
  const syncMakeupSalaryToTimesheet = (
    mc: MakeupClass,
    isDeleting: boolean = false
  ) => {
    const logId = `log-makeup-${mc.id}`;
    const staffId = mc.teacherOrAssistantId;
    const monthStr = mc.monthStr;
    const targetStaff = staff.find((s) => s.id === staffId);
    const staffHourlyRate = targetStaff?.hourlyRate || (mc.roleInCharge === "TEACHER" ? 250000 : 100000);
    const duration = mc.durationHours || 1.5;

    const workLog: SessionWorkLog = {
      id: logId,
      dateStr: mc.dateStr,
      className: `[LỚP BÙ] ${mc.title}`,
      classroom: mc.classroomName,
      startTime: mc.startTime,
      endTime: mc.endTime,
      durationHours: duration,
      ratePerHour: MAKEUP_SESSION_FIXED_PAY,
      amount: MAKEUP_SESSION_FIXED_PAY,
      type: "MAKEUP",
    };

    setStaffTimesheets((prev) => {
      // 1. Gỡ bỏ log cũ nếu có
      const cleaned = prev.map((t) => {
        if (!t.sessionLogs?.some((l) => l.id === logId)) return t;
        const updatedLogs = t.sessionLogs.filter((l) => l.id !== logId);
        const otherAdj = t.otherAdjustment ?? t.deduction ?? 0;
        const metrics = calculateTimesheetMetrics(
          updatedLogs,
          t.hourlyRate,
          t.allowance,
          t.bonus,
          otherAdj
        );
        return {
          ...t,
          totalHours: metrics.totalHours,
          totalSessions: metrics.totalSessions,
          baseSalary: metrics.baseSalary,
          totalNetSalary: metrics.totalNetSalary,
          sessionLogs: updatedLogs,
        };
      });

      if (isDeleting) {
        return cleaned;
      }

      // 2. Thêm ca bù vào bảng công của nhân sự tương ứng trong tháng (120.000đ/ca cố định)
      const existing = cleaned.find((t) => t.staffId === staffId && t.monthStr === monthStr);
      if (existing) {
        const updatedLogs = [...(existing.sessionLogs || []), workLog];
        const otherAdj = existing.otherAdjustment ?? existing.deduction ?? 0;
        const metrics = calculateTimesheetMetrics(
          updatedLogs,
          existing.hourlyRate,
          existing.allowance,
          existing.bonus,
          otherAdj
        );
        return cleaned.map((t) =>
          t.id === existing.id
            ? {
                ...t,
                totalHours: metrics.totalHours,
                totalSessions: metrics.totalSessions,
                baseSalary: metrics.baseSalary,
                totalNetSalary: metrics.totalNetSalary,
                sessionLogs: updatedLogs,
              }
            : t
        );
      } else {
        const newTs: StaffSalaryTimesheet = {
          id: `ts-${staffId}-${Date.now().toString().slice(-4)}`,
          staffId: staffId,
          staffName: targetStaff?.fullName || mc.teacherOrAssistantName,
          role: targetStaff?.role || mc.roleInCharge,
          monthStr: monthStr,
          hourlyRate: staffHourlyRate,
          totalHours: duration,
          totalSessions: 1,
          baseSalary: MAKEUP_SESSION_FIXED_PAY,
          allowance: 0,
          bonus: 0,
          deduction: 0,
          otherAdjustment: 0,
          totalNetSalary: MAKEUP_SESSION_FIXED_PAY,
          status: "DRAFT",
          sessionLogs: [workLog],
        };
        return [newTs, ...cleaned];
      }
    });
  };

  const createMakeupClass = (newClass: Omit<MakeupClass, "id" | "createdAt">): MakeupClass => {
    const created: MakeupClass = {
      ...newClass,
      id: `makeup-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      isSalaryRecorded: true, // Tự động tính lương như ca chính khóa/dạy thay
    };
    setMakeupClasses((prev) => [created, ...prev]);
    syncMakeupSalaryToTimesheet(created, false);
    return created;
  };

  const updateMakeupClass = (id: string, updates: Partial<MakeupClass>) => {
    setMakeupClasses((prev) =>
      prev.map((mc) => {
        if (mc.id !== id) return mc;
        const updated = { ...mc, ...updates, isSalaryRecorded: true };
        syncMakeupSalaryToTimesheet(updated, false);
        return updated;
      })
    );
  };

  const deleteMakeupClass = (id: string) => {
    const mc = makeupClasses.find((m) => m.id === id);
    if (mc) {
      syncMakeupSalaryToTimesheet(mc, true);
    }
    setMakeupClasses((prev) => prev.filter((mc) => mc.id !== id));
  };

  const addStudentToMakeupClass = (makeupClassId: string, studentEntry: MakeupStudentEntry) => {
    setMakeupClasses((prev) =>
      prev.map((mc) => {
        if (mc.id !== makeupClassId) return mc;
        // Chặn tuyệt đối nếu lớp học bù đã kết thúc hoặc diễn ra trong quá khứ
        if (isMakeupClassPast(mc)) {
          console.warn(`[VALIDATION BLOCKED] Lớp học bù "${mc.title}" (${mc.dateStr} ${mc.endTime}) đã kết thúc. Không thể xếp học sinh!`);
          return mc;
        }
        const exists = mc.students.some(
          (s) => s.studentId === studentEntry.studentId && s.absentDateStr === studentEntry.absentDateStr
        );
        if (exists) return mc;
        return {
          ...mc,
          students: [...mc.students, studentEntry],
        };
      })
    );
  };

  const removeStudentFromMakeupClass = (makeupClassId: string, studentId: string, absentDateStr: string) => {
    setMakeupClasses((prev) =>
      prev.map((mc) => {
        if (mc.id !== makeupClassId) return mc;
        return {
          ...mc,
          students: mc.students.filter(
            (s) => !(s.studentId === studentId && s.absentDateStr === absentDateStr)
          ),
        };
      })
    );
  };

  const updateMakeupStudentAttendance = (
    makeupClassId: string,
    studentId: string,
    status: "REGISTERED" | "ATTENDED" | "ABSENT"
  ) => {
    setMakeupClasses((prev) =>
      prev.map((mc) => {
        if (mc.id !== makeupClassId) return mc;
        return {
          ...mc,
          students: mc.students.map((st) =>
            st.studentId === studentId ? { ...st, attendanceStatus: status } : st
          ),
        };
      })
    );
  };

  const updateMakeupClassAttendance = (
    makeupClassId: string,
    records: { studentId: string; attendanceStatus: "ATTENDED" | "ABSENT" }[]
  ): { success: boolean; message: string } => {
    const mc = makeupClasses.find((m) => m.id === makeupClassId);
    if (!mc) return { success: false, message: "Không tìm thấy lớp học bù." };

    const recordMap = new Map(records.map((r) => [r.studentId, r.attendanceStatus]));

    setMakeupClasses((prev) =>
      prev.map((m) => {
        if (m.id !== makeupClassId) return m;
        const updatedStudents = m.students.map((st) => {
          const newStatus = recordMap.get(st.studentId);
          return newStatus ? { ...st, attendanceStatus: newStatus } : st;
        });
        return { ...m, students: updatedStudents };
      })
    );

    return {
      success: true,
      message: `Đã lưu điểm danh cho ${records.length} học sinh trong lớp học bù "${mc.title}" thành công!`,
    };
  };

  const sendMakeupClassNotification = (
    makeupClassId: string,
    targetStudentIds?: string[]
  ): { success: boolean; message: string; count: number } => {
    const targetClass = makeupClasses.find((mc) => mc.id === makeupClassId);
    if (!targetClass) return { success: false, message: "Không tìm thấy lớp học bù", count: 0 };

    const nowIso = new Date().toISOString();
    let count = 0;
    const staffInCharge = staff.find((s) => s.id === targetClass.teacherOrAssistantId)?.fullName || "Thầy cô phụ trách";

    setMakeupClasses((prev) =>
      prev.map((mc) => {
        if (mc.id !== makeupClassId) return mc;
        const updatedStudents = mc.students.map((st) => {
          if (!targetStudentIds || targetStudentIds.includes(st.studentId)) {
            count++;
            const studentObj = students.find((s) => s.id === st.studentId);
            if (studentObj) {
              const msg = generateMakeupNoticeZaloMessage(
                studentObj.fullName,
                studentObj.parentName,
                targetClass.title,
                targetClass.title,
                targetClass.dateStr,
                targetClass.startTime,
                targetClass.endTime,
                targetClass.classroomName || targetClass.classroomId,
                staffInCharge,
                targetClass.focusContent
              );
              addZaloMessageLog({
                senderRole: "ADMIN",
                senderName: "Shiny English (Hotline Trung Tâm)",
                senderPhone: "0964645174",
                senderAccountType: "CENTER_HOTLINE",
                recipientName: studentObj.parentName,
                recipientPhone: studentObj.parentPhone,
                studentId: studentObj.id,
                studentName: studentObj.fullName,
                className: targetClass.title,
                messageType: "MAKEUP_NOTICE",
                title: `Thông Báo Lịch Học Bù: ${targetClass.title}`,
                content: msg,
              });
            }
            return { ...st, notifiedAt: nowIso, zaloNoticeSentAt: nowIso };
          }
          return st;
        });
        return { ...mc, students: updatedStudents };
      })
    );

    return {
      success: true,
      message: `Đã gửi thông báo lịch học bù tới ${count} phụ huynh thành công (qua App Sổ liên lạc & Zalo Trung Tâm)!`,
      count,
    };
  };

  const sendMakeupSurveyToParents = (
    monthStr: string,
    targetStudentIds?: string[],
    _customMessage?: string
  ): { success: boolean; message: string; count: number } => {
    const nowIso = new Date().toISOString();
    let count = 0;

    targetStudentIds?.forEach((sid) => {
      const studentObj = students.find((s) => s.id === sid);
      if (studentObj) {
        const cls = classes.find((c) => c.id === studentObj.classId);
        const msg = generateMakeupSurveyZaloMessage(
          studentObj.fullName,
          studentObj.parentName,
          cls?.name || "Lớp học",
          (studentObj as any).absentCount || 1,
          [],
          _customMessage
        );
        addZaloMessageLog({
          senderRole: "ADMIN",
          senderName: "Shiny English (Hotline Trung Tâm)",
          senderPhone: "0964645174",
          senderAccountType: "CENTER_HOTLINE",
          recipientName: studentObj.parentName,
          recipientPhone: studentObj.parentPhone,
          studentId: studentObj.id,
          studentName: studentObj.fullName,
          className: cls?.name,
          messageType: "MAKEUP_SURVEY",
          title: "Khảo Sát Lịch Rảnh Học Bù",
          content: msg,
        });
      }
    });

    setMakeupClasses((prev) =>
      prev.map((mc) => {
        if (mc.monthStr !== monthStr) return mc;
        let modified = false;
        const updatedStudents = mc.students.map((st) => {
          if (!targetStudentIds || targetStudentIds.includes(st.studentId)) {
            count++;
            modified = true;
            return { ...st, surveySentAt: nowIso, zaloSurveySentAt: nowIso };
          }
          return st;
        });
        return modified ? { ...mc, students: updatedStudents } : mc;
      })
    );

    const actualCount = targetStudentIds ? targetStudentIds.length : (count || 1);

    return {
      success: true,
      message: `Đã gửi tin nhắn khảo sát lịch rảnh tới ${actualCount} phụ huynh thành công (qua App Sổ liên lạc & Zalo Trung Tâm)!`,
      count: actualCount,
    };
  };

  const sendMakeupContentToParents = (
    makeupClassId: string,
    contentData: { lessonContent: string; homework?: string; assistantFeedback?: string }
  ): { success: boolean; message: string } => {
    const mc = makeupClasses.find((m) => m.id === makeupClassId);
    if (!mc) return { success: false, message: "Không tìm thấy lớp học bù." };

    const nowIso = new Date().toISOString();
    const asstObj = staff.find((s) => s.id === mc.teacherOrAssistantId);

    mc.students.forEach((st) => {
      const studentObj = students.find((s) => s.id === st.studentId);
      if (studentObj) {
        const msg = generateMakeupSessionReportZaloMessage(
          studentObj.fullName,
          studentObj.parentName,
          asstObj?.fullName || "Trợ Giảng",
          mc.dateStr,
          contentData.lessonContent,
          contentData.homework || "",
          contentData.assistantFeedback || ""
        );
        addZaloMessageLog({
          senderRole: "ASSISTANT",
          senderName: asstObj?.fullName || "Trợ Giảng",
          senderPhone: asstObj?.phone || "",
          senderAccountType: "PERSONAL",
          recipientName: studentObj.parentName,
          recipientPhone: studentObj.parentPhone,
          studentId: studentObj.id,
          studentName: studentObj.fullName,
          className: mc.title,
          messageType: "MAKEUP_REPORT",
          title: `Báo Cáo Buổi Học Bù: ${mc.title}`,
          content: msg,
        });

        // Tự động gửi tin nhắn Zalo trực tiếp qua bot Trợ giảng (kèm fallback Hotline Admin)
        if (studentObj.parentPhone) {
          sendZaloMessageToParent({
            recipientPhone: studentObj.parentPhone,
            recipientName: studentObj.parentName,
            studentId: studentObj.id,
            studentName: studentObj.fullName,
            className: mc.title,
            messageType: "MAKEUP_REPORT",
            title: `Báo Cáo Buổi Học Bù: ${mc.title}`,
            content: msg,
            senderRole: "ASSISTANT",
            senderStaffId: mc.teacherOrAssistantId,
            senderName: asstObj?.fullName || "Trợ Giảng",
            senderPhone: asstObj?.phone || "",
            openChatWindow: false,
          }).catch(() => {});
        }
      }
    });

    setMakeupClasses((prev) =>
      prev.map((m) =>
        m.id === makeupClassId
          ? {
              ...m,
              lessonContent: contentData.lessonContent,
              homework: contentData.homework,
              assistantFeedback: contentData.assistantFeedback,
              contentSentToParentsAt: nowIso,
              zaloReportSentAt: nowIso,
            }
          : m
      )
    );

    return {
      success: true,
      message: `Đã gửi tóm tắt nội dung học bù & dặn dò tới toàn bộ phụ huynh lớp "${mc.title}" (qua App & Zalo Trợ Giảng)!`,
    };
  };

  const recordMakeupClassSalary = (
    makeupClassId: string
  ): { success: boolean; message: string } => {
    const mc = makeupClasses.find((m) => m.id === makeupClassId);
    if (!mc) return { success: false, message: "Không tìm thấy lớp học bù." };
    if (mc.isSalaryRecorded) {
      return { success: false, message: "Ca dạy bù này đã được tính lương trước đó!" };
    }

    const targetStaff = staff.find((s) => s.id === mc.teacherOrAssistantId);
    const staffHourlyRate = targetStaff?.hourlyRate || (mc.roleInCharge === "TEACHER" ? 250000 : 100000);
    const duration = mc.durationHours || 1.5;

    const newLog: SessionWorkLog = {
      id: `log-makeup-${mc.id}`,
      dateStr: mc.dateStr,
      className: `[LỚP BÙ] ${mc.title}`,
      classroom: mc.classroomName,
      startTime: mc.startTime,
      endTime: mc.endTime,
      durationHours: duration,
      ratePerHour: MAKEUP_SESSION_FIXED_PAY,
      amount: MAKEUP_SESSION_FIXED_PAY,
      type: "MAKEUP",
    };

    setStaffTimesheets((prev) => {
      const existing = prev.find(
        (t) => t.staffId === mc.teacherOrAssistantId && t.monthStr === mc.monthStr
      );
      if (existing) {
        const alreadyHas = existing.sessionLogs?.some((l) => l.id === newLog.id);
        if (alreadyHas) return prev;
        const updatedLogs = [...(existing.sessionLogs || []), newLog];
        const otherAdj = existing.otherAdjustment ?? existing.deduction ?? 0;
        const metrics = calculateTimesheetMetrics(
          updatedLogs,
          existing.hourlyRate,
          existing.allowance,
          existing.bonus,
          otherAdj
        );
        return prev.map((t) =>
          t.id === existing.id
            ? {
                ...t,
                totalHours: metrics.totalHours,
                totalSessions: metrics.totalSessions,
                baseSalary: metrics.baseSalary,
                totalNetSalary: metrics.totalNetSalary,
                sessionLogs: updatedLogs,
              }
            : t
        );
      } else {
        const newTs: StaffSalaryTimesheet = {
          id: `ts-${mc.teacherOrAssistantId}-${Date.now().toString().slice(-4)}`,
          staffId: mc.teacherOrAssistantId,
          staffName: mc.teacherOrAssistantName,
          role: mc.roleInCharge,
          monthStr: mc.monthStr,
          hourlyRate: staffHourlyRate,
          totalHours: duration,
          totalSessions: 1,
          baseSalary: MAKEUP_SESSION_FIXED_PAY,
          allowance: 0,
          bonus: 0,
          deduction: 0,
          otherAdjustment: 0,
          totalNetSalary: MAKEUP_SESSION_FIXED_PAY,
          status: "DRAFT",
          sessionLogs: [newLog],
        };
        return [newTs, ...prev];
      }
    });

    setMakeupClasses((prev) =>
      prev.map((m) =>
        m.id === makeupClassId
          ? { ...m, isSalaryRecorded: true, status: "COMPLETED" }
          : m
      )
    );

    return {
      success: true,
      message: `Đã tính lương ca dạy bù cho ${mc.teacherOrAssistantName} (Mức cố định ${MAKEUP_SESSION_FIXED_PAY.toLocaleString("vi-VN")}đ/ca)!`,
    };
  };

  const resetMonthlyMakeupBenefits = (monthStr: string) => {
    const match = monthStr.match(/(\d{1,2})\/(\d{4})/);
    const month = match ? match[1].padStart(2, "0") : "11";
    const year = match ? match[2] : "2026";
    const prefix = `${year}-${month}`;

    const monthAbsents = attendance.filter((a) => a.status === "ABSENT" && a.dateStr.startsWith(prefix));
    const currentMonthMakeups = makeupClasses.filter((mc) => mc.monthStr === monthStr);
    const nowIso = new Date().toISOString();

    const newExpiredRecords: ExpiredMakeupRecord[] = [];
    const affectedStudentIds = new Set<string>();

    monthAbsents.forEach((att) => {
      let isComp = false;
      for (const mc of currentMonthMakeups) {
        const entry = mc.students.find(
          (st) => st.studentId === att.studentId && st.absentDateStr === att.dateStr
        );
        if (entry && (entry.attendanceStatus === "ATTENDED" || mc.status === "COMPLETED")) {
          isComp = true;
          break;
        }
      }

      if (!isComp) {
        const alreadyExpired = expiredMakeupRecords.some(
          (exp) => exp.studentId === att.studentId && exp.absentDateStr === att.dateStr && exp.monthStr === monthStr
        );

        if (!alreadyExpired) {
          const stu = students.find((s) => s.id === att.studentId);
          const cls = classes.find((c) => c.id === att.classId);
          newExpiredRecords.push({
            id: `exp-${month}${year}-${att.id}-${Date.now().toString().slice(-4)}`,
            monthStr,
            studentId: att.studentId,
            studentName: att.studentName,
            studentCode: stu?.studentCode || "",
            absentDateStr: att.dateStr,
            originalClassId: att.classId,
            originalClassName: cls?.name || "Lớp học",
            expiredAt: nowIso,
            reason: `Hết hạn ${monthStr} - Mất quyền lợi học bù theo quy chế trung tâm`,
          });
          affectedStudentIds.add(att.studentId);
        }
      }
    });

    if (newExpiredRecords.length > 0) {
      setExpiredMakeupRecords((prev) => [...newExpiredRecords, ...prev]);
    }

    return {
      expiredCount: newExpiredRecords.length,
      affectedStudentsCount: affectedStudentIds.size,
    };
  };

  // ==============================================================
  // ZALO ACCOUNTS & MESSAGE LOGS OPERATIONS
  // ==============================================================
  const updateZaloAccount = (id: string, updates: Partial<ZaloAccountConfig>) => {
    setZaloAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, ...updates } : acc))
    );
  };

  const connectZaloAccount = (
    role: ZaloAccountRole,
    staffId?: string,
    phoneNumber?: string,
    accountName?: string,
    sessionId?: string,
    connectionMethod?: "QR_CODE" | "PHONE_PASSWORD_OTP" | "ZALO_WEB_SYNC"
  ) => {
    const generatedSessionId = sessionId || `ZS-2026-LIVE-${Math.floor(1000 + Math.random() * 9000)}`;
    setZaloAccounts((prev) => {
      const existing = prev.find((acc) => 
        role === "ADMIN" ? acc.role === "ADMIN" : (acc.role === role && acc.staffId === staffId)
      );

      if (existing) {
        return prev.map((acc) =>
          acc.id === existing.id
            ? {
                ...acc,
                phoneNumber: phoneNumber || acc.phoneNumber,
                accountName: accountName || acc.accountName,
                isConnected: true,
                connectedAt: new Date().toISOString(),
                sessionId: generatedSessionId,
                connectionMethod: connectionMethod || "QR_CODE",
              }
            : acc
        );
      }

      const newAcc: ZaloAccountConfig = {
        id: `zalo-${role.toLowerCase()}-${staffId || "center"}-${Date.now()}`,
        role,
        staffId,
        accountType: role === "ADMIN" ? "CENTER_HOTLINE" : "PERSONAL",
        accountName: accountName || (role === "ADMIN" ? "Shiny English Hotline Trung Tâm" : "Zalo Cá Nhân"),
        phoneNumber: phoneNumber || (role === "ADMIN" ? "0964645174" : "0901234567"),
        isConnected: true,
        connectedAt: new Date().toISOString(),
        sessionId: generatedSessionId,
        connectionMethod: connectionMethod || "QR_CODE",
      };
      return [...prev, newAcc];
    });

    setZaloSessions((prev) => ({
      ...prev,
      [role]: {
        role,
        accountName: accountName || (role === "ADMIN" ? "Shiny English Hotline Trung Tâm" : "Zalo Cá Nhân"),
        phoneNumber: phoneNumber || (role === "ADMIN" ? "0964645174" : "0901234567"),
        sessionToken: generatedSessionId,
        sessionExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        verifiedAt: new Date().toISOString(),
        status: "ACTIVE",
        isValid: true,
      },
    }));
  };

  const disconnectZaloAccount = (id: string) => {
    setZaloAccounts((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) {
        setZaloSessions((sPrev) => ({
          ...sPrev,
          [target.role]: {
            ...sPrev[target.role],
            isValid: false,
            sessionExpiresAt: undefined,
          },
        }));
      }
      return prev.map((acc) =>
        acc.id === id ? { ...acc, isConnected: false } : acc
      );
    });
  };

  const getZaloAccountForUser = (role: ZaloAccountRole, staffId?: string): ZaloAccountConfig | undefined => {
    if (role === "ADMIN") {
      return zaloAccounts.find((a) => a.role === "ADMIN");
    }
    return zaloAccounts.find((a) => a.role === role && (staffId ? a.staffId === staffId : true));
  };

  const addZaloMessageLog = (logData: Omit<ZaloMessageLog, "id" | "sentAt" | "status">): ZaloMessageLog => {
    const nowIso = new Date().toISOString();
    const newLog: ZaloMessageLog = {
      ...logData,
      id: `zlog-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sentAt: nowIso,
      status: "SENT",
    };

    setZaloMessageLogs((prev) => [newLog, ...prev]);

    // Đồng bộ cập nhật cờ zaloSentAt cho các thực thể liên quan
    if (logData.messageType === "TUITION" || logData.messageType === "TUITION_REMINDER") {
      setStudentTuitionBills((prev) =>
        prev.map((b) => {
          if (
            (logData.studentId && b.studentId === logData.studentId) ||
            (logData.recipientPhone && b.parentPhone.replace(/\D/g, "") === logData.recipientPhone.replace(/\D/g, ""))
          ) {
            return {
              ...b,
              zaloSentAt: nowIso,
              zaloLastReminderAt: logData.messageType === "TUITION_REMINDER" ? nowIso : b.zaloLastReminderAt,
            };
          }
          return b;
        })
      );
    }

    if (logData.messageType === "MAKEUP_SURVEY") {
      setMakeupClasses((prev) =>
        prev.map((mc) => ({
          ...mc,
          students: mc.students.map((st) =>
            st.studentId === logData.studentId
              ? { ...st, zaloSurveySentAt: nowIso, surveySentAt: nowIso }
              : st
          ),
        }))
      );
    }

    if (logData.messageType === "MAKEUP_NOTICE") {
      setMakeupClasses((prev) =>
        prev.map((mc) => ({
          ...mc,
          students: mc.students.map((st) =>
            st.studentId === logData.studentId
              ? { ...st, zaloNoticeSentAt: nowIso, notifiedAt: nowIso }
              : st
          ),
        }))
      );
    }

    if (logData.messageType === "MAKEUP_REPORT") {
      setMakeupClasses((prev) =>
        prev.map((mc) => {
          if (logData.className && mc.title.includes(logData.className)) {
            return { ...mc, zaloReportSentAt: nowIso, contentSentToParentsAt: nowIso };
          }
          return mc;
        })
      );
    }

    if (logData.messageType === "PAYROLL") {
      setStaffTimesheets((prev) =>
        prev.map((ts) => {
          if (logData.recipientPhone && ts.staffName && logData.recipientName.includes(ts.staffName)) {
            return { ...ts, zaloSentAt: nowIso };
          }
          return ts;
        })
      );
    }

    return newLog;
  };

  const clearZaloMessageLogs = () => {
    setZaloMessageLogs([]);
  };

  // ==============================================================
  // ZALO OFFICIAL ACCOUNT (OA) & NHÓM ZALO LỚP
  // ==============================================================
  const updateZaloOAConfig = (updates: Partial<ZaloOAConfig>) => {
    setZaloOAConfig((prev) => ({ ...prev, ...updates }));
  };

  const testZaloOAConnection = async (): Promise<{ success: boolean; message: string; quotaRemaining: number }> => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (!zaloOAConfig.oaId || !zaloOAConfig.appId) {
      return {
        success: false,
        message: "Chưa cấu hình OA ID hoặc App ID. Vui lòng kiểm tra lại thông tin.",
        quotaRemaining: zaloOAConfig.quotaRemaining,
      };
    }
    setZaloOAConfig((prev) => ({ ...prev, isConnected: true }));
    return {
      success: true,
      message: `Kết nối thành công tới Zalo OA: ${zaloOAConfig.oaName} (ID: ${zaloOAConfig.oaId}). Hạn mức ZNS còn: ${zaloOAConfig.quotaRemaining} tin.`,
      quotaRemaining: zaloOAConfig.quotaRemaining,
    };
  };

  const sendZaloOAMessage = async (params: {
    recipientPhone: string;
    recipientName: string;
    studentId?: string;
    studentName?: string;
    studentCode?: string;
    className?: string;
    messageType: ZaloMessageType;
    title: string;
    content: string;
  }): Promise<{ success: boolean; message: string; quotaRemaining: number }> => {
    try {
      const res = await sendZaloOAServiceMessage(zaloOAConfig, {
        recipientPhone: params.recipientPhone,
        recipientName: params.recipientName,
        studentName: params.studentName,
        className: params.className,
        messageType: params.messageType,
        content: params.content,
      });

      // Trừ hạn mức ZNS
      setZaloOAConfig((prev) => ({ ...prev, quotaRemaining: res.quotaRemaining }));

      // Ghi nhật ký tin nhắn
      const adminAccForOa = userAccounts.find((a) => a.role === "ADMIN");
      addZaloMessageLog({
        senderRole: "ADMIN",
        senderName: zaloOAConfig.oaName || `${adminAccForOa?.name || "Shiny English"} (Zalo OA)`,
        senderPhone: adminAccForOa?.phone || "0964645174",
        senderAccountType: "CENTER_HOTLINE",
        recipientName: params.recipientName,
        recipientPhone: params.recipientPhone,
        studentId: params.studentId,
        studentName: params.studentName,
        studentCode: params.studentCode,
        className: params.className,
        messageType: params.messageType,
        title: params.title || "Tin Nhắn Zalo OA",
        content: params.content,
      });

      return {
        success: true,
        message: `Đã gửi tự động qua Zalo OA tới ${params.recipientName} (${params.recipientPhone})`,
        quotaRemaining: res.quotaRemaining,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Gửi tin nhắn qua Zalo OA thất bại.",
        quotaRemaining: zaloOAConfig.quotaRemaining,
      };
    }
  };

  // ==============================================================
  // ZALO MASTER TEMPLATES (ADMIN CẤU HÌNH TẬP TRUNG TOÀN HỆ THỐNG)
  // ==============================================================
  const updateZaloTemplate = (key: keyof ZaloMasterTemplates, template: string) => {
    setZaloTemplates((prev) => ({
      ...prev,
      [key]: template,
    }));
  };

  const resetZaloTemplates = () => {
    setZaloTemplates(DEFAULT_ZALO_MASTER_TEMPLATES);
  };

  const renderZaloTemplate = (key: keyof ZaloMasterTemplates, rawTokens: Record<string, any>): string => {
    const rawTemplate = zaloTemplates[key] || DEFAULT_ZALO_MASTER_TEMPLATES[key] || "";
    
    // 1. Chuẩn hóa & tạo alias hai chiều thông minh cho các token phổ biến (chống lộ hàm & biến)
    const tokens: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawTokens)) {
      if (typeof v === "function") continue; // Tuyệt đối không để hàm lọt vào tin nhắn!
      tokens[k] = v !== undefined && v !== null ? String(v) : "";
    }

    // Alias học phí & số buổi
    if (tokens.month && !tokens.billingMonth) tokens.billingMonth = tokens.month;
    if (tokens.billingMonth && !tokens.month) tokens.month = tokens.billingMonth;
    if (tokens.totalSessions && !tokens.lessonCount) tokens.lessonCount = tokens.totalSessions;
    if (tokens.lessonCount && !tokens.totalSessions) tokens.totalSessions = tokens.lessonCount;
    if (tokens.finalAmount && !tokens.amount) tokens.amount = tokens.finalAmount;
    if (tokens.amount && !tokens.finalAmount) tokens.finalAmount = tokens.amount;
    
    // Alias tên học sinh & viết hoa
    if (tokens.studentName && !tokens.studentNameUpper) tokens.studentNameUpper = tokens.studentName.toUpperCase();
    if (tokens.className && !tokens.classNameUpper) tokens.classNameUpper = tokens.className.toUpperCase();
    
    // Alias công nợ nhiều tháng
    if (tokens.totalDebt && !tokens.totalDebtAmount) tokens.totalDebtAmount = tokens.totalDebt;
    if (tokens.totalDebtAmount && !tokens.totalDebt) tokens.totalDebt = tokens.totalDebtAmount;
    if (tokens.debtMonths && !tokens.unpaidMonths) tokens.unpaidMonths = tokens.debtMonths;
    if (tokens.unpaidMonths && !tokens.debtMonths) tokens.debtMonths = tokens.unpaidMonths;
    if (tokens.unpaidMonths && !tokens.debtCount) {
      const parts = tokens.unpaidMonths.split(",").filter((p) => p.trim());
      tokens.debtCount = String(parts.length > 0 ? parts.length : 1);
    }
    
    // Hotline & thông tin ngân hàng mặc định
    const adminAccForTpl = userAccounts.find((a) => a.role === "ADMIN");
    const adminHotlineFormatted = adminAccForTpl?.phone ? formatDisplayPhone(adminAccForTpl.phone) : "0964.645.174";
    if (!tokens.hotline) tokens.hotline = adminHotlineFormatted;
    if (!tokens.bankInfo) tokens.bankInfo = "MB Bank | STK: 0964645174 | NGUYEN THI DUNG";

    // 2. Thay thế toàn bộ token {token}
    let rendered = rawTemplate.replace(/\{(\w+)\}/g, (match, token) => {
      if (tokens[token] !== undefined && tokens[token] !== "") {
        return tokens[token];
      }
      return match;
    });

    // 3. Xử lý an toàn: Dọn sạch mọi token {token} còn sót, chống hiển thị tên biến ra tin nhắn phụ huynh
    rendered = rendered.replace(/\{(\w+)\}/g, "");

    return rendered.trim();
  };

  // ==============================================================
  // ZALO INTERACTIVE SESSION HANDSHAKE & TRACKING (TASK 6 OPTION 3)
  // ==============================================================
  const isZaloSessionValid = (role: ZaloAccountRole): boolean => {
    const session = zaloSessions[role];
    if (!session || !session.isValid) return false;
    if (session.sessionExpiresAt) {
      return new Date(session.sessionExpiresAt).getTime() > Date.now();
    }
    return true;
  };

  const refreshZaloSession = (role: ZaloAccountRole) => {
    setZaloSessions((prev) => {
      const current = prev[role] || INITIAL_ZALO_SESSIONS[role];
      return {
        ...prev,
        [role]: {
          ...current,
          isValid: true,
          lastHandshakeAt: new Date().toISOString(),
          sessionExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      };
    });
  };

  const disconnectZaloSession = (role: ZaloAccountRole) => {
    setZaloSessions((prev) => {
      const current = prev[role] || INITIAL_ZALO_SESSIONS[role];
      return {
        ...prev,
        [role]: {
          ...current,
          isValid: false,
          sessionExpiresAt: undefined,
          handshakeToken: undefined,
        },
      };
    });
  };

  const verifyZaloSession = async (
    role: ZaloAccountRole,
    phoneNumber: string,
    accountName?: string
  ): Promise<{ success: boolean; message: string }> => {
    const token = `zalo-shk-${role.toLowerCase()}-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const adminAccForVerify = userAccounts.find((a) => a.role === "ADMIN");
    const name = accountName || (role === "ADMIN" ? (adminAccForVerify?.name || "Quản Trị Viên") : role === "TEACHER" ? "Giáo Viên" : "Trợ Giảng");

    setZaloSessions((prev) => ({
      ...prev,
      [role]: {
        role,
        phoneNumber,
        accountName: name,
        isValid: true,
        lastHandshakeAt: nowIso,
        sessionExpiresAt: expiresIso,
        handshakeToken: token,
      },
    }));

    return {
      success: true,
      message: `Đã lưu thông tin Zalo cho ${name} (${phoneNumber}).`,
    };
  };

  const sendZaloClassGroupMessage = async (
    classId: string,
    messageText?: string,
    senderRole?: ZaloAccountRole,
    senderStaffId?: string,
    overrideGroupUrl?: string,
    overrideGroupId?: string
  ): Promise<{ success: boolean; message: string; zaloGroupUrl?: string }> => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) {
      return { success: false, message: "Không tìm thấy thông tin lớp học." };
    }

    const effectiveGroupUrl = overrideGroupUrl?.trim() || cls.zaloGroupUrl?.trim() || "";
    const effectiveGroupId = overrideGroupId?.trim() || cls.zaloGroupId?.trim() || "";

    if (
      (overrideGroupUrl && overrideGroupUrl.trim() && overrideGroupUrl.trim() !== cls.zaloGroupUrl) ||
      (overrideGroupId && overrideGroupId.trim() && overrideGroupId.trim() !== cls.zaloGroupId)
    ) {
      updateClass(classId, {
        zaloGroupUrl: effectiveGroupUrl,
        zaloGroupId: effectiveGroupId || undefined,
      });
    }

    const isDummyUrl =
      !effectiveGroupUrl ||
      effectiveGroupUrl.includes("shinystar01") ||
      effectiveGroupUrl === "https://zalo.me" ||
      (cls.code ? effectiveGroupUrl.endsWith("/g/" + cls.code.toLowerCase()) : false);

    const validGroupUrl =
      !isDummyUrl && (effectiveGroupUrl.startsWith("http://") || effectiveGroupUrl.startsWith("https://"))
        ? effectiveGroupUrl
        : "";

    const resolvedRole: ZaloAccountRole =
      senderRole ||
      (currentUserAccount?.role === "ASSISTANT"
        ? "ASSISTANT"
        : currentUserAccount?.role === "ADMIN"
        ? "ADMIN"
        : "TEACHER");

    const adminAcc = userAccounts.find((a) => a.role === "ADMIN");
    const staffObj =
      resolvedRole === "ADMIN"
        ? undefined
        : staff.find(
            (s) =>
              (senderStaffId && s.id === senderStaffId) ||
              (currentUserAccount?.staffId && s.id === currentUserAccount.staffId) ||
              (currentUserAccount?.phone && cleanPhoneNumber(s.phone) === cleanPhoneNumber(currentUserAccount.phone))
          );

    const resolvedSenderName =
      resolvedRole === "ADMIN"
        ? adminAcc?.name || currentUserAccount?.name || "Quản Trị Viên"
        : staffObj?.fullName || currentUserAccount?.name || (resolvedRole === "TEACHER" ? "Giáo Viên" : "Trợ Giảng");

    const resolvedSenderPhone =
      resolvedRole === "ADMIN"
        ? adminAcc?.phone || currentUserAccount?.phone || ""
        : staffObj?.phone || currentUserAccount?.phone || "";

    const senderAccountKey = buildZaloAccountKey({
      role: resolvedRole,
      staffId: staffObj?.id || senderStaffId || currentUserAccount?.staffId,
      phone: resolvedSenderPhone,
      userId: currentUserAccount?.id,
    });

    if (!messageText || !messageText.trim()) {
      return { success: false, message: "Nội dung tin nhắn nhóm lớp không được để trống.", zaloGroupUrl: validGroupUrl };
    }

    if (!effectiveGroupId && !validGroupUrl) {
      return {
        success: false,
        message: `Lớp "${cls.name}" chưa gắn link nhóm Zalo hợp lệ. Vui lòng dán link nhóm Zalo (zalo.me/g/...) hoặc chọn nhóm từ Bot trước khi gửi.`,
      };
    }

    let realApiSent = false;
    let apiError = "";

    try {
      const apiRes = await fetch("/api/zalo/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: effectiveGroupId || undefined,
          groupUrl: validGroupUrl || undefined,
          groupName: !effectiveGroupId && !validGroupUrl ? cls.name : undefined,
          className: cls.name,
          message: messageText,
          senderRole: resolvedRole,
          senderPhone: resolvedSenderPhone,
          accountId: senderAccountKey,
        }),
      });
      const apiData = await apiRes.json().catch(() => ({}));
      if (apiRes.ok && apiData?.success) {
        realApiSent = true;
      } else {
        apiError = apiData?.error || apiData?.message || "";
      }
    } catch (err: any) {
      apiError = err?.message || "Không thể kết nối máy chủ Zalo Bot.";
    }

    if (!realApiSent) {
      return {
        success: false,
        message:
          apiError ||
          `Bot Zalo của ${resolvedSenderName} chưa đăng nhập hoặc chưa tìm thấy nhóm Zalo lớp "${cls.name}". Vui lòng quét mã QR trong mục Zalo và kiểm tra link nhóm.`,
        zaloGroupUrl: validGroupUrl || undefined,
      };
    }

    addZaloMessageLog({
      senderRole: resolvedRole,
      senderName: resolvedSenderName,
      senderPhone: resolvedSenderPhone,
      senderAccountType: resolvedRole === "ADMIN" ? "CENTER_HOTLINE" : "PERSONAL",
      recipientName: `Nhóm Zalo Lớp: ${cls.name}`,
      recipientPhone: validGroupUrl || effectiveGroupId,
      className: cls.name,
      messageType: "CLASS_LOG",
      title: `Đăng Nhóm Zalo Lớp: ${cls.name}`,
      content: messageText,
    });

    const todayIso = new Date().toISOString().split("T")[0];
    const nowIso = new Date().toISOString();
    setClassLogs((prev) =>
      prev.map((l) =>
        l.classId === classId && (l.dateStr === todayIso || l.status === "PUBLISHED")
          ? { ...l, zaloSentAt: nowIso, zaloRecipientCount: cls.currentStudents || 15 }
          : l
      )
    );

    return {
      success: true,
      message: `Đã gửi trực tiếp vào Nhóm Zalo Lớp "${cls.name}" bằng tài khoản ${resolvedSenderName}!`,
      zaloGroupUrl: validGroupUrl || undefined,
    };
  };

  const sendZaloMessageToParent = async (params: {
    recipientPhone: string;
    recipientName: string;
    studentId?: string;
    studentName?: string;
    studentCode?: string;
    className?: string;
    messageType: ZaloMessageType;
    title: string;
    content: string;
    senderRole?: ZaloAccountRole;
    senderStaffId?: string;
    senderName?: string;
    senderPhone?: string;
    openChatWindow?: boolean;
  }): Promise<{ success: boolean; message: string; messageId: string }> => {
    const resolvedRole: ZaloAccountRole =
      params.senderRole ||
      (currentUserAccount?.role === "TEACHER"
        ? "TEACHER"
        : currentUserAccount?.role === "ASSISTANT"
        ? "ASSISTANT"
        : "ADMIN");

    const adminAcc = userAccounts.find((a) => a.role === "ADMIN");
    const resolvedAccountType: "CENTER_HOTLINE" | "PERSONAL" =
      resolvedRole === "ADMIN" ? "CENTER_HOTLINE" : "PERSONAL";

    const staffObj =
      resolvedRole === "ADMIN"
        ? undefined
        : staff.find(
            (s) =>
              (params.senderStaffId && s.id === params.senderStaffId) ||
              (params.senderPhone && cleanPhoneNumber(s.phone) === cleanPhoneNumber(params.senderPhone)) ||
              (currentUserAccount?.staffId && s.id === currentUserAccount.staffId) ||
              (currentUserAccount?.phone && cleanPhoneNumber(s.phone) === cleanPhoneNumber(currentUserAccount.phone))
          );

    const resolvedSenderName =
      params.senderName ||
      (resolvedRole === "ADMIN"
        ? adminAcc?.name || currentUserAccount?.name || "Quản Trị Viên"
        : staffObj?.fullName || currentUserAccount?.name || (resolvedRole === "TEACHER" ? "Giáo Viên" : "Trợ Giảng"));

    const resolvedSenderPhone =
      params.senderPhone ||
      (resolvedRole === "ADMIN"
        ? adminAcc?.phone || currentUserAccount?.phone || ""
        : staffObj?.phone || currentUserAccount?.phone || "");

    const senderAccountKey = buildZaloAccountKey({
      role: resolvedRole,
      staffId: staffObj?.id || params.senderStaffId || currentUserAccount?.staffId,
      phone: resolvedSenderPhone,
      userId: currentUserAccount?.id,
    });

    let realApiSent = false;
    let apiError = "";

    try {
      const apiRes = await fetch("/api/zalo/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: params.recipientPhone,
          message: params.content,
          senderRole: resolvedRole,
          senderPhone: resolvedSenderPhone,
          accountId: senderAccountKey,
        }),
      });
      const apiData = await apiRes.json().catch(() => ({}));
      if (apiRes.ok && apiData?.success) {
        realApiSent = true;
      } else {
        apiError = apiData?.error || apiData?.message || "";
      }
    } catch (err: any) {
      apiError = err?.message || "Không thể kết nối máy chủ Zalo Bot.";
    }

    // Chỉ dùng Extension Bridge nếu Extension được cài đặt sẵn trên trình duyệt
    if (!realApiSent) {
      const bridgeRes = await sendDirectAutoZaloMessage(
        params.recipientPhone,
        params.content,
        resolvedSenderName,
        false,
        {
          accountId: senderAccountKey,
          senderRole: resolvedRole,
          senderPhone: resolvedSenderPhone,
        }
      );
      if (bridgeRes.success) {
        realApiSent = true;
      } else if (!apiError && bridgeRes.error) {
        apiError = bridgeRes.error;
      }
    }

    if (!realApiSent) {
      return {
        success: false,
        message:
          apiError ||
          `Tài khoản Zalo (${resolvedSenderName}) chưa kết nối Bot hoặc không gửi được tới ${params.recipientPhone}. Vui lòng bấm biểu tượng Zalo ở góc trên để quét QR.`,
        messageId: "",
      };
    }

    // Chỉ ghi nhật ký khi đã gửi thành công thực sự
    const newLog = addZaloMessageLog({
      senderRole: resolvedRole,
      senderName: resolvedSenderName,
      senderPhone: resolvedSenderPhone,
      senderAccountType: resolvedAccountType,
      recipientName: params.recipientName,
      recipientPhone: params.recipientPhone,
      studentId: params.studentId,
      studentName: params.studentName,
      studentCode: params.studentCode,
      className: params.className,
      messageType: params.messageType,
      title: params.title,
      content: params.content,
    });

    return {
      success: true,
      message: `Đã gửi trực tiếp qua Zalo (${resolvedSenderName}) tới ${params.recipientName} (${params.recipientPhone})!`,
      messageId: newLog.id,
    };
  };

  // ==============================================================
  // AUTHENTICATION & USER ACCOUNTS MANAGEMENT
  // ==============================================================
  const login = (phone: string, password?: string, selectedRole?: UserRole) => {
    const cleanInputPhone = normalizePhoneNumber(phone);
    if (!cleanInputPhone) {
      return { success: false, message: "Vui lòng nhập số điện thoại đăng nhập!" };
    }

    // Tài khoản Quản trị viên (ADMIN): tra cứu động từ userAccounts theo role ADMIN
    const adminAcc =
      userAccounts.find((acc) => acc.role === "ADMIN") ||
      userAccounts.find((acc) => normalizePhoneNumber(acc.phone) === normalizePhoneNumber(ADMIN_DEFAULT_PHONE));
    const isAdminAttempt = adminAcc && cleanInputPhone === normalizePhoneNumber(adminAcc.phone);

    if (isAdminAttempt) {
      if (selectedRole && selectedRole !== "ADMIN") {
        return {
          success: false,
          message: `Số điện thoại ${adminAcc.phone} là tài khoản Quản trị viên. Bạn không thể đăng nhập với vai trò Giáo viên, Trợ giảng hay Phụ huynh!`,
        };
      }

      if (!password) {
        return { success: false, message: "Vui lòng nhập mật khẩu Quản trị viên!" };
      }
      if (adminAcc.password !== password) {
        return { success: false, message: "Mật khẩu Quản trị viên không chính xác! Vui lòng kiểm tra lại." };
      }

      const updatedAdmin: UserAccount = {
        ...adminAcc,
        role: "ADMIN",
        lastLoginAt: new Date().toISOString(),
      };

      setCurrentUserAccount(updatedAdmin);

      return {
        success: true,
        message: "Đăng nhập thành công với vai trò Quản Trị Viên!",
        user: updatedAdmin,
      };
    }

    // 1. Tìm tài khoản khớp số điện thoại
    let targetAcc = userAccounts.find(
      (acc) => normalizePhoneNumber(acc.phone) === cleanInputPhone && (!selectedRole || acc.role === selectedRole)
    );

    // Fallback cho Phụ huynh: Nếu chưa có trong userAccounts nhưng khớp parentPhone của học viên, tự động đồng bộ tài khoản
    if (!targetAcc && (!selectedRole || selectedRole === "PARENT")) {
      const matchedStudent = students.find(
        (s) => normalizePhoneNumber(s.parentPhone) === cleanInputPhone
      );
      if (matchedStudent) {
        targetAcc = {
          id: `acc_parent_${matchedStudent.id}`,
          phone: matchedStudent.parentPhone,
          password: "",
          role: "PARENT",
          name: matchedStudent.parentName 
            ? `${matchedStudent.parentName} (PH bé ${matchedStudent.fullName})` 
            : `Phụ huynh em ${matchedStudent.fullName}`,
          studentId: matchedStudent.id,
          isLoginAllowed: true,
          createdAt: new Date().toISOString(),
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(matchedStudent.parentName || matchedStudent.fullName)}`,
        };
        setUserAccounts((prev) => [...prev.filter((a) => a.studentId !== matchedStudent.id), targetAcc!]);
      }
    }

    // Nếu không tìm thấy theo vai trò đã chọn, kiểm tra xem SĐT này có ở vai trò khác không
    if (!targetAcc) {
      const anyAcc = userAccounts.find(
        (acc) => normalizePhoneNumber(acc.phone) === cleanInputPhone
      );
      if (anyAcc && selectedRole && anyAcc.role !== selectedRole) {
        return {
          success: false,
          message: `Số điện thoại này thuộc tài khoản ${getRoleName(anyAcc.role)}, bạn không thể đăng nhập với vai trò ${getRoleName(selectedRole)}!`,
        };
      }
      return {
        success: false,
        message: "Không tìm thấy tài khoản với số điện thoại này trong hệ thống!",
      };
    }

    // 2. Kiểm tra vai trò chặt chẽ
    if (selectedRole && targetAcc.role !== selectedRole) {
      return {
        success: false,
        message: `Tài khoản này là ${getRoleName(targetAcc.role)}, không thể đăng nhập với vai trò ${getRoleName(selectedRole)}!`,
      };
    }

    // 3. Kiểm tra phân quyền truy cập (Admin cấp quyền)
    if (!targetAcc.isLoginAllowed) {
      if (targetAcc.role === "TEACHER" || targetAcc.role === "ASSISTANT") {
        return {
          success: false,
          message: "Tài khoản của bạn chưa được Quản trị viên phân quyền đăng nhập (hoặc đã bị khóa). Vui lòng liên hệ Admin trung tâm để được cấp quyền!",
        };
      }
      if (targetAcc.role === "PARENT") {
        return {
          success: false,
          message: "Tài khoản phụ huynh đã bị Quản trị viên tạm khóa quyền truy cập. Vui lòng liên hệ trung tâm để được hỗ trợ!",
        };
      }
      return {
        success: false,
        message: "Tài khoản này hiện đang bị khóa!",
      };
    }

    // 4. Kiểm tra mật khẩu (Phụ huynh không cần mật khẩu)
    if (targetAcc.role !== "PARENT") {
      if (!password) {
        return { success: false, message: "Vui lòng nhập mật khẩu!" };
      }
      if (targetAcc.password !== password) {
        return { success: false, message: "Mật khẩu không chính xác! Vui lòng kiểm tra lại." };
      }
    }

    // 5. Đăng nhập thành công (Đồng bộ staffId chuẩn nếu thiếu)
    let resolvedStaffId = targetAcc.staffId;
    if ((targetAcc.role === "TEACHER" || targetAcc.role === "ASSISTANT") && !resolvedStaffId) {
      const matchedStaff = staff.find(
        (s) => normalizePhoneNumber(s.phone) === cleanInputPhone && s.role === targetAcc.role
      );
      if (matchedStaff) resolvedStaffId = matchedStaff.id;
    }

    const updatedAcc: UserAccount = {
      ...targetAcc,
      ...(resolvedStaffId ? { staffId: resolvedStaffId } : {}),
      lastLoginAt: new Date().toISOString(),
    };
    setUserAccounts((prev) => prev.map((a) => (a.id === updatedAcc.id ? updatedAcc : a)));
    setCurrentUserAccount(updatedAcc);

    return {
      success: true,
      message: `Đăng nhập thành công với vai trò ${getRoleName(updatedAcc.role)}!`,
      user: updatedAcc,
    };
  };

  const logout = () => {
    const closingAccount = currentUserAccount;

    // Tự động đăng xuất Bot Zalo của ĐÚNG tài khoản đang đăng xuất (không ảnh hưởng bot các tài khoản khác đang hoạt động)
    if (closingAccount && closingAccount.role !== "PARENT") {
      const accountKey = buildZaloAccountKey({
        role: closingAccount.role,
        staffId: closingAccount.staffId,
        phone: closingAccount.phone,
        userId: closingAccount.id,
      });

      if (typeof window !== "undefined") {
        try {
          void fetch("/api/zalo/disconnect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify({
              accountId: accountKey,
              role: closingAccount.role,
              phone: closingAccount.phone || "",
            }),
          });
        } catch (_e) {}
      }

      const cleanClosingPhone = cleanPhoneNumber(closingAccount.phone || "");
      setZaloAccounts((prev) =>
        prev.map((acc) => {
          const sameUser =
            acc.role === closingAccount.role &&
            (closingAccount.role === "ADMIN" ||
              (cleanClosingPhone && cleanPhoneNumber(acc.phoneNumber) === cleanClosingPhone));
          return sameUser ? { ...acc, isConnected: false } : acc;
        })
      );

      if (
        closingAccount.role === "ADMIN" ||
        closingAccount.role === "TEACHER" ||
        closingAccount.role === "ASSISTANT"
      ) {
        const zRole = closingAccount.role as ZaloAccountRole;
        setZaloSessions((prev) => ({
          ...prev,
          [zRole]: {
            ...prev[zRole],
            isValid: false,
            handshakeToken: undefined,
          },
        }));
      }
    }

    setCurrentUserAccount(null);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("ms_dung_shiny_auth_session");
      } catch (err) {
        console.error("Failed to clear auth session", err);
      }
    }
  };

  const updateAdminProfile = (updates: { name: string; phone: string }) => {
    const cleanName = (updates.name || "").trim();
    const cleanPhone = normalizePhoneNumber(updates.phone || "");

    if (cleanName.length < 2) {
      return { success: false, message: "Tên chủ trung tâm phải có ít nhất 2 ký tự!" };
    }
    if (cleanPhone.length < 9 || !/^[0-9]{9,11}$/.test(cleanPhone)) {
      return { success: false, message: "Số điện thoại Admin không hợp lệ (cần 9–11 chữ số)!" };
    }

    const conflictOtherRole = userAccounts.find(
      (a) => a.role !== "ADMIN" && normalizePhoneNumber(a.phone) === cleanPhone
    );
    if (conflictOtherRole) {
      return {
        success: false,
        message: `Số điện thoại ${updates.phone} đang được sử dụng bởi tài khoản ${conflictOtherRole.name}. Vui lòng chọn số khác!`,
      };
    }

    const adminAcc = userAccounts.find((a) => a.role === "ADMIN");
    const updatedAdmin: UserAccount = adminAcc
      ? { ...adminAcc, name: cleanName, phone: cleanPhone }
      : {
          id: "acc-admin-1",
          phone: cleanPhone,
          password: "123",
          role: "ADMIN",
          name: cleanName,
          isLoginAllowed: true,
          createdAt: new Date().toISOString(),
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
        };

    setUserAccounts((prev) => {
      const hasAdmin = prev.some((a) => a.role === "ADMIN");
      if (hasAdmin) {
        return prev.map((a) => (a.role === "ADMIN" ? updatedAdmin : a));
      }
      return [updatedAdmin, ...prev];
    });

    setZaloAccounts((prev) =>
      prev.map((z) =>
        z.role === "ADMIN"
          ? { ...z, accountName: `${cleanName} (Hotline Trung Tâm)`, phoneNumber: cleanPhone }
          : z
      )
    );

    setZaloSessions((prev) => ({
      ...prev,
      ADMIN: {
        ...prev.ADMIN,
        accountName: cleanName,
        phoneNumber: cleanPhone,
      },
    }));

    if (currentUserAccount?.role === "ADMIN" || currentUserAccount?.id === updatedAdmin.id) {
      setCurrentUserAccount(updatedAdmin);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ms_dung_shiny_auth_session", JSON.stringify(updatedAdmin));
        } catch {}
      }
    }

    return {
      success: true,
      message: `Đã cập nhật thông tin chủ trung tâm: ${cleanName} (${cleanPhone})!`,
    };
  };

  const changeAdminPassword = (oldPass: string, newPass: string) => {
    const adminAcc = userAccounts.find((a) => a.role === "ADMIN");
    if (!adminAcc) {
      return { success: false, message: "Không tìm thấy tài khoản Quản trị viên!" };
    }
    if (adminAcc.password !== oldPass) {
      return { success: false, message: "Mật khẩu hiện tại không chính xác!" };
    }
    if (!newPass || newPass.trim().length < 3) {
      return { success: false, message: "Mật khẩu mới phải có ít nhất 3 ký tự!" };
    }

    const updated = { ...adminAcc, password: newPass.trim() };
    setUserAccounts((prev) => prev.map((a) => (a.id === adminAcc.id ? updated : a)));
    if (currentUserAccount?.id === adminAcc.id) {
      setCurrentUserAccount(updated);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("ms_dung_shiny_auth_session", JSON.stringify(updated));
        } catch {}
      }
    }
    return { success: true, message: "Đổi mật khẩu Quản trị viên thành công!" };
  };

  const toggleUserAccountPermission = (accountId: string, isAllowed: boolean) => {
    setUserAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, isLoginAllowed: isAllowed } : a))
    );
  };

  const setParentAccountPermissionByStudent = (studentId: string, isAllowed: boolean) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    setUserAccounts((prev) => {
      const cleanPhone = normalizePhoneNumber(student.parentPhone);
      const existing = prev.find(
        (a) => a.studentId === student.id || (a.role === "PARENT" && normalizePhoneNumber(a.phone) === cleanPhone)
      );

      if (existing) {
        return prev.map((a) => (a.id === existing.id ? { ...a, isLoginAllowed: isAllowed, studentId: student.id } : a));
      }

      // Nếu chưa có tài khoản phụ huynh, tự động tạo mới với trạng thái isAllowed
      const newParentAcc: UserAccount = {
        id: `acc-parent-${student.id}`,
        phone: student.parentPhone,
        role: "PARENT",
        name: student.parentName || `Phụ huynh bé ${student.fullName}`,
        studentId: student.id,
        isLoginAllowed: isAllowed,
        createdAt: new Date().toISOString(),
      };
      return [...prev, newParentAcc];
    });
  };

  const toggleAllParentPermissions = (isAllowed: boolean) => {
    setUserAccounts((prev) => {
      const existingParentMap = new Map<string, UserAccount>();
      prev.forEach((a) => {
        if (a.role === "PARENT") {
          if (a.studentId) existingParentMap.set(a.studentId, a);
          existingParentMap.set(normalizePhoneNumber(a.phone), a);
        }
      });

      const updatedAccounts = prev.map((a) => {
        if (a.role === "PARENT") {
          return { ...a, isLoginAllowed: isAllowed };
        }
        return a;
      });

      // Tạo bổ sung tài khoản cho những học sinh chưa có tài khoản phụ huynh
      students.forEach((stu) => {
        const cleanPhone = normalizePhoneNumber(stu.parentPhone);
        const hasAcc = existingParentMap.has(stu.id) || existingParentMap.has(cleanPhone);
        if (!hasAcc) {
          updatedAccounts.push({
            id: `acc-parent-${stu.id}`,
            phone: stu.parentPhone,
            role: "PARENT",
            name: stu.parentName || `Phụ huynh bé ${stu.fullName}`,
            studentId: stu.id,
            isLoginAllowed: isAllowed,
            createdAt: new Date().toISOString(),
          });
        }
      });

      return updatedAccounts;
    });
  };

  const resetStaffPassword = (accountId: string) => {
    setUserAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, password: STAFF_DEFAULT_PASSWORD } : a))
    );
    return {
      success: true,
      message: `Đã đặt lại mật khẩu về mặc định "${STAFF_DEFAULT_PASSWORD}" thành công!`,
    };
  };

  const deleteUserAccount = (accountId: string) => {
    setUserAccounts((prev) => prev.filter((a) => a.id !== accountId));
  };

  return (
    <CenterContext.Provider
      value={{
        classes,
        courses,
        staff,
        students,
        classrooms,
        substitutions,
        attendance,
        classLogs,
        workbookChecks,
        incidentNotes,
        monthlyExamReports,
        staffTimesheets,
        homeworkSubmissions,
        leaveRequests,
        tuitionPayments,
        studentTuitionBills,
        assignments,
        makeupClasses,
        expiredMakeupRecords,
        zaloAccounts,
        zaloMessageLogs,
        zaloOAConfig,
        updateZaloOAConfig,
        testZaloOAConnection,
        sendZaloOAMessage,
        sendZaloClassGroupMessage,
        addClass,
        updateClass,
        deleteClass,
        addStudent,
        updateStudent,
        deleteStudent,
        toggleStudentZaloFriendship,
        setStudentLearningStatus,
        addStaff,
        updateStaff,
        deleteStaff,
        transferStaffClasses,
        addCourse,
        updateCourse,
        deleteCourse,
        addClassroom,
        updateClassroom,
        deleteClassroom,
        setSubstitution,
        removeSubstitution,
        saveAttendance,
        getAttendanceForSession,
        saveClassLog,
        getClassLogForSession,
        deleteClassLog,
        saveWorkbookChecks,
        addIncidentNote,
        deleteIncidentNote,
        saveMonthlyExamReport,
        confirmStaffTimesheet,
        updateStaffTimesheet,
        recalculateStaffTimesheetHours,
        syncMonthlyTimesheets,
        sendTimesheetToStaff,
        markTimesheetPaid,
        markTimesheetUnpaid,
        createAssignment,
        updateAssignment,
        deleteAssignment,
        submitHomework,
        gradeHomeworkSubmission,
        submitLeaveRequest,
        addTuitionPayment,
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
        createMakeupClass,
        updateMakeupClass,
        deleteMakeupClass,
        addStudentToMakeupClass,
        removeStudentFromMakeupClass,
        updateMakeupStudentAttendance,
        updateMakeupClassAttendance,
        sendMakeupClassNotification,
        sendMakeupSurveyToParents,
        sendMakeupContentToParents,
        recordMakeupClassSalary,
        resetMonthlyMakeupBenefits,
        sendZaloMessageToParent,
        updateZaloAccount,
        connectZaloAccount,
        disconnectZaloAccount,
        addZaloMessageLog,
        clearZaloMessageLogs,
        getZaloAccountForUser,
        zaloTemplates,
        updateZaloTemplate,
        resetZaloTemplates,
        renderZaloTemplate,
        zaloSessions,
        verifyZaloSession,
        disconnectZaloSession,
        refreshZaloSession,
        isZaloSessionValid,
        userAccounts,
        currentUserAccount,
        login,
        logout,
        changeAdminPassword,
        updateAdminProfile,
        toggleUserAccountPermission,
        setParentAccountPermissionByStudent,
        toggleAllParentPermissions,
        resetStaffPassword,
        deleteUserAccount,
        setCurrentUserAccount,
        cloudSyncStatus,
        lastCloudSyncAt,
        triggerCloudSync,
      }}
    >
      {children}
    </CenterContext.Provider>
  );
}

export function useCenter() {
  const context = useContext(CenterContext);
  if (!context) {
    throw new Error("useCenter must be used within a CenterProvider");
  }
  return context;
}
