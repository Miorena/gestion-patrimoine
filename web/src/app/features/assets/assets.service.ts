import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { API_URL } from '../../core/http/api-url';
import { Asset, AssetPayload } from './models/asset.model';
import { GlobalHistoryEntry, HistoryEntry, HistorySortKey } from './models/history.model';
import { Lookups } from './models/lookup.model';
import { Page } from '../../shared/models/page.model';

export interface AssetFilters {
	page: number;
	limit: number;
	search?: string;
	categoryId?: number | null;
	stateId?: number | null;
}

export interface HistoryFilters {
	page: number;
	limit: number;
	search?: string;
	action?: string;
	sort: HistorySortKey;
	order: 'ASC' | 'DESC';
}

@Injectable({ providedIn: 'root' })
export class AssetsService {
	private readonly http = inject(HttpClient);
	private readonly url = `${API_URL}/assets`;

	// Les listes de référence (catégories, états, localisations) changent rarement : chargées une fois, puis réutilisées
	private lookups$?: Observable<Lookups>;

	lookups() {
		return (this.lookups$ ??= this.http.get<Lookups>(`${API_URL}/lookups`).pipe(shareReplay(1)));
	}

	list(filters: AssetFilters) {
		let params = new HttpParams().set('page', filters.page).set('limit', filters.limit);
		if (filters.search) params = params.set('search', filters.search);
		if (filters.categoryId) params = params.set('categoryId', filters.categoryId);
		if (filters.stateId) params = params.set('stateId', filters.stateId);
		return this.http.get<Page<Asset>>(this.url, { params });
	}

	get(id: number) {
		return this.http.get<Asset>(`${this.url}/${id}`);
	}

	history(id: number) {
		return this.http.get<HistoryEntry[]>(`${this.url}/${id}/history`);
	}

	// Historique de tous les biens (page « Historique » du menu)
	globalHistory(filters: HistoryFilters) {
		let params = new HttpParams()
			.set('page', filters.page)
			.set('limit', filters.limit)
			.set('sort', filters.sort)
			.set('order', filters.order);
		if (filters.search) params = params.set('search', filters.search);
		if (filters.action) params = params.set('action', filters.action);
		return this.http.get<Page<GlobalHistoryEntry>>(`${this.url}/history`, { params });
	}

	create(payload: AssetPayload) {
		return this.http.post<Asset>(this.url, payload);
	}

	update(id: number, payload: Partial<AssetPayload>) {
		return this.http.patch<Asset>(`${this.url}/${id}`, payload);
	}

	validateAcquisition(id: number) {
		return this.http.post<Asset>(`${this.url}/${id}/validate-acquisition`, {});
	}
}
