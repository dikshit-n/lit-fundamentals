import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

@customElement('x-counter')
export class XCounter extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--x-space-2, 0.5rem);
      font-family: var(--x-font-family-base, system-ui, sans-serif);
    }
    button {
      border: 1px solid var(--x-color-border, #d4d4d8);
      background: var(--x-color-surface, #fff);
      color: var(--x-color-fg, #18181b);
      border-radius: var(--x-radius-sm, 4px);
      width: 2rem;
      height: 2rem;
      cursor: pointer;
      font: inherit;
    }
    button:hover:not(:disabled) {
      background: var(--x-color-surface-hover, #f4f4f5);
    }
    button:focus-visible {
      outline: 2px solid var(--x-color-focus, #0066ff);
      outline-offset: 2px;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .count {
      min-width: 3ch;
      text-align: center;
      font-variant-numeric: tabular-nums;
      font-weight: 500;
    }
  `;

  @property({ type: Number }) count = 0;
  @property({ type: Number }) step = 1;
  @property({ type: Number }) min = -Infinity;
  @property({ type: Number }) max = Infinity;
  @property({ type: Boolean }) disabled = false;

  @query('button[data-action="increment"]') private _incrementBtn!: HTMLButtonElement;
  @query('button[data-action="decrement"]') private _decrementBtn!: HTMLButtonElement;

  private _handleIncrement() {
    const next = Math.min(this.count + this.step, this.max);
    if (next !== this.count) {
      this.count = next;
      this._emitChange();
    }
  }

  private _handleDecrement() {
    const next = Math.max(this.count - this.step, this.min);
    if (next !== this.count) {
      this.count = next;
      this._emitChange();
    }
  }

  private _emitChange() {
    this.dispatchEvent(new CustomEvent('x-change', {
      detail: { value: this.count },
      bubbles: true,
      composed: true,
    }));
  }

  override willUpdate(changed: PropertyValues<this>) {
    // Clamp if min/max changed after count was already out of range
    if (changed.has('min') || changed.has('max') || changed.has('count')) {
      const clamped = Math.min(Math.max(this.count, this.min), this.max);
      if (clamped !== this.count) this.count = clamped;
    }
  }

  override render() {
    return html`
      <button
        data-action="decrement"
        @click=${this._handleDecrement}
        ?disabled=${this.disabled || this.count <= this.min}
        aria-label="Decrement"
      >−</button>
      <span class="count" aria-live="polite" aria-atomic="true">${this.count}</span>
      <button
        data-action="increment"
        @click=${this._handleIncrement}
        ?disabled=${this.disabled || this.count >= this.max}
        aria-label="Increment"
      >+</button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'x-counter': XCounter;
  }
}
