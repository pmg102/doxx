var immutable = require('immutable');
var fromJS = immutable.fromJS;

var actions = require('./actions');
var KEYS = require('./keys');
var STYLES = require('./styles');

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
  selection: {},
  content: [[[[['']]]]],
  style: [[[[[[]]]]]]
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

  function moveCursorToPrev(elementType) {
    var prevElementIdx = cursor.get(elementType) - 1;
    var prevElement = content.getIn(currentBut(elementType, prevElementIdx));

    switch (elementType) {
      case CURSOR.PARAGRAPH:
        return [prevElementIdx, prevElement.size - 1, prevElement.last().size - 1, prevElement.last().last().length];
      case CURSOR.LINE:
        return [prevElementIdx, prevElement.size - 1, prevElement.last().length];
      case CURSOR.CHUNK:
        return [prevElementIdx, prevElement.length];
      case CURSOR.CHAR:
        return [prevElementIdx];
    }
  }

  function moveCursorToNext(elementType) {
    var nextElementIdx = cursor.get(elementType) + 1;

    switch (elementType) {
      case CURSOR.PARAGRAPH:
        return [nextElementIdx, 0, 0, 0];
      case CURSOR.LINE:
        return [nextElementIdx, 0, 0];
      case CURSOR.CHUNK:
        return [nextElementIdx, 0];
      case CURSOR.CHAR:
        return [nextElementIdx];
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

          return state
            .update('content', content =>
              content
                .updateIn(current(CURSOR.CHUNK), chunk =>
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
          var prevElementType = [CURSOR.CHAR, CURSOR.CHUNK, CURSOR.LINE, CURSOR.PARAGRAPH]
            .find(elementType => cursor.get(elementType) > 0);

          return prevElementType
            ? jumpTo(moveCursorToPrev(prevElementType))
            : state;

        case KEYS.RIGHT_ARROW:
          var nextElementType = [CURSOR.CHAR, CURSOR.CHUNK, CURSOR.LINE, CURSOR.PARAGRAPH]
            .find(elementType => {
              const parent = content.getIn(current(elementType - 1));
              const parentSize = elementType === CURSOR.CHAR ? parent.length : parent.size - 1;
              return cursor.get(elementType) < parentSize;
            });

          return nextElementType
            ? jumpTo(moveCursorToNext(nextElementType))
            : state;

      }

    case actions.SET_CURSOR:
      return state.set('cursor', fromJS(action.payload));

    case actions.MAKE_SELECTION:
      return state.set('selection', fromJS(action.payload));

    case actions.APPLY_STYLE:
      // Break up the selection's enclosing chunk to contain a chunk with just the selection
      // Apply action.payload's style to that chunk
      const selectionStart = state.getIn(['selection', 'start', CURSOR.CHAR]);
      const selectionEnd = state.getIn(['selection', 'end', CURSOR.CHAR]);

      return state
        .update('content', content =>
          content.updateIn(current(CURSOR.LINE), line =>
            fromJS([
              line.get(0).slice(0, selectionStart),
              line.get(0).slice(selectionStart, selectionEnd),
              line.get(0).slice(selectionEnd),
            ])
          )
        )
        .update('style', style =>
          style.setIn(current(CURSOR.LINE), [[], [STYLES.BOLD], []])
        );

    default:
      return state;
  }
}

module.exports = reducers;