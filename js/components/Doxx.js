import React from 'react';
import { connect } from 'react-redux';
import { List } from 'immutable';
import { pressKey, typeCharacter, reflowLine } from '../actions';
import Cursor from './Cursor';


const escapeSpace = ch => ch === ' ' ? '\u00a0' : ch;

class Doxx extends React.Component {
  componentWillMount() {
    document.onkeydown = evt => {
      this.props.pressKey(evt.keyCode);
    };
    document.onkeypress = evt => {
      if (evt.keyCode === 13) return;
      this.props.typeCharacter(escapeSpace(String.fromCharCode(evt.keyCode)));
      evt.preventDefault();
    };
  }

  componentDidUpdate() {
    const { cursor } = this.props.document.toObject();
    console.log(cursor.toJS());
    const paras = document.getElementsByClassName('para');
    if (!paras.length) return;
    const para = paras[cursor.get(2)];
    const lines = para.getElementsByClassName('line');
    if (!lines.length) return;
    const line = lines[cursor.get(3)];
    const chunks = line.getElementsByClassName('chunk');
    if (!chunks.length) return;
    this.props.reflowLine(List(chunks).map(chunk => ({left: chunk.offsetLeft, right: chunk.offsetLeft + chunk.offsetWidth})));
  }

  render() {
    const { content, cursor } = this.props.document.toObject();
    const cursorAt = location =>
      cursor.slice(0, location.length).equals(List(location));

    const measureText = text => {
      var measureText = document.getElementById('measure-text');
      measureText.textContent = text;
      return measureText.offsetWidth;
    };

    return (
      <div>
        <div id="ruler">
          <div className="ruler-inner">
          </div>
        </div>
        <div id="doc">
          {content.map((page, pageIdx) =>
            <div key={pageIdx} className="page">
              <div className="content">
                {page.map((column, colIdx) =>
                  column.map((paragraph, paraIdx) =>
                    <div key={paraIdx} className="para">
                      {paragraph.map((line, lineIdx) =>
                        <div key={lineIdx} className="line">
                          {line.map((chunk, chunkIdx) =>
                            <span key={chunkIdx} className="chunk" style={{position: 'relative'}}>
                              {chunk}
                              {cursorAt([pageIdx, colIdx, paraIdx, lineIdx, chunkIdx]) && (
                                <Cursor left={measureText(chunk.substr(0, cursor.last()))} />
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
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    document: state.document,
  };
}

export default connect(mapStateToProps, { pressKey, typeCharacter, reflowLine }) (Doxx);
