# ChordShape

A zero-dependency vanilla JavaScript plugin that renders guitar chord diagrams as SVG — open chords, barre chords, and mid-neck positions, in the style of a standard chord book.

![ChordShape demo](https://img.shields.io/badge/dependencies-none-brightgreen) ![ChordShape demo](https://img.shields.io/badge/JavaScript-vanilla-yellow)

## Features

- **No dependencies, no build step.** One file, one class. Works as a plain `<script>` tag or via `require`/`import`.
- **Muted, open, and fretted strings** — the standard ×/○/dot notation.
- **Barre chords** rendered as a single continuous bar, not a row of overlapping dots, with correct suppression of individual dots at the barred fret.
- **Mid-neck positions** — pass `startFret` to render a diagram that starts above the nut, with the fret number labeled to the left of the grid.
- **Finger numbers** — shown in a row below the grid (the classic chord-book look) or inside each dot, your choice.
- **SVG output** you can inject into the DOM, save to a file, or generate server-side (no `document` required for `toSVGString()`).

## Demo

Open `demo.html` in a browser to see it rendered — it reproduces open D, the Gm7 barre chord, Gmaj7, and a couple of extra cases (a full E-shape barre and finger numbers rendered inside the dots).

## Installation

No package manager required — just drop the file in and load it.

**Browser:**
```html
<script src="chord-shape.js"></script>
<script>
  const chord = new ChordShape({ /* ... */ });
  document.getElementById('target').appendChild(chord.render());
</script>
```

**Node / bundlers (CommonJS):**
```js
const ChordShape = require('./chord-shape.js');
```

## Usage

```js
const dChord = new ChordShape({
  name: 'D',
  strings: 6,
  frets:   [-1, -1, 0, 2, 3, 2],       // one entry per string, low E to high E
  fingers: [null, null, null, 1, 3, 2],
  startFret: 1,
});

// In the browser: get a live SVGElement to append to the DOM
document.getElementById('target').appendChild(dChord.render());

// Anywhere (including Node, no DOM needed): get the raw SVG markup string
const svgMarkup = dChord.toSVGString();
```

### A barre chord

```js
const gm7 = new ChordShape({
  name: 'Gm7',
  strings: 6,
  startFret: 3,                                    // diagram starts at fret 3, not the nut
  frets:   [3, 5, 3, 3, 3, 3],
  fingers: [null, 3, null, null, null, null],
  barres: [
    { fret: 3, fromString: 0, toString: 5, finger: 1 },
  ],
});
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | `''` | Chord name printed above the diagram. |
| `strings` | `number` | `6` | Number of strings. |
| `fretCount` | `number` | `4` | Number of frets shown in the grid. |
| `frets` | `number[]` | — | One entry per string, low to high. `-1` = muted (×), `0` = open (○), `N` = fretted at fret `N`. |
| `fingers` | `(number\|null)[]` | — | Finger number (1–4) per string, or `null` to omit. |
| `startFret` | `number` | `1` | The fret number the top of the grid represents. `1` draws a thick nut; anything higher draws a thin line with the fret number labeled to the left. |
| `barres` | `{fret, fromString, toString, finger}[]` | `[]` | One entry per barre. `fromString`/`toString` are 0-indexed, low string first. |
| `fingerPosition` | `'below' \| 'inside' \| 'none'` | `'below'` | Where finger numbers are drawn. |
| `width`, `height` | `number` | `200`, `240` | SVG canvas size. |
| `dotRadius` | `number` | `11` | Radius of fretted-note dots (and thickness of barre bars). |
| `stringColor`, `fretColor`, `dotColor`, `dotTextColor`, `nutColor`, `textColor` | `string` (CSS color) | various greys/black | Styling overrides. |

## Data conventions

`frets` and `fingers` are both indexed the same way: **index 0 is the lowest-pitched string** (low E on a standard-tuned 6-string), moving up to the highest-pitched string. This matches the format used by libraries like `chords-db`, so existing chord data generally drops in without translation.

## Browser support

Uses `class` syntax, template literals, and `Array.prototype.slice` — no transpilation needed for any evergreen browser. `render()` requires a DOM (`document`); `toSVGString()` does not, so it also runs in Node for server-side rendering.

## License

See [LICENSE](LICENSE).
