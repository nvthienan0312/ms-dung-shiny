import * as fs from "fs";
import * as path from "path";

const filePath = path.join(__dirname, "../src/data/centerData.ts");
let content = fs.readFileSync(filePath, "utf-8");

const startToken1 = "export const INITIAL_STAFF: StaffItem[] = [";
const endToken1 = "// ==============================================================\r\n// 9. CẤU HÌNH TÀI KHOẢN ZALO";
const endToken1Alt = "// ==============================================================\n// 9. CẤU HÌNH TÀI KHOẢN ZALO";

const startIndex1 = content.indexOf(startToken1);
let endIndex1 = content.indexOf(endToken1);
if (endIndex1 === -1) {
  endIndex1 = content.indexOf(endToken1Alt);
}

if (startIndex1 === -1 || endIndex1 === -1) {
  console.error("Could not find section 1 markers in centerData.ts", { startIndex1, endIndex1 });
  process.exit(1);
}

const replacement1 = `export const INITIAL_STAFF: StaffItem[] = [];
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

`;

content = content.slice(0, startIndex1) + replacement1 + content.slice(endIndex1);

// Now handle section 2: INITIAL_ZALO_ACCOUNTS to end of file
const startToken2 = "export const INITIAL_ZALO_ACCOUNTS: ZaloAccountConfig[] = [";
const startIndex2 = content.indexOf(startToken2);

if (startIndex2 === -1) {
  console.error("Could not find section 2 marker in centerData.ts");
  process.exit(1);
}

const replacement2 = `export const INITIAL_ZALO_ACCOUNTS: ZaloAccountConfig[] = [
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
`;

content = content.slice(0, startIndex2) + replacement2;

fs.writeFileSync(filePath, content, "utf-8");
console.log("Successfully cleaned centerData.ts demo data!");
