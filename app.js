/** Top → bottom: G D A E B (standard tab view; B at bottom). */
const STRINGS = [
  { name: "G", midiOpen: 43 },
  { name: "D", midiOpen: 38 },
  { name: "A", midiOpen: 33 },
  { name: "E", midiOpen: 28 },
  { name: "B", midiOpen: 23 },
];

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_NAMES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const INTERVALS_SHARP = ["R", "b2", "2", "b3", "3", "4", "b5", "5", "#5", "6", "b7", "7"];
const INTERVALS_FLAT = ["R", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"];

/** Semitone offset from root for each sticker id (extensions use mod-12). */
const INTERVAL_SEMITONES = {
  R: 0,
  b2: 1,
  2: 2,
  b3: 3,
  3: 4,
  4: 5,
  b5: 6,
  5: 7,
  s5: 8,
  6: 9,
  b7: 10,
  7: 11,
  b9: 1,
  9: 2,
  s9: 3,
  11: 5,
  s11: 6,
  b13: 8,
  13: 9,
};

const ROOT_OPTIONS = NOTE_NAMES;

const SCALES = {
  major: { label: "Major", intervals: [0, 2, 4, 5, 7, 9, 11] },
  naturalMinor: { label: "Natural minor", intervals: [0, 2, 3, 5, 7, 8, 10] },
  harmonicMinor: { label: "Harmonic minor", intervals: [0, 2, 3, 5, 7, 8, 11] },
  melodicMinor: { label: "Melodic minor", intervals: [0, 2, 3, 5, 7, 9, 11] },
  dorian: { label: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { label: "Phrygian", intervals: [0, 1, 3, 5, 7, 8, 10] },
  lydian: { label: "Lydian", intervals: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { label: "Mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10] },
  locrian: { label: "Locrian", intervals: [0, 1, 3, 5, 6, 8, 10] },
  majorPentatonic: { label: "Major pentatonic", intervals: [0, 2, 4, 7, 9] },
  minorPentatonic: { label: "Minor pentatonic", intervals: [0, 3, 5, 7, 10] },
  blues: { label: "Blues", intervals: [0, 3, 5, 6, 7, 10] },
};

const FRET_COUNT = 20;
const FRET_MARKERS = new Set([3, 5, 7, 9, 12, 15, 17, 19]);
/** Portrait: ~this many frets visible before horizontal scroll */
const PORTRAIT_VISIBLE_FRETS = 10;

/** Relative fret spans (nut wide → bridge narrow) before fitting to screen. */
const FRET_WIDTH_MAX_PX = 48;
const FRET_WIDTH_MIN_PX = 24;

function fretTaperWeights() {
  const weights = [];
  for (let f = 0; f <= FRET_COUNT; f++) {
    const t = f / FRET_COUNT;
    const eased = t * t * (3 - 2 * t);
    weights.push(
      FRET_WIDTH_MAX_PX - (FRET_WIDTH_MAX_PX - FRET_WIDTH_MIN_PX) * eased
    );
  }
  return weights;
}

const fretboardWrapEl = () => document.querySelector(".fretboard-wrap");

function isTouchMobile() {
  return (
    window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768
  );
}

function isLandscapeCompact() {
  return (
    window.matchMedia("(orientation: landscape)").matches &&
    window.innerHeight < 520
  );
}

function isPortrait() {
  return window.innerWidth < window.innerHeight;
}

function updateLayoutMode() {
  document.body.classList.toggle("layout-touch", isTouchMobile());
  document.body.classList.toggle("layout-compact", isLandscapeCompact());
  document.body.classList.toggle("layout-portrait", isPortrait());
}

function getFretboardAreaSize(wrap) {
  const header = document.querySelector(".header");
  const palette = document.querySelector(".palette-section");
  const vv = window.visualViewport;
  const viewH = vv?.height ?? window.innerHeight;
  const viewW = vv?.width ?? window.innerWidth;
  const headerH = header?.getBoundingClientRect().height ?? 48;
  const paletteH = palette?.getBoundingClientRect().height ?? 52;
  const availH = Math.max(80, viewH - headerH - paletteH - 4);
  const availW = Math.max(200, wrap.clientWidth || viewW - 12);
  return { availW, availH, viewH, viewW };
}

function applyFretboardLayout() {
  const wrap = fretboardWrapEl();
  if (!wrap || !fretboardEl.childElementCount) return;

  updateLayoutMode();

  const { availW, availH, viewW, viewH } = getFretboardAreaSize(wrap);
  if (availH < 60 || availW < 60) {
    requestAnimationFrame(applyFretboardLayout);
    return;
  }

  const mobile = isTouchMobile();
  const portrait = isPortrait();
  const boardPadX = 6;
  const boardPadY = 6;

  const stringCol = Math.round(
    Math.max(mobile ? 28 : 26, Math.min(48, availW * 0.075))
  );
  const labelRow = Math.round(Math.max(12, Math.min(22, availH * 0.07)));
  const innerH = availH - boardPadY * 2 - labelRow;
  const stringGap = Math.floor(innerH / STRINGS.length);

  const weights = fretTaperWeights();
  const innerW = availW - boardPadX * 2 - stringCol;
  let colWidths;
  let useHScroll = false;

  if (portrait) {
    const minFretPx = Math.max(
      30,
      Math.min(46, Math.floor(innerW / PORTRAIT_VISIBLE_FRETS))
    );
    const taperScale = minFretPx / FRET_WIDTH_MIN_PX;
    colWidths = weights.map((w) =>
      Math.max(minFretPx - 2, Math.round(w * taperScale))
    );
    useHScroll = true;
  } else {
    const sumW = weights.reduce((a, b) => a + b, 0);
    const scale = innerW / sumW;
    const minFretPx = mobile ? 12 : 7;
    colWidths = weights.map((w) => Math.max(minFretPx, Math.floor(w * scale)));
    const totalCols = colWidths.reduce((a, b) => a + b, 0);
    if (totalCols > innerW) {
      const minFretPx2 = Math.max(22, Math.floor(innerW / 14));
      const taperScale = minFretPx2 / FRET_WIDTH_MIN_PX;
      colWidths = weights.map((w) =>
        Math.max(minFretPx2, Math.round(w * taperScale))
      );
      useHScroll = true;
    } else if (totalCols < innerW) {
      colWidths[0] += innerW - totalCols;
    }
  }

  const totalCols = colWidths.reduce((a, b) => a + b, 0);
  if (useHScroll) {
    wrap.classList.add("fretboard-wrap--scroll-x");
    fretboardEl.style.width = `${stringCol + totalCols}px`;
  } else {
    wrap.classList.remove("fretboard-wrap--scroll-x");
    fretboardEl.style.width = "100%";
  }

  const boardH = labelRow + stringGap * STRINGS.length + boardPadY * 2;
  fretboardEl.style.height = `${boardH}px`;
  fretboardEl.style.maxHeight = `${availH}px`;

  const hint = document.getElementById("fret-scroll-hint");
  if (hint) hint.hidden = !useHScroll;
  fretboardEl.style.gridTemplateColumns = `${stringCol}px ${colWidths.map((w) => `${w}px`).join(" ")}`;
  fretboardEl.style.gridTemplateRows = `${labelRow}px repeat(${STRINGS.length}, ${stringGap}px)`;

  const root = document.documentElement;
  const stickerSize = Math.max(
    mobile ? 32 : 18,
    Math.min(mobile ? 48 : 34, Math.round(stringGap * (mobile ? 0.58 : 0.5)))
  );
  const paletteSticker = Math.max(
    mobile ? 28 : 24,
    Math.min(mobile ? 36 : 30, stickerSize)
  );
  root.style.setProperty("--string-gap", `${stringGap}px`);
  root.style.setProperty("--sticker-size", `${stickerSize}px`);
  root.style.setProperty("--palette-sticker-size", `${paletteSticker}px`);
  root.style.setProperty(
    "--fret-label-size",
    `${Math.max(9, Math.min(14, labelRow * 0.5))}px`
  );
  root.style.setProperty(
    "--note-label-size",
    `${Math.max(9, Math.min(14, stringGap * 0.26))}px`
  );
  root.style.setProperty(
    "--string-name-size",
    `${Math.max(10, Math.min(15, stringGap * 0.3))}px`
  );
}

let fretboardResizeObserver;

function initFretboardLayoutWatch() {
  const wrap = fretboardWrapEl();
  if (!wrap) return;

  const scheduleLayout = () => requestAnimationFrame(applyFretboardLayout);

  if (!fretboardResizeObserver) {
    fretboardResizeObserver = new ResizeObserver(scheduleLayout);
    fretboardResizeObserver.observe(wrap);
    const header = document.querySelector(".header");
    const palette = document.querySelector(".palette-section");
    if (header) fretboardResizeObserver.observe(header);
    if (palette) fretboardResizeObserver.observe(palette);
    window.addEventListener("resize", scheduleLayout);
    window.addEventListener("orientationchange", () => {
      setTimeout(scheduleLayout, 100);
      setTimeout(scheduleLayout, 350);
    });
    window.visualViewport?.addEventListener("resize", scheduleLayout);
    window.visualViewport?.addEventListener("scroll", scheduleLayout);
  }
  scheduleLayout();
}

const INTERVALS = [
  { id: "R", label: "R", color: "#f5d76e" },
  { id: "b2", label: "b2", color: "#ff9f7a" },
  { id: "2", label: "2", color: "#ffb347" },
  { id: "b3", label: "b3", color: "#7ec8e3" },
  { id: "3", label: "3", color: "#5dade2" },
  { id: "4", label: "4", color: "#82e0aa" },
  { id: "b5", label: "b5", color: "#bb8fce" },
  { id: "5", label: "5", color: "#a569bd" },
  { id: "s5", label: "#5", color: "#d7bde2" },
  { id: "6", label: "6", color: "#f1948a" },
  { id: "b7", label: "b7", color: "#ec7063" },
  { id: "7", label: "7", color: "#e74c3c" },
  { id: "b9", label: "b9", color: "#aed6f1" },
  { id: "9", label: "9", color: "#85c1e9" },
  { id: "s9", label: "#9", color: "#5dade2" },
  { id: "11", label: "11", color: "#73c6b6" },
  { id: "s11", label: "#11", color: "#48c9b0" },
  { id: "b13", label: "b13", color: "#f8c471" },
  { id: "13", label: "13", color: "#f5b041" },
];

const STORAGE_KEY = "bass-interval-board-v2";
const SCALE_STORAGE_KEY = "bass-interval-board-scale-v2";

/** @type {Record<string, string>} */
let placements = loadPlacements();

/** @type {{ root: string, type: string, showNotes: boolean, useFlats: boolean, labelMode: string }} */
let scaleSettings = loadScaleSettings();

const fretboardEl = document.getElementById("fretboard");
const paletteEl = document.getElementById("palette");
const toastEl = document.getElementById("toast");
const scaleRootEl = document.getElementById("scale-root");
const scaleTypeEl = document.getElementById("scale-type");
const showScaleNotesEl = document.getElementById("show-scale-notes");
const useFlatsEl = document.getElementById("use-flats");
const accidentalLabelEl = document.getElementById("accidental-label");
const labelModeRadios = document.querySelectorAll('input[name="label-mode"]');

let dragState = null;

const DRAG_THRESHOLD_PX = 10;

function cellKey(stringIdx, fret) {
  return `${stringIdx}-${fret}`;
}

function loadPlacements() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    const legacy = localStorage.getItem("bass-interval-board-v1");
    if (!legacy) return {};
    const old = JSON.parse(legacy);
    const migrated = {};
    for (const [key, val] of Object.entries(old)) {
      const [s, f] = key.split("-");
      migrated[`${4 - Number(s)}-${f}`] = val;
    }
    return migrated;
  } catch {
    return {};
  }
}

function loadScaleSettings() {
  const defaults = {
    root: "C",
    type: "major",
    showNotes: false,
    useFlats: false,
    labelMode: "alphabet",
  };
  try {
    const raw = localStorage.getItem(SCALE_STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
    const legacy = localStorage.getItem("bass-interval-board-scale-v1");
    if (legacy) return { ...defaults, ...JSON.parse(legacy) };
  } catch {
    /* ignore */
  }
  return defaults;
}

function saveScaleSettings() {
  localStorage.setItem(SCALE_STORAGE_KEY, JSON.stringify(scaleSettings));
}

function noteNameForMidi(midi, useFlats = scaleSettings.useFlats) {
  const pc = pitchClassForMidi(midi);
  return (useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES)[pc];
}

/** Root = pitch class of the R sticker on the board, else Settings → Root. */
function getEffectiveRootPitchClass() {
  for (const [key, intervalId] of Object.entries(placements)) {
    if (intervalId === "R") {
      const [s, f] = key.split("-").map(Number);
      return pitchClassForMidi(midiAt(s, f));
    }
  }
  return rootPitchClass();
}

function semitoneFromRoot(midi) {
  const rootPc = getEffectiveRootPitchClass();
  return (pitchClassForMidi(midi) - rootPc + 12) % 12;
}

function intervalLabelForMidi(midi, useFlats = scaleSettings.useFlats) {
  const map = useFlats ? INTERVALS_FLAT : INTERVALS_SHARP;
  return map[semitoneFromRoot(midi)];
}

function scaleLabelForMidi(midi) {
  if (scaleSettings.labelMode === "interval") {
    return intervalLabelForMidi(midi);
  }
  return noteNameForMidi(midi);
}

function intervalSemitone(intervalId) {
  return INTERVAL_SEMITONES[intervalId];
}

/** e.g. #5 and b6 are both 8 semitones above the root */
function intervalIdsMatchingSemitone(semi) {
  return Object.entries(INTERVAL_SEMITONES)
    .filter(([, s]) => s === semi)
    .map(([id]) => id);
}

function isValidPlacement(stringIdx, fret, intervalId) {
  if (intervalId === "R") return true;

  const placedSemi = intervalSemitone(intervalId);
  if (placedSemi === undefined) return false;

  const expectedSemi = semitoneFromRoot(midiAt(stringIdx, fret));
  return intervalIdsMatchingSemitone(expectedSemi).includes(intervalId);
}

function midiAt(stringIdx, fret) {
  return STRINGS[stringIdx].midiOpen + fret;
}

function pitchClassForMidi(midi) {
  return ((midi % 12) + 12) % 12;
}

function rootPitchClass() {
  return NOTE_NAMES.indexOf(scaleSettings.root);
}

function scalePitchClasses() {
  const root = getEffectiveRootPitchClass();
  const def = SCALES[scaleSettings.type] ?? SCALES.major;
  return new Set(def.intervals.map((i) => (root + i) % 12));
}

function isInScale(midi) {
  return scalePitchClasses().has(pitchClassForMidi(midi));
}

function isRootTone(midi) {
  return pitchClassForMidi(midi) === getEffectiveRootPitchClass();
}

function savePlacements() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(placements));
  showToast("Saved");
}

function showToast(msg, { placement = "default" } = {}) {
  toastEl.textContent = msg;
  toastEl.classList.remove("toast--fretboard", "toast--error");
  if (placement === "fretboard") {
    toastEl.classList.add("toast--fretboard", "toast--error");
  }
  toastEl.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toastEl.hidden = true;
    toastEl.classList.remove("toast--fretboard", "toast--error");
  }, 2000);
}

