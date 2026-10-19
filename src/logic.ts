export type Color = "yellow" | "green" | "blue" | "purple";

export interface Tile {
  id: number;
  text: string;
}

export interface Category {
  shown: boolean;
  name: string;
  locked: boolean;
}

export interface State {
  tiles: Tile[];
  order: number[];
  groups: Record<Color, number[]>;
  categories: Record<Color, Category>;
  hardFirst: boolean;
}

export const COLORS: readonly Color[] = ["yellow", "green", "blue", "purple"];
export const GROUP_SIZE = 4;
export const GRID_SIZE = 16;

export function priorityOrder(hardFirst: boolean): Color[] {
  return hardFirst ? COLORS.slice().reverse() : COLORS.slice();
}

function emptyGroups(): Record<Color, number[]> {
  return { yellow: [], green: [], blue: [], purple: [] };
}

function emptyCategories(): Record<Color, Category> {
  const blank = (): Category => ({ shown: false, name: "", locked: false });
  return { yellow: blank(), green: blank(), blue: blank(), purple: blank() };
}

export function parseWords(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

export function createState(words: string[]): State {
  return {
    tiles: words.map((text, id) => ({ id, text })),
    order: words.map((_, id) => id),
    groups: emptyGroups(),
    categories: emptyCategories(),
    hardFirst: false,
  };
}

export function groupOf(state: State, id: number): Color | null {
  for (const color of COLORS) {
    if (state.groups[color].includes(id)) return color;
  }
  return null;
}

export function nextGroup(state: State): Color | null {
  for (const color of priorityOrder(state.hardFirst)) {
    if (state.groups[color].length < GROUP_SIZE) return color;
  }
  return null;
}

export function isGroupLocked(state: State, color: Color): boolean {
  return !!state.categories[color].locked;
}

export function isLocked(state: State, id: number): boolean {
  const color = groupOf(state, id);
  return !!color && isGroupLocked(state, color);
}

export function anyLocked(state: State): boolean {
  return COLORS.some((color) => isGroupLocked(state, color));
}

export function canLock(state: State, color: Color): boolean {
  return state.groups[color].length === GROUP_SIZE;
}

export function toggleLock(state: State, color: Color): State {
  if (isGroupLocked(state, color)) state.categories[color].locked = false;
  else if (canLock(state, color)) state.categories[color].locked = true;
  return state;
}

export function toggleTile(state: State, id: number): State {
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

export function clearSelections(state: State): State {
  for (const color of COLORS) {
    if (!isGroupLocked(state, color)) state.groups[color] = [];
  }
  return state;
}

export function setHardFirst(state: State, hardFirst: boolean): State {
  state.hardFirst = hardFirst;
  return state;
}

export function visibleCategories(state: State): Color[] {
  return priorityOrder(state.hardFirst).filter((c) => state.categories[c].shown);
}

export function shuffleUnselected(state: State, random: () => number = Math.random): State {
  const slots: number[] = [];
  const ids: number[] = [];
  state.order.forEach((id, index) => {
    if (!groupOf(state, id)) {
      slots.push(index);
      ids.push(id);
    }
  });
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  slots.forEach((slot, k) => {
    state.order[slot] = ids[k];
  });
  return state;
}

export function swapTiles(state: State, fromIndex: number, toIndex: number): State {
  if (fromIndex === toIndex) return state;
  [state.order[fromIndex], state.order[toIndex]] = [state.order[toIndex], state.order[fromIndex]];
  return state;
}
