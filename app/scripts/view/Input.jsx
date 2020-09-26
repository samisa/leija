import React from 'react';
import _ from 'lodash';



export default class Input extends React.Component {
    
    constructor(props) {
        super(props);
        _.bindAll(this, 'renderTextInput', 'renderInput');
    }

    renderTextInput() {
        <input type="text"
               value={ value }
               onChange={ handleOnChange }
        />
    }

    renderInput() {
        const { value, handleOnChange, type='text' } = this.props

        switch(type) {
            case 'text':
                return <input type="text"
                              value={ value }
                              onChange={ (evt) => handleOnChange(evt.target.value) }
                />;
            case 'number':
                return <input type="number"
                              value={ value }
                              onChange={ (evt) => handleOnChange(parseFloat(evt.target.value)) }
                />;
            case 'boolean':
                return <input type="checkbox"
                              checked={ value }
                              onChange={ (evt) => handleOnChange(evt.target.checked) }
                />;
        }
    }

    /* handleOnChange: function(evt) {
       if (this.props.type == 'float' && window.isNaN(evt.target.value)) {
       ///Number input specific...
       this.setState({ value: this.state.value });
       return;
       }

       this.props.valueChanged ?
       this.props.valueChanged(evt.target.value) :
       this.setState({ value: evt.target.value });
       },
     */
    render() {
        const { label } = this.props
        return (
            <div className='input-wrapper'>
                { label ? (<span> { label } </span>) : null }
                { this.renderInput() }
            </div>
        );

    }
};