function getInterval(id) {
  return INTERVALS.find((i) => i.id === id) ?? INTERVALS[0];
}

function buildFretboard() {
  fretboardEl.innerHTML = "";

  const nutLabel = document.createElement("div");
  nutLabel.className = "fret-label nut-col";
  nutLabel.style.gridColumn = "1";
  nutLabel.textContent = "";
  fretboardEl.appendChild(nutLabel);

  for (let f = 0; f <= FRET_COUNT; f++) {
    const label = document.createElement("div");
    label.className = "fret-label" + (f === 0 ? " nut-col" : "");
    label.style.gridColumn = String(f + 2);
    label.textContent = f === 0 ? "open" : String(f);
    fretboardEl.appendChild(label);
  }

  STRINGS.forEach((str, sIdx) => {
    const nameEl = document.createElement("div");
    nameEl.className = "string-name";
    nameEl.style.gridRow = String(sIdx + 2);
    nameEl.style.gridColumn = "1";
    nameEl.textContent = str.name;
    fretboardEl.appendChild(nameEl);

    for (let f = 0; f <= FRET_COUNT; f++) {
      const cell = document.createElement("div");
      cell.className = "fret-cell" + (f === 0 ? " nut" : "");
      cell.style.gridRow = String(sIdx + 2);
      cell.style.gridColumn = String(f + 2);
      cell.dataset.string = String(sIdx);
      cell.dataset.fret = String(f);

      const drop = document.createElement("div");
      drop.className = "drop-target";
      drop.dataset.string = String(sIdx);
      drop.dataset.fret = String(f);
      cell.appendChild(drop);

      if (scaleSettings.showNotes) {
        const midi = midiAt(sIdx, f);
        if (isInScale(midi)) {
          const noteEl = document.createElement("span");
          noteEl.className = "note-label in-scale";
          if (scaleSettings.labelMode === "interval") {
            noteEl.classList.add("interval-label");
          }
          if (isRootTone(midi)) noteEl.classList.add("root-tone");
          noteEl.textContent = scaleLabelForMidi(midi);
          cell.appendChild(noteEl);
        }
      }

      fretboardEl.appendChild(cell);

      const key = cellKey(sIdx, f);
      if (placements[key]) {
        placeStickerOnCell(drop, placements[key], false);
      }
    }
  });

  FRET_MARKERS.forEach((fret) => {
    const inlay = document.createElement("div");
    inlay.className = "fret-inlay" + (fret === 12 ? " fret-inlay--double" : "");
    inlay.style.gridColumn = String(fret + 2);
    inlay.style.gridRow = `2 / span ${STRINGS.length}`;
    inlay.setAttribute("aria-hidden", "true");

    const dotCount = fret === 12 ? 2 : 1;
    for (let i = 0; i < dotCount; i++) {
      const dot = document.createElement("span");
      dot.className = "fret-inlay-dot";
      inlay.appendChild(dot);
    }

    fretboardEl.appendChild(inlay);
  });

  applyFretboardLayout();
}

