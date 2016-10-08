import React from 'react';
import Scene from './Scene';
import { ipcRenderer } from 'electron';
import { createMesh } from '../wing3d';
import WingEditor from  './WingEditor';

const App = React.createClass({
    getInitialState: function() { return {}; },

    componentDidMount: function() {
        var that = this;
        console.log('mounted');
        ipcRenderer.on('wingData' , function(event , wing) {
            console.log('received data');
            let wingObject = createMesh(wing);
            that.setState({ wingObject: { threeObject: wingObject, params: wing.sections } });
        });
    },

    render: function() {
        let { wingObject } = this.state;

        return (
            <div className='main'>
                <WingEditor wingObject={ wingObject } />
                <Scene wingObject={ wingObject } />
            </div>
        );
    }
});

export default App;
