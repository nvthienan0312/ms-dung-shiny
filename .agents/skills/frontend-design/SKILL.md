---
name: frontend-design
description: Quy chuẩn thiết kế giao diện Front-end hiện đại, tối ưu UX/UI, Next.js App Router, Tailwind CSS, Component Modular và Mobile Responsive.
---

# Front-End Web Architecture & UI/UX Standards

Quy chuẩn thiết kế giao diện cho hệ thống website / web app:

## 1. Nguyên Tắc Thiết Kế Giao Diện (Design Principles)
- **Hierarchy & Phân cấp thị giác:** Tiêu đề, thẻ thông tin, badge trạng thái có độ tương phản và phân cấp rõ ràng.
- **Color Palette & Feedback:** Sử dụng bảng màu semantic nhất quán (Primary: Blue/Indigo; Success: Emerald; Warning: Amber; Danger: Rose; Neutral: Slate).
- **Responsive-First:** Mọi component và bảng biểu phải hỗ trợ tốt từ màn hình di động (360px+) đến màn hình lớn (1440px+).
- **Micro-interactions & Polish:** Hiệu ứng hover, active state, skeleton loading, transition mượt mà không gây giật lag.

## 2. Tiêu Chuẩn Component (Next.js & Tailwind CSS)
- Tái sử dụng components dùng chung (Buttons, Modals, Badges, Toast, Dropdown) trong `src/components/common/`.
- Không lặp code style inline: tận dụng utility classes và `clsx`/`tailwind-merge`.
- Tránh re-render không cần thiết: sử dụng `useMemo`, `useCallback` cho các danh sách và phép tính lớn.
