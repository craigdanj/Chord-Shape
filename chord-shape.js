/**
 * ChordShape
 * Zero-dependency vanilla JS plugin for rendering guitar chord diagrams as SVG.
 *
 * Usage:
 *   const diagram = new ChordShape({
 *     name: 'D',
 *     strings: 6,
 *     frets: [-1, -1, 0, 2, 3, 2],   // one entry per string, low E to high E
 *     fingers: [null, null, null, 1, 3, 2],
 *     startFret: 1
 *   });
 *   document.getElementById('target').appendChild(diagram.render());
 *
 * Data conventions (per string, index 0 = lowest/leftmost string):
 *   frets[i]  = -1  -> muted string (rendered as ×)
 *             =  0  -> open string (rendered as ○)
 *             =  N  -> fretted at position N relative to startFret
 *   fingers[i] = 1-4 or null -> finger number label under the dot (omit if not needed)
 *   startFret  = the fret number the top of the grid represents (default 1).
 *                When > 1, it's printed to the left of the top-left corner,
 *                matching standard chord-book notation.
 *   barres     = optional array of { fret, fromString, toString, finger }
 *                fret is relative to startFret, strings are 0-indexed as above.
 */
class ChordShape {
  static DEFAULTS = {
    strings: 6,
    fretCount: 4,
    startFret: 1,
    width: 200,
    height: 240,
    dotRadius: 11,
    fingerFontSize: 13,
    nameFontSize: 26,
    markerFontSize: 15,
    stringColor: '#333',
    fretColor: '#333',
    dotColor: '#111',
    dotTextColor: '#fff',
    nutColor: '#111',
    textColor: '#111',
    // 'below'  -> finger numbers printed in a row under the grid, dots left plain
    //             (matches the reference D-chord diagram)
    // 'inside' -> finger numbers printed inside each dot, in dotTextColor
    // 'none'   -> no finger numbers rendered at all
    fingerPosition: 'below',
  };

  constructor(options = {}) {
    if (!options || typeof options !== 'object') {
      throw new TypeError('ChordShape: options object is required');
    }

    const opts = { ...ChordShape.DEFAULTS, ...options };

    this.name = opts.name || '';
    this.strings = opts.strings;
    this.fretCount = opts.fretCount;
    this.startFret = Math.max(1, opts.startFret);
    this.width = opts.width;
    this.height = opts.height;
    this.dotRadius = opts.dotRadius;
    this.fingerFontSize = opts.fingerFontSize;
    this.nameFontSize = opts.nameFontSize;
    this.markerFontSize = opts.markerFontSize;
    this.stringColor = opts.stringColor;
    this.fretColor = opts.fretColor;
    this.dotColor = opts.dotColor;
    this.dotTextColor = opts.dotTextColor;
    this.nutColor = opts.nutColor;
    this.textColor = opts.textColor;
    this.fingerPosition = ['below', 'inside', 'none'].includes(opts.fingerPosition)
      ? opts.fingerPosition
      : 'below';

    this.frets = this._normalizeFrets(opts.frets);
    this.fingers = this._normalizeFingers(opts.fingers);
    this.barres = Array.isArray(opts.barres) ? opts.barres : [];

    // Layout geometry, computed once so render() and toSVGString() share it.
    this._layout = this._computeLayout();
  }

  _normalizeFrets(frets) {
    if (!Array.isArray(frets)) {
      return new Array(this.strings).fill(-1);
    }
    if (frets.length !== this.strings) {
      throw new RangeError(
        `ChordShape: frets array length (${frets.length}) must match strings (${this.strings})`
      );
    }
    return frets.slice();
  }

  _normalizeFingers(fingers) {
    if (!Array.isArray(fingers)) {
      return new Array(this.strings).fill(null);
    }
    if (fingers.length !== this.strings) {
      throw new RangeError(
        `ChordShape: fingers array length (${fingers.length}) must match strings (${this.strings})`
      );
    }
    return fingers.slice();
  }

