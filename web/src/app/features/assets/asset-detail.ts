import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, numberAttribute, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AssetsService } from '../../core/assets.service';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/http-error';
import {
  ACQUISITION_MODES, Asset, HISTORY_ACTIONS, HistoryEntry, REAL_ESTATE_KINDS, ROLE,
} from '../../core/models';

@Component({
  selector: 'app-asset-detail',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './asset-detail.html',
})
export class AssetDetail {
  private readonly assetsService = inject(AssetsService);
  private readonly auth = inject(AuthService);

  // Route parameter :id (bound through withComponentInputBinding)
  readonly id = input.required({ transform: numberAttribute });

  protected readonly asset = signal<Asset | null>(null);
  protected readonly history = signal<HistoryEntry[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly canEdit = this.auth.hasRole(ROLE.ADMINISTRATOR, ROLE.MANAGER);
  protected readonly canValidate = computed(
    () => this.auth.hasRole(ROLE.ADMINISTRATOR, ROLE.SUPERVISOR) && this.asset()?.acquisitionValidated === false,
  );
  protected readonly modeLabel = computed(
    () => ACQUISITION_MODES.find((m) => m.value === this.asset()?.acquisitionMode)?.label,
  );
  protected readonly kindLabel = computed(
    () => REAL_ESTATE_KINDS.find((k) => k.value === this.asset()?.realEstate?.kind)?.label,
  );

  protected actionLabel(action: string) {
    return HISTORY_ACTIONS[action] ?? action;
  }

  constructor() {
    // Reloads whenever the :id route parameter changes
    effect(() => {
      this.id();
      untracked(() => this.load());
    });
  }

  protected validate() {
    this.busy.set(true);
    this.assetsService.validateAcquisition(this.id()).subscribe({
      next: (asset) => {
        this.asset.set(asset);
        this.error.set(null);
        this.busy.set(false);
        this.loadHistory();
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.busy.set(false);
      },
    });
  }

  private load() {
    this.assetsService.get(this.id()).subscribe({
      next: (asset) => this.asset.set(asset),
      error: (error) => this.error.set(errorMessage(error)),
    });
    this.loadHistory();
  }

  private loadHistory() {
    this.assetsService.history(this.id()).subscribe({
      next: (entries) => this.history.set(entries),
      error: () => this.history.set([]),
    });
  }
}
