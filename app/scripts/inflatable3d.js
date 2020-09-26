import _ from 'lodash';
import * as THREE from 'three';
import { foilLeadingEdgePointIndex, foilPointIndex, vec3, vec2 } from './utils';
import { wingSpecToPoints } from './wing3d';

const circleFoil = _.memoize(() => {
    const nPoints = 100;
    return [ ...Array(nPoints).keys() ].map(i => [ 0.5 * Math.cos(2 * Math.PI * i / nPoints), 0.5 * Math.sin(2 * Math.PI * i / nPoints) ]);
});

export function minXIndex(points) {
    return  _.reduce(points, (acc, point, index) => {
        return (points[acc].x > point.x) ?  index : acc;
    }, 0);
}
export function maxZIndex(points) {
    return  _.reduce(points, (acc, point, index) => {
        return (points[acc].z < point.z) ?  index : acc;
    }, 0);
}

function inflatableSpecToPoints(wingSpec) {
    const foils = [];
    if (wingSpec.sections.length < 2) { return foils; }

    for (var i = 0; i < wingSpec.sections.length; i++) {
        const { diameter, x, y, z } = wingSpec.sections[i];
        // embed circle into z-x plane, and scale it to coorect size
        const c = circleFoil().map((point) => { return new THREE.Vector3(diameter * point[0], 0, diameter * point[1]); });
        const transf = new THREE.Matrix4();

        if (i < wingSpec.sections.length - 1) {
            const { x:x1, y:y1, z:z1 } = wingSpec.sections[i+1];
            // for the first joint, the previous joint postion is y-mirrored next joint
            const { x:x0, y:y0, z:z0 } = i === 0 ? { x: x1, y: -y1, z: z1 } : wingSpec.sections[i-1];

            // d1 direction from joint to previous joint
            const d1 = vec3().set(-(x-x0), -(y-y0), -(z-z0)).normalize();
            // d1 direction from joint to next joint
            const d2 = vec3().set(x1-x, y1-y, z1-z).normalize();

            //    let r1 be rotation that takes d1 to -y axis
            const r1 = new THREE.Matrix4().makeRotationFromQuaternion(
                new THREE.Quaternion().setFromUnitVectors(d1, vec3().set(0, -1, 0))
            );
            //apply to d2
            d2.applyMatrix4(r1);

            // let r2 be rotation around y that takes d2' to z-y plane
            let d2projToZXUnit = vec3().set(d2.x, 0, d2.z).normalize();
            let r2 = new THREE.Matrix4().makeRotationFromQuaternion(
                new THREE.Quaternion().setFromUnitVectors(d2projToZXUnit, vec3().set(0, 0, 1))
            );
            //apply to d2
            d2.applyMatrix4(r2);

            console.log(`${d2.x} ${d2.y} ${d2.z}`);
            // let a be angle of d2'' to y axis (and thus relative angle of d1, d2)
            let a_2 = Math.acos(d2.dot(vec3().set(0,1,0))) / 2;

            // Apply to circle:
            //   scale by 1/cos(b/2) in z direction
            transf.multiply(new THREE.Matrix4().makeScale(1, 1, 1/Math.cos(a_2)));
            //  rotate by -b/2 around x
            transf.premultiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler( a_2, 0, 0, 'XYZ' )));
            transf.premultiply(new THREE.Matrix4().getInverse(r2));
            transf.premultiply(new THREE.Matrix4().getInverse(r1));
        } else {
            //the last foil... orient like d1
            const { x:x0, y:y0, z:z0 } = wingSpec.sections[i-1];
            const d1 = vec3().set(x-x0, y-y0, z-z0).normalize();
            // rotate by rotation that takesyaxis to d1
            transf.multiply(new THREE.Matrix4().makeRotationFromQuaternion(
                new THREE.Quaternion().setFromUnitVectors(vec3().set(0, 1, 0), d1)
            ));
        }

        //Add translation to correct position and apply to the circle

        transf.premultiply(new THREE.Matrix4().makeTranslation(x, y, z));
        c.forEach(v => v.applyMatrix4(transf));

        // Finally, need to rotate the points in circle so that they stay consistently aligned across circles. e.g. lowest x point has index 0
        const minXI = minXIndex(c);
        const rotated = c.slice(minXI, c.length).concat(c.slice(0, minXI));
        foils.push(rotated);
    }

    return { foils, canopy: canopyPoints(wingSpec, foils) };
};

