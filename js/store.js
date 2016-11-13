import { createStore, applyMiddleware, compose } from 'redux';
import { combineReducers } from 'redux';
// import thunk from 'redux-thunk';
// import { browserHistory } from 'react-router';
// import { syncHistory } from 'react-router-redux';
// import { apiMiddleware } from 'redux-api-middleware';
import * as reducers from './reducers';
// import actionChain from '^/middleware/actionChain';
// import navigation from '^/middleware/navigation';
// import authentication from '^/middleware/authentication';

// const reduxRouterMiddleware = syncHistory(browserHistory);

// const finalCreateStore = compose(
//   applyMiddleware(
//     thunk,
//     apiMiddleware,
//     authentication,
//     navigation,
//     reduxRouterMiddleware,
//     actionChain //This item MUST be last in the queue
//   )
// )(createStore);

const store = createStore(combineReducers(reducers));

export default store;
