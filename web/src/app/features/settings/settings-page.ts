import { Component, signal } from '@angular/core';
import { OrganizationTab } from './organization-tab/organization-tab';
import { UsersTab } from './users-tab/users-tab';

type SettingsTab = 'users' | 'organization';

@Component({
	selector: 'app-settings-page',
	imports: [UsersTab, OrganizationTab],
	templateUrl: './settings-page.html',
})
export class SettingsPage {
	protected readonly tab = signal<SettingsTab>('users');
}
