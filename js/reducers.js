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
      function splitAt(_state, locationGetter) {
        // line: ['x', 'y', 'breakfast', 'z', 'w']
        // location: [... 2, 5]
        // ->line: ['x', 'y', 'break', 'fast', 'z', 'w']

        const location = locationGetter(_state);

        function updateLocation(oldLocation) {
          const needsUpdate = (
            oldLocation.slice(0, CURSOR.CHUNK).equals(location.slice(0, CURSOR.CHUNK)) &&
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
            content.updateIn(location.slice(0, CURSOR.CHUNK), line => {
              const chunkIdx = location.get(CURSOR.CHUNK);
              const chunk = line.get(chunkIdx);
              const charIdx = location.get(CURSOR.CHAR);
              return line.slice(0, chunkIdx).concat(
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
          // .update('style', style =>
          //   style.setIn(current(CURSOR.CHUNK), style)
          // )
          ;
      }

      // TODO: Make this work for selections that span chunks/lines/paras/etc
      function applyStyle(_state, _style) {
        return _state
          .update('style', style =>
            style.setIn(_state.getIn(['selection', 'start']).slice(0, CURSOR.CHAR), _style)
          );
      }

      const selectionStart = _state => _state.getIn(['selection', 'start']);
      const selectionEnd = _state => _state.getIn(['selection', 'end']);
      const style = action.payload;

      // Split the chunk where selection.start is on selection.start & update selection.start & cursor
      // Split the chunk where selection.end is on selection.end & update selection.end & cursor
      // Apply action.payload's style to chunks covered by selection
      return applyStyle(splitAt(splitAt(state, selectionStart), selectionEnd), style);

    default:
      return state;
  }
}

module.exports = reducers;