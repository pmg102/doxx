var actions = require('./actions');
var KEYS = actions.KEYS;

var immutable = require('immutable');
var fromJS = immutable.fromJS;

var DEFAULT_STATE = fromJS({
  pages: [
    { columns: [
      { style: { left:0, width:100 },
        paragraphs: [
        { lines: [
          { content:
            { textBlock:
              { chunks: [
                { style: {}, textContent: '' }
              ]}
            }
          }
        ]}
      ]}
    ]}
  ],
  cursor: {
    page: 0, column: 0, paragraph: 0, line: 0, chunk: 0, char: 0
  }
});

function reducers(state, action) {
  if (state === undefined) {
    state = DEFAULT_STATE;
  }

  var cursor = state.get('cursor').toJS();

  function getLines(paragraph) {
    if (paragraph === undefined) paragraph = cursor.paragraph;
    return state.getIn(['pages', cursor.page, 'columns', cursor.column, 'paragraphs', paragraph, 'lines']);
  }
  function getLineChunks(line) {
    if (line === undefined) line = cursor.line;
    return getLines().getIn([line, 'content', 'textBlock', 'chunks']);
  }
  function getChunkText(chunk) {
    if (chunk === undefined) chunk = cursor.chunk;
    return getLineChunks().getIn([chunk, 'textContent']);
  }
  function updateChunkText(updater) {
    return state.updateIn([
      'pages', cursor.page, 'columns', cursor.column, 'paragraphs', cursor.paragraph, 'lines', cursor.line, 'content', 'textBlock', 'chunks', cursor.chunk, 'textContent'
    ], updater);
  }

  switch (action.type) {
    case actions.TYPE_CHARACTER:
      var char = action.payload;
      return updateChunkText(textContent => textContent.substr(0, cursor.char) + char + textContent.substr(cursor.char))
        .updateIn(['cursor', 'char'], char => char + 1);

    case actions.PRESS_KEY:
      var keyCode = action.payload;
      switch (keyCode) {
        case KEYS.BACKSPACE:
          if (cursor.char > 0) {
            return updateChunkText(textContent => textContent.substr(0, cursor.char - 1) + textContent.substr(cursor.char))
              .updateIn(['cursor', 'char'], char => char - 1);
          }
          return state;

        case KEYS.ENTER:
          var textContent = getChunkText();
          var lineChunks = getLineChunks();

          return updateChunkText(textContent => textContent.substr(0, cursor.char))
            .updateIn(
              ['pages', cursor.page, 'columns', cursor.column, 'paragraphs', cursor.paragraph, 'lines', cursor.line, 'content', 'textBlock', 'chunks'],
              chunks => chunks.slice(0, cursor.chunk + 1)
            )
            .updateIn(
              ['pages', cursor.page, 'columns', cursor.column, 'paragraphs'],
              paragraphs => paragraphs.splice(cursor.paragraph + 1, 0, fromJS({
                lines: [
                  { content:
                    { textBlock:
                      { chunks: lineChunks.slice(cursor.chunk + 1).unshift(
                        { style: {}, textContent: textContent.substr(cursor.char) }
                      )}
                    }
                  }
                ]
              }))
            )
            .update('cursor', cursor =>
              cursor.update('paragraph', paragraph => paragraph + 1)
                .set('line', 0)
                .set('chunk', 0)
                .set('char', 0)
            );

        case KEYS.LEFT_ARROW:
          if (cursor.char > 0) {
            const prevChar = cursor.char - 1;
            return state.update('cursor', cursor =>
              cursor.set('char', prevChar)
            );
          }
          else if (cursor.chunk > 0) {
            const prevChunk = cursor.chunk - 1;
            return state.update('cursor', cursor =>
              cursor
                .set('chunk', prevChunk)
                .set('char', getChunkText(prevChunk).length)
            )
          }
          else if (cursor.line > 0) {
            const prevLine = cursor.line - 1;
            return state.update('cursor', cursor =>
              cursor
                .set('line', prevLine)
                .set('chunk', getLineChunks(prevLine).size - 1)
                .set('char', getLineChunks(prevLine).last().get('textContent').length)
            )
          }
          else if (cursor.paragraph > 0) {
            const prevParagraph = cursor.paragraph - 1;
            return state.update('cursor', cursor =>
              cursor
                .set('paragraph', prevParagraph)
                .set('line', getLines(prevParagraph).size - 1)
                .set('chunk', getLines(prevParagraph).last().getIn(['content', 'textBlock', 'chunks']).size - 1)
                .set('char', getLines(prevParagraph).last().getIn(['content', 'textBlock', 'chunks']).last().get('textContent').length)
            )
          }
          return state;

      }

    default:
      return state;
  }
}

module.exports = reducers;