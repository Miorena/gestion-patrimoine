import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '../../core/http/api-url';
import { Agent, AgentPayload, Direction, OrgService } from './settings.models';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
	private readonly http = inject(HttpClient);
	private readonly url = `${API_URL}/organization`;

	// Toute l'organisation d'un coup : directions, avec leurs services et leurs agents
	tree() {
		return this.http.get<Direction[]>(this.url);
	}

	createDirection(name: string) {
		return this.http.post<Direction>(`${this.url}/directions`, { name });
	}

	createService(name: string, directionId: number) {
		return this.http.post<OrgService>(`${this.url}/services`, { name, directionId });
	}

	createAgent(payload: AgentPayload) {
		return this.http.post<Agent>(`${this.url}/agents`, payload);
	}

	removeDirection(id: number) {
		return this.http.delete<void>(`${this.url}/directions/${id}`);
	}

	removeService(id: number) {
		return this.http.delete<void>(`${this.url}/services/${id}`);
	}

	removeAgent(id: number) {
		return this.http.delete<void>(`${this.url}/agents/${id}`);
	}
}
