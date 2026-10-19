# Connections Planner

Plan every move for the NYT **Connections** puzzle before you submit a single guess. Instead of picking four words at a time, you can sort all 16 words into the four color groups and name each category.

![Connections Planner](docs/screenshot.png)

## Running it

You don't need a server, a build step or an install. It works in any modern browser (Chrome, Edge, Firefox, Safari) on Windows, macOS and Linux.

1. Download the repo: **Code → Download ZIP** and unzip it, or `git clone https://github.com/suhaasr/connections-planner.git`.
2. Open `index.html` in your browser. Double-clicking it works, or you can drag it onto a browser window.

Your current puzzle, groups and category names are saved in the browser's local storage, so they come back when you reopen the file.

## How to use it

- **Enter words**: paste the 16 words, one per line or comma-separated, then click **Start planning**. **Load sample** fills in a demo puzzle. **Edit words** brings this screen back. If you change the words, your plan is reset.
- **Select words**: click any word to add it to a group. Groups fill four words at a time in priority order:
  - **easy-first** (default, yellow switch): Yellow → Green → Blue → Purple
  - **hard-first** (purple switch): Purple → Blue → Green → Yellow

  The active label is black and the inactive one is light grey.
- **Deselect**: click a highlighted word to remove it from its group. The next word you click goes into the highest-priority group that has fewer than four words, so a gap you open gets filled first.
- **Name categories**: when a group gets its first word, a box in that color appears below the grid so you can write down your guess for the category. The box stays even if you later deselect every word in that group. The boxes are listed in the current priority order.
- **Lock groups**: once a group has all four words, click the padlock next to its category box to lock it. You can't deselect a locked group's words, and **Deselect all** is disabled while any group is locked. Locked tiles get a bold border but can still be dragged. Click the padlock again to unlock.
- **Reorder**: drag a word onto another tile to move it there.
- **Shuffle**: shuffles only the words that aren't selected. Selected words stay where they are.
- **Deselect all**: clears every group but keeps your category names. It's disabled while any group is locked.
- **Dark mode**: the button in the top-right corner switches between light and dark themes. Until you click it, the app follows your system theme. After that it remembers your choice.

## Development

The app is written in TypeScript. The compiled bundle, `dist/app.js`, is committed, so you only need Node.js (22.18+) if you want to change the code.

- `index.html`: markup
- `style.css`: styles
- `src/logic.ts`: state logic with no DOM code (selection priority, locking, shuffle, reordering)
- `src/app.ts`: rendering and event handling
- `test/logic.test.ts`: tests for the logic
- `dist/app.js`: build output that `index.html` loads

`npm run build` type-checks the code with `tsc` and bundles it with esbuild into a single classic script (an IIFE, not an ES module), because browsers block ES modules loaded from `file://` URLs. Rebuild and commit `dist/app.js` whenever you change anything in `src/`.

```sh
npm install
npm run build   # type-check and bundle into dist/app.js
npm test        # run the logic tests (Node runs the .ts files directly)
```
