// ----- Utilisateurs -----
export interface UserRow {
	id: number;
	name: string;
	email: string;
	roleId: number;
	role: string; // libellé du rôle
}

export interface RoleOption { id: number; label: string; }

export interface UserPayload { name: string; email: string; password: string; roleId: number; }

// ----- Organisation : direction > service > agent -----
export interface Agent {
	id: number;
	lastName: string;
	firstName: string;
	position: string | null;
	serviceId: number;
}

export interface OrgService {
	id: number;
	name: string;
	directionId: number;
	agents: Agent[];
}

export interface Direction {
	id: number;
	name: string;
	services: OrgService[];
}

export interface AgentPayload {
	lastName: string;
	firstName: string;
	position?: string;
	serviceId: number;
}
