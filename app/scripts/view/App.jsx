import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import Scene from './Scene';
import { ipcRenderer } from 'electron';
import { createMesh } from '../wing3d';
import { createBridleObject } from '../bridle3d';
import WingEditor from  './WingEditor';
import actions from '../actions';

let App = React.createClass({
    render: function() {
        let { wingObject, wingDefinition, bridleObject } = this.props;

        return (
            <div className='main'>
                <button onClick={ actions.createSheets }> "Generate sheets" </button> 
                <WingEditor wingDefinition={ wingDefinition }/>
                <Scene wingObject={ wingObject } bridleObject={ bridleObject } />
            </div>
        );
    }
});

let selectWing = ({ wing } = {}) => { return wing; };
App = connect(createSelector(selectWing, (wing) => {
    if (!wing) { return {}};
    let wingObject = createMesh(wing);
    let bridle = createBridleObject({}, wing);
    return { wingObject, wingDefinition: wing , bridleObject: bridle }
}))(App);

export default App;
