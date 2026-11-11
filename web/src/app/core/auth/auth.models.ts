export interface UserProfile { id: number; name: string; email: string; role: string; }

// Libellés des rôles (mêmes valeurs que la base de données)
export const ROLE = {
	ADMINISTRATOR: 'Administrateur',
	MANAGER: 'Gestionnaire',
	SUPERVISOR: 'Responsable',
	CONSULTANT: 'Consultant', // lecture seule
	DEPARTMENT_HEAD: 'Chef de service',
	AUDITOR: 'Auditeur / Comptable', // lecture seule
} as const;
