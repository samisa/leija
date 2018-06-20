import React from 'react';
import _ from 'lodash';

import Input from './Input';

import actions from '../actions';

const COLUMNS = [ 'y', 'chord', 'offset', 'dihedral', 'twist', 'foil' ];

class WingEditor extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        _.bindAll(this, 'sectionRow', 'sectionCell', 'paramInputHandler', 'applyChanges');
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
        return (evt) => {
            _.set(this.state.wingDefinition, paramPath, evt.target.value);
            this.setState(this.state);
        };
    }

    componentWillReceiveProps(newProps) {
        this.setState({ wingDefinition: _.clone(newProps.wingDefinition) });
    }

    applyChanges() {
        actions.updateWing(_.clone(this.state.wingDefinition));
    }

    renderValues() {
        const { wingDefinition } = this.state;
        const intakes = wingDefinition.intakes || {};
        return (
            <React.Fragment>
                <table>
                    <tbody>
                        <tr>
                            { _.map(COLUMNS, (col) => { return <th>{ col }</th>; }) }
                        </tr>
                        { wingDefinition.sections.map(this.sectionRow) }
                    </tbody>
                </table>
                <div>
                    { "Intakes" }
                    <Input type={"boolean"} label={ 'Closed' } value={ intakes.closed } handleOnChange={ this.paramInputHandler('intakes.closed') }/>
                    <Input label={ 'Sections' } value={ intakes.sections } handleOnChange={ this.paramInputHandler('intakes.sections') }/>
                    <Input label={ 'Opening height' } value={ intakes.opening } handleOnChange={ this.paramInputHandler('intakes.opening') }/>
                    <Input label={ 'Vent length' } value={ intakes.vent } handleOnChange={ this.paramInputHandler('intakes.vent') }/>
                </div>
            </React.Fragment>
        );
    }

    render() {
        const { wingDefinition } = this.state;

        return (
            <div className='wing-params-editor'>
                { wingDefinition ? this.renderValues() : null }
                { wingDefinition && <button onClick={ this.applyChanges }> Apply changes </button> }
                { wingDefinition && <button onClick={ actions.saveKite }> Save... </button> }
                <button onClick={ actions.openKite }> Open... </button>
            </div>
        );

    }
};

export default WingEditor;
