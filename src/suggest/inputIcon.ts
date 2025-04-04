import {
	AbstractInputSuggest,
	App,
	setIcon
} from "obsidian";

export class InputIconSuggest extends AbstractInputSuggest<String> {
	textInputEl: HTMLInputElement;

	constructor(
		public app: App,
		public inputEl: HTMLInputElement,
		private items: string[],

	) {
		super(app, inputEl);
	}

	getSuggestions(inputStr: string): string[] {
		const inputLowerCase: string = inputStr.toLowerCase();
		const filtered = this.items.filter((item) => {
			if (item.replace('lucide-', '').toLowerCase().contains(inputLowerCase)) return item;
		});
		if (!filtered) this.close();
		return filtered;
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		let span: HTMLSpanElement = el.createSpan();
		setIcon(span, value);
		span.setAttr("style", "display: inline-block; margin-right: .5em;");
		let label: HTMLSpanElement = el.createSpan({ text: " " + value.replace('lucide-', '') });
		label.setAttr("style", "display: inline-block; vertical-align: top;");
	}

	selectSuggestion(item: string): void {
		this.textInputEl.value = item.replace('lucide-', '');
		this.textInputEl.trigger("input");
		this.close();
	}

}