var immutable = require('immutable');
var fromJS = immutable.fromJS;

var actions = require('./actions');
var KEYS = require('./keys');

var CURSOR = {
  PAGE: 0,
  COLUMN: 1,
  PARAGRAPH: 2,
  LINE: 3,
  CHUNK: 4,
  CHAR: 5
};

var DEFAULT_STATE = fromJS({
  cursor: [0, 0, 0, 0, 0, 0],
  content: [[[[['']]]]],
  style: []
});

function reducers(state, action) {
  if (state === undefined) {
    state = DEFAULT_STATE;
  }

  var cursor = state.get('cursor');
  var content = state.get('content');

  function current(cursorDepth) {
    return cursor.take(cursorDepth + 1);
  }
  function currentBut(cursorDepth, value) {
    return cursor.take(cursorDepth).push(value);
  }

  function jumpTo(jumpSpec) {
    return state.update('cursor', cursor =>
      cursor.take(cursor.size - jumpSpec.length).concat(jumpSpec)
    );
  }

  function moveCursorToPrev(what) {
    var prevWhatIdx = cursor.get(what) - 1;
    var prevWhat = content.getIn(currentBut(what, prevWhatIdx));

    switch (what) {
      case CURSOR.PARAGRAPH:
        return [prevWhatIdx, prevWhat.size - 1, prevWhat.last().size - 1, prevWhat.last().last().length];
      case CURSOR.LINE:
        return [prevWhatIdx, prevWhat.size - 1, prevWhat.last().length];
      case CURSOR.CHUNK:
        return [prevWhatIdx, prevWhat.length];
      case CURSOR.CHAR:
        return [prevWhatIdx];
    }
  }

  function moveCursorToNext(what) {
    var nextWhatIdx = cursor.get(what) + 1;
    var nextWhat = content.getIn(currentBut(what, nextWhatIdx));

    switch (what) {
      case CURSOR.PARAGRAPH:
        return [nextWhatIdx, 0, 0, 0];
      case CURSOR.LINE:
        return [nextWhatIdx, 0, 0];
      case CURSOR.CHUNK:
        return [nextWhatIdx, 0];
      case CURSOR.CHAR:
        return [nextWhatIdx];
    }
  }

  switch (action.type) {
    case actions.TYPE_CHARACTER:
      var char = action.payload;
      return state.update('content', content =>
          content.updateIn(current(CURSOR.CHUNK), chunk =>
            chunk.substr(0, cursor.get(CURSOR.CHAR)) + char + chunk.substr(cursor.get(CURSOR.CHAR))
          )
        )
        .updateIn(['cursor', CURSOR.CHAR], char => char + 1);

    case actions.PRESS_KEY:
      var keyCode = action.payload;
      switch (keyCode) {
        case KEYS.BACKSPACE:
          if (cursor.get(CURSOR.CHAR) > 0) {
            return state.update('content', content =>
                content.updateIn(current(CURSOR.CHUNK), chunk =>
                  chunk.substr(0, cursor.get(CURSOR.CHAR) - 1) + chunk.substr(cursor.get(CURSOR.CHAR))
                )
              )
              .updateIn(['cursor', CURSOR.CHAR], char => char - 1);
          }
          return state;

        case KEYS.ENTER:
          var lineChunks = content.getIn(current(CURSOR.LINE));
          var chunk = content.getIn(current(CURSOR.CHUNK));

          return state.update('content', content =>
              content.updateIn(current(CURSOR.CHUNK), chunk =>
                chunk.substr(0, cursor.get(CURSOR.CHAR))
              )
              .updateIn(
                current(CURSOR.LINE),
                chunks => chunks.slice(0, cursor.get(CURSOR.CHUNK) + 1)
              )
              .updateIn(
                current(CURSOR.COLUMN),
                paragraphs => paragraphs.splice(cursor.get(CURSOR.PARAGRAPH) + 1, 0, fromJS([
                  lineChunks.slice(cursor.get(CURSOR.CHUNK) + 1).unshift(
                    chunk.substr(cursor.get(CURSOR.CHAR))
                  )
                ]))
              )
            )
            .update('cursor', cursor =>
              cursor.update(CURSOR.PARAGRAPH, paragraph => paragraph + 1)
                .set(CURSOR.LINE, 0)
                .set(CURSOR.CHUNK, 0)
                .set(CURSOR.CHAR, 0)
            );

        case KEYS.LEFT_ARROW:
          if (cursor.get(CURSOR.CHAR) > 0) {
            return jumpTo(moveCursorToPrev(CURSOR.CHAR));
          }
          else if (cursor.get(CURSOR.CHUNK) > 0) {
            return jumpTo(moveCursorToPrev(CURSOR.CHUNK));
          }
          else if (cursor.get(CURSOR.LINE) > 0) {
            return jumpTo(moveCursorToPrev(CURSOR.LINE));
          }
          else if (cursor.get(CURSOR.PARAGRAPH) > 0) {
            return jumpTo(moveCursorToPrev(CURSOR.PARAGRAPH));
          }
          return state;

        case KEYS.RIGHT_ARROW:
          if (cursor.get(CURSOR.CHAR) < content.getIn(current(CURSOR.CHUNK)).length) {
            return jumpTo(moveCursorToNext(CURSOR.CHAR));
          }
          else if (cursor.get(CURSOR.CHUNK) < content.getIn(current(CURSOR.LINE)).size - 1) {
            return jumpTo(moveCursorToNext(CURSOR.CHUNK));
          }
          else if (cursor.get(CURSOR.LINE) < content.getIn(current(CURSOR.PARAGRAPH)).size - 1) {
            return jumpTo(moveCursorToNext(CURSOR.LINE));
          }
          else if (cursor.get(CURSOR.PARAGRAPH) < content.getIn(current(CURSOR.COLUMN)).size - 1) {
            return jumpTo(moveCursorToNext(CURSOR.PARAGRAPH));
          }
          return state;

      }

    default:
      return state;
  }
}

module.exports = reducers;