import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import store from './store';
import Doxx from './components/Doxx';


ReactDOM.render(
  <Provider store={store}>
    <Doxx />
  </Provider>,
  document.getElementById('app')
);