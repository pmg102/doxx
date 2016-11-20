var immutable = require('immutable');
var fromJS = immutable.fromJS;
var List = immutable.List;

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
  style: {}
});

function document(state, action) {
  if (state === undefined) {
    state = DEFAULT_STATE;
  }

  var cursor = state.get('cursor');
  var content = state.get('content');

  function current(cursorDepth) {
    return cursor.slice(0, cursorDepth + 1);
  }
  function currentBut(cursorDepth, value) {
    return cursor.slice(0, cursorDepth).push(value);
  }

  function jumpTo(jumpSpec) {
    return state.update('cursor', cursor =>
      cursor.slice(0, cursor.size - jumpSpec.length).concat(jumpSpec)
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

  function back(tree, _cursor) {
    const cursorDepth = 6 - _cursor.size;

    const curCursor = _cursor.get(0);
    if (_cursor.size === 1) {
      if (curCursor === 0) throw 'No more chars to delete!';
      if (curCursor === -1) {
        return [
          tree.slice(0, -1),
          List.of(-1)
        ];
      }
      return [
        tree.substr(0, curCursor - 1) + tree.substr(curCursor),
        List.of(curCursor - 1)
      ];
    }
    else {
      try {
        if (curCursor === -1) {
          if (tree.size < 1) throw 'No more chunks to delete!';
          const [subTree, subCursor] = back(tree.get(tree.size - 1), _cursor.slice(1));
          return [
            tree.slice(0, -1).push(subTree),
            subCursor.unshift(curCursor),
          ];
        }

        if (cursorDepth <= CURSOR.PARAGRAPH && _cursor.slice(1).every(each => each === 0) && curCursor > 0) {
          return [
            tree.slice(0, curCursor - 1).push(
              tree.get(curCursor - 1).slice(0, -1).push(
                tree.get(curCursor - 1).get(-1).concat(tree.get(curCursor).get(0))
              ).concat(tree.get(curCursor).slice(1))
            ).concat(tree.slice(curCursor + 1)),
            _cursor
              .update(0, cur => cur - 1)
              .set(1, tree.get(curCursor - 1).size - 1)
              .set(2, tree.get(curCursor - 1).get(-1).size - 1)
              .set(3, tree.get(curCursor - 1).get(-1).get(-1).length)
          ];
        }


        const [subTree, subCursor] = back(tree.get(curCursor), _cursor.slice(1));
        return [
          tree.slice(0, curCursor).push(subTree).concat(tree.slice(curCursor + 1)),
          subCursor.unshift(curCursor),
        ];
      }
      catch (Error) {
        if (curCursor < 1) throw 'No more chunks to delete!';
        const [subTree, subCursor] = back(tree.get(curCursor - 1), List(Array(_cursor.size - 1).fill(-1)));
        return [
          tree.slice(0, curCursor - 1).push(subTree).concat(tree.slice(curCursor)),
          _cursor,
        ];
      }
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
          try {
            const [_content, _cursor] = back(content, cursor);
            return state.merge({content: _content, cursor: _cursor});
          }
          catch (err) {
            if (err === 'No more chars to delete!' || err === 'No more chunks to delete!') {
              return state;
            }
            throw err;
          }

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
                  chunks => chunks.take(cursor.get(CURSOR.CHUNK) + 1)
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

        default:
          return state;
      }

    case actions.SET_CURSOR:
      return state.set('cursor', fromJS(action.payload));

    case actions.MAKE_SELECTION:
      return state.set('selection', fromJS(action.payload));

    case actions.APPLY_STYLE:
      function splitAt(locationGetter, _state) {
        // line: ['x', 'y', 'breakfast', 'z', 'w']
        // location: [... 2, 5]
        // ->line: ['x', 'y', 'break', 'fast', 'z', 'w']

        const location = locationGetter(_state);

        function updateLocation(oldLocation) {
          const needsUpdate = (
            oldLocation.take(CURSOR.CHUNK).equals(location.take(CURSOR.CHUNK)) &&
            oldLocation.get(CURSOR.CHAR) >= location.get(CURSOR.CHAR)
          );

          return needsUpdate
            ? oldLocation
              .update(CURSOR.CHUNK, chunk => chunk + 1)
              .update(CURSOR.CHAR, ch => ch - location.get(CURSOR.CHAR))
            : oldLocation;
        }

        return _state
          .update('content', content =>
            content.updateIn(location.take(CURSOR.CHUNK), line => {
              const chunkIdx = location.get(CURSOR.CHUNK);
              const chunk = line.get(chunkIdx);
              const charIdx = location.get(CURSOR.CHAR);
              return line.take(chunkIdx).concat(
                  List.of(chunk.slice(0, charIdx), chunk.slice(charIdx))
                ).concat(
                  line.slice(chunkIdx + 1)
                );
            })
          )
          .update('cursor', updateLocation)
          .update('selection', selection =>
            selection
              .update('start', start => start && updateLocation(start))
              .update('end', end => end && updateLocation(end))
          )
          // TODO: when a chunk is split, corresponding style metadata must be duplicated
          // .update('style', style =>
          //   style.setIn(current(CURSOR.CHUNK), style)
          // )
          ;
      }

      function applyStyleFromTo(_state, style, start, end, cursor=List()) {
        const content = _state.getIn(cursor.unshift('content'));
        if (List.isList(content)) {
          return content.reduce(
            (__state, value, key) => {
              if ((start && (key < start.first())) || (end && (key > end.first()))) {
                return __state;
              }

              const _start = start && key === start.first() ? start.rest() : undefined;
              const _end = end && key === end.first() ? end.rest() : undefined;
              return applyStyleFromTo(__state, style, _start, _end, cursor.push(key));
            },
            _state
          );
        } else {
          if (end && end.first() === 0) return _state;
          return _state.setIn(cursor.unshift('style'), style);
        }
      }

      function applyStyle(_style, _state) {
        return applyStyleFromTo(
          _state,
          _style,
          _state.getIn(['selection', 'start']),
          _state.getIn(['selection', 'end'])
        );
      }

      const selectionStart = _state => _state.getIn(['selection', 'start']);
      const selectionEnd = _state => _state.getIn(['selection', 'end']);
      const style = action.payload;

      return applyStyle(style, splitAt(selectionEnd, splitAt(selectionStart, state)));

    default:
      return state;
  }
}

module.exports = {
  document
};
