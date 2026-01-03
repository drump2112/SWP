import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateExpenseTables1735925000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tạo bảng expense_categories
    await queryRunner.createTable(
      new Table({
        name: 'expense_categories',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 2. Tạo bảng expenses
    await queryRunner.createTable(
      new Table({
        name: 'expenses',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'store_id',
            type: 'int',
          },
          {
            name: 'shift_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'expense_category_id',
            type: 'int',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 18,
            scale: 2,
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'expense_date',
            type: 'date',
          },
          {
            name: 'created_by',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 3. Tạo indexes
    await queryRunner.query(
      `CREATE INDEX idx_expenses_store ON expenses (store_id, created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_expenses_shift ON expenses (shift_id)`,
    );

    // 4. Tạo foreign keys
    await queryRunner.createForeignKey(
      'expenses',
      new TableForeignKey({
        columnNames: ['store_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'stores',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'expenses',
      new TableForeignKey({
        columnNames: ['shift_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'shifts',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'expenses',
      new TableForeignKey({
        columnNames: ['expense_category_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'expense_categories',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'expenses',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    // 5. Insert dữ liệu mẫu cho expense_categories
    await queryRunner.query(`
      INSERT INTO expense_categories (code, name, description) VALUES
      ('642', 'Chi phí quản lý doanh nghiệp', 'Chi phí quản lý DN theo TT200'),
      ('641', 'Chi phí bán hàng', 'Chi phí phát sinh trong quá trình tiêu thụ sản phẩm'),
      ('627', 'Chi phí dịch vụ mua ngoài', 'Chi phí dịch vụ thuê ngoài'),
      ('811', 'Chi phí khác', 'Các khoản chi phí khác')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('expenses');
    await queryRunner.dropTable('expense_categories');
  }
}
