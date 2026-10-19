(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PlannerLogic = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const COLORS = ["yellow", "green", "blue", "purple"];
  const GROUP_SIZE = 4;
  const GRID_SIZE = 16;

  function priorityOrder(hardFirst) {
    return hardFirst ? COLORS.slice().reverse() : COLORS.slice();
  }

  function emptyGroups() {
    return { yellow: [], green: [], blue: [], purple: [] };
  }

  function emptyCategories() {
    const categories = {};
    for (const color of COLORS) categories[color] = { shown: false, name: "", locked: false };
    return categories;
  }

  function parseWords(text) {
    return text
      .split(/[\n,]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
  }

  function createState(words) {
    return {
      tiles: words.map((text, id) => ({ id, text })),
      order: words.map((_, id) => id),
      groups: emptyGroups(),
      categories: emptyCategories(),
      hardFirst: false,
    };
  }

  function groupOf(state, id) {
    for (const color of COLORS) {
      if (state.groups[color].includes(id)) return color;
    }
    return null;
  }

  function nextGroup(state) {
    for (const color of priorityOrder(state.hardFirst)) {
      if (state.groups[color].length < GROUP_SIZE) return color;
    }
    return null;
  }

  function isGroupLocked(state, color) {
    return !!state.categories[color].locked;
  }

  function isLocked(state, id) {
    const color = groupOf(state, id);
    return !!color && isGroupLocked(state, color);
  }

  function canLock(state, color) {
    return state.groups[color].length === GROUP_SIZE;
  }

  function toggleLock(state, color) {
    if (isGroupLocked(state, color)) state.categories[color].locked = false;
    else if (canLock(state, color)) state.categories[color].locked = true;
    return state;
  }

  function toggleTile(state, id) {
    const current = groupOf(state, id);
    if (current && isGroupLocked(state, current)) return state;
    if (current) {
      state.groups[current] = state.groups[current].filter((t) => t !== id);
      return state;
    }
    const target = nextGroup(state);
    if (!target) return state;
    state.groups[target].push(id);
    state.categories[target].shown = true;
    return state;
  }

  function clearSelections(state) {
    for (const color of COLORS) {
      if (!isGroupLocked(state, color)) state.groups[color] = [];
    }
    return state;
  }

  function setHardFirst(state, hardFirst) {
    state.hardFirst = !!hardFirst;
    return state;
  }

  function visibleCategories(state) {
    return priorityOrder(state.hardFirst).filter((c) => state.categories[c].shown);
  }

  function shuffleUnselected(state, random) {
    const rng = random || Math.random;
    const slots = [];
    const ids = [];
    state.order.forEach((id, index) => {
      if (!groupOf(state, id)) {
        slots.push(index);
        ids.push(id);
      }
    });
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    slots.forEach((slot, k) => {
      state.order[slot] = ids[k];
    });
    return state;
  }

  function moveTile(state, fromIndex, toIndex) {
    if (fromIndex === toIndex) return state;
    const [id] = state.order.splice(fromIndex, 1);
    state.order.splice(toIndex, 0, id);
    return state;
  }

  return {
    COLORS,
    GROUP_SIZE,
    GRID_SIZE,
    priorityOrder,
    parseWords,
    createState,
    groupOf,
    nextGroup,
    toggleTile,
    isGroupLocked,
    isLocked,
    canLock,
    toggleLock,
    clearSelections,
    setHardFirst,
    visibleCategories,
    shuffleUnselected,
    moveTile,
  };
});
