import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUnitPriceToPumpReadings1735999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'pump_readings',
      new TableColumn({
        name: 'unit_price',
        type: 'decimal',
        precision: 18,
        scale: 2,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('pump_readings', 'unit_price');
  }
}
