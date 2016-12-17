
import React from 'react';
import _ from 'lodash';

import Input from './Input';

import actions from '../actions';

const INPUTS = ['mainLineLength', 'barLength', 'towPoint', 'wingLineLength'];
//const WINGCONNECTIONINPUTS = {'wingConnections' : { 'xPos' } };

const BridleEditor = React.createClass({
    getInitialState: function() {
        return {};
    },

    inputHandler: function(input) {
        let that = this;
        return (evt) => {
            that.state.bridleDefinition[input] = evt.target.value;
            that.setState(that.state);
        };
    },

    componentWillReceiveProps: function(newProps) {
        this.setState({ bridleDefinition: _.clone(newProps.bridleDefinition) });
    },

    applyChanges: function() {
        actions.updateBridle(_.clone(this.state.bridleDefinition));
    },

    render: function() {
        let { bridleDefinition } = this.state;

        return (
            <div className='bridle-params-editor'>
                {
                    bridleDefinition ? _.map(INPUTS, (input) => {
                        return <Input handleOnChange={ this.inputHandler(input) } value={ bridleDefinition[input] }/>;
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
});

export default BridleEditor;
