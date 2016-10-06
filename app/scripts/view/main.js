

import * as THREE from 'three';
import Foo from 'three-orbit-controls';
import { ipcRenderer } from 'electron';
import { createMesh } from '../wing3d';

let OrbitControls = Foo(THREE);
var camera, controls, scene, renderer;

ipcRenderer.on('wingData' , function(event , data) {
    console.log('initing scene');
    init(data.data);
});

function init(data) {
    console.log('initing scene');
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2( 0xcccccc, 0.002 );
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( scene.fog.color );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );

    var container = document.getElementById( 'container' );
    container.appendChild(renderer.domElement);
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000 );
    camera.position.z = 5;
    controls = new OrbitControls(camera, renderer.domElement);
    //controls.addEventListener( 'change', render ); // add this only if there is no animation loop (requestAnimationFrame)
    controls.enableDamping = true;
    controls.dampingFactor = .9;
    controls.enableZoom = false;


    let mesh = createMesh(data);
    scene.add(mesh);

    // world
    // var geometry = new THREE.CylinderGeometry( 0, 10, 30, 4, 1 );
    // var material =  new THREE.MeshPhongMaterial( { color: 0xffffff, shading: THREE.FlatShading } );
    // for ( var i = 0; i < 500; i ++ ) {
    //     var mesh = new THREE.Mesh( geometry, material );
    //     mesh.position.x = ( Math.random() - 0.5 ) * 1000;
    //     mesh.position.y = ( Math.random() - 0.5 ) * 1000;
    //     mesh.position.z = ( Math.random() - 0.5 ) * 1000;
    //     mesh.updateMatrix();
    //     mesh.matrixAutoUpdate = false;
    //     scene.add( mesh );
    // }

    // lights
    let light = new THREE.DirectionalLight( 0xffffff );
    light.position.set( 1, 1, 1 );
    scene.add( light );
    light = new THREE.DirectionalLight( 0x002288 );
    light.position.set( -1, -1, -1 );
    scene.add( light );
    light = new THREE.AmbientLight( 0x222222 );
    scene.add( light );

    window.addEventListener( 'resize', onWindowResize, false );

    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    requestAnimationFrame( animate );
    controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
    render();
}

function render() {
    renderer.render( scene, camera );
}
