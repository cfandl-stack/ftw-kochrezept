// Scheibe / wandartiger Träger: Entscheidung, Hebelarm-Bild, Fachwerk-Rechner, Knicklänge.

(function () {
  const $ = (id) => document.getElementById(id);
  const fmt = (x, d = 1) => (isFinite(x) ? Number(x).toFixed(d).replace(".", ",") : "–");
  const num = (id) => Math.max(0, parseFloat($(id).value) || 0);

  // ---------- Entscheidung ----------
  function renderDecide() {
    const host = $("wt-decide");
    if (!host) return;
    host.innerHTML = `
      <div class="wt-q">Wie liegt die Wand auf?</div>
      <div class="wt-branches">
        <div class="wt-branch">
          <span class="wt-edge">durchgehend (Fundament, Wand darunter)</span>
          <div class="wt-res b">Wandscheibe<br><small>Druck in der Ebene → Knicknachweis, Weg B</small></div>
        </div>
        <div class="wt-branch">
          <span class="wt-edge">auf zwei oder mehr Punkten (Stützen, Fundamente)</span>
          <div class="wt-q small">l<sub>eff</sub> / h &lt; 2 (Einfeld)?</div>
          <div class="wt-branches inner">
            <div class="wt-branch"><span class="wt-edge">ja</span><div class="wt-res a">Wandartiger Träger<br><small>Fachwerk, Weg A</small></div></div>
            <div class="wt-branch"><span class="wt-edge">nein</span><div class="wt-res">Balken<br><small>normale Biegebemessung</small></div></div>
          </div>
        </div>
      </div>`;
  }

  // ---------- Hebelarm-Bild ----------
  function renderLever() {
    const host = $("wt-lever");
    if (!host) return;
    const l = 6, ratios = [0.25, 0.5, 0.8, 1.2];
    const s = 22, gap = 26, base = 190;
    let x = 10, g = "";
    ratios.forEach((r) => {
      const h = r * l, W = l * s, H = h * s;
      const beam = l / h > 2.0001;
      const z = beam ? 0.8 * h : Math.min(0.6 * l, 0.75 * h);
      const y0 = base - H;
      const yT = base - 0.1 * h * s, yC = yT - z * s;
      g += `<rect class="wt-wall" x="${x}" y="${y0}" width="${W}" height="${H}"/>`;
      g += `<line class="wt-z" x1="${x + 6}" y1="${yT}" x2="${x + W - 6}" y2="${yT}"/>`;
      g += `<line class="wt-d" x1="${x + 6}" y1="${yC}" x2="${x + W - 6}" y2="${yC}"/>`;
      g += `<path class="wt-dim" d="M${x + W + 5} ${yT}V${yC}M${x + W + 2} ${yT}h6M${x + W + 2} ${yC}h6"/>`;
      g += `<text class="wt-t" x="${x + W / 2}" y="${base + 16}" text-anchor="middle">l/h = ${fmt(l / h, 2)}</text>`;
      g += `<text class="wt-t strong" x="${x + W / 2}" y="${base + 31}" text-anchor="middle">z = ${fmt(z / l, 2)}·l${beam ? " (≈0,8 h)" : ""}</text>`;
      x += W + gap;
    });
    host.innerHTML = `<figure class="viz wt-fig">
      <svg viewBox="0 0 ${x} ${base + 38}" role="img" aria-label="Hebelarm bei steigender Wandhöhe">${g}</svg>
      <figcaption>Gleiche Spannweite, immer höhere Wand. Rot das Zugband, grün die Druckresultierende. Solange die Wand ein Balken ist, wächst z mit der Höhe (≈ 0,8 h). Ab dem wandartigen Träger ist bei z = 0,6·l Schluss. Mehr Beton oben hilft nicht mehr.</figcaption>
    </figure>`;
  }

  // ---------- Fachwerk-Zeichnung ----------
  // Knoten in Metern, Ursprung links unten auf Höhe Wandunterkante.
  function trussSVG(o) {
    const { L, lges, h, u, bars, loads, supports, title, note } = o;
    const pad = 34, s = Math.min(250 / lges, 160 / h);
    const W = lges * s, H = h * s;
    const ox = pad, oy = pad + 16 + H; // Wandunterkante
    const X = (x) => ox + (x + (lges - L) / 2) * s; // x ab Lagermitte links
    const Y = (y) => oy - y * s;
    let g = `<rect class="wt-wall" x="${ox}" y="${oy - H}" width="${W}" height="${H}"/>`;
    g += `<rect class="wt-uband" x="${ox}" y="${Y(u)}" width="${W}" height="${u * s}"/>`;
    // Lager
    supports.forEach((sp) => {
      const la = (lges - L);
      g += `<rect class="wt-sup" x="${X(sp.x) - (la * s) / 2}" y="${oy}" width="${la * s}" height="7"/>`;
      g += `<text class="wt-t" x="${X(sp.x)}" y="${oy + 21}" text-anchor="middle">${sp.label}</text>`;
    });
    bars.forEach((b) => {
      g += `<line class="${b.t === "z" ? "wt-z" : "wt-d"}" x1="${X(b.a[0])}" y1="${Y(b.a[1])}" x2="${X(b.b[0])}" y2="${Y(b.b[1])}"/>`;
      if (b.label) {
        const mx = (X(b.a[0]) + X(b.b[0])) / 2, my = (Y(b.a[1]) + Y(b.b[1])) / 2;
        g += `<text class="wt-t ${b.t === "z" ? "tz" : "td"}" x="${mx + (b.dx || 0)}" y="${my + (b.dy || 0)}" text-anchor="middle">${b.label}</text>`;
      }
    });
    loads.forEach((ld) => {
      if (ld.q) {
        const x1 = X(ld.from), x2 = X(ld.to), yt = oy - H;
        g += `<rect class="wt-qband" x="${x1}" y="${yt - 12}" width="${x2 - x1}" height="10"/>`;
        for (let x = x1 + 4; x < x2; x += 10) g += `<line class="wt-load thin" x1="${x}" y1="${yt - 11}" x2="${x}" y2="${yt - 3}"/>`;
      } else {
        const x = X(ld.x), yt = oy - H;
        g += `<line class="wt-load" x1="${x}" y1="${yt - 18}" x2="${x}" y2="${Y(ld.y) - 4}"/><path class="wt-arrow" d="M${x - 4} ${Y(ld.y) - 9}L${x} ${Y(ld.y) - 2}L${x + 4} ${Y(ld.y) - 9}Z"/>`;
      }
      if (ld.label) g += `<text class="wt-t strong" x="${ld.q ? (X(ld.from) + X(ld.to)) / 2 : X(ld.x)}" y="${oy - H - 21}" text-anchor="middle">${ld.label}</text>`;
    });
    // Knoten
    const nodes = new Set();
    bars.forEach((b) => { nodes.add(b.a.join()); nodes.add(b.b.join()); });
    nodes.forEach((n) => { const [x, y] = n.split(",").map(Number); g += `<circle class="wt-node" cx="${X(x)}" cy="${Y(y)}" r="3"/>`; });
    return `<figure class="wt-model">
      <figcaption><b>${title}</b></figcaption>
      <svg viewBox="0 0 ${W + 2 * pad} ${H + pad + 16 + 30}" role="img" aria-label="${title}">${g}</svg>
      <div class="wt-note">${note}</div>
    </figure>`;
  }

  // ---------- Rechner wandartiger Träger ----------
  const PRE = {
    kiga: { "wt-h": 8.0, "wt-l": 12.8, "wt-la": 0.8, "wt-d": 0.30, "wt-fck": 35, "wt-f": 313.4, "wt-q": 81, "wt-qh": 122.97 },
    lager: { "wt-h": 7.2, "wt-l": 11.0, "wt-la": 0.7, "wt-d": 0.25, "wt-fck": 30, "wt-f": 0, "wt-q": 334.54, "wt-qh": 0 },
    uebung: { "wt-h": 4.6, "wt-l": 5.1, "wt-la": 0.5, "wt-d": 0.25, "wt-fck": 35, "wt-f": 0, "wt-q": 562.5, "wt-qh": 0 }
  };

  function calcWT() {
    const h = num("wt-h"), lges = num("wt-l"), la = num("wt-la"), d = num("wt-d");
    const fck = num("wt-fck"), fyd = num("wt-fyd"), F = num("wt-f"), q = num("wt-q"), qh = num("wt-qh");
    const L = lges - la;
    const out = $("wt-out");
    if (!(L > 0 && h > 0)) { out.innerHTML = `<p class="note">Bitte gültige Geometrie eingeben.</p>`; return; }
    const ratio = L / h;
    const u = Math.min(0.1 * h, 0.1 * L);
    const dh = h - u; // Zugband auf u/2 von unten, Lastknoten u/2 von oben
    const yT = u / 2, yTop = h - u / 2;

    const models = [];
    let Zsum = 0, AL = 0, AR = 0;

    if (F > 0) {
      const a = Math.atan(dh / (L / 2)), D = F / 2 / Math.sin(a), Z = D * Math.cos(a);
      Zsum += Z; AL += F / 2; AR += F / 2;
      models.push(trussSVG({
        L, lges, h, u, title: "① Einzellast in Feldmitte",
        supports: [{ x: 0, label: `A = ${fmt(F / 2)}` }, { x: L, label: `B = ${fmt(F / 2)}` }],
        loads: [{ x: L / 2, y: yTop, label: `F = ${fmt(F)} kN` }],
        bars: [
          { t: "d", a: [L / 2, yTop], b: [0, yT], label: `D = ${fmt(D)}`, dx: -26 },
          { t: "d", a: [L / 2, yTop], b: [L, yT] },
          { t: "z", a: [0, yT], b: [L, yT], label: `Z = ${fmt(Z)}`, dy: -6 }
        ],
        note: `α = arctan((h − u) / (l<sub>eff</sub>/2)) = ${fmt(a * 180 / Math.PI)}°<br>D = (F/2) / sin α = ${fmt(D)} kN<br>Z = D · cos α = <b>${fmt(Z)} kN</b>`
      }));
    }
    if (q > 0) {
      const z = Math.min(0.6 * L, 0.75 * h), M = q * L * L / 8, Z = M / z, A = q * lges / 2;
      Zsum += Z; AL += A; AR += A;
      const yC = yT + z;
      models.push(trussSVG({
        L, lges, h, u, title: "② Gleichlast (z. B. Eigengewicht)",
        supports: [{ x: 0, label: `A = ${fmt(A)}` }, { x: L, label: `B = ${fmt(A)}` }],
        loads: [{ q: true, from: -(lges - L) / 2, to: L + (lges - L) / 2, label: `q = ${fmt(q)} kN/m` }],
        bars: [
          { t: "d", a: [L / 4, yC], b: [0, yT] },
          { t: "d", a: [3 * L / 4, yC], b: [L, yT] },
          { t: "d", a: [L / 4, yC], b: [3 * L / 4, yC], label: "D", dy: -5 },
          { t: "z", a: [0, yT], b: [L, yT], label: `Z = ${fmt(Z)}`, dy: -6 }
        ],
        note: `z = min(0,6·l<sub>eff</sub>; 0,75·h) = ${fmt(z, 2)} m<br>M = q·l<sub>eff</sub>²/8 = ${fmt(M)} kNm<br>Z = M / z = <b>${fmt(Z)} kN</b>`
      }));
    }
    if (qh > 0) {
      const Fr = qh * L / 2, A = 0.75 * Fr, B = 0.25 * Fr;
      const a = Math.atan(dh / (L / 4)), D = A / Math.sin(a), Z = D * Math.cos(a);
      Zsum += Z; AL += A; AR += B;
      models.push(trussSVG({
        L, lges, h, u, title: "③ Streckenlast auf der linken Hälfte",
        supports: [{ x: 0, label: `A = ${fmt(A)}` }, { x: L, label: `B = ${fmt(B)}` }],
        loads: [{ x: L / 4, y: yTop, label: `F = q·l/2 = ${fmt(Fr)} kN` }],
        bars: [
          { t: "d", a: [L / 4, yTop], b: [0, yT], label: `D = ${fmt(D)}`, dx: -30 },
          { t: "d", a: [L / 4, yTop], b: [L, yT] },
          { t: "z", a: [0, yT], b: [L, yT], label: `Z = ${fmt(Z)}`, dy: -6 }
        ],
        note: `Resultierende im Viertelspunkt, A = ¾·F = ${fmt(A)} kN<br>α = arctan((h − u) / (l<sub>eff</sub>/4)) = ${fmt(a * 180 / Math.PI)}°<br>D = A / sin α = ${fmt(D)} kN, Z = D · cos α = <b>${fmt(Z)} kN</b>`
      }));
    }

    const As = Zsum / fyd * 10; // kN / (N/mm²) → cm²
    const fcd = fck / 1.5, nu = 1 - fck / 250, sRd = 0.85 * nu * fcd;
    const Amax = Math.max(AL, AR);
    const sig = Amax / (la * d) / 1000; // kN/m² → N/mm²
    const util = sig / sRd;
    const cls = ratio < 2 ? "ok" : "note";

    out.innerHTML = `
      <p class="${cls}">l<sub>eff</sub> = ${fmt(lges, 2)} − ${fmt(la, 2)} = ${fmt(L, 2)} m, &nbsp; l<sub>eff</sub>/h = ${fmt(ratio, 2)} ${ratio < 2 ? "&lt; 2 → <b>wandartiger Träger</b>, Fachwerk" : "≥ 2 → eher Balken, Fachwerk nicht nötig"}.
        &nbsp; u = min(0,1·h; 0,1·l<sub>eff</sub>) = ${fmt(u, 2)} m</p>
      <div class="wt-models">${models.join("") || '<p class="note">Keine Last eingegeben.</p>'}</div>
      <div class="wt-sum">
        <div><span>Zugband</span><b>Z = ${fmt(Zsum)} kN</b><small>Summe aller Modelle</small></div>
        <div><span>Bewehrung</span><b>A<sub>s</sub> = ${fmt(As, 2)} cm²</b><small>= Z / f<sub>yd</sub>, auf u = ${fmt(u * 100, 0)} cm verteilen</small></div>
        <div><span>+ 25 % horizontal</span><b>${fmt(0.25 * As, 2)} cm²</b><small>zwischen 0,1 h und 0,3 h</small></div>
        <div class="${util <= 1 ? "good" : "bad"}"><span>Auflagerpressung</span><b>σ = ${fmt(sig, 2)} N/mm²</b><small>F<sub>A</sub> = ${fmt(Amax)} kN, σ<sub>Rd</sub> = 0,85·${fmt(nu, 2)}·${fmt(fcd, 2)} = ${fmt(sRd, 2)} → ${fmt(util * 100, 0)} %</small></div>
      </div>`;
  }

  function initWT() {
    if (!$("wt-app")) return;
    $("wt-app").addEventListener("input", calcWT);
    $("wt-app").addEventListener("click", (e) => {
      const b = e.target.closest("[data-wt]");
      if (!b) return;
      const p = PRE[b.dataset.wt];
      for (const k in p) $(k).value = p[k];
      calcWT();
    });
    calcWT();
  }

  // ---------- Knicklänge Wandscheibe ----------
  function calcWB() {
    const c = $("wb-case").value, lw = num("wb-lw"), b = num("wb-b"), hw = num("wb-hw") / 100;
    const n = num("wb-n"), fck = num("wb-fck");
    let beta, formula;
    if (c === "2g") { beta = 1.0; formula = "β = 1,0"; }
    else if (c === "2e") { beta = 0.85; formula = "β = 0,85"; }
    else if (c === "3") { beta = 1 / (1 + Math.pow(lw / (3 * b), 2)); formula = "β = 1 / {1 + [l<sub>w</sub>/(3b)]²}"; }
    else if (b >= lw) { beta = 1 / (1 + Math.pow(lw / b, 2)); formula = "b ≥ l<sub>w</sub>: β = 1 / [1 + (l<sub>w</sub>/b)²]"; }
    else { beta = b / (2 * lw); formula = "b &lt; l<sub>w</sub>: β = b / (2·l<sub>w</sub>)"; }
    const l0 = beta * lw, i = hw / Math.sqrt(12), lam = l0 / i;
    const fcd = fck / 1.5, nn = n / (hw * 1000 * fcd); // kN/m / (m · N/mm² ·1000) dimensionslos
    const lim = nn >= 0.41 ? 25 : 16 / Math.sqrt(nn);
    const second = lam > lim;
    const edges = { "2g": "tb", "2e": "tb", "3": "tbl", "4": "tblr" }[c];
    $("wb-out").innerHTML = `
      <div class="wb-grid">
        ${wallSVG(edges, lw, b)}
        <div>
          <p class="eq">${formula} = <b>${fmt(beta, 3)}</b><br>
            l<sub>0</sub> = β · l<sub>w</sub> = ${fmt(beta, 3)} · ${fmt(lw, 2)} = <b>${fmt(l0, 2)} m</b><br>
            i = h<sub>w</sub>/√12 = ${fmt(i * 100, 2)} cm, &nbsp; λ = l<sub>0</sub>/i = <b>${fmt(lam, 1)}</b><br>
            n = n<sub>Ed</sub>/(h<sub>w</sub>·f<sub>cd</sub>) = ${fmt(nn, 3)} → λ<sub>lim</sub> = ${nn >= 0.41 ? "25" : "16/√n = " + fmt(lim, 1)}</p>
          <p class="${second ? "note" : "ok"}">${second ? `<strong>λ = ${fmt(lam, 1)} &gt; λ<sub>lim</sub> = ${fmt(lim, 1)}:</strong> Theorie II. Ordnung, Modellstützenverfahren mit Ausmitten.` : `<strong>λ = ${fmt(lam, 1)} ≤ λ<sub>lim</sub> = ${fmt(lim, 1)}:</strong> Theorie I. Ordnung reicht (Ausmitte e<sub>0</sub> + e<sub>i</sub>).`}</p>
        </div>
      </div>`;
  }

  // Wandansicht mit gehaltenen Rändern (t oben, b unten, l/r seitlich)
  function wallSVG(edges, lw, b) {
    const s = Math.min(170 / b, 110 / lw), W = b * s, H = lw * s, x0 = 26, y0 = 18;
    let g = `<rect class="wt-wall" x="${x0}" y="${y0}" width="${W}" height="${H}"/>`;
    const hatch = (x1, y1, x2, y2, nx, ny) => {
      let d = ""; const len = Math.hypot(x2 - x1, y2 - y1), tx = (x2 - x1) / len, ty = (y2 - y1) / len;
      for (let t = 3; t < len; t += 6) { const x = x1 + tx * t, y = y1 + ty * t; d += `M${x} ${y}l${nx * 7 - tx * 4} ${ny * 7 - ty * 4}`; }
      return `<line class="wb-held" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><path class="wb-hatch" d="${d}"/>`;
    };
    const free = (x1, y1, x2, y2) => `<line class="wb-free" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    g += edges.includes("t") ? hatch(x0, y0, x0 + W, y0, 0, -1) : free(x0, y0, x0 + W, y0);
    g += edges.includes("b") ? hatch(x0, y0 + H, x0 + W, y0 + H, 0, 1) : free(x0, y0 + H, x0 + W, y0 + H);
    g += edges.includes("l") ? hatch(x0, y0, x0, y0 + H, -1, 0) : free(x0, y0, x0, y0 + H);
    g += edges.includes("r") ? hatch(x0 + W, y0, x0 + W, y0 + H, 1, 0) : free(x0 + W, y0, x0 + W, y0 + H);
    g += `<text class="wt-t" x="${x0 + W / 2}" y="${y0 + H + 22}" text-anchor="middle">b = ${fmt(b, 2)} m</text>`;
    g += `<text class="wt-t" x="${x0 + W + 12}" y="${y0 + H / 2 + 4}">l<tspan dy="3" font-size="8">w</tspan></text>`;
    return `<figure class="wb-fig"><svg viewBox="0 0 ${W + 60} ${H + 46}" role="img" aria-label="Wandansicht mit Haltungen">${g}</svg>
      <figcaption>schraffiert = gehalten (Decke oder Querwand), strichliert = frei</figcaption></figure>`;
  }

  function initWB() {
    if (!$("wb-app")) return;
    $("wb-app").addEventListener("input", calcWB);
    $("wb-app").addEventListener("change", calcWB);
    calcWB();
  }

  renderDecide();
  renderLever();
  initWT();
  initWB();
})();
