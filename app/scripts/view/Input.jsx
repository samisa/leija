import React from 'react';

export default React.createClass({
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
    render: function() {
        return (
            <div className='wingeditor-TextInput'>
                <input type="text"
                       value={ this.props.value }
                       onChange={ this.props.handleOnChange }
                />
            </div>
        );

    }
});
