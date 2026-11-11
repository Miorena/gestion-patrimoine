export interface UserProfile { id: number; name: string; email: string; role: string; }

// Libellés des rôles (mêmes valeurs que la base de données)
export const ROLE = {
	ADMINISTRATOR: 'Administrateur',
	MANAGER: 'Gestionnaire',
	SUPERVISOR: 'Responsable',
} as const;
