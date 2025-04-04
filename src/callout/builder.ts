import {
	getIconIds,
	setIcon
} from 'obsidian';

export class InlineCallout {

	newEl: HTMLSpanElement;
	iconEl: HTMLSpanElement;
	labelEl: HTMLSpanElement;
	textEl: HTMLSpanElement;

	constructor() {
		this.newEl = document.createElement("span");
		this.iconEl = document.createElement("span");
		this.labelEl = document.createElement("span");
		this.textEl = document.createElement("span");
	}

	public build(text: string) {

		// text content from <code>
		let part: string = text.substring(3);
		let content: string = part.slice(0, -1);
		// parts array split on pipe
		let parts: any[] = content.split('|');
		// icon
		let calloutIcon: string | null = parts[0] ? parts[0].trim().replace(/\\+$/, '').toLowerCase() : null;
		// label
		let calloutLabel: string | null = parts[1] ? parts[1].trim().replace(/\\+$/, '') : null;
		// color
		let calloutColor: string | null = parts[2] ? parts[2].trim() : null;
		let calloutColorStyle: string;

		// no content, return <code>
		if (
			!content.length 
			|| parts.length === 0 
			|| !calloutIcon
			|| (getIconIds().indexOf('lucide-' + calloutIcon) == -1 && getIconIds().indexOf(calloutIcon) == -1) // 404, no icon found
		) {
			this.newEl = document.createElement("code");
			this.newEl.setText(text)
			return this.newEl;
		}

		this.newEl.addClass("inline-callout");
		this.newEl.setAttr("data-inline-callout", calloutIcon);
		this.iconEl.addClass("inline-callout-icon");
		this.iconEl.setAttr("data-tooltip-position", 'top');
		this.labelEl.addClass("inline-callout-label");

		// icon only
		if (parts.length === 1) {
			this.iconEl.setAttr("aria-label", calloutIcon);
			setIcon(this.iconEl, calloutIcon);
			this.newEl.appendChild(this.iconEl);
			return this.newEl;
		}

		// icon and color only
		if (!calloutLabel && calloutColor) {
			calloutColorStyle = "color: rgba(" + calloutColor + ", 1);"
			this.iconEl.setAttr("style", calloutColorStyle);
			this.iconEl.setAttr("aria-label", calloutIcon);
			setIcon(this.iconEl, calloutIcon);
			this.newEl.appendChild(this.iconEl);
			return this.newEl;
		}

		// icon
		this.iconEl.setAttr("aria-label", calloutIcon);
		setIcon(this.iconEl, calloutIcon);
		this.newEl.appendChild(this.iconEl);
		// label?
		if (calloutLabel) {
			this.labelEl.setText(calloutLabel!);
			this.newEl.appendChild(this.labelEl);
		}
		// color?
		if (calloutLabel && calloutColor) {
			calloutColorStyle = "color: rgba(" + calloutColor + ", 1); background-color: rgba(" + calloutColor + ", var(--inline-callout-bg-transparency));"
			this.newEl.setAttr("style", calloutColorStyle)
		}
		return this.newEl;
	}

}