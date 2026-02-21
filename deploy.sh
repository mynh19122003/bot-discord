#!/bin/bash

# Dừng script ngay lập tức nếu có bất kỳ lệnh nào bị lỗi
set -e

echo "Bat dau tien trinh cap nhat va trien khai ma nguon..."

# Cài đặt lại pnpm và pm2 vào hệ thống để đảm bảo nhận diện lệnh
echo "0. Kiem tra va cai dat pnpm/pm2..."
npm install -g pnpm pm2

echo "1. Keo ma nguon moi nhat tu nhanh main..."
git pull origin main

echo "2. Cai dat cac thu vien phu thuoc..."
pnpm install

echo "3. Dong bo cau truc co so du lieu Prisma..."
pnpm --filter @repo/database push

echo "4. Bien dich ma nguon Typescript sang Javascript..."
pnpm build

echo "5. Dong bo cau hinh lenh (Slash Commands) voi Discord..."
pnpm --filter @repo/bot deploy-commands

echo "6. Khoi dong lai hoac tao moi tien trinh PM2..."
if pm2 show locket-bot > /dev/null; then
  echo "Tien trinh locket-bot dang hoat dong. Tien hanh khoi dong lai..."
  pm2 restart locket-bot
else
  echo "Chua tim thay tien trinh. Tien hanh khoi tao moi..."
  # Sử dụng npx pm2 để đảm bảo PM2 chạy đúng thư mục
  pm2 start npm --name "locket-bot" -- run dev:bot
  pm2 save
fi

echo "Hoan tat trien khai thanh cong!"
