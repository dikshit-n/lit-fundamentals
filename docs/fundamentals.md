# Lit + Web Components — Day 1 & Day 2 Mastery Guide

A buildable, read-as-you-go guide. Every section is something you will type, run, and break. If you finish both days you will have a real foundation: a working Lit project, two tested components, a SASS theming pipeline, and the conventions you will re-use on every component after this.

---

## How to use this document

1. **Set up the project once** (Part A) — about 15 minutes.
2. **Day 1** (Parts B & C) — read, then build `ds-counter` to internalize Lit's reactive model.
3. **Day 2** (Part D) — build `ds-button` end-to-end. This is the template you will use for every component from now on.
4. **Stop when you hit Part E** — that's your reference for patterns to remember.

Don't skip the test files. They are not an afterthought. They are how you verify you actually understood the API.

---

## Part A — Project setup (do this once)

### A.1 — Initialize the package

```bash
mkdir ds-ui && cd ds-ui
pnpm init
pnpm add lit
pnpm add -D typescript vite sass @types/node \
  vitest @open-wc/testing @open-wc/testing-helpers \
  happy-dom \
  @storybook/web-components-vite @storybook/addon-essentials \
  @storybook/addon-a11y @storybook/blocks @storybook/test storybook \
  @axe-core/playwright
```

If you do not have `pnpm` yet: `npm i -g pnpm`.

### A.2 — `tsconfig.json`

Lit uses TC39 stage-2 decorators. These three options are non-negotiable:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noImplicitOverride": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src/**/*", ".storybook/**/*"]
}
```

Why each option matters:

- `experimentalDecorators: true` — enables Lit's decorator syntax.
- `useDefineForClassFields: false` — without this, class fields use `Object.defineProperty` which **silently breaks Lit's `@property` accessors**. This is the #1 reason new Lit projects "don't react" to prop changes.
- `target: ES2022` — modern enough for private class fields (`#private`) and top-level await.

