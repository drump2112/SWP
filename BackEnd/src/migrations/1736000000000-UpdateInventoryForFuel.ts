import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class UpdateInventoryForFuel1736000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Update inventory_documents
        await queryRunner.addColumns("inventory_documents", [
            new TableColumn({
                name: "supplier_name",
                type: "varchar",
                length: "255",
                isNullable: true
            }),
            new TableColumn({
                name: "invoice_number",
                type: "varchar",
                length: "50",
                isNullable: true
            }),
            new TableColumn({
                name: "license_plate",
                type: "varchar",
                length: "20",
                isNullable: true
            })
        ]);

        // 2. Update inventory_document_items
        await queryRunner.addColumn("inventory_document_items", new TableColumn({
            name: "tank_id",
            type: "int",
            isNullable: true
        }));

        await queryRunner.createForeignKey("inventory_document_items", new TableForeignKey({
            columnNames: ["tank_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "tanks",
            onDelete: "SET NULL"
        }));

        // 3. Update inventory_ledger
        await queryRunner.addColumn("inventory_ledger", new TableColumn({
            name: "tank_id",
            type: "int",
            isNullable: true
        }));

        await queryRunner.createForeignKey("inventory_ledger", new TableForeignKey({
            columnNames: ["tank_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "tanks",
            onDelete: "SET NULL"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert inventory_ledger
        const ledgerTable = await queryRunner.getTable("inventory_ledger");
        if (ledgerTable) {
            const ledgerForeignKey = ledgerTable.foreignKeys.find(fk => fk.columnNames.indexOf("tank_id") !== -1);
            if (ledgerForeignKey) await queryRunner.dropForeignKey("inventory_ledger", ledgerForeignKey);
            await queryRunner.dropColumn("inventory_ledger", "tank_id");
        }

        // Revert inventory_document_items
        const itemTable = await queryRunner.getTable("inventory_document_items");
        if (itemTable) {
            const itemForeignKey = itemTable.foreignKeys.find(fk => fk.columnNames.indexOf("tank_id") !== -1);
            if (itemForeignKey) await queryRunner.dropForeignKey("inventory_document_items", itemForeignKey);
            await queryRunner.dropColumn("inventory_document_items", "tank_id");
        }

        // Revert inventory_documents
        await queryRunner.dropColumns("inventory_documents", ["supplier_name", "invoice_number", "license_plate"]);
    }

}
