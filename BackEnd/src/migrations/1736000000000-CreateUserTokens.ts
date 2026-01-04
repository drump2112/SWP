import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserTokens1736000000000 implements MigrationInterface {
  name = 'CreateUserTokens1736000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "user_tokens" (
                "id" character varying NOT NULL,
                "user_id" integer NOT NULL,
                "expires_at" TIMESTAMP NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "is_revoked" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_user_tokens" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "user_tokens" 
            ADD CONSTRAINT "FK_user_tokens_user" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_tokens" DROP CONSTRAINT "FK_user_tokens_user"`,
    );
    await queryRunner.query(`DROP TABLE "user_tokens"`);
  }
}
