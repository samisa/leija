
import React from 'react';
import _ from 'lodash';

import Input from './Input';

import actions from '../actions';

const INPUTS = ['mainLineLength', 'barLength', 'towPoint', 'wingLineLength', 'b3NodeZDist', 'b2LineLength'];
//const WINGCONNECTIONINPUTS = {'wingConnections' : { 'xPos' } };

class BridleEditor extends React.Component {
    constructor(props) {
        super(props);
        _.bindAll(this, 'inputHandler');
    }

    inputHandler(input) {
        let that = this;
        return (value) => {
            const newState = _.clone(that.props.bridleDefinition);
            newState[input] = value;
            actions.updateBridle(newState);
        };
    }

    render() {
        let { bridleDefinition } = this.props;

        return (
            <div className='bridle-params-editor'>
                {
                    bridleDefinition ? _.map(INPUTS, (input) => {
                        return (<Input handleOnChange={ this.inputHandler(input) } label={ input } value={ bridleDefinition[input] }/>);
                    }) : null
                }
                {
                    bridleDefinition ? _.map(bridleDefinition.wingConnections, (wcDef) => {
                        //////////////.............
                    }) : null
                }


                { bridleDefinition && <button onClick={ this.applyChanges }> Apply changes </button> }
            </div>
        );
    }
};

export default BridleEditor;


// 2   export to xflr 5 format.  json format should not have absolute paths to profel file, but assum file in same folder... 
