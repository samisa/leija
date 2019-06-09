import _ from 'lodash';
import * as THREE from 'three';
import * as wing3d from './wing3d';

import { vec2, vec3, foilLeadingEdgePointIndex, foilPointIndex, foilBottomPointIndex, foilPointAtOffset } from './utils';

export const convertBridle = (bridle) => {
    return Object.keys(bridle).reduce((a, key) => {
        return {
            ...a,
             //atm there ae only umbers and arrays should do this properly...
            [key]: typeof bridle[key] === 'string' ? parseFloat(bridle[key]) : bridle[key]
        };
    }, {}
    );
};

export const DEFAULT_BRIDLE = {
    mainLineLength: 20,
    b3NodeZDist: 3.0,
    b2LineLength: 1.0,
    barLength: 0.5,
    nRows: 3,
    towPoint: 0.34, //percent back from center le. b-bridle position
    wingConnections: [
        {  // a-lines
            xPos: 0.05,
            foils: [0,1,2,3,4,5,6,7,8,9]
        },
        {  // b-lines
            xPos: 0.3, //fraction of chord length
            foils: [0,1,2,3,4,5,6,7,8,9]
        },
        {  // c-lines
            xPos: 1.0, //fraction of chord length
            foils: [0,1,2,3,4,5,6,7,8,9]
        }
    ],
    bLineLength: 1,
    sizeFactor: 0.65,
    pulleyLineLength: 0.7,
    a3xoffset: 0.03,
    c3xoffset: 0.1
};


const pos2b = (wing, bridle, foils, bLineAttachmentPoints3d, splitPointZ) => {
    let weights = foils.map((foil3d, foilIndex) => {
        return wing.sections[foilIndex].chord * (
            foilIndex === 0 ?
            wing.sections[foilIndex+1].y / 2 :
            foilIndex === wing.sections.length - 1 ?
            (wing.sections[foilIndex].y - wing.sections[foilIndex-1].y) / 2 :
            (wing.sections[foilIndex].y - wing.sections[foilIndex-1].y)
        );
    });

    const total = weights.reduce((a, v) => a + v);
    weights = weights.map(w => w / total);

    // resultant force and momentum wrt origin
    const forces = bLineAttachmentPoints3d.map((p, i) => {
        const angle = -wing.sections[i].dihedral * Math.PI / 180;
        const dir = vec3([ 0, Math.sin(angle), Math.cos(angle) ]);
        return dir.multiplyScalar(weights[i]); //todo: seems that last foil has no dihedral...should use the dihedral from previous to last
    });

    const F = forces.reduce((a, v, i) => {
        return a.addVectors(a, v);
    }, vec3());
    const momenta = bLineAttachmentPoints3d.map((p, i) => {
        return -p.y * forces[i].z + p.z * forces[i].y;
    });
    const M = momenta.reduce((a, v) => a + v);

    // solution line z*c +y*s.z -s.z*c = 0
    const c = M/F.z;
    const x = bLineAttachmentPoints3d.map((p, i) => p.x * weights[i]).reduce((a, v) => a + v);

    //direction of line from splitpoint where 2b is an equilibriumpoint
    let dir = vec3([0, -c, -splitPointZ]);
    dir = dir.multiplyScalar(1/dir.length());
    return vec3().addVectors(
        vec3([ x, 0, splitPointZ ]),
        dir.multiplyScalar((1-bridle.sizeFactor)*(-splitPointZ) )
    );

    // return {
    //     p1: vec3([0, 100, -100*sz/c + sz]),
    //     p2: vec3([0, -100, 100*sz/c + sz])
    // };

    //DEBUG: return two points in line where moment vanishes
    //pz == py*Fz/Fy - M0
    // return {
    //     p1: vec3([0, 100, 100*F.z/F.y +M]),
    //     p2: vec3([0, -100, -100*F.z/F.y +M])
    // };
};

const pos3b = (wing, bridle, pos2b, splitPoint) => {
    const { b2LineLength } = bridle;
    const result = pos2b.clone();
    const rel = vec3().subVectors(splitPoint, pos2b);
    return result.addVectors(
        result,
        rel.multiplyScalar(b2LineLength / rel.length())
    );
};