function buildPalette() {
  paletteEl.innerHTML = "";
  INTERVALS.forEach((interval) => {
    const el = createStickerElement(interval.id, true);
    paletteEl.appendChild(el);
    attachDragHandlers(el, { source: "palette", intervalId: interval.id });
  });
}

function createStickerElement(intervalId, isPalette = false) {
  const interval = getInterval(intervalId);
  const el = document.createElement("div");
  el.className = "sticker" + (isPalette ? "" : "");
  el.textContent = interval.label;
  el.style.backgroundColor = interval.color;
  el.dataset.interval = interval.id;
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", `Interval ${interval.label}`);
  return el;
}

function removeStickerFromCell(stringIdx, fret, persist = true) {
  const key = cellKey(stringIdx, fret);
  if (persist) delete placements[key];
  const drop = findDropTarget(stringIdx, fret);
  drop?.querySelector(".sticker")?.remove();
}

function placeStickerOnCell(dropTarget, intervalId, persist = true) {
  const s = dropTarget.dataset.string;
  const f = dropTarget.dataset.fret;
  const key = cellKey(Number(s), Number(f));

  removeStickerFromCell(Number(s), Number(f), false);

  const sticker = createStickerElement(intervalId, false);
  dropTarget.appendChild(sticker);
  attachDragHandlers(sticker, {
    source: "board",
    intervalId,
    string: Number(s),
    fret: Number(f),
  });

  if (persist) {
    placements[key] = intervalId;
    if (intervalId === "R") {
      buildFretboard();
    }
  }
}

