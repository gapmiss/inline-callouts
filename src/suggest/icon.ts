import {
	getIconIds,
	setIcon,
	IconName,
	SuggestModal
} from 'obsidian';
import type InlineCalloutsPlugin from "../main";

export class IconSuggest extends SuggestModal<IconName> {
	public plugin: InlineCalloutsPlugin;
	private callback: (icon: string) => void;
	static icon: string = 'info';

	constructor(plugin: InlineCalloutsPlugin, callback: (icon: string) => void) {
		super(plugin.app);
		this.modalEl.addClass("inline-callout-icon-select-modal");
		this.plugin = plugin;
		this.callback = callback;
		this.setPlaceholder("Search for an icon");
		this.setInstructions([
			{ command: '↑↓', purpose: 'to navigate' },
			{ command: '↵', purpose: 'to use' },
			{ command: 'esc', purpose: 'to dismiss' },
		]);
	}

	getSuggestions(inputStr: string): IconName[] {
		const iconIds = getIconIds();
		const iconSuggestions: IconName[] = [];
		const lowerCaseInputStr = inputStr.toLowerCase();
		// iconSuggestions.push("No icon");
		iconIds.forEach((icon: IconName) => {
			if (icon.toLowerCase().contains(lowerCaseInputStr)) {
				iconSuggestions.push(icon);
			}
		});
		return iconSuggestions;
	}

	renderSuggestion(icon: IconName, el: HTMLElement): void {
		el.addClass("inline-callout-icon-suggestion");
		let iconWrapper = el.createDiv();
		let iconName = el.createSpan();
		iconName.setAttr("style", "margin-left: .75em; vertical-align:top;");
		let iconGlyph = el.createSpan();
		if (icon === "No icon") {
			iconName.setText(icon);
		}
		else {
			iconName.setText((icon.startsWith("lucide-") ? icon.substring(7) : icon) + " ");
			setIcon(iconGlyph, icon);
		}
		iconWrapper.appendChild(iconGlyph);
		iconWrapper.appendChild(iconName);
	}

	onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
		setIcon(activeDocument.querySelector('[data-note-toolbar-no-icon]')!, item);
		IconSuggest.icon = item;
		this.callback(item);
		this.close();
	}
}
