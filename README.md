# Cổ Học Tinh Hoa - Ancient Wisdom

Ứng dụng web về văn hóa tâm linh và chiêm tinh học phương Đông, kết hợp trí tuệ cổ xưa với công nghệ hiện đại.

## Tính năng

### Dịch Vụ
- **Tử Vi Đẩu Số** - Luận giải vận mệnh theo Tử Vi
- **Thần Số Học** - Khám phá con số định mệnh (Life Path, Expression, Soul Urge...)
- **Xem Tướng Tay** - Giải mã vận mệnh qua đường chỉ tay
- **Xem Tướng Mặt** - Nhân tướng học phương Đông

### Công Cụ
- **Lịch Vạn Niên** - Âm lịch, Can Chi, Giờ Hoàng Đạo, 12 Trực, 28 Sao
- **Xem Ngày Tốt** - Chọn ngày tốt cho việc đại sự
- **Xem Hợp Tuổi** - Kiểm tra độ hợp tuổi

### Premium
- **Bản Đồ Vận Mệnh** - Phân tích vận mệnh toàn diện
- **Bản Đồ Số Mệnh** - Thần số học chuyên sâu
- **Báo Cáo Tổng Hợp** - Báo cáo phân tích chi tiết

## Tech Stack

- **Frontend:** React 18, Vite
- **Styling:** Tailwind CSS, Framer Motion
- **Calendar:** lunar-javascript (Âm lịch)
- **AI:** OpenAI API (tùy chọn)

## Cài đặt

```bash
# Clone repo
git clone https://github.com/nclamvn/co-hoc-tinh-hoa.git
cd co-hoc-tinh-hoa

# Cài đặt dependencies
npm install

# Tạo file .env từ template
cp .env.example .env

# Chỉnh sửa .env và thêm API key (nếu cần)
# VITE_MIMO_TOKEN=your_api_key_here

# Chạy development server
npm run dev
```

## Scripts

```bash
npm run dev      # Chạy development server
npm run build    # Build production
npm run preview  # Preview production build
npm run lint     # Chạy ESLint
```

## Deploy

### Render (Static Site)

1. Kết nối GitHub repo với Render
2. Cài đặt:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
3. Thêm Environment Variables (nếu cần):
   - `VITE_MIMO_TOKEN`

### Vercel / Netlify

Tương tự, chọn framework **Vite** và publish directory **dist**.

## Cấu trúc thư mục

```
src/
├── components/          # React components
│   ├── lunarCalendar/   # Lịch vạn niên components
│   └── navigation/      # Navigation components
├── data/                # Data files
│   ├── numerologyMeanings/  # Kiến giải Thần Số Học
│   ├── tuViMeanings/        # Kiến giải Tử Vi
│   └── vietnameseHolidays.js
├── pages/               # Page components
├── utils/               # Utility functions
│   └── lunarCalendar/   # Lunar calendar engine
└── index.css            # Global styles
```

## License

MIT

## Tác giả

Developed with Vietnamese traditional wisdom in mind.
