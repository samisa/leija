import _ from 'lodash';
import * as THREE from 'three';
import * as wing3d from './wing3d';
import * as bridles from './bridle';

// Find point on foil bottom at relative offset
// back from le. (Works as long as there is not too much
// twist on the foil so that chord is more or less in x direction)
function foilBottomPoint(offset, foil) {
    offset = 1 - offset;
    let { lePoint, tePoint } = _.reduce(foil, (accumulator, point) => {
        let { lePoint, tePoint } = accumulator;
        lePoint = (lePoint && lePoint[0] > point[0]) ? lePoint : point;
        tePoint = (tePoint && tePoint[0] < point[0]) ? tePoint : point;
        return { lePoint, tePoint };
    }, {});

    let leV = new THREE.Vector3().fromArray(lePoint);
    let teV = new THREE.Vector3().fromArray(tePoint);
    // le + offset * (te - le)
    let chordPointAtOffset = new THREE.Vector3().subVectors(teV, leV).multiplyScalar(offset).add(leV);
    // now find point in foil's bottom side closest to the plane that goes through
    // chordPointAtOffset and perpendicular to chord.
    // TODO: make sure it's on the bottom side
    let planeNormal = new THREE.Vector3().subVectors(teV, leV); //not normalized but should ot matter
    let { closestPoint } = _.reduce(foil, (accumulator, point, index) => {
        let { closestPoint, distSqr } = accumulator;
        let newDistSqr = planeNormal.x * (chordPointAtOffset.x-point[0]) +
                         planeNormal.y * (chordPointAtOffset.y-point[1]) +
                         planeNormal.z * (chordPointAtOffset.z-point[2]);
        newDistSqr = newDistSqr * newDistSqr;
        if (distSqr && distSqr < newDistSqr) {
            return accumulator;
        } else {
            return { closestPoint: point, distSqr: newDistSqr };
        }
    }, {});

    return closestPoint;
}

function createBridleObject(wing, bridleSpec) {
    const bridle = bridles.solveBridle(wing, bridleSpec);
    console.log(bridles.printBridle(bridle));
    var material = new THREE.LineBasicMaterial({ color: 0xff0011 });
    let lines = _(bridle.links).map((link) => {
        return _.map(link.nodes, (node) => {
            return node.position;
        });
    }).map((line) => {
        let rightLineGeometry = new THREE.Geometry();
        rightLineGeometry.vertices.push(line[0]);
        rightLineGeometry.vertices.push(line[1]);
        let leftLineGeometry = rightLineGeometry.clone();
        leftLineGeometry.applyMatrix(new THREE.Matrix4().makeScale(1,-1, 1));
        return [ new THREE.Line(leftLineGeometry, material), new THREE.Line(rightLineGeometry, material) ];
    }).flatten().value();

    return { lines };

    // let foils = wing3d.wingSpecToPoints(wing);

    // let lines = _.map(foils, (foil) => {
    //     let p1 = foilBottomPoint(0.3, foil);
    //     let p2 = [0, 0, -5];
    //     return [p1, p2];
    // });

    // var material = new THREE.LineBasicMaterial({ color: 0x0000ff });
    // lines = _(lines).map((line) => {
    //     let rightLineGeometry = new THREE.Geometry();
    //     rightLineGeometry.vertices.push(new THREE.Vector3(line[0][0], line[0][1], line[0][2]));
    //     rightLineGeometry.vertices.push(new THREE.Vector3(line[1][0], line[1][1], line[1][2]));
    //     let leftLineGeometry = rightLineGeometry.clone();
    //     leftLineGeometry.applyMatrix(new THREE.Matrix4().makeScale(1,-1, 1));
    //     return [ new THREE.Line(leftLineGeometry, material), new THREE.Line(rightLineGeometry, material) ];
    // }).flatten().value();

    // return { lines };
}

export {
    createBridleObject
}
