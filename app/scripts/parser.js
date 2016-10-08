//import * as readline from  'readline';
import * as fs from 'fs';
import * as path from 'path';
import _ from 'lodash';

const XFLR5_KEYS = [
    'y',       //distance of section to middle. [m] IS IT Y coord or along rotated y???????
    'chord',    // chord length in [m]
    'offset',   // how much leading edge of section is back from le of middle section. [m]
    'dihedral', // angle to next section. Negative is downwards. [degrees]
    'twist',    // currently unused
    'xpanels',  // unused
    'ypanels',  // unused
    'xdist',    // unused
    'ydist',    // unused
    'foil'
];     // path to foil definition file


function parseXFLR5Wing(fileName) {
    let dir = path.dirname(fileName);
    let lines = fs.readFileSync(fileName).toString().split('\n');
    lines.shift(); //first row is the wing name
    lines = _.compact(lines);
    let foilDefs = {};
    let sections = lines.map(function (line) {
        let section = _.mapValues(_.zipObject(XFLR5_KEYS, line.split(' ')), (val, key) => {
            return key === 'foil' ? path.format({ dir: dir, base: val }) : parseFloat(val);
        });
        foilDefs[section.foil] = parseFoil(section.foil);
        return section;
    });
    return { sections, foilDefs };
}

let parseFoil = _.memoize((fileName) => {
    let lines = fs.readFileSync(fileName).toString().split('\n');
    lines.shift(); //first row is the foil name
    lines = _.compact(lines);
    return _.map(lines, (line) => {
        return _.map(line.trim().split(/\s+/), parseFloat);
    });
});

function parse(fileName) {
    return parseXFLR5Wing(fileName);
};

export { parse };
