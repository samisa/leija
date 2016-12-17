import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import Scene from './Scene';
import { ipcRenderer } from 'electron';
import { createMesh } from '../wing3d';
import { createBridleObject } from '../bridle3d';
import WingEditor from  './WingEditor';
import BridleEditor from  './BridleEditor';
import actions from '../actions';

let App = React.createClass({
    render: function() {
        let { wingObject, wingDefinition, bridleObject, bridleDefinition } = this.props;

        return (
            <div className='main'>
                { wingDefinition ? <button onClick={ actions.createSheets }> { "Generate sheets" } </button> : null }
                <WingEditor wingDefinition={ wingDefinition }/>
                <BridleEditor bridleDefinition={ bridleDefinition }/>
                <Scene wingObject={ wingObject } bridleObject={ bridleObject } />
            </div>
        );
    }
});

let selectWing = ({ wing } = {}) => { return wing; };
let selectBridle = ({ bridle } = {}) => { return bridle; };

App = connect(createSelector(selectWing, selectBridle, (wing, bridle) => {
    if (!wing) { return {}};
    let wingObject = createMesh(wing); //TODO: shoud not be done on bridle-only changes
    let bridleObject = createBridleObject(wing, bridle);
    return { wingObject, wingDefinition: wing , bridleObject, bridleDefinition: bridle }
}))(App);

export default App;
