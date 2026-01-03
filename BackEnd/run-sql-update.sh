#!/bin/bash

# Script để chạy SQL update database
# Sử dụng: ./run-sql-update.sh

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-postgres}"
PGDATABASE="${PGDATABASE:-fuel_management}"

export PGPASSWORD

echo "🔧 Đang cập nhật database: $PGDATABASE"
echo "-------------------------------------------"

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f add-payment-method.sql

echo ""
echo "✅ Hoàn tất cập nhật database!"
echo ""
echo "📋 Các cột payment_method đã được thêm vào:"
echo "   - sales.payment_method"
echo "   - receipts.payment_method"
echo "   - cash_deposits.payment_method"
echo "   - expenses.payment_method"
echo ""
echo "📊 Bảng mới đã tạo:"
echo "   - expense_categories (4 danh mục)"
echo "   - expenses"
