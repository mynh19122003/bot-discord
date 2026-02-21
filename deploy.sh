#!/bin/bash

# Dừng script ngay lập tức nếu có bất kỳ lệnh nào bị lỗi
set -e

echo "Bat dau tien trinh cap nhat va trien khai ma nguon..."

echo "1. Kéo mã nguồn mới nhất từ nhánh main..."
git pull origin main

echo "2. Cài đặt các thư viện phụ thuộc..."
pnpm install

echo "3. Đồng bộ cấu trúc cơ sở dữ liệu Prisma..."
pnpm --filter @repo/database push

echo "4. Biên dịch mã nguồn Typescript sang Javascript..."
pnpm build

echo "5. Đồng bộ cấu hình lệnh (Slash Commands) với Discord..."
pnpm --filter @repo/bot deploy-commands

echo "6. Khởi động lại hoặc tạo mới tiến trình PM2..."
if pm2 show locket-bot > /dev/null; then
  echo "Tien trinh locket-bot dang hoat dong. Tien hanh khoi dong lai..."
  pm2 restart locket-bot
else
  echo "Chua tim thay tien trinh. Tien hanh khoi tao moi..."
  pm2 start pnpm --name "locket-bot" --filter @repo/bot start
  pm2 save
fi

echo "Hoan tat trien khai thanh cong!"
