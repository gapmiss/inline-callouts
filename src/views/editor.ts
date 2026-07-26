import {
    editorLivePreviewField
} from 'obsidian';
import { ViewPlugin, WidgetType, EditorView, ViewUpdate, Decoration, DecorationSet } from '@codemirror/view';
import { RangeSetBuilder } from "@codemirror/state";
import { InlineCallout } from '../callout/builder';

const REGEXP = /(`\[!!([^`]+)\]`)/gm;

export const viewPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
        this.decorations = this.buildDecorations(update.view);
    }

    destroy() { }

    buildDecorations(view: EditorView): DecorationSet {
        if (!view.state.field(editorLivePreviewField)) {
            return Decoration.none;
        }
        let builder = new RangeSetBuilder<Decoration>();
        let lines: number[] = [];
        if (view.state.doc.length > 0) {
            lines = Array.from(
                { length: view.state.doc.lines },
                (_, i) => i + 1,
            );
        }

        const currentSelections = [...view.state.selection.ranges];

        for (let n of lines) {
            const line = view.state.doc.line(n);
            const matches = Array.from(line.text.matchAll(REGEXP))
            for (const match of matches) {
                let add = true;
                const from = match.index != undefined ? match.index + line.from : -1
                const to = from + match[0].length
                if ((to - from) === 6) {
                    add = false
                }
                currentSelections.forEach((r) => {
                    if (r.to >= from && r.from <= to) {
                        add = false
                    }
                })
                if (add) {
                    // inclusiveStart gives the decoration a negative startSide. Without it,
                    // when the editor is reconfigured on a live view (enabling/disabling a
                    // plugin), CodeMirror's redraw range starts inside the replaced span and
                    // it emits a continueWidget placeholder instead of the callout, leaving
                    // a blank gap. Decoration.widget used to avoid this via its -1e8 startSide.
                    builder.add(from, to, Decoration.replace({ widget: new InlineCalloutWidget(match), inclusiveStart: true }))
                }
            }
        }
        return builder.finish();
    }
}, {
    decorations: (v: { decorations: DecorationSet }) => v.decorations,
})

class InlineCalloutWidget extends WidgetType {
    readonly text: string;

    constructor(readonly callout: string[]) {
        super()
        this.text = this.callout[0].substring(1).substring(this.callout[0].length - 2, 0);
    }

    eq(other: InlineCalloutWidget): boolean {
        return this.text === other.text;
    }

    toDOM(_view: EditorView): HTMLElement {
        const inlineCallout = new InlineCallout();
        let newEl = inlineCallout.build(this.text);
        return newEl;
    }
}
