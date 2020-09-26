import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import _ from 'lodash';

import Scene from './Scene';
import { ipcRenderer } from 'electron';
import { createWingObjects } from '../wing3d';
import { createInflatableObjects } from '../inflatable3d';
import { createBridleObject } from '../bridle3d';
import { convertBridle } from '../bridle';
import WingEditor from  './WingEditor';
import BridleEditor from  './BridleEditor';
import SheetView from  './SheetView';
import Input from './Input';
import actions from '../actions';

class AppComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = { topSkin: true, bottomSkin: true };
        _.bindAll(this, 'applyChanges');
    }

    applyChanges() {
        let objects;
        const wing = this.props.wingDefinition;

        if (this.props.mode === 'ram') {
            const bridle = this.props.bridleDefinition;
            const { topSkin, bottomSkin } = createWingObjects(wing); //TODO: shoud not be done on bridle-only changes.also convert strings...
            const bridleLines = createBridleObject(wing, convertBridle(bridle)).lines;
            objects = [ topSkin, bottomSkin, ...bridleLines ];
        } else {
            const { leSkin, canopySkin } = createInflatableObjects(wing);
            objects = [ leSkin, canopySkin ];
        }

        this.setState({ objects });
    }

    render() {
        let { wingDefinition, bridleDefinition, sheetSvgs, mode } = this.props;
        let { bottomSkin, topSkin, objects } = this.state;
        objects = objects && objects.filter(({ name }) => ((name !== 'bottomSkin' || bottomSkin) && (name !== 'topSkin' || topSkin)) );
        const ram = mode === 'ram';

        return (
            <div className='main'>
                <button onClick={ actions.openKite }> Open... </button>
                { wingDefinition && <button onClick={ actions.saveKite }> Save... </button> }
                { wingDefinition && ram && <button onClick={ actions.exportToXFLR5 }> Export XFLR5 design... </button> }
                { wingDefinition ? <button onClick={ actions.createSheets }> { "Generate sheets" } </button> : null }
                { wingDefinition && <button onClick={ this.applyChanges }> Apply changes </button> }
                <WingEditor mode={ mode } wingDefinition={ wingDefinition }/>
                { ram ? (
                      <React.Fragment>
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
                      </React.Fragment>
                ) : null }
                <Scene objects={ objects } />
                <SheetView { ...{ sheetSvgs } }/>
            </div>
        );
    }
};

let selectWing = ({ wing } = {}) => { return wing; };
let selectBridle = ({ bridle } = {}) => { return bridle; };
let selectMode = ({ mode } = {}) => { return mode; };
const selectSheets = ({ sheetSvgs } = {}) => sheetSvgs;

const App = connect(createSelector(selectMode, selectWing, selectBridle, selectSheets, (mode, wing, bridle, sheetSvgs) => {
    if (!wing) { return {}};
    return { mode, wingDefinition: wing, bridleDefinition: bridle, sheetSvgs }
}))(AppComponent);

export default App;
