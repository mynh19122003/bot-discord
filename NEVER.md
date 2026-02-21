# 🚫 NEVER DO THIS

Các quy tắc **KHÔNG BAO GIỜ** được phép vi phạm trong dự án này.

---

## 1. Icons

- ❌ **KHÔNG BAO GIỜ** sử dụng icon hệ thống (emoji, system icons)
- ✅ **LUÔN LUÔN** sử dụng [Lucide Icons](https://lucide.dev/icons/) (`lucide-react`)

```tsx
// ❌ SAI
<span>💻</span>
<span>🌙</span>

// ✅ ĐÚNG
import { MonitorIcon, MoonIcon } from "lucide-react";
<MonitorIcon />
<MoonIcon />
```

---

## 2. Git Commit

- ❌ **KHÔNG BAO GIỜ** dồn hết tất cả thay đổi vào 1 commit
- ❌ **KHÔNG BAO GIỜ** commit không theo format chuẩn
- ✅ **LUÔN LUÔN** commit theo nhóm file với 1 mục đích rõ ràng
- ✅ **LUÔN LUÔN** sử dụng Conventional Commits format

### Format:
```
type(scope): Description
```

### Types:
| Type       | Mô tả                                |
| ---------- | ------------------------------------ |
| `feat`     | Tính năng mới                        |
| `fix`      | Sửa bug                              |
| `docs`     | Thay đổi documentation               |
| `style`    | Format code, không ảnh hưởng logic   |
| `refactor` | Refactor code                        |
| `perf`     | Cải thiện performance                |
| `test`     | Thêm/sửa tests                       |
| `chore`    | Cập nhật build, config, dependencies |

### Examples:
```bash
# ❌ SAI
git commit -m "update"
git commit -m "fix bug"

# ✅ ĐÚNG
git commit -m "feat(web): Thêm dark mode toggle"
git commit -m "fix(web:api): Sửa lỗi authentication"
git commit -m "chore(deps): Update next-themes to v0.4.0"
git commit -m "docs(readme): Cập nhật hướng dẫn cài đặt"
```

---

## 3. Hover Effects

- ❌ **KHÔNG BAO GIỜ** sử dụng `hover:scale-*` zoom-in-out effects
- ❌ **KHÔNG BAO GIỜ** tạo animations quá nhiều, rối mắt
- ✅ **LUÔN LUÔN** sử dụng subtle hover effects (opacity, color, border)
- ✅ **LUÔN LUÔN** theo phong cách shadcn/ui - tối giản, sang trọng

```tsx
// ❌ SAI - Quá flashy
<div className="hover:scale-105 hover:shadow-2xl animate-pulse" />

// ✅ ĐÚNG - Subtle, elegant
<div className="hover:bg-muted transition-colors" />
<div className="hover:text-foreground text-muted-foreground transition-colors" />
```

---

## 4. UI Components

- ❌ **KHÔNG BAO GIỜ** viết custom button, card, input từ đầu
- ❌ **KHÔNG BAO GIỜ** sử dụng inline styles cho UI elements
- ✅ **LUÔN LUÔN** sử dụng components từ `@/components/ui/*` (shadcn)
- ✅ **LUÔN LUÔN** customize qua props và className, không viết mới

```tsx
// ❌ SAI - Viết custom button
<button className="bg-blue-500 px-4 py-2 rounded">Click</button>

// ✅ ĐÚNG - Sử dụng shadcn Button
import { Button } from "@/components/ui/button";
<Button variant="default" size="lg">Click</Button>
```

### Available components:
- `Button`, `Badge`, `Card`, `Separator`
- `Input`, `Textarea`, `Label`, `Field`
- `Select`, `Combobox`, `DropdownMenu`
- `AlertDialog`

---

## 5. Route Groups

- ❌ **KHÔNG BAO GIỜ** đặt page trực tiếp trong `app/` (trừ `page.tsx` home)
- ✅ **LUÔN LUÔN** sử dụng route groups để tổ chức pages

```
app/
├── (auth)/         # Authentication pages (sign-in, sign-up...)
├── (main)/         # Public pages (info, pricing, docs...)
├── (platform)/     # Protected dashboard pages
├── layout.tsx      # Root layout
└── page.tsx        # Home page
```

---

## 6. Metadata

- ❌ **KHÔNG BAO GIỜ** export metadata từ client component (`"use client"`)
- ❌ **KHÔNG BAO GIỜ** tạo file `metadata.ts` riêng (không được import tự động)
- ✅ **LUÔN LUÔN** export metadata từ `page.tsx` (Server Component) hoặc `layout.tsx`

```tsx
// ❌ SAI - Client component không thể export metadata
"use client";
export const metadata = { title: "Page" }; // KHÔNG HOẠT ĐỘNG!

// ✅ ĐÚNG - Tạo layout.tsx riêng cho page
// app/(main)/info/layout.tsx
export const metadata = { title: "Giới thiệu" };
export default function Layout({ children }) { return children; }
```

---

## 7. Glow Effects

- ❌ **KHÔNG BAO GIỜ** sử dụng glow/shadow effects (`shadow-*-*/*`, `blur-*`)
- ❌ **KHÔNG BAO GIỜ** sử dụng gradient orbs background
- ✅ **LUÔN LUÔN** giữ design clean, không glow

```tsx
// ❌ SAI - Glow effects
<div className="shadow-lg shadow-purple-500/30" />
<div className="blur-3xl bg-blue-600/20" />

// ✅ ĐÚNG - Clean design
<div className="border border-border" />
```

---

## Thêm quy tắc mới

Khi có quy tắc "KHÔNG BAO GIỜ" mới, thêm vào file này theo format:
```
## [số]. [Tên quy tắc]
```
