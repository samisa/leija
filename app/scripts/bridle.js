import _ from 'lodash';
import * as THREE from 'three';
import * as wing3d from './wing3d';

export const testBridleSpec = {
    mainLineLength: 20,
    cascade1Length: 1.0,
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

//TODO:move to utils
export function vec3(array = null) {
    return array ? new THREE.Vector3().fromArray(array) : new THREE.Vector3();
}

//TODO:move to utils
export function vec2(array = null) {
    return array ? new THREE.Vector2().fromArray(array) : new THREE.Vector2();
}

export function foilLeadingEdgePointIndex(foil) {
    return  _.reduce(foil, (accumulator, point, index) => {
        let lePointIndex = accumulator;
        lePointIndex = (foil[lePointIndex].x > point.x) ?  index : lePointIndex;
        return lePointIndex;
    }, 0);
}

//TODO:move to utils.
export function foilBottomPointIndex(offset, foil) {
    let lePointIndex = foilLeadingEdgePointIndex(foil);
    let leV = foil[lePointIndex];
    let teV = foil[foil.length-1];
    // le + offset * (te - le)
    let chordPointAtOffset = vec2().subVectors(teV, leV).multiplyScalar(offset).add(leV);
    // now find point in foil's bottom side closest to the line that goes through
    // bottomside is points from le index to foil.length
    // chordPointAtOffset and perpendicular to chord.
    // TODO: Can be simplified as this is now in 2d
    let normal = vec2().subVectors(teV, leV); //not normalized but should ot matter
    let { closestPointIndex } = _.reduce(foil.slice(lePointIndex, foil.length), (accumulator, point, i) => {
        let index = i + lePointIndex; //cause we sliced...
        let { closestPoint, distSqr } = accumulator;
        let newDistSqr = normal.x * (chordPointAtOffset.x-point.x) +
                         normal.y * (chordPointAtOffset.y-point.y);
        newDistSqr = newDistSqr * newDistSqr;
        if (distSqr && distSqr < newDistSqr) {
            return accumulator;
        } else {
            return { closestPointIndex: index, closestPoint: point, distSqr: newDistSqr };
        }
    }, {});

    return closestPointIndex;
}

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
export function solveBridle(net) {
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




// let fixedLengths = [[], [], []];
// fixedLengths[0][0] = 0.46108148756545436;
// fixedLengths[0][1] = 0.4062909065485605;
// fixedLengths[0][2] = 0.4348278240736058;
// fixedLengths[0][3] = 0.3841251793641871;
// fixedLengths[0][4] = 0.407576027043698;
// fixedLengths[0][5] = 0.35996026882620474;
// fixedLengths[0][6] = 0.38551373493374963;
// fixedLengths[0][7] = 0.3544586367385954;

// fixedLengths[1][0] = 0.37814663628671874;
// fixedLengths[1][1] = 0.2984787531704365;
// fixedLengths[1][2] = 0.33756945560151036;
// fixedLengths[1][3] = 0.28363942291274175;
// fixedLengths[1][4] = 0.3044807770130088;
// fixedLengths[1][5] = 0.2785326544274991;
// fixedLengths[1][6] = 0.28924770259340066;
// fixedLengths[1][7] = 0.2854142451901452;

// fixedLengths[2][0] = 0.5203898296448588;
// fixedLengths[2][1] = 0.4607758335754818;
// fixedLengths[2][2] = 0.4682575619855631;
// fixedLengths[2][3] = 0.4018966878412104;
// fixedLengths[2][4] = 0.4275360441773012;
// fixedLengths[2][5] = 0.35495708621875843;
// fixedLengths[2][6] = 0.39218293646651214;
// fixedLengths[2][7] = 0.24863048432172394;
/*
--------------------------------------------
cascade-1-row-0-line-0: 0.9940888924338216
cascade-1-row-0-line-1: 0.9073086126387557
cascade-1-row-0-line-2: 0.815844935450249
cascade-1-row-0-line-3: 0.712875180472101
cascade-1-row-1-line-0: 0.8363292145947562
cascade-1-row-1-line-1: 0.7129511986402148
cascade-1-row-1-line-2: 0.6154063860053025
cascade-1-row-1-line-3: 0.5341212381528352
cascade-1-row-2-line-0: 1.0371802989003935
cascade-1-row-2-line-1: 0.9345851422532443
cascade-1-row-2-line-2: 0.8130454004458643
cascade-1-row-2-line-3: 0.6401964670477147
--------------------------------------------
cascade-2-line-a: 1.6533449345269837
cascade-2-line-b: 1.2597140792001222
cascade-2-line-c: 1.6415141079625144
pulley-line-a: 0.697391934498364
pulley-line-b: 0.6533432051828513
primary-line: 20.000014048549264
brake-line: 20.00001416123539
*/

export function init3lineNetForSolver(bridleSpec, wing) {
    // nodes for fixed kite points:
    let foils = wing3d.wingSpecToPoints(wing);
    let node0Rows = _.map(bridleSpec.wingConnections, (connectionRow) => {
        return connectionRow.foils.map((foilIndex) => {
            let foil3d = foils[foilIndex];
            //TODO: store foildefs as vector2s
            let foil2d = wing.foilDefs[wing.sections[foilIndex].foil].map((pt) => { return vec2(pt); });
            return {
                position: foil3d[foilBottomPointIndex(connectionRow.xPos, foil2d)].clone(),
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
      .    \. ---------  3a, 3b-nodes - 2a-line to a-pulley line. 2c-line to c-pulley iine
       \     \
        \     \  ------  brake line to 4c-node, primary line to 4a-node, fixed length
         \     \
          .-----.       bar-nodes, fixed

*/

