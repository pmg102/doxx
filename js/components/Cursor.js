import React from 'react';
import { connect } from 'react-redux';


class Cursor extends React.Component {
  componentWillMount() {
    this.state = {
      visible: true,
      interval: setInterval(() => this.setState({visible: !this.state.visible}), 600)
    };
  }

  componentWillUnmount() {
    clearInterval(this.state.interval);
  }

  render() {
    const { content } = this.props.document.toObject();

    return (
      <div id="cursor" style={{
        visibility: this.state.visible ? 'visible' : 'hidden',
        left: this.props.left
      }}/>
    );
  }
}

function mapStateToProps(state) {
  return {
    document: state.document,
  };
}

export default connect(mapStateToProps) (Cursor);
