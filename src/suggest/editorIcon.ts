import {
    TFile,
    getIconIds,
    Editor,
    EditorPosition,
    EditorSuggestTriggerInfo,
    EditorSuggest,
    EditorSuggestContext,
    setIcon
} from 'obsidian';
import InlineCalloutsPlugin from '../main';

export class EditorIconSuggest extends EditorSuggest<string> {
    plugin: InlineCalloutsPlugin;

    constructor(plugin: InlineCalloutsPlugin) {
        super(plugin.app);
        this.plugin = plugin;
        this.setInstructions([
            { command: '↑↓', purpose: 'navigate' },
            { command: '↵', purpose: 'select' },
            { command: 'esc', purpose: 'dismiss' },
        ]);
    }

    onTrigger(cursor: EditorPosition, editor: Editor, _: TFile): EditorSuggestTriggerInfo | null {
        const sub = editor.getLine(cursor.line).substring(0, cursor.ch);
        const match = sub.match(/!!\S+$/)?.first();
        if (match) {
            return {
                end: cursor,
                start: {
                    ch: sub.lastIndexOf(match),
                    line: cursor.line,
                },
                query: match,
            }
        }
        return null;
    }

    getSuggestions(context: EditorSuggestContext): string[] {
        let icon_query = context.query.replace('!!', '').toLowerCase();
        let iconNames = getIconIds().map(p => p.replace("lucide-", ""));
        return iconNames.filter(p => p.includes(icon_query));
    }

    renderSuggestion(suggestion: string, el: HTMLElement): void {
        const outer = el.createDiv({ cls: "icon-suggester-container" });
        setIcon(outer, suggestion);
        outer.createSpan({ cls: "icon-suggester-name" }, cb => {
            cb.setAttr("style", "margin-left: .75em; vertical-align:top;");
        }).setText(suggestion);
    }

    selectSuggestion(suggestion: string): void {
        if (this.context) {
            (this.context.editor as Editor).replaceRange('!!' + suggestion.replace("lucide-", ""), this.context.start, this.context.end);
        }
    }
}