/**
 * Script backfill tồn đầu ca cho tất cả shifts
 * Chạy: node backfill-opening-stock.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_DATABASE || 'fuel_management',
});

async function backfillOpeningStock() {
  const client = await pool.connect();

  try {
    console.log('🔄 Bắt đầu backfill tồn đầu ca...');

    // 1. Lấy tất cả shifts theo thứ tự thời gian
    const shiftsResult = await client.query(`
      SELECT id, store_id, shift_no, shift_date
      FROM shifts
      ORDER BY store_id, shift_date, shift_no
    `);
    const shifts = shiftsResult.rows;

    console.log(`📊 Tìm thấy ${shifts.length} shifts`);

    // 2. Backfill từng shift theo thứ tự
    const shiftMap = new Map(); // Lưu opening_stock_json của mỗi shift

    for (let i = 0; i < shifts.length; i++) {
      const shift = shifts[i];

      // Lấy warehouse_id của store hiện tại
      const warehouseResult = await client.query(`
        SELECT id FROM warehouses WHERE store_id = $1 LIMIT 1
      `, [shift.store_id]);

      if (!warehouseResult.rows.length) {
        console.log(`⚠️  Store ${shift.store_id} không có warehouse - bỏ qua shift ${shift.id}`);
        continue;
      }

      const warehouseId = warehouseResult.rows[0].id;

      // Lấy tất cả products
      const productsResult = await client.query(`
        SELECT id, code, name FROM products
      `);
      const products = productsResult.rows;

      const openingStockData = [];

      for (const product of products) {
        let openingStock = 0;

        // Kiểm tra có shift trước cùng store không
        let prevShift = null;
        for (let j = i - 1; j >= 0; j--) {
          if (shifts[j].store_id === shift.store_id) {
            prevShift = shifts[j];
            break;
          }
        }

        if (prevShift) {
          // Lấy opening của shift trước từ shiftMap
          const prevOpening = shiftMap.get(prevShift.id) || [];
          const prevOpeningProduct = prevOpening.find(x => x.productId === product.id);
          const prevOpeningStock = prevOpeningProduct?.openingStock || 0;

          // Lấy import/export của shift trước từ ledger (dùng warehouseId đúng)
          const prevLedgerResult = await client.query(`
            SELECT
              COALESCE(SUM(quantity_in), 0) AS total_import,
              COALESCE(SUM(quantity_out), 0) AS total_export
            FROM inventory_ledger
            WHERE product_id = $1
              AND warehouse_id = $2
              AND shift_id = $3
          `, [product.id, warehouseId, prevShift.id]);

          const prevImport = Number(prevLedgerResult.rows[0].total_import) || 0;
          const prevExport = Number(prevLedgerResult.rows[0].total_export) || 0;
          const prevClosing = prevOpeningStock + prevImport - prevExport;

          // Opening của shift hiện tại = closing của shift trước
          openingStock = prevClosing;
        } else {
          // Shift đầu tiên - lấy từ Tank
          const tankResult = await client.query(`
            SELECT COALESCE(SUM(current_stock), 0) AS total_stock
            FROM tanks
            WHERE product_id = $1 AND store_id = $2
          `, [product.id, shift.store_id]);

          openingStock = Number(tankResult.rows[0].total_stock) || 0;
        }

        if (openingStock !== 0 || i === 0) { // Lưu nếu có tồn hoặc là shift đầu
          openingStockData.push({
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            openingStock: parseFloat(openingStock),
          });
        }
      }

      // Update shift với opening_stock_json
      if (openingStockData.length > 0) {
        await client.query(`
          UPDATE shifts
          SET opening_stock_json = $1
          WHERE id = $2
        `, [JSON.stringify(openingStockData), shift.id]);

        // Lưu vào map để dùng cho shift tiếp theo
        shiftMap.set(shift.id, openingStockData);

        console.log(`✅ Shift ${shift.shift_no} (${shift.shift_date.toISOString().split('T')[0]}): ${openingStockData.length} products`);
      }
    }

    console.log('✨ Backfill hoàn tất!');
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run
backfillOpeningStock().catch(console.error);
