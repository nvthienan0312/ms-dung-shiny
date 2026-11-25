# Ms. Dung Shiny - English Center Management System

## Project Context
Hệ thống quản lý trung tâm tiếng Anh **Ms. Dung Shiny** (Next.js 14, TypeScript, Tailwind CSS, LocalStorage v12 & Prisma schema).

### Target Roles:
1. `ADMIN` (Chủ trung tâm / Quản trị viên) - Toàn quyền quản trị, tài chính, bảng công & lương (PayrollManager), trình quản lý học phí học sinh độc quyền (TuitionManager - tự động tính theo số buổi trong tháng x đơn giá 1 buổi, quản lý theo từng lớp, cài cảnh báo ngày 01 đầu tháng, hạn đóng ngày 10, quyền sửa học phí, nút tự động tính lại theo lịch, bấm gửi thông báo học phí, tracking đóng học phí, thu tiền VietQR/Tiền mặt, in biên lai phiếu thu), nhân sự, học viên, lớp học, phân công dạy thay độc quyền.
2. `TEACHER` (Giáo viên) - Xem lịch dạy, viết nhật ký buổi học (gộp 1 ô nội dung), giao BTVN MS Teams linh hoạt (Chỉ Quay video, Chỉ Workbook/Worksheet hoặc CẢ HAI: Quay video + Workbook; chọn tệp đính kèm trực tiếp từ máy tính), theo dõi tình hình nộp BTVN (theo dõi HS chưa nộp + gửi nhắc nhở), báo cáo bài thi tháng + PDF, ghi lưu ý riêng từng HS, nhận & xác nhận bảng lương cá nhân. Kể cả có giáo viên dạy thay, giáo viên chính vẫn chịu trách nhiệm theo dõi BTVN lớp mình phụ trách.
3. `ASSISTANT` (Trợ giảng - TA) - Điểm danh 1 chạm (chỉ Có mặt / Vắng, ẩn học phí, không chọn giờ), kiểm tra BTVN sách Workbook tại lớp (báo PH nếu chưa làm/quên sách), trực tiếp chấm BTVN online (chấm điểm & sửa âm, hỗ trợ chấm bài kép cả Video & Sách, theo dõi HS chưa nộp), ghi lưu ý riêng từng HS, nhận & xác nhận bảng lương cá nhân. Trợ giảng không có tab nhật ký buổi học. Kể cả có trợ giảng trực thay, trợ giảng chính vẫn chịu trách nhiệm chấm BTVN lớp mình phụ trách.
4. `PARENT` (Phụ huynh / Học sinh) - Sổ liên lạc (Hôm nay), thời khóa biểu 7 ngày có giờ học cố định, nộp BTVN chuẩn MS Teams (chống nộp nhầm buổi; hỗ trợ nộp bài kép cả Video & Sách nếu buổi học yêu cầu), xem điểm thi tháng kèm PDF, đóng học phí cố định theo tháng (VietQR) với chi tiết số buổi và đơn giá minh bạch, xin nghỉ phép.

