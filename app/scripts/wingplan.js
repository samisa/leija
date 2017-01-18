import _ from 'lodash';
import * as THREE from 'three';
import * as d3 from 'd3';

import { wingSpecToPoints } from './wing3d';

function foilEdgePointIndices(foil) {
    return  _.reduce(foil, (accumulator, point, index) => {
        let { lePointIndex, tePointIndex } = accumulator;
        lePointIndex = (lePointIndex !== undefined && foil[lePointIndex][0] > point[0]) ? lePointIndex : index;
        tePointIndex = (tePointIndex !== undefined && foil[tePointIndex][0] < point[0]) ? tePointIndex : index;
        return { lePointIndex, tePointIndex };
    }, {});
}

function vec3(array = null) {
    return array ? new THREE.Vector3().fromArray(array) : new THREE.Vector3();
}

function vec2(array = null) {
    return array ? new THREE.Vector2().fromArray(array) : new THREE.Vector2();
}

// too bad threejs does not support 2d transformations and matrices.
function rotate2(vec, angle) {
    vec.set(Math.cos(angle) * vec.x - Math.sin(angle) * vec.y, Math.sin(angle) * vec.x + Math.cos(angle) * vec.y);
};

function wingToFoilSheetOutlines(wing) {
    let  { foilDefs, sections } = wing;
    return sections.map((section) => {
        return { outline: foilDefs[section.foil].map((point) => { return vec2(point).multiplyScalar(section.chord); }) };
    });
}

function sectionEdgesToSheetOutline(foil1Edge, foil2Edge) {
    // for odd index triangles,  corner 0 meets corner 0 and corner 1 meets corner 2 of previous triangle
    // for even index triangles, corner 0 meets corner 2 and corner 1 meets corner 1 of previous triangle
    //    |            |
    //    --------------
    //    |2      1 / 2|
    // odd|      /     |
    //    |0  /        | even
    //    |/ 0        1|
    //    --------------
    //
    let triangles =  _(_.range(0, foil1Edge.length - 1)).map((n) => {
        return [_.map([ foil1Edge[n],     foil2Edge[n], foil2Edge[n+1] ], vec3),
                _.map([ foil1Edge[n],  foil2Edge[n + 1], foil1Edge[n+1] ], vec3)];
    }).flatten().value();

    triangles =  _.map(triangles, (tri) => {
        //translate so that corner0 is origin
        tri[1].sub(tri[0]);
        tri[2].sub(tri[0]);
        tri[0].set(0, 0, 0);

        // handle the case where triangle's normal points down
        // -> it's corner 2 should be mirrored across the vertical plane where 01 edge resides
        if (tri[1].x * tri[2].y - tri[1].y * tri[2].x < 0) {
            let rel01Unit = tri[1].clone().normalize();
            let xyprojectionUnit = vec3().set(rel01Unit.x, rel01Unit.y, 0).normalize();
            let relVecFrom01EdgeToCorner2 = tri[2].clone()
                    .sub(xyprojectionUnit.clone().multiplyScalar(tri[2].dot(xyprojectionUnit)));
            tri[2].sub(vec3().set(relVecFrom01EdgeToCorner2.x*2, relVecFrom01EdgeToCorner2.y*2, 0));
        }

        //rotate 0,1 edge to x,y plane around corner 0
        let rel01Unit = tri[1].clone().normalize();
        let xyprojectionUnit = vec3().set(rel01Unit.x, rel01Unit.y, 0).normalize();
        let quaternion = new THREE.Quaternion().setFromUnitVectors(rel01Unit, xyprojectionUnit );
        let rotation = new THREE.Matrix4().makeRotationFromQuaternion( quaternion );
        tri[1].applyMatrix4(rotation);
        tri[2].applyMatrix4(rotation);

        //rotate along 0,1 edge (xyprojectionUnit should do) so that also corner 2 is in xy plane
        let relVecFrom01EdgeToCorner2Unit = tri[2].clone()
                .sub(xyprojectionUnit.clone().multiplyScalar(tri[2].dot(xyprojectionUnit)))
                .normalize();
        xyprojectionUnit = vec3().set(relVecFrom01EdgeToCorner2Unit.x, relVecFrom01EdgeToCorner2Unit.y, 0).normalize();
        quaternion = new THREE.Quaternion().setFromUnitVectors(relVecFrom01EdgeToCorner2Unit, xyprojectionUnit);
        rotation = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
        tri[2].applyMatrix4(rotation); //debug: now z component should be zero for all corners
        return _.map(tri, (corner) => { return vec2().set(corner.x, corner.y); });
    });

    // Now we are in 2d
    // translate + rotate each triangle so that it meets previous triangle
    let previous = triangles[0]; //leave first triangle as is
    for (let i = 1; i < triangles.length; i++) {
        let even = i % 2 === 0;
        let tri = triangles[i];
        //rotate so that bottom edge aligns with top edge of previous triangle
        let toVector = even ? vec2().subVectors(previous[1], previous[2]) : vec2().subVectors(previous[2], previous[0]);
        let fromVector = vec2().subVectors(tri[1], tri[0]);
        let angle = toVector.angle() - fromVector.angle();
        rotate2(tri[1], angle);
        rotate2(tri[2], angle);
        //translate so that the edges meet
        let translation = even ? previous[2] : previous[0];
        _.each(tri, (corner) => { corner.add(translation); });
        previous = tri;
    }

    let sheetLeftOutline = _(triangles).map((tri, index) => { return index % 2 === 0 ? null : tri[0]; }).compact().value();
    sheetLeftOutline.push(triangles[triangles.length-1][2]);
    let sheetRightOutline = _(triangles).map((tri, index) => { return index % 2 === 0 ? tri[1] : null; }).compact().reverse().value();
    sheetRightOutline.push(triangles[0][1]);
    sheetRightOutline.push(sheetLeftOutline[0]);
    return _.reverse(sheetLeftOutline.concat(sheetRightOutline)); //finally reverse to make it run ccw
}