function attachDragHandlers(el, meta) {
  el.addEventListener("pointerdown", onPointerDown);
  el._dragMeta = meta;
}

function onPointerDown(e) {
  if (e.button !== 0 && e.pointerType === "mouse") return;
  const sourceEl = e.currentTarget;
  const meta = sourceEl._dragMeta;
  if (!meta) return;

  e.preventDefault();

  dragState = {
    sourceEl,
    meta: { ...meta },
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    started: false,
    originCell: meta.source === "board" ? { string: meta.string, fret: meta.fret } : null,
  };

  sourceEl.setPointerCapture(e.pointerId);
  sourceEl.addEventListener("pointermove", onPointerMoveMaybeDrag);
  sourceEl.addEventListener("pointerup", onPointerUp);
  sourceEl.addEventListener("pointercancel", onPointerUp);
}

function clearDragHighlight() {
  document.querySelectorAll(".drop-target.drag-over").forEach((d) => {
    d.classList.remove("drag-over");
  });
}

function findDropTargetAtPoint(x, y) {
  const ghost = dragState?.el;
  if (ghost) ghost.style.visibility = "hidden";
  const hit = document.elementFromPoint(x, y);
  if (ghost) ghost.style.visibility = "";
  return hit?.closest?.(".drop-target") ?? null;
}

