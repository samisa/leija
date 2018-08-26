import _ from 'lodash';
import * as THREE from 'three';
import { foilLeadingEdgePointIndex, foilPointIndex } from './bridle';


const applyTo3Vectors = (mat4, vecs) => {
    vecs.forEach((v) => v.applyMatrix4(mat4));
};

function wingSpecToPoints(wingSpec) {
    let  { foilDefs, sections } = wingSpec;
    // 1. immerse each sections' foilcoordinates to 3d space.
    // foil fornt tip should then be at (0,0,0)
    const foils = sections.map((section) => {
        //        ydist = ydist + section.y;
        return foilDefs[section.foil].map((point) => { return new THREE.Vector3(point[0], 0, point[1]); });
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
        applyTo3Vectors(twist, foils[index]);

        let scale = new THREE.Matrix4().makeScale(section.chord, section.chord, section.chord);
        applyTo3Vectors(scale, foils[index]);

        let xtranslation = new THREE.Matrix4().makeTranslation(section.offset, 0, 0);
        applyTo3Vectors(xtranslation, foils[index]);

        let deltaY = section.y - previousY;
        previousY = section.y;
        let translation = new THREE.Matrix4().makeTranslation(0, deltaY, 0);
        previousTransformation.multiply(translation);
        applyTo3Vectors(previousTransformation, foils[index]);

        previousTransformation = new THREE.Matrix4().copyPosition(previousTransformation);
        let rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler( section.dihedral * Math.PI / 180, 0, 0, 'XYZ' ));
        previousTransformation.multiply(rotation);
    });

    return foils;
};

function createWingObjects(wingSpec) {
    const { intakes, sections } = wingSpec;
    const opening = (intakes && intakes.opening) || 0;
    const closed = intakes && intakes.closed;
    const sectionsWithOpening = (
        intakes &&
        intakes.sections &&
        intakes.sections.split(',').map((x) => parseInt(x, 10))
    ) || [];

    const foils = wingSpecToPoints(wingSpec);
    const foilLength = foils[0].length;
    const lePointIndex = foilLeadingEdgePointIndex(foils[0]);

    const topSkinGeometry = new THREE.Geometry();
    const bottomSkinGeometry = new THREE.Geometry();

    _.each(foils, (foil) => {
        _(foil).each((p, index) => {
            topSkinGeometry.vertices.push(p);
            bottomSkinGeometry.vertices.push(p);
        });
    });

    //NOTE: this assumes each foil has same amount of vertices arranged in similar order:
    for (var i = 0; i < foils.length - 1; i++) {
        const openingDist = sections[i].chord * opening;
        const chord1LEPoint = foils[i][lePointIndex];

        let n = i * foilLength;
        for (var j = 0; j < foilLength - 1; j++) {
            const faceWithinOpening = sectionsWithOpening.includes(i) &&
                      openingDist &&
                      j >= lePointIndex &&
                      foils[i][j].distanceTo(foils[i][lePointIndex]) < openingDist;

            if (faceWithinOpening) { continue; }
            const skinGeometry = j <= lePointIndex ? topSkinGeometry : bottomSkinGeometry;
            skinGeometry.faces.push(new THREE.Face3(    n + j,              n + j + 1, n + j + foilLength));
            skinGeometry.faces.push(new THREE.Face3(n + j + 1, n + j + foilLength + 1, n + j + foilLength));
        }

        if (closed && sectionsWithOpening.includes(i)) {
            const ventStartIndex = foilPointIndex({ bottom: true, foil: foils[i], offset: opening });
            const ventEndIndex = foilPointIndex({ bottom: false, foil: foils[i], offset: intakes.vent });
            bottomSkinGeometry.faces.push(new THREE.Face3(n + ventStartIndex,
                                                          n + ventEndIndex,
                                                          n + ventStartIndex + foilLength));
            bottomSkinGeometry.faces.push(new THREE.Face3(n + ventEndIndex,
                                                          n + ventEndIndex + foilLength ,
                                                          n + ventStartIndex + foilLength));
        }
    }

    const topMaterial =  new THREE.MeshPhongMaterial( { color: 0xddddff, flatShading: true,  side: THREE.DoubleSide } );
    const bottomMaterial =  new THREE.MeshPhongMaterial( { color: 0xffccaa, flatShading: true,  side: THREE.DoubleSide } );


    const topSkin = new THREE.Object3D();
    topSkin.name = 'topSkin';
    const bottomSkin = new THREE.Object3D();
    bottomSkin.name = 'bottomSkin';

    [ { geometry: topSkinGeometry, material: topMaterial, object: topSkin },
      { geometry: bottomSkinGeometry, material: bottomMaterial, object: bottomSkin }
    ].map(({ geometry, material, object }) => {
          const leftSide = geometry.clone();
          leftSide.applyMatrix(new THREE.Matrix4().makeScale(1,-1, 1));
          let leftMesh = new THREE.Mesh(leftSide, material);
          let rightMesh = new THREE.Mesh(geometry, material);
          object.add(rightMesh, leftMesh);
      });

    return { topSkin, bottomSkin };
}

export {
    createWingObjects,
    wingSpecToPoints
}
