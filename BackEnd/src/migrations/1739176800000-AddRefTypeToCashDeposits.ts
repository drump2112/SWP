import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRefTypeToCashDeposits1739176800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'cash_deposits',
      new TableColumn({
        name: 'ref_type',
        type: 'varchar',
        length: '50',
        isNullable: true,
        comment: "RETAIL = nộp tiền bán lẻ, RECEIPT = nộp tiền từ phiếu thu nợ",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('cash_deposits', 'ref_type');
  }
}
