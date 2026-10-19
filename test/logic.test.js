const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logic.js");

const WORDS = Array.from({ length: 16 }, (_, i) => "W" + i);

function fresh() {
  return L.createState(WORDS);
}

test("fills groups in easy-first order", () => {
  const s = fresh();
  for (let i = 0; i < 9; i++) L.toggleTile(s, i);
  assert.deepEqual(s.groups.yellow, [0, 1, 2, 3]);
  assert.deepEqual(s.groups.green, [4, 5, 6, 7]);
  assert.deepEqual(s.groups.blue, [8]);
  assert.deepEqual(s.groups.purple, []);
});

test("fills groups in hard-first order", () => {
  const s = fresh();
  L.setHardFirst(s, true);
  for (let i = 0; i < 5; i++) L.toggleTile(s, i);
  assert.deepEqual(s.groups.purple, [0, 1, 2, 3]);
  assert.deepEqual(s.groups.blue, [4]);
});

test("deselecting frees a slot that the next click fills", () => {
  const s = fresh();
  for (let i = 0; i < 6; i++) L.toggleTile(s, i);
  L.toggleTile(s, 1);
  assert.equal(L.groupOf(s, 1), null);
  assert.deepEqual(s.groups.yellow, [0, 2, 3]);
  L.toggleTile(s, 10);
  assert.deepEqual(s.groups.yellow, [0, 2, 3, 10]);
  L.toggleTile(s, 11);
  assert.deepEqual(s.groups.green, [4, 5, 11]);
});

test("all 16 words can be assigned", () => {
  const s = fresh();
  for (let i = 0; i < 16; i++) L.toggleTile(s, i);
  for (const c of L.COLORS) assert.equal(s.groups[c].length, 4);
  assert.equal(L.nextGroup(s), null);
});

test("category boxes persist after their group empties", () => {
  const s = fresh();
  L.toggleTile(s, 0);
  L.toggleTile(s, 0);
  assert.deepEqual(s.groups.yellow, []);
  assert.deepEqual(L.visibleCategories(s), ["yellow"]);
});

test("visible categories follow the priority toggle", () => {
  const s = fresh();
  for (let i = 0; i < 13; i++) L.toggleTile(s, i);
  assert.deepEqual(L.visibleCategories(s), ["yellow", "green", "blue", "purple"]);
  L.setHardFirst(s, true);
  assert.deepEqual(L.visibleCategories(s), ["purple", "blue", "green", "yellow"]);
});

test("shuffle keeps selected tiles in place", () => {
  const s = fresh();
  L.moveTile(s, 0, 5);
  [3, 7, 12].forEach((id) => L.toggleTile(s, id));
  const before = s.order.slice();
  let seed = 1;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let round = 0; round < 20; round++) {
    L.shuffleUnselected(s, rng);
    before.forEach((id, idx) => {
      if (L.groupOf(s, id)) assert.equal(s.order[idx], id);
    });
    assert.deepEqual(s.order.slice().sort((a, b) => a - b), WORDS.map((_, i) => i));
  }
  assert.notDeepEqual(s.order, before);
});

test("moveTile reorders by insertion", () => {
  const s = fresh();
  L.moveTile(s, 0, 3);
  assert.deepEqual(s.order.slice(0, 4), [1, 2, 3, 0]);
  L.moveTile(s, 3, 0);
  assert.deepEqual(s.order.slice(0, 4), [0, 1, 2, 3]);
});

test("parseWords accepts newlines and commas", () => {
  assert.deepEqual(L.parseWords(" a, b\n\nc ,d\r\n"), ["a", "b", "c", "d"]);
});

test("only full groups can be locked", () => {
  const s = fresh();
  for (let i = 0; i < 3; i++) L.toggleTile(s, i);
  L.toggleLock(s, "yellow");
  assert.equal(L.isGroupLocked(s, "yellow"), false);
  L.toggleTile(s, 3);
  L.toggleLock(s, "yellow");
  assert.equal(L.isGroupLocked(s, "yellow"), true);
  L.toggleLock(s, "yellow");
  assert.equal(L.isGroupLocked(s, "yellow"), false);
});

test("locked words cannot be deselected", () => {
  const s = fresh();
  for (let i = 0; i < 4; i++) L.toggleTile(s, i);
  L.toggleLock(s, "yellow");
  L.toggleTile(s, 2);
  assert.deepEqual(s.groups.yellow, [0, 1, 2, 3]);
  assert.equal(L.isLocked(s, 2), true);
  L.toggleTile(s, 5);
  assert.deepEqual(s.groups.green, [5]);
});

test("deselect all keeps locked groups", () => {
  const s = fresh();
  for (let i = 0; i < 6; i++) L.toggleTile(s, i);
  L.toggleLock(s, "yellow");
  L.clearSelections(s);
  assert.deepEqual(s.groups.yellow, [0, 1, 2, 3]);
  assert.deepEqual(s.groups.green, []);
});

test("locked tiles can still be moved", () => {
  const s = fresh();
  for (let i = 0; i < 4; i++) L.toggleTile(s, i);
  L.toggleLock(s, "yellow");
  L.moveTile(s, 0, 15);
  assert.equal(s.order[15], 0);
  assert.equal(L.isLocked(s, 0), true);
});