### A.3 — `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => `ds-ui.${format}.js`,
    },
    rollupOptions: {
      external: /^lit/,
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

`happy-dom` handles Shadow DOM correctly in tests, which `jsdom` historically did not. Use it.

### A.4 — `vitest.setup.ts`

```ts
import 'happy-dom';
```

### A.5 — `package.json` scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

### A.6 — Project structure

```
ds-ui/
├── src/
│   ├── components/
│   │   ├── ds-counter/
│   │   │   ├── ds-counter.ts
│   │   │   ├── ds-counter.test.ts
│   │   │   └── ds-counter.stories.ts
│   │   └── ds-button/
│   │       ├── ds-button.ts
│   │       ├── ds-button.scss
│   │       ├── ds-button.test.ts
│   │       └── ds-button.stories.ts
│   ├── styles/
│   │   ├── _tokens.scss
│   │   └── _mixins.scss
│   └── index.ts
├── tsconfig.json
├── vite.config.ts
├── vitest.setup.ts
└── package.json
```

Two patterns to keep:

- **SASS files live next to the component** (`ds-button.scss`), not in a global styles folder. This makes the component truly portable.
- **Tokens and mixins are global** in `src/styles/`. SASS `@use` from the component file.

### A.7 — `.storybook/main.ts` (minimal)

```ts
import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  framework: { name: '@storybook/web-components-vite', options: {} },
  stories: ['../src/**/*.stories.@(ts|mdx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
};

export default config;
```

### A.8 — Smoke test: `src/index.ts`

```ts
export { DsCounter } from './components/ds-counter/ds-counter';
export { DsButton } from './components/ds-button/ds-button';
```

You now have a working skeleton. Part A is done.

---

## Part B — Day 1: Lit fundamentals

### B.1 — The reactive mental model

Lit is built on three primitives. Master them and the rest is just pattern application.

1. **Reactive properties** — class fields decorated with `@property` or `@state`. When you assign a new value, Lit schedules a re-render automatically.
2. **`lit-html`** — a tagged template literal that diffs the resulting DOM against the live DOM and applies only the deltas.
3. **Shadow DOM** — scoped DOM and CSS. Your component's styles cannot leak out, and global styles cannot leak in (except via CSS custom properties).

The render method is a *function of the current state*. You never call it directly. You set a property. Lit schedules the render. lit-html applies the diff.

```ts
class Demo extends LitElement {
  @property({ type: Number }) count = 0;

  render() {
    return html`<p>Count: ${this.count}</p>`;
  }
}
```

Assign `this.count = 5` from anywhere → re-render. That is the entire reactivity model.

### B.2 — Decorators reference

**`@customElement(tagName)`** — registers the element with the custom element registry.

```ts
@customElement('ds-counter')
export class DsCounter extends LitElement {}
```

The tag **must contain a hyphen**. This is a HTML spec requirement so the parser can distinguish custom elements from built-in tags. Pick a namespace prefix and stick to it (`ds-` for "design system", `app-` for app-specific, etc.).

**`@property(options)`** — exposes a reactive property. Defaults to reflecting as an attribute.

```ts
@property({ type: Number }) count = 0;
@property({ type: Boolean }) disabled = false;
@property() variant: 'primary' | 'ghost' = 'primary';
@property({ attribute: 'role' }) ariaRole: string | null = null;
@property({ reflect: true }) value = '';
@property({ hasChanged: (n, o) => n !== o && n !== '' }) foo = '';
```

| Option | Effect |
|---|---|
| `type: Boolean` | Boolean attribute handling (`?attr` semantics) |
| `type: Number` | Coerces attribute string to number on read |
| `attribute: 'role'` | Renames the reflected attribute |
| `attribute: false` | Property-only, not reflected to attribute |
| `reflect: true` | Updates attribute when property changes |
| `noAccessor: true` | No getter/setter generated; manual control |
| `hasChanged` | Custom change detector; return `false` to skip re-render |

**`@state()`** — reactive but **not** reflected to attribute. For internal state.

```ts
@state() private _isOpen = false;
```

**`@query(selector)` / `@queryAll(selector)`** — cached DOM queries, auto-refreshed after every render.

```ts
@query('input') private _input!: HTMLInputElement;
@queryAll('option') private _options!: NodeListOf<HTMLElement>;
```

**`@queryAssignedTo(slot, selector)`** — query slotted elements.

```ts
@queryAssignedTo('icon', 'svg') private _icon!: SVGSVGElement | null;
```

### B.3 — `lit-html` essentials

```ts
import { html, svg, css, nothing, LitElement } from 'lit';
import { classMap, styleMap, ref, createRef, when, repeat, ifDefined, unsafeHTML } from 'lit/directives/...';
```

**Conditionals — use `when`, not `&&` or `?:`:**

```ts
render() {
  return html`
    ${when(this.loading, () => html`<ds-spinner></ds-spinner>`)}
    ${when(!this.loading, () => html`<slot></slot>`)}
  `;
}
```

Why: `condition && html` renders `0` or `""` or `false` as text. `when` is a clean if/else with type narrowing.

**Lists — use `repeat` with a key, not `map`:**

```ts
render() {
  return html`
    <ul>
      ${repeat(
        this.items,
        (item) => item.id,                  // key
        (item) => html`<li>${item.name}</li>`
      )}
    </ul>
  `;
}
```

Why: with a key, Lit reuses DOM nodes for the same item across renders. This matters for focus retention, animations, and form input state (e.g. cursor position in a text input).

**Class and style bindings — `classMap` and `styleMap`:**

```ts
render() {
  const classes = { primary: this.variant === 'primary', 'is-disabled': this.disabled };
  const styles = { opacity: this.loading ? '0.6' : '1' };
  return html`<button class=${classMap(classes)} style=${styleMap(styles)}></button>`;
}
```

**Refs — for direct DOM access:**

```ts
// Object form (cleaner, multiple refs)
private _inputRef = createRef<HTMLInputElement>();

render() {
  return html`<input ${ref(this._inputRef)}>`;
}

firstUpdated() {
  this._inputRef.value?.focus();
}
```

Or callback form:

```ts
private _input?: HTMLInputElement;

render() {
  return html`<input ${ref((el) => (this._input = el as HTMLInputElement))}>`;
}
```

**`ifDefined` — only set the attribute when not undefined:**

```ts
render() {
  return html`<input aria-label=${ifDefined(this.ariaLabel)}>`;
}
// Renders <input> if ariaLabel is undefined
// Renders <input aria-label="Search"> if it is "Search"
```

**`nothing` — explicit "render nothing" for `?:` branches:**

```ts
${this.showFooter ? html`<footer>...</footer>` : nothing}
```

### B.4 — Lifecycle

| Hook | When fired | Use for |
|---|---|---|
| `constructor` | element created | one-time setup; **do not touch the DOM** (no `this.shadowRoot` yet) |
| `connectedCallback` | added to the DOM | event listeners, timers, observers |
| `disconnectedCallback` | removed from the DOM | cleanup listeners, timers |
| `willUpdate(changedProps)` | before each render, including first | derive state from props; sync `_internals` |
| `update(changedProps)` | every render | rare to override; render is the default |
| `firstUpdated(changedProps)` | after first render | DOM is now real; refs are valid; run focus work |
| `updated(changedProps)` | after every render | post-render DOM effects |

```ts
override connectedCallback() {
  super.connectedCallback();              // mandatory
  document.addEventListener('keydown', this._onKeyDown);
}

override disconnectedCallback() {
  super.disconnectedCallback();           // mandatory
  document.removeEventListener('keydown', this._onKeyDown);
}

override willUpdate(changed: PropertyValues) {
  if (changed.has('value')) {
    this._formatted = this._format(this.value);  // derive internal state
  }
}

override firstUpdated() {
  this._inputRef.value?.focus();
}
```

Two things to memorize:
1. **Always call `super.connectedCallback()` and `super.disconnectedCallback()`.** Lit does setup there; skipping it breaks reactivity silently.
2. **Use `PropertyValues` (the Map) to detect *which* properties changed**, not all property reads.

### B.5 — Shadow DOM in practice

Lit creates a Shadow DOM by default. To opt out (rare):

```ts
createRenderRoot() {
  return this;  // render to light DOM
}
```

When to opt out:
- You need global CSS to apply to your component's internals (e.g. a Markdown renderer where the host's styles must reach into the rendered content).
- Some SSR setups that don't yet support Shadow DOM.

