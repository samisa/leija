import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import Scene from './Scene';
import { ipcRenderer } from 'electron';
import { createWingObjects } from '../wing3d';
import { createBridleObject } from '../bridle3d';
import WingEditor from  './WingEditor';
import BridleEditor from  './BridleEditor';
import Input from './Input';
import actions from '../actions';

class AppComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = { topSkin: true, bottomSkin: true };
    }

    render() {
        let { objects, wingDefinition, bridleDefinition } = this.props;
        const { bottomSkin, topSkin } = this.state; console.log(this.state);
        objects = objects && objects.filter(({ name }) => ((name !== 'bottomSkin' || bottomSkin) && (name !== 'topSkin' || topSkin)) );

        return (
            <div className='main'>
                { wingDefinition ? <button onClick={ actions.createSheets }> { "Generate sheets" } </button> : null }
                <WingEditor wingDefinition={ wingDefinition }/>
                <BridleEditor bridleDefinition={ bridleDefinition }/>
                <Input type={"boolean"}
                       label={ 'Top skin' }
                       value={ topSkin }
                       handleOnChange={ (val) => this.setState({ topSkin: val }) }
                />
                <Input type={"boolean"}
                       label={ 'Bottom skin' }
                       value={ bottomSkin }
                       handleOnChange={ (val) => this.setState({ bottomSkin: val }) }
                />

                <Scene objects={ objects } />
            </div>
        );
    }
};

let selectWing = ({ wing } = {}) => { return wing; };
let selectBridle = ({ bridle } = {}) => { return bridle; };

const App = connect(createSelector(selectWing, selectBridle, (wing, bridle) => {
    if (!wing) { return {}};
    const { topSkin, bottomSkin } = createWingObjects(wing); //TODO: shoud not be done on bridle-only changes
    const bridleLines = createBridleObject(wing, bridle).lines;
    const objects = [ topSkin, bottomSkin, ...bridleLines ];
    return { objects, wingDefinition: wing, bridleDefinition: bridle }
}))(AppComponent);

export default App;
