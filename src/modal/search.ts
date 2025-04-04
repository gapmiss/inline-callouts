import {
    Modal,
    Notice,
    Setting,
    TextComponent,
    getIconIds
} from 'obsidian';
import { InputIconSuggest } from '../suggest/inputIcon';
import type InlineCalloutsPlugin from "../main";

export class SearchInlineCalloutsModal extends Modal {

    public calloutIcon: string;

    constructor(
        private plugin: InlineCalloutsPlugin,
    ) {
        super(plugin.app);

        this.containerEl.addClass("search-inline-callouts-modal");

        this.onOpen = () => this.display(true);
    }

    private async display(focus?: boolean) {
        const { contentEl } = this;
        contentEl.empty();
        let input: TextComponent;
        this.titleEl.setText("Search inline callouts");

        new Setting(contentEl)
            .setName('Icon name')
            .setDesc('Enter text to find an icon to search for.')
            .setClass('search-icon-input')
            .addSearch((t) => {
                input = t;
                t.setValue('')
                    .onChange((v) => {
                        this.calloutIcon = v;
                    });
                new InputIconSuggest(
                    this.app,
                    t.inputEl,
                    getIconIds().filter((icon) =>
                        icon.replace('lucide-', '').toLowerCase().includes(icon.replace('lucide-', '').toLowerCase())
                    )
                );
            })

        new Setting(contentEl)
            .addButton((b) =>
                b.setButtonText("Search")
                    .setCta()
                    .onClick(() => {
                        try {
                            if (this.calloutIcon) {
                                window.open(
                                    "obsidian://search?vault=" + encodeURIComponent(this.app.vault.getName()) + "&query=" + encodeURIComponent('/`\\[!![a-z-]*?' + this.calloutIcon.replace('lucide-', '') + '[a-z]*?/')
                                );
                            }
                        } catch (e) {
                            console.log(e)
                            new Notice(
                                "There was an issue with your search query. Please check the developer console for details.",
                                5000
                            );
                        }
                        this.close();
                    })
            );

    }

}
