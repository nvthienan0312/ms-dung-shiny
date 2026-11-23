import { 
  StaffItem, 
  StudentItem, 
  ClassItem, 
  CourseItem, 
  ClassroomItem,
  ScheduleSlot, 
  StudentTuitionBill,
  INITIAL_COURSES,
  INITIAL_CLASSROOMS,
  INITIAL_ZALO_ACCOUNTS,
  INITIAL_ZALO_MESSAGE_LOGS
} from "./centerData";
import { 
  UserAccount, 
  ADMIN_DEFAULT_PHONE, 
  ADMIN_DEFAULT_PASSWORD, 
  STAFF_DEFAULT_PASSWORD 
} from "@/types/auth";
import { normalizePhoneNumber } from "@/utils/authHelper";

// Danh sách họ, đệm, tên tiếng Việt phong phú để sinh dữ liệu chân thực
const FIRST_NAMES_MALE = [
  "Minh Khôi", "Hoàng Nam", "Gia Bảo", "Quang Anh", "Đức Duy", 
  "Nhật Huy", "Bảo Long", "Tuấn Kiệt", "Hải Đăng", "Gia Huy", 
  "Trọng Nhân", "Quốc Bảo", "Đình Phong", "Thiên Ân", "Khắc Tiệp",
  "Thế Anh", "Khánh Duy", "Đức Phúc", "Huy Hoàng", "Việt Dũng",
  "Thành Đạt", "Bảo Nam", "Tiến Dũng", "Minh Trí", "Chí Thiện"
];

const FIRST_NAMES_FEMALE = [
  "Gia Hân", "Bảo Ngọc", "Tuệ Nhi", "Hoàng My", "Thùy Chi", 
  "Anh Thư", "Khánh An", "Diệu Anh", "Bảo Vy", "Ngọc Diệp", 
  "Thảo Linh", "Mai Chi", "Phương Vy", "Hà My", "Trâm Anh",
  "Minh Anh", "Hương Giang", "Quỳnh Anh", "Yến Nhi", "Tuyết Nhung",
  "Hồng Nhung", "Thanh Trúc", "Như Ý", "Cát Tường", "Khánh Linh"
];

const LAST_NAMES = [
  "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", 
  "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đoàn", "Lương", "Mai", "Trịnh"
];

const PARENT_TITLES_MALE = ["Anh", "Bố", "Chú", "Bác"];
const PARENT_TITLES_FEMALE = ["Chị", "Mẹ", "Cô", "Bác"];

// Helper random
function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function padZero(num: number, digits: number = 4): string {
  return String(num).padStart(digits, "0");
}

