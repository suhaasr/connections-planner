"use strict";
(() => {
  // src/logic.ts
  var COLORS = ["yellow", "green", "blue", "purple"];
  var GROUP_SIZE = 4;
  var GRID_SIZE = 16;
  function priorityOrder(hardFirst) {
    return hardFirst ? COLORS.slice().reverse() : COLORS.slice();
  }
  function emptyGroups() {
    return { yellow: [], green: [], blue: [], purple: [] };
  }
  function emptyCategories() {
    const blank = () => ({ shown: false, name: "", locked: false });
    return { yellow: blank(), green: blank(), blue: blank(), purple: blank() };
  }
  function parseWords(text) {
    return text.split(/[\n,]+/).map((w) => w.trim()).filter((w) => w.length > 0);
  }
  function createState(words) {
    return {
      tiles: words.map((text, id) => ({ id, text })),
      order: words.map((_, id) => id),
      groups: emptyGroups(),
      categories: emptyCategories(),
      hardFirst: false
    };
  }
  function groupOf(state2, id) {
    for (const color of COLORS) {
      if (state2.groups[color].includes(id)) return color;
    }
    return null;
  }
  function nextGroup(state2) {
    for (const color of priorityOrder(state2.hardFirst)) {
      if (state2.groups[color].length < GROUP_SIZE) return color;
    }
    return null;
  }
  function isGroupLocked(state2, color) {
    return !!state2.categories[color].locked;
  }
  function isLocked(state2, id) {
    const color = groupOf(state2, id);
    return !!color && isGroupLocked(state2, color);
  }
  function anyLocked(state2) {
    return COLORS.some((color) => isGroupLocked(state2, color));
  }
  function canLock(state2, color) {
    return state2.groups[color].length === GROUP_SIZE;
  }
  function toggleLock(state2, color) {
    if (isGroupLocked(state2, color)) state2.categories[color].locked = false;
    else if (canLock(state2, color)) state2.categories[color].locked = true;
    return state2;
  }
  function toggleTile(state2, id) {
    const current2 = groupOf(state2, id);
    if (current2 && isGroupLocked(state2, current2)) return state2;
    if (current2) {
      state2.groups[current2] = state2.groups[current2].filter((t) => t !== id);
      return state2;
    }
    const target = nextGroup(state2);
    if (!target) return state2;
    state2.groups[target].push(id);
    state2.categories[target].shown = true;
    return state2;
  }
  function clearSelections(state2) {
    for (const color of COLORS) {
      if (!isGroupLocked(state2, color)) state2.groups[color] = [];
    }
    return state2;
  }
  function setHardFirst(state2, hardFirst) {
    state2.hardFirst = hardFirst;
    return state2;
  }
  function visibleCategories(state2) {
    return priorityOrder(state2.hardFirst).filter((c) => state2.categories[c].shown);
  }
  function shuffleUnselected(state2, random = Math.random) {
    const slots = [];
    const ids = [];
    state2.order.forEach((id, index) => {
      if (!groupOf(state2, id)) {
        slots.push(index);
        ids.push(id);
      }
    });
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    slots.forEach((slot, k) => {
      state2.order[slot] = ids[k];
    });
    return state2;
  }
  function swapTiles(state2, fromIndex, toIndex) {
    if (fromIndex === toIndex) return state2;
    [state2.order[fromIndex], state2.order[toIndex]] = [state2.order[toIndex], state2.order[fromIndex]];
    return state2;
  }

  // src/app.ts
  var STORAGE_KEY = "connections-planner-state-v1";
  var THEME_KEY = "connections-planner-theme";
  var SAMPLE_WORDS = [
    "BASS",
    "PIANO",
    "MOUSE",
    "DRUM",
    "SOLE",
    "LOCK",
    "MONITOR",
    "ORGAN",
    "PIKE",
    "MAP",
    "SPEAKER",
    "HARP",
    "CARP",
    "KEYBOARD",
    "WEBCAM",
    "TUBA"
  ];
  var COLOR_NAMES = { yellow: "Yellow", green: "Green", blue: "Blue", purple: "Purple" };
  var SVG_ATTRS = 'viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  var LOCK_ICON = "<svg " + SVG_ATTRS + '><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  var UNLOCK_ICON = "<svg " + SVG_ATTRS + '><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.75-1.4"/></svg>';
  function el(id) {
    const node = document.getElementById(id);
    if (!node) throw new Error("Missing element #" + id);
    return node;
  }
  var setupSection = el("setup");
  var plannerSection = el("planner");
  var wordInput = el("word-input");
  var setupError = el("setup-error");
  var grid = el("grid");
  var categoriesEl = el("categories");
  var prioritySwitch = el("priority-switch");
  var labelEasy = el("label-easy");
  var labelHard = el("label-hard");
  var state = loadState();
  var categoryRows = {};
  var dragFromIndex = null;
  function current() {
    if (!state) throw new Error("No puzzle loaded");
    return state;
  }
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tiles) && parsed.tiles.length === GRID_SIZE) return parsed;
    } catch (_) {
    }
    return null;
  }
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
    }
  }
  function buildCategoryRows() {
    for (const color of COLORS) {
      const row = document.createElement("div");
      row.className = "category " + color;
      row.hidden = true;
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 60;
      input.placeholder = COLOR_NAMES[color] + " category name\u2026";
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
        toggleLock(current(), color);
        saveState();
        render();
      });
      row.append(body, lockBtn);
      categoriesEl.appendChild(row);
      categoryRows[color] = { row, input, members, lockBtn };
    }
  }
  var clearBtn = el("clear-btn");
  var CLEAR_LOCKED_MSG = "You can't deselect all while a category is locked. Unlock it first.";
  function renderClearButton() {
    const locked = anyLocked(current());
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
    const state2 = current();
    prioritySwitch.setAttribute("aria-checked", String(state2.hardFirst));
    labelEasy.classList.toggle("active", !state2.hardFirst);
    labelHard.classList.toggle("active", state2.hardFirst);
  }
  function renderCategories() {
    const state2 = current();
    const visible = visibleCategories(state2);
    for (const color of COLORS) {
      const { row, input, members, lockBtn } = categoryRows[color];
      row.hidden = !visible.includes(color);
      const locked = isGroupLocked(state2, color);
      row.classList.toggle("locked", locked);
      lockBtn.innerHTML = locked ? LOCK_ICON : UNLOCK_ICON;
      lockBtn.disabled = !locked && !canLock(state2, color);
      lockBtn.setAttribute("aria-pressed", String(locked));
      const lockLabel = locked ? "Unlock " + COLOR_NAMES[color] + " group" : canLock(state2, color) ? "Lock " + COLOR_NAMES[color] + " group" : "Add " + GROUP_SIZE + " words to lock this group";
      lockBtn.setAttribute("aria-label", lockLabel);
      lockBtn.title = lockLabel;
      if (input.value !== state2.categories[color].name) input.value = state2.categories[color].name;
      const words = state2.groups[color].map((id) => state2.tiles[id].text);
      members.innerHTML = "";
      const count = document.createElement("span");
      count.className = "count";
      count.textContent = words.length + "/" + GROUP_SIZE;
      members.append(count, document.createTextNode(words.join(", ")));
    }
    for (const color of visible) categoriesEl.appendChild(categoryRows[color].row);
  }
  function renderGrid() {
    const state2 = current();
    grid.innerHTML = "";
    state2.order.forEach((id, index) => {
      const tile = document.createElement("button");
      const color = groupOf(state2, id);
      tile.className = "tile" + (color ? " " + color : "") + (isLocked(state2, id) ? " locked" : "");
      tile.textContent = state2.tiles[id].text;
      tile.draggable = true;
      tile.dataset.index = String(index);
      tile.setAttribute("aria-pressed", String(!!color));
      tile.addEventListener("click", () => {
        toggleTile(state2, id);
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
        swapTiles(state2, dragFromIndex, index);
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
    const words = parseWords(wordInput.value);
    if (words.length !== GRID_SIZE) {
      setupError.textContent = "Please enter exactly 16 words (you entered " + words.length + ").";
      return;
    }
    const prev = state;
    const unchanged = !!prev && words.every((w, i) => prev.tiles[i].text === w);
    if (!unchanged) {
      const next = createState(words);
      next.hardFirst = prev ? prev.hardFirst : false;
      state = next;
      saveState();
    }
    showPlanner();
  }
  function togglePriority() {
    const state2 = current();
    setHardFirst(state2, !state2.hardFirst);
    saveState();
    render();
  }
  prioritySwitch.addEventListener("click", togglePriority);
  labelEasy.addEventListener("click", () => {
    if (current().hardFirst) togglePriority();
  });
  labelHard.addEventListener("click", () => {
    if (!current().hardFirst) togglePriority();
  });
  el("shuffle-btn").addEventListener("click", () => {
    shuffleUnselected(current());
    saveState();
    render();
  });
  clearBtn.addEventListener("click", () => {
    if (anyLocked(current())) return;
    clearSelections(current());
    saveState();
    render();
  });
  el("edit-btn").addEventListener("click", showSetup);
  el("start-btn").addEventListener("click", startFromInput);
  el("sample-btn").addEventListener("click", () => {
    wordInput.value = SAMPLE_WORDS.join("\n");
    setupError.textContent = "";
  });
  el("cancel-btn").addEventListener("click", () => {
    if (state) showPlanner();
  });
  wordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) startFromInput();
  });
  var themeToggle = el("theme-toggle");
  function renderTheme() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    themeToggle.textContent = dark ? "Light mode" : "Dark mode";
    themeToggle.setAttribute("aria-pressed", String(dark));
  }
  themeToggle.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (_) {
    }
    renderTheme();
  });
  renderTheme();
  buildCategoryRows();
  if (state) showPlanner();
  else showSetup();
})();
