import {
	Plugin,
	MarkdownPostProcessor,
	MarkdownPostProcessorContext,
	Editor,
	MarkdownView,
	Notice,
	Menu
} from 'obsidian';
import {
	InlineCalloutsSettings,
	DEFAULT_SETTINGS,
	InlineCalloutsSettingTab
} from './settings';
import { SearchInlineCalloutsModal } from './modal/search';
import { ModifyInlineCalloutModal } from './modal/modify';
import { NewInlineCalloutModal } from './modal/new';
import { EditorIconSuggest } from './suggest/editorIcon';
import { InlineCallout } from './callout/builder';
import { viewPlugin } from './views/editor';

enum ContextType {
	NULL = 'null',
	INLINECODE = 'inline-code'
}

interface ContextData {
	type: ContextType;
	curLine: string;
	match: string | null;
	range: [number, number];
}

export default class InlineCalloutsPlugin extends Plugin {

	settings: InlineCalloutsSettings;

	public postprocessor: MarkdownPostProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
		const blockToReplace = el.querySelectorAll('code')
		if (blockToReplace.length === 0) return

		function replace(node: Node) {
			const childrenToReplace: Text[] = []
			node.childNodes.forEach(child => {
				if (child.nodeType === 3) {
					childrenToReplace.push(child as Text)
				}
			})
			childrenToReplace.forEach((child) => {
				child.replaceWith(child);
			})
		}

		blockToReplace.forEach(block => {
			replace(block)
		})
	}

	async onload() {

		await this.loadSettings();

		this.registerMarkdownPostProcessor(
			this.buildPostProcessor()
		);

		this.registerEditorExtension(viewPlugin)

		if (this.settings.enableSuggester) {
			this.registerEditorSuggest(new EditorIconSuggest(this));
		}

		this.addCommand({
			id: "new-inline-callout",
			name: "New inline callout",
			icon: "form-input",
			editorCallback: (editor) => {
				let modal = new NewInlineCalloutModal(this, editor);
				modal.open();
			}
		});

		if (this.settings.enableEditing) {
			this.addCommand({
				id: "modify-inline-callout",
				name: "Modify inline callout",
				icon: "form-input",
				editorCheckCallback: (checking, editor, view: MarkdownView) => {
					let res = this.checkContextType(editor, view);
					if (res) {
						if (!checking) {
							this.modifyInlineCallout(editor, view);
						}
						return true;
					}
					return false;
				}
			});
		}

		this.addCommand({
			id: "search-inline-callouts",
			name: "Search for inline callouts",
			icon: "text-search",
			callback: () => {
				let modal = new SearchInlineCalloutsModal(this);
				modal.open();
			}
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
				if (this.settings.enableEditing) {
					let res = this.checkContextType(editor, view);
					if (res) {
						menu.addItem(item => {
							item
								.setTitle('Modify inline callout')
								.setIcon('form-input')
								.onClick(async () => {
									this.modifyInlineCallout(editor, view);
								});
						})
						return true;
					}
					return false;
				}
			})
		);

		this.addSettingTab(new InlineCalloutsSettingTab(this.app, this));

	}

	onunload() { }

	private checkContextType(editor: Editor, view: MarkdownView) {
		const file = view.file;
		if (!file) {
			new Notice("Cannot get current file");
			return { type: ContextType.NULL, curLine: '', match: null, range: null };
		}

		const cursor = editor.getCursor();
		const curLine = editor.getLine(cursor.line);
		const curCh = cursor.ch;
		const beforeCursor = curLine.slice(0, curCh);
		const afterCursor = curLine.slice(curCh);

		let matcher = { type: ContextType.INLINECODE, regex: /`(\[\!\![^`]+\])`/g, enable: true }
		const matchInfo = this.getMatchInfo(beforeCursor, afterCursor, matcher.regex);

		if (matchInfo) {
			return true;
		}
		return false;
	}

	private getMatchInfo(beforeCursor: string, afterCursor: string, regex: RegExp): { content: string; range: [number, number] } | null {
		let match;
		while ((match = regex.exec(beforeCursor + afterCursor)) !== null && afterCursor !== '') {
			const matchStart = match.index;
			const matchEnd = match.index + match[0].length;

			if (beforeCursor.length >= matchStart && beforeCursor.length <= matchEnd) {
				return {
					content: match[1],
					range: [matchStart, matchEnd],
				};
			}
		}
		return null;
	}

	private determineContextType(editor: Editor, view: MarkdownView): ContextData {
		const file = view.file;
		if (!file) {
			new Notice("Cannot get current file");
			return { type: ContextType.NULL, curLine: '', match: null, range: [0, 0] };
		}

		const cursor = editor.getCursor();
		const curLine = editor.getLine(cursor.line);
		const curCh = cursor.ch;
		const beforeCursor = curLine.slice(0, curCh);
		const afterCursor = curLine.slice(curCh);

		let matcher = { type: ContextType.INLINECODE, regex: /`(\[\!\![^`]+\])`/g, enable: true }
		const matchInfo = this.getMatchInfo(beforeCursor, afterCursor, matcher.regex);

		if (matchInfo) {
			return {
				type: matcher.type,
				curLine,
				match: matchInfo.content,
				range: matchInfo.range,
			};
		}
		return { type: ContextType.NULL, curLine, match: null, range: [0, 0] };
	}

	private modifyInlineCallout(editor: Editor, view: MarkdownView): void {

		const file = view.file;
		if (!file) {
			new Notice("Cannot get current file");
			return;
		}

		const filename = file.basename;
		const contextType = this.determineContextType(editor, view);

		if (contextType.type == ContextType.NULL) {
			new Notice("No inline callout found at current cursor position");
			return;
		}

		const cursor = editor.getCursor();
		const curLine = cursor.line;

		if (contextType.type == ContextType.INLINECODE) {
			let modal = new ModifyInlineCalloutModal(this, editor, contextType);
			modal.open();
			return;
		}

	}

	buildPostProcessor(): MarkdownPostProcessor {
		return (el) => {
			el.findAll("code").forEach(
				(code) => {
					let text: string | undefined = code.innerText.trim();
					if (text !== undefined && text.startsWith('[!!') && text.endsWith(']')) {
						const inlineCallout = new InlineCallout();
						let newEl = inlineCallout.build(text);
						if (newEl !== undefined) {
							code.replaceWith(newEl);
						}
					}
				}
			)
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.reload();
	}

	/** Reloads the plugin */
	async reload() {
		// @ts-ignore
		await this.app.plugins.disablePlugin("inline-callouts");
		// @ts-ignore
		await this.app.plugins.enablePlugin("inline-callouts");
		// @ts-ignore
		this.app.setting.openTabById("inline-callouts").display();
	}

}
