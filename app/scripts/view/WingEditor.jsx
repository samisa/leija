import React from 'react';
import _ from 'lodash';

import Input from './Input';

import actions from '../actions';

const COLUMNS = [ 'y', 'chord', 'offset', 'dihedral', 'twist', 'foil' ];

class WingEditor extends React.Component {
    constructor(props) {
        super(props);
        _.bindAll(this, 'sectionRow', 'sectionCell', 'paramInputHandler');
    }

    sectionRow(section, rowIndex) {
        return (
            <tr key={ rowIndex }>
                { _.map(COLUMNS, (col, colIndex) => { return this.sectionCell(section[col], col, rowIndex); }) }
            </tr>
        );
    }

    sectionCell(value, col, rowIndex) {
        return (
            <td key={ col }>
                { <Input handleOnChange={ this.paramInputHandler(`sections[${rowIndex}].${col}`) } value={ value }/> }
            </td>
        );
    }

    paramInputHandler(paramPath) {
        return (val) => {
            const newState = _.setWith(_.clone(this.props.wingDefinition), paramPath, val, _.clone);
            actions.updateWing(newState);
        };
    }

    renderValues() {
        const { wingDefinition } = this.props;
        const intakes = wingDefinition.intakes || {};
        return (
            <React.Fragment>
                <div className="wing-params-shape-table">
                    <table>
                        <thead>
                            <tr>
                                { _.map(COLUMNS, (col) => { return <th>{ col }</th>; }) }
                            </tr>
                        </thead>
                        <tbody>
                            { wingDefinition.sections.map(this.sectionRow) }
                        </tbody>
                    </table>
                </div>
                <div className="wing-paramas-intakes">
                    { "Intakes" }
                    <Input type={"boolean"} label={ 'Closed' } value={ intakes.closed } handleOnChange={ this.paramInputHandler('intakes.closed') }/>
                    <Input label={ 'Sections' } value={ intakes.sections } handleOnChange={ this.paramInputHandler('intakes.sections') }/>
                    <Input label={ 'Opening height' } value={ intakes.opening } handleOnChange={ this.paramInputHandler('intakes.opening') }/>
                    <Input label={ 'Vent endposition' } value={ intakes.vent } handleOnChange={ this.paramInputHandler('intakes.vent') }/>
                </div>
            </React.Fragment>
        );
    }

    render() {
        const { wingDefinition } = this.props;

        return (
            <div className='wing-params-editor'>
                <div className="header">{ "Wing shape" } </div>
                { wingDefinition ? this.renderValues() : null }
            </div>
        );

    }
};

export default WingEditor;