/*
0.0000000 0.0000000
 0.0075149 0.0101442
 0.0125046 0.0136584
 0.0249843 0.0204940
 0.0499554 0.0301654
 0.0749328 0.0376370
 0.0999142 0.0437086
 0.1498843 0.0533519
 0.1998618 0.0603954
 0.2498462 0.0650390
 0.2998375 0.0672827
 0.3998371 0.0658704
 0.4998552 0.0580585
 0.5998839 0.0465468
 0.6999180 0.0331352
 0.7999519 0.0198236
 0.8999808 0.0082119
 0.9499917 0.0036560
 1.0000000 -.0000000
*/
function canopyPoints(wingSpec, leSections) {
    const canopySections = wingSpec.sections;
    const canopyFoils = [];

    for (var i = 0; i < canopySections.length; i++) {
        const s = canopySections[i];
        const c = leSections[i];
        const p1 = c[maxZIndex(c)];

        canopyFoils.push([
            p1,
            vec3().set(p1.x + s.chord, p1.y, s.tailz)
        ]);
    }

    return canopyFoils;
};

function createInflatableObjects(wingSpec) {
    const { sections } = wingSpec;
    const { foils, canopy } = inflatableSpecToPoints(wingSpec);
    const foilLength = foils[0].length;
    const lePointIndex = foilLeadingEdgePointIndex(circleFoil());
    const leGeometry = new THREE.Geometry();
    foils.forEach(foil => {
        foil.forEach((p, index) => {
            leGeometry.vertices.push(p);
        });
    });
    for (let i = 0; i < foils.length - 1; i++) {
        let n = i * foilLength;
        for (var j = 0; j < foilLength - 1; j++) {
            leGeometry.faces.push(new THREE.Face3(    n + j,              n + j + 1, n + j + foilLength));
            leGeometry.faces.push(new THREE.Face3(n + j + 1, n + j + foilLength + 1, n + j + foilLength));
        }
    }


    const leMaterial =  new THREE.MeshPhongMaterial( { color: 0xddddff, flatShading: true,  side: THREE.DoubleSide } );
    const leSkin = new THREE.Object3D();
    leSkin.name = 'leSkin';

    const leftSide = leGeometry.clone();
    leftSide.applyMatrix(new THREE.Matrix4().makeScale(1,-1, 1));
    let leftMesh = new THREE.Mesh(leftSide, leMaterial);
    let rightMesh = new THREE.Mesh(leGeometry, leMaterial);
    leSkin.add(rightMesh, leftMesh);

    // canopy
    const canopyGeometry = new THREE.Geometry();
    canopy.forEach(foil => {
        foil.forEach((p, index) => {
            canopyGeometry.vertices.push(p);
        });
    });
    for (let i = 0; i < canopy.length - 1; i++) {
        const n = 2 * i;
        canopyGeometry.faces.push(new THREE.Face3(n, n + 1, n + 2));
        canopyGeometry.faces.push(new THREE.Face3(n + 1, n + 3, n + 2));
    }

    const canopySkin = new THREE.Object3D();
    const canopyMaterial =  new THREE.MeshPhongMaterial( { color: 0xffbbbb, flatShading: true,  side: THREE.DoubleSide } );
    canopySkin.name = 'canopySkin';

    const leftCanopy = canopyGeometry.clone();
    leftCanopy.applyMatrix(new THREE.Matrix4().makeScale(1,-1, 1));
    let leftCanopyMesh = new THREE.Mesh(leftCanopy, canopyMaterial);
    let rightCanopyMesh = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopySkin.add(leftCanopyMesh, rightCanopyMesh);

    return { leSkin, canopySkin };
};

export {
    createInflatableObjects,
    inflatableSpecToPoints
}
