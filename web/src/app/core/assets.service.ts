import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from './api-url';
import { Asset, AssetPayload, HistoryEntry, Lookups, Page } from './models';

export interface AssetFilters {
  page: number;
  limit: number;
  search?: string;
  categoryId?: number | null;
  stateId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class AssetsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/assets`;

  lookups() {
    return this.http.get<Lookups>(`${API_URL}/lookups`);
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
