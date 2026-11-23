import { prisma } from "../src/lib/prisma";
import { 
  INITIAL_COURSES, 
  INITIAL_CLASSROOMS,
  INITIAL_ZALO_ACCOUNTS,
  INITIAL_ZALO_OA_CONFIG,
  INITIAL_ZALO_SESSIONS,
  DEFAULT_ZALO_MASTER_TEMPLATES,
  INITIAL_USER_ACCOUNTS
} from "../src/data/centerData";

const STORE_KEY = "main_center_data";

async function main() {
  console.log("Connecting to Supabase PostgreSQL database to reset main_center_data...");

  const cleanPayload = {
    classes: [],
    courses: INITIAL_COURSES,
    staff: [],
    students: [],
    classrooms: INITIAL_CLASSROOMS,
    substitutions: [],
    attendance: [],
    classLogs: [],
    workbookChecks: [],
    incidentNotes: [],
    monthlyExamReports: [],
    staffTimesheets: [],
    homeworkSubmissions: [],
    leaveRequests: [],
    tuitionPayments: [],
    studentTuitionBills: [],
    assignments: [],
    makeupClasses: [],
    expiredMakeupRecords: [],
    zaloAccounts: INITIAL_ZALO_ACCOUNTS,
    zaloMessageLogs: [],
    zaloOAConfig: INITIAL_ZALO_OA_CONFIG,
    userAccounts: INITIAL_USER_ACCOUNTS,
    zaloTemplates: DEFAULT_ZALO_MASTER_TEMPLATES,
    zaloSessions: INITIAL_ZALO_SESSIONS,
  };

  const result = await prisma.centerDataStore.upsert({
    where: { key: STORE_KEY },
    create: {
      key: STORE_KEY,
      data: cleanPayload as any,
    },
    update: {
      data: cleanPayload as any,
    },
  });

  console.log("Successfully reset cloud database record!");
  console.log("Key:", result.key);
  console.log("Updated At:", result.updatedAt);
  console.log("Preserved Admin Account:", INITIAL_USER_ACCOUNTS);
}

main()
  .catch((err) => {
    console.error("Failed to reset cloud database:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
