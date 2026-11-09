"use strict";
/* COT Report Hub — front-end (vanilla JS) */

const BIAS = ["Molto Short", "Short", "Bilanciato", "Poco Long", "Molto Long"];
const NETCH = ["In Calo", "Stabile", "In Aumento"];
const COLORS = {
  "Molto Short": "purple", "Short": "red", "Bilanciato": "yellow", "Poco Long": "blue", "Molto Long": "green", "Long": "green",
  "In Calo": "red", "In Aumento": "green", "Stabile": "gray",
  "Forex": "gray", "Metalli": "orange", "Energia": "brown", "Neutrale": "yellow",
  "Sopra 80": "green", "Sotto 20": "red",
  "COT": "blue", "Sentiment": "green", "Stagionalità": "purple", "Bitcoin": "orange", "On-Chain": "brown",
  "Multi-CB": "teal", "RBA": "orange", "ECB": "blue",
  "Favorevole": "green", "Neutra": "yellow", "Contraria": "red",
  "Watchlist": "blue", "Attivo": "green", "Chiuso": "gray",
};
const STOCK_STATUS = ["Watchlist", "Attivo", "Chiuso"];
const TOOL_CATS = ["COT", "Sentiment", "Forex", "Stagionalità", "Bitcoin", "On-Chain", "Multi-CB", "RBA", "ECB"];

/* COT Index (0–100): >=80 e <=20 sono le zone estreme, in mezzo è neutrale */
const COT_HI = 80, COT_LO = 20;
const cotLabel = v => v === "" || v == null || isNaN(v) ? "" : +v >= COT_HI ? "Sopra 80" : +v <= COT_LO ? "Sotto 20" : "Neutrale";

const SCHEMA = {
  assets: [
    { k: "name", l: "Asset", t: "text", title: 1 }, { k: "emoji", l: "Icona (emoji)", t: "text" },
    { k: "bias", l: "Bias generale", t: "select", o: BIAS },
    { k: "cat", l: "Categoria", t: "select", o: ["Forex", "Metalli", "Energia"] },
    { k: "longTerm", l: "Long term", t: "select", o: BIAS },
    { k: "netChange", l: "Net position change", t: "select", o: NETCH },
    { k: "shortTerm", l: "Short term", t: "select", o: BIAS },
    { k: "skew", l: "Skew", t: "textarea" },
  ],
  ideas: [
    { k: "asset", l: "Asset", t: "text", title: 1 }, { k: "confluence", l: "Confluenze COT", t: "text" },
    { k: "direction", l: "Direzione", t: "select", o: ["Long", "Short"] },
    { k: "seasonality", l: "Seasonality", t: "select", o: ["Favorevole", "Neutra", "Contraria"] },
    { k: "idea", l: "Idea / note", t: "text" },
  ],
  agri: [
    { k: "name", l: "Asset", t: "text", title: 1 }, { k: "emoji", l: "Icona (emoji)", t: "text" },
    { k: "cotIndex", l: "COT Index Commercials (0–100)", t: "number", short: "COT Index" },
    { k: "signal", l: "Posizione Commercials", virtual: 1 },
    { k: "change", l: "Net Change", t: "select", o: NETCH },
  ],
  stocks: [
    { k: "ticker", l: "Ticker", t: "text", title: 1 }, { k: "company", l: "Azienda", t: "text" },
    { k: "sector", l: "Settore", t: "text" },
    { k: "direction", l: "Direzione", t: "select", o: ["Long", "Short"] },
    { k: "status", l: "Stato", t: "select", o: STOCK_STATUS },
    { k: "entry", l: "Entry", t: "text" }, { k: "target", l: "Target", t: "text" }, { k: "stop", l: "Stop", t: "text" },
    { k: "thesis", l: "Tesi / note", t: "textarea" },
  ],
  tools: [
    { k: "name", l: "Tool", t: "text", title: 1 }, { k: "emoji", l: "Icona (emoji)", t: "text" },
    { k: "cat", l: "Categoria", t: "select", o: TOOL_CATS }, { k: "desc", l: "Descrizione", t: "text" },
    { k: "url", l: "URL", t: "text" },
  ],
};
const F = (col, k) => SCHEMA[col].find(f => f.k === k);