// 1. SINH 100 NHÂN SỰ (60 GIÁO VIÊN + 40 TRỢ GIẢNG)
export function generateSeedStaff(): StaffItem[] {
  const staff: StaffItem[] = [];

  // Core 10 nhân sự đầu tiên giữ nguyên để tương thích test
  staff.push(
    {
      id: "staff-t1",
      fullName: "Cô Sarah Johnson",
      email: "sarah.teacher@center.edu.vn",
      phone: "0901 234 567",
      role: "TEACHER",
      specialty: "IELTS & Cambridge Flyers Lead",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      activeClassesCount: 4,
      status: "ACTIVE",
      hourlyRate: 350000,
    },
    {
      id: "staff-t2",
      fullName: "Thầy James Wilson",
      email: "james.wilson@center.edu.vn",
      phone: "0902 345 678",
      role: "TEACHER",
      specialty: "Phonics & Shiny Starters",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
      activeClassesCount: 3,
      status: "ACTIVE",
      hourlyRate: 320000,
    },
    {
      id: "staff-t3",
      fullName: "Cô Emily Watson",
      email: "emily.watson@center.edu.vn",
      phone: "0903 456 789",
      role: "TEACHER",
      specialty: "IELTS Intensive & Writing Task 2",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
      activeClassesCount: 3,
      status: "ACTIVE",
      hourlyRate: 400000,
    },
    {
      id: "staff-ta1",
      fullName: "Thầy Phạm Minh Đức (TA)",
      email: "duc.ta@center.edu.vn",
      phone: "0904 567 890",
      role: "ASSISTANT",
      specialty: "Trợ giảng Lớp Star 01 & Movers",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=MinhDuc",
      activeClassesCount: 4,
      status: "ACTIVE",
      hourlyRate: 120000,
    },
    {
      id: "staff-ta2",
      fullName: "Cô Lê Thanh Hằng (TA)",
      email: "hang.ta@center.edu.vn",
      phone: "0905 678 901",
      role: "ASSISTANT",
      specialty: "Trợ giảng Lớp KET & Flyers",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=ThanhHang",
      activeClassesCount: 3,
      status: "ACTIVE",
      hourlyRate: 120000,
    }
  );

  const teacherSpecialties = [
    "IELTS Academic 7.5+ & Writing",
    "Cambridge Starters & Phonics Fun",
    "Cambridge Movers & Pronunciation",
    "Cambridge Flyers & Listening Skills",
    "KET Mastery & Grammar In Use",
    "PET Intensive & Reading Comprehension",
    "English For Kids & TPR Method",
    "Native Speaking & American Accent",
    "Pronunciation Lab & Interactive Speaking"
  ];

  const assistantSpecialties = [
    "Trợ giảng Starters & Chấm BTVN Sách",
    "Trợ giảng Movers & Hỗ trợ phát âm",
    "Trợ giảng Flyers & Điểm danh 1-chạm",
    "Trợ giảng KET & Chấm Video BTVN",
    "Trợ giảng PET & Báo cáo học bù",
    "Trợ giảng IELTS & Hỗ trợ học liệu"
  ];

  // Sinh tiếp từ index 6 đến 100
  for (let i = staff.length + 1; i <= 100; i++) {
    const isTeacher = i <= 60; // 60 Teachers, 40 Assistants
    const isMale = i % 2 === 0;
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const firstName = isMale ? FIRST_NAMES_MALE[i % FIRST_NAMES_MALE.length] : FIRST_NAMES_FEMALE[i % FIRST_NAMES_FEMALE.length];
    const roleTitle = isTeacher ? (isMale ? "Thầy" : "Cô") : (isMale ? "Thầy" : "Cô");
    const roleSuffix = isTeacher ? "" : " (TA)";
    const fullName = `${roleTitle} ${lastName} ${firstName}${roleSuffix}`;
    const cleanPrefix = isTeacher ? "t" : "ta";
    const id = `staff-${cleanPrefix}${i}`;
    
    // SĐT 10 chữ số chuẩn VN
    const phone = `09${String(10 + (i % 80)).padStart(2, "0")} ${padZero(100 + i, 3)} ${padZero(200 + i, 3)}`;
    const email = `${cleanPrefix}${i}.${lastName.toLowerCase()}@center.edu.vn`;
    const specialty = isTeacher 
      ? teacherSpecialties[i % teacherSpecialties.length]
      : assistantSpecialties[i % assistantSpecialties.length];
    const hourlyRate = isTeacher ? 280000 + (i % 5) * 30000 : 120000 + (i % 3) * 15000;

    staff.push({
      id,
      fullName,
      email,
      phone,
      role: isTeacher ? "TEACHER" : "ASSISTANT",
      specialty,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Staff${i}`,
      activeClassesCount: (i % 3) + 1,
      status: "ACTIVE",
      hourlyRate,
    });
  }

  return staff;
}

// 2. SINH 40 LỚP HỌC ĐỒNG BỘ
export function generateSeedClasses(staff: StaffItem[]): ClassItem[] {
  const teachers = staff.filter(s => s.role === "TEACHER");
  const assistants = staff.filter(s => s.role === "ASSISTANT");

  const classDefinitions = [
    // Starters (6 lớp)
    { code: "CLS-STAR-01", name: "Shiny Starters 01 (Kids)", courseId: "crs-1", courseName: "Shiny Starters (Cambridge Pre-A1)", fee: 1600000, days: [2, 4], time: "17:30 - 19:00", room: "Phòng 101" },
    { code: "CLS-STAR-02", name: "Shiny Starters 02 (Kids)", courseId: "crs-1", courseName: "Shiny Starters (Cambridge Pre-A1)", fee: 1600000, days: [3, 5], time: "17:30 - 19:00", room: "Phòng 102" },
    { code: "CLS-STAR-03", name: "Shiny Starters 03 (Kids)", courseId: "crs-1", courseName: "Shiny Starters (Cambridge Pre-A1)", fee: 1600000, days: [4, 6], time: "18:00 - 19:30", room: "Phòng 103" },
    { code: "CLS-STAR-04", name: "Shiny Starters 04 (Weekend)", courseId: "crs-1", courseName: "Shiny Starters (Cambridge Pre-A1)", fee: 1600000, days: [7, 8], time: "08:30 - 10:00", room: "Phòng 101" },
    { code: "CLS-STAR-05", name: "Shiny Starters 05 (Weekend)", courseId: "crs-1", courseName: "Shiny Starters (Cambridge Pre-A1)", fee: 1600000, days: [7, 8], time: "10:15 - 11:45", room: "Phòng 102" },
    { code: "CLS-STAR-06", name: "Shiny Starters 06 (Kids)", courseId: "crs-1", courseName: "Shiny Starters (Cambridge Pre-A1)", fee: 1600000, days: [3, 6], time: "19:00 - 20:30", room: "Phòng 104" },

    // Movers (6 lớp)
    { code: "CLS-MOV-01", name: "Shiny Movers 01 (A1)", courseId: "crs-2", courseName: "Shiny Movers (Cambridge A1)", fee: 1750000, days: [2, 5], time: "17:30 - 19:00", room: "Phòng 201" },
    { code: "CLS-MOV-02", name: "Shiny Movers 02 (A1)", courseId: "crs-2", courseName: "Shiny Movers (Cambridge A1)", fee: 1750000, days: [3, 6], time: "17:30 - 19:00", room: "Phòng 202" },
    { code: "CLS-MOV-03", name: "Shiny Movers 03 (A1)", courseId: "crs-2", courseName: "Shiny Movers (Cambridge A1)", fee: 1750000, days: [4, 7], time: "18:00 - 19:30", room: "Phòng 203" },
    { code: "CLS-MOV-04", name: "Shiny Movers 04 (Weekend)", courseId: "crs-2", courseName: "Shiny Movers (Cambridge A1)", fee: 1750000, days: [7, 8], time: "08:30 - 10:00", room: "Phòng 201" },
    { code: "CLS-MOV-05", name: "Shiny Movers 05 (Weekend)", courseId: "crs-2", courseName: "Shiny Movers (Cambridge A1)", fee: 1750000, days: [7, 8], time: "14:00 - 15:30", room: "Phòng 202" },
    { code: "CLS-MOV-06", name: "Shiny Movers 06 (A1)", courseId: "crs-2", courseName: "Shiny Movers (Cambridge A1)", fee: 1750000, days: [2, 6], time: "19:15 - 20:45", room: "Phòng 204" },

    // Flyers (6 lớp)
    { code: "CLS-FLY-01", name: "Shiny Flyers 01 (A2)", courseId: "crs-3", courseName: "Shiny Flyers (Cambridge A2)", fee: 1900000, days: [2, 4], time: "19:15 - 20:45", room: "Phòng 101" },
    { code: "CLS-FLY-02", name: "Shiny Flyers 02 (A2)", courseId: "crs-3", courseName: "Shiny Flyers (Cambridge A2)", fee: 1900000, days: [3, 5], time: "19:15 - 20:45", room: "Phòng 102" },
    { code: "CLS-FLY-03", name: "Shiny Flyers 03 (A2)", courseId: "crs-3", courseName: "Shiny Flyers (Cambridge A2)", fee: 1900000, days: [4, 6], time: "17:30 - 19:00", room: "Phòng 103" },
    { code: "CLS-FLY-04", name: "Shiny Flyers 04 (Weekend)", courseId: "crs-3", courseName: "Shiny Flyers (Cambridge A2)", fee: 1900000, days: [7, 8], time: "10:15 - 11:45", room: "Phòng 103" },
    { code: "CLS-FLY-05", name: "Shiny Flyers 05 (Weekend)", courseId: "crs-3", courseName: "Shiny Flyers (Cambridge A2)", fee: 1900000, days: [7, 8], time: "15:45 - 17:15", room: "Phòng 104" },
    { code: "CLS-FLY-06", name: "Shiny Flyers 06 (A2)", courseId: "crs-3", courseName: "Shiny Flyers (Cambridge A2)", fee: 1900000, days: [3, 7], time: "18:00 - 19:30", room: "Phòng 201" },

    // KET (6 lớp)
    { code: "CLS-KET-01", name: "KET Mastery 01 (A2-B1)", courseId: "crs-4", courseName: "KET Mastery (Cambridge A2 Key)", fee: 2100000, days: [2, 5], time: "19:15 - 20:45", room: "Phòng 202" },
    { code: "CLS-KET-02", name: "KET Mastery 02 (A2-B1)", courseId: "crs-4", courseName: "KET Mastery (Cambridge A2 Key)", fee: 2100000, days: [3, 6], time: "19:15 - 20:45", room: "Phòng 203" },
    { code: "CLS-KET-03", name: "KET Mastery 03 (A2-B1)", courseId: "crs-4", courseName: "KET Mastery (Cambridge A2 Key)", fee: 2100000, days: [4, 7], time: "19:15 - 20:45", room: "Phòng 204" },
    { code: "CLS-KET-04", name: "KET Mastery 04 (Weekend)", courseId: "crs-4", courseName: "KET Mastery (Cambridge A2 Key)", fee: 2100000, days: [7, 8], time: "14:00 - 15:30", room: "Phòng 101" },
    { code: "CLS-KET-05", name: "KET Mastery 05 (Weekend)", courseId: "crs-4", courseName: "KET Mastery (Cambridge A2 Key)", fee: 2100000, days: [7, 8], time: "15:45 - 17:15", room: "Phòng 102" },
    { code: "CLS-KET-06", name: "KET Mastery 06 (A2-B1)", courseId: "crs-4", courseName: "KET Mastery (Cambridge A2 Key)", fee: 2100000, days: [2, 6], time: "17:30 - 19:00", room: "Phòng 103" },

    // PET (6 lớp)
    { code: "CLS-PET-01", name: "PET Intensive 01 (B1)", courseId: "crs-5", courseName: "PET Intensive (Cambridge B1 Preliminary)", fee: 2400000, days: [2, 4], time: "18:00 - 19:30", room: "Phòng 104" },
    { code: "CLS-PET-02", name: "PET Intensive 02 (B1)", courseId: "crs-5", courseName: "PET Intensive (Cambridge B1 Preliminary)", fee: 2400000, days: [3, 5], time: "18:00 - 19:30", room: "Phòng 201" },
    { code: "CLS-PET-03", name: "PET Intensive 03 (B1)", courseId: "crs-5", courseName: "PET Intensive (Cambridge B1 Preliminary)", fee: 2400000, days: [4, 6], time: "19:15 - 20:45", room: "Phòng 202" },
    { code: "CLS-PET-04", name: "PET Intensive 04 (Weekend)", courseId: "crs-5", courseName: "PET Intensive (Cambridge B1 Preliminary)", fee: 2400000, days: [7, 8], time: "08:30 - 10:00", room: "Phòng 203" },
    { code: "CLS-PET-05", name: "PET Intensive 05 (Weekend)", courseId: "crs-5", courseName: "PET Intensive (Cambridge B1 Preliminary)", fee: 2400000, days: [7, 8], time: "10:15 - 11:45", room: "Phòng 204" },
    { code: "CLS-PET-06", name: "PET Intensive 06 (B1)", courseId: "crs-5", courseName: "PET Intensive (Cambridge B1 Preliminary)", fee: 2400000, days: [3, 7], time: "19:15 - 20:45", room: "Phòng 101" },

    // IELTS (6 lớp)
    { code: "CLS-IELTS-01", name: "IELTS Foundation 01 (5.5+)", courseId: "crs-6", courseName: "IELTS Foundation (Band 5.0 - 6.5)", fee: 2800000, days: [2, 5], time: "18:00 - 19:30", room: "Phòng 203" },
    { code: "CLS-IELTS-02", name: "IELTS Advanced 02 (6.5+)", courseId: "crs-6", courseName: "IELTS Foundation (Band 5.0 - 6.5)", fee: 3200000, days: [3, 6], time: "18:00 - 19:30", room: "Phòng 204" },
    { code: "CLS-IELTS-03", name: "IELTS Speaking & Writing 03", courseId: "crs-6", courseName: "IELTS Foundation (Band 5.0 - 6.5)", fee: 3000000, days: [4, 7], time: "17:30 - 19:00", room: "Phòng 102" },
    { code: "CLS-IELTS-04", name: "IELTS Intensive 04 (Weekend)", courseId: "crs-6", courseName: "IELTS Foundation (Band 5.0 - 6.5)", fee: 3200000, days: [7, 8], time: "14:00 - 15:30", room: "Phòng 103" },
    { code: "CLS-IELTS-05", name: "IELTS Master 05 (Weekend)", courseId: "crs-6", courseName: "IELTS Foundation (Band 5.0 - 6.5)", fee: 3500000, days: [7, 8], time: "15:45 - 17:15", room: "Phòng 201" },
    { code: "CLS-IELTS-06", name: "IELTS Target 7.0+ 06", courseId: "crs-6", courseName: "IELTS Foundation (Band 5.0 - 6.5)", fee: 3500000, days: [2, 4], time: "19:30 - 21:00", room: "Phòng 202" },

    // Phonics (4 lớp)
    { code: "CLS-PHON-01", name: "Shiny Phonics 01", courseId: "crs-1", courseName: "Shiny Starters (Cambridge Pre-A1)", fee: 1500000, days: [2, 5], time: "17:00 - 18:30", room: "Phòng 101" },
    { code: "CLS-PHON-02", name: "Shiny Phonics 02", courseId: "crs-1", courseName: "Shiny Starters (Cambridge Pre-A1)", fee: 1500000, days: [3, 6], time: "17:00 - 18:30", room: "Phòng 102" },
    { code: "CLS-PHON-03", name: "Shiny Phonics 03 (Weekend)", courseId: "crs-1", courseName: "Shiny Starters (Cambridge Pre-A1)", fee: 1500000, days: [7, 8], time: "09:00 - 10:30", room: "Phòng 104" },
    { code: "CLS-PHON-04", name: "Shiny Phonics 04 (Weekend)", courseId: "crs-1", courseName: "Shiny Starters (Cambridge Pre-A1)", fee: 1500000, days: [7, 8], time: "16:00 - 17:30", room: "Phòng 103" }
  ];

  const colors = [
    "bg-amber-500", "bg-emerald-600", "bg-blue-600", "bg-purple-600",
    "bg-rose-600", "bg-indigo-600", "bg-teal-600", "bg-cyan-600"
  ];

  const dayLabels: Record<number, string> = {
    2: "Thứ 2", 3: "Thứ 3", 4: "Thứ 4", 5: "Thứ 5", 6: "Thứ 6", 7: "Thứ 7", 8: "Chủ nhật"
  };

  return classDefinitions.map((cd, idx) => {
    const assignedTeacher = teachers[idx % teachers.length];
    const assignedAssistant = assistants[idx % assistants.length];
    const [start, end] = cd.time.split(" - ");

    const schedules: ScheduleSlot[] = cd.days.map((dayNum, sIdx) => ({
      id: `slot-${cd.code.toLowerCase()}-${sIdx + 1}`,
      dayOfWeek: dayNum,
      dayLabel: dayLabels[dayNum] || `Thứ ${dayNum}`,
      startTime: start.trim(),
      endTime: end.trim(),
      teacherId: assignedTeacher.id,
      teacherName: assignedTeacher.fullName,
      assistantId: assignedAssistant.id,
      assistantName: assignedAssistant.fullName,
      classroom: cd.room,
    }));

    return {
      id: `cls-${idx + 1}`,
      code: cd.code,
      name: cd.name,
      courseId: cd.courseId,
      courseName: cd.courseName,
      classroom: cd.room,
      teacherId: assignedTeacher.id,
      teacherName: assignedTeacher.fullName,
      assistantId: assignedAssistant.id,
      assistantName: assignedAssistant.fullName,
      schedules,
      currentStudents: 25, // 40 lớp x 25 = 1,000 học sinh
      monthlyFee: cd.fee,
      feePerLesson: Math.round(cd.fee / 8),
      colorTheme: colors[idx % colors.length],
      zaloGroupUrl: `https://zalo.me/g/${cd.code.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
    };
  });
}

