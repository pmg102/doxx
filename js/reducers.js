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
            var prevChar = cursor.get(CURSOR.CHAR) - 1;
            return state.update('cursor', cursor =>
              cursor.set(CURSOR.CHAR, prevChar)
            );
          }
          else if (cursor.get(CURSOR.CHUNK) > 0) {
            var prevChunk = cursor.get(CURSOR.CHUNK) - 1;
            var prevChunkChars = content.getIn(currentBut(CURSOR.CHUNK, prevChunk));
            var prevChar = prevChunkChars.length;

            return state.update('cursor', cursor =>
              cursor
                .set(CURSOR.CHUNK, prevChunk)
                .set(CURSOR.CHAR, prevChar)
            )
          }
          else if (cursor.get(CURSOR.LINE) > 0) {
            var prevLine = cursor.get(CURSOR.LINE) - 1;
            var prevLineChunks = content.getIn(currentBut(CURSOR.LINE, prevLine));
            var prevChunk = prevLineChunks.size - 1;
            var prevChunkChars = prevLineChunks.last();
            var prevChar = prevChunkChars.length;

            return state.update('cursor', cursor =>
              cursor
                .set(CURSOR.LINE, prevLine)
                .set(CURSOR.CHUNK, prevChunk)
                .set(CURSOR.CHAR, prevChar)
            )
          }
          else if (cursor.get(CURSOR.PARAGRAPH) > 0) {
            var prevParagraph = cursor.get(CURSOR.PARAGRAPH) - 1;
            var prevParaLines = content.getIn(currentBut(CURSOR.PARAGRAPH, prevParagraph));
            var prevLine = prevParaLines.size - 1;
            var prevLineChunks = prevParaLines.last();
            var prevChunk = prevLineChunks.size - 1;
            var prevChunkChars = prevLineChunks.last();
            var prevChar = prevChunkChars.length;
  
            return state.update('cursor', cursor =>
              cursor
                .set(CURSOR.PARAGRAPH, prevParagraph)
                .set(CURSOR.LINE, prevLine)
                .set(CURSOR.CHUNK, prevChunk)
                .set(CURSOR.CHAR, prevChar)
            )
          }
          return state;

      }

    default:
      return state;
  }
}

module.exports = reducers;