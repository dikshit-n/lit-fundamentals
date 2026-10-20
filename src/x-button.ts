import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { when } from 'lit/directives/when.js';
import { classMap } from 'lit/directives/class-map.js';

@customElement("x-button")
export class XButton extends LitElement {
    static override styles = css`
        :host button {
            background-color: lightgray;
            border: none;
            border-radius: 5px;
            outline: none;
            }
        :host button.sm {
            padding: 3px 10px;
        }
        :host button.md {
            padding: 5px 12px;
        }
        :host button.lg {
            padding: 6px 14px;
        }
    `

    @property()
    size: Size = "md";

    @property({ type: Boolean })
    loading = false;

    @property({ type: Boolean })
    disabled = false;

    @property({ type: String })
    class: string | boolean = false;

    @property({ attribute: 'role' })
    ariaRole: string | null = 'button';

    override render() {
        const classNames = {
            class: this.class,
            sm: this.size === 'sm',
            md: this.size === 'md',
            lg: this.size === 'lg',
            disabled: this.disabled
        };

        return html`
            <button
                class=${classMap(classNames)}
                ?disabled=${this.loading ? true : this.disabled}
            >
                ${when(this.loading, () => '...')}
                ${when(!this.loading, () => html`<slot></slot>`)}
            </button>
        `
    };
};

declare global {
    interface HTMLElementTagNameMap {
        "x-button": XButton
    }
};

type Size = "sm" | "md" | "lg";
