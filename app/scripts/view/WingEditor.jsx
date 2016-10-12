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
            that.state.wingObject.params[rowIndex][col] = evt.target.value;
            that.setState(that.state);
        };
    },

    componentWillReceiveProps: function(newProps) {
        this.setState({ wingObject: _.clone(newProps.wingObject) });
    },

    render: function() {
        let { wingObject } = this.state;
        if (!wingObject) { return null; }
        let { params } = wingObject;

        return (
            <div className='wing-params-editor'>
                <table>
                    <tbody>
                        <tr>
                            { _.map(COLUMNS, (col) => { return <th>{ col }</th>; }) }
                        </tr>
                        { params.map(this.sectionRow) }
                    </tbody>
                </table>
            </div>
        );

    }
});

export default WingEditor;
