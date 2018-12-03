import _ from 'lodash';
import * as THREE from 'three';
import * as wing3d from './wing3d';

import { vec2, vec3, foilLeadingEdgePointIndex, foilPointIndex, foilBottomPointIndex } from './utils';

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
           foils: [0,1,2,3,4,5,6,7]
        },
        {  // b-lines
            xPos: 0.3, //fraction of chord length
           foils: [0,1,2,3,4,5,6,7]
        },
        {  // c-lines
            xPos: 1.0, //fraction of chord length
           foils: [0,1,2,3,4,5,6,7]
        }
    ],
    wingLineLength: 0.3, //the short lines that  connect to wing
    bLineLength: 1
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
        dir.multiplyScalar(13) //TODO take from params the distance of 2b from split point.
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

const pos1bs = (wing, bridle, pos2b, bLineAttachmentPoints3d) => {
    return _.range(0, Math.floor(bLineAttachmentPoints3d.length/2)).map((i) => {
        const p1 = bLineAttachmentPoints3d[i*2];
        const p2 = bLineAttachmentPoints3d[i*2 + 1];
        // assume equal pull from both attacment points...
        const midPoint = vec3().addVectors(
            p2,
            vec3().subVectors(
                p1,
                p2
            ).multiplyScalar(0.5)
        );

        return vec3().addVectors(
            pos2b,
            vec3().subVectors(
                midPoint,
                pos2b
            ).multiplyScalar(0.7)
        );
    });

};

const pos3a = (pos3b, splitPoint) => {
    let directionFrom3b = vec3().subVectors(splitPoint, pos3b);
    directionFrom3b = directionFrom3b.multiplyScalar(1/directionFrom3b.length() * 0.7);
    let result = vec3().addVectors(pos3b, directionFrom3b);
    // add some adhoc x offset don't know what would be appropriate??? Should be pretty small assuming very small bar pressure
    result = vec3().addVectors(result, vec3([0.02, 0, 0]));
    return result;
};

const pos3c = (pos3b, barEndPoint) => {
    let directionFrom3b = vec3().subVectors(barEndPoint, pos3b);
    directionFrom3b = directionFrom3b.multiplyScalar(1/directionFrom3b.length() * 0.7);
    let result = vec3().addVectors(pos3b, directionFrom3b);
    result = vec3().addVectors(result, vec3([-0.1, 0, 0]));
    return result;
};

export function solveBridle(wing, bridle) {
    const splitPointZ = -15;
    const barEndPoint = vec3([0.0, 0.30, -25.0]);
    const barMidPoint = vec3([0.0, 0.0, -25.0]);
    const foils = wing3d.wingSpecToPoints(wing);
    const bLineAttachmentX = bridle.wingConnections[1].xPos;
    const bLineAttachmentPoints3d = foils.map((foil3d, foilIndex) => {
        const foilDef = wing.foilDefs[wing.sections[foilIndex].foil];
        return foil3d[foilBottomPointIndex(bLineAttachmentX, foilDef)];
    });

    // const { p1, p2 } = pos2b(wing, bridle, foils, bLineAttachmentPoints3d, splitPoint);
    // const bBridleLinks = [
    //     { nodes: [ { position: p1 }, { position: p2 } ]},
    // ];
    const p2b = pos2b(wing, bridle, foils, bLineAttachmentPoints3d, splitPointZ);
    const splitPoint = vec3([ p2b.x * splitPointZ/barMidPoint.z, 0, splitPointZ]);
    const p3b = pos3b(wing, bridle, p2b, splitPoint);
    const p1bs = pos1bs(wing, bridle, p2b, bLineAttachmentPoints3d);
    const p3a = pos3a(p3b, splitPoint);
    const p3c = pos3a(p3b, barEndPoint);
    const bBridleLinks = [
        //main lines
        { nodes: [ { position: barMidPoint }, { position: splitPoint } ]},
        { nodes: [ { position: barEndPoint }, { position: p3c } ]},
        { nodes: [ { position: splitPoint }, { position: p3a } ]},

        { nodes: [ { position: p3b }, { position: p2b } ]},
        { nodes: [ { position: p3b }, { position: p3a } ]},
        { nodes: [ { position: p3b }, { position: p3c } ]},
        ...p1bs.map(p1b => ({ nodes: [ { position: p2b }, { position: p1b } ]})),
        ...bLineAttachmentPoints3d.map((p0b, i) => ({ nodes: [ { position: p1bs[Math.floor(i/2)] }, { position: p0b } ] })),
    ];

    return { links: bBridleLinks };
};










