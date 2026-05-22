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

		new Setting(contentEl)
			.setName('Icon')
			.setDesc('To select an icon, click the button. Default: info')
			.addButton((cb) => {
				cb
					.setIcon(this.calloutIcon ? this.calloutIcon : "lucide-info")
					.setTooltip("Select icon")
					.onClick((e) => {
						e.preventDefault();
						const modal = new IconSuggest(this.plugin, (icon) => {
							this.calloutIcon = icon;
							this.buildPreview();
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
								});
								modal.open();
								break;
							}
						}
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

		const hexToRgb = (hex: string) => {
			const r = parseInt(hex.slice(1, 3), 16);
			const g = parseInt(hex.slice(3, 5), 16);
			const b = parseInt(hex.slice(5, 7), 16);
			return `${r}, ${g}, ${b}`;
		};

		function rgbToHex(r: number, g: number, b: number) {
			return '#' + ((1 << 24) + (r << 16) + (g << 8) + b)
				.toString(16)
				.slice(1)
				.toUpperCase();
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
				let r = 0;
				let g = 0;
				let b = 0;
				if (this.calloutColor) {
					const colorArr = this.calloutColor.split(",");
					r = Number(colorArr[0] ?? 0);
					g = Number(colorArr[1] ?? 0);
					b = Number(colorArr[2] ?? 0);
				}
				cb.setValue(rgbToHex(r, g, b))
					.onChange((value) => {
						this.calloutColor = hexToRgb(value);
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
