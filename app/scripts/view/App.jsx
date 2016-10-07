import React from 'react';
import Scene from './Scene';
import { ipcRenderer } from 'electron';
import { createMesh } from '../wing3d';

const App = React.createClass({
    getInitialState: function() { return {}; },

    componentDidMount: function() {
        var that = this;
        console.log('mounted');
        ipcRenderer.on('wingData' , function(event , data) {
            console.log('received data');
            let mesh = createMesh(data.data);
            that.setState({ wingObject: mesh });
        });
    },

    render: function() {
        let { wingObject } = this.state;

        return (
            <div className='main'>
                <Scene wingObject={ wingObject } />
            </div>
        );
    }
});

export default App;
