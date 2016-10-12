import _ from 'lodash';
import * as THREE from 'three';
import * as wing3d from './wing3d';

let testBridleSpec = {
    mainLineLength: 20,
    barLength: 0.5,
    nRows: 3,
    towPoint: 0.2, //percent back from center le.
    wingConnections: [
        {
            xPos: 0,
            foils: [1,3,5,7]
        },
        {
            xPos: 0.3, //fraction of chord length
            foils: [1,3,5,7]
        },
        {
            xPos: 1.0, //fraction of chord length
            foils: [1,3,5,7]
        }
    ]
};


////
//kite connections are fixed bar connections are fixed
// 1. line from pointa to n points with division @ length l --- not unique




let testBridleDef = {
    lines: [
        {
            name: 'main',
            l: 20,
            division: 2,
            lines: [
                {
                    name: 'a',
                    l: 2,
                    division: 2,
                    lines: [
                        {
                            name: 'a1',
                            l: 2,
                            lines: [
                                {
                                    name: 'a1a',
                                    l: 0.5,
                                    kitePoint: { foil: 0, offset: 0 }
                                },
                                {
                                    name: 'a1b',
                                    l: 0.5,
                                    kitePoint: { foil: 2, offset: 0 }
                                }
                            ]
                        },
                        {
                            name: 'a2',
                            l: 2,
                            lines: [
                                {
                                    name: 'a2a',
                                    l: 0.5,
                                    kitePoint: { foil: 4, offset: 0 }
                                },
                                {
                                    name: 'a2b',
                                    l: 0.5,
                                    kitePoint: { foil: 6, offset: 0 }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};

let testBridleDef2 = {
};

    //     wingConnections: [
//         {
//             x: 0
//             foils: [1, 3,  ]
//         }
//     ]
//     }
//     aBridle: {
//     }
// }

function createBridleObject(bridleSpec, wing) {
    //find coordinates of wing connection points
    let foils = wing3d.wingSpecToPoints(wing);

    let lines = _.map(foils, (foil) => {
        let p1 = foil[0];
        let p2 = [0, 0, -20];
        return [p1, p2];
    });

    var material = new THREE.LineBasicMaterial({ color: 0x0000ff });
    lines = _(lines).map((line) => {
        let rightLineGeometry = new THREE.Geometry();
        rightLineGeometry.vertices.push(new THREE.Vector3(line[0][0], line[0][1], line[0][2]));
        rightLineGeometry.vertices.push(new THREE.Vector3(line[1][0], line[1][1], line[1][2]));
        let leftLineGeometry = rightLineGeometry.clone();
        leftLineGeometry.applyMatrix(new THREE.Matrix4().makeScale(1,-1, 1));
        return [ new THREE.Line(leftLineGeometry, material), new THREE.Line(rightLineGeometry, material) ];
    }).flatten().value();

    return { lines };
}

export {
    createBridleObject
}