For 99% of components, take the default (Shadow DOM).

**Slots** — how consumers pass children:

```ts
render() {
  return html`
    <button>
      <slot name="icon"></slot>
      <slot></slot>
    </button>
  `;
}
```

- Default slot `<slot></slot>` catches all unslotted children.
- Named slot `<slot name="icon"></slot>` catches only `<element slot="icon">`.
- Slot change events fire when slotted content changes:

```ts
private _onSlotChange = () => { /* re-query assigned nodes */ };
```

**`::slotted()`** — style slotted children from inside Shadow DOM:

```css
:host ::slotted(*) {
  color: inherit;
}
```

**CSS custom properties pierce Shadow DOM.** That is the entire theming story. Consumers set `--ds-color-primary` on a parent; the component uses `var(--ds-color-primary)`. No API surface to expose for theming; the native CSS variable mechanism does it.

The pattern:

```ts
static styles = css`
  :host {
    --_bg: var(--ds-color-primary, #0066ff);   /* internal alias, falls back */
    background: var(--_bg);
  }
`;
```

Double-dash prefix (`--_bg`) is the convention for **internal** aliases — variables the component itself uses, derived from public design tokens.

---

## Part C — Day 1 exercise: `ds-counter`

A small but complete component that exercises props, events, slots, SASS-in-CSS, focus, ARIA, and tests. Not trivial; not bloated.

### C.1 — The component

`src/components/ds-counter/ds-counter.ts`

```ts
import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { when } from 'lit/directives/when.js';

@customElement('ds-counter')
export class DsCounter extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--ds-space-2, 0.5rem);
      font-family: var(--ds-font-family-base, system-ui, sans-serif);
    }
    button {
      border: 1px solid var(--ds-color-border, #d4d4d8);
      background: var(--ds-color-surface, #fff);
      color: var(--ds-color-fg, #18181b);
      border-radius: var(--ds-radius-sm, 4px);
      width: 2rem;
      height: 2rem;
      cursor: pointer;
      font: inherit;
    }
    button:hover:not(:disabled) {
      background: var(--ds-color-surface-hover, #f4f4f5);
    }
    button:focus-visible {
      outline: 2px solid var(--ds-color-focus, #0066ff);
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
    this.dispatchEvent(new CustomEvent('ds-change', {
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
    'ds-counter': DsCounter;
  }
}
```

Things to notice:

- `?disabled` is Lit's boolean attribute binding — adds the attribute when truthy, removes it when falsy.
- `aria-live="polite"` on the count span announces value changes to screen readers.
- `composed: true` on the event lets it cross Shadow DOM boundaries — **essential** when wrapping in React/Angular/Vue.
- The `declare global` block teaches TypeScript the tag name → class mapping so `document.querySelector('ds-counter')` is typed correctly.
- `willUpdate` clamps the value when bounds change, so passing `min="0"` to a counter with `count="-5"` corrects it on the next render.

### C.2 — Test it

`src/components/ds-counter/ds-counter.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
import { fixture, elementUpdated, html } from '@open-wc/testing';
import './ds-counter';
import type { DsCounter } from './ds-counter';

describe('ds-counter', () => {
  it('renders the initial count', async () => {
    const el = await fixture<DsCounter>(html`<ds-counter count="3"></ds-counter>`);
    expect(el.count).toBe(3);
    const span = el.shadowRoot!.querySelector('.count');
    expect(span?.textContent?.trim()).toBe('3');
  });

  it('increments when + clicked', async () => {
    const el = await fixture<DsCounter>(html`<ds-counter count="0" step="1"></ds-counter>`);
    el.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="increment"]')!.click();
    await elementUpdated(el);
    expect(el.count).toBe(1);
  });

  it('decrements when − clicked', async () => {
    const el = await fixture<DsCounter>(html`<ds-counter count="5"></ds-counter>`);
    el.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="decrement"]')!.click();
    await elementUpdated(el);
    expect(el.count).toBe(4);
  });

  it('emits ds-change with new value', async () => {
    const el = await fixture<DsCounter>(html`<ds-counter count="0"></ds-counter>`);
    const handler = vi.fn();
    el.addEventListener('ds-change', handler);
    el.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="increment"]')!.click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail).toEqual({ value: 1 });
  });

  it('respects max bound', async () => {
    const el = await fixture<DsCounter>(html`<ds-counter count="5" max="5"></ds-counter>`);
    const inc = el.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="increment"]')!;
    expect(inc.disabled).toBe(true);
  });

  it('respects min bound', async () => {
    const el = await fixture<DsCounter>(html`<ds-counter count="0" min="0"></ds-counter>`);
    const dec = el.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="decrement"]')!;
    expect(dec.disabled).toBe(true);
  });

  it('disables both buttons when disabled prop is set', async () => {
    const el = await fixture<DsCounter>(html`<ds-counter disabled></ds-counter>`);
    const buttons = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button');
    buttons.forEach((b) => expect(b.disabled).toBe(true));
  });

  it('clamps count when min/max change retroactively', async () => {
    const el = await fixture<DsCounter>(html`<ds-counter count="5"></ds-counter>`);
    expect(el.count).toBe(5);
    el.min = 0;
    await elementUpdated(el);
    expect(el.count).toBe(5); // 5 is still >= 0
    el.max = 3;
    await elementUpdated(el);
    expect(el.count).toBe(3);
  });
});
```

Run it:

```bash
pnpm test
```

You should see 8 passing tests.

### C.3 — Story

`src/components/ds-counter/ds-counter.stories.ts`

```ts
import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './ds-counter';

const meta: Meta = {
  title: 'Components/Counter',
  component: 'ds-counter',
  tags: ['autodocs'],
  argTypes: {
    count: { control: 'number' },
    step: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { count: 0, step: 1, min: -10, max: 10, disabled: false },
  render: (args) => html`
    <ds-counter
      count=${args.count}
      step=${args.step}
      min=${args.min}
      max=${args.max}
      ?disabled=${args.disabled}
    ></ds-counter>
  `,
};

export const Bounded: Story = {
  render: () => html`<ds-counter count="5" min="0" max="10"></ds-counter>`,
};

export const Disabled: Story = {
  render: () => html`<ds-counter count="3" disabled></ds-counter>`,
};

export const Stepping: Story = {
  render: () => html`<ds-counter count="0" step="5" min="0" max="100"></ds-counter>`,
};
```

Run it:

```bash
pnpm storybook
```

Day 1 is done. You have a tested, storybooked, accessible counter that exercises every Lit primitive except slots and SASS.

---

## Part D — Day 2: production-grade `ds-button`

The button is "simple" — and that is the point. It forces you to set up the conventions you will use on every other component in the library. Theming. SASS pipeline. Form-association. A11y. Tests. Stories. Once `ds-button` is done, every component after it is a pattern variation, not a new design exercise.

### D.1 — SASS tokens

`src/styles/_tokens.scss`

```scss
// ----- Color -----
$ds-color-primary: #0066ff;
$ds-color-primary-hover: #0052cc;
$ds-color-primary-active: #003d99;
$ds-color-primary-fg: #ffffff;

$ds-color-secondary-bg: #f4f4f5;
$ds-color-secondary-hover: #e4e4e7;
$ds-color-secondary-fg: #18181b;

$ds-color-ghost-fg: #18181b;
$ds-color-ghost-hover: rgba(0, 0, 0, 0.05);

$ds-color-danger: #dc2626;
$ds-color-danger-hover: #b91c1c;

$ds-color-focus: #0066ff;
$ds-color-disabled-bg: #f4f4f5;
$ds-color-disabled-fg: #a1a1aa;

// ----- Spacing -----
$ds-space-1: 0.25rem;
$ds-space-2: 0.5rem;
$ds-space-3: 0.75rem;
$ds-space-4: 1rem;
$ds-space-5: 1.25rem;

// ----- Radii -----
$ds-radius-sm: 4px;
$ds-radius-md: 6px;
$ds-radius-lg: 8px;

// ----- Typography -----
$ds-font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
$ds-font-size-sm: 0.875rem;
$ds-font-size-md: 1rem;
$ds-font-size-lg: 1.125rem;
$ds-font-weight-medium: 500;

// ----- Motion -----
$ds-duration-fast: 120ms;
$ds-easing-standard: cubic-bezier(0.2, 0, 0, 1);
```

### D.2 — SASS mixins

`src/styles/_mixins.scss`

```scss
@use 'tokens' as t;

@mixin focus-ring($color: t.$ds-color-focus) {
  outline: 2px solid $color;
  outline-offset: 2px;
}

@mixin reset-button {
  appearance: none;
  border: 0;
  margin: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: inherit;
}

@mixin size($font-size, $padding-y, $padding-x, $min-height) {
  font-size: $font-size;
  padding: $padding-y $padding-x;
  min-height: $min-height;
}
```

### D.3 — Component SCSS

`src/components/ds-button/ds-button.scss`

```scss
@use '../../styles/tokens' as t;
@use '../../styles/mixins' as m;

:host {
  display: inline-flex;
  vertical-align: middle;
  --_bg: #{t.$ds-color-primary};
  --_fg: #{t.$ds-color-primary-fg};
  --_hover-bg: #{t.$ds-color-primary-hover};
  --_active-bg: #{t.$ds-color-primary-active};
  --_focus: #{t.$ds-color-focus};
  --_disabled-bg: #{t.$ds-color-disabled-bg};
  --_disabled-fg: #{t.$ds-color-disabled-fg};
}

:host([variant='secondary']) {
  --_bg: #{t.$ds-color-secondary-bg};
  --_fg: #{t.$ds-color-secondary-fg};
  --_hover-bg: #{t.$ds-color-secondary-hover};
  --_active-bg: #{t.$ds-color-secondary-hover};
}

:host([variant='ghost']) {
  --_bg: transparent;
  --_fg: #{t.$ds-color-ghost-fg};
  --_hover-bg: #{t.$ds-color-ghost-hover};
  --_active-bg: #{t.$ds-color-ghost-hover};
}

:host([variant='danger']) {
  --_bg: #{t.$ds-color-danger};
  --_fg: white;
  --_hover-bg: #{t.$ds-color-danger-hover};
  --_active-bg: #{t.$ds-color-danger-hover};
}

:host([block]) {
  display: flex;
  width: 100%;
}

button {
  @include m.reset-button;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: t.$ds-space-2;
  width: 100%;
  background: var(--_bg);
  color: var(--_fg);
  border-radius: t.$ds-radius-md;
  font-family: t.$ds-font-family-base;
  font-weight: t.$ds-font-weight-medium;
  line-height: 1.2;
  transition: background-color t.$ds-duration-fast t.$ds-easing-standard;
  user-select: none;
  white-space: nowrap;
}

:host([size='sm']) button { @include m.size(t.$ds-font-size-sm, t.$ds-space-1, t.$ds-space-3, 2rem); }
:host([size='md']) button { @include m.size(t.$ds-font-size-md, t.$ds-space-2, t.$ds-space-4, 2.5rem); }
:host([size='lg']) button { @include m.size(t.$ds-font-size-lg, t.$ds-space-3, t.$ds-space-5, 3rem); }

button:hover:not(:disabled) {
  background: var(--_hover-bg);
}

button:active:not(:disabled) {
  background: var(--_active-bg);
}

button:focus-visible {
  @include m.focus-ring;
}

button:disabled {
  background: var(--_disabled-bg);
  color: var(--_disabled-fg);
  cursor: not-allowed;
}

:host([loading]) button {
  cursor: wait;
}

.spinner {
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: ds-spin 0.6s linear infinite;
}

@keyframes ds-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  button, .spinner {
    animation: none;
    transition: none;
  }
}

::slotted([slot='icon']) {
  display: inline-flex;
  width: 1em;
  height: 1em;
}
```

Notice the pattern:
- Each `:host([variant='x'])` block redefines **only the internal aliases** (`--_bg`, `--_fg`, etc.), not the rules that use them.
- The `button` rule below uses the aliases, so all variants get the same hover/active/focus behavior "for free."
- The `ds-spin` keyframe is namespaced so it does not collide with other libraries or user styles.

### D.4 — The component

`src/components/ds-button/ds-button.ts`

```ts
import { LitElement, html, css, nothing, PropertyValues, unsafeCSS } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import buttonStyles from './ds-button.scss?inline';

export type DsButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type DsButtonSize = 'sm' | 'md' | 'lg';
export type DsButtonType = 'button' | 'submit' | 'reset';

@customElement('ds-button')
export class DsButton extends LitElement {
  /** Register as a form-associated custom element */
  static formAssociated = true;

  static styles = [unsafeCSS(buttonStyles)];

  @property() variant: DsButtonVariant = 'primary';
  @property() size: DsButtonSize = 'md';
  @property() type: DsButtonType = 'button';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) block = false;
  @property({ attribute: 'aria-label' }) override ariaLabelText: string | null = null;

  private _internals: ElementInternals;
  private _originalDisabled = false;

  @query('button') private _button!: HTMLButtonElement;

  constructor() {
    super();
    this._internals = this.attachInternals();
  }

  override willUpdate(changed: PropertyValues<this>) {
    if (changed.has('disabled') && changed.get('disabled') !== undefined) {
      this._originalDisabled = this.disabled;
    }
  }

  /** Imperative focus on the inner button so the focus ring shows */
  override focus(options?: FocusOptions): void {
    this._button?.focus(options);
  }

  override click(): void {
    this._button?.click();
  }

  /** Form-association: keep form-submission state in sync */
  formDisabledCallback(): void {
    this.disabled = this._originalDisabled;
  }

  private _handleClick = (e: MouseEvent) => {
    if (this.disabled || this.loading) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    this.dispatchEvent(new CustomEvent('ds-click', {
      detail: { originalEvent: e },
      bubbles: true,
      composed: true,
    }));
  };

  override render() {
    const isDisabled = this.disabled || this.loading;
    return html`
      <button
        part="button"
        class=${classMap({ 'is-loading': this.loading })}
        type=${this.type}
        ?disabled=${isDisabled}
        aria-busy=${this.loading ? 'true' : 'false'}
        aria-label=${ifDefined(this.ariaLabelText ?? undefined)}
        @click=${this._handleClick}
      >
        <slot name="icon"></slot>
        <span class="label"><slot></slot></span>
        ${this.loading
          ? html`<span class="spinner" aria-hidden="true"></span>`
          : nothing}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-button': DsButton;
  }
}
```

Key things to understand:

| Pattern | Why it matters |
|---|---|
| `static formAssociated = true` | Component participates in `<form>` submission like a native button. |
| `attachInternals()` | Returns `ElementInternals` — the gateway to form-association APIs. |
| `formDisabledCallback` | Browser calls this when the owning form becomes disabled; you can sync state. |
| `part="button"` | Exposes the inner button as a styling hook via `::part(button)` from light DOM — escapes Shadow DOM scoping intentionally. |
| `composed: true` on `ds-click` | The event crosses Shadow DOM into the host document so React/Angular/Vue can listen. |
| `ifDefined` on `aria-label` | Prevents `aria-label=""` from being rendered when not provided. |
| `e.preventDefault()` + `stopImmediatePropagation()` | Stops the click from also triggering form submit when disabled or loading. |
| `aria-busy` | Announces loading state to screen readers. |
| `tabindex` not on host | The native button is the focus target. Adding tabindex on the host creates two focus stops. |
| `loading` doesn't disable native | We want `aria-busy` to be visible, so we use `disabled` only when truly disabled. |

### D.5 — Test it

`src/components/ds-button/ds-button.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
import { fixture, elementUpdated, html } from '@open-wc/testing';
import './ds-button';
import type { DsButton } from './ds-button';