const pos1s = (wing, bridle, pos2, lineAttachmentPoints3d) => {
    return _.range(0, Math.floor(lineAttachmentPoints3d.length/2)).map((i) => {
        const p1 = lineAttachmentPoints3d[i*2];
        const p2 = lineAttachmentPoints3d[i*2 + 1];
        // assume equal pull from both attacment points...
        const midPoint = vec3().addVectors(
            p2,
            vec3().subVectors(
                p1,
                p2
            ).multiplyScalar(0.5)
        );

        return vec3().addVectors(
            pos2,
            vec3().subVectors(
                midPoint,
                pos2
            ).multiplyScalar(0.7)
        );
    });

};

const pos3a = (pos3b, splitPoint, bridle) => {
    let directionFrom3b = vec3().subVectors(splitPoint, pos3b);
    directionFrom3b = directionFrom3b.multiplyScalar(1/directionFrom3b.length() * bridle.pulleyLineLength);
    let result = vec3().addVectors(pos3b, directionFrom3b);
    // add some adhoc x offset don't know what would be appropriate??? Should be pretty small assuming very small bar pressure
    result = vec3().addVectors(result, vec3([bridle.a3xoffset, 0, 0]));
    return result;
};

const pos3c = (pos3b, barEndPoint, bridle) => {
    let directionFrom3b = vec3().subVectors(barEndPoint, pos3b);
    directionFrom3b = directionFrom3b.multiplyScalar(1/directionFrom3b.length() * bridle.pulleyLineLength);
    let result = vec3().addVectors(pos3b, directionFrom3b);
    result = vec3().addVectors(result, vec3([bridle.c3xoffset, 0, 0]));
    return result;
};

const pos2aOrc = (p3, p2b, lineAttachmentPoints3d) => {

    const average = lineAttachmentPoints3d.reduce((a,p) => {
        return a.addVectors(a, p);
    }, vec3());
    average.multiplyScalar(1/lineAttachmentPoints3d.length);


    const dir = vec3().subVectors(average, p3);
    dir.multiplyScalar(1/dir.length());
    const distFactor = Math.abs(p3.z-p2b.z);  //this is a very lazy approximation to the point where z = p2b.z
    const x = p3.x + distFactor * dir.x;
    return vec3([ x, p2b.y, p2b.z ]);
};