// 3. SINH 1,000 HỌC SINH ĐỒNG BỘ
export function generateSeedStudents(classes: ClassItem[]): StudentItem[] {
  const students: StudentItem[] = [];

  // Tạo chính xác 1000 học sinh (25 bé mỗi lớp x 40 lớp = 1000)
  for (let i = 1; i <= 1000; i++) {
    const isMale = i % 2 !== 0;
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const firstName = isMale 
      ? FIRST_NAMES_MALE[i % FIRST_NAMES_MALE.length] 
      : FIRST_NAMES_FEMALE[i % FIRST_NAMES_FEMALE.length];
    const fullName = `Bé ${lastName} ${firstName}`;
    const studentCode = `MS${padZero(i, 4)}`;

    // Phân bổ đều vào 40 lớp
    const targetClass = classes[(i - 1) % classes.length];
    const classId = targetClass.id;
    const className = targetClass.name;
    const monthlyFee = targetClass.monthlyFee;

    // Phụ huynh
    const isParentMale = (i % 3 === 0);
    const parentTitle = isParentMale ? pickOne(PARENT_TITLES_MALE) : pickOne(PARENT_TITLES_FEMALE);
    const parentLastName = LAST_NAMES[(i + 3) % LAST_NAMES.length];
    const parentFirstName = isParentMale 
      ? FIRST_NAMES_MALE[(i + 2) % FIRST_NAMES_MALE.length] 
      : FIRST_NAMES_FEMALE[(i + 2) % FIRST_NAMES_FEMALE.length];
    const parentName = `${parentTitle} ${parentLastName} ${parentFirstName}`;

    // SĐT phụ huynh duy nhất 10 số
    const phoneMid = padZero(100 + (i % 899), 3);
    const phoneEnd = padZero(200 + (i % 799), 3);
    const parentPhone = `09${String(10 + (i % 88)).padStart(2, "0")} ${phoneMid} ${phoneEnd}`;
    const parentEmail = `phuhuynh.ms${padZero(i, 4)}@gmail.com`;

    // Năm sinh từ 2014 đến 2021 (5 - 12 tuổi)
    const birthYear = 2014 + (i % 8);
    const birthMonth = String((i % 12) + 1).padStart(2, "0");
    const birthDay = String((i % 28) + 1).padStart(2, "0");
    const dob = `${birthYear}-${birthMonth}-${birthDay}`;

    // Trạng thái học phí: 75% PAID, 15% UNPAID, 10% OVERDUE
    const statusRand = i % 10;
    let tuitionStatus: "PAID" | "UNPAID" | "OVERDUE" = "PAID";
    let lastPaidMonth: string | undefined = "Tháng 11/2026";
    if (statusRand === 8) {
      tuitionStatus = "UNPAID";
      lastPaidMonth = "Tháng 10/2026";
    } else if (statusRand === 9) {
      tuitionStatus = "OVERDUE";
      lastPaidMonth = "Tháng 09/2026";
    }

    students.push({
      id: `stu-${i}`,
      studentCode,
      fullName,
      dob,
      gender: isMale ? "Nam" : "Nữ",
      parentName,
      parentPhone,
      parentEmail,
      classId,
      className,
      monthlyFee,
      tuitionStatus,
      currentBillingMonth: "Tháng 11/2026",
      lastPaidMonth,
      tuitionDueDate: "10/11/2026",
    });
  }

  return students;
}

// 4. SINH TÀI KHOẢN NGƯỜI DÙNG CHO ADMIN + 100 NHÂN SỰ + 1,000 PHỤ HUYNH
export function generateSeedUserAccounts(
  staff: StaffItem[], 
  students: StudentItem[]
): UserAccount[] {
  const accounts: UserAccount[] = [];

  // Tài khoản Admin
  accounts.push({
    id: "user-admin-1",
    phone: ADMIN_DEFAULT_PHONE, // "0964645174"
    password: ADMIN_DEFAULT_PASSWORD, // "123"
    role: "ADMIN",
    name: "Ms. Dung (Chủ trung tâm)",
    isLoginAllowed: true,
    createdAt: "2026-11-01T08:00:00.000Z",
    lastLoginAt: new Date().toISOString(),
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=DungShiny",
  });

  // 100 Tài khoản Nhân sự (GV & TA)
  staff.forEach((stf, idx) => {
    // 90 nhân sự được cấp quyền, 10 nhân sự chưa cấp quyền để kiểm thử phân quyền
    const isAllowed = idx < 90;
    accounts.push({
      id: `user-staff-${stf.id}`,
      phone: stf.phone,
      password: STAFF_DEFAULT_PASSWORD, // "123456a@"
      role: stf.role,
      name: stf.fullName,
      staffId: stf.id,
      isLoginAllowed: isAllowed,
      createdAt: "2026-11-01T08:00:00.000Z",
      avatarUrl: stf.avatarUrl,
    });
  });

  // 1,000 Tài khoản Phụ huynh (Đăng nhập không cần mật khẩu)
  students.forEach((stu, idx) => {
    // 98% phụ huynh được cấp quyền mở Cổng Phụ Huynh
    const isAllowed = idx % 50 !== 0;
    accounts.push({
      id: `user-parent-${stu.id}`,
      phone: stu.parentPhone,
      password: "", // Không cần mật khẩu
      role: "PARENT",
      name: `${stu.parentName} (${stu.fullName})`,
      studentId: stu.id,
      isLoginAllowed: isAllowed,
      createdAt: "2026-11-01T08:00:00.000Z",
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Parent${idx + 1}`,
    });
  });

  return accounts;
}

// 5. SINH HÓA ĐƠN HỌC PHÍ THÁNG 11 CHO 1,000 HỌC SINH
export function generateSeedTuitionBills(students: StudentItem[]): StudentTuitionBill[] {
  return students.map((stu, idx) => {
    const lessonCount = 8;
    const feePerLesson = Math.round(stu.monthlyFee / lessonCount);
    const calculatedAmount = lessonCount * feePerLesson;
    
    // Khoản phụ thu / giảm trừ ngẫu nhiên nhẹ nhàng
    const hasSurcharge = (idx % 7 === 0);
    const hasDiscount = (idx % 9 === 0);
    const surcharge = hasSurcharge ? 150000 : 0;
    const surchargeNote = hasSurcharge ? "Giáo trình Cambridge Starters trọn bộ" : undefined;
    const discount = hasDiscount ? 200000 : 0;
    const discountNote = hasDiscount ? "Học bổng chuyên cần & Ưu đãi 2 con" : undefined;
    const finalAmount = calculatedAmount + surcharge - discount;

    let status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" = "PAID";
    let paidAt: string | undefined = "2026-11-04T10:15:00.000Z";
    let paymentMethod: "VIETQR" | "CASH" | undefined = (idx % 2 === 0 ? "VIETQR" : "CASH");
    let receiptNumber: string | undefined = `PT-202611-${padZero(idx + 1, 4)}`;

    if (stu.tuitionStatus === "UNPAID") {
      status = "SENT";
      paidAt = undefined;
      paymentMethod = undefined;
      receiptNumber = undefined;
    } else if (stu.tuitionStatus === "OVERDUE") {
      status = "OVERDUE";
      paidAt = undefined;
      paymentMethod = undefined;
      receiptNumber = undefined;
    }

    return {
      id: `bill-202611-${stu.id}`,
      studentId: stu.id,
      studentName: stu.fullName,
      studentCode: stu.studentCode,
      parentName: stu.parentName,
      parentPhone: stu.parentPhone,
      classId: stu.classId || "cls-1",
      className: stu.className || "Shiny Starters 01",
      billingMonth: "Tháng 11/2026",
      lessonCount,
      feePerLesson,
      calculatedAmount,
      adjustmentAmount: surcharge - discount,
      surcharge,
      surchargeNote,
      discount,
      discountNote,
      finalAmount,
      status,
      dueDate: "10/11/2026",
      paymentMethod,
      paidAt,
      receiptNumber,
      zaloSentAt: status === "PAID" || status === "SENT" || status === "OVERDUE" ? "2026-11-01T09:00:00.000Z" : undefined,
      reminderCount: status === "OVERDUE" ? 2 : (status === "SENT" ? 1 : 0),
      reminderSentCount: status === "OVERDUE" ? 2 : (status === "SENT" ? 1 : 0),
    };
  });
}