// net is a collection nodes, and collection of links.
    // each node has:
    // position: position,
    // fixed: if truthy position is fixed,
    // links: collection, each link has referene to two nodes and,
    //      length: the length this link should stabilize to or undefined for free links
    //              ( whose length will be determined by this algorithm)
    // all vectors are threejs vrctors
    // The algorithm:
    // spring-net type of iterative simulation:
    // links with length have force of type k*(L-l)
    // free-length links -k*l
    // once stable enough, decrease force used for free-length links until
    // fixed length links are close enough to desired lengths
    export function solveBridle2(net) {
    let k = 1;
    let kFree = k;
    let maxDeltaSqr = 0;
    let maxDeltaVSqr = 0;

    // force on first node
    function linkForce(link) {
        let pos0 = link.nodes[0].position;
        let pos1 = link.nodes[1].position;
        let L = link.length;
        let rel = new THREE.Vector3().subVectors(pos1, pos0);
        let d2 = rel.length();
        let theK = L === undefined ? kFree : k;
        theK = link.weight === undefined ? theK : link.weight * theK;
        return L === undefined ?
               rel.multiplyScalar(theK) :
               rel.multiplyScalar(theK*(Math.max(d2 - L, 0)));
    };

    function iterate() {
        maxDeltaSqr = 0;
        maxDeltaVSqr = 0;

        // zeroize forces on nodes
        _(net.nodes).filter((node) => { return !node.fixed; }).each((node) => {
            node.force = new THREE.Vector3().set(0, 0, 0);
        });

        // for each link calculate force and add it to the nodes
        _(net.links).each((link) => {
            let force = linkForce(link);
            link.nodes[0].fixed || link.nodes[0].force.add(force);
            link.nodes[1].fixed || link.nodes[1].force.sub(force);
        });

        /////l

        _(net.nodes).filter((node) => { return !node.fixed; }).each((node) => {
            node.velocity = node.velocity || (new THREE.Vector3().set(0, 0, 0));
            node.velocity.add(node.force.multiplyScalar(0.01));
            node.velocity.multiplyScalar(0.7);
            if (node.yFixed) { node.velocity.y = 0; }
            node.position.add(new THREE.Vector3().copy(node.velocity).multiplyScalar(0.01));
            let deltaVSq = node.velocity.lengthSq();
            maxDeltaVSqr = Math.max(deltaVSq, maxDeltaVSqr);
        });

        // _(net.links).each((link) => {
        //     if (!link.length) { return; }
        //     let pos0 = link.nodes[0].position;
        //     let pos1 = link.nodes[1].position;
        //     let L = link.length;
        //     let rel = new THREE.Vector3().subVectors(pos1, pos0);
        //     let d2 = L-rel.length();
        //     d2 = d2*d2;
        //     maxDeltaSqr = Math.max(d2, maxDeltaSqr);
        // });

    };

    do {
        do {
            iterate();
        } while (maxDeltaVSqr > 0.000001);

        console.log(maxDeltaSqr);
        kFree /= 2;
        //console.log(kFree);
    } while(kFree > 0.0001);
}



