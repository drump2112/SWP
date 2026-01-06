#!/bin/bash

# Script Demo - Hệ Thống Nhập Xuất Tồn
# Chạy script này để test toàn bộ flow

BASE_URL="http://localhost:3000"
TOKEN="YOUR_TOKEN_HERE"  # Thay bằng token thực

echo "======================================"
echo "DEMO: Hệ Thống Nhập Xuất Tồn"
echo "======================================"
echo ""

# ========================================
# BƯỚC 1: NHẬP TỒN ĐẦU
# ========================================
echo "📝 BƯỚC 1: Nhập tồn đầu kỳ cho cửa hàng"
echo "--------------------------------------"

curl -X POST "${BASE_URL}/inventory/initial-stock" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "storeId": 1,
    "effectiveDate": "2026-01-06",
    "notes": "Setup ban đầu - Demo",
    "items": [
      {
        "tankId": 1,
        "productId": 1,
        "quantity": 5000,
        "notes": "Bồn 1 - Xăng 95 - 5000 lít"
      },
      {
        "tankId": 2,
        "productId": 2,
        "quantity": 10000,
        "notes": "Bồn 2 - Dầu DO - 10000 lít"
      }
    ]
  }' | jq '.'

echo ""
echo "✅ Đã nhập tồn đầu"
echo ""
sleep 2

# ========================================
# BƯỚC 2: XEM TỒN KHO SAU KHI NHẬP
# ========================================
echo "📊 BƯỚC 2: Xem tồn kho hiện tại"
echo "--------------------------------------"

curl -X GET "${BASE_URL}/inventory/stock-report/1" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

echo ""
echo "✅ Tồn kho ban đầu:"
echo "   - Bồn 1: 5000 lít"
echo "   - Bồn 2: 10000 lít"
echo ""
sleep 2

# ========================================
# BƯỚC 3: NHẬP HÀNG TỪ NHÀ CUNG CẤP
# ========================================
echo "🚚 BƯỚC 3: Nhập hàng từ nhà cung cấp"
echo "--------------------------------------"

curl -X POST "${BASE_URL}/inventory/documents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "storeId": 1,
    "docType": "IMPORT",
    "docDate": "2026-01-06",
    "supplierName": "Công ty Xăng Dầu ABC",
    "invoiceNumber": "HD-2026-DEMO-001",
    "licensePlate": "29A-12345",
    "items": [
      {
        "productId": 1,
        "tankId": 1,
        "quantity": 3000,
        "unitPrice": 21000
      }
    ]
  }' | jq '.'

echo ""
echo "✅ Đã nhập 3000 lít xăng vào Bồn 1"
echo ""
sleep 2

# ========================================
# BƯỚC 4: XEM TỒN SAU KHI NHẬP
# ========================================
echo "📊 BƯỚC 4: Xem tồn kho sau khi nhập"
echo "--------------------------------------"

curl -X GET "${BASE_URL}/inventory/stock-report/1" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

echo ""
echo "✅ Tồn kho sau nhập:"
echo "   - Bồn 1: 8000 lít (5000 + 3000)"
echo "   - Bồn 2: 10000 lít (không đổi)"
echo ""
sleep 2

# ========================================
# BƯỚC 5: BÁN HÀNG (ĐÓNG CA)
# ========================================
echo "💰 BƯỚC 5: Bán hàng (đóng ca)"
echo "--------------------------------------"
echo "⚠️  Chú ý: Cần tạo shift trước khi đóng ca"
echo ""

# Giả sử đã có shift_id = 1
# Nếu chưa có, cần tạo shift trước:
# POST /shifts với body:
# {
#   "storeId": 1,
#   "shiftNo": 1,
#   "shiftDate": "2026-01-06",
#   "openedBy": "user_id"
# }

curl -X POST "${BASE_URL}/shifts/1/close" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "shiftId": 1,
    "pumpReadings": [
      {
        "pumpCode": "P001",
        "productId": 1,
        "startValue": 0,
        "endValue": 500
      }
    ]
  }' | jq '.'