### Core Principles & Business Mindset (BẮT BUỘC TUÂN THỦ):
- **Tư duy học phí theo tháng & Trình Quản Lý Học Phí (TuitionManager)**:
  - **CHỈ ADMIN ĐƯỢC QUẢN LÝ**: Giáo viên và trợ giảng không có quyền can thiệp học phí.
  - **Công thức chuẩn**: $\text{Học phí của học sinh} = \text{Số buổi trong tháng} \times \text{Học phí 1 buổi}$. Số buổi tự động tính từ thời khóa biểu tuần của lớp khớp với lịch thực tế của tháng.
  - **Nguyên tắc vàng**: **Học sinh nghỉ học phí KHÔNG ĐƯỢC TRỪ**. Trung tâm bảo lưu bài giảng, gửi tài liệu ôn tập và sắp xếp học bù cho con.
  - **Kỳ thu học phí**: Định kỳ đầu tháng (từ ngày 01 đến ngày 10 hàng tháng).
  - **Ngày 01 hàng tháng**: Tự động tính học phí và cài cảnh báo đóng học phí (Hạn nộp ngày 10 hàng tháng; quá ngày 10 tự động chuyển sang trạng thái Quá Hạn `OVERDUE`).
  - **Quản lý theo từng lớp**: Theo dõi sĩ số, số tiền cần thu, số học sinh đã nộp và tỷ lệ hoàn thành theo từng lớp hoặc toàn trung tâm.
  - **Quyền sửa của Admin**: Admin có quyền điều chỉnh số buổi, đơn giá, **tách riêng Khoản Phụ thu (+) và Giảm trừ (-)** (số tiền $\ge 0$ kèm lý do minh bạch, không cần gõ dấu âm), có nút **Tự động tính lại chuẩn theo lịch** nếu sửa sai. Công thức: $\text{Học phí} = (\text{Số buổi} \times \text{Đơn giá}) + \text{Phụ thu} - \text{Giảm trừ}$.
  - **Quy trình gửi thông báo**: `DRAFT` (Admin kiểm tra) $\rightarrow$ Admin bấm "Gửi thông báo học phí" (từng học sinh hoặc toàn lớp) $\rightarrow$ `SENT` (Phụ huynh nhận trên ParentPortal kèm mã VietQR) $\rightarrow$ `PAID` (Thu tiền VietQR/Tiền mặt, cấp biên lai phiếu thu in được).
  - **Gửi nhắc nhở hàng loạt cho PH chưa đóng**: Nút "Gửi Nhắc Nhở PH Chưa Đóng" lọc toàn bộ học sinh chưa nộp trong kỳ; cung cấp 4 mẫu tin nhắn (Đầu tháng, Cận hạn, Quá hạn, Đòi nợ nhiều tháng); gửi qua App & Zalo/SMS; tăng bộ đếm nhắc nhở.
  - **Giải pháp xử lý nợ học phí nhiều tháng**: Tự động tính tổng nợ lũy kế ($\sum$ học phí các tháng nợ); gắn badge cảnh báo nợ (2 tháng màu cam, $\ge 3$ tháng màu đỏ); cung cấp tính năng **Thu gộp tất cả các tháng nợ** (1 chạm thanh toán dứt điểm toàn bộ các kỳ nợ); Cổng Phụ Huynh có mã VietQR gộp tổng nợ; phiếu thu tổng hợp; lộ trình đôn đốc 3 cấp độ.
- **Không dùng hệ thống sao thưởng**: Hệ thống sao thưởng (1-5 sao ⭐) đã được gỡ bỏ hoàn toàn.
- **Điểm danh tinh giản**: Chỉ có 2 trạng thái: **Có mặt (PRESENT)** hoặc **Vắng (ABSENT)**. Không có đi muộn (LATE), không chọn lọc ca theo giờ.
- **Phân công dạy thay**: **CHỈ ADMIN** mới có quyền phân công giáo viên hoặc trợ giảng dạy thay; GV và TA chỉ xem (Read-only).
- **Phân định trách nhiệm khi dạy thay**:
  - Buổi học hôm đó (nhật ký, giao bài tập của buổi dạy thay, lưu ý buổi học) do GV/TA dạy thay phụ trách.
  - Chấm BTVN và theo dõi nộp bài: Do **Giáo viên và Trợ giảng chính** của lớp phụ trách xuyên suốt toàn bộ khóa học.
- **Giao BTVN phong cách MS Teams & Giải pháp BTVN Kép**:
  - Hỗ trợ 3 lựa chọn hình thức nộp:
    1. `VIDEO`: Chỉ quay video.
    2. `WORKBOOK`: Chỉ làm bài tập Workbook / Worksheet / Vở viết.
    3. `BOTH`: Giao cả Quay video + Workbook/Worksheet (Phụ huynh nộp cả 2 tệp, Trợ giảng chấm cả 2 phần).
  - Đính kèm tệp bài tập: Cho phép chọn duyệt tệp trực tiếp từ máy tính (PDF, Word, Ảnh, Zip...).