export function init3lineNetForSolver(bridleSpec, wing) {
    // nodes for fixed kite points:
    let foils = wing3d.wingSpecToPoints(wing);
    let node0Rows = _.map(bridleSpec.wingConnections, (connectionRow) => {
        return connectionRow.foils.map((foilIndex) => {
            let foil3d = foils[foilIndex];
            //TODO: store foildefs as vector2s
            const foilDef = wing.foilDefs[wing.sections[foilIndex].foil];
            let foil2d = wing.foilDefs[wing.sections[foilIndex].foil].map((pt) => { return vec2(pt); });
            return {
                position: foil3d[foilBottomPointIndex(connectionRow.xPos, foilDef)].clone(),
                fixed: true
            };
        });
    });

    //links for them:
    let line0Rows = _.map(node0Rows, (nodeRow, rowIndex) => {
        return _.map(nodeRow, (node, index) => {
            return {
                //length: fixedLengths[rowIndex][index],
                nodes: [ node ],
                weight: 1/(1+3/(index+1))* 0.5,
                name: `cascade-0-row-${rowIndex}-line-${index}`
            };
        });
    });

    //create 1st cascade nodes and add to links:
    let node1Rows = _.map(line0Rows, (row) => {
        return _(row).chunk(2).map((linkPair) => {
            let node = { position: new THREE.Vector3().set(0, 0, 0) };
            _.each(linkPair, (link) => { link.nodes[1] = node; });
            return node;
        }).value();
    });

    //links for them:
    let line1Rows = _.map(node1Rows, (nodeRow, rowIndex) => {
        return _.map(nodeRow, (node, index) => {
            return {
                nodes: [ node ],
                weight: 1/(1+2/(index+1))/2,
                name: `cascade-1-row-${rowIndex}-line-${index}`
                //length: bridleSpec.cascade1Length
            };
        });
    });

    const FIXED_NODE2S = [
        { position: new THREE.Vector3().set(0.2, 0.2, -1.5), yFixed: true },//front
        { position: new THREE.Vector3().set(0.4, 0.3, -1.6), yFixed: true },// mid
        { position: new THREE.Vector3().set(0.7, 0.5, -1.7)/*, yFixed: true*/ } //back
    ];
    //create 2nd cascade nodes and add to links:
    let node2s = _.map(line1Rows, (row, i) => {
        //        let node = { position: new THREE.Vector3().set(0, 0, 0) };
        let node = FIXED_NODE2S[i];
        _(row).each((link) => { link.nodes[1] = node; });
        return node;
    });


    let node3a = { position: new THREE.Vector3().set(0, 0, 0)/*, yFixed: true*/ };
    let node3b = { position: new THREE.Vector3().set(0, 0, 0) };
    let node3c = { position: new THREE.Vector3().set(0, 0, 0) };
    let barEndNode = { position: new THREE.Vector3().set(0, bridleSpec.barLength/2, -bridleSpec.mainLineLength - 2.5), fixed: true };
    let barMidNode = { position: new THREE.Vector3().set(0, 0, -bridleSpec.mainLineLength - 2.5), fixed: true };
    let line2a = { nodes: [ node2s[0], node3a ], name: 'cascade-2-line-a' };
    let line2b = { nodes: [ node2s[1], node3b ], name: 'cascade-2-line-b' };
    let line2c = { nodes: [ node2s[2], node3c ], name: 'cascade-2-line-c' };
    let pulleyLinea = { nodes: [ node3b, node3a ], name: 'pulley-line-a' };
    let pulleyLineb = { nodes: [ node3b, node3c ], name: 'pulley-line-b' };
    let primaryLine = { nodes: [ node3a, barMidNode ], length: bridleSpec.mainLineLength, name: 'primary-line' };
    let brakeLine = { nodes: [ node3c, barEndNode ], length: bridleSpec.mainLineLength, name: 'brake-line' };
    //finally concatenate links and nodes:
    return {
        nodes: _.flatten([_.flatten(node0Rows), _.flatten(node1Rows), node2s,
                          [node3a, node3b, node3c, barEndNode, barMidNode]]),
        links: _.flatten([_.flatten(line0Rows), _.flatten(line1Rows),
                          [line2a, line2b, line2c, pulleyLinea, pulleyLineb, primaryLine, brakeLine]])
    };
}


export function printBridle(bridle) {
    return bridle.links.map(({ name, nodes }) => {
        let rel = new THREE.Vector3().subVectors(nodes[0].position, nodes[1].position);
        let l = rel.length();
        return `${name}: ${Math.round(l*100).toFixed()}`;
    }).join('\n');
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

