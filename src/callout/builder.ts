import {
	getIconIds,
	setIcon
} from 'obsidian';

function parseColorToRgb(color: string): string | null {
	const trimmed = color.trim();

	// Hex color (3, 4, 6, or 8 digit)
	if (trimmed.startsWith('#')) {
		let hex = trimmed.slice(1);

		// Expand 3-digit hex to 6-digit
		if (hex.length === 3) {
			hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
		}
		// Expand 4-digit hex (with alpha) to 8-digit
		if (hex.length === 4) {
			hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
		}

		// Parse 6-digit or 8-digit hex
		if (hex.length === 6 || hex.length === 8) {
			const r = parseInt(hex.slice(0, 2), 16);
			const g = parseInt(hex.slice(2, 4), 16);
			const b = parseInt(hex.slice(4, 6), 16);

			if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
				return `${r}, ${g}, ${b}`;
			}
		}
		return null;
	}

	// Already RGB format (e.g., "255, 0, 0")
	return trimmed;
}

function isNoIcon(icon: string): boolean {
	return icon === 'none' || icon === 'blank' || icon.endsWith('-none');
}

export class InlineCallout {

	newEl: HTMLSpanElement;
	iconEl: HTMLSpanElement;
	labelEl: HTMLSpanElement;
	textEl: HTMLSpanElement;

	constructor() {
		this.newEl = createSpan();
		this.iconEl = createSpan();
		this.labelEl = createSpan();
		this.textEl = createSpan();
	}

	public build(text: string): HTMLElement {

		// text content from <code>
		const part: string = text.substring(3);
		const content: string = part.slice(0, -1);
		// parts array split on pipe
		const parts: string[] = content.split('|');
		// icon
		const calloutIcon: string | null = parts[0] ? parts[0].trim().replace(/\\+$/, '').toLowerCase() : null;
		// label
		const calloutLabel: string | null = parts[1] ? parts[1].trim().replace(/\\+$/, '') : null;
		// color
		const calloutColor: string | null = parts[2] ? parts[2].trim() : null;
		let calloutColorStyle: string;

		// no content, return <code>
		const noIcon = calloutIcon ? isNoIcon(calloutIcon) : false;
		if (
			!content.length
			|| parts.length === 0
			|| !calloutIcon
			|| (!noIcon && getIconIds().indexOf('lucide-' + calloutIcon) == -1 && getIconIds().indexOf(calloutIcon) == -1) // 404, no icon found
		) {
			const codeEl = createEl("code");
			codeEl.setText(text);
			return codeEl;
		}

		this.newEl.addClass("inline-callout");
		this.newEl.setAttr("data-inline-callout", calloutIcon);
		this.iconEl.addClass("inline-callout-icon");
		this.iconEl.setAttr("data-tooltip-position", 'top');
		this.labelEl.addClass("inline-callout-label");

		// icon only
		if (parts.length === 1) {
			if (!noIcon) {
				this.iconEl.setAttr("aria-label", calloutIcon);
				setIcon(this.iconEl, calloutIcon);
				this.newEl.appendChild(this.iconEl);
			}
			return this.newEl;
		}

		// icon and color only
		if (!calloutLabel && calloutColor) {
			if (!noIcon) {
				const rgb = parseColorToRgb(calloutColor);
				if (rgb) {
					calloutColorStyle = "color: rgba(" + rgb + ", 1);"
					this.iconEl.setAttr("style", calloutColorStyle);
				}
				this.iconEl.setAttr("aria-label", calloutIcon);
				setIcon(this.iconEl, calloutIcon);
				this.newEl.appendChild(this.iconEl);
			}
			return this.newEl;
		}

		// icon
		if (!noIcon) {
			this.iconEl.setAttr("aria-label", calloutIcon);
			setIcon(this.iconEl, calloutIcon);
			this.newEl.appendChild(this.iconEl);
		}
		// label?
		if (calloutLabel) {
			this.labelEl.setText(calloutLabel);
			this.newEl.appendChild(this.labelEl);
		}
		// color?
		if (calloutLabel && calloutColor) {
			const rgb = parseColorToRgb(calloutColor);
			if (rgb) {
				calloutColorStyle = "color: rgba(" + rgb + ", 1); background-color: rgba(" + rgb + ", var(--inline-callout-bg-transparency));"
				this.newEl.setAttr("style", calloutColorStyle)
			}
		}
		return this.newEl;
	}

}