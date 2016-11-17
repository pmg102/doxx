var actions = require('../js/actions');
var pressKey = actions.pressKey;
var typeCharacter = actions.typeCharacter;
var setCursor = actions.setCursor;
var makeSelection = actions.makeSelection;
var applyStyle = actions.applyStyle;
var KEYS = require('../js/keys');
var STYLES = require('../js/styles');
var reducers = require('../js/reducers').document;

var immutable = require('immutable');
var fromJS = immutable.fromJS;
var List = immutable.List;

var expect = require('chai').expect;


describe('Doxx', function() {

  function makeCursor(cursor) {
    return List([0, 0]).concat(cursor);
  }

  function model(paragraphs, cursor, selection, style) {
    return fromJS({
      content: [[paragraphs]],
      cursor: makeCursor(cursor),
      selection: selection || {},
      style: style || {},
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
    expectChange(model([[['Good', ' morning']]], [0, 0, 1, 0]), pressKey(KEYS.BACKSPACE),
      model([[['Goo', ' morning']]], [0, 0, 1, 0]));
    // expectChange(model([[['Good ', 'mor']], [['ning', ' Vietnam']]], [1, 0, 0, 0]), pressKey(KEYS.BACKSPACE),
    //   model([[['Good ', 'morning', ' Vietnam']]], [0, 0, 1, 3]));
  });

  it('should insert paragraph break on enter', function() {
    expectChange(model([[['']]], [0, 0, 0, 0]), pressKey(KEYS.ENTER), model([[['']], [['']]], [1, 0, 0, 0]));
    expectChange(model([[['foo']]], [0, 0, 0, 3]), pressKey(KEYS.ENTER), model([[['foo']], [['']]], [1, 0, 0, 0]));
    expectChange(model([[['catfish']]], [0, 0, 0, 3]), pressKey(KEYS.ENTER), model([[['cat']], [['fish']]], [1, 0, 0, 0]));
    expectChange(model([[['Good ', 'morning', ' Vietnam']]], [0, 0, 1, 3]), pressKey(KEYS.ENTER),
      model([[['Good ', 'mor']], [['ning', ' Vietnam']]], [1, 0, 0, 0]));
  });

  function expectCursorChange(paragraphs, initialCursor, action, expectedCursor) {
    expectChange(model(paragraphs, initialCursor), action, model(paragraphs, expectedCursor));
  }

  describe('cursor moves forward and back over chars and chunk/line/paragraphs', () => {
    const FIXTURES = [
      {paragraphs: [[['foo']]], before: [0, 0, 0, 3], after: [0, 0, 0, 2]},
      {paragraphs: [[['chunk1', 'chunk2']]], before: [0, 0, 1, 0], after: [0, 0, 0, 6]},
      {paragraphs: [[['chunk1', 'chunk2'], ['line2']]], before: [0, 1, 0, 0], after: [0, 0, 1, 6]},
      {paragraphs: [[['p1line1'], ['p1line2chunk1', 'p1line2chunk2']], [['para2']]], before: [1, 0, 0, 0], after: [0, 1, 1, 13]},
    ];

    it('should move back on left arrow', function() {
      FIXTURES.forEach(spec =>
        expectCursorChange(spec.paragraphs, spec.before, pressKey(KEYS.LEFT_ARROW), spec.after)
      );
    });

    it('should not move back/forward if at start/end of doc', function() {
      expectCursorChange([[['foo']]], [0, 0, 0, 0], pressKey(KEYS.LEFT_ARROW), [0, 0, 0, 0]);
      expectCursorChange([[['foo']]], [0, 0, 0, 3], pressKey(KEYS.RIGHT_ARROW), [0, 0, 0, 3]);
    });

    it('should move forward on right arrow', function() {
      FIXTURES.forEach(spec =>
        expectCursorChange(spec.paragraphs, spec.after, pressKey(KEYS.RIGHT_ARROW), spec.before)
      );
    });
  });

  it('moves the cursor', () => {
    expectCursorChange([[['foo']]], [0, 0, 0, 0], setCursor(makeCursor([0, 0, 0, 2])), [0, 0, 0, 2]);
  });

  function expectSelectionChange(paragraphs, initialSelection, action, expectedSelection) {
    expectChange(model(paragraphs, [0, 0, 0, 0], initialSelection),
      action, model(paragraphs, [0, 0, 0, 0], expectedSelection));
  }

  it('selects text', () => {
    expectSelectionChange([[['Good morning Vietnam']]],
      {},
      makeSelection(makeCursor([0, 0, 0, 5]), makeCursor([0, 0, 0, 12])),
      {start: makeCursor([0, 0, 0, 5]), end: makeCursor([0, 0, 0, 12])}
    );
  });

  it('applies style to selection', () => {
    expectChange(
      model([[['Good morning Vietnam']]],
        [0, 0, 0, 12],
        {start: [0, 0, 0, 0, 0, 5], end: [0, 0, 0, 0, 0, 12]}),
      applyStyle({[STYLES.BOLD]: true}),
      model([[['Good ', 'morning', ' Vietnam']]],
        [0, 0, 2, 0],
        {start: [0, 0, 0, 0, 1, 0], end: [0, 0, 0, 0, 2, 0]},
        {0:{0:{0:{0:{1:{[STYLES.BOLD]: true}}}}}})
    );
  });

  it('applies style to selection spanning paras, lines and chunks', () => {
    expectChange(
      model(
        [
          [
            ['p1l1chunk1'],
            ['p1l2chunk1', 'p1l2chunk2', 'p1l2chunk3'],
            ['p1l3chunk1', 'p1l3chunk2'],
          ],
          [
            ['p2l1chunk1', 'p2l1chunk2'],
            ['p2l2chunk1', 'p2l2chunk2'],
          ],
          [
            ['p3l1chunk1', 'p3l1chunk2'],
            ['p3l2chunk1', 'p3l2chunk2', 'p3l2chunk3'],
            ['p3l3chunk1'],
          ],
        ],
        [2, 1, 1, 4],
        {start: [0, 0, 0, 1, 1, 4], end: [0, 0, 2, 1, 1, 4]}
      ),
      applyStyle({[STYLES.BOLD]: true}),
      model(
        [
          [
            ['p1l1chunk1'],
            ['p1l2chunk1', 'p1l2', 'chunk2', 'p1l2chunk3'],
            ['p1l3chunk1', 'p1l3chunk2'],
          ],
          [
            ['p2l1chunk1', 'p2l1chunk2'],
            ['p2l2chunk1', 'p2l2chunk2'],
          ],
          [
            ['p3l1chunk1', 'p3l1chunk2'],
            ['p3l2chunk1', 'p3l2', 'chunk2', 'p3l2chunk3'],
            ['p3l3chunk1'],
          ],
        ],
        [2, 1, 2, 0],
        {start: [0, 0, 0, 1, 2, 0], end: [0, 0, 2, 1, 2, 0]},
        {
          0:{
            0:{
              0:{ // para
                1:{ // LINE
                  2:{[STYLES.BOLD]: true},
                  3:{[STYLES.BOLD]: true},
                },
                2:{ // LINE
                  0:{[STYLES.BOLD]: true},
                  1:{[STYLES.BOLD]: true},
                },
              },
              1:{ // para
                0:{ // LINE
                  0:{[STYLES.BOLD]: true},
                  1:{[STYLES.BOLD]: true},
                },
                1:{ // LINE
                  0:{[STYLES.BOLD]: true},
                  1:{[STYLES.BOLD]: true},
                },
              },
              2:{ // para
                0:{ // LINE
                  0:{[STYLES.BOLD]: true},
                  1:{[STYLES.BOLD]: true},
                },
                1:{ // LINE
                  0:{[STYLES.BOLD]: true},
                  1:{[STYLES.BOLD]: true},
                },
              },
            },
          },
        }
      )
    );
  });

});