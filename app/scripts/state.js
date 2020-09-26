import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { Provider } from 'react-redux';
import React from 'react';

var store;

let root = (state = {}, action) => {
    switch(action.type) {
    case 'SET_MODE':
        return Object.assign({}, state, { mode: action.mode });
    case 'SET_WING_PARAMS':
        return Object.assign({}, state, { wing: action.wing });
    case 'SET_BRIDLE_PARAMS':
        return Object.assign({}, state, { bridle: action.bridle });
    case 'SHOW_SHEETS':
        return Object.assign({}, state, { sheetSvgs: action.svgs });
    default:
        return state;
    }
};

function init() {
    if (store) { throw "store already initialized"; }
    store = createStore(root, applyMiddleware(thunk));
};

function actionCreator(f) {
    return function() {
        return store.dispatch(f.apply(this, arguments));
    };
}

export default {
    init,
    getState: () => { return store.getState(); },
    actionCreator,
    subscribe: () => { return store.subscribe().call(arguments); },
    reactProvide: (child) => {
        if (!store) { throw "store not initialized"; }
        return <Provider store={store}>{ child }</Provider>;
    }
};
