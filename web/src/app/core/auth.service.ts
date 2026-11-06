import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { API_URL } from './api-url';
import { UserProfile } from './models';

interface LoginResponse { accessToken: string; user: UserProfile; }

const TOKEN_KEY = 'patrimoine.token';
const USER_KEY = 'patrimoine.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly user = signal<UserProfile | null>(this.readStoredUser());
  readonly isLoggedIn = computed(() => this.user() !== null);

  get token(): string | null {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, { email, password }).pipe(
      tap((response) => {
        try {
          localStorage.setItem(TOKEN_KEY, response.accessToken);
          localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        } catch { /* storage unavailable: the session lasts until reload */ }
        this.user.set(response.user);
      }),
    );
  }

  logout() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* ignore */ }
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  hasRole(...roles: string[]): boolean {
    const user = this.user();
    return !!user && roles.includes(user.role);
  }

  private readStoredUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return localStorage.getItem(TOKEN_KEY) && raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
