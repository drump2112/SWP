import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerToExportOrderItems1738470000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add customer_id column to export_order_items
    await queryRunner.query(`
      ALTER TABLE export_order_items
      ADD COLUMN IF NOT EXISTS customer_id INTEGER;
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE export_order_items
      ADD CONSTRAINT fk_export_order_items_customer
      FOREIGN KEY (customer_id)
      REFERENCES commercial_customers(id)
      ON DELETE RESTRICT;
    `);

    // Create index for better performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_export_order_items_customer_id
      ON export_order_items(customer_id);
    `);

    // Remove customer_id from export_orders if it exists
    await queryRunner.query(`
      ALTER TABLE export_orders
      DROP COLUMN IF EXISTS customer_id CASCADE;
    `);

    // Add vehicle tracking fields to export_orders if not exists
    await queryRunner.query(`
      ALTER TABLE export_orders
      ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(20);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove vehicle fields
    await queryRunner.query(`
      ALTER TABLE export_orders
      DROP COLUMN IF EXISTS vehicle_number,
      DROP COLUMN IF EXISTS driver_name,
      DROP COLUMN IF EXISTS driver_phone;
    `);

    // Add back customer_id to export_orders
    await queryRunner.query(`
      ALTER TABLE export_orders
      ADD COLUMN IF NOT EXISTS customer_id INTEGER;
    `);

    // Drop customer_id from export_order_items
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_export_order_items_customer_id;
    `);

    await queryRunner.query(`
      ALTER TABLE export_order_items
      DROP CONSTRAINT IF EXISTS fk_export_order_items_customer;
    `);

    await queryRunner.query(`
      ALTER TABLE export_order_items
      DROP COLUMN IF EXISTS customer_id;
    `);
  }
}
