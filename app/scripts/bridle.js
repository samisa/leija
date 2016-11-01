import _ from 'lodash';
import * as THREE from 'three';
import * as wing3d from './wing3d';

export const testBridleSpec = {
    mainLineLength: 20,
    barLength: 0.5,
    nRows: 3,
    towPoint: 0.2, //percent back from center le.
    wingConnections: [
        {
            xPos: 0,
            foils: [0,1,2,3,4,5,6,7]
        },
        {
            xPos: 0.3, //fraction of chord length
            foils: [0,1,2,3,4,5,6,7]
        },
        {
            xPos: 1.0, //fraction of chord length
            foils: [0,1,2,3,4,5,6,7]
        }
    ],
    wingLineLength: 0.3, //the shoort linies that  connect to wing
    aLineLowEnd: [0.20, 0.5, -3.0]
};

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
    let kFree = k / 3;
    let maxDeltaSqr = 0;

    // force on first node
    function linkForce(pos0, pos1, L) {
        let rel = new THREE.Vector3().subVectors(pos1, pos0);
        let d2 = rel.lengthSq();
        return L === undefined ?
            rel.multiplyScalar(kFree) :
            rel.multiplyScalar(k*(Math.max(d2 - L*L, 0)));
    };

    function iterate() {
        // zeroize forces on nodes
        _(net.nodes).filter((node) => { return !node.fixed; }).each((node) => {
            node.force = new THREE.Vector3().set(0, 0, 0);
        });

        // for each link calculate force and add it to the  nodes
       _(net.links).each((link) => {
           let force = linkForce(link.nodes[0].position, link.nodes[1].position, link.length);
           link.nodes[0].fixed || link.nodes[0].force.add(force);
           link.nodes[1].fixed || link.nodes[1].force.sub(force);
       });

        maxDeltaSqr = 0;
        // apply forces on nodes. assume velocity does not accumulate... propably won't work............
        _(net.nodes).filter((node) => { return !node.fixed; }).each((node) => {
            node.velocity = node.velocity || (new THREE.Vector3().set(0, 0, 0));
            node.velocity.add(node.force.multiplyScalar(0.01));
            node.velocity.multiplyScalar(0.7);
            node.position.add(new THREE.Vector3().copy(node.velocity).multiplyScalar(0.01));
            let deltaSq = node.velocity.lengthSq();
            maxDeltaSqr = Math.max(deltaSq, maxDeltaSqr);
       });
    };

    do {
        do {
            iterate();
        } while (maxDeltaSqr > 0.000001);

        kFree /= 2;
        console.log(kFree);
    } while(kFree > 0.0001);
}

export function initNetForSolver(bridleSpec, wing) {
    // nodes for fixed kite points:
    let foils = wing3d.wingSpecToPoints(wing);
    let node0Rows = _.map(bridleSpec.wingConnections, (connectionRow) => {
        return connectionRow.foils.map((foilIndex) => {
            return {
                position: new THREE.Vector3().fromArray(foilBottomPoint(connectionRow.xPos, foils[foilIndex])),
                fixed: true
            };
        });
    });

    //links for them:
    let line0Rows = _.map(node0Rows, (nodeRow) => {
        return _.map(nodeRow, (node) => {
            return {
                length: bridleSpec.wingLineLength,
                nodes: [ node ]
            };
        });
    });

    //create 1st order nodes and add to links:
    let node1Rows = _.map(line0Rows, (row) => {
        return _(row).chunk(2).map((linkPair) => {
            let node = { position: new THREE.Vector3().set(0, 0, 0) };
            _.each(linkPair, (link) => { link.nodes[1] = node; });
            return node;
        }).value();
    });

    //links for them:
    let line1Rows = _.map(node1Rows, (nodeRow) => {
        return _.map(nodeRow, (node) => {
            return {
                nodes: [ node ]
            };
        });
    });

    //create 2nd order nodes and add to links:
    let node2s = _.map(line1Rows, (row) => {
        let node = { position: new THREE.Vector3().set(0, 0, 0) };
        _(row).each((link) => { link.nodes[1] = node; });
        return node;
    });

    //links for them:
    let line2s = _.map(node2s, (node) => {
        return { length: bridleSpec.mainLineLength, nodes: [ node ] };
    });

    let node3 = { position: new THREE.Vector3().set( 0, 0, -22), fixed: true };
    _(line2s).each((link) => { link.nodes[1] = node3; });

    //finally concatenate links and nodes:
    return {
        nodes: _.flatten([_.flatten(node0Rows), _.flatten(node1Rows), node2s, [node3]]),
        links: _.flatten([_.flatten(line0Rows), _.flatten(line1Rows), line2s])
    };
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
   \  .  \  -----------  3-node, end of be b-bridle
    \ |\  \  ----------  2 pulley lines a and c
     \|  \ \
      .    \. ---------  i4-nodes - 2a-line to a-pulley line. 2c-line to c-pulley iine
       \     \
        \     \  ------  brake line to 4c-node, primary line to 4a-node, fixed length
         \     \
          .-----.       bar-nodes, fixed

*/

