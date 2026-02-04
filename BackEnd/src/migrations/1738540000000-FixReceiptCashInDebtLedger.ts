import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Fix công nợ cửa hàng cho các phiếu thu tiền mặt
 *
 * VẤN ĐỀ:
 * - Trước đây, khi thu tiền mặt từ khách nợ, hệ thống chỉ:
 *   + Ghi CREDIT cho khách EXTERNAL (giảm nợ họ)
 *   + Ghi cashIn vào sổ quỹ
 *   + NHƯNG KHÔNG ghi DEBIT cho khách INTERNAL (tiền vào quỹ = nợ cửa hàng tăng)
 *
 * - Khi nộp tiền về công ty từ phiếu thu (sourceType='RECEIPT'), hệ thống:
 *   + Ghi cashOut vào sổ quỹ
 *   + NHƯNG KHÔNG ghi CREDIT cho khách INTERNAL (bị skip vì sourceType='RECEIPT')
 *
 * KẾT QUẢ:
 * - Công nợ cửa hàng KHÔNG bằng Sổ quỹ
 *
 * GIẢI PHÁP:
 * 1. Tìm tất cả phiếu thu tiền mặt chưa có bản ghi DEBIT RECEIPT_CASH_IN cho INTERNAL
 * 2. Tạo bản ghi DEBIT RECEIPT_CASH_IN cho khách INTERNAL
 * 3. Tìm tất cả phiếu nộp tiền mặt (từ phiếu thu) chưa có CREDIT DEPOSIT cho INTERNAL
 * 4. Tạo bản ghi CREDIT DEPOSIT cho khách INTERNAL
 *
 * LƯU Ý: Migration này có thể chạy nhiều lần (idempotent) vì check tồn tại trước khi insert
 */
