import React from 'react';
import Scene from './Scene';
import { ipcRenderer } from 'electron';
import { createMesh } from '../wing3d';
import { createBridleObject } from '../bridle3d';
import WingEditor from  './WingEditor';

const App = React.createClass({
    getInitialState: function() { return {}; },

    componentDidMount: function() {
        var that = this;
        console.log('mounted');
        ipcRenderer.on('wingData' , function(event , wing) {
            console.log('received data');
            that.updateWingParams(wing);
        });
    },

    updateWingParams: function(wing) {
        let wingObject = createMesh(wing);
        let bridle = createBridleObject({}, wing);
        this.setState({ wingObject: { threeObject: wingObject, wingDefinition: wing }, bridleObject: bridle });
    },

    handleWingParamsChanged: function(newWingDefinition) {
        this.updateWingParams(newWingDefinition);
    },

    render: function() {
        let { wingObject, bridleObject } = this.state;

        return (
            <div className='main'>
                <WingEditor wingDefinition={ wingObject && wingObject.wingDefinition } handleApplyChanges={ this.handleWingParamsChanged }/>
                <Scene wingObject={ wingObject && wingObject.threeObject } bridleObject={ bridleObject } />
            </div>
        );
    }
});

export default App;