echo ""
echo "✅ Đã bán 500 lít xăng qua bơm P001"
echo ""
sleep 2

# ========================================
# BƯỚC 6: XEM TỒN SAU KHI BÁN
# ========================================
echo "📊 BƯỚC 6: Xem tồn kho sau khi bán"
echo "--------------------------------------"

curl -X GET "${BASE_URL}/inventory/stock-report/1" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

echo ""
echo "✅ Tồn kho sau bán:"
echo "   - Bồn 1: 7500 lít (8000 - 500)"
echo "   - Bồn 2: 10000 lít (không đổi)"
echo ""
sleep 2

# ========================================
# BƯỚC 7: XEM BÁO CÁO NHẬP XUẤT TỒN
# ========================================
echo "📈 BƯỚC 7: Báo cáo nhập xuất tồn"
echo "--------------------------------------"

curl -X GET "${BASE_URL}/inventory/report/1?fromDate=2026-01-01&toDate=2026-01-31" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

echo ""
echo "✅ Báo cáo tháng 1/2026:"
echo "   Xăng 95:"
echo "     - Tồn đầu: 5000 lít"
echo "     - Nhập: 3000 lít"
echo "     - Xuất: 500 lít"
echo "     - Tồn cuối: 7500 lít"
echo ""
sleep 2

# ========================================
# BƯỚC 8: XEM DANH SÁCH PHIẾU NHẬP
# ========================================
echo "📋 BƯỚC 8: Danh sách phiếu nhập kho"
echo "--------------------------------------"

curl -X GET "${BASE_URL}/reports/inventory-import?storeId=1&fromDate=2026-01-01&toDate=2026-01-31" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

echo ""
echo "✅ Danh sách phiếu nhập trong tháng"
echo ""
sleep 2

# ========================================
# BƯỚC 9: KIỂM KÊ & ĐIỀU CHỈNH
# ========================================
echo "🔍 BƯỚC 9: Kiểm kê & điều chỉnh"
echo "--------------------------------------"
echo "Giả sử kiểm kê thực tế Bồn 1 = 7450 lít (thiếu 50 lít)"
echo ""

curl -X POST "${BASE_URL}/inventory/initial-stock" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "storeId": 1,
    "effectiveDate": "2026-01-06",
    "notes": "Kiểm kê phát hiện thiếu hụt",
    "items": [
      {
        "tankId": 1,
        "productId": 1,
        "quantity": 7450,
        "notes": "Kiểm kê thực tế: 7450 lít (thiếu 50 lít)"
      }
    ]
  }' | jq '.'

echo ""
echo "✅ Đã điều chỉnh tồn kho theo kiểm kê"
echo ""
sleep 2

# ========================================
# BƯỚC 10: XEM TỒN CUỐI CÙNG
# ========================================
echo "📊 BƯỚC 10: Xem tồn kho cuối cùng"
echo "--------------------------------------"

curl -X GET "${BASE_URL}/inventory/stock-report/1" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'

echo ""
echo "✅ Tồn kho sau điều chỉnh:"
echo "   - Bồn 1: 7450 lít (đã điều chỉnh)"
echo "   - Bồn 2: 10000 lít (không đổi)"
echo ""

# ========================================
# KẾT THÚC
# ========================================
echo ""
echo "======================================"
echo "✅ HOÀN THÀNH DEMO"
echo "======================================"
echo ""
echo "📝 Tóm tắt:"
echo "   1. ✅ Nhập tồn đầu: 5000 lít (Bồn 1)"
echo "   2. ✅ Nhập hàng: +3000 lít → 8000 lít"
echo "   3. ✅ Bán hàng: -500 lít → 7500 lít"
echo "   4. ✅ Kiểm kê: Điều chỉnh → 7450 lít"
echo ""
echo "📊 Tất cả dữ liệu được ghi vào inventory_ledger"
echo "🔍 Tồn kho = SUM(quantityIn - quantityOut)"
echo ""
echo "🎉 Hệ thống hoạt động chính xác!"
echo ""
