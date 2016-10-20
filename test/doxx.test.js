var immutable = require('immutable');
var fromJS = immutable.fromJS;
var List = immutable.List;
var Map = immutable.Map;

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
    case TYPE_CHARACTER:
      var char = action.payload;
      return updateChunkText(textContent => textContent.substr(0, cursor.char) + char + textContent.substr(cursor.char))
        .updateIn(['cursor', 'char'], char => char + 1);

    case PRESS_KEY:
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

var expect = require('chai').expect;

describe('Doxx', function() {

  function model(paragraphs, cursor) {
    return fromJS({
      pages: [
        { columns: [
          { style: { left: 0, width: 100 },
            paragraphs: paragraphs.map(lines => (
              { lines: lines.map(chunks => (
                { content:
                  { textBlock:
                    { chunks: chunks.map(chunk => (
                      { style: {}, textContent: chunk }
                    ))}
                  }
                }
              ))}
            ))
          }
        ]}
      ],
      cursor: {
        page: 0, column: 0, paragraph: cursor[0], line: cursor[1], chunk: cursor[2], char: cursor[3]
      }
    });
  }

  function expectChange(initialState, action, expectedState) {
    var actualState = reducers(initialState, action);
    expect(actualState.toJS()).to.eql(expectedState.toJS());
  }

  it('should insert typed characters', function() {
    expectChange(model([[['']]], [0, 0, 0, 0]), typeCharacter('a'), model([[['a']]], [0, 0, 0, 1]));
    expectChange(model([[['b']]], [0, 0, 0, 0]), typeCharacter('a'), model([[['ab']]], [0, 0, 0, 1]));
    expectChange(model([[['b']]], [0, 0, 0, 1]), typeCharacter('a'), model([[['ba']]], [0, 0, 0, 2]));
  });

  it('should delete character on backspace', function() {
    expectChange(model([[['']]], [0, 0, 0, 0]), pressKey(KEYS.BACKSPACE), model([[['']]], [0, 0, 0, 0]));
    expectChange(model([[['a']]], [0, 0, 0, 0]), pressKey(KEYS.BACKSPACE), model([[['a']]], [0, 0, 0, 0]));
    expectChange(model([[['a']]], [0, 0, 0, 1]), pressKey(KEYS.BACKSPACE), model([[['']]], [0, 0, 0, 0]));
    expectChange(model([[['abc']]], [0, 0, 0, 2]), pressKey(KEYS.BACKSPACE), model([[['ac']]], [0, 0, 0, 1]));
  });

  it('should insert paragraph break on enter', function() {
    expectChange(model([[['']]], [0, 0, 0, 0]), pressKey(KEYS.ENTER), model([[['']], [['']]], [1, 0, 0, 0]));
    expectChange(model([[['foo']]], [0, 0, 0, 3]), pressKey(KEYS.ENTER), model([[['foo']], [['']]], [1, 0, 0, 0]));
    expectChange(model([[['catfish']]], [0, 0, 0, 3]), pressKey(KEYS.ENTER), model([[['cat']], [['fish']]], [1, 0, 0, 0]));
    expectChange(model([[['Good ', 'morning', ' Vietnam']]], [0, 0, 1, 3]), pressKey(KEYS.ENTER),
      model([[['Good ', 'mor']], [['ning', ' Vietnam']]], [1, 0, 0, 0]));
  });

  it('should move cursor on left arrow', function() {
    function expectCursorChange(paragraphs, initialCursor, action, expectedCursor) {
      expectChange(model(paragraphs, initialCursor), action, model(paragraphs, expectedCursor));
    }
    expectCursorChange([[['foo']]], [0, 0, 0, 0], pressKey(KEYS.LEFT_ARROW), [0, 0, 0, 0]);
    expectCursorChange([[['foo']]], [0, 0, 0, 3], pressKey(KEYS.LEFT_ARROW), [0, 0, 0, 2]);
    expectCursorChange([[['chunk1', 'chunk2']]], [0, 0, 1, 0], pressKey(KEYS.LEFT_ARROW), [0, 0, 0, 6]);
    expectCursorChange([[['chunk1', 'chunk2'], ['line2']]], [0, 1, 0, 0], pressKey(KEYS.LEFT_ARROW), [0, 0, 1, 6]);
    expectCursorChange([[['p1line1'], ['p1line2chunk1', 'p1line2chunk2']], [['para2']]],
      [1, 0, 0, 0], pressKey(KEYS.LEFT_ARROW), [0, 1, 1, 13]);
  });

  it('should move cursor on right arrow', function() {
  });
});