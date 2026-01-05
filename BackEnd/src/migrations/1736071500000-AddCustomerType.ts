import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCustomerType1736071500000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("customers", new TableColumn({
            name: "type",
            type: "varchar",
            length: "20",
            default: "'EXTERNAL'", // EXTERNAL (Khách hàng), INTERNAL (Nội bộ/Nhân viên)
            isNullable: false
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("customers", "type");
    }

}