export function project(wing) {
    let foils = wingSpecToPoints(wing);

    let topSheets = [];
    let bottomSheets = [];

    for (let foilIndex = 0; foilIndex < foils.length - 1; foilIndex++) {
        let foil1 = foils[foilIndex];
        let foil2 = foils[foilIndex + 1];

        let foilEdgePointIndices1 = foilEdgePointIndices(foil1);
        let foilEdgePointIndices2 = foilEdgePointIndices(foil2);
        let leIndex1 = foilEdgePointIndices1.lePointIndex;
        let teIndex1 = foilEdgePointIndices1.tePointIndex;
        let leIndex2 = foilEdgePointIndices2.lePointIndex;
        let teIndex2 = foilEdgePointIndices2.tePointIndex;
        let foil1TopEdge = foil1.slice(0, teIndex1);
        let foil2TopEdge = foil2.slice(0, teIndex2);
        let foil1BottomEdge = foil1.slice(teIndex1, foil1.length);
        let foil2BottomEdge = foil2.slice(teIndex2, foil2.length);
        topSheets.push({ outline: sectionEdgesToSheetOutline(foil1TopEdge, foil2TopEdge) });
        bottomSheets.push({ outline: sectionEdgesToSheetOutline(foil1BottomEdge, foil2BottomEdge) });
    }
    // air holes for  bottom sheets
    // foil air holes
    // markers for bridle attachment points
    return { topSheets, bottomSheets, foilSheets: wingToFoilSheetOutlines(wing) };
}


export function sheetsToSVG(sheets, config={ seamAllowance: 0.01 }) {
    let addSeamAllowance = (sheet) => {
        let seam = [];
        for (let i = 0; i < sheet.outline.length; i++) {
            let p1 = sheet.outline[i];
            let p2 = sheet.outline[i+1 === sheet.outline.length ? 0 : i + 1];
            let p1Top2Rel = p2.clone().sub(p1);
            let normal = vec2().set(p1Top2Rel.y, -p1Top2Rel.x).normalize();
            seam.push(p1.clone()
                      .add(p1Top2Rel.clone().multiplyScalar(0.5))
                      .add(normal.multiplyScalar(config.seamAllowance)));


        }
        return Object.assign({}, sheet, { seam });
    };

    // fill gaps between points
    let fillOutline = (sheet, maxDist) => {
        let filled = [];
        for (let i = 0; i < sheet.outline.length; i++) {
            let p1 = sheet.outline[i];
            let p2 = i + 1 === sheet.outline.length ? sheet.outline[0] : sheet.outline[i + 1];
            filled.push(p1);
            let next = p1;
            let p1Top2Unit = p2.clone().sub(p1).normalize();
            while (next.distanceToSquared(p2) > maxDist * maxDist) {
                next = next.clone().add(p1Top2Unit.clone().multiplyScalar(0.9 * maxDist));
                filled.push(next);
            }
        }
        return Object.assign({}, sheet, { outline: filled });
    };

    let sheetToSVG = (sheet) => {
        let { outline, seam } = addSeamAllowance(fillOutline(sheet, 0.005));

        var lineFunction = d3.line()
                .x(function(d) { return d.x; })
                .y(function(d) { return d.y; });

        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        var svgContainer = d3.select(svg)
                .attr("width", 1600)
                .attr("height", 1600)
                .attr("viewBox", "-1.1 -1.1 2.2 2.2");

        var outlineGraph = svgContainer.append("path")
                .attr("d", lineFunction(outline))
                .attr("stroke", "black")
                .attr("stroke-width", 0.001)
                .attr("fill", "none");

        var seamGraph = svgContainer.append("path")
                .attr("d", lineFunction(seam))
                .style("stroke-dasharray", ("0.004, 0.004"))
                .attr("class", "line")
                .attr("stroke", "black")
                .attr("stroke-width", 0.001)
                .attr("fill", "none");

        let svgString = (new window.XMLSerializer).serializeToString(svg);
        document.body.appendChild(svg);
    };

    _.each(sheets.topSheets, sheetToSVG);
    _.each(sheets.foilSheets, sheetToSVG);
//    _.each(sheets.bottomSheets, sheetToSVG);
}

