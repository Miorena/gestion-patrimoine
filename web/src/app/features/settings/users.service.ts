import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from '../../core/http/api-url';
import { RoleOption, UserPayload, UserRow } from './settings.models';

@Injectable({ providedIn: 'root' })
export class UsersService {
	private readonly http = inject(HttpClient);
	private readonly url = `${API_URL}/users`;

	list() {
		return this.http.get<UserRow[]>(this.url);
	}

	roles() {
		return this.http.get<RoleOption[]>(`${this.url}/roles`);
	}

	create(payload: UserPayload) {
		return this.http.post<UserRow>(this.url, payload);
	}

	update(id: number, payload: Partial<Pick<UserPayload, 'name' | 'roleId' | 'password'>>) {
		return this.http.patch<UserRow>(`${this.url}/${id}`, payload);
	}
}
