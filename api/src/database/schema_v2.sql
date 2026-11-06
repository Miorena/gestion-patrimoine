-- =====================================================================
-- Module Gestion des patrimoines - schéma PostgreSQL (v2)
-- Contient : tables, contraintes, index, triggers, données initiales
-- Ordre : les tables référencées sont créées avant celles qui les utilisent
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. RÉFÉRENTIELS
-- ---------------------------------------------------------------------

CREATE TABLE categorie (
    id_categorie  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    libelle       VARCHAR(100) NOT NULL UNIQUE,
    -- famille : indique quelle table d'extension utiliser pour les biens de la catégorie
    famille       VARCHAR(12)  NOT NULL
                  CHECK (famille IN ('equipement', 'immobilier'))
);

CREATE TABLE etat (
    id_etat    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    libelle    VARCHAR(50) NOT NULL UNIQUE,
    -- est_final : un bien dans un état final (cédé, réformé, perdu) ne revient jamais en arrière
    est_final  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE direction (
    id_direction  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom           VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE service (
    id_service    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom           VARCHAR(150) NOT NULL,
    id_direction  INTEGER NOT NULL REFERENCES direction (id_direction) ON DELETE RESTRICT,
    UNIQUE (id_direction, nom)
);

CREATE TABLE agent (
    id_agent    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom         VARCHAR(100) NOT NULL,
    prenom      VARCHAR(100) NOT NULL,
    fonction    VARCHAR(150),
    id_service  INTEGER NOT NULL REFERENCES service (id_service) ON DELETE RESTRICT
);

-- Hiérarchie : site > bâtiment > bureau/salle (auto-référence via id_parent)
CREATE TABLE localisation (
    id_localisation  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom              VARCHAR(150) NOT NULL,
    type             VARCHAR(10)  NOT NULL
                     CHECK (type IN ('site', 'batiment', 'bureau', 'salle')),
    id_parent        INTEGER REFERENCES localisation (id_localisation) ON DELETE RESTRICT,
    CHECK (id_parent IS NULL OR id_parent <> id_localisation)
);

-- ---------------------------------------------------------------------
-- 2. ACCÈS
-- ---------------------------------------------------------------------

CREATE TABLE role (
    id_role  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    libelle  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE utilisateur (
    id_utilisateur    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nom               VARCHAR(150) NOT NULL,
    email             VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe_hash VARCHAR(255) NOT NULL,   -- jamais le mot de passe en clair
    id_role           INTEGER NOT NULL REFERENCES role (id_role) ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- 3. BIENS
-- ---------------------------------------------------------------------

-- Code inventaire : PAT-<année>-<numéro sur 5 chiffres> (ex. PAT-2026-00001)
-- Un compteur par année : la numérotation repart à 1 chaque année et ne laisse
-- aucun trou (si l'insertion du bien échoue, le compteur est annulé avec elle).
CREATE TABLE compteur_code (
    annee           INTEGER PRIMARY KEY,
    dernier_numero  INTEGER NOT NULL CHECK (dernier_numero >= 0)
);

CREATE TABLE bien (
    id_bien             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code                VARCHAR(20) NOT NULL UNIQUE,      -- rempli par le trigger (RG01)
    designation         VARCHAR(200) NOT NULL,
    date_acquisition    DATE NOT NULL CHECK (date_acquisition <= CURRENT_DATE),
    valeur_acquisition  NUMERIC(14, 2) NOT NULL CHECK (valeur_acquisition >= 0),
    mode_acquisition    VARCHAR(30) NOT NULL
                        CHECK (mode_acquisition IN
                               ('achat', 'don_legs', 'transfert_inter_service', 'fabrication_interne')),
    acquisition_validee BOOLEAN NOT NULL DEFAULT FALSE,   -- RG04
    gere_par_lot        BOOLEAN NOT NULL DEFAULT FALSE,
    quantite            INTEGER NOT NULL DEFAULT 1 CHECK (quantite >= 1),
    observations        TEXT,
    id_categorie        INTEGER NOT NULL REFERENCES categorie (id_categorie)       ON DELETE RESTRICT,
    id_etat             INTEGER NOT NULL REFERENCES etat (id_etat)                 ON DELETE RESTRICT,
    id_localisation     INTEGER NOT NULL REFERENCES localisation (id_localisation) ON DELETE RESTRICT,
    -- un bien hors lot a toujours une quantité de 1
    CHECK (gere_par_lot OR quantite = 1)
);

-- Extension pour les équipements (mobilier, informatique, véhicules, etc.)
CREATE TABLE bien_equipement (
    id_bien       INTEGER PRIMARY KEY REFERENCES bien (id_bien) ON DELETE RESTRICT,
    marque        VARCHAR(100),
    modele        VARCHAR(100),
    numero_serie  VARCHAR(100)
);

-- Extension pour l'immobilier (bâtiments et terrains)
CREATE TABLE bien_immobilier (
    id_bien              INTEGER PRIMARY KEY REFERENCES bien (id_bien) ON DELETE RESTRICT,
    adresse              VARCHAR(255) NOT NULL,
    superficie           NUMERIC(12, 2) NOT NULL CHECK (superficie > 0),
    reference_cadastrale VARCHAR(100),
    nature               VARCHAR(10) NOT NULL CHECK (nature IN ('batiment', 'terrain'))
);

-- ---------------------------------------------------------------------
-- 4. MOUVEMENTS ET TRAÇABILITÉ
-- ---------------------------------------------------------------------

CREATE TABLE affectation (
    id_affectation  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type            VARCHAR(12) NOT NULL
                    CHECK (type IN ('affectation', 'transfert', 'retour')),
    date_debut      DATE NOT NULL DEFAULT CURRENT_DATE,
    date_fin        DATE,                                  -- NULL = affectation en cours
    motif           TEXT,
    quantite        INTEGER NOT NULL DEFAULT 1 CHECK (quantite >= 1),
    id_bien         INTEGER NOT NULL REFERENCES bien (id_bien)       ON DELETE RESTRICT,
    id_service      INTEGER NOT NULL REFERENCES service (id_service) ON DELETE RESTRICT,
    id_agent        INTEGER          REFERENCES agent (id_agent)     ON DELETE RESTRICT,
    valide_par      INTEGER          REFERENCES utilisateur (id_utilisateur) ON DELETE RESTRICT,
    CHECK (date_fin IS NULL OR date_fin >= date_debut)
);

CREATE TABLE sortie (
    id_sortie        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    motif_sortie     VARCHAR(20) NOT NULL
                     CHECK (motif_sortie IN ('reforme', 'cession', 'perte_vol', 'destruction')),
    date_demande     DATE NOT NULL DEFAULT CURRENT_DATE,
    valeur_residuelle NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (valeur_residuelle >= 0),
    statut           VARCHAR(12) NOT NULL DEFAULT 'en_attente'
                     CHECK (statut IN ('en_attente', 'validee')),
    date_validation  DATE,
    id_bien          INTEGER NOT NULL UNIQUE REFERENCES bien (id_bien) ON DELETE RESTRICT,  -- une seule sortie par bien
    valide_par       INTEGER REFERENCES utilisateur (id_utilisateur) ON DELETE RESTRICT,
    -- une sortie validée doit dire qui l'a validée et quand
    CHECK (statut <> 'validee' OR (date_validation IS NOT NULL AND valide_par IS NOT NULL))
);

CREATE TABLE historique (
    id_historique   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date_heure      TIMESTAMPTZ NOT NULL DEFAULT now(),
    action          VARCHAR(50) NOT NULL,
    details         TEXT,
    id_bien         INTEGER NOT NULL REFERENCES bien (id_bien) ON DELETE RESTRICT,
    id_utilisateur  INTEGER NOT NULL REFERENCES utilisateur (id_utilisateur) ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- 5. INDEX (jointures et recherches fréquentes : liste de 10 000 biens)
-- ---------------------------------------------------------------------

CREATE INDEX idx_bien_categorie     ON bien (id_categorie);
CREATE INDEX idx_bien_etat          ON bien (id_etat);
CREATE INDEX idx_bien_localisation  ON bien (id_localisation);
CREATE INDEX idx_bien_designation   ON bien (lower(designation));
CREATE INDEX idx_affectation_bien   ON affectation (id_bien);
CREATE INDEX idx_affectation_service ON affectation (id_service);
CREATE INDEX idx_affectation_agent  ON affectation (id_agent);
-- accélère le calcul des affectations en cours
CREATE INDEX idx_affectation_actives ON affectation (id_bien) WHERE date_fin IS NULL;
CREATE INDEX idx_historique_bien    ON historique (id_bien, date_heure);
CREATE INDEX idx_localisation_parent ON localisation (id_parent);

-- ---------------------------------------------------------------------
-- 6. TRIGGERS (règles de gestion garanties par la base)
-- ---------------------------------------------------------------------

-- RG01 : prochain code inventaire d'une année donnée.
-- L'instruction INSERT ... ON CONFLICT crée la ligne de l'année si elle n'existe pas,
-- sinon incrémente le compteur. La ligne est verrouillée pendant l'opération :
-- deux biens créés au même instant n'obtiennent jamais le même numéro.
CREATE FUNCTION fn_prochain_code(p_annee INTEGER) RETURNS VARCHAR AS $$
DECLARE
    v_numero INTEGER;
BEGIN
    INSERT INTO compteur_code (annee, dernier_numero) VALUES (p_annee, 1)
    ON CONFLICT (annee) DO UPDATE SET dernier_numero = compteur_code.dernier_numero + 1
    RETURNING dernier_numero INTO v_numero;

    -- lpad tronquerait un numéro de plus de 5 chiffres : on l'évite explicitement
    RETURN 'PAT-' || p_annee || '-'
           || CASE WHEN v_numero > 99999 THEN v_numero::text
                   ELSE lpad(v_numero::text, 5, '0') END;
END;
$$ LANGUAGE plpgsql;

-- RG01 : code inventaire automatique et non modifiable
CREATE FUNCTION fn_bien_code() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.code := fn_prochain_code(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
    ELSIF NEW.code IS DISTINCT FROM OLD.code THEN
        RAISE EXCEPTION 'Le code inventaire d''un bien ne peut pas être modifié';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bien_code
    BEFORE INSERT OR UPDATE ON bien
    FOR EACH ROW EXECUTE FUNCTION fn_bien_code();

-- RG07 : un seul affectataire actif pour un bien hors lot ;
-- pour un lot, la somme des quantités affectées ne dépasse pas la quantité du bien.
-- Le verrou (FOR UPDATE) sur le bien évite que deux affectations simultanées
-- dépassent la quantité.
CREATE FUNCTION fn_affectation_quantite() RETURNS trigger AS $$
DECLARE
    v_quantite_bien INTEGER;
    v_deja_affecte  INTEGER;
BEGIN
    SELECT quantite INTO v_quantite_bien
      FROM bien WHERE id_bien = NEW.id_bien FOR UPDATE;

    SELECT COALESCE(SUM(quantite), 0) INTO v_deja_affecte
      FROM affectation
     WHERE id_bien = NEW.id_bien
       AND date_fin IS NULL
       AND type <> 'retour'
       AND id_affectation <> COALESCE(NEW.id_affectation, -1);

    IF v_deja_affecte + NEW.quantite > v_quantite_bien THEN
        RAISE EXCEPTION 'Quantité insuffisante : % déjà affectée(s) sur % pour ce bien',
                        v_deja_affecte, v_quantite_bien;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_affectation_quantite
    BEFORE INSERT OR UPDATE ON affectation
    FOR EACH ROW
    WHEN (NEW.date_fin IS NULL AND NEW.type <> 'retour')
    EXECUTE FUNCTION fn_affectation_quantite();

-- RG17 : l'historique est en ajout seul (ni modification, ni suppression)
CREATE FUNCTION fn_historique_ajout_seul() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'L''historique est en ajout seul : % interdit', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_historique_ajout_seul
    BEFORE UPDATE OR DELETE ON historique
    FOR EACH ROW EXECUTE FUNCTION fn_historique_ajout_seul();

-- ---------------------------------------------------------------------
-- 7. DONNÉES INITIALES (modifiables ensuite par l'administrateur)
-- ---------------------------------------------------------------------

INSERT INTO categorie (libelle, famille) VALUES
    ('Mobilier',               'equipement'),
    ('Informatique & Télécom', 'equipement'),
    ('Véhicules',              'equipement'),
    ('Équipements techniques', 'equipement'),
    ('Immobilier',             'immobilier'),
    ('Autres',                 'equipement');

INSERT INTO etat (libelle, est_final) VALUES
    ('En stock',       FALSE),
    ('En service',     FALSE),
    ('En maintenance', FALSE),
    ('Cédé',           TRUE),
    ('Réformé',        TRUE),
    ('Perdu',          TRUE);

INSERT INTO role (libelle) VALUES
    ('Administrateur'),
    ('Gestionnaire'),
    ('Responsable');
