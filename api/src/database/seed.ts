import * as bcrypt from 'bcryptjs';
import dataSource from './data-source';

// Crée un utilisateur et un emplacement par défaut s'il n'en existe aucun.
// Utilisation : SEED_EMAIL=... SEED_PASSWORD=... [SEED_NAME=...] [SEED_ROLE=Administrateur] npm run seed
async function seed() {
  const email = process.env.SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_PASSWORD;
  const name = process.env.SEED_NAME ?? 'Administrateur';
  const roleLabel = process.env.SEED_ROLE ?? 'Administrateur';
  if (!email || !password || password.length < 8) {
    throw new Error('SEED_EMAIL and SEED_PASSWORD (min 8 characters) are required');
  }

  await dataSource.initialize();
  try {
    const roles = await dataSource.query('SELECT id_role FROM role WHERE libelle = $1', [roleLabel]);
    if (roles.length === 0) throw new Error(`Unknown role "${roleLabel}"`);

    const passwordHash = await bcrypt.hash(password, 10);
    await dataSource.query(
      `INSERT INTO utilisateur (nom, email, mot_de_passe_hash, id_role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET mot_de_passe_hash = EXCLUDED.mot_de_passe_hash`,
      [name, email, passwordHash, roles[0].id_role],
    );

    // Un bien a besoin d'un emplacement : on en crée un en attendant le CRUD des emplacements
    const [{ count }] = await dataSource.query('SELECT COUNT(*)::int AS count FROM localisation');
    if (count === 0) {
      await dataSource.query(`INSERT INTO localisation (nom, type) VALUES ('Siège (site principal)', 'site')`);
    }
    console.log(`User ${email} (${roleLabel}) ready.`);
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
