var TYPE_CHARACTER = 'TYPE_CHARACTER';
function typeCharacter(char) {
  return { type: TYPE_CHARACTER, payload: char };
}

var KEYS = {
  BACKSPACE: 8,
  TAB: 9,
  ENTER: 13,
  LEFT_ARROW: 37,
  RIGHT_ARROW: 39,
  UP_ARROW: 38,
  DOWN_ARROW: 40,
};

var PRESS_KEY = 'PRESS_KEY';
function pressKey(keyCode) {
  return { type: PRESS_KEY, payload: keyCode };
}

module.exports = {
  KEYS: KEYS,
  TYPE_CHARACTER: TYPE_CHARACTER,
  typeCharacter: typeCharacter,
  PRESS_KEY: PRESS_KEY,
  pressKey: pressKey
};