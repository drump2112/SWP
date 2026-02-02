-- ============================================================================
-- SCRIPT XÓA HOÀN CHỈNH DATABASE BÁN THƯƠNG MẠI (COMMERCIAL WHOLESALE)
-- ============================================================================
-- Xóa toàn bộ tables, views, functions, triggers, indexes của hệ thống commercial
-- CẢNH BÁO: Script này sẽ XÓA TOÀN BỘ DỮ LIỆU - không thể phục hồi!
-- ============================================================================

-- Bắt đầu transaction để đảm bảo an toàn
BEGIN;

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '⚠️  BẮT ĐẦU XÓA DATABASE BÁN THƯƠNG MẠI';
    RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- 1. XÓA TRIGGERS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  Đang xóa Triggers...';
END $$;

DROP TRIGGER IF EXISTS trg_update_customer_debt ON commercial_debt_ledger CASCADE;
DROP TRIGGER IF EXISTS trg_update_batch_export ON export_order_items CASCADE;
DROP TRIGGER IF EXISTS trg_update_export_totals ON export_order_items CASCADE;
DROP TRIGGER IF EXISTS trg_update_inventory_import ON import_batches CASCADE;

-- ============================================================================
-- 2. XÓA FUNCTIONS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🗑️  Đang xóa Functions...';
END $$;

DROP FUNCTION IF EXISTS get_current_stock(INTEGER, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS check_stock_available(INTEGER, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS insert_opening_balance(INTEGER, INTEGER, INTEGER, NUMERIC, NUMERIC, DATE, TEXT) CASCADE;
DROP FUNCTION IF EXISTS suggest_optimal_batches(INTEGER, INTEGER, NUMERIC, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS update_customer_debt() CASCADE;
DROP FUNCTION IF EXISTS update_batch_on_export() CASCADE;
DROP FUNCTION IF EXISTS update_export_order_totals() CASCADE;
DROP FUNCTION IF EXISTS update_inventory_on_import() CASCADE;

-- ============================================================================
-- 3. XÓA VIEWS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🗑️  Đang xóa Views...';
END $$;

DROP VIEW IF EXISTS v_customer_debt_report CASCADE;
DROP VIEW IF EXISTS v_batch_revenue_report CASCADE;
DROP VIEW IF EXISTS v_batch_optimization CASCADE;
DROP VIEW IF EXISTS v_batch_inventory CASCADE;

-- ============================================================================
-- 4. XÓA INDEXES (Explicit - đề phòng)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🗑️  Đang xóa Indexes...';
END $$;

-- Indexes của suppliers
DROP INDEX IF EXISTS idx_suppliers_code CASCADE;
DROP INDEX IF EXISTS idx_suppliers_active CASCADE;

-- Indexes của commercial_warehouses
DROP INDEX IF EXISTS idx_commercial_warehouses_code CASCADE;
DROP INDEX IF EXISTS idx_commercial_warehouses_region CASCADE;
DROP INDEX IF EXISTS idx_commercial_warehouses_active CASCADE;

-- Indexes của commercial_customer_groups
DROP INDEX IF EXISTS idx_customer_groups_code CASCADE;

-- Indexes của commercial_customers
DROP INDEX IF EXISTS idx_commercial_customers_code CASCADE;
DROP INDEX IF EXISTS idx_commercial_customers_group CASCADE;
DROP INDEX IF EXISTS idx_commercial_customers_active CASCADE;
DROP INDEX IF EXISTS idx_commercial_customers_debt CASCADE;

-- Indexes của import_batches
DROP INDEX IF EXISTS idx_import_batches_warehouse CASCADE;
DROP INDEX IF EXISTS idx_import_batches_supplier CASCADE;
DROP INDEX IF EXISTS idx_import_batches_product CASCADE;
DROP INDEX IF EXISTS idx_import_batches_date CASCADE;
DROP INDEX IF EXISTS idx_import_batches_status CASCADE;
DROP INDEX IF EXISTS idx_import_batches_remaining CASCADE;
DROP INDEX IF EXISTS idx_import_batches_lookup CASCADE;

-- Indexes của export_orders
DROP INDEX IF EXISTS idx_export_orders_code CASCADE;
DROP INDEX IF EXISTS idx_export_orders_warehouse CASCADE;
DROP INDEX IF EXISTS idx_export_orders_customer CASCADE;
DROP INDEX IF EXISTS idx_export_orders_date CASCADE;
DROP INDEX IF EXISTS idx_export_orders_status CASCADE;
DROP INDEX IF EXISTS idx_export_orders_payment CASCADE;

-- Indexes của export_order_items
DROP INDEX IF EXISTS idx_export_items_order CASCADE;
DROP INDEX IF EXISTS idx_export_items_batch CASCADE;
DROP INDEX IF EXISTS idx_export_items_product CASCADE;

-- Indexes của commercial_debt_ledger
DROP INDEX IF EXISTS idx_commercial_debt_customer CASCADE;
DROP INDEX IF EXISTS idx_commercial_debt_warehouse CASCADE;
DROP INDEX IF EXISTS idx_commercial_debt_ref CASCADE;

-- Indexes của commercial_debt_payments
DROP INDEX IF EXISTS idx_debt_payments_customer CASCADE;
DROP INDEX IF EXISTS idx_debt_payments_date CASCADE;

-- Indexes của commercial_inventory_summary
DROP INDEX IF EXISTS ux_inventory_summary CASCADE;
DROP INDEX IF EXISTS idx_inventory_warehouse CASCADE;
DROP INDEX IF EXISTS idx_inventory_product CASCADE;
DROP INDEX IF EXISTS idx_inventory_supplier CASCADE;

-- ============================================================================
-- 5. XÓA TABLES (theo thứ tự dependency)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🗑️  Đang xóa Tables...';
END $$;

-- Xóa tables có foreign keys trước
DROP TABLE IF EXISTS export_order_items CASCADE;
DROP TABLE IF EXISTS export_orders CASCADE;
DROP TABLE IF EXISTS commercial_debt_payments CASCADE;
DROP TABLE IF EXISTS commercial_debt_ledger CASCADE;
DROP TABLE IF EXISTS commercial_inventory_summary CASCADE;
DROP TABLE IF EXISTS import_batches CASCADE;
DROP TABLE IF EXISTS commercial_customers CASCADE;
DROP TABLE IF EXISTS commercial_customer_groups CASCADE;
DROP TABLE IF EXISTS commercial_warehouses CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- ============================================================================
-- KẾT THÚC
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ ĐÃ XÓA THÀNH CÔNG TẤT CẢ OBJECTS CỦA DATABASE BÁN THƯƠNG MẠI';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 ĐÃ XÓA:';
    RAISE NOTICE '   - 4 Triggers';
    RAISE NOTICE '   - 8 Functions';
    RAISE NOTICE '   - 4 Views';
    RAISE NOTICE '   - 34 Indexes (explicit)';
    RAISE NOTICE '   - 10 Tables (+ auto-drop indexes)';
    RAISE NOTICE '';
    RAISE NOTICE '💡 CÁCH SỬ DỤNG:';
    RAISE NOTICE '   - Để chạy lại database: psql -d <database_name> -f database-commercial-wholesale.sql';
    RAISE NOTICE '   - Hoặc trong PostgreSQL: \i database-commercial-wholesale.sql';
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
END $$;

-- Commit transaction
COMMIT;

-- Nếu muốn rollback thay vì commit, uncomment dòng sau và comment dòng COMMIT ở trên:
-- ROLLBACK;
