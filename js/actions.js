var TYPE_CHARACTER = 'TYPE_CHARACTER';
function typeCharacter(char) {
  return { type: TYPE_CHARACTER, payload: char };
}

var PRESS_KEY = 'PRESS_KEY';
function pressKey(keyCode) {
  return { type: PRESS_KEY, payload: keyCode };
}

var SET_CURSOR = 'SET_CURSOR';
function setCursor(cursor) {
  return { type: SET_CURSOR, payload: cursor };
}

var MAKE_SELECTION = 'MAKE_SELECTION';
function makeSelection(start, end) {
  return { type: MAKE_SELECTION, payload: {start, end} };
}

var APPLY_STYLE = 'APPLY_STYLE';
function applyStyle(style) {
  return { type: APPLY_STYLE, payload: style };
}

var REFLOW_LINE = 'REFLOW_LINE';
function reflowLine(chunkDims, line /* if omitted, current line */) {
  return { type: REFLOW_LINE, payload: { line, chunkDims } };
}

module.exports = {
  TYPE_CHARACTER: TYPE_CHARACTER,
  typeCharacter: typeCharacter,
  PRESS_KEY: PRESS_KEY,
  pressKey: pressKey,
  SET_CURSOR: SET_CURSOR,
  setCursor: setCursor,
  MAKE_SELECTION: MAKE_SELECTION,
  makeSelection: makeSelection,
  APPLY_STYLE: APPLY_STYLE,
  applyStyle: applyStyle,
  REFLOW_LINE: REFLOW_LINE,
  reflowLine: reflowLine,
};
