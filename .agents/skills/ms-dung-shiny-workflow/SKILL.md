---
name: ms-dung-shiny-workflow
description: Quy chuẩn nghiệp vụ và các luồng chức năng (workflows) của Hệ thống Quản lý Trung tâm Tiếng Anh Ms. Dung Shiny.
---

# Kỹ Năng & Quy Trình Nghiệp Vụ Trung Tâm Ms. Dung Shiny

Kỹ năng này hướng dẫn các agent và nhà phát triển xây dựng chuẩn xác các phân hệ chức năng cho 4 vai trò người dùng trong hệ thống:

## 1. Vai trò (Roles) & Phân quyền:
- `ADMIN`: Quản trị viên trung tâm, toàn quyền cấu hình, tài chính, nhân sự, học viên, báo cáo.
- `TEACHER`: Giáo viên giảng dạy, quản lý giáo án, nhận xét đánh giá, giao & chấm bài chuyên sâu.
- `ASSISTANT`: Trợ giảng (TA), kiểm soát sĩ số, điểm danh, viết nhật ký buổi học (class log), hỗ trợ học viên, chấm bài tập cơ bản.
- `PARENT`: Phụ huynh / Học sinh, xem lịch học, nhận xét từng buổi, điểm danh, bảng điểm, bài tập về nhà và thanh toán học phí.

## 2. Các luồng công việc chính (Core Workflows):
1. **Enrollment & Placement**: Tư vấn -> Kiểm tra đầu vào -> Xếp lớp -> Kích hoạt tài khoản.
2. **Daily Class Session**: TA check-in -> Điểm danh tức thì -> Ghi nhận tình hình buổi học -> GV dạy -> Đăng nhật ký & Giao bài -> Thông báo tới Phụ huynh.
3. **Homework Cycle**: Giao bài (Text/Audio/Video/Doc) -> Học sinh nộp -> TA chấm sơ bộ -> GV nhận xét & chấm điểm -> Phụ huynh nhận kết quả.
4. **Attendance & Absence**: Điểm danh theo dõi chuyên cần (Có mặt / Vắng / Muộn) -> Bắn notification -> Phụ huynh xin nghỉ phép để báo cô giáo & trợ giảng hỗ trợ con học bù hoặc gửi tài liệu bài học. Điểm danh KHÔNG trừ buổi học vì trung tâm dạy và thu học phí theo tháng.
5. **Tuition & Billing (Thu học phí theo tháng)**: Học phí tính theo tháng cố định -> Thông báo thu học phí định kỳ đầu tháng (từ ngày 01 đến ngày 10) kèm mã VietQR -> Phụ huynh thanh toán theo tháng -> Xác nhận & cập nhật trạng thái học phí (PAID). Tuyệt đối không áp dụng mô hình đếm số buổi còn lại.
