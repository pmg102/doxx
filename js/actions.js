var TYPE_CHARACTER = 'TYPE_CHARACTER';
function typeCharacter(char) {
  return { type: TYPE_CHARACTER, payload: char };
}

var PRESS_KEY = 'PRESS_KEY';
function pressKey(keyCode) {
  return { type: PRESS_KEY, payload: keyCode };
}

module.exports = {
  TYPE_CHARACTER: TYPE_CHARACTER,
  typeCharacter: typeCharacter,
  PRESS_KEY: PRESS_KEY,
  pressKey: pressKey
};