function beginDrag(e) {
  const { sourceEl, meta } = dragState;

  sourceEl.removeEventListener("pointermove", onPointerMoveMaybeDrag);
  sourceEl.removeEventListener("pointerup", onPointerUp);
  sourceEl.removeEventListener("pointercancel", onPointerUp);

  const ghost = sourceEl.cloneNode(true);
  ghost.classList.add("dragging", "drag-ghost");
  document.body.appendChild(ghost);

  let hiddenSource = null;
  if (meta.source === "board") {
    hiddenSource = sourceEl;
    hiddenSource.style.visibility = "hidden";
  }

  dragState.started = true;
  dragState.el = ghost;
  dragState.hiddenSource = hiddenSource;

  positionDragGhost(e.clientX, e.clientY);

  ghost.setPointerCapture(e.pointerId);
  ghost.addEventListener("pointermove", onPointerDragMove);
  ghost.addEventListener("pointerup", onPointerDragEnd);
  ghost.addEventListener("pointercancel", onPointerDragEnd);
}

function onPointerMoveMaybeDrag(e) {
  if (!dragState || e.pointerId !== dragState.pointerId || dragState.started) return;
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
  beginDrag(e);
}

/** Center of sticker sits on pointer (finger tip / cursor). */
function positionDragGhost(x, y) {
  if (!dragState?.el) return;
  dragState.el.style.left = `${x}px`;
  dragState.el.style.top = `${y}px`;
}

