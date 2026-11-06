import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

// Runs the SQL script v2 as is (tables, constraints, triggers, initial data)
export class InitSchema1730851200000 implements MigrationInterface {
  name = 'InitSchema1730851200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const sql = readFileSync(join(__dirname, '..', 'schema_v2.sql'), 'utf8');
    await queryRunner.query(sql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS historique, sortie, affectation, bien_immobilier, bien_equipement,
        bien, compteur_code, utilisateur, role, localisation, agent, service, direction,
        etat, categorie CASCADE;
      DROP FUNCTION IF EXISTS fn_historique_ajout_seul(), fn_affectation_quantite(),
        fn_bien_code(), fn_prochain_code(INTEGER);
    `);
  }
}
