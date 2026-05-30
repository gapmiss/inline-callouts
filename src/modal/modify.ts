import {
	Modal,
	Notice,
	Setting,
	Editor
} from 'obsidian';
import type InlineCalloutsPlugin from "../main";
import { IconSuggest } from '../suggest/icon';
import { InlineCallout } from '../callout/builder';

interface ContextData {
	type: string;
	curLine: string;
	match: string | null;
	range: [number, number];
}

export class ModifyInlineCalloutModal extends Modal {

	public calloutIcon: string;
	public calloutColor: string | undefined;
	public calloutLabel: string | undefined;
	previewEl: HTMLDivElement;
	activeDoc: Document = window.activeDocument ?? window.document;

	constructor(
		private plugin: InlineCalloutsPlugin,
		private editor: Editor,
		private contextType: ContextData
	) {
		super(plugin.app);

		this.containerEl.addClass("modify-inline-callout-modal");

		this.onOpen = () => this.display(true);
	}

	private display(_focus?: boolean, clearColor?: boolean, preserveIcon?: boolean) {
		const { contentEl } = this;
		contentEl.empty();

		this.titleEl.setText("Modify inline callout");

		const content = (this.contextType.match ?? '').replace("[!!", "").replace("]", "");
		const parts: string[] = content.split('|');

		// icon
		if (!clearColor) {
			if (!preserveIcon) {
				this.calloutIcon = parts[0] ? parts[0].trim().replace(/\\+$/, '').toLowerCase() : 'info';
			}
		}

		// label
		if (!clearColor) {
			this.calloutLabel = this.calloutLabel ? this.calloutLabel : (parts[1] ? parts[1].trim().replace(/\\+$/, '') : undefined);
		}

		// color
		if (clearColor) {
			this.calloutColor = '';
		} else {
			this.calloutColor = this.calloutColor ? this.calloutColor : (parts[2] ? parts[2].trim() : undefined);
		}

		const isNoIcon = this.calloutIcon === 'none' || this.calloutIcon === 'blank' || this.calloutIcon?.endsWith('-none');
		new Setting(contentEl)
			.setName('Icon')
			.setDesc('To select an icon, click the button. Default: info')
			.addButton((cb) => {
				if (isNoIcon) {
					cb.setButtonText('None');
				} else {
					cb.setIcon(this.calloutIcon ? this.calloutIcon : "lucide-info");
				}
				cb.setTooltip(isNoIcon ? "No icon" : "Select icon")
					.onClick((e) => {
						e.preventDefault();
						const modal = new IconSuggest(this.plugin, (icon) => {
							this.calloutIcon = icon;
							this.buildPreview();
							this.display(false, false, true);
						});
						modal.open();
					});
				cb.buttonEl.setAttribute("data-note-toolbar-no-icon", "false");
				this.plugin.registerDomEvent(
					cb.buttonEl, 'keydown', (e) => {
						switch (e.key) {
							case "Enter":
							case " ": {
								e.preventDefault();
								const modal = new IconSuggest(this.plugin, (icon) => {
									this.calloutIcon = icon;
									this.buildPreview();
									this.display(false, false, true);
								});
								modal.open();
								break;
							}
						}
					});
			})
			.addExtraButton((cb) => {
				cb.setIcon('circle-off')
					.setTooltip('No icon')
					.onClick(() => {
						this.calloutIcon = 'none';
						this.buildPreview();
						this.display(false, false, true);
					});
			});

		new Setting(contentEl)
			.setName("Label")
			.setDesc("Default: blank")
			.addText((t) => {
				t.setValue(this.calloutLabel ? this.calloutLabel : '');
				t.onChange((v) => {
					if (v === '') {
						this.calloutLabel = undefined;
					} else {
						this.calloutLabel = v;
					}
					this.buildPreview();
				});
			});

		function colorToHex(color: string | undefined): string {
			if (!color) return '#000000';
			if (color.startsWith('#')) return color;
			// Convert RGB string to hex
			const parts = color.split(',').map(s => parseInt(s.trim(), 10));
			if (parts.length >= 3 && parts.every(n => !isNaN(n))) {
				return '#' + ((1 << 24) + (parts[0] << 16) + (parts[1] << 8) + parts[2])
					.toString(16)
					.slice(1)
					.toUpperCase();
			}
			return '#000000';
		}

		new Setting(contentEl)
			.setName('Color')
			.setDesc('Pick a color using the dropdown or color picker. Default: Obsidian\'s base color')
			.setClass('inline-callouts-color-dropdown')
			.addDropdown((cb) => {
				cb.addOptions({
					"": "",
					"var(--color-blue-rgb)": "Blue",
					"var(--color-cyan-rgb)": "Cyan",
					"var(--color-green-rgb)": "Green",
					"var(--color-orange-rgb)": "Orange",
					"var(--color-pink-rgb)": "Pink",
					"var(--color-purple-rgb)": "Purple",
					"var(--color-red-rgb)": "Red",
					"var(--color-yellow-rgb)": "Yellow",
				})
					.setValue(this.calloutColor?.startsWith("var(--color") ? this.calloutColor : '')
					.onChange((value) => {
						if (value !== '') {
							this.calloutColor = value;
							this.buildPreview();
							this.display(false, false, true);
							window.setTimeout(() => {
								const dropdown = this.activeDoc.querySelector<HTMLSelectElement>(".modify-inline-callout-modal .inline-callouts-color-dropdown .dropdown");
								dropdown?.focus();
							}, 10);
						}
					})
			})
			.addColorPicker((cb) => {
				cb.setValue(colorToHex(this.calloutColor))
					.onChange((value) => {
						this.calloutColor = value;
						const dropdown = this.activeDoc.querySelector<HTMLSelectElement>(".modify-inline-callout-modal .inline-callouts-color-dropdown .dropdown");
						if (dropdown) dropdown.value = '';
						this.buildPreview();
						window.setTimeout(() => {
							const picker = this.activeDoc.querySelector<HTMLInputElement>(".modify-inline-callout-modal input[type='color']");
							picker?.focus();
						}, 10);
					});
			})
			.addExtraButton((ex) => {
				ex.setIcon('refresh-ccw')
					.setTooltip('Reset to no color')
					.onClick(() => {
						this.calloutColor = '';
						this.display(false, true);
					})
			});

		new Setting(contentEl)
			.setName('Preview');

		this.previewEl = this.contentEl.createDiv({
			cls: "inline-callouts-modal-preview"
		});

		this.buildPreview();

		new Setting(contentEl)
			.addButton((b) =>
				b.setButtonText("Save")
					.setCta()
					.onClick(() => {
						try {
							let firstPipe = '';
							let secondPipe = '';

							if (this.calloutLabel !== undefined || this.calloutColor !== undefined) {
								firstPipe = "|";
							}

							if (
								(this.calloutLabel === undefined && this.calloutColor !== undefined) ||
								(this.calloutLabel !== undefined && this.calloutColor !== undefined)
							) {
								secondPipe = "|";
							}

							const cursor = this.editor.getCursor();
							this.editor.replaceRange(
								`\`[!!${this.calloutIcon.replace("lucide-", "")}${firstPipe + (this.calloutLabel !== undefined ? this.calloutLabel : "")}${this.calloutColor ? secondPipe + this.calloutColor : ""}]\``,
								{ line: cursor.line, ch: this.contextType.range[0] }, { line: cursor.line, ch: this.contextType.range[1] }
							);

						} catch (e) {
							console.error(e);
							new Notice(
								"There was an issue saving the inline callout. Check the developer console for details."
							);
						}
						this.close();
					})
			);

	}

	buildPreview() {
		this.previewEl.empty();
		this.previewEl.setAttr("style", "margin-bottom: 1em;");
		const inlineCallout = new InlineCallout();
		const newEl = inlineCallout.build('[!!' + this.calloutIcon + '|' + (this.calloutLabel ? this.calloutLabel : '') + '|' + this.calloutColor + ']');
		this.previewEl.appendChild(newEl);
	}

}
