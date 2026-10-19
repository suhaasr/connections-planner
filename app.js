(function () {
  "use strict";

  const L = window.PlannerLogic;
  const STORAGE_KEY = "connections-planner-state-v1";
  const THEME_KEY = "connections-planner-theme";
  const SAMPLE_WORDS = [
    "BASS", "PIANO", "MOUSE", "DRUM",
    "SOLE", "LOCK", "MONITOR", "ORGAN",
    "PIKE", "MAP", "SPEAKER", "HARP",
    "CARP", "KEYBOARD", "WEBCAM", "TUBA",
  ];
  const COLOR_NAMES = { yellow: "Yellow", green: "Green", blue: "Blue", purple: "Purple" };

  const el = (id) => document.getElementById(id);
  const setupSection = el("setup");
  const plannerSection = el("planner");
  const wordInput = el("word-input");
  const setupError = el("setup-error");
  const grid = el("grid");
  const categoriesEl = el("categories");
  const prioritySwitch = el("priority-switch");
  const labelEasy = el("label-easy");
  const labelHard = el("label-hard");

  let state = loadState();
  const categoryRows = {};
  let dragFromIndex = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
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
        state.categories[color].name = input.value;
        saveState();
      });

      const members = document.createElement("div");
      members.className = "members";

      row.append(input, members);
      categoriesEl.appendChild(row);
      categoryRows[color] = { row, input, members };
    }
  }

  function render() {
    renderToggle();
    renderCategories();
    renderGrid();
  }

  function renderToggle() {
    prioritySwitch.setAttribute("aria-checked", String(state.hardFirst));
    labelEasy.classList.toggle("active", !state.hardFirst);
    labelHard.classList.toggle("active", state.hardFirst);
  }

  function renderCategories() {
    const visible = L.visibleCategories(state);
    for (const color of L.COLORS) {
      const { row, input, members } = categoryRows[color];
      row.hidden = !visible.includes(color);
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
    grid.innerHTML = "";
    state.order.forEach((id, index) => {
      const tile = document.createElement("button");
      const color = L.groupOf(state, id);
      tile.className = "tile" + (color ? " " + color : "");
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
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
        tile.classList.add("dragging");
      });
      tile.addEventListener("dragend", () => {
        dragFromIndex = null;
        render();
      });
      tile.addEventListener("dragover", (e) => {
        if (dragFromIndex === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        tile.classList.add("drop-target");
      });
      tile.addEventListener("dragleave", () => tile.classList.remove("drop-target"));
      tile.addEventListener("drop", (e) => {
        e.preventDefault();
        if (dragFromIndex === null) return;
        L.moveTile(state, dragFromIndex, index);
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
    const unchanged = state && words.every((w, i) => state.tiles[i].text === w);
    if (!unchanged) {
      const hardFirst = state ? state.hardFirst : false;
      state = L.createState(words);
      state.hardFirst = hardFirst;
      saveState();
    }
    showPlanner();
  }

  function togglePriority() {
    L.setHardFirst(state, !state.hardFirst);
    saveState();
    render();
  }

  prioritySwitch.addEventListener("click", togglePriority);
  labelEasy.addEventListener("click", () => { if (state.hardFirst) togglePriority(); });
  labelHard.addEventListener("click", () => { if (!state.hardFirst) togglePriority(); });

  el("shuffle-btn").addEventListener("click", () => {
    L.shuffleUnselected(state);
    saveState();
    render();
  });
  el("clear-btn").addEventListener("click", () => {
    L.clearSelections(state);
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
})();
