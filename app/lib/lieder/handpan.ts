import type { Hand, NoteRef } from "./model";
import type { Pad } from "./scales";

// Draufsicht der Handpan. Jedes Feld zeigt Ton und Nummer.
// "jetzt": Feld gefüllt in der Farbe der Hand. "gleich": Ring in der Farbe der Hand.

const NS = "http://www.w3.org/2000/svg";

export interface PanView {
  set(now: Map<string, Hand>, next: Map<string, Hand>): void;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent: Element) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent.appendChild(e);
  return e;
}

export function renderHandpan(svg: SVGSVGElement, pads: Pad[], onPad: (n: NoteRef) => void): PanView {
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "-200 -200 400 400");
  el("circle", { cx: 0, cy: 0, r: 199, class: "pan-backdrop" }, svg);
  el("circle", { cx: 0, cy: 0, r: 138, class: "pan-shell" }, svg);
  const groups = new Map<string, SVGGElement>();

  for (const p of pads) {
    const g = el("g", { class: `pad${p.bottom ? " bottom" : ""}${p.num === "D" ? " ding" : ""}`, transform: `translate(${p.x} ${p.y})`, "data-num": p.num }, svg) as SVGGElement;
    if (p.num === "D") {
      el("circle", { r: p.r, class: "ding-outer" }, g);
      el("circle", { r: p.r * 0.68, class: "face" }, g);
    } else {
      el("circle", { r: p.r, class: "face" }, g);
    }
    el("circle", { r: p.r + 3, class: "ring" }, g);
    const name = el("text", { y: -2, class: "pad-name" }, g);
    name.textContent = p.name;
    const num = el("text", { y: 13, class: "pad-num" }, g);
    num.textContent = p.num === "D" ? "D" : String(p.num);
    g.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      onPad(p.num);
      g.classList.add("tapped");
      setTimeout(() => g.classList.remove("tapped"), 180);
    });
    groups.set(String(p.num), g);
  }

  let lastKey = "";
  return {
    set(now, next) {
      const key = JSON.stringify([...now]) + JSON.stringify([...next]);
      if (key === lastKey) return;
      lastKey = key;
      for (const [num, g] of groups) {
        const n = now.get(num);
        const x = next.get(num);
        g.classList.toggle("now", !!n);
        g.classList.toggle("now-r", n === "R");
        g.classList.toggle("now-l", n === "L");
        g.classList.toggle("next", !!x && !n);
        g.classList.toggle("next-r", !n && x === "R");
        g.classList.toggle("next-l", !n && x === "L");
      }
    },
  };
}
