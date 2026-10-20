import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { repeat } from 'lit/directives/repeat.js';

@customElement("x-list")
export class XList extends LitElement {
    @property()
    items: XItems = [];

    override render() {
        return html`
            <ul>
                ${
                    repeat(
                        this.items,
                        (item) => item.id,
                        (item) => html`<li value=${item.value}>${item.label}</li>`
                    )
                }
            </ul>
        `
    }
};

interface XItem {
    id: string | number;
    value: any;
    label: any;
};

type XItems = XItem[];
