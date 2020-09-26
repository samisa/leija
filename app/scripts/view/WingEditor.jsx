import React from 'react';
import _ from 'lodash';

import Input from './Input';

import actions from '../actions';

const RAM_COLUMNS = [ 'y', 'chord', 'offset', 'dihedral', 'twist', 'foil' ];
const INFLATABLE_COLUMNS = [ 'x', 'y', 'z', 'diameter', 'chord', 'tailz'];

class WingEditor extends React.Component {
    constructor(props) {
        super(props);
        _.bindAll(this, 'sectionCell', 'paramInputHandler', 'addSection');
    }

    sectionCell(value, col, rowIndex) {
        return (
            <td key={ col }>
                { <Input type={ 'number' } handleOnChange={ this.paramInputHandler(`sections[${rowIndex}].${col}`) } value={ value }/> }
            </td>
        );
    }

    paramInputHandler(paramPath) {
        return (val) => {
            const newState = _.setWith(_.clone(this.props.wingDefinition), paramPath, val, _.clone);
            actions.updateWing(newState);
        };
    }

    addSection() {
        const newState = { ...this.props.wingDefinition, sections: [ ...this.props.wingDefinition.sections, {}] };
        actions.updateWing(newState);
    }

    renderValues() {
        const ram = this.props.mode === 'ram';
        const columns = ram ? RAM_COLUMNS : INFLATABLE_COLUMNS;
        const { wingDefinition } = this.props;
        const intakes = wingDefinition.intakes || {};
        const sectionRow = (section, rowIndex) => {
            return (
                <tr key={ rowIndex }>
                    { _.map(columns, (col, colIndex) => { return this.sectionCell(section[col], col, rowIndex); }) }
                </tr>
            );
        }


        return (
            <React.Fragment>
                <div className="wing-params-shape-table">
                    <button onClick={ this.addSection }>{ "Add section"}</button>
                    <table>
                        <thead>
                            <tr>
                                { _.map(columns, (col) => { return <th>{ col }</th>; }) }
                            </tr>
                        </thead>
                        <tbody>
                            { wingDefinition.sections.map(sectionRow) }
                        </tbody>
                    </table>
                </div>
                { ram ? (
                <div className="wing-params-intakes">
                    { "Intakes" }
                    <Input type={"boolean"} label={ 'Closed' } value={ intakes.closed } handleOnChange={ this.paramInputHandler('intakes.closed') }/>
                    <Input label={ 'Sections' } value={ intakes.sections } handleOnChange={ this.paramInputHandler('intakes.sections') }/>
                    <Input label={ 'Opening height' } value={ intakes.opening } handleOnChange={ this.paramInputHandler('intakes.opening') }/>
                    <Input label={ 'Vent endposition' } value={ intakes.vent } handleOnChange={ this.paramInputHandler('intakes.vent') }/>
                </div>
                ) : null }
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

/* 
 * here
 * 
 * add canopy parameters to the sections array
 * first change chord to diameter
 * chord is the x-length of canopy
 * tailz
 * (las section should have chord length 0)
 *  */
