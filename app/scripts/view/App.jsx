import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import _ from 'lodash';

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
        _.bindAll(this, 'applyChanges');
    }

    applyChanges() {
        const wing = this.props.wingDefinition;
        const bridle = this.props.bridleDefinition;
        const { topSkin, bottomSkin } = createWingObjects(wing); //TODO: shoud not be done on bridle-only changes
        const bridleLines = createBridleObject(wing, bridle).lines;
        const objects = [ topSkin, bottomSkin, ...bridleLines ];
        this.setState({ objects });
    }

    render() {
        let { wingDefinition, bridleDefinition } = this.props;
        let { bottomSkin, topSkin, objects } = this.state;
        objects = objects && objects.filter(({ name }) => ((name !== 'bottomSkin' || bottomSkin) && (name !== 'topSkin' || topSkin)) );

        return (
            <div className='main'>
                <button onClick={ actions.openKite }> Open... </button>
                { wingDefinition && <button onClick={ actions.saveKite }> Save... </button> }
                { wingDefinition && <button onClick={ actions.exportToXFLR5 }> Export XFLR5 design... </button> }
                { wingDefinition ? <button onClick={ actions.createSheets }> { "Generate sheets" } </button> : null }
                { wingDefinition && <button onClick={ this.applyChanges }> Apply changes </button> }
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
    return { wingDefinition: wing, bridleDefinition: bridle }
}))(AppComponent);

export default App;
