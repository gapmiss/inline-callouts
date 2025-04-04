import {
	App,
	PluginSettingTab,
	Setting
} from 'obsidian';
import InlineCalloutsPlugin from 'src/main';

export interface InlineCalloutsSettings {
	enableSuggester: boolean;
	enableTraiingSpace: boolean;
	enableEditing: boolean;
}

export const DEFAULT_SETTINGS: InlineCalloutsSettings = {
	enableSuggester: true,
	enableTraiingSpace: true,
	enableEditing: true
}

export class InlineCalloutsSettingTab extends PluginSettingTab {
	plugin: InlineCalloutsPlugin;

	constructor(app: App, plugin: InlineCalloutsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Enable icon suggestions')
			.setDesc('In editing view (source & live preview modes), enable inline icon auto-complete suggestions.')
			.setClass("inline-callouts-enable-icon-suggestions")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.enableSuggester)
					.onChange(async newValue => {
						this.plugin.settings.enableSuggester = newValue;
						await this.plugin.saveSettings();
					})
			});

		new Setting(containerEl)
			.setName('Enable editing command/menu')
			.setDesc('In editing view (source & live preview modes), enable "Modify inline callout" command and context menu option.')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.enableEditing)
					.onChange(async newValue => {
						this.plugin.settings.enableEditing = newValue;
						await this.plugin.saveSettings();
					})
			})

		new Setting(containerEl)
			.setName('Include trailing space')
			.setDesc('When inserting a new inline callout, append a trailing space immediately after the inline callout code.')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.enableTraiingSpace)
					.onChange(async newValue => {
						this.plugin.settings.enableTraiingSpace = newValue;
						await this.plugin.saveSettings();
					})
			})

	}
}
