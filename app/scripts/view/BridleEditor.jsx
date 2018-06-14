
import React from 'react';
import _ from 'lodash';

import Input from './Input';

import actions from '../actions';

const INPUTS = ['mainLineLength', 'barLength', 'towPoint', 'wingLineLength'];
//const WINGCONNECTIONINPUTS = {'wingConnections' : { 'xPos' } };

class BridleEditor extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        _.bindAll(this, 'applyChanges', 'inputHandler');
    }

    inputHandler(input) {
        let that = this;
        return (evt) => {
            that.state.bridleDefinition[input] = evt.target.value;
            that.setState(that.state);
        };
    }

    componentWillReceiveProps(newProps) {
        this.setState({ bridleDefinition: _.clone(newProps.bridleDefinition) });
    }

    applyChanges() {
        actions.updateBridle(_.clone(this.state.bridleDefinition));
    }

    render() {
        let { bridleDefinition } = this.state;

        return (
            <div className='bridle-params-editor'>
                {
                    bridleDefinition ? _.map(INPUTS, (input) => {
                        return (
                            <label>
                              { input }
                              <Input handleOnChange={ this.inputHandler(input) } value={ bridleDefinition[input] }/>
                            </label>);
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
