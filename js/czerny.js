// Czerny-Tafel wählen: Skizzen, Katalog und interaktiver Finder.
// Tafel-Orientierung: lx waagrecht (kurze Seite), ly senkrecht (lange Seite).
// Randtypen: "h" gelenkig, "e" eingespannt, "f" frei.

(function () {
  const $ = (id) => document.getElementById(id);
  const fmt = (x, d = 2) => Number(x).toFixed(d).replace(".", ",");
  const SUB = (a, b) => `${a}<sub>${b}</sub>`;
  const LONG = (k) => k === "l" || k === "r";

  // ---------- Zeichnen ----------

  function edgeSVG(p1, p2, n, type, marked) {
    const cls = "cz-edge" + (marked ? " mark" : "");
    const line = (extra) =>
      `<line class="${cls}${extra}" x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}"/>`;
    if (type === "f") return line(" free");
    if (type === "h") return line("");
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    const len = Math.hypot(dx, dy), tx = dx / len, ty = dy / len;
    let d = "";
    for (let s = 3; s < len; s += 6) {
      const x = p1[0] + tx * s, y = p1[1] + ty * s;
      d += `M${x.toFixed(1)} ${y.toFixed(1)}L${(x + n[0] * 8 - tx * 4).toFixed(1)} ${(y + n[1] * 8 - ty * 4).toFixed(1)}`;
    }
    return `<path class="cz-hatch${marked ? " mark" : ""}" d="${d}"/>` + line(" clamp");
  }

  const lbl = (x, y, a, b, anchor = "middle") =>
    `<text class="cz-lbl" x="${x}" y="${y}" text-anchor="${anchor}">${a}<tspan class="cz-sub" dy="3">${b}</tspan></text>`;

  // Platte in Tafel-Orientierung
  function plateSVG({ lx, ly, E, mark = null, max = 110, labels = true, xlab = "l", ylab = "l" }) {
    const s = max / Math.max(lx, ly);
    const W = lx * s, H = ly * s, m = 30;
    const x0 = m, y0 = m;
    const P = {
      t: [[x0, y0], [x0 + W, y0], [0, -1]],
      r: [[x0 + W, y0], [x0 + W, y0 + H], [1, 0]],
      b: [[x0, y0 + H], [x0 + W, y0 + H], [0, 1]],
      l: [[x0, y0], [x0, y0 + H], [-1, 0]]
    };
    let g = `<rect class="cz-fill" x="${x0}" y="${y0}" width="${W}" height="${H}"/>`;
    for (const k of ["t", "r", "b", "l"]) g += edgeSVG(P[k][0], P[k][1], P[k][2], E[k], mark === k);
    if (labels) {
      g += lbl(x0 + W / 2, y0 + H + 24, xlab, "x");
      g += lbl(x0 + W + 14, y0 + H / 2 + 4, ylab, "y", "start");
    }
    return `<svg class="cz-plate" viewBox="0 0 ${W + 2 * m + 8} ${H + 2 * m}" role="img" aria-label="Plattenskizze">${g}</svg>`;
  }

  // ---------- Einordnung ----------

  function classify(E, square) {
    const keys = ["t", "r", "b", "l"];
    const c = keys.filter((k) => E[k] === "e");
    const lang = (on) => (square ? "quadratisch, Variante egal" : on);
    switch (c.length) {
      case 0: return { v: "V1", variant: "", text: "alle Ränder gelenkig" };
      case 1: return LONG(c[0])
        ? { v: "V2", variant: lang("langer Rand eingespannt"), text: "ein Rand eingespannt" }
        : { v: "V2", variant: lang("kurzer Rand eingespannt"), text: "ein Rand eingespannt" };
      case 2:
        if (LONG(c[0]) && LONG(c[1])) return { v: "V3", variant: lang("beide langen Ränder"), text: "zwei gegenüberliegende Ränder eingespannt" };
        if (!LONG(c[0]) && !LONG(c[1])) return { v: "V3", variant: lang("beide kurzen Ränder"), text: "zwei gegenüberliegende Ränder eingespannt" };
        return { v: "V4", variant: "", text: "zwei benachbarte Ränder eingespannt (Eckfeld)" };
      case 3: {
        const free = keys.find((k) => E[k] !== "e");
        return { v: "V5", variant: lang(LONG(free) ? "gelenkig ist ein langer Rand" : "gelenkig ist ein kurzer Rand"), text: "drei Ränder eingespannt" };
      }
      default: return { v: "V6", variant: "", text: "alle Ränder eingespannt (Innenfeld)" };
    }
  }
  const caseTag = (c) => {
    if (!c.variant || c.variant.startsWith("quadratisch")) return c.v;
    const lang = c.variant.includes("lang");
    return c.v + (c.v === "V5" ? (lang ? " gel. lang" : " gel. kurz") : (lang ? " lang" : " kurz"));
  };
  const caseName = (c) => c.v + (c.variant ? ` · ${c.variant}` : "");
  const sameCase = (a, b) => a.v === b.v && a.variant === b.variant;

  // Grundriss-Ränder N/E/S/W → Tafel t/r/b/l
  function toTafel(plan, a, b) {
    const rot = a > b; // Feld in x länger → um 90° drehen
    const map = rot ? { N: "r", E: "b", S: "l", W: "t" } : { N: "t", E: "r", S: "b", W: "l" };
    const E = {};
    for (const k in plan) E[map[k]] = plan[k];
    return { E, map, rot, lx: Math.min(a, b), ly: Math.max(a, b), square: Math.abs(a - b) < 1e-9 };
  }

  const supportIdx = (tafelEdge) => (LONG(tafelEdge) ? "x,erm" : "y,erm");
  const supportSym = (tafelEdge) => SUB("m", supportIdx(tafelEdge));

  function ratioText(lx, ly) {
    const r = ly / lx;
    if (r > 2.0001) return `l<sub>y</sub>/l<sub>x</sub> = ${fmt(r)} &gt; 2: trägt praktisch einachsig, Czerny nicht mehr sinnvoll`;
    const lo = Math.floor(r / 0.05 + 1e-9) * 0.05;
    if (Math.abs(r - lo) < 0.004) return `l<sub>y</sub>/l<sub>x</sub> = ${fmt(r)} → Spalte ${fmt(lo)}`;
    return `l<sub>y</sub>/l<sub>x</sub> = ${fmt(r)} → zwischen Spalte ${fmt(lo)} und ${fmt(lo + 0.05)} interpolieren`;
  }

  // ---------- Legende, Katalog, Vergleich ----------

  function renderLegend() {
    const host = $("cz-legend");
    if (!host) return;
    const item = (type, name, txt) => {
      const svg = `<svg viewBox="0 0 90 34" aria-hidden="true">${edgeSVG([10, 10], [80, 10], [0, 1], type, false)}</svg>`;
      return `<div class="cz-leg-item">${svg}<strong>${name}</strong><span>${txt}</span></div>`;
    };
    host.innerHTML =
      item("h", "gelenkig", "Linie. Rand liegt auf, darf sich verdrehen.") +
      item("e", "eingespannt", "Schraffur. Hier läuft die Platte ins Nachbarfeld weiter.") +
      item("f", "frei", "Strichliert. Kein Auflager, dann andere Tafel.");
  }

  const CATALOG = [
    { E: { t: "h", r: "h", b: "h", l: "h" }, where: "Einfeld auf Wänden oder Unterzügen. Und <b>immer</b> für q″ beim Feldmoment.", sup: "" },
    { E: { t: "h", r: "h", b: "h", l: "e" }, where: "Zweifeldplatte, Felder hängen über den <b>langen</b> Rand zusammen (Übung 02).", sup: "l" },
    { E: { t: "h", r: "h", b: "e", l: "h" }, where: "Felder hängen über den <b>kurzen</b> Rand zusammen (Sporthalle 2016, Randfeld).", sup: "b" },
    { E: { t: "h", r: "e", b: "h", l: "e" }, where: "Mittelfeld einer Reihe, Nachbarn an beiden langen Rändern.", sup: "l" },
    { E: { t: "e", r: "h", b: "e", l: "h" }, where: "Mittelfeld einer Reihe, Nachbarn an beiden kurzen Rändern (Sporthalle 2016).", sup: "b" },
    { E: { t: "e", r: "h", b: "h", l: "e" }, where: "Eckfeld eines Feldrasters (2 × 2 oder größer).", sup: "l" },
    { E: { t: "e", r: "e", b: "h", l: "e" }, where: "Randfeld im Raster, gelenkig ist ein kurzer Rand.", sup: "l" },
    { E: { t: "e", r: "e", b: "e", l: "h" }, where: "Randfeld im Raster, gelenkig ist ein langer Rand.", sup: "b" },
    { E: { t: "e", r: "e", b: "e", l: "e" }, where: "Innenfeld, rundum Nachbarfelder.", sup: "l" }
  ];

  function renderCatalog() {
    const host = $("cz-catalog");
    if (!host) return;
    host.innerHTML = CATALOG.map((it) => {
      const c = classify(it.E, false);
      const clamped = ["t", "r", "b", "l"].filter((k) => it.E[k] === "e");
      const syms = [...new Set(clamped.map(supportSym))].join(", ");
      return `<div class="cz-card">
        <strong>${c.v}</strong><em>${c.variant || c.text}</em>
        ${plateSVG({ lx: 4, ly: 5.6, E: it.E, max: 84 })}
        <span>${it.where}</span>
        ${syms ? `<span class="cz-sym">Stützmoment: ${syms}</span>` : ""}
      </div>`;
    }).join("");
  }

  // kleiner Grundriss für statische Bilder
  function planSVG(cfg, opts = {}) {
    const { nc, nr, a, b } = cfg;
    const maxW = opts.maxW || 380, maxH = opts.maxH || 250;
    const s = Math.min(maxW / (nc * a), maxH / (nr * b));
    const fw = a * s, fh = b * s, m = 26;
    const W = nc * fw, H = nr * fh;
    const signs = loadSigns(cfg);
    let g = "";
    for (let r = 0; r < nr; r++) {
      for (let c = 0; c < nc; c++) {
        const plus = signs[r][c] > 0;
        const isT = cfg.target.kind === "feld" && cfg.target.c === c && cfg.target.r === r;
        g += `<rect class="cz-field ${plus ? "plus" : "minus"}${isT ? " target" : ""}" data-c="${c}" data-r="${r}" x="${m + c * fw}" y="${m + r * fh}" width="${fw}" height="${fh}"/>`;
        g += `<text class="cz-ftxt" x="${m + c * fw + fw / 2}" y="${m + r * fh + fh / 2 + 4}" text-anchor="middle">${plus ? "g+q" : "g"}</text>`;
      }
    }
    // Innenlinien (Stützen)
    for (let r = 0; r < nr; r++) for (let c = 0; c < nc - 1; c++) {
      const x = m + (c + 1) * fw, y1 = m + r * fh, y2 = y1 + fh;
      const isT = cfg.target.kind === "stuetz" && cfg.target.side === "E" && cfg.target.c === c && cfg.target.r === r;
      g += `<line class="cz-sup${isT ? " target" : ""}" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>`;
      if (opts.interactive) g += `<line class="cz-hit" data-c="${c}" data-r="${r}" data-side="E" x1="${x}" y1="${y1 + 4}" x2="${x}" y2="${y2 - 4}"/>`;
    }
    for (let r = 0; r < nr - 1; r++) for (let c = 0; c < nc; c++) {
      const y = m + (r + 1) * fh, x1 = m + c * fw, x2 = x1 + fw;
      const isT = cfg.target.kind === "stuetz" && cfg.target.side === "S" && cfg.target.c === c && cfg.target.r === r;
      g += `<line class="cz-sup${isT ? " target" : ""}" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>`;
      if (opts.interactive) g += `<line class="cz-hit" data-c="${c}" data-r="${r}" data-side="S" x1="${x1 + 4}" y1="${y}" x2="${x2 - 4}" y2="${y}"/>`;
    }
    g += `<rect class="cz-outline" x="${m}" y="${m}" width="${W}" height="${H}"/>`;
    // Maße und Achsen
    g += `<text class="cz-dim" x="${m + fw / 2}" y="${m + H + 17}" text-anchor="middle">${fmt(a)} m</text>`;
    g += `<text class="cz-dim" x="${m - 6}" y="${m + fh / 2 + 4}" text-anchor="end" transform="rotate(-90 ${m - 12} ${m + fh / 2})">${fmt(b)} m</text>`;
    g += `<path class="cz-axis" d="M${m + W + 8} ${m + H + 12}h22M${m + W + 8} ${m + H + 12}v-22"/>`;
    g += `<text class="cz-dim" x="${m + W + 33}" y="${m + H + 16}">x</text><text class="cz-dim" x="${m + W + 5}" y="${m + H - 14}">y</text>`;
    return `<svg class="cz-plan${opts.interactive ? " interactive" : ""}" viewBox="0 0 ${W + 2 * m + 16} ${H + 2 * m}" role="img" aria-label="Grundriss mit Lastanordnung">${g}</svg>`;
  }

  function renderCompare() {
    const host = $("cz-compare");
    if (!host) return;
    const one = (a, b, title) => {
      const cfg = { nc: 2, nr: 1, a, b, target: { kind: "stuetz", c: 0, r: 0, side: "E" } };
      const t = toTafel({ N: "h", E: "e", S: "h", W: "h" }, a, b);
      const c = classify(t.E, t.square);
      return `<div class="cz-cmp">
        <h3>${title}</h3>
        <div class="cz-cmp-row">
          <figure>${planSVG(cfg, { maxW: 130, maxH: 90 })}<figcaption>Grundriss: zwei Felder nebeneinander</figcaption></figure>
          <span class="cz-arrow">${t.rot ? "↻ 90°" : "→"}</span>
          <figure>${plateSVG({ lx: t.lx, ly: t.ly, E: t.E, mark: t.map.E, max: 96 })}<figcaption>linkes Feld wie in der Tafel</figcaption></figure>
        </div>
        <p><b>${caseName(c)}</b>. Stützmoment heißt in der Tafel ${supportSym(t.map.E)}. ${t.rot ? "Das Feld ist in x länger, deshalb gedreht: <b>Tafel-x = Grundriss-y</b>." : "Keine Drehung nötig, Tafel-x = Grundriss-x."}</p>
      </div>`;
    };
    host.innerHTML = one(5.7, 6.7, "Felder 5,70 × 6,70 (wie Übung 02)") + one(6.7, 5.7, "Felder 6,70 × 5,70 (gleicher Grundriss, quer)");
  }

  // ---------- Lastbild und Analyse ----------

  function loadSigns(cfg) {
    const { nc, nr, target: T } = cfg;
    const out = [];
    for (let r = 0; r < nr; r++) {
      out.push([]);
      for (let c = 0; c < nc; c++) {
        let d;
        if (T.kind === "feld") d = Math.abs(c - T.c) + Math.abs(r - T.r);
        else if (T.side === "E") d = (c <= T.c ? T.c - c : c - (T.c + 1)) + Math.abs(r - T.r);
        else d = (r <= T.r ? T.r - r : r - (T.r + 1)) + Math.abs(c - T.c);
        out[r].push(d % 2 === 0 ? 1 : -1);
      }
    }
    return out;
  }

  function neighbours(cfg, c, r) {
    return {
      N: r > 0 ? "e" : "h",
      S: r < cfg.nr - 1 ? "e" : "h",
      W: c > 0 ? "e" : "h",
      E: c < cfg.nc - 1 ? "e" : "h"
    };
  }

  function fieldBlock(cfg, c, r, supportSide, vals) {
    const { a, b } = cfg;
    const qp = neighbours(cfg, c, r);
    const qpp = { N: "h", E: "h", S: "h", W: "h" };
    if (supportSide) qpp[supportSide] = "e";
    const t1 = toTafel(qp, a, b), t2 = toTafel(qpp, a, b);
    const c1 = classify(t1.E, t1.square), c2 = classify(t2.E, t2.square);
    const mark = supportSide ? t1.map[supportSide] : null;
    const lx = t1.lx, ly = t1.ly;
    const lx2 = lx * lx;
    const same = sameCase(c1, c2);
    const qTot = vals.g + vals.q, q1 = vals.g + vals.q / 2, q2 = vals.q / 2;

    const K = (idx, cs) => `k<sub>${idx}</sub>(${caseTag(cs)})`;
    let formulas;
    if (!supportSide) {
      if (same) {
        formulas = `Beide Anteile ${caseTag(c1)} → nicht zerlegen, direkt mit g<sub>d</sub>+q<sub>d</sub> = ${fmt(qTot)} kN/m²:<br>
          ${SUB("m", "x,m")} = ${fmt(qTot * lx2, 1)} / ${K("x,m", c1)} &nbsp;&nbsp; ${SUB("m", "y,m")} = ${fmt(qTot * lx2, 1)} / ${K("y,m", c1)} &nbsp; [kNm/m]`;
      } else {
        formulas = `${SUB("m", "x,m")} = q′·l<sub>x</sub>²/k′ + q″·l<sub>x</sub>²/k″ = ${fmt(q1 * lx2, 1)} / ${K("x,m", c1)} + ${fmt(q2 * lx2, 1)} / ${K("x,m", c2)}<br>
          ${SUB("m", "y,m")} = ${fmt(q1 * lx2, 1)} / ${K("y,m", c1)} + ${fmt(q2 * lx2, 1)} / ${K("y,m", c2)} &nbsp; [kNm/m]`;
      }
    } else {
      const idx = supportIdx(mark), sym = SUB("m", idx);
      if (same) {
        formulas = `Beide Anteile ${caseTag(c1)}, gleiche Lagerung → nicht zerlegen, direkt mit g<sub>d</sub>+q<sub>d</sub> = ${fmt(qTot)} kN/m²:<br>
          ${sym} = −${fmt(qTot * lx2, 1)} / ${K(idx, c1)} &nbsp; [kNm/m]`;
      } else {
        formulas = `${sym} = −( ${fmt(q1 * lx2, 1)} / ${K(idx, c1)} + ${fmt(q2 * lx2, 1)} / ${K(idx, c2)} ) &nbsp; [kNm/m]`;
      }
    }

    const rotNote = t1.rot
      ? `<p class="cz-rot">Feld ist in Grundriss-x länger (${fmt(a)} &gt; ${fmt(b)} m), daher für die Tafel um 90° gedreht: <b>Tafel-x = Grundriss-y</b>.</p>`
      : "";
    const fig = (t, cs, head, qtxt) => `<figure class="cz-fig">
        <figcaption><b>${head}</b> ${qtxt}</figcaption>
        ${plateSVG({ lx: t.lx, ly: t.ly, E: t.E, mark, max: 100 })}
        <p class="cz-case"><b>${cs.v}</b>${cs.variant ? ` · ${cs.variant}` : ""}<br><small>${cs.text}</small></p>
      </figure>`;

    return `<div class="cz-field-block">
      <h4>Feld ${c + 1}/${r + 1} &nbsp;<small>(Spalte/Zeile im Grundriss)</small></h4>
      ${rotNote}
      <div class="cz-figs">
        ${fig(t1, c1, "q′", `= g<sub>d</sub> + q<sub>d</sub>/2 = ${fmt(q1)} kN/m²`)}
        ${fig(t2, c2, "q″", `= ± q<sub>d</sub>/2 = ${fmt(q2)} kN/m²`)}
      </div>
      <p class="cz-ratio">l<sub>x</sub> = ${fmt(lx)} m, l<sub>y</sub> = ${fmt(ly)} m, ${ratioText(lx, ly)}</p>
      <p class="eq">${formulas}</p>
      <div class="cz-summary">Auf dein Blatt: <b>q′ → ${caseName(c1)}</b>, <b>q″ → ${caseName(c2)}</b>, Spalte ${fmt(ly / lx)}</div>
    </div>`;
  }

  function analyse(cfg) {
    const vals = { g: cfg.g, q: cfg.q };
    const T = cfg.target;
    if (T.kind === "feld") {
      return `<h3>Größtes Feldmoment in Feld ${T.c + 1}/${T.r + 1}</h3>
        <p>Nutzlast nur auf dem betrachteten Feld und schachbrettartig weiter (Grundriss oben). Zerlegt: q′ überall, q″ = ± q/2 wie im Schachbrett.</p>
        ${fieldBlock(cfg, T.c, T.r, null, vals)}`;
    }
    const c2 = T.side === "E" ? T.c + 1 : T.c, r2 = T.side === "S" ? T.r + 1 : T.r;
    const opp = T.side === "E" ? "W" : "N";
    const n1 = neighbours(cfg, T.c, T.r), n2 = neighbours(cfg, c2, r2);
    const symmetric = JSON.stringify(Object.values(n1).sort()) === JSON.stringify(Object.values(n2).sort());
    return `<h3>Größtes Stützmoment zwischen Feld ${T.c + 1}/${T.r + 1} und ${c2 + 1}/${r2 + 1}</h3>
      <p>Beide angrenzenden Felder voll belastet. q″ ist an der gesuchten Stütze symmetrisch, dort bleibt es eingespannt. Alle anderen Ränder sind für q″ gelenkig.</p>
      ${fieldBlock(cfg, T.c, T.r, T.side, vals)}
      ${symmetric ? `<p class="cz-rot">Das Nachbarfeld ${c2 + 1}/${r2 + 1} hat dieselbe Lagerung, also dasselbe Ergebnis.</p>`
        : `${fieldBlock(cfg, c2, r2, opp, vals)}
           <div class="note"><strong>Zwei Felder, zwei Werte:</strong> Das Stützmoment aus beiden angrenzenden Feldern rechnen und den betragsgrößeren nehmen. Sporthalle 2016: Randfeld −42,4, Mittelfeld −37,4 kNm/m.</div>`}`;
  }

  // ---------- Finder (interaktiv) ----------

  const state = {
    nc: 2, nr: 1, a: 5.7, b: 6.7, g: 9.84, q: 6.0,
    target: { kind: "stuetz", c: 0, r: 0, side: "E" },
    quiz: false
  };

  function readInputs() {
    state.nc = +$("cz-nc").value;
    state.nr = +$("cz-nr").value;
    state.a = Math.max(0.5, +$("cz-a").value || 1);
    state.b = Math.max(0.5, +$("cz-b").value || 1);
    state.g = Math.max(0, +$("cz-g").value || 0);
    state.q = Math.max(0, +$("cz-q").value || 0);
    clampTarget();
  }

  function writeInputs() {
    $("cz-nc").value = state.nc;
    $("cz-nr").value = state.nr;
    $("cz-a").value = state.a.toFixed(2);
    $("cz-b").value = state.b.toFixed(2);
    $("cz-g").value = state.g.toFixed(2);
    $("cz-q").value = state.q.toFixed(2);
  }

  function clampTarget() {
    const T = state.target;
    T.c = Math.min(T.c, state.nc - 1);
    T.r = Math.min(T.r, state.nr - 1);
    if (T.kind === "stuetz") {
      if (T.side === "E" && T.c >= state.nc - 1) {
        if (state.nr > 1) { T.side = "S"; T.r = Math.min(T.r, state.nr - 2); } else state.target = { kind: "feld", c: 0, r: 0 };
      } else if (T.side === "S" && T.r >= state.nr - 1) {
        if (state.nc > 1) { T.side = "E"; T.c = Math.min(T.c, state.nc - 2); } else state.target = { kind: "feld", c: 0, r: 0 };
      }
    }
  }

  function render() {
    $("cz-plan").innerHTML = planSVG(state, { interactive: true });
    const res = $("cz-result");
    res.innerHTML = analyse(state);
    res.hidden = state.quiz;
    $("cz-reveal").hidden = !state.quiz;
    const qEl = $("cz-question");
    qEl.hidden = !state.quiz;
    if (state.quiz) {
      const T = state.target;
      const what = T.kind === "feld" ? `das größte <b>Feldmoment</b> in Feld ${T.c + 1}/${T.r + 1}` : `das größte <b>Stützmoment</b> an der roten Linie`;
      qEl.innerHTML = `<b>Aufgabe:</b> Gesucht ist ${what}. Außenränder gelenkig, Innenlinien = durchlaufende Platte.
        Schreib dir auf: Lagerungsfall für q′? für q″? Einspannung am langen oder kurzen Rand? Spalte l<sub>y</sub>/l<sub>x</sub>? Dann „Lösung zeigen“.`;
    }
  }

  function onPlanClick(e) {
    const el = e.target.closest("[data-c]");
    if (!el) return;
    const c = +el.dataset.c, r = +el.dataset.r;
    state.target = el.dataset.side ? { kind: "stuetz", c, r, side: el.dataset.side } : { kind: "feld", c, r };
    render();
  }

  function randomTask() {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const dims = [4.5, 5.0, 5.5, 5.7, 6.0, 6.25, 6.5, 7.0, 7.5];
    state.nc = pick([1, 2, 2, 3, 3]);
    state.nr = pick(state.nc === 1 ? [2, 3] : [1, 1, 2, 3]);
    state.a = pick(dims);
    state.b = pick(dims);
    const opts = [];
    for (let r = 0; r < state.nr; r++) for (let c = 0; c < state.nc; c++) {
      opts.push({ kind: "feld", c, r });
      if (c < state.nc - 1) opts.push({ kind: "stuetz", c, r, side: "E" });
      if (r < state.nr - 1) opts.push({ kind: "stuetz", c, r, side: "S" });
    }
    state.target = pick(opts);
    state.quiz = true;
    writeInputs();
    render();
  }

  const PRESETS = {
    uebung: { nc: 2, nr: 1, a: 5.7, b: 6.7, g: 9.84, q: 6.0, target: { kind: "feld", c: 0, r: 0 } },
    sport: { nc: 1, nr: 3, a: 5.0, b: 6.25, g: 9.11, q: 7.5, target: { kind: "stuetz", c: 0, r: 0, side: "S" } }
  };

  function loadPreset(p) {
    Object.assign(state, JSON.parse(JSON.stringify(p)), { quiz: false });
    writeInputs();
    render();
    $("cz-app").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function initFinder() {
    if (!$("cz-app")) return;
    writeInputs();
    ["cz-nc", "cz-nr", "cz-a", "cz-b", "cz-g", "cz-q"].forEach((id) =>
      $(id).addEventListener("input", () => { state.quiz = false; readInputs(); render(); }));
    $("cz-plan").addEventListener("click", onPlanClick);
    $("cz-quiz").addEventListener("click", randomTask);
    $("cz-reveal").addEventListener("click", () => { state.quiz = false; render(); $("cz-result").scrollIntoView({ behavior: "smooth", block: "start" }); });
    $("cz-uebung").addEventListener("click", () => loadPreset(PRESETS.uebung));
    $("cz-sport").addEventListener("click", () => loadPreset(PRESETS.sport));
    render();
  }

  // ---------- Mini-Bilder in den Regeln ----------

  function renderMinis() {
    document.querySelectorAll("[data-mini]").forEach((host) => {
      const feld = host.dataset.mini === "feld";
      const cfg = feld
        ? { nc: 3, nr: 1, a: 5, b: 6.5, target: { kind: "feld", c: 1, r: 0 } }
        : { nc: 3, nr: 1, a: 5, b: 6.5, target: { kind: "stuetz", c: 0, r: 0, side: "E" } };
      const n = neighbours(cfg, feld ? 1 : 0, 0);
      const qpp = { N: "h", E: feld ? "h" : "e", S: "h", W: "h" };
      const t1 = toTafel(n, cfg.a, cfg.b), t2 = toTafel(qpp, cfg.a, cfg.b);
      const mark = feld ? null : "r";
      host.innerHTML = `${planSVG(cfg, { maxW: 200, maxH: 90 })}
        <div class="cz-mini-row">
          <figure>${plateSVG({ lx: t1.lx, ly: t1.ly, E: t1.E, mark, max: 64, labels: false })}<figcaption>q′: ${classify(t1.E).v}</figcaption></figure>
          <figure>${plateSVG({ lx: t2.lx, ly: t2.ly, E: t2.E, mark, max: 64, labels: false })}<figcaption>q″: ${classify(t2.E).v}</figcaption></figure>
        </div>
        <small>${feld ? "Beispiel: Mittelfeld einer Dreifeldplatte" : "Beispiel: Stütze zwischen Feld 1 und 2"}</small>`;
    });
  }

  // ---------- Fälle aus Übung und Prüfungen ----------

  const CASES = [
    {
      title: "Übung 02 · Dachterrasse",
      cfg: { nc: 2, nr: 1, a: 5.7, b: 6.7, target: { kind: "stuetz", c: 0, r: 0, side: "E" } },
      body: `2 Felder, je l<sub>x</sub> = 5,70 × l<sub>y</sub> = 6,70 m, Mittelwand am <b>langen</b> Rand. l<sub>y</sub>/l<sub>x</sub> = 1,18.
        <ul><li>Stütze: q′ und q″ beide V2 (lang) → direkt mit g+q, k = (10,5+10,2)/2 = 10,35 → m<sub>x,erm</sub> = −49,7 kNm/m.</li>
        <li>Feld: q′ → V2 lang (k<sub>x</sub> = 25,15, k<sub>y</sub> = 47,95), q″ → V1 (k<sub>x</sub> = 19,90, k<sub>y</sub> = 28,75) → m<sub>x</sub> = 21,5, m<sub>y</sub> = 12,1 kNm/m.</li></ul>`,
      preset: "uebung"
    },
    {
      title: "Sporthalle 2016 · Dreifeldplatte",
      cfg: { nc: 1, nr: 3, a: 5.0, b: 6.25, target: { kind: "stuetz", c: 0, r: 0, side: "S" } },
      body: `3 Felder, l<sub>x</sub> = 5,00 × l<sub>y</sub> = 6,25 m, hängen über den <b>kurzen</b> Rand zusammen (Unterzüge). l<sub>y</sub>/l<sub>x</sub> = 1,25.
        <ul><li>Randfeld: Stütze V2 kurz, m<sub>y,erm</sub> mit k = 9,8 → −42,4. Feld: q′ V2 kurz (23,4 / 29,2) + q″ V1 (17,8 / 29,9).</li>
        <li>Mittelfeld: Feld q′ V3 kurz (31,5 / 31,3) + q″ V1. Stütze rechnet die Lösung vereinfacht ganz mit V3 (k = 11,1 → −37,4). Nach Folie 6 wäre q″ dort V2. Maßgebend ist ohnehin das Randfeld.</li></ul>`,
      preset: "sport"
    },
    {
      title: "Kindergarten 2015 · Wohnbau 2014",
      cfg: { nc: 2, nr: 1, a: 6.0, b: 6.0, target: { kind: "feld", c: 0, r: 0 } },
      body: `Zweifeldplatten mit <b>quadratischen</b> Feldern (6 × 6 m bzw. 6,5 × 6,5 m). l<sub>y</sub>/l<sub>x</sub> = 1,0, lang oder kurz spielt keine Rolle.
        <ul><li>Stütze: V2 mit g+q. Feld: q′ V2 + q″ V1.</li>
        <li>Wohnbau: Achse B ist laut Angabe eine „gelenkige Fuge“, dort also <b>gelenkig</b>, nicht eingespannt.</li></ul>`
    },
    {
      title: "Werkstatt 2014 · Prüfhalle 2015",
      cfg: { nc: 1, nr: 1, a: 5.0, b: 7.0, target: { kind: "feld", c: 0, r: 0 } },
      body: `<b>Einfeldplatte</b>, alle Ränder gelenkig auf Unterzügen/Scheiben. Kein Nachbarfeld, also auch keine Lastumordnung.
        <ul><li>Nur V1 mit g<sub>d</sub>+q<sub>d</sub>: m<sub>x,m</sub>, m<sub>y,m</sub>, Querkräfte, Drillmoment m<sub>xy</sub> für die Eckbewehrung.</li></ul>`
    }
  ];

  function renderCases() {
    const host = $("cz-cases");
    if (!host) return;
    host.innerHTML = CASES.map((k, i) => `<div class="cz-casecard">
        <h3>${k.title}</h3>
        ${planSVG(k.cfg, { maxW: 220, maxH: 130 })}
        <div>${k.body}</div>
        ${k.preset ? `<button type="button" data-preset="${k.preset}">im Finder öffnen</button>` : ""}
      </div>`).join("");
    host.addEventListener("click", (e) => {
      const b = e.target.closest("[data-preset]");
      if (b) loadPreset(PRESETS[b.dataset.preset]);
    });
  }

  function renderFree() {
    const host = $("cz-free");
    if (!host) return;
    host.innerHTML = `<figure class="cz-fig">
        ${plateSVG({ lx: 5, ly: 6, E: { t: "f", r: "h", b: "h", l: "h" }, max: 110 })}
        <figcaption>oben frei (Glasfassade), drei Ränder gelenkig. l<sub>x</sub> = freier Rand.</figcaption>
      </figure>`;
  }

  renderLegend();
  renderCatalog();
  renderCompare();
  renderMinis();
  renderCases();
  renderFree();
  initFinder();
})();
