import _ from 'lodash';
import * as THREE from 'three';

function wingSpecToPoints(wingSpec) {
    let  { foilDefs, sections } = wingSpec;
    // 1. immerse each sections' foilcoordinates to 3d space, and flatten each foil to 3*nfoilpoints dimensional array
    // foil fornt tip should then be at (0,0,0)
    let foils = sections.map((section) => {
        //        ydist = ydist + section.y;
        return _.flatten(foilDefs[section.foil].map((point) => { return [point[0], 0, point[1]]; }));
    });

    // 2. construct transformations for each section:
    // Section defines transformations of a tunnel's inner foil, except for dihedral which is the angle of (and to) the next foil.
    // For each foil:
    //     apply twist + scale and x offset to foil
    //     add translation by y offset to previous transformation
    //     apply previous transformation (initially unit) to foil
    //     take translation part of previous transformation
    //     add dihedral rotation
    //     set as previous trasnformation

    let previousTransformation = new THREE.Matrix4();
    var previousY = 0;
    _.map(sections, (section, index) => {
        let toTwistCenter = new THREE.Matrix4().makeTranslation(0.25, 0, 0);
        let twistRot = new THREE.Matrix4().makeRotationY(-section.twist * Math.PI / 180);
        let andBack = new THREE.Matrix4().getInverse(toTwistCenter);
        let twist = new THREE.Matrix4()
                .multiply(toTwistCenter)
                .multiply(twistRot)
                .multiply(andBack);
        twist.applyToVector3Array(foils[index]);

        let scale = new THREE.Matrix4().makeScale(section.chord, section.chord, section.chord);
        scale.applyToVector3Array(foils[index]);

        let xtranslation = new THREE.Matrix4().makeTranslation(section.offset, 0, 0);
        xtranslation.applyToVector3Array(foils[index]);

        let deltaY = section.y - previousY;
        previousY = section.y;
        let translation = new THREE.Matrix4().makeTranslation(0, deltaY, 0);
        previousTransformation.multiply(translation);
        previousTransformation.applyToVector3Array(foils[index]);

        previousTransformation = new THREE.Matrix4().copyPosition(previousTransformation);
        let rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler( section.dihedral * Math.PI / 180, 0, 0, 'XYZ' ));
        previousTransformation.multiply(rotation);
    });

    return _.map(foils, (foil) => { return _.chunk(foil, 3).map((pt) => { return new THREE.Vector3().fromArray(pt); }); });
};

function createMesh(wingSpec) {
    let wingGeometry = new THREE.Geometry();
    let foils = wingSpecToPoints(wingSpec);

    _.each(foils, (foil) => {
        var x = _;
        _(foil).each((p) => {
            wingGeometry.vertices.push(p);
        });
    });

    //NOTE: this assumes each foil has same amount of vertices arranged in similar order:
    let foilLength = foils[0].length;
    for (var i = 0; i < foils.length - 1; i++) {
        let n = i * foilLength;
        for (var j = 0; j < foilLength - 1; j++) {
            wingGeometry.faces.push(new THREE.Face3(    n + j,              n + j + 1, n + j + foilLength));
            wingGeometry.faces.push(new THREE.Face3(n + j + 1, n + j + foilLength + 1, n + j + foilLength));
        }
    }

    let material =  new THREE.MeshPhongMaterial( { color: 0xffffff, shading: THREE.FlatShading,  side: THREE.DoubleSide } );

    let rightSide = wingGeometry;
    let leftSide = wingGeometry.clone();
    leftSide.applyMatrix(new THREE.Matrix4().makeScale(1,-1, 1));
    let leftMesh = new THREE.Mesh( leftSide, material );
    let rightMesh = new THREE.Mesh( rightSide, material );
    let wingObject = new THREE.Object3D();
    wingObject.add(rightMesh, leftMesh);
    return wingObject;
}

export {
    createMesh,
    wingSpecToPoints
}
