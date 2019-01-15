import _ from 'lodash';
import * as THREE from 'three';

export function vec3(array = null) {
    return array ? new THREE.Vector3().fromArray(array) : new THREE.Vector3();
}

export function vec2(array = null) {
    return array ? new THREE.Vector2().fromArray(array) : new THREE.Vector2();
}

export function foilLeadingEdgePointIndex(foil) {
    return  _.reduce(foil, (acc, point, index) => {
        return (foil[acc][0] > point[0]) ?  index : acc;
    }, 0);
}

export function foilPointIndex({ offset, foil, bottom }) {
    const lePointIndex = foilLeadingEdgePointIndex(foil);
    const half = bottom ? foil.slice(lePointIndex, foil.length) : foil.slice(0, lePointIndex + 1);
    const indexInHalf =  _.reduce(half, (acc, point, index) => {
        return Math.abs(half[acc][0] - offset) < Math.abs(point[0] - offset) ?  acc : index;
    }, 0);

    return bottom ? indexInHalf + lePointIndex : indexInHalf;
}

export const foilBottomPointIndex = (offset, foil) => foilPointIndex({ offset, foil, bottom: true });

export const foilPointAtOffset = (offset, foil, foilPoints, bottom) => {
    const closestIndex = foilPointIndex({ offset, foil, bottom: true });
    const closest = foil[closestIndex];
    const clockwise = bottom ? closest[0] < offset : closest[0] >= offset;
    const oppositeIndex = clockwise ? closestIndex + 1 : closestIndex - 1;
    const opposite = foil[oppositeIndex];
    if (!opposite) {
        return foilPoints[closestIndex];
    }

    const distFactor = Math.abs(closest[0] - offset) / Math.abs(closest[0] - opposite[0]);

    const closestPoint = foilPoints[closestIndex];
    const oppositePoint = foilPoints[oppositeIndex];
    let result = closestPoint.clone();
    const rel = oppositePoint.clone().subVectors(oppositePoint, closestPoint).multiplyScalar(distFactor);
    result = result.addVectors(result, rel);
    return result;
};

