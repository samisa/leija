import * as THREE from 'three';
import React from 'react';
import ReactDOM from 'react-dom';

import App from './App';
import state from '../state';

state.init();
//setTimeout(() => {
ReactDOM.render(state.reactProvide(<App/>), document.getElementById('container'));
//},1000);
