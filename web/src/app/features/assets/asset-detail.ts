import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, numberAttribute, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AssetsService } from '../../core/assets.service';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/http-error';
import { toHistoryView } from '../../core/history-format';
import {
  ACQUISITION_MODES, Asset, HistoryEntry, Lookups, REAL_ESTATE_KINDS, ROLE,
} from '../../core/models';
import { stateClass } from '../../core/state-style';

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
  protected readonly lookups = signal<Lookups | null>(null);
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

  // History rows with the stored JSON turned into readable "field: before → after" lines
  protected readonly historyView = computed(() =>
    this.history().map((entry) => toHistoryView(entry, this.lookups())),
  );
  protected readonly stateClass = stateClass;

  constructor() {
    // Cached after the first call: needed to show category / state / location names in the history
    this.assetsService.lookups().subscribe({ next: (lookups) => this.lookups.set(lookups) });

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
