import {
	Modal,
	Notice,
	Setting,
	Editor
} from 'obsidian';
import type InlineCalloutsPlugin from "../main";
import { IconSuggest } from '../suggest/icon';
import { InlineCallout } from '../callout/builder';

export class NewInlineCalloutModal extends Modal {

	public calloutIcon: string = 'lucide-info';
	public calloutColor: string | undefined;
	public calloutLabel: string | undefined;
	previewEl: HTMLDivElement;
	activeDoc: Document = window.activeDocument ?? window.document;

	constructor(
		private plugin: InlineCalloutsPlugin,
		private editor: Editor
	) {
		super(plugin.app);

		this.containerEl.addClass("new-inline-callout-modal");

		this.onOpen = () => {
			if (this.editor.getSelection()) {
				this.calloutLabel = this.editor.getSelection();
			}
			this.display(true);
		}
	}

	private display(_focus?: boolean, _clearColor?: boolean) {
		const { contentEl } = this;
		contentEl.empty();

		this.titleEl.setText("New inline callout");

		new Setting(contentEl)
			.setName('Icon')
			.setDesc('To select an icon, click the button. Default: info')
			.addButton((cb) => {
				cb
					.setIcon(this.calloutIcon)
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
				t.setValue(this.calloutLabel ?? '');
				t.onChange((v) => {
					this.calloutLabel = v;
					this.buildPreview();
				});
			});

		const hexToRgb = (hex: string) => {
			const r = parseInt(hex.slice(1, 3), 16);
			const g = parseInt(hex.slice(3, 5), 16);
			const b = parseInt(hex.slice(5, 7), 16);
			return `${r}, ${g}, ${b}`;
		};

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
							this.display(false, false);
							window.setTimeout(() => {
								const dropdown = this.activeDoc.querySelector<HTMLSelectElement>(".new-inline-callout-modal .inline-callouts-color-dropdown .dropdown");
								dropdown?.focus();
							}, 10);
						}
					})
			})
			.addColorPicker((cb) => {
				cb.setValue(this.calloutColor ?? '#000000')
					.onChange((value) => {
						this.calloutColor = hexToRgb(value);
						const dropdown = this.activeDoc.querySelector<HTMLSelectElement>(".new-inline-callout-modal .inline-callouts-color-dropdown .dropdown");
						if (dropdown) dropdown.value = '';
						this.buildPreview();
						window.setTimeout(() => {
							const picker = this.activeDoc.querySelector<HTMLInputElement>(".new-inline-callout-modal input[type='color']");
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
				b.setButtonText("Insert")
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
							const trailingSpace = this.plugin.settings.enableTraiingSpace ? " " : "";
							this.editor.getDoc().replaceSelection(
								`\`[!!${this.calloutIcon.replace("lucide-", "")}${firstPipe + (this.calloutLabel !== undefined ? this.calloutLabel : "")}${this.calloutColor ? secondPipe + this.calloutColor : ""}]\`${trailingSpace}`,
							);
							// const cursor = this.editor.getCursor();
						} catch (e) {
							console.error(e)
							new Notice(
								"There was an issue inserting the inline callout. Please check the developer console for details."
							);
						}
						IconSuggest.icon = 'info';
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