  _computeLayout() {
    const marginTop = 56; // room for chord name + ×/○ markers above the nut
    const marginBottom = 34; // room for finger numbers below the grid
    const marginSide = 24;

    const gridWidth = this.width - marginSide * 2;
    const gridHeight = this.height - marginTop - marginBottom;

    const stringGap = gridWidth / (this.strings - 1);
    const fretGap = gridHeight / this.fretCount;

    return {
      marginTop,
      marginBottom,
      marginSide,
      gridWidth,
      gridHeight,
      stringGap,
      fretGap,
      gridLeft: marginSide,
      gridRight: marginSide + gridWidth,
      gridTop: marginTop,
      gridBottom: marginTop + gridHeight,
    };
  }

  _stringX(index) {
    return this._round(this._layout.gridLeft + index * this._layout.stringGap);
  }

  _fretY(fretIndex) {
    // fretIndex is 0 at the nut/top line, increasing downward.
    return this._round(this._layout.gridTop + fretIndex * this._layout.fretGap);
  }

  /** Vertical center of a fret "cell" (between fret line fretIndex-1 and fretIndex). */
  _fretCenterY(fretPosition) {
    return this._round(this._fretY(fretPosition - 1) + this._layout.fretGap / 2);
  }

  /** Rounds to 2 decimal places to keep generated SVG markup clean and compact. */
  _round(n) {
    return Math.round(n * 100) / 100;
  }

  _svgOpen() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}" font-family="Arial, Helvetica, sans-serif">`;
  }

  _renderName() {
    if (!this.name) return '';
    const x = this.width / 2;
    const y = 34;
    return `<text x="${x}" y="${y}" font-size="${this.nameFontSize}" font-weight="bold" text-anchor="middle" fill="${this.textColor}">${this._escape(this.name)}</text>`;
  }

  _renderStartFretLabel() {
    if (this.startFret <= 1) return '';
    const x = this._layout.gridLeft - 14;
    const y = this._fretCenterY(1) + this.markerFontSize / 3;
    return `<text x="${x}" y="${y}" font-size="${this.markerFontSize}" text-anchor="middle" fill="${this.textColor}">${this.startFret}</text>`;
  }

  _renderNut() {
    // Thick top line when the diagram starts at the actual nut (fret 1);
    // a normal thin line when it's a mid-neck position (startFret > 1).
    const y = this._layout.gridTop;
    const strokeWidth = this.startFret === 1 ? 6 : 1.5;
    return `<line x1="${this._layout.gridLeft}" y1="${y}" x2="${this._layout.gridRight}" y2="${y}" stroke="${this.nutColor}" stroke-width="${strokeWidth}" stroke-linecap="square" />`;
  }

  _renderFrets() {
    let out = '';
    // Skip fret 0 here — it's drawn separately by _renderNut() so we can vary its weight.
    for (let f = 1; f <= this.fretCount; f++) {
      const y = this._fretY(f);
      out += `<line x1="${this._layout.gridLeft}" y1="${y}" x2="${this._layout.gridRight}" y2="${y}" stroke="${this.fretColor}" stroke-width="1.5" />`;
    }
    return out;
  }

  _renderStrings() {
    let out = '';
    for (let s = 0; s < this.strings; s++) {
      const x = this._stringX(s);
      out += `<line x1="${x}" y1="${this._layout.gridTop}" x2="${x}" y2="${this._layout.gridBottom}" stroke="${this.stringColor}" stroke-width="1.5" />`;
    }
    return out;
  }

  _renderOpenMutedMarkers() {
    let out = '';
    const y = this._layout.gridTop - 14;
    for (let s = 0; s < this.strings; s++) {
      const fret = this.frets[s];
      const x = this._stringX(s);
      if (fret === -1) {
        out += this._renderMuteX(x, y);
      } else if (fret === 0) {
        out += this._renderOpenCircle(x, y);
      }
    }
    return out;
  }

  _renderMuteX(cx, cy) {
    const r = 5;
    const s = this.markerFontSize;
    return (
      `<text x="${cx}" y="${cy}" font-size="${s}" font-weight="bold" text-anchor="middle" ` +
      `dominant-baseline="middle" fill="${this.textColor}">&#215;</text>`
    );
  }

  _renderOpenCircle(cx, cy) {
    const r = 5;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${this.textColor}" stroke-width="1.5" />`;
  }

  _renderBarres() {
    let out = '';
    for (const barre of this.barres) {
      out += this._renderBarre(barre);
    }
    return out;
  }

  _renderBarre(barre) {
    const { fret, fromString, toString, finger } = barre;
    const relFret = fret - this.startFret + 1;
    if (relFret < 1 || relFret > this.fretCount) return '';

    const lo = Math.min(fromString, toString);
    const hi = Math.max(fromString, toString);
    const x1 = this._stringX(lo);
    const x2 = this._stringX(hi);
    const y = this._fretCenterY(relFret);
    const r = this.dotRadius;

    // A rounded "pill" bar: a thick line with round caps reads cleanly as a barre,
    // distinct from a row of separate dots.
    let out = `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${this.dotColor}" stroke-width="${r * 2}" stroke-linecap="round" />`;

    if (finger != null && this.fingerPosition === 'inside') {
      out += `<text x="${(x1 + x2) / 2}" y="${y}" font-size="${this.fingerFontSize}" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="${this.dotTextColor}">${this._escape(String(finger))}</text>`;
    }
    return out;
  }

  _renderDots() {
    // Strings covered by a barre still get their own dot suppressed at the barre's
    // fret (the barre line already renders the marker for that position); a string
    // fretted at a *different* fret than the barre still gets a normal dot.
    const barredAt = new Map(); // string index -> fret number, for the topmost/most relevant barre
    for (const b of this.barres) {
      const lo = Math.min(b.fromString, b.toString);
      const hi = Math.max(b.fromString, b.toString);
      for (let s = lo; s <= hi; s++) {
        barredAt.set(s, b.fret);
      }
    }

    let out = '';
    for (let s = 0; s < this.strings; s++) {
      const fret = this.frets[s];
      if (fret <= 0) continue; // muted/open already handled above the nut

      if (barredAt.get(s) === fret) continue; // covered by the barre bar itself

      const relFret = fret - this.startFret + 1;
      if (relFret < 1 || relFret > this.fretCount) continue; // outside visible window

      const cx = this._stringX(s);
      const cy = this._fretCenterY(relFret);
      out += `<circle cx="${cx}" cy="${cy}" r="${this.dotRadius}" fill="${this.dotColor}" />`;

      const finger = this.fingers[s];
      if (finger != null && this.fingerPosition === 'inside') {
        out += `<text x="${cx}" y="${cy}" font-size="${this.fingerFontSize}" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="${this.dotTextColor}">${this._escape(String(finger))}</text>`;
      }
    }
    return out;
  }

  _renderFingerLabelsBelow() {
    // Prints finger numbers in a row below the grid, matching the reference
    // D-chord diagram's convention. Only active when fingerPosition === 'below'.
    if (this.fingerPosition !== 'below') return '';
    let out = '';
    const y = this._layout.gridBottom + 22;
    for (let s = 0; s < this.strings; s++) {
      const finger = this.fingers[s];
      if (finger == null) continue;
      const x = this._stringX(s);
      out += `<text x="${x}" y="${y}" font-size="${this.fingerFontSize}" text-anchor="middle" fill="${this.textColor}">${this._escape(String(finger))}</text>`;
    }
    return out;
  }

  _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Returns the diagram as an SVG markup string. */
  toSVGString() {
    let svg = this._svgOpen();
    svg += this._renderName();
    svg += this._renderStartFretLabel();
    svg += this._renderOpenMutedMarkers();
    svg += this._renderNut();
    svg += this._renderFrets();
    svg += this._renderStrings();
    svg += this._renderBarres();
    svg += this._renderDots();
    svg += this._renderFingerLabelsBelow();
    svg += '</svg>';
    return svg;
  }

  /** Returns a live SVGElement, ready to append to the DOM. */
  render() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.toSVGString().trim();
    return wrapper.firstElementChild;
  }
}

// Support both browser globals and CommonJS/ESM-via-CJS consumers without
// pulling in a build step or bundler config.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChordShape;
}
