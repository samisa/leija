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
            let wingObject = createMesh(wing);
            let bridle = createBridleObject({}, wing);
            that.setState({ wingObject: { threeObject: wingObject, params: wing.sections }, bridleObject: bridle });
        });
    },

    render: function() {
        let { wingObject, bridleObject } = this.state;

        return (
            <div className='main'>
                <WingEditor wingObject={ wingObject } />
                <Scene wingObject={ wingObject } bridleObject={ bridleObject } />
            </div>
        );
    }
});

export default App;
