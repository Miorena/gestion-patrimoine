import { MigrationInterface, QueryRunner } from 'typeorm';

// Ajoute les rôles supplémentaires : Consultant, Chef de service, Auditeur / Comptable
export class AddRoles1762900000000 implements MigrationInterface {
  name = 'AddRoles1762900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO role (libelle) VALUES
        ('Consultant'),
        ('Chef de service'),
        ('Auditeur / Comptable')
      ON CONFLICT (libelle) DO NOTHING;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Un rôle encore attribué à un utilisateur ne peut pas être supprimé (clé étrangère RESTRICT)
    await queryRunner.query(
      `DELETE FROM role WHERE libelle IN ('Consultant', 'Chef de service', 'Auditeur / Comptable')`,
    );
  }
}
