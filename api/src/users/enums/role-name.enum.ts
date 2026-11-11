// Les valeurs correspondent à role.libelle en base de données
export enum RoleName {
  ADMINISTRATOR = 'Administrateur',
  MANAGER = 'Gestionnaire',
  SUPERVISOR = 'Responsable',
  CONSULTANT = 'Consultant', // lecture seule
  DEPARTMENT_HEAD = 'Chef de service',
  AUDITOR = 'Auditeur / Comptable', // lecture seule
}
