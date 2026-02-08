import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDiscountPerUnitToImportBatches1707384000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'import_batches',
      new TableColumn({
        name: 'discount_per_unit',
        type: 'numeric',
        precision: 18,
        scale: 2,
        default: 0,
        isNullable: false,
      }),
    );

    // Nếu cột discount_percent tồn tại, có thể xóa nó
    const table = await queryRunner.getTable('import_batches');
    
    if (table) {
      const discountPercentColumn = table.findColumnByName('discount_percent');
      
      if (discountPercentColumn) {
        await queryRunner.dropColumn('import_batches', 'discount_percent');
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa cột discount_per_unit nếu rollback
    await queryRunner.dropColumn('import_batches', 'discount_per_unit');

    // Thêm lại cột discount_percent
    await queryRunner.addColumn(
      'import_batches',
      new TableColumn({
        name: 'discount_percent',
        type: 'numeric',
        precision: 5,
        scale: 2,
        default: 0,
        isNullable: false,
      }),
    );
  }
}
