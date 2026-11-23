---
name: backend-architecture
description: Quy chuẩn kiến trúc Back-end sạch, Next.js API Route Handlers, Prisma ORM, dịch vụ tự động hóa và cơ chế hàng đợi chống spam/rate limit.
---

# Back-End Architecture & API Design Standards

Quy chuẩn thiết kế tầng logic và dữ liệu phía Back-end:

## 1. Cấu Trúc API & Dịch Vụ (Next.js Route Handlers)
- **RESTful Endpoints:** Chuẩn hóa methods `GET`, `POST`, `PUT`, `DELETE` trong `src/app/api/...`.
- **Validation & Sanitization:** Luôn kiểm tra tính hợp lệ của tham số đầu vào trước khi xử lý logic nghiệp vụ.
- **Error Handling & Response Format:** Trả về cấu trúc JSON nhất quán: `{ success: boolean, data?: any, error?: string, message?: string }` kèm HTTP status code thích hợp (200, 400, 401, 403, 500).

## 2. Hàng Đợi Tác Vụ & Chống Spam (Queue & Rate Limiting)
- Với các tác vụ gửi thông báo, tin nhắn, email hoặc Zalo hàng loạt: **BẮT BUỘC** áp dụng cơ chế hàng đợi (queue) có khoảng cách thời gian (pacing delay) từ 2-3 phút giữa các tin nhắn để phòng ngừa bị chặn spam / rate limit bởi nhà cung cấp nền tảng.
- Hỗ trợ trạng thái: `PENDING` -> `SENDING` -> `SENT` / `FAILED` / `SKIPPED`, cho phép người dùng tạm dừng (`PAUSE`), tiếp tục (`RESUME`) và theo dõi tiến độ thời gian thực.
