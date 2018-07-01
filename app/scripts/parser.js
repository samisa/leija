//import * as readline from  'readline';
import * as fs from 'fs';
import * as path from 'path';
import _ from 'lodash';

const XFLR5_KEYS = [
    'y',        // (y,z)-projected path distance of foil's center to middle. (path along rotated and translated sections :)) [m]
    'chord',    // chord length in [m]
    'offset',   // how much leading edge of section is back from le of middle section. [m]
    'dihedral', // angle of the section. Negative is downwards. [degrees]
    'twist',    // twist of foil, around quarter chord point
    'xpanels',  // unused
    'ypanels',  // unused
    'xdist',    // unused
    'ydist',    // unused
    'foil'      // path to foil definition file
];

// Airfoil data points are assumed follow the standard: start form trailing edge (large x, usually 1.0) circulate ccw (i.e. top first then bottom)
// also data is assumed to be already normalized: front tip at (0,0), chord length 1.0
let parseFoil = _.memoize((fileName) => {
    let lines = fs.readFileSync(fileName).toString().split('\n');
    lines.shift(); //first row is the foil name
    lines = _.compact(lines);
    return _.map(lines, (line) => {
        return _.map(line.trim().split(/\s+/), parseFloat);
    });
});

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
    return { wing: { sections, foilDefs } };
}

const parseJsonKite = (fileName) => {
    const dir = path.dirname(fileName);
    const obj = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    return obj;
};


//TODO: separate action for import/export xflr5 data and save/open json
function parse(fileName) {
    return fileName.endsWith('xwimp') ?
        parseXFLR5Wing(fileName) :
        parseJsonKite(fileName);
};

export { parse };
