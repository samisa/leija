import React from 'react';
import _ from 'lodash';

const COLUMNS = [ 'y', 'chord', 'offset', 'dihedral', 'twist', 'foil' ];

const WingEditor = React.createClass({
    sectionRow: function(section) {
        return (
            <tr>
                { _.map(COLUMNS, (col) => { return this.sectionCell(section[col]); }) }
            </tr>
        );
    },

    sectionCell: function(value) {
        return (
            <td>{ value }</td>
        );
    },

    render: function() {
        let { wingObject } = this.props;
        if (!wingObject) { return null; }
        let { params } = wingObject;

        return (
            <div className='wing-params-editor'>
                <table>
                    <tr>
                        { _.map(COLUMNS, (col) => { return <th>{ col }</th>; }) }
                    </tr>
                    { params.map(this.sectionRow) }
                </table>
            </div>
        );

    }
});

export default WingEditor;
