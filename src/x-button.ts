import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("x-button")
export class XButton extends LitElement {

    static override styles = css`
        :host button:hover {
            transform: scale(1.1);
        }
    `

    override render() {
        return html`
            <button>
                <slot><slot>
            </button>
        `
    };
};