export class FixReceiptCashInDebtLedger1738540000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🚀 Bắt đầu migration: Fix công nợ cửa hàng cho phiếu thu tiền mặt...');

    // =====================================================
    // BƯỚC 1: Ghi DEBIT cho khách INTERNAL từ phiếu thu tiền mặt
    // =====================================================
    console.log('\n📝 Bước 1: Tìm phiếu thu tiền mặt chưa có DEBIT cho INTERNAL...');

    // Tìm tất cả phiếu thu tiền mặt mà chưa có bản ghi RECEIPT_CASH_IN trong debt_ledger
    const receiptsNeedingDebit = await queryRunner.query(`
      SELECT
        r.id AS receipt_id,
        r.store_id,
        r.shift_id,
        r.amount,
        r.receipt_at,
        r.notes,
        s.closed_at,
        ic.customer_id AS internal_customer_id
      FROM receipts r
      INNER JOIN shifts s ON r.shift_id = s.id
      -- Tìm khách hàng nội bộ của cửa hàng
      INNER JOIN customer_stores cs ON cs.store_id = r.store_id
      INNER JOIN customers ic ON ic.id = cs.customer_id AND ic.type = 'INTERNAL'
      WHERE r.payment_method = 'CASH'
        AND s.status = 'CLOSED'
        -- Chưa có bản ghi RECEIPT_CASH_IN cho phiếu thu này
        AND NOT EXISTS (
          SELECT 1 FROM debt_ledger dl
          WHERE dl.ref_type = 'RECEIPT_CASH_IN'
            AND dl.ref_id = r.id
            AND dl.customer_id = ic.id
        )
      ORDER BY r.id
    `);

    console.log(`   Tìm thấy ${receiptsNeedingDebit.length} phiếu thu cần bổ sung DEBIT cho INTERNAL`);

    let debitCount = 0;
    for (const receipt of receiptsNeedingDebit) {
      await queryRunner.query(`
        INSERT INTO debt_ledger (
          customer_id, store_id, shift_id, ref_type, ref_id,
          debit, credit, notes, ledger_at, created_at
        ) VALUES (
          $1, $2, $3, 'RECEIPT_CASH_IN', $4,
          $5, 0, $6, $7, NOW()
        )
      `, [
        receipt.internal_customer_id,
        receipt.store_id,
        receipt.shift_id,
        receipt.receipt_id,
        receipt.amount,
        `[Migration] Thu tiền mặt từ khách nợ - Tiền vào quỹ`,
        receipt.receipt_at || receipt.closed_at || new Date(),
      ]);
      debitCount++;
    }

    console.log(`   ✅ Đã tạo ${debitCount} bản ghi DEBIT RECEIPT_CASH_IN`);

    // =====================================================
    // BƯỚC 2: Ghi CREDIT cho khách INTERNAL từ phiếu nộp tiền mặt (nguồn RECEIPT)
    // =====================================================
    console.log('\n📝 Bước 2: Tìm phiếu nộp tiền mặt chưa có CREDIT cho INTERNAL...');

    // Tìm phiếu nộp tiền mặt mà:
    // - Có trong ca đã đóng
    // - Chưa có bản ghi CREDIT DEPOSIT cho khách INTERNAL
    //
    // LƯU Ý: Vì trước đây có check sourceType !== 'RECEIPT',
    // nhưng sourceType không được lưu vào DB, nên ta không thể biết chính xác
    // phiếu nộp nào là từ RECEIPT, phiếu nào là từ RETAIL.
    //
    // CÁCH XỬ LÝ:
    // - Tìm tất cả phiếu nộp tiền mặt chưa có CREDIT cho INTERNAL
    // - Insert CREDIT nếu chưa có
    //
    // Điều này an toàn vì:
    // - Nếu đã có CREDIT từ trước (RETAIL) → không insert thêm (check EXISTS)
    // - Nếu chưa có CREDIT (RECEIPT bị skip) → insert CREDIT mới

    const depositsNeedingCredit = await queryRunner.query(`
      SELECT
        cd.id AS deposit_id,
        cd.store_id,
        cd.shift_id,
        cd.amount,
        cd.deposit_at,
        cd.notes,
        s.closed_at,
        ic.customer_id AS internal_customer_id
      FROM cash_deposits cd
      INNER JOIN shifts s ON cd.shift_id = s.id
      -- Tìm khách hàng nội bộ của cửa hàng
      INNER JOIN customer_stores cs ON cs.store_id = cd.store_id
      INNER JOIN customers ic ON ic.id = cs.customer_id AND ic.type = 'INTERNAL'
      WHERE cd.payment_method = 'CASH'
        AND s.status = 'CLOSED'
        -- Chưa có bản ghi CREDIT DEPOSIT cho phiếu nộp này
        AND NOT EXISTS (
          SELECT 1 FROM debt_ledger dl
          WHERE dl.ref_type = 'DEPOSIT'
            AND dl.ref_id = cd.id
            AND dl.customer_id = ic.id
            AND dl.credit > 0
        )
      ORDER BY cd.id
    `);

    console.log(`   Tìm thấy ${depositsNeedingCredit.length} phiếu nộp cần bổ sung CREDIT cho INTERNAL`);

    let creditCount = 0;
    for (const deposit of depositsNeedingCredit) {
      await queryRunner.query(`
        INSERT INTO debt_ledger (
          customer_id, store_id, shift_id, ref_type, ref_id,
          debit, credit, notes, ledger_at, created_at
        ) VALUES (
          $1, $2, $3, 'DEPOSIT', $4,
          0, $5, $6, $7, NOW()
        )
      `, [
        deposit.internal_customer_id,
        deposit.store_id,
        deposit.shift_id,
        deposit.deposit_id,
        deposit.amount,
        `[Migration] Nộp tiền về công ty - Giảm nợ`,
        deposit.deposit_at || deposit.closed_at || new Date(),
      ]);
      creditCount++;
    }

    console.log(`   ✅ Đã tạo ${creditCount} bản ghi CREDIT DEPOSIT`);

    // =====================================================
    // BƯỚC 3: Kiểm tra kết quả
    // =====================================================
    console.log('\n📊 Bước 3: Kiểm tra kết quả...');

    const summary = await queryRunner.query(`
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        s.name AS store_name,
        COALESCE(SUM(dl.debit), 0) AS total_debit,
        COALESCE(SUM(dl.credit), 0) AS total_credit,
        COALESCE(SUM(dl.debit - dl.credit), 0) AS balance,
        COALESCE(SUM(cl.cash_in), 0) AS total_cash_in,
        COALESCE(SUM(cl.cash_out), 0) AS total_cash_out,
        COALESCE(SUM(cl.cash_in - cl.cash_out), 0) AS cash_balance
      FROM customers c
      INNER JOIN customer_stores cs ON cs.customer_id = c.id
      INNER JOIN stores s ON s.id = cs.store_id
      LEFT JOIN debt_ledger dl ON dl.customer_id = c.id AND dl.store_id = s.id
      LEFT JOIN cash_ledger cl ON cl.store_id = s.id
      WHERE c.type = 'INTERNAL'
      GROUP BY c.id, c.name, s.name
      ORDER BY s.name
    `);

    console.log('\n   Tóm tắt công nợ và sổ quỹ theo cửa hàng:');
    console.log('   ' + '─'.repeat(100));
    console.log('   | Cửa hàng             | Khách INTERNAL        | Tổng DEBIT     | Tổng CREDIT    | Công nợ        | Sổ quỹ         |');
    console.log('   ' + '─'.repeat(100));

    for (const row of summary) {
      const storeName = (row.store_name || '').padEnd(20).substring(0, 20);
      const customerName = (row.customer_name || '').padEnd(20).substring(0, 20);
      const debit = Number(row.total_debit).toLocaleString('vi-VN').padStart(12);
      const credit = Number(row.total_credit).toLocaleString('vi-VN').padStart(12);
      const balance = Number(row.balance).toLocaleString('vi-VN').padStart(12);
      const cashBalance = Number(row.cash_balance).toLocaleString('vi-VN').padStart(12);

      const match = Math.abs(Number(row.balance) - Number(row.cash_balance)) < 1 ? '✅' : '⚠️';

      console.log(`   | ${storeName} | ${customerName} | ${debit} | ${credit} | ${balance} | ${cashBalance} | ${match}`);
    }
    console.log('   ' + '─'.repeat(100));

    console.log('\n✅ Migration hoàn tất!');
    console.log(`   - Đã tạo ${debitCount} bản ghi DEBIT (RECEIPT_CASH_IN) cho khách INTERNAL`);
    console.log(`   - Đã tạo ${creditCount} bản ghi CREDIT (DEPOSIT) cho khách INTERNAL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔙 Rollback migration: Xóa các bản ghi được tạo bởi migration...');

    // Xóa các bản ghi RECEIPT_CASH_IN được tạo bởi migration
    const deletedDebit = await queryRunner.query(`
      DELETE FROM debt_ledger
      WHERE ref_type = 'RECEIPT_CASH_IN'
        AND notes LIKE '[Migration]%'
    `);

    // Xóa các bản ghi CREDIT DEPOSIT được tạo bởi migration
    const deletedCredit = await queryRunner.query(`
      DELETE FROM debt_ledger
      WHERE ref_type = 'DEPOSIT'
        AND credit > 0
        AND notes LIKE '[Migration]%'
    `);

    console.log(`   Đã xóa bản ghi RECEIPT_CASH_IN`);
    console.log(`   Đã xóa bản ghi CREDIT DEPOSIT`);
    console.log('✅ Rollback hoàn tất!');
  }
}
