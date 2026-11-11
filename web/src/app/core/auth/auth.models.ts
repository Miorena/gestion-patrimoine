export interface UserProfile { id: number; name: string; email: string; role: string; }

// Role labels (same values as the database)
export const ROLE = {
	ADMINISTRATOR: 'Administrateur',
	MANAGER: 'Gestionnaire',
	SUPERVISOR: 'Responsable',
} as const;
