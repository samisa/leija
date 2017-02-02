import _ from 'lodash';
import * as THREE from 'three';
import * as d3 from 'd3';

import { wingSpecToPoints } from './wing3d';
import { foilBottomPointIndex, foilLeadingEdgePointIndex, vec3, vec2 } from './bridle';

// too bad threejs does not support 2d transformations and matrices.
function rotate2(vec, angle) {
    vec.set(Math.cos(angle) * vec.x - Math.sin(angle) * vec.y, Math.sin(angle) * vec.x + Math.cos(angle) * vec.y);
};

function wingToFoilSheetOutlines(wing) {
    let  { foilDefs, sections } = wing;
    return sections.map((section) => {
        return { outline: { profile: foilDefs[section.foil].map((point) => { return vec2(point).multiplyScalar(section.chord); }) } };
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
        return [[ foil1Edge[n].clone(),     foil2Edge[n].clone(), foil2Edge[n+1].clone() ],
                [ foil1Edge[n].clone(),  foil2Edge[n + 1].clone(), foil1Edge[n+1].clone() ]];
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

    return {
        outline: {//reverse(sheetLeftOutline.concat(sheetRightOutline)),
            right: sheetRightOutline,
            te: [sheetRightOutline[sheetRightOutline.length - 1], sheetLeftOutline[0]],
            left: sheetLeftOutline,
            le: [sheetLeftOutline[sheetLeftOutline.length - 1], sheetRightOutline[0]]
        }
    };
}

function project(wing) {
    let foils = wingSpecToPoints(wing);

    let topSheets = [];
    let bottomSheets = [];

    for (let foilIndex = 0; foilIndex < foils.length - 1; foilIndex++) {
        let foil1 = foils[foilIndex];
        let foil2 = foils[foilIndex + 1];

        let leIndex1 = foilLeadingEdgePointIndex(foil1);
        let leIndex2 = foilLeadingEdgePointIndex(foil2);
        let foil1TopEdge = foil1.slice(0, leIndex1);
        let foil2TopEdge = foil2.slice(0, leIndex2);
        let foil1BottomEdge = foil1.slice(leIndex1, foil1.length);
        let foil2BottomEdge = foil2.slice(leIndex2, foil2.length);
        topSheets.push(sectionEdgesToSheetOutline(foil1TopEdge, foil2TopEdge));
        bottomSheets.push(sectionEdgesToSheetOutline(foil1BottomEdge.reverse(), foil2BottomEdge.reverse()));
    }

    // TODO:
    // air holes for  bottom sheets
    // foil air holes
    return { topSheets, bottomSheets, foilSheets: wingToFoilSheetOutlines(wing) };
}

export function planSVGS({ wing, bridle }, config={ seamAllowance: { right: 0.01, left: 0.01, le: 0.01, te: 0.02, profile: 0.01 } }) {
    let addSeamAllowances = (sheet) => {
        let seams = _.mapValues(sheet.outline, (edge, edgeName) => {
            let seam = [];
            for (let i = 0; i < edge.length; i++) {
                let p1 = edge[i];
                let p2 = edge[i+1 === edge.length ? i - 1 : i + 1];
                let p1Top2Rel = p2.clone().sub(p1);
                let normal1 = edgeName === 'profile' ? vec2().set(p1Top2Rel.y, -p1Top2Rel.x).normalize(): vec2().set(-p1Top2Rel.y, p1Top2Rel.x).normalize(); //quick fix... profile outlines run in opposite direction.
                seam.push(p1.clone().add(normal1.multiplyScalar(config.seamAllowance[edgeName])));
            }
            return seam;
        });
        return Object.assign({}, sheet, { seams });
    };

    // fill gaps between points
    let fillOutline = (sheet, maxDist) => {
        let filledOutline = _.mapValues(sheet.outline, (edge) => {
            let filled = [];
            for (let i = 0; i < edge.length-1; i++) {
                let p1 = edge[i];
                let p2 = edge[i + 1];
                filled.push(p1);
                let next = p1;
                let p1Top2Unit = p2.clone().sub(p1).normalize();
                while (next.distanceToSquared(p2) > maxDist * maxDist) {
                    next = next.clone().add(p1Top2Unit.clone().multiplyScalar(0.9 * maxDist));
                    filled.push(next);
                }
            }
            return filled;
        });

        return Object.assign({}, sheet, { outline: filledOutline });
    };

    const lineFunction = d3.line()
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; });

    const createBoundingSVGContainer = (svg, objects) => {
        let minx, miny, maxx, maxy;
        let margin = 0.02; //2cm

        [].concat(...objects).map((point) => {
            minx = minx === undefined ? point.x : minx < point.x ? minx : point.x;
            miny = miny === undefined ? point.y : miny < point.y ? miny : point.y;
            maxx = maxx === undefined ? point.x : maxx > point.x ? maxx : point.x;
            maxy = maxy === undefined ? point.y : maxy > point.y ? maxy : point.y;
        });

        minx = minx - margin;
        miny = miny - margin;
        const width = maxx - minx + margin;
        const height = maxy - miny + margin;

        return d3.select(svg)
                .attr("width", width * 1000 + "mm")
                .attr("height", height * 1000 + "mm")
            .attr("viewBox", [minx, miny, width, height].join(' '));

    };

    const outlineAndSeam = (svg, sheet) => {
        let { outline, seams } = addSeamAllowances(fillOutline(sheet, 0.005));
        const svgContainer = createBoundingSVGContainer(svg, _.values(outline).concat(_.values(seams)));

        _.each(outline, (edge) => {
            svgContainer.append("path")
                .attr("d", lineFunction(edge))
                .attr("stroke", "black")
                .attr("stroke-width", 0.001)
                .attr("fill", "none");
        });

        _.each(seams, (seam) => {
            svgContainer.append("path")
                .attr("d", lineFunction(seam))
                .style("stroke-dasharray", ("0.004, 0.004"))
                .attr("class", "line")
                .attr("stroke", "black")
                .attr("stroke-width", 0.001)
                .attr("fill", "none");
        });

        return svgContainer;
    };

    const addSheetLabel = (label, svgContainer) => {
        svgContainer.append("text")
            .attr('x', 0)
            .attr('y', 0)
            .text(label)
            .attr("font-family", "sans-serif")
            .attr("font-size", "0.02")
            .attr("fill", "red");
    };

    const topPanelSVG = (sheet, index) => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const svgContainer = outlineAndSeam(svg, sheet);
        addSheetLabel('top-panel-' + index, svgContainer);
        let svgString = (new window.XMLSerializer).serializeToString(svg);
        document.body.appendChild(svg);
    };

    const bottomPanelSVG = (sheet, index) => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const svgContainer = outlineAndSeam(svg, sheet);
        addSheetLabel('bottom-panel-' + index, svgContainer);
        let svgString = (new window.XMLSerializer).serializeToString(svg);
        document.body.appendChild(svg);
    };

    const profileSVG = (sheet, index) => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const svgContainer = outlineAndSeam(svg, sheet);
        addSheetLabel('profile-' + index, svgContainer);

        bridle.wingConnections.map(({ xPos, foils }) => {
            if (_.includes(foils, index)) {
                let pos = sheet.outline.profile[foilBottomPointIndex(xPos, sheet.outline.profile)];
                var circles = svgContainer
                        .append("circle")
                        .attr('cx', pos.x)
                        .attr('cy', pos.y)
                        .attr("r", 0.005)
                        .style("fill", 'black');
            }
        });

        let svgString = (new window.XMLSerializer).serializeToString(svg);
        document.body.appendChild(svg);
    };

    let sheets = project(wing);
    _.each(sheets.topSheets, topPanelSVG);
    _.each(sheets.foilSheets, profileSVG);
    _.each(sheets.bottomSheets, bottomPanelSVG);
}

