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
                              onChange={ handleOnChange }
                       />;
            case 'boolean':
                return <input type="checkbox"
                              value={ value }
                              onChange={ handleOnChange }
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
            <div className='wingeditor-TextInput'>
                { label ? (<div> { label } </div>) : null }
                { this.renderInput() }
            </div>
        );

    }
};