function highlightDropTarget(target) {
  if (target) target.classList.add("drag-over");
}

function onPointerDragMove(e) {
  if (!dragState?.started || e.pointerId !== dragState.pointerId) return;
  positionDragGhost(e.clientX, e.clientY);

  clearDragHighlight();
  const target = findDropTargetAtPoint(e.clientX, e.clientY);
  if (target) highlightDropTarget(target);
}

function detachSourcePointerListeners(sourceEl) {
  sourceEl.removeEventListener("pointermove", onPointerMoveMaybeDrag);
  sourceEl.removeEventListener("pointerup", onPointerUp);
  sourceEl.removeEventListener("pointercancel", onPointerUp);
}

function onPointerUp(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  if (dragState.started) return;

  detachSourcePointerListeners(e.currentTarget);

  if (dragState.meta.source === "board") {
    removeStickerFromCell(dragState.meta.string, dragState.meta.fret);
  }

  dragState = null;
}

function playInvalidDrop(ghost, x, y, hiddenSource) {
  positionDragGhost(x, y);
  ghost.textContent = "✕";
  ghost.classList.add("sticker--invalid", "sticker--drop-error");
  ghost.style.backgroundColor = "#d64040";
  ghost.style.borderColor = "#ff8a80";
  ghost.style.color = "#fff";

  if (navigator.vibrate) navigator.vibrate([35, 50, 35]);

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    ghost.remove();
    if (hiddenSource) hiddenSource.style.visibility = "";
  };

  ghost.addEventListener("animationend", finish, { once: true });
  setTimeout(finish, 700);
  showToast("Wrong interval", { placement: "fretboard" });
}

function onPointerDragEnd(e) {
  const ghost = e.currentTarget;
  ghost.removeEventListener("pointermove", onPointerDragMove);
  ghost.removeEventListener("pointerup", onPointerDragEnd);
  ghost.removeEventListener("pointercancel", onPointerDragEnd);

  if (!dragState?.started || e.pointerId !== dragState.pointerId) return;

  const { meta, originCell, hiddenSource } = dragState;

  clearDragHighlight();

  const target = findDropTargetAtPoint(e.clientX, e.clientY);
  if (target) {
    const stringIdx = Number(target.dataset.string);
    const fret = Number(target.dataset.fret);

    if (!isValidPlacement(stringIdx, fret, meta.intervalId)) {
      dragState = null;
      playInvalidDrop(ghost, e.clientX, e.clientY, hiddenSource);
      return;
    }

    if (originCell) {
      const moved =
        stringIdx !== originCell.string || fret !== originCell.fret;
      if (moved) {
        removeStickerFromCell(originCell.string, originCell.fret);
      }
      hiddenSource?.remove();
    }
    placeStickerOnCell(target, meta.intervalId);
    ghost.remove();
  } else if (hiddenSource) {
    hiddenSource.style.visibility = "";
    ghost.remove();
  } else {
    ghost.remove();
  }

  dragState = null;
}