let DB = null;
const view = document.getElementById("view");
const lsGet = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const state = { theme: lsGet("cotTheme", "dark"), bubble: lsGet("cotBubble", "m"), tint: lsGet("cotTint", "on"), side: lsGet("sideHidden", "0") === "1" ? "hidden" : "shown", assetsView: "board", stocksView: "board", primaryView: "gallery", secondaryView: "table", ratetoolsView: "table" };

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tag = v => v ? `<span class="tag c-${COLORS[v] || "gray"}">${esc(v)}</span>` : "";
const href = u => /^https?:\/\//.test(u) ? u : "https://" + u;
const uid = p => p + Math.random().toString(36).slice(2, 8);

/* ---------- API ---------- */
async function api(method, path, body) {
  const r = await fetch("/api/" + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(r.status);
  return r.status === 204 ? null : r.json();
}
async function refresh() { DB = await (await fetch("/api/data")).json(); }

/* ---------- Modal CRUD ---------- */
function closeModal() { const m = document.getElementById("modal"); m.hidden = true; m.innerHTML = ""; }
function openForm(col, item, preset = {}) {
  const isNew = !item;
  const data = { ...(item || {}), ...preset };
  const m = document.getElementById("modal");
  const fields = SCHEMA[col].filter(f => !f.virtual).map(f => {
    const v = data[f.k] ?? "";
    let input;
    if (f.t === "select") input = `<select name="${f.k}"><option value=""></option>${f.o.map(o => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    else if (f.t === "textarea") input = `<textarea name="${f.k}" rows="5">${esc(v)}</textarea>`;
    else if (f.t === "number") input = `<input name="${f.k}" type="number" min="0" max="100" step="any" value="${esc(v)}">`;
    else input = `<input name="${f.k}" value="${esc(v)}" autocomplete="off">`;
    return `<div class="f"><label>${f.l}</label>${input}</div>`;
  }).join("");
  m.innerHTML = `<form class="dlg"><h3>${isNew ? "Nuova voce" : "Modifica"}</h3>${fields}
    <div class="acts">${isNew ? "" : `<button type="button" class="btn danger sp" data-del>Elimina</button>`}
    <button type="button" class="btn" data-cancel>Annulla</button><button class="btn primary">Salva</button></div></form>`;
  m.hidden = false;
  m.onclick = e => { if (e.target === m) closeModal(); };
  m.querySelector("[data-cancel]").onclick = closeModal;
  const del = m.querySelector("[data-del]");
  if (del) del.onclick = async () => { await api("DELETE", `${col}/${item.id}`); closeModal(); await rerender(); };
  m.querySelector("form").onsubmit = async e => {
    e.preventDefault();
    const body = { ...preset };
    new FormData(e.target).forEach((v, k) => body[k] = F(col, k)?.t === "number" && v !== "" ? +v : v);
    if (isNew) await api("POST", col, body); else await api("PUT", `${col}/${item.id}`, body);
    closeModal(); await rerender();
  };
  const first = m.querySelector("input"); first && first.focus();
}
document.addEventListener("keydown", e => { if (e.key === "Escape" && !document.getElementById("modal").hidden) closeModal(); });

/* ---------- Inline editing (skew settimanale, COT index) ---------- */
function wireInline(root) {
  root.querySelectorAll("[data-skew]").forEach(el => {
    const card = el.closest("[draggable]");
    el.onclick = e => e.stopPropagation();
    el.onfocus = () => { if (card) card.draggable = false; el.dataset.orig = el.innerText.trim(); };
    el.onkeydown = e => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); el.blur(); }
      if (e.key === "Escape") { el.innerText = el.dataset.orig; el.blur(); }
    };
    el.onblur = async () => {
      if (card) card.draggable = true;
      const val = el.innerText.trim();
      if (val === el.dataset.orig) return;
      const item = DB.assets.find(x => x.id === el.dataset.skew);
      item.skew = val;
      el.classList.add("saved"); setTimeout(() => el.classList.remove("saved"), 900);
      await api("PUT", `assets/${item.id}`, { skew: val });
    };
  });
  root.querySelectorAll("[data-cot]").forEach(inp => {
    inp.onclick = e => e.stopPropagation();
    inp.onchange = async () => {
      const v = inp.value === "" ? "" : Math.max(0, Math.min(100, +inp.value));
      await api("PUT", `agri/${inp.dataset.cot}`, { cotIndex: v });
      await rerender();
    };
  });
}

/* ---------- Building blocks ---------- */
function cell(col, f, row) {
  const v = row[f.k];
  if (f.title) return `<div class="nm">${row.emoji ? `<span>${esc(row.emoji)}</span>` : ""}<span>${esc(v)}</span>${col === "stocks" && row.company ? `<span class="muted small">${esc(row.company)}</span>` : ""}</div>`;
  if (f.k === "skew") return `<div class="skew" contenteditable="plaintext-only" data-skew="${row.id}" data-ph="Scrivi la skew…">${esc(v)}</div>`;
  if (f.k === "cotIndex") return `<input class="cell-in" type="number" min="0" max="100" value="${esc(v)}" data-cot="${row.id}">`;
  if (f.k === "signal") return tag(cotLabel(row.cotIndex));
  if (f.t === "select") return tag(v);
  if (f.k === "url") return v ? `<a class="url" href="${esc(href(v))}" target="_blank" rel="noopener" data-stop>${esc(v)}</a>` : "";
  if (["desc", "confluence", "note", "thesis", "company", "sector"].includes(f.k)) return `<span class="muted">${esc(v)}</span>`;
  return esc(v);
}

function table(col, rows, { preset = {}, fields } = {}) {
  const fs = (fields || SCHEMA[col].filter(f => !f.virtual).map(f => f.k)).map(k => F(col, k));
  const id = uid("t");
  queueMicrotask(() => {
    const root = document.getElementById(id); if (!root) return;
    root.querySelectorAll("[data-stop]").forEach(a => a.onclick = e => e.stopPropagation());
    root.querySelectorAll("tr[data-id]").forEach(tr => tr.onclick = e => {
      if (e.target.closest("[data-skew],[data-cot],[data-stop]")) return;
      openForm(col, DB[col].find(x => x.id === tr.dataset.id));
    });
    root.querySelector("[data-add]").onclick = () => openForm(col, null, preset);
    wireInline(root);
  });
  const body = rows.length
    ? rows.map(r => `<tr data-id="${r.id}"${col === "assets" && r.bias ? ` class="tint c-${COLORS[r.bias] || "gray"}"` : ""}>${fs.map(f => `<td class="${f.k === "desc" ? "desc" : ""} ${f.k === "skew" ? "skewcell" : ""}">${cell(col, f, r)}</td>`).join("")}</tr>`).join("")
    : `<tr><td class="empty" colspan="${fs.length}">Nessun elemento — aggiungine uno</td></tr>`;
  return `<div class="tbl-wrap" id="${id}"><table><thead><tr>${fs.map(f => `<th>${f.short || f.l}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>
    <div class="tfoot"><button class="add" data-add style="width:100%">+ Nuova pagina</button></div></div>`;
}

/* Board con drag & drop: trascina una card in un'altra colonna per cambiarne il valore di groupKey */
function board(col, groupKey, groups, rows, cardFn, extraPreset = {}) {
  const id = uid("b");
  queueMicrotask(() => {
    const root = document.getElementById(id); if (!root) return;
    root.querySelectorAll(".card[data-id]").forEach(c => {
      c.onclick = () => openForm(col, DB[col].find(x => x.id === c.dataset.id));
      c.ondragstart = e => { e.dataTransfer.setData("text/plain", c.dataset.id); e.dataTransfer.effectAllowed = "move"; requestAnimationFrame(() => c.classList.add("drag")); };
      c.ondragend = () => { c.classList.remove("drag"); root.querySelectorAll(".over").forEach(x => x.classList.remove("over")); };
    });
    root.querySelectorAll("[data-add]").forEach(b => b.onclick = () => openForm(col, null, { ...extraPreset, [groupKey]: b.dataset.add }));
    root.querySelectorAll(".col").forEach(colEl => {
      colEl.ondragover = e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; colEl.classList.add("over"); };
      colEl.ondragleave = e => { if (!colEl.contains(e.relatedTarget)) colEl.classList.remove("over"); };
      colEl.ondrop = async e => {
        e.preventDefault(); colEl.classList.remove("over");
        const item = DB[col].find(x => x.id === e.dataTransfer.getData("text/plain"));
        const target = colEl.dataset.g;
        if (!item || item[groupKey] === target) return;
        item[groupKey] = target;
        await api("PUT", `${col}/${item.id}`, { [groupKey]: target });
        await rerender();
      };
    });
    wireInline(root);
  });
  return `<div class="board" id="${id}">${groups.map(g => {
    const items = rows.filter(r => r[groupKey] === g);
    return `<div class="col c-${COLORS[g] || "gray"}" data-g="${esc(g)}"><div class="col-head">${tag(g)}<span class="n">${items.length}</span></div>
      ${items.map(cardFn).join("")}<button class="add" data-add="${esc(g)}">+ Nuova pagina</button></div>`;
  }).join("")}</div>`;
}

function seg(key, options) {
  return `<div class="seg">${options.map(([v, l]) => `<button class="${state[key] === v ? "on" : ""}" data-seg="${key}:${v}">${l}</button>`).join("")}</div>`;
}
function section({ eyebrow, title, desc, controls = "", body }) {
  return `<section class="section">${eyebrow ? `<div class="sec-eyebrow">${eyebrow}</div>` : ""}
    <div class="sec-head"><div><h2>${title}</h2>${desc ? `<p class="sec-desc">${desc}</p>` : ""}</div><div class="tools">${controls}</div></div>${body}</section>`;
}

/* Mappa degli asset: bolle trascinabili, colore = bias nel database */
const BUBBLE_PX = { s: 44, m: 62, l: 84 };
function defaultPos(a, all) {
  const bi = BIAS.indexOf(a.bias), grp = all.filter(x => x.bias === a.bias), i = grp.indexOf(a), n = grp.length;
  const cols = Math.ceil(n / 4), per = Math.ceil(n / cols), c = Math.floor(i / per), r = i % per, rows = Math.min(per, n - c * per);
  const bx = bi < 0 ? 50 : [12, 31, 50, 69, 88][bi];
  return { x: bx + (c - (cols - 1) / 2) * 13, y: 50 + (r - (rows - 1) / 2) * 21 };
}
function bubbleMap(assets) {
  const id = uid("m"), px = BUBBLE_PX[state.bubble] || BUBBLE_PX.m;
  queueMicrotask(() => {
    const root = document.getElementById(id); if (!root) return;
    const plot = root.querySelector(".plot");
    const rb = view.querySelector("[data-reset]"); if (rb) rb.onclick = async () => {
      for (const a of assets) { delete a.mx; delete a.my; await api("PUT", `assets/${a.id}`, { mx: null, my: null }); }
      await rerender();
    };
    root.querySelectorAll(".bub").forEach(el => {
      el.ondragstart = e => e.preventDefault();
      el.onpointerdown = e => {
        if (e.button !== 0) return;
        e.preventDefault();
        const sx = e.clientX, sy = e.clientY; let moved = false;
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
        el.classList.add("hold");
        const move = ev => {
          if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
          moved = true;
          const r = plot.getBoundingClientRect();
          const x = Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100));
          const y = Math.max(0, Math.min(100, (ev.clientY - r.top) / r.height * 100));
          el.style.left = x + "%"; el.style.top = y + "%"; el.dataset.x = x; el.dataset.y = y;
        };
        const up = async () => {
          window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
          el.classList.remove("hold");
          const item = DB.assets.find(x => x.id === el.dataset.id);
          if (!moved) return openForm("assets", item);
          item.mx = +(+el.dataset.x).toFixed(1); item.my = +(+el.dataset.y).toFixed(1);
          await api("PUT", `assets/${item.id}`, { mx: item.mx, my: item.my });
        };
        window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
      };
    });
  });
  return `<div class="map" id="${id}"><div class="map-in"><div class="ylab">Forza ↑ &nbsp;/&nbsp; Debolezza ↓</div>
    <div class="plot" style="--bub:${px}px">
      <i class="axis ax-x"></i><i class="axis ax-y"></i>
      <span class="q q-tl">Forte</span><span class="q q-tr">Molto forte</span><span class="q q-bl">Molto short</span><span class="q q-br">Short</span>
      <span class="q q-t">Bilanciato</span><span class="q q-b">Bilanciato</span>
      ${assets.map(a => { const p = a.mx != null && a.my != null ? { x: a.mx, y: a.my } : defaultPos(a, assets);
        return `<div class="bub c-${COLORS[a.bias] || "gray"}" data-id="${a.id}" style="left:${p.x}%;top:${p.y}%" title="${esc(a.name)} — ${esc(a.bias || "n/d")}">
          <span class="be">${esc(a.emoji)}</span><span class="bn">${esc(a.name.replace(/\s*\(.*\)/, ""))}</span></div>`; }).join("")}
    </div></div>
    <div class="xlab">Debolezza ← &nbsp;/&nbsp; → Forza</div></div>`;
}

const assetCard = a => `<div class="card tint c-${COLORS[a.bias] || "gray"}" draggable="true" data-id="${a.id}">
  <div class="t"><span>${esc(a.emoji)}</span><span>${esc(a.name)}</span><span class="grow"></span>${tag(a.cat)}</div>
  <div class="kv"><span>Long term</span>${tag(a.longTerm)}</div>
  <div class="kv"><span>Net position change</span>${tag(a.netChange)}</div>
  <div class="kv"><span>Short term</span>${tag(a.shortTerm)}</div>
  <div class="skew-l">Skew</div>
  <div class="skew" contenteditable="plaintext-only" data-skew="${a.id}" data-ph="Scrivi la skew…">${esc(a.skew)}</div></div>`;

const stockCard = s => `<div class="card" draggable="true" data-id="${s.id}">
  <div class="t"><span>${esc(s.ticker)}</span><span class="grow"></span>${tag(s.direction)}</div>
  ${s.company ? `<div class="muted small" style="margin:-4px 0 8px">${esc(s.company)}${s.sector ? " · " + esc(s.sector) : ""}</div>` : ""}
  ${s.entry || s.target || s.stop ? `<div class="kv"><span>Entry</span><b>${esc(s.entry) || "—"}</b></div><div class="kv"><span>Target</span><b>${esc(s.target) || "—"}</b></div><div class="kv"><span>Stop</span><b>${esc(s.stop) || "—"}</b></div>` : ""}
  ${s.thesis ? `<div class="note">${esc(s.thesis)}</div>` : ""}</div>`;

const gcard = t => `<div class="gcard" data-id="${t.id}"><div class="t"><span class="e">${esc(t.emoji)}</span>${esc(t.name)}</div>
  <p>${esc(t.desc)}</p><div class="row">${tag(t.cat)}<button class="edit" data-edit="${t.id}">Modifica</button></div>
  <a class="u" href="${esc(href(t.url))}" target="_blank" rel="noopener">${esc(t.url)} ↗</a></div>`;
function gallery(items, preset) {
  const id = uid("g");
  queueMicrotask(() => {
    const root = document.getElementById(id); if (!root) return;
    root.querySelectorAll("[data-edit]").forEach(b => b.onclick = e => { e.preventDefault(); openForm("tools", DB.tools.find(x => x.id === b.dataset.edit)); });
    root.querySelector("[data-add]").onclick = () => openForm("tools", null, preset);
  });
  return `<div class="gallery" id="${id}">${items.map(gcard).join("")}<button class="gcard add" data-add style="align-items:center;justify-content:center;border-style:dashed">+ Nuova pagina</button></div>`;
}

/* ---------- Pages ---------- */
const PAGES = {
  home() {
    const a = DB.assets, long = a.filter(x => /Long/.test(x.bias)).length, short = a.filter(x => /Short/.test(x.bias)).length;
    const assetsBody = state.assetsView === "board"
      ? board("assets", "bias", BIAS, a, assetCard)
      : table("assets", a, { fields: ["name", "bias", "cat", "longTerm", "netChange", "shortTerm", "skew"] });
    return `
    <div class="callout"><div class="ic">📡</div><div><b>Commitment of Traders — Analisi Istituzionale dei Posizionamenti</b>
      <p>Monitora i posizionamenti settimanali di Large Speculators, Commercials e Non-Commercials. Aggiornato ogni venerdì ore 21:30 CET — fonte CFTC.</p></div></div>
    <div class="kpis">
      <div class="kpi"><div class="l">Asset monitorati</div><div class="v">${a.length}</div></div>
      <div class="kpi"><div class="l">Bias long</div><div class="v g">${long}</div></div>
      <div class="kpi"><div class="l">Bias short</div><div class="v r">${short}</div></div>
      <div class="kpi"><div class="l">Idee operative</div><div class="v">${DB.ideas.filter(i => i.section === "forex").length}</div></div>
    </div>
    <div class="dist">${BIAS.map(b => { const n = a.filter(x => x.bias === b).length; return n ? `<i class="c-${COLORS[b]}" style="flex:${n}" title="${b}: ${n}"></i>` : ""; }).join("")}</div>
    <div class="legend">${BIAS.map(b => `<span class="c-${COLORS[b]}">${b} · ${a.filter(x => x.bias === b).length}</span>`).join("")}</div>
    ${section({ eyebrow: "COT Overview", title: "Mappa degli Asset",
      desc: "Il colore di ogni bolla segue il bias nell'Asset Database. Trascina le bolle dove vuoi, clicca per modificare l'asset.",
      controls: `<button class="btn" data-reset>Reimposta posizioni</button>`, body: bubbleMap(a) })}
    ${section({ eyebrow: "COT Analysis", title: "Asset Database",
      desc: state.assetsView === "board" ? "Trascina un asset su un'altra colonna per cambiarne il bias. Clicca sulla skew per riscriverla." : "Clicca sulla skew per riscriverla, su una riga per modificare l'asset.",
      controls: seg("assetsView", [["board", "Board per Bias"], ["table", "Tabella"]]) + `<button class="btn primary" data-new="assets">Nuova</button>`, body: assetsBody })}
    ${section({ eyebrow: "Migliori idee operative", title: "Trade Ideas — COT Confluence",
      desc: "Le migliori idee basate sull'analisi COT: asset, direzione, confluenze istituzionali e seasonality.",
      controls: `<button class="btn primary" data-new="ideas" data-preset='{"section":"forex"}'>Nuova</button>`,
      body: table("ideas", DB.ideas.filter(i => i.section === "forex"), { preset: { section: "forex" }, fields: ["asset", "confluence", "direction", "seasonality"] }) })}
    <div class="foot">⚡ Aggiornamento dati: ogni venerdì ore 21:30 CET — CFTC (Commodity Futures Trading Commission)</div>`;
  },

  agriculture() {
    return `
    <div class="callout"><div class="ic">🌾</div><div><b>COT Commercials — Materie prime agricole</b>
      <p>Inserisci il COT Index (0–100) dei Commercials: sopra 80 e sotto 20 sono le zone estreme, in mezzo la posizione è neutrale.</p></div></div>
    ${section({ eyebrow: "Agriculture", title: "COT Commercials Database",
      controls: `<button class="btn primary" data-new="agri">Nuova</button>`, body: table("agri", DB.agri, { fields: ["name", "cotIndex", "signal", "change"] }) })}
    <details class="guide"><summary>📖 Come leggere i Commercials — Guida rapida</summary><ul>
      <li><b>COT Index ≥ 80</b> → Commercials ai massimi del range: possibile fondo di mercato.</li>
      <li><b>COT Index ≤ 20</b> → Commercials ai minimi del range: possibile massimo di mercato.</li>
      <li><b>Tra 20 e 80</b> → posizione neutrale, nessun segnale estremo.</li>
      <li>Conferma sempre con stagionalità e livelli tecnici.</li></ul></details>
    <div style="height:34px"></div>
    ${section({ eyebrow: "Migliori idee operative", title: "Idee operative — Agriculture",
      controls: `<button class="btn primary" data-new="ideas" data-preset='{"section":"agri"}'>Nuova</button>`,
      body: table("ideas", DB.ideas.filter(i => i.section === "agri"), { preset: { section: "agri" }, fields: ["asset", "confluence", "direction", "seasonality"] }) })}
    <div class="foot">⚡ Aggiornamento: ogni venerdì ore 21:30 CET — fonte CFTC</div>`;
  },

  stocks() {
    const s = DB.stocks;
    const body = state.stocksView === "board" ? board("stocks", "status", STOCK_STATUS, s, stockCard)
      : table("stocks", s, { fields: ["ticker", "sector", "direction", "status", "entry", "target", "stop", "thesis"] });
    return `
    <div class="callout"><div class="ic">📈</div><div><b>Stock Picking</b>
      <p>La tua watchlist di azioni: tesi, livelli di entry, target e stop. Trascina le card tra Watchlist, Attivo e Chiuso.</p></div></div>
    <div class="kpis">
      <div class="kpi"><div class="l">Totale</div><div class="v">${s.length}</div></div>
      <div class="kpi"><div class="l">Watchlist</div><div class="v">${s.filter(x => x.status === "Watchlist").length}</div></div>
      <div class="kpi"><div class="l">Attivi</div><div class="v g">${s.filter(x => x.status === "Attivo").length}</div></div>
      <div class="kpi"><div class="l">Chiusi</div><div class="v">${s.filter(x => x.status === "Chiuso").length}</div></div>
    </div>
    <div style="height:24px"></div>
    ${section({ eyebrow: "Stock picking", title: "Database azioni",
      controls: seg("stocksView", [["board", "Board per Stato"], ["table", "Tabella"]]) + `<button class="btn primary" data-new="stocks" data-preset='{"status":"Watchlist"}'>Nuova</button>`, body })}`;
  },

  tools() {
    const g = k => DB.tools.filter(t => t.group === k);
    const newBtn = k => `<button class="btn primary" data-new="tools" data-preset='{"group":"${k}"}'>Nuovo link</button>`;
    const block = (k, viewKey) => state[viewKey] === "gallery" ? gallery(g(k), { group: k })
      : table("tools", g(k), { preset: { group: k }, fields: ["name", "cat", "desc", "url"] });
    return `
    <div class="callout"><div class="ic">📡</div><div><b>Dashboard delle risorse per l'analisi COT.</b><p>Clicca su uno strumento per aprirlo. Usa "Nuovo link" per aggiungerne altri in qualsiasi sezione.</p></div></div>
    ${section({ eyebrow: "⭐ Strumenti primari", title: "Strumenti Primari", desc: "I tool fondamentali per l'analisi COT settimanale — da usare ogni venerdì.",
      controls: seg("primaryView", [["gallery", "Gallery"], ["table", "Tabella"]]) + newBtn("primary"), body: block("primary", "primaryView") })}
    ${section({ eyebrow: "🔧 Strumenti secondari", title: "Strumenti Secondari", desc: "Tool di approfondimento e analisi complementare — dati on-chain, dark pool, macro.",
      controls: seg("secondaryView", [["gallery", "Gallery"], ["table", "Tabella"]]) + newBtn("secondary"), body: block("secondary", "secondaryView") })}
    ${section({ eyebrow: "🏦 Strumenti aspettativa tassi", title: "Strumenti Aspettativa Tassi", desc: "Monitora le aspettative di mercato sui tassi delle principali banche centrali — fondamentale per il bias macro su Forex.",
      controls: seg("ratetoolsView", [["gallery", "Gallery"], ["table", "Tabella"]]) + newBtn("rates"), body: block("rates", "ratetoolsView") })}`;
  },
};
PAGES.settings = () => `
  <div class="callout"><div class="ic">⚙️</div><div><b>Impostazioni generali</b><p>Le preferenze sono salvate in questo browser.</p></div></div>
  <div class="set-card">
    <div class="set-row"><div><b>Tema</b><p>Scuro, chiaro o in base al sistema.</p></div>${seg("theme", [["dark", "Scuro"], ["light", "Chiaro"], ["auto", "Auto"]])}</div>
    <div class="set-row"><div><b>Colora le schede degli asset</b><p>Le schede prendono il colore del bias in cui si trovano.</p></div>${seg("tint", [["on", "Sì"], ["off", "No"]])}</div>
    <div class="set-row"><div><b>Grandezza bolle</b><p>Dimensione delle bolle nella Mappa degli Asset.</p></div>${seg("bubble", [["s", "Piccole"], ["m", "Medie"], ["l", "Grandi"]])}</div>
    <div class="set-row"><div><b>Menu laterale</b><p>Mostra o nascondi il menu a sinistra.</p></div>${seg("side", [["shown", "Visibile"], ["hidden", "Nascosto"]])}</div>
  </div>`;
const META = {
  home: ["COT Report Hub", "COT Report Hub"], agriculture: ["Agriculture — COT Commercials", "Agriculture"],
  stocks: ["Stock Picking", "Stock Picking"], tools: ["Tools — Risorse COT", "Tools"],
  settings: ["Impostazioni", "Impostazioni"],
};

/* ---------- Settings ---------- */
function applyTheme() {
  let t = state.theme;
  if (t === "auto") t = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  document.documentElement.dataset.theme = t;
}
function applySetting(k, v) {
  if (k === "theme") { lsSet("cotTheme", v); applyTheme(); }
  if (k === "bubble") lsSet("cotBubble", v);
  if (k === "tint") { lsSet("cotTint", v); document.body.classList.toggle("no-tint", v === "off"); }
  if (k === "side") { lsSet("sideHidden", v === "hidden" ? "1" : "0"); document.querySelector(".app").classList.toggle("side-hidden", v === "hidden"); }
}
document.body.classList.toggle("no-tint", state.tint === "off");
matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => { if (state.theme === "auto") applyTheme(); });

/* ---------- Router ---------- */
function route() { const m = location.hash.match(/#\/(\w+)/); return m && m[1] in PAGES ? m[1] : "home"; }

async function rerender() {
  await refresh();
  const r = route(), [title, crumb] = META[r];
  document.getElementById("title").textContent = title;
  document.getElementById("crumbs").innerHTML = r === "home" ? "<b>COT Report Hub</b>" : `COT Report Hub / <b>${crumb}</b>`;
  document.title = title + " · COT Hub";
  document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("active", a.dataset.route === r));
  document.getElementById("updated").textContent = "Modificata: " + new Date(DB.updated).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const y = window.scrollY;
  const bx = [...view.querySelectorAll(".board")].map(b => b.scrollLeft);
  view.innerHTML = PAGES[r]();
  view.querySelectorAll(".board").forEach((b, i) => b.scrollLeft = bx[i] || 0);
  view.querySelectorAll("[data-seg]").forEach(b => b.onclick = () => { const [k, v] = b.dataset.seg.split(":"); state[k] = v; applySetting(k, v); rerender(); });
  view.querySelectorAll("[data-new]").forEach(b => b.onclick = () => openForm(b.dataset.new, null, b.dataset.preset ? JSON.parse(b.dataset.preset) : {}));
  window.scrollTo(0, y);
}
window.addEventListener("hashchange", () => { window.scrollTo(0, 0); rerender(); });
rerender();

/* ---------- Sidebar toggle ---------- */
(function () {
  const app = document.querySelector(".app");
  const set = hidden => {
    app.classList.toggle("side-hidden", hidden);
    try { localStorage.setItem("sideHidden", hidden ? "1" : "0"); } catch (e) {}
    state.side = hidden ? "hidden" : "shown";
    if (route() === "settings") rerender();
  };
  try { if (localStorage.getItem("sideHidden") === "1") app.classList.add("side-hidden"); } catch (e) {}
  document.querySelectorAll("[data-side-toggle]").forEach(b => b.onclick = () => set(!app.classList.contains("side-hidden")));
})();
