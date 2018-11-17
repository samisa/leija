
//TODO:move to utils
export function vec3(array = null) {
    return array ? new THREE.Vector3().fromArray(array) : new THREE.Vector3();
}

//TODO:move to utils
export function vec2(array = null) {
    return array ? new THREE.Vector2().fromArray(array) : new THREE.Vector2();
}

//TODO:move to utils.
export function foilLeadingEdgePointIndex(foil) {
    return  _.reduce(foil, (acc, point, index) => {
        return (foil[acc][0] > point[0]) ?  index : acc;
    }, 0);
}

//TODO:move to utils.
export function foilPointIndex({ offset, foil, bottom }) {
    const lePointIndex = foilLeadingEdgePointIndex(foil);
    const half = bottom ? foil.slice(lePointIndex + 1, foil.length) : foil.slice(0, lePointIndex + 1);
    const indexInHalf =  _.reduce(half, (acc, point, index) => {
        return Math.abs(half[acc][0] - offset) < Math.abs(point[0] - offset) ?  acc : index;
    }, 0);

    return bottom ? indexInHalf + lePointIndex : indexInHalf;
}

//TODO:move to utils.
export const foilBottomPointIndex = (offset, foil) => foilPointIndex({ offset, foil, bottom: true });

