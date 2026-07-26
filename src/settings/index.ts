import {
	App,
	PluginSettingTab,
	SettingDefinitionItem
} from 'obsidian';
import InlineCalloutsPlugin from '../main';

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

	// Obsidian renders the tab from these definitions and indexes them for
	// settings search. Controls bind directly to this.plugin.settings[key].
	getSettingDefinitions(): SettingDefinitionItem<keyof InlineCalloutsSettings>[] {
		return [
			{
				name: 'Enable icon suggestions',
				desc: 'In editing view (source & live preview modes), enable inline icon auto-complete suggestions.',
				control: { type: 'toggle', key: 'enableSuggester' },
			},
			{
				name: 'Enable editing command/menu',
				desc: 'In editing view (source & live preview modes), enable "modify inline callout" command and context menu option.',
				control: { type: 'toggle', key: 'enableEditing' },
			},
			{
				name: 'Include trailing space',
				desc: 'When inserting a new inline callout, append a trailing space immediately after the inline callout code.',
				control: { type: 'toggle', key: 'enableTraiingSpace' },
			},
		];
	}
}