function findDropTarget(stringIdx, fret) {
  return fretboardEl.querySelector(
    `.drop-target[data-string="${stringIdx}"][data-fret="${fret}"]`
  );
}

function rebuildRootSelect() {
  const current = scaleRootEl.value || scaleSettings.root;
  scaleRootEl.innerHTML = "";
  ROOT_OPTIONS.forEach((n, i) => {
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = scaleSettings.useFlats ? NOTE_NAMES_FLAT[i] : n;
    scaleRootEl.appendChild(opt);
  });
  scaleRootEl.value = ROOT_OPTIONS.includes(current) ? current : scaleSettings.root;
}

function syncAccidentalUi() {
  const isInterval = scaleSettings.labelMode === "interval";
  useFlatsEl.checked = scaleSettings.useFlats;
  accidentalLabelEl.textContent = isInterval
    ? "Prefer ♭ spellings (b6 vs #5)"
    : scaleSettings.useFlats
      ? "Using ♭ (flats)"
      : "Using ♯ (sharps)";
}

function readScaleSettingsFromUi() {
  const labelMode =
    [...labelModeRadios].find((r) => r.checked)?.value ?? "alphabet";
  return {
    root: scaleRootEl.value,
    type: scaleTypeEl.value,
    showNotes: showScaleNotesEl.checked,
    useFlats: useFlatsEl.checked,
    labelMode,
  };
}

function applyScaleSettingsToUi() {
  scaleTypeEl.value = scaleSettings.type;
  showScaleNotesEl.checked = scaleSettings.showNotes;
  useFlatsEl.checked = scaleSettings.useFlats;
  labelModeRadios.forEach((r) => {
    r.checked = r.value === scaleSettings.labelMode;
  });
  rebuildRootSelect();
  syncAccidentalUi();
}

function initSettingsPanel() {
  const btnOpen = document.getElementById("btn-settings");
  const btnClose = document.getElementById("btn-settings-close");
  const panel = document.getElementById("settings-panel");
  const backdrop = document.getElementById("settings-backdrop");

  const open = () => {
    backdrop.hidden = false;
    panel.hidden = false;
    requestAnimationFrame(() => {
      panel.classList.add("is-open");
      backdrop.classList.add("is-open");
    });
    panel.setAttribute("aria-hidden", "false");
    backdrop.setAttribute("aria-hidden", "false");
    btnOpen.setAttribute("aria-expanded", "true");
    document.body.classList.add("settings-open");
  };

  const close = () => {
    panel.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    backdrop.setAttribute("aria-hidden", "true");
    btnOpen.setAttribute("aria-expanded", "false");
    document.body.classList.remove("settings-open");
    setTimeout(() => {
      panel.hidden = true;
      backdrop.hidden = true;
      requestAnimationFrame(applyFretboardLayout);
    }, 280);
  };

  btnOpen.addEventListener("click", open);
  btnClose.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) close();
  });
}

function initScaleControls() {
  Object.entries(SCALES).forEach(([id, def]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = def.label;
    scaleTypeEl.appendChild(opt);
  });

  applyScaleSettingsToUi();

  const onScaleChange = () => {
    scaleSettings = readScaleSettingsFromUi();
    syncAccidentalUi();
    saveScaleSettings();
    buildFretboard();
  };

  scaleRootEl.addEventListener("change", onScaleChange);
  scaleTypeEl.addEventListener("change", onScaleChange);
  showScaleNotesEl.addEventListener("change", onScaleChange);
  useFlatsEl.addEventListener("change", () => {
    scaleSettings = readScaleSettingsFromUi();
    rebuildRootSelect();
    syncAccidentalUi();
    saveScaleSettings();
    buildFretboard();
  });
  labelModeRadios.forEach((r) => {
    r.addEventListener("change", () => {
      scaleSettings = readScaleSettingsFromUi();
      syncAccidentalUi();
      saveScaleSettings();
      buildFretboard();
    });
  });
}

document.getElementById("btn-clear").addEventListener("click", () => {
  placements = {};
  savePlacements();
  buildFretboard();
});

document.getElementById("btn-save").addEventListener("click", savePlacements);

initScaleControls();
initSettingsPanel();
buildFretboard();
buildPalette();
initFretboardLayoutWatch();
