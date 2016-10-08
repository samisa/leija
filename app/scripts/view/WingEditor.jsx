import React from 'react';
import _ from 'lodash';

const WingEditor = React.createClass({
    sectionRow: function(section) {
        return (
            <tr>
                { _.map(section, this.sectionCell) }
            </tr>
        );
    },

    sectionCell: function(value, key) {
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
                    { params.map(this.sectionRow) }
                </table>
            </div>
        );

    }
});

export default WingEditor;
