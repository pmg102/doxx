var actions = require('../js/actions');
var pressKey = actions.pressKey;
var typeCharacter = actions.typeCharacter;
var KEYS = require('../js/keys');
var reducers = require('../js/reducers');

var immutable = require('immutable');
var fromJS = immutable.fromJS;
var List = immutable.List;

var expect = require('chai').expect;


describe('Doxx', function() {

  function model(paragraphs, cursor) {
    return fromJS({
      content: [[paragraphs]],
      cursor: List([0, 0]).concat(cursor),
      style: []
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