import * as L from "./logic.ts";
import type { Color, State } from "./logic.ts";

interface CategoryRow {
  row: HTMLDivElement;
  input: HTMLInputElement;
  members: HTMLDivElement;
  lockBtn: HTMLButtonElement;
}

const STORAGE_KEY = "connections-planner-state-v1";
const THEME_KEY = "connections-planner-theme";
const SAMPLE_WORDS = [
  "BASS", "PIANO", "MOUSE", "DRUM",
  "SOLE", "LOCK", "MONITOR", "ORGAN",
  "PIKE", "MAP", "SPEAKER", "HARP",
  "CARP", "KEYBOARD", "WEBCAM", "TUBA",
];
const COLOR_NAMES: Record<Color, string> = { yellow: "Yellow", green: "Green", blue: "Blue", purple: "Purple" };
const SVG_ATTRS = 'viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const LOCK_ICON = '<svg ' + SVG_ATTRS + '><rect x="4" y="11" width="16" height="10" rx="2"/>' +
  '<path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const UNLOCK_ICON = '<svg ' + SVG_ATTRS + '><rect x="4" y="11" width="16" height="10" rx="2"/>' +
  '<path d="M8 11V7a4 4 0 0 1 7.75-1.4"/></svg>';

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error("Missing element #" + id);
  return node as T;
}

const setupSection = el("setup");
const plannerSection = el("planner");
const wordInput = el<HTMLTextAreaElement>("word-input");
const setupError = el("setup-error");
const grid = el("grid");
const categoriesEl = el("categories");
const prioritySwitch = el("priority-switch");
const labelEasy = el("label-easy");
const labelHard = el("label-hard");

let state: State | null = loadState();
const categoryRows = {} as Record<Color, CategoryRow>;
let dragFromIndex: number | null = null;

function current(): State {
  if (!state) throw new Error("No puzzle loaded");
  return state;
}

function loadState(): State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as State;
    if (parsed && Array.isArray(parsed.tiles) && parsed.tiles.length === L.GRID_SIZE) return parsed;
  } catch (_) { /* storage unavailable or corrupt */ }
  return null;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) { /* storage unavailable (e.g. some file:// setups) */ }
}

function buildCategoryRows() {
  for (const color of L.COLORS) {
    const row = document.createElement("div");
    row.className = "category " + color;
    row.hidden = true;

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 60;
    input.placeholder = COLOR_NAMES[color] + " category name…";
    input.setAttribute("aria-label", COLOR_NAMES[color] + " category name");
    input.addEventListener("input", () => {
      current().categories[color].name = input.value;
      saveState();
    });

    const members = document.createElement("div");
    members.className = "members";

    const body = document.createElement("div");
    body.className = "category-body";
    body.append(input, members);

    const lockBtn = document.createElement("button");
    lockBtn.type = "button";
    lockBtn.className = "lock-btn";
    lockBtn.addEventListener("click", () => {
      L.toggleLock(current(), color);
      saveState();
      render();
    });

    row.append(body, lockBtn);
    categoriesEl.appendChild(row);
    categoryRows[color] = { row, input, members, lockBtn };
  }
}

const clearBtn = el<HTMLButtonElement>("clear-btn");
const CLEAR_LOCKED_MSG = "You can't deselect all while a category is locked. Unlock it first.";

function renderClearButton() {
  const locked = L.anyLocked(current());
  clearBtn.setAttribute("aria-disabled", String(locked));
  clearBtn.title = locked ? CLEAR_LOCKED_MSG : "";
}

function render() {
  renderClearButton();
  renderToggle();
  renderCategories();
  renderGrid();
}

function renderToggle() {
  const state = current();
  prioritySwitch.setAttribute("aria-checked", String(state.hardFirst));
  labelEasy.classList.toggle("active", !state.hardFirst);
  labelHard.classList.toggle("active", state.hardFirst);
}

function renderCategories() {
  const state = current();
  const visible = L.visibleCategories(state);
  for (const color of L.COLORS) {
    const { row, input, members, lockBtn } = categoryRows[color];
    row.hidden = !visible.includes(color);
    const locked = L.isGroupLocked(state, color);
    row.classList.toggle("locked", locked);
    lockBtn.innerHTML = locked ? LOCK_ICON : UNLOCK_ICON;
    lockBtn.disabled = !locked && !L.canLock(state, color);
    lockBtn.setAttribute("aria-pressed", String(locked));
    const lockLabel = locked
      ? "Unlock " + COLOR_NAMES[color] + " group"
      : L.canLock(state, color)
        ? "Lock " + COLOR_NAMES[color] + " group"
        : "Add " + L.GROUP_SIZE + " words to lock this group";
    lockBtn.setAttribute("aria-label", lockLabel);
    lockBtn.title = lockLabel;
    if (input.value !== state.categories[color].name) input.value = state.categories[color].name;
    const words = state.groups[color].map((id) => state.tiles[id].text);
    members.innerHTML = "";
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = words.length + "/" + L.GROUP_SIZE;
    members.append(count, document.createTextNode(words.join(", ")));
  }
  for (const color of visible) categoriesEl.appendChild(categoryRows[color].row);
}

function renderGrid() {
  const state = current();
  grid.innerHTML = "";
  state.order.forEach((id, index) => {
    const tile = document.createElement("button");
    const color = L.groupOf(state, id);
    tile.className = "tile" + (color ? " " + color : "") + (L.isLocked(state, id) ? " locked" : "");
    tile.textContent = state.tiles[id].text;
    tile.draggable = true;
    tile.dataset.index = String(index);
    tile.setAttribute("aria-pressed", String(!!color));

    tile.addEventListener("click", () => {
      L.toggleTile(state, id);
      saveState();
      render();
    });

    tile.addEventListener("dragstart", (e) => {
      dragFromIndex = index;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
      }
      tile.classList.add("dragging");
    });
    tile.addEventListener("dragend", () => {
      dragFromIndex = null;
      render();
    });
    tile.addEventListener("dragover", (e) => {
      if (dragFromIndex === null) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      tile.classList.add("drop-target");
    });
    tile.addEventListener("dragleave", () => tile.classList.remove("drop-target"));
    tile.addEventListener("drop", (e) => {
      e.preventDefault();
      if (dragFromIndex === null) return;
      L.swapTiles(state, dragFromIndex, index);
      dragFromIndex = null;
      saveState();
      render();
    });

    grid.appendChild(tile);
  });
}

function showSetup() {
  wordInput.value = state ? state.tiles.map((t) => t.text).join("\n") : "";
  setupError.textContent = "";
  el("cancel-btn").hidden = !state;
  setupSection.hidden = false;
  plannerSection.hidden = true;
  wordInput.focus();
}

function showPlanner() {
  setupSection.hidden = true;
  plannerSection.hidden = false;
  render();
}

function startFromInput() {
  const words = L.parseWords(wordInput.value);
  if (words.length !== L.GRID_SIZE) {
    setupError.textContent = "Please enter exactly 16 words (you entered " + words.length + ").";
    return;
  }
  const prev = state;
  const unchanged = !!prev && words.every((w, i) => prev.tiles[i].text === w);
  if (!unchanged) {
    const next = L.createState(words);
    next.hardFirst = prev ? prev.hardFirst : false;
    state = next;
    saveState();
  }
  showPlanner();
}

function togglePriority() {
  const state = current();
  L.setHardFirst(state, !state.hardFirst);
  saveState();
  render();
}

prioritySwitch.addEventListener("click", togglePriority);
labelEasy.addEventListener("click", () => { if (current().hardFirst) togglePriority(); });
labelHard.addEventListener("click", () => { if (!current().hardFirst) togglePriority(); });

el("shuffle-btn").addEventListener("click", () => {
  L.shuffleUnselected(current());
  saveState();
  render();
});
clearBtn.addEventListener("click", () => {
  if (L.anyLocked(current())) return;
  L.clearSelections(current());
  saveState();
  render();
});
el("edit-btn").addEventListener("click", showSetup);
el("start-btn").addEventListener("click", startFromInput);
el("sample-btn").addEventListener("click", () => {
  wordInput.value = SAMPLE_WORDS.join("\n");
  setupError.textContent = "";
});
el("cancel-btn").addEventListener("click", () => { if (state) showPlanner(); });
wordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) startFromInput();
});

const themeToggle = el("theme-toggle");

function renderTheme() {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  themeToggle.textContent = dark ? "Light mode" : "Dark mode";
  themeToggle.setAttribute("aria-pressed", String(dark));
}

themeToggle.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem(THEME_KEY, next); } catch (_) { /* storage unavailable */ }
  renderTheme();
});

renderTheme();
buildCategoryRows();
if (state) showPlanner();
else showSetup();