- **Phân định BTVN**: Trợ giảng trực tiếp chấm bài online; Giáo viên theo dõi tiến độ và học sinh chưa nộp; BTVN sách Workbook do Trợ giảng kiểm tra tại lớp.
- **Quy trình Bảng công & Lương 4 bước chuẩn**:
  1. `DRAFT`: Admin kiểm tra và có quyền chỉnh sửa giờ công, đơn giá, phụ cấp đi lại, phụ cấp công việc, khoản khác (+/-), ghi chú. Có nút **Tự động tính lại giờ dạy** chuẩn từ ca dạy nếu sửa sai.
  2. `SENT_TO_STAFF`: Admin bấm "Gửi bảng lương" (từng người hoặc tất cả nhân sự).
  3. `CONFIRMED`: Giáo viên & Trợ giảng nhận bảng lương trên hệ thống, đối soát và bấm "Xác Nhận Bảng Lương Đúng (Confirm)" kèm ghi chú phản hồi.
  4. `PAID`: Admin kiểm tra trạng thái xác nhận và bấm "Chi Lương".
- **Lưu ý riêng từng buổi (Incident Notes)**: GV & TA chỉ gửi riêng cho học sinh có phát sinh (nghịch, quên đồ dùng, buồn ngủ...).
- **Quy chuẩn Lớp Học Bù & Quyền Lợi Học Bù (Make-up Classes)**:
  - **Chỉ diễn ra trong tháng & Reset vào tháng tiếp theo**: Lớp học bù được trung tâm tổ chức cho học sinh vắng trong tháng. Khi kết thúc tháng, nếu học sinh không học bù coi như **mất quyền lợi** $\rightarrow$ reset số buổi học bù về 0 cho tháng mới.
  - **Đếm số buổi vắng cập nhật theo từng ngày (Không cần biết lý do vắng)**: Hệ thống tự động đếm tổng số buổi vắng của từng học sinh trong tháng theo dữ liệu điểm danh realtime, liệt kê các ngày vắng để tính quyền lợi học bù mà không cần lý do.
  - **Admin quản lý ở 1 tab riêng (MakeupClassesManager)**: Admin tạo lớp học bù (tiêu đề, chọn lớp mục tiêu cụ thể hoặc Ghép liên lớp `ALL`, ngày trong tháng, giờ, thời lượng, phòng học, GV/TA phụ trách, trọng tâm ôn tập) và add học sinh đăng ký vào sau khi trao đổi với phụ huynh.
  - **Liên kết chặt chẽ với Thời Khóa Biểu (TKB)**: Lớp học bù hiển thị đồng bộ trên cả TKB tuần & TKB tháng với badge màu tím/indigo đặc trưng `[⚡ LỚP BÙ]`, phòng tránh xung đột phòng học và lịch dạy của giáo viên/trợ giảng. Click vào ca bù mở popup xem danh sách học sinh và thông tin ca học.
  - **Tính năng gửi tin nhắn tự động khảo sát lịch rảnh**: Nút "Khảo Sát Lịch Rảnh PH" cho phép Admin tự soạn tin nhắn mẫu tùy biến linh hoạt (hỗ trợ biến `{studentName}`, `{className}`, `{month}`, `{absentCount}`, `{absentDates}`) và gửi hàng loạt cho toàn bộ phụ huynh có con vắng hoặc gửi riêng lẻ.
  - **Phân định quyền điểm danh & báo cáo buổi bù**: **Trợ giảng trực tiếp điểm danh 1-chạm** (Có mặt / Vắng) và **soạn & gửi nội dung bài học bù** (`lessonContent`, `homework`, `assistantFeedback`) cho phụ huynh ngay tại bàn làm việc điểm danh. **Admin đóng vai trò kiểm soát & giám sát** tiến độ, danh sách học sinh và nội dung báo cáo.
  - **Lớp học bù hiển thị tại mục Điểm danh 1 chạm**: Ca học bù được tích hợp trực tiếp vào hàng chờ ca học trong ngày của Trợ giảng (`AttendanceManager`), cho phép điểm danh 1 chạm và gửi báo cáo bài học nhanh chóng.
  - **Tự động tính lương ca dạy bù**: Lớp học bù được **tự động tính lương như các ca chính khóa và dạy thay** (Thời lượng $\times$ Đơn giá giờ dạy), tự động ghi nhận vào bảng công `StaffSalaryTimesheet` trong tháng mà **Admin không cần bấm nút thủ công**.
  - **Xếp lớp học bù linh hoạt từ danh sách đã tạo**: Admin có quyền chọn lớp học bù mục tiêu trực tiếp từ danh sách các lớp bù đã tạo trong tháng khi xếp học sinh vắng vào học bù.
  - **Điểm danh buổi học bù & Quy tắc vàng khi vắng buổi bù**: Điểm danh Có mặt (`ATTENDED`) hoặc Vắng (`ABSENT`). **Nếu học sinh vắng vào ngày học bù $\rightarrow$ TUYỆT ĐỐI KHÔNG cộng dồn vào số buổi vắng**, và **số ngày học bù trong tháng của học sinh vẫn được giữ nguyên** (vẫn còn quyền lợi để sắp xếp lại hoặc chờ chốt tháng).
  - **Phụ huynh nộp BTVN đính kèm tệp từ thiết bị**: Cổng Phụ Huynh hỗ trợ duyệt và **đính kèm tệp trực tiếp từ máy tính / điện thoại** (Video clip phát âm, ảnh chụp bài tập Workbook, file tài liệu PDF/doc), hiển thị tên tệp và dung lượng thật (`MB/KB`), đồng bộ tới không gian chấm bài của Trợ giảng.
  - **Chốt tháng & Reset**: Nút "Kết Thúc Tháng & Reset" đánh dấu `EXPIRED` cho các buổi vắng chưa học bù của tháng cũ và reset quyền lợi khi sang tháng mới.
  - **Phân công Giáo viên & Trợ giảng theo buổi**: 1 lớp học có thể diễn ra nhiều ngày trong tuần với giáo viên và trợ giảng mặc định khác nhau (ví dụ: Thứ 3 là GV A + TA B; Thứ 5 là GV C + TA C). TKB tuần/tháng, điểm danh 1 chạm, nhật ký buổi học và bảng công tự động đồng bộ chính xác theo từng ca.
  - **Hệ thống Thông Báo Đa Kênh Chuẩn Hóa**:
    - **Cổng Phụ Huynh (In-App Push & Dashboard)**: Thông báo học phí, bài học hôm nay, nhắc nộp bài tập, điểm thi tháng và khảo sát học bù được gửi trực tiếp lên Cổng Phụ Huynh theo thời gian thực.
    - **Tin Nhắn SMS / Độc lập**: Hỗ trợ xuất mẫu tin nhắn và thông báo trực tiếp tới số điện thoại phụ huynh.
    - **Sẵn sàng mở rộng (Extensible Notification Architecture)**: Đã dọn sạch cơ chế giả lập Zalo không chính thức; sẵn sàng tích hợp trực tiếp kênh Zalo chính thức (Zalo OA / Webhook) an toàn tuyệt đối.
  - **Tự Động Gửi Báo Cáo Điểm Danh Vào Nhóm Zalo Lớp**: Khi Trợ giảng lưu điểm danh, hệ thống tự động tổng hợp số lượng có mặt, tỷ lệ chuyên cần, danh sách học sinh vắng kèm lý do để gửi vào nhóm Zalo lớp học (`autoSendZaloGroup: true`). Có modal xem trước và chỉnh sửa linh hoạt.
  - **Bàn Giao Lớp Học Giữa Các Nhân Sự & Tự Động Khóa Tài Khoản Nghỉ Việc (`StaffClassTransferModal`)**: Khi nhân sự nghỉ việc/chuyển ca, Admin 1-chạm bàn giao toàn bộ lớp học và các ca trong tuần (`weeklySchedule`) sang nhân sự mới, đồng thời tự động khóa quyền đăng nhập của nhân sự cũ (`isLoginAllowed: false`).
  - **Tối Ưu Mobile-First & Ứng Dụng Web Tiến Bộ PWA**: Thiết kế chuẩn Responsive cho di động (Avatar Popover Menu, Bảng cuộn cảm ứng Touch-Friendly, Khoảng cách chạm $\ge 44\text{px}$, Safe-area Insets iOS/Android) và hỗ trợ PWA (`manifest.json`, Service Worker `sw.js`, `PWAInstaller`) cho phép cài đặt App trực tiếp lên màn hình chính.