export function solveBridle(wing, bridle) {
    const splitPointZ = -15;
    const barEndPoint = vec3([0.0, 0.30, -25.0]);
    const barMidPoint = vec3([0.0, 0.0, -25.0]);
    const foils = wing3d.wingSpecToPoints(wing);
    const bLineAttachmentX = bridle.wingConnections[1].xPos;
    const aLineAttachmentX = bridle.wingConnections[0].xPos;
    const cLineAttachmentX = bridle.wingConnections[2].xPos;

    const bLineAttachmentPoints3d = foils.map((foil3d, foilIndex) => {
        const foilDef = wing.foilDefs[wing.sections[foilIndex].foil];
        return foilPointAtOffset(bLineAttachmentX, foilDef, foil3d, true);
    });
    const aLineAttachmentPoints3d = foils.map((foil3d, foilIndex) => {
        const foilDef = wing.foilDefs[wing.sections[foilIndex].foil];
        return foilPointAtOffset(aLineAttachmentX, foilDef, foil3d, true);
    });
    const cLineAttachmentPoints3d = foils.map((foil3d, foilIndex) => {
        const foilDef = wing.foilDefs[wing.sections[foilIndex].foil];
        return foilPointAtOffset(cLineAttachmentX, foilDef, foil3d, true);
    });

    // const { p1, p2 } = pos2b(wing, bridle, foils, bLineAttachmentPoints3d, splitPoint);
    // const bBridleLinks = [
    //     { nodes: [ { position: p1 }, { position: p2 } ]},
    // ];
    const p2b = pos2b(wing, bridle, foils, bLineAttachmentPoints3d, splitPointZ);
    const splitPoint = vec3([ p2b.x * splitPointZ/barMidPoint.z, 0, splitPointZ]);
    const p3b = pos3b(wing, bridle, p2b, splitPoint);
    const p1bs = pos1s(wing, bridle, p2b, bLineAttachmentPoints3d);
    const p3a = pos3a(p3b, splitPoint, bridle);
    const p3c = pos3c(p3b, barEndPoint, bridle);
    const p2a = pos2aOrc(p3a, p2b, aLineAttachmentPoints3d);
    const p1as = pos1s(wing, bridle, p2a, aLineAttachmentPoints3d);
    const p2c = pos2aOrc(p3c, p2b, cLineAttachmentPoints3d);
    const p1cs = pos1s(wing, bridle, p2c, cLineAttachmentPoints3d);

    const bBridleLinks = [
        //main lines
        { name: "bar_to_split", nodes: [ { position: barMidPoint }, { position: splitPoint } ]},
        { name: "brake",nodes: [ { position: barEndPoint }, { position: p3c } ]},
        { name: "split_to_3a", nodes: [ { position: splitPoint }, { position: p3a } ]},

        { name: "3b_2b", nodes: [ { position: p3b }, { position: p2b } ]},
        { name: "3b_3a", nodes: [ { position: p3b }, { position: p3a } ]},
        { name: "3b_3c", nodes: [ { position: p3b }, { position: p3c } ]},

        ...p1bs.map((p1, i) => ({
            name: `2b_1b_${i}`,
            nodes: [ { position: p2b }, { position: p1 } ]
        })),

        ...bLineAttachmentPoints3d.map((p0, i) => ({
            name: `1b_kite_${i}`,
            nodes: [ { position: p1bs[Math.floor(i/2)] }, { position: p0 } ]
        })),

        { name: "3a_2a", nodes: [ { position: p3a }, { position: p2a } ]},

        ...p1as.map((p1, i) => ({
            name: `2a_1a_i`,
            nodes: [ { position: p2a }, { position: p1 } ]
        })),

        ...aLineAttachmentPoints3d.map((p0, i) => ({
            name: `1a_kite_${i}`,
            nodes: [ { position: p1as[Math.floor(i/2)] }, { position: p0 } ]
        })),

        { name: `3c_2c`, nodes: [ { position: p3c }, { position: p2c } ]},

        ...p1cs.map((p1, i) => ({
            name: `2c_1c_${i}`,
            nodes: [ { position: p2c }, { position: p1 } ]
        })),

        ...cLineAttachmentPoints3d.map((p0, i) => ({
            name: `1c_kite_${i}`,
            nodes: [ { position: p1cs[Math.floor(i/2)] }, { position: p0 } ]
        })),
    ];



    return { links: bBridleLinks };
};



export function printBridle(bridle) {
    const lengths = bridle.links.map(({ name, nodes }) => {
        let rel = new THREE.Vector3().subVectors(nodes[0].position, nodes[1].position);
        let l = rel.length();
        return { name, length: l };
    });

    return lengths.map(({ name, length }) => `${name}: ${Math.round(length*100).toFixed()}`).join('\n') +
        `\ntotalLength: ${Math.round(lengths.reduce((acc, { length }) => (acc + length*100), 0)).toFixed()}`;
}
/*
   ----------------------
   . ---------------------  0-nodes, fixed on kite
   \   /  ---------------  0-lines, fixed length
   \ /
   .   ----------------  1-nodes
   \     --------------  1-lines
   \|/
   .  ---------------  2-nodes
   \  \  --------------  2-lines, one for a, b, c (per side)
   \  \
   \  \  \
   \  .  \  -----------  3b-node, end of be b-bridle, pulley
   \ |\  \  ----------  2 pulley lines a and c
   \|  \ \
   .    \. ---------  3a, 3c-nodes - 2a-line to a-pulley line. 2c-line to c-pulley iine
   \     \
   \     \  ------  brake line to 4c-node, primary line to 4a-node, fixed length
   \     \
   .-----.       bar-nodes, fixed

 */

