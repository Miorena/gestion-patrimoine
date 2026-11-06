import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { AssetsService } from '../../core/assets.service';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/http-error';
import { Asset, Lookups, ROLE } from '../../core/models';
import { stateClass } from '../../core/state-style';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-asset-list',
  imports: [RouterLink, ReactiveFormsModule, DecimalPipe],
  templateUrl: './asset-list.html',
})
export class AssetList {
  private readonly assetsService = inject(AssetsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly categoryId = new FormControl<number | null>(null);
  protected readonly stateId = new FormControl<number | null>(null);

  protected readonly lookups = signal<Lookups | null>(null);
  protected readonly assets = signal<Asset[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly canCreate = this.auth.hasRole(ROLE.ADMINISTRATOR, ROLE.MANAGER);

  constructor() {
    this.assetsService.lookups().subscribe({
      next: (lookups) => this.lookups.set(lookups),
      error: (error) => this.error.set(errorMessage(error)),
    });

    // Typing in the search box reloads after a short pause
    this.search.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.applyFilters());
    this.load();
  }

  protected readonly stateClass = stateClass;

  // Clicking anywhere on a row opens the asset (the eye icon does the same, for keyboard users)
  protected open(id: number) {
    this.router.navigate(['/assets', id]);
  }

  protected applyFilters() {
    this.page.set(1);
    this.load();
  }

  protected goTo(page: number) {
    this.page.set(page);
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.assetsService
      .list({
        page: this.page(),
        limit: PAGE_SIZE,
        search: this.search.value.trim(),
        categoryId: this.categoryId.value,
        stateId: this.stateId.value,
      })
      .subscribe({
        next: (result) => {
          this.assets.set(result.items);
          this.total.set(result.total);
          this.error.set(null);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
  }
}
