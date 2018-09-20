

import React from 'react';
import _ from 'lodash';
import * as d3 from "d3";
import actions from '../actions';

//const WINGCONNECTIONINPUTS = {'wingConnections' : { 'xPos' } };
//assume widths are in mm
const widthToInt = (widthString) => widthString.length > 2 ? Number(widthString.substring(0, widthString.length - 2)) : 0;

//naah maybe react-flexbox ???

function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}



const scaleSvgs = (htmls) => {
    const svgEls = htmls.map(html => htmlToElement(html));
    const d3Els = svgEls.map(el => d3.select(el));
    const maxWidth = d3Els.reduce((acc, el) => Math.max(widthToInt(el.attr('width')), acc), 0);
    d3Els.forEach((el) => {
        const w = widthToInt(el.attr('width'));
        const h = widthToInt(el.attr('height'));
        const newW = 600 * w/maxWidth + 'px';
        const newH = 600 * h/maxWidth + 'px';
        el.attr('width', newW);
        el.attr('height', newH);
    })
    return svgEls.map(e => e.outerHTML);
};

class SheetView extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        let { sheetSvgs } = this.props;

        if (!sheetSvgs) { return null; }

        return (
            <div className='sheetView'>
                <button onClick={ () => actions.saveSvgs(sheetSvgs) }> Save svgs... </button>
                { scaleSvgs(sheetSvgs).map((svg) => (<div dangerouslySetInnerHTML={ { __html: svg } }/>)) }
            </div>
        );
    }
};

export default SheetView;

