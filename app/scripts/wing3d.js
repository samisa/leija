import _ from 'lodash';
import * as THREE from 'three';

function createMesh(wingSections) {
    // 1. immerse each sections' foilcoordinates to 3d space, and flatten eaxh foil to 3*nfoilpoints dimensional array
    //  let ydist = 0;
    let foils = wingSections.map((section) => {
        //        ydist = ydist + section.y;
        return _.flatten(section.foil.map((point) => { return [point[0], 0, point[1]]; }));
    });

    // 2. construct transformations for each section
    let transformation = new THREE.Matrix4();
    var previousDihedral = 0;
    _.map(wingSections, (section, index) => {
        let translation = new THREE.Matrix4().makeTranslation(0, section.y, 0);
        let rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler( previousDihedral * Math.PI / 360, 0, 0, 'XYZ' ));
        transformation.multiply(translation).multiply(rotation);
        transformation.applyToVector3Array(foils[index]);
        previousDihedral = section.dihedral;
    });

    let wing = new THREE.Geometry();

    _.each(foils, (foil) => {
        var x = _;
        _(foil).chunk(3).each((p) => {
            wing.vertices.push(new THREE.Vector3(p[0], p[1], p[2]));
        });
    });

    //now assume each foil has same amount of vertices arranged in similar order:
    let foilLength = foils[0].length / 3;
    for (var i = 0; i < foils.length - 1; i++) {
        let n = i * foilLength;
        for (var j = 0; j < foilLength - 1; j++) {
            wing.faces.push(new THREE.Face3(    n + j,              n + j + 1, n + j + foilLength));
            wing.faces.push(new THREE.Face3(n + j + 1, n + j + foilLength + 1, n + j + foilLength));
        }
//        wing.faces.push(new THREE.Face3(n + foilLength, n, n + 2 * foilLength));
    }

    let material =  new THREE.MeshPhongMaterial( { color: 0xffffff, shading: THREE.FlatShading,  side: THREE.BackSide } );
    return new THREE.Mesh( wing, material );
}

export {
    createMesh
}
