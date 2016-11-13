import React from 'react';
import { connect } from 'react-redux';
import { List } from 'immutable';
import { pressKey, typeCharacter } from '../actions';
import Cursor from './Cursor';


const escapeSpace = ch => ch === ' ' ? '\u00a0' : ch;

class Doxx extends React.Component {
  componentWillMount() {
    document.onkeydown = evt => {
      this.props.pressKey(evt.keyCode);
    };
    document.onkeypress = evt => {
      this.props.typeCharacter(escapeSpace(String.fromCharCode(evt.keyCode)));
      evt.preventDefault();
    };
  }

  render() {
    const { content, cursor } = this.props.document.toObject();
    const cursorAt = location =>
      cursor.slice(0, location.length).equals(List(location));

    return (
      <div>
        {content.map((page, pageIdx) =>
          <div className="page">
            <div className="content">
              {page.map((column, colIdx) =>
                column.map((paragraph, paraIdx) => 
                  <div className="para">
                    {paragraph.map((line, lineIdx) =>
                      <div className="line">
                        {line.map((chunk, chunkIdx) =>
                          <span className="chunk" style={{position: 'relative'}}>
                            {chunk}
                            {cursorAt([pageIdx, colIdx, paraIdx, lineIdx, chunkIdx]) && (
                              <Cursor right={0} />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    document: state.document,
  };
}

export default connect(mapStateToProps, { pressKey, typeCharacter }) (Doxx);
