const PDF_DIR = "pruefungen/";

const GROUPS = [
  {
    id: "mappe",
    title: "Mappe (Druck)",
    pages: [
      { id: "mappe", href: "mappe.html", nr: "M", label: "Prüfungsmappe" }
    ]
  },
  {
    id: "koch",
    title: "Kochrezept",
    pages: [
      { id: "start", href: "index.html", nr: "00", label: "Prüfungsablauf" },
      { id: "material", href: "material.html", nr: "01", label: "Materialkennwerte" },
      { id: "lasten", href: "lasten.html", nr: "02", label: "Lastaufstellung" },
      { id: "p1", href: "platte-1achsig.html", nr: "03", label: "Platte 1-achsig" },
      { id: "p2", href: "platte-2achsig.html", nr: "04", label: "Platte 2-achsig" },
      { id: "ds", href: "durchstanzen.html", nr: "05", label: "Punktgestützt / Durchstanzen" },
      { id: "scheibe", href: "scheibe.html", nr: "06", label: "Scheibe / wandartiger Träger" },
      { id: "konsole", href: "konsole.html", nr: "07", label: "Konsole" },
      { id: "bsp", href: "bsp.html", nr: "08", label: "Brettsperrholz" },
      { id: "treppe", href: "treppe.html", nr: "09", label: "Treppe / Podest" }
    ]
  },
  {
    id: "exam",
    title: "Prüfungen",
    pages: [
      { id: "exams", href: "pruefungen.html", nr: "P0", label: "Übersicht + PDFs" },
      { id: "ex-kiga", href: "pruefung-kindergarten.html", nr: "P1", label: "Kindergarten 2015" },
      { id: "ex-lager", href: "pruefung-lagerhalle.html", nr: "P2", label: "Lagerhalle 2013" }
    ]
  }
];

const EXAM_PDFS = [
  { id: "kochrezept-doc", title: "Kochrezept (ausführlich)", file: "Kochrezept_Flaechentragwerke_schriftlich.pdf", tag: "Word-Kochrezept" },
  { id: "kiga", title: "Kindergarten 2015", file: "komplett/150226_Kindergarten_komplett.pdf", tag: "komplett" },
  { id: "lager", title: "Lagerhalle 2013", file: "komplett/130617_Lagerhalle_komplett.pdf", tag: "komplett" },
  { id: "geschoss", title: "Geschossbau 2013", file: "komplett/130917_Geschossbau_komplett.pdf", tag: "komplett" },
  { id: "buero", title: "Bürogebäude 2013", file: "komplett/131205_Buerogebaeude_komplett.pdf", tag: "komplett" },
  { id: "schule", title: "Schulgebäude 2014", file: "komplett/140130_Schulgebaeude_komplett.pdf", tag: "komplett" },
  { id: "werkstatt", title: "Werkstatt 2014", file: "komplett/140228_Werkstatt_komplett.pdf", tag: "komplett" },
  { id: "pruefhalle", title: "Prüfhalle 2015", file: "komplett/150422_Pruefhalle_komplett.pdf", tag: "komplett" },
  { id: "feuerwehr", title: "Feuerwehrhaus 2016", file: "komplett/160128_Feuerwehrhaus_komplett.pdf", tag: "komplett" },
  { id: "sporthalle", title: "Sporthalle 2016", file: "komplett/160425_Sporthalle_komplett.pdf", tag: "komplett" },
  { id: "dg", title: "Dachgeschossausbau 2016", file: "komplett/160608_Dachgeschossausbau_komplett.pdf", tag: "komplett" },
  { id: "wohnbau", title: "Wohnbau 2014", file: "140923_Wohnbau_FTW_Angabe.pdf", tag: "Angabe" },
  { id: "ausstell", title: "Ausstellungsgebäude 08.06.2017", file: "170608_FTW_Angabe_Ausstellungsgebäude.pdf", tag: "Angabe" },
  { id: "betrieb", title: "Betriebsgebäude 2017", file: "170907_Betriebsgebäude_FTW_Ausarbeitung.pdf", tag: "Ausarbeitung" },
  { id: "ausstell2", title: "Ausstellungsgebäude 18.09.2017", file: "170915_FTW_Angabe.pdf", tag: "Angabe" }
];

function allPages() {
  return GROUPS.flatMap((g) => g.pages);
}

function currentId() {
  return document.body.dataset.page || "start";
}

function pdfUrl(file) {
  return encodeURI(PDF_DIR + file);
}

function renderNav() {
  const root = document.getElementById("nav-root");
  if (!root) return;
  const here = currentId();
  root.innerHTML = `
    <aside class="rail" id="rail">
      <button class="rail-toggle" type="button" aria-expanded="false" aria-controls="rechenweg">Kochrezept / Prüfungen</button>
      <div class="rail-brand">
        <strong>Flächentragwerke</strong>
        <span>875.326 · Kochrezept</span>
      </div>
      ${GROUPS.map((g) => `
        <p class="rail-group">${g.title}</p>
        <ol class="rechenweg" ${g.id === "koch" ? 'id="rechenweg"' : ""}>
          ${g.pages.map((p) => `
            <li>
              <a href="${p.href}" ${p.id === here ? 'aria-current="page"' : ""}>
                <span class="nr">${p.nr}</span>
                <span>${p.label}</span>
              </a>
            </li>`).join("")}
        </ol>
      `).join("")}
    </aside>
  `;
  const rail = root.querySelector("#rail");
  const btn = root.querySelector(".rail-toggle");
  btn.addEventListener("click", () => {
    const open = rail.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });
}

function renderPager() {
  const root = document.getElementById("pager-root");
  if (!root) return;
  const pages = allPages();
  const i = pages.findIndex((p) => p.id === currentId());
  const prev = i > 0 ? pages[i - 1] : null;
  const next = i >= 0 && i < pages.length - 1 ? pages[i + 1] : null;
  const hint = (p) => (GROUPS.find((g) => g.pages.some((x) => x.id === p.id)) || {}).title || "";
  root.innerHTML = `
    <nav class="pager" aria-label="Nächstes Blatt">
      ${prev ? `<a href="${prev.href}"><small>zurück · ${hint(prev)}</small>${prev.label}</a>` : "<span></span>"}
      ${next ? `<a class="next" href="${next.href}"><small>weiter · ${hint(next)}</small>${next.label}</a>` : ""}
    </nav>
  `;
}

function renderPdfSwitcher() {
  const host = document.getElementById("pdf-switcher");
  if (!host) return;
  const frame = document.getElementById("pdf-frame");
  const open = document.getElementById("pdf-open");
  const hashId = location.hash.replace("#", "");
  const start = (hashId && EXAM_PDFS.some((x) => x.id === hashId)) ? hashId : (host.dataset.start || EXAM_PDFS[0].id);

  function show(id) {
    const item = EXAM_PDFS.find((x) => x.id === id) || EXAM_PDFS[0];
    const url = pdfUrl(item.file);
    frame.src = url;
    open.href = url;
    host.querySelectorAll("button").forEach((b) => {
      b.setAttribute("aria-current", b.dataset.id === item.id ? "true" : "false");
    });
  }

  host.innerHTML = EXAM_PDFS.map((item) =>
    `<button type="button" data-id="${item.id}">${item.title} <small>(${item.tag})</small></button>`
  ).join("");
  host.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (btn) show(btn.dataset.id);
  });
  show(start);
}

renderNav();
renderPager();
renderPdfSwitcher();
document.querySelectorAll("[data-print]").forEach((b) => {
  b.addEventListener("click", () => window.print());
});
