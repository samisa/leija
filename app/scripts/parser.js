//import * as readline from  'readline';
import * as fs from 'fs';
import * as path from 'path';
import _ from 'lodash';

import notification from './notification';

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
    'foil'      // foil name, assumed that file [name] or [name].dat is in same directory as the wing json file
];

const XFLR5_DEFAULTS = {
    xpanels: 13,
    ypanels: 19,
    xdist: 1, // cosine
    ydist: -2 // -sine
};

const withDefaults = (section, key) => {
    if (section[key] === undefined) {
        return XFLR5_DEFAULTS[key] === undefined ? 0 : XFLR5_DEFAULTS[key];
    }

    if (key === 'foil') {
        return `${section[key]} ${section[key]}`; //foil name is duplicated for some reason
    }

    return section[key];
};


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

function importXFLR5(fileName) {
    let dir = path.dirname(fileName);
    let lines = fs.readFileSync(fileName).toString().split('\n');
    lines.shift(); //first row is the wing name
    lines = _.compact(lines);
    let foilDefs = {};
    let sections = lines.map(function (line) {
        let section = _.mapValues(_.zipObject(XFLR5_KEYS, line.split(' ')), (val, key) => {
            return key === 'foil' ? val : parseFloat(val);
        });
        foilDefs[section.foil] = parseFoil(path.format({ dir: dir, base: section.foil })); // here TODO: try catch first with foil name then foilname.dat
        return section;
    });
    return { wing: { sections, foilDefs } };
}

const loadJson = (fileName) => {
    const dir = path.dirname(fileName);
    const obj = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    return obj;
};


function exportXFLR5(dir, kiteDef) {
    const { wing, name } = kiteDef;
    const wingName = name || 'kite';     //TODO: UI for kite naming;
    const wingFile = path.format({ dir: dir, base: wingName + '.xwimp' });
    debugger;
    const sectionLines = wing.sections.map((section) => {
        //TODO: need to duplicate foil????
        return XFLR5_KEYS.map((key) => withDefaults(section, key)).join(' ');
    });
    const wingFileContent = [ wingName, ...sectionLines, '' ].join('\n');
    saveFile(wingFile, wingFileContent);

    //HERE open file and push lines...
    const foilRefs = new Set(wing.sections.map((section) => section.foil));

    foilRefs.forEach((foil) => {
        const foilDef = wing.foilDefs[foil];
        if (!foilDef) { return; }

        const coordLines = foilDef.map(point => point.join('    '));
        const foilFileContent = [foil, ...coordLines].join('\n');
        const foilFile = path.format({ dir: dir, base: foil + '.dat' });
        saveFile(foilFile, foilFileContent);
    });
};

const saveFile = (path, content) => {
    fs.writeFile(path, content, function (err) {
        if (err) {
            notification.error(`Error when saving ${path}: ${err.message}`);
        }
        notification.log(`File ${path} saved.`);
    });;
};

export { loadJson, importXFLR5, exportXFLR5, saveFile };
