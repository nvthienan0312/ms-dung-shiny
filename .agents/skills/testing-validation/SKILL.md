---
name: testing-validation
description: Quy chuẩn kiểm thử (Testing), kiểm tra tính hợp lệ dữ liệu (Validation Functions) và kiểm soát logic thời gian/nghiệp vụ cho Hệ thống Ms. Dung Shiny.
---

# Testing & Validation Skill - Ms. Dung Shiny Center System

## 1. Mục Đích & Phạm Vi
Skill này định nghĩa các quy chuẩn kiểm thử tự động, hàm thẩm định dữ liệu (Validation Functions), kiểm soát logic ngày tháng (Temporal Business Constraints) và phân định rõ ràng giữa các kênh truyền thông (Zalo vs Nội bộ hệ thống).

---

## 2. Quy Tắc Thẩm Định Thời Gian & Ngày Tháng (Temporal Constraints)

### 2.1. Quy tắc Lớp Học Bù (Makeup Classes):
1. **Tuyệt đối không xếp học sinh vào lớp học bù đã diễn ra:**
   - Một ca học bù được coi là **Đã diễn ra / Quá hạn** nếu:
     - `mc.status === "COMPLETED"` hoặc `mc.status === "CANCELLED"`
     - Hoặc `dateStr < todayDateStr`
     - Hoặc `dateStr === todayDateStr && endTime <= currentTimeHHmm`
   - **Hành vi bắt buộc:** Hệ thống phải CHẶN (Block) ngay từ giao diện, vô hiệu hóa nút bấm và từ chối xử lý tại context/backend nếu Admin cố tình chọn lớp bù trong quá khứ.
2. **Không tạo lớp học bù trong quá khứ:**
   - Ngày và giờ diễn ra lớp học bù mới phải $\ge$ thời điểm hiện tại.
   - Ngày diễn ra phải thuộc đúng kỳ tháng đang quản lý (`isDateInMonth(dateStr, monthStr)`).
3. **Quyền lợi học bù chỉ có giá trị trong tháng:**
   - Học sinh vắng trong tháng $N$ chỉ được xếp bù vào các ca học bù thuộc tháng $N$.
   - Khi hết tháng, các buổi chưa học bù sẽ được kết thúc và reset (`EXPIRED`).

### 2.2. Quy tắc Học Phí & Điểm Danh:
1. **Kỳ thu học phí:** Ngày 01 đến ngày 10 hàng tháng. Quá ngày 10 chuyển `OVERDUE`.
2. **Không trừ học phí khi vắng:** Học sinh vắng bảo lưu quyền học bù trong tháng, học phí tháng không đổi.

---

## 3. Quy Chuẩn Phân Biệt Kênh Thông Báo: Zalo vs Nội Bộ Hệ Thống

Để người dùng không bị nhầm lẫn giữa thông báo Zalo bên ngoài và thông báo nội bộ hệ thống, mọi tính năng gửi tin phải tuân thủ:

### 3.1. Kênh Tin Nhắn Zalo (`CHANNEL_ZALO`):
- **Bản chất:** Tin nhắn bắn trực tiếp ra ứng dụng Zalo cá nhân của phụ huynh qua Hotline trung tâm (`0964645174`) hoặc tài khoản Zalo của Giáo viên/Trợ giảng.
- **Dấu hiệu nhận diện trực quan:**
  - Badge màu xanh lá/emerald: `[ 💬 Kênh Zalo Phụ Huynh ]`
  - Nút bấm: `[ 💬 Gửi Qua Zalo ]`, `[ 💬 Gửi Zalo Toàn Lớp (Hàng Đợi 2-3p) ]`
  - Luôn hiển thị số điện thoại nhận tin Zalo: `SĐT: 09xx xxx xxx`
  - Gửi nhiều tin phải tuân thủ giãn cách 2-3 phút (kèm Anti-Spam Jitter ±5s).

### 3.2. Kênh Nội Bộ Hệ Thống (`CHANNEL_IN_APP`):
- **Bản chất:** Thông báo hiển thị bên trong web ứng dụng (Sổ liên lạc Cổng Phụ Huynh `ParentPortal`, danh sách hóa đơn, nhật ký buổi học).
- **Dấu hiệu nhận diện trực quan:**
  - Badge màu xanh dương/indigo: `[ 📲 Kênh Cổng App Nội Bộ ]`
  - Nút bấm: `[ 📲 Lưu & Phát Hành Cổng App ]`
  - Phụ huynh đăng nhập vào web để xem, không tốn tin nhắn bên ngoài.

### 3.3. Kênh Kết Hợp (`CHANNEL_HYBRID`):
- Khi một thao tác vừa gửi tin nhắn Zalo vừa cập nhật Cổng App, giao diện phải ghi rõ:
  `[ ⚡ Đa kênh: Bắn tin Zalo tới SĐT phụ huynh + Đồng bộ Sổ liên lạc Cổng App ]`

---

## 4. Danh Mục Hàm Validation Chuẩn (`src/utils/validationHelper.ts`)
- `isPastDateTime(dateStr, timeStr)`: Thẩm định xem thời điểm đã qua chưa.
- `isMakeupClassPast(mc)`: Kiểm tra lớp học bù đã kết thúc hay chưa.
- `validateMakeupClassCreation(params)`: Thẩm định toàn diện khi tạo/sửa lớp bù.
- `validateMakeupClassAssignment(targetClass, student, absentDate)`: Thẩm định điều kiện trước khi xếp học sinh vào lớp bù.
- `validatePhoneNumber(phone)`: Kiểm tra tính hợp lệ của số điện thoại Việt Nam.
- `runSystemValidationTests()`: Bộ kiểm thử tự động (Unit Test Suite) chạy kiểm tra định kỳ.
