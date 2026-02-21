# Locket Bot Native Discord

Dự án bot Discord được tối ưu hóa kiến trúc theo hướng native, hỗ trợ các tính năng tương tác tự nhiên trong hệ sinh thái Discord. Các chức năng cốt lõi bao gồm tính năng chia sẻ ảnh thông qua kênh lưu trữ (dump channel), chia sẻ tâm trạng tích hợp nền tảng Giphy và cơ chế phân trang dữ liệu. Hệ thống áp dụng cấu trúc monorepo phân tách chức năng rõ ràng để sẵn sàng mở rộng và triển khai cho môi trường production.

## 1. Yêu cầu hệ thống

- Môi trường thực thi: Node.js (Phiên bản v20.0.0 hoặc cao hơn).
- Trình quản lý gói: pnpm (Phiên bản 10.x hoặc tương đương).
- Cơ sở dữ liệu: Hệ quản trị cơ sở dữ liệu quan hệ tương thích với Prisma (PostgreSQL / MySQL).
- Thông tin xác thực: Tài khoản Discord Developer Portal với quyền hạn khởi tạo Bot và cấp quyền Message Content Intent.

## 2. Hướng dẫn thiết lập biến môi trường

Chỉnh sửa tệp tin [.env](cci:7://file:///c:/Code/bot-discord/.env:0:0-0:0) tại thư mục gốc với các thông số bắt buộc sau đây. Tuyệt đối không chia sẻ hoặc tải tệp tin này lên các hệ thống quản lý phiên bản công khai.

| Biến môi trường   | Mô tả chức năng                                                                    |
| ----------------- | ---------------------------------------------------------------------------------- |
| `DISCORD_TOKEN`   | Token xác thực chính thức để đăng nhập bot vào nền tảng Discord.                   |
| `CLIENT_ID`       | Mã định danh duy nhất của ứng dụng Bot trên Discord Developer Portal.              |
| `DATABASE_URL`    | Chuỗi cấu hình kết nối ứng dụng với hệ thống cơ sở dữ liệu.                        |
| `DUMP_CHANNEL_ID` | Nhận dạng kênh Discord dùng làm phân vùng lưu trữ trung gian cho hình ảnh tải lên. |
| `GIPHY_API_KEY`   | Mã khóa được cấp quyền bởi Giphy nhằm truy xuất dữ liệu ảnh động trực tiếp.        |

## 3. Cấu trúc thư mục hệ thống

Hệ thống được thiết kế theo dạng monorepo để quản lý tập trung:

- `apps/bot/`: Cấu trúc logic điều lệnh (commands), lắng nghe sự kiện (events), và thiết lập vòng đời Discord bot.
- `packages/database/`: Xác định schema của Prisma ORM và các mã nguồn thao tác với cơ sở dữ liệu.
- `packages/shared/`: Khu vực chứa các hàm xử lý dữ liệu chung và định nghĩa kiểu dữ liệu tĩnh.
- `packages/storage/`: Khu vực quy định giao thức kết nối kho lưu trữ ngoài hoặc bộ nhớ Redis.

## 4. Hướng dẫn vận hành

### A. Môi trường phát triển (Development)

Sử dụng lệnh sau để chạy bot cục bộ:
`pnpm dev` hoặc `pnpm --filter @repo/bot dev`

### B. Biến dịch mã nguồn và đồng bộ cấu hình lệnh

Trước khi khởi động tiến trình chính hoặc sau khi thiết lập tính năng slash commands mới, bắt buộc thi hành tuần tự các chuỗi lệnh:

1. Đăng ký thông tin các lệnh lên Discord:
   `pnpm --filter @repo/bot deploy-commands`
2. Biên dịch mã nguồn hệ thống sang Javascript chuẩn:
   `pnpm build`
3. Đồng bộ mô hình dữ liệu Prisma vào database:
   `pnpm --filter @repo/database push`

### C. Môi trường sản phẩn (Production)

Để khởi động tiến trình thực thi cuối cùng của bot tại môi trường triển khai thực tế:
`pnpm --filter @repo/bot start`
