import React from 'react';
import _ from 'lodash';

import Input from './Input';

const COLUMNS = [ 'y', 'chord', 'offset', 'dihedral', 'twist', 'foil' ];

const WingEditor = React.createClass({
    getInitialState: function() {
        return {};
    },

    sectionRow: function(section, rowIndex) {
        return (
            <tr key={ rowIndex }>
                { _.map(COLUMNS, (col, colIndex) => { return this.sectionCell(section[col], col, rowIndex); }) }
            </tr>
        );
    },

    sectionCell: function(value, col, rowIndex) {
        return (
            <td key={ col }>
                { <Input handleOnChange={ this.cellChangeHandler(col, rowIndex) } value={ value }/> }
            </td>
        );
    },

    cellChangeHandler: function(col, rowIndex) {
        let that = this;
        return (evt) => {
            that.state.wingDefinition.sections[rowIndex][col] = evt.target.value;
            that.setState(that.state);
        };
    },

    componentWillReceiveProps: function(newProps) {
        this.setState({ wingDefinition: _.clone(newProps.wingDefinition) });
    },

    applyChanges: function() {
        this.props.handleApplyChanges(_.clone(this.state.wingDefinition));
    },

    render: function() {
        let { wingDefinition } = this.state;
        if (!wingDefinition) { return null; }

        return (
            <div className='wing-params-editor'>
                <table>
                    <tbody>
                        <tr>
                            { _.map(COLUMNS, (col) => { return <th>{ col }</th>; }) }
                        </tr>
                        { wingDefinition.sections.map(this.sectionRow) }
                    </tbody>
                </table>
                <button onClick={ this.applyChanges }> Apply changes </button>
            </div>
        );

    }
});

export default WingEditor;