- **Hệ Thống Đăng Nhập & Phân Quyền Bảo Mật Tuyệt Đối (Auth & Permissions)**:
  - **Tài khoản Admin**: SĐT `0964645174`, Mật khẩu mặc định `123`. **Chỉ duy nhất Admin mới có quyền đổi mật khẩu** thông qua popup `AdminChangePasswordModal`.
  - **Tài khoản Giáo viên & Trợ giảng**:
    - Khi Admin tạo nhân sự mới (`StaffItem`), hệ thống **tự động thiết lập tài khoản đăng nhập** dựa trên số điện thoại nhân sự, mật khẩu mặc định luôn là `123456a@`.
    - **Cơ chế kiểm soát nghiêm ngặt**: Nhân sự ban đầu **CHƯA ĐƯỢC PHÉP ĐĂNG NHẬP** (`isLoginAllowed: false`).
    - **Chỉ duy nhất Admin** mới có quyền **Cấp quyền** (`toggleUserAccountPermission: true`) hoặc **Hủy quyền** đăng nhập. Nếu chưa được cấp quyền hoặc bị hủy quyền, hệ thống chặn đăng nhập và hiển thị cảnh báo rõ ràng.
    - **Phân định vai trò độc quyền**: Giáo viên chỉ đăng nhập được vào mục Giáo viên; Trợ giảng chỉ đăng nhập được vào mục Trợ giảng. Nếu chọn sai vai trò khi đăng nhập sẽ bị hệ thống từ chối.
    - Admin có nút **Reset Mật Khẩu** về mặc định `123456a@` trong tab Quản lý nhân sự (`StaffManager`).
  - **Tài khoản Phụ huynh**:
    - **KHÔNG CẦN MẬT KHẨU**: Khi Admin thêm thông tin học sinh kèm SĐT phụ huynh, tài khoản phụ huynh được tự động kích hoạt để theo dõi tiến độ học tập.
    - Phụ huynh chỉ cần nhập số điện thoại của con/phụ huynh $\rightarrow$ Chọn vai trò: "Phụ Huynh" $\rightarrow$ Bấm Đăng nhập ngay lập tức.
    - Admin có toàn quyền cấp quyền hoặc tạm khóa quyền truy cập Cổng Phụ Huynh tại danh sách học viên (`StudentsManager`).
  - **Giao diện đăng nhập (`LoginView`)**:
    - Gồm: Tài khoản (SĐT), Mật khẩu (tự động ẩn/vô hiệu hóa khi chọn vai trò Phụ huynh), Option chọn vai trò (Quản trị viên, Giáo viên, Trợ giảng, Phụ huynh).
    - Hỗ trợ thanh đăng nhập mẫu 1-chạm (Quick Demo Chips) để kiểm thử đầy đủ các vai trò và kiểm thử trường hợp bị chặn khi chưa cấp quyền.
- **Chi tiết tiến độ dự án**: Tham khảo tài liệu toàn diện tại [`PROJECT_PROGRESS.md`](./PROJECT_PROGRESS.md).
