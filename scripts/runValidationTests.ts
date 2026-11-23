import { runSystemValidationTests } from "../src/utils/validationHelper";

console.log("===============================================================================");
console.log("🚀 CHẠY KIỂM THỬ TỰ ĐỘNG: HỆ THỐNG THẨM ĐỊNH LOGIC (VALIDATION SUITE)");
console.log("   Trung tâm Ms. Dung Shiny - Quản lý lớp bù, thời gian & chỉ dẫn kênh");
console.log("===============================================================================\n");

const report = runSystemValidationTests();

console.log(`⏱️ Thời gian kiểm thử: ${report.timestamp}`);
console.log(`📊 Tổng số ca kiểm tra: ${report.totalTests}`);
console.log(`✅ Số ca đạt (PASSED): ${report.passedTests}`);
console.log(`❌ Số ca thất bại (FAILED): ${report.failedTests}\n`);

console.log("-------------------------------------------------------------------------------");
console.log("CHI TIẾT TỪNG CA KIỂM TRA:");
console.log("-------------------------------------------------------------------------------");

report.results.forEach((r, idx) => {
  const icon = r.passed ? "✅ [PASS]" : "❌ [FAIL]";
  console.log(`${idx + 1}. ${icon} [${r.id}]`);
  console.log(`   Nội dung : ${r.name}`);
  console.log(`   Kỳ vọng  : ${r.expected}`);
  console.log(`   Thực tế  : ${r.actual}`);
  if (r.error) {
    console.log(`   Lỗi      : ${r.error}`);
  }
  console.log("");
});

if (report.failedTests === 0) {
  console.log("🎉 KẾT QUẢ: 100% KIỂM THỬ THÀNH CÔNG! HỆ THỐNG ĐẠT CHUẨN!");
  process.exit(0);
} else {
  console.error("💥 KẾT QUẢ: CÓ CA KIỂM THỬ THẤT BẠI!");
  process.exit(1);
}