describe('ds-button', () => {
  it('renders label from default slot', async () => {
    const el = await fixture<DsButton>(html`<ds-button>Click me</ds-button>`);
    const btn = el.shadowRoot!.querySelector('button')!;
    expect(btn.textContent?.trim()).toContain('Click me');
  });

  it('applies variant attribute', async () => {
    const el = await fixture<DsButton>(html`<ds-button variant="danger">Delete</ds-button>`);
    expect(el.getAttribute('variant')).toBe('danger');
  });

  it('emits ds-click on click', async () => {
    const el = await fixture<DsButton>(html`<ds-button>Click</ds-button>`);
    const handler = vi.fn();
    el.addEventListener('ds-click', handler);
    el.shadowRoot!.querySelector('button')!.click();
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].detail.originalEvent).toBeInstanceOf(MouseEvent);
  });

  it('does not emit ds-click when disabled', async () => {
    const el = await fixture<DsButton>(html`<ds-button disabled>Click</ds-button>`);
    const handler = vi.fn();
    el.addEventListener('ds-click', handler);
    el.shadowRoot!.querySelector('button')!.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not emit ds-click when loading', async () => {
    const el = await fixture<DsButton>(html`<ds-button loading>Click</ds-button>`);
    const handler = vi.fn();
    el.addEventListener('ds-click', handler);
    el.shadowRoot!.querySelector('button')!.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('sets aria-busy when loading', async () => {
    const el = await fixture<DsButton>(html`<ds-button loading>Click</ds-button>`);
    const btn = el.shadowRoot!.querySelector('button')!;
    expect(btn.getAttribute('aria-busy')).toBe('true');
  });

  it('renders icon slot content', async () => {
    const el = await fixture<DsButton>(html`
      <ds-button>
        <svg slot="icon" viewBox="0 0 24 24"></svg>
        With icon
      </ds-button>
    `);
    const slot = el.shadowRoot!.querySelector('slot[name="icon"]') as HTMLSlotElement;
    expect(slot.assignedElements().length).toBe(1);
  });

  it('focus() delegates to inner button', async () => {
    const el = await fixture<DsButton>(html`<ds-button>Click</ds-button>`);
    el.focus();
    const btn = el.shadowRoot!.querySelector('button')!;
    expect(document.activeElement).toBe(btn);
  });

  it('click() delegates to inner button', async () => {
    const el = await fixture<DsButton>(html`<ds-button>Click</ds-button>`);
    const handler = vi.fn();
    el.addEventListener('ds-click', handler);
    el.click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('participates in form submission when type=submit', async () => {
    const form = document.createElement('form');
    form.innerHTML = `<ds-button type="submit">Submit</ds-button>`;
    const submitted = vi.fn((e: Event) => e.preventDefault());
    form.addEventListener('submit', submitted);
    document.body.appendChild(form);

    const btn = form.querySelector('ds-button') as DsButton;
    btn.click();

    expect(submitted).toHaveBeenCalledOnce();
    document.body.removeChild(form);
  });

  it('respects prefers-reduced-motion via CSS', async () => {
    // Visual test, mostly verifying no animation class is hard-set
    const el = await fixture<DsButton>(html`<ds-button>Click</ds-button>`);
    const styles = el.shadowRoot!.querySelector('style')?.textContent ?? '';
    expect(styles).toContain('prefers-reduced-motion');
  });
});
```

### D.6 — Story with controls

`src/components/ds-button/ds-button.stories.ts`

```ts
import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './ds-button';

const meta: Meta = {
  title: 'Components/Button',
  component: 'ds-button',
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    type: { control: 'inline-radio', options: ['button', 'submit', 'reset'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    block: { control: 'boolean' },
    onDsClick: { action: 'ds-click' },
  },
};

export default meta;
type Story = StoryObj;

export const Primary: Story = {
  args: { variant: 'primary', size: 'md' },
  render: (args) => html`
    <ds-button
      variant=${args.variant}
      size=${args.size}
      ?disabled=${args.disabled}
      ?loading=${args.loading}
      ?block=${args.block}
    >Primary</ds-button>
  `,
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display: flex; gap: 0.5rem; align-items: center;">
      <ds-button variant="primary">Primary</ds-button>
      <ds-button variant="secondary">Secondary</ds-button>
      <ds-button variant="ghost">Ghost</ds-button>
      <ds-button variant="danger">Danger</ds-button>
    </div>
  `,
};

export const AllSizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 0.5rem; align-items: center;">
      <ds-button size="sm">Small</ds-button>
      <ds-button size="md">Medium</ds-button>
      <ds-button size="lg">Large</ds-button>
    </div>
  `,
};

export const WithIcon: Story = {
  render: () => html`
    <ds-button>
      <svg slot="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      Star
    </ds-button>
  `,
};

export const Loading: Story = {
  render: () => html`<ds-button loading>Saving…</ds-button>`,
};

export const Disabled: Story = {
  render: () => html`<ds-button disabled>Disabled</ds-button>`,
};

export const Block: Story = {
  render: () => html`<ds-button block>Full width</ds-button>`,
};

export const InAForm: Story = {
  render: () => html`
    <form @submit=${(e: Event) => e.preventDefault()}>
      <ds-button type="submit" variant="primary">Submit form</ds-button>
    </form>
  `,
};
```

Run it all:

```bash
pnpm test          # 11+ tests pass for ds-button
pnpm storybook     # visit http://localhost:6006
```

Day 2 is done.

---

## Part E — Patterns to remember (your cheat sheet)

| Pattern | Where you saw it | Why it matters |
|---|---|---|
| `experimentalDecorators: true` + `useDefineForClassFields: false` | `tsconfig.json` | Without these, reactivity silently breaks |
| `?disabled` | counter, button | Lit boolean attribute binding |
| `aria-live="polite"` | counter | Announces value changes to screen readers |
| `composed: true` | every event | Lets events cross Shadow DOM into frameworks |
| `ifDefined(value)` | button | Prevents `attr=""` being rendered when undefined |
| `nothing` | button | Clean "render nothing" for ternary |
| `part="name"` | button | Light-DOM styling hook via `::part()` |
| `static formAssociated = true` | button | Participate in `<form>` submission |
| `attachInternals()` | button | Gateway to ElementInternals / form APIs |
| `prefers-reduced-motion` | button | Respects user OS preference |
| `:focus-visible` | every component | Keyboard-only focus rings |
| `::slotted([slot='x'])` | button SCSS | Style slotted icon children |
| `unsafeCSS(scss?inline)` | button | SASS pipeline with Vite |
| CSS custom property aliasing (`--_bg: var(--ds-color-primary, #fallback)`) | button SCSS | Theming without breaking encapsulation |
| `PropertyValues<this>` in lifecycle | counter `willUpdate` | Type-safe change detection |
| `createRef<T>()` | (reference) | Object form of `ref`, easier to pass around |
| `repeat(items, keyFn, templateFn)` | (reference) | Stable list reconciliation |
| `when(cond, t, f)` | counter | Clean conditionals, type-narrowed |
| `classMap({ ... })` | button | Conditional class names without string concat |
| `super.connectedCallback()` / `super.disconnectedCallback()` | (every component) | Mandatory; Lit does setup there |

---

## Part F — Self-check before moving on

If you can answer these, you're ready for Day 3.

1. Why does Lit need `useDefineForClassFields: false` in `tsconfig.json`?
2. When would you use `@state` instead of `@property`?
3. What's the difference between `repeat(items, keyFn, templateFn)` and `items.map(templateFn)`? When does it matter?
4. Why must `ds-click` (or any event from a custom element) have `composed: true`?
5. How does theming work across Shadow DOM without exposing a JS API?
6. What does `static formAssociated = true` enable, and what does `attachInternals()` give you?
7. When you set `loading` on a `ds-button`, why don't we set `disabled` on the underlying native button?

If any answer is fuzzy, re-read the relevant section. Don't move on with a shaky mental model — these primitives compound across every component you build next.

---

## Part G — Where Day 3 picks up

After Day 1+2 you have:
- A working project (Vite + Lit + SASS + Vitest + Storybook).
- `ds-counter` — exercises every Lit primitive except SASS pipeline.
- `ds-button` — exercises the full pattern: SASS, theming, form-association, a11y, events, slots, tests, story, MDX-ready.

**Day 3** goes deeper on API design discipline: when to use attribute vs property, boolean handling, event naming, slot strategy, public methods, deprecating without breaking. You'll also refactor `ds-button` to add form-association polish (e.g. a `loading-text` slot, a `ds-focus` event).

**Day 4** is the cross-framework wrapper day. You will consume `ds-button` from a real React, Angular, and Vue app in a monorepo and document the integration gotchas.

Build order for components after `ds-button`:
1. `ds-input` — text input with form-association, label binding, validation states.
2. `ds-tooltip` — Floating UI positioning, focus + hover management, ARIA describedby.
3. `ds-select` — listbox pattern, roving tabindex, typeahead.
4. `ds-dialog` — focus trap, modal, `inert`, restore focus on close.

Each adds one new a11y pattern you'll re-use.
