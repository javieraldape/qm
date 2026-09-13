import { html, render, type TemplateResult } from "lit";
import { Box, Brain, Clock, Files, Folder, KeyRound, Repeat, Rocket, ShieldUser, Webhook, type IconNode } from "lucide";
import { deepLinkPath, isPlainLeftClick, UI_BASE } from "./deep-link";
import { nextGridIndex } from "./grid-nav";
import { setScopedSession } from "./session-scope";
import { ADMIN_HOME_URL, appState, can, switchView } from "./shell";
import { icon } from "./ui";
import type { View } from "./shell-state";

interface Destination {
  view: View | null;
  href: string;
  glyph: IconNode;
  label: string;
  blurb: string;
}

const BROWSE_COLUMNS = 2;

const browseState = { sel: 0 };
let browseHost: HTMLElement | null = null;

function destinations(): Destination[] {
  const to = (view: View, glyph: IconNode, label: string, blurb: string): Destination => ({
    view,
    href: deepLinkPath(UI_BASE, view, null),
    glyph,
    label,
    blurb,
  });
  const list: Destination[] = [
    to("contexts", Folder, "Projects", "Group chats, files, and automations"),
    to("files", Files, "Files", "Everything you and QM have shared"),
    to("crons", Clock, "Crons", "Work that runs on a schedule"),
    to("webhooks", Webhook, "Webhooks", "Inbound events that wake QM"),
    to("keychain", KeyRound, "Keychain", "Connected accounts and credentials"),
    to("deploys", Rocket, "Apps", "What QM has shipped for you"),
    to("memory", Brain, "Memory", "What QM remembers about your work"),
    to("skills", Box, "Skills", "Reusable procedures QM can follow"),
  ];
  if (can("loops")) list.push(to("loops", Repeat, "Loops", "Standing work QM keeps pushing forward"));
  if (can("admin")) {
    list.push({
      view: null,
      href: ADMIN_HOME_URL,
      glyph: ShieldUser,
      label: "Admin",
      blurb: "Org settings, people, and policy",
    });
  }
  return list;
}

export function renderBrowse(): void {
  if (appState.currentView !== "browse" || !appState.mainEl) return;
  const list = destinations();
  if (browseState.sel >= list.length) browseState.sel = 0;
  if (!browseHost || browseHost.parentElement !== appState.mainEl) {
    browseHost = document.createElement("div");
    browseHost.className = "pane browse-page";
    appState.mainEl.replaceChildren(browseHost);
  }
  render(pageTpl(list), browseHost);
  requestAnimationFrame(() => browseHost?.querySelector<HTMLElement>(".browse-tile.selected")?.focus());
}

function go(d: Destination): void {
  if (!d.view) {
    location.href = d.href;
    return;
  }
  setScopedSession(null);
  switchView(d.view);
}

function onGridKeydown(e: KeyboardEvent, list: Destination[]): void {
  if (e.key === "Escape") {
    e.preventDefault();
    switchView("chats");
    return;
  }
  const next = nextGridIndex(browseState.sel, e.key, list.length, BROWSE_COLUMNS);
  if (next !== null) {
    e.preventDefault();
    browseState.sel = next;
    renderBrowse();
    return;
  }
  if (e.key === "Enter" || e.key === " ") {
    const d = list[browseState.sel];
    if (!d) return;
    e.preventDefault();
    go(d);
  }
}

function tile(d: Destination, i: number): TemplateResult {
  return html`<a
    class="browse-tile ${i === browseState.sel ? "selected" : ""}"
    href=${d.href}
    tabindex=${i === browseState.sel ? "0" : "-1"}
    @focus=${() => {
      if (browseState.sel === i) return;
      browseState.sel = i;
      renderBrowse();
    }}
    @click=${(e: MouseEvent) => {
      if (!isPlainLeftClick(e)) return;
      e.preventDefault();
      go(d);
    }}
  >
    <span class="browse-tile-icon">${icon(d.glyph, 18)}</span>
    <span class="browse-tile-text">
      <span class="browse-tile-label">${d.label}</span>
      <span class="browse-tile-blurb">${d.blurb}</span>
    </span>
  </a>`;
}

function pageTpl(list: Destination[]): TemplateResult {
  return html`
    <div class="list-page-head">
      <div>
        <h1 class="pane-title">Browse</h1>
        <div class="pane-subtitle">Projects, files, automations, and everything else QM keeps for you.</div>
      </div>
    </div>
    <div
      class="browse-grid"
      role="group"
      aria-label="Destinations"
      @keydown=${(e: KeyboardEvent) => onGridKeydown(e, list)}
    >
      ${list.map(tile)}
    </div>
  `;
}
