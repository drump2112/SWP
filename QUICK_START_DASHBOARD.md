# 🚀 Quick Start - Dashboard Analytics

## Cài đặt nhanh

### 1. Backend (đã tích hợp sẵn)
```bash
cd BackEnd
npm run start:dev
```

### 2. Frontend (cần cài recharts)
```bash
cd FrontEnd
npm install recharts @types/recharts
npm run dev
```

## Sử dụng

### Đăng nhập với role phù hợp:
- ✅ DIRECTOR
- ✅ ADMIN
- ✅ SALES
- ✅ ACCOUNTING
- ❌ STORE (chỉ thấy dashboard cũ)

### Dashboard sẽ hiển thị:
1. **4 Metric Cards** - KPI quan trọng với % thay đổi
2. **3 Biểu đồ** - Doanh thu theo tháng, so sánh cửa hàng, xu hướng
3. **3 Info Cards** - Tồn kho, top sản phẩm, công nợ

### Tương tác:
- Chọn ngày bắt đầu và kết thúc (góc phải)
- Hover vào charts để xem chi tiết
- Scroll xuống để xem thêm thông tin

## Tính năng chính

### 📊 Biểu đồ Doanh thu
- **Tháng gần nhất**: Xu hướng 6 tháng
- **So sánh cửa hàng**: Hiệu suất từng chi nhánh
- **Trends**: Từng cửa hàng qua thời gian

### 💰 Metrics
- Tổng doanh thu (so với kỳ trước)
- Số ca đã chốt
- Số giao dịch
- Khách hàng công nợ

### 📦 Thông tin
- Tổng hàng tồn kho (theo chi nhánh)
- Top 5 sản phẩm bán chạy
- Top 5 khách hàng nợ nhiều nhất

## API Endpoints

Tất cả bắt đầu với `/analytics`:

- `/overview` - Metrics tổng quan
- `/revenue/monthly` - Doanh thu theo tháng
- `/revenue/by-store` - So sánh cửa hàng
- `/revenue/store-trends` - Xu hướng từng cửa hàng
- `/inventory/total` - Tổng tồn kho
- `/sales/top-products` - Top sản phẩm
- `/debt/summary` - Công nợ
- `/performance/stores` - Hiệu suất cửa hàng

## Phân quyền

| Role | Dashboard Type | Access Level |
|------|---------------|--------------|
| STORE | Simple | Chỉ data cửa hàng mình |
| SALES | Analytics | Toàn hệ thống |
| ACCOUNTING | Analytics | Toàn hệ thống |
| DIRECTOR | Analytics | Toàn hệ thống |
| ADMIN | Analytics | Toàn hệ thống |

## Troubleshooting

**Không thấy dashboard mới?**
- Kiểm tra role của user
- Đăng xuất và đăng nhập lại

**Charts không hiển thị?**
- Chạy `npm install recharts @types/recharts`
- Restart dev server

**Dữ liệu không load?**
- Kiểm tra backend đã chạy chưa
- Check console cho errors
- Verify network tab trong DevTools

## Documentation

Chi tiết hơn xem:
- [DASHBOARD_README.md](./DASHBOARD_README.md) - Hướng dẫn đầy đủ
- [DASHBOARD_ANALYTICS_GUIDE.md](./DASHBOARD_ANALYTICS_GUIDE.md) - API reference
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Tổng kết kỹ thuật

---

**Chúc bạn sử dụng hiệu quả!** 🎉
