import React from 'react';

import * as THREE from 'three';
import Foo from 'three-orbit-controls';
let OrbitControls = Foo(THREE);

const Scene = React.createClass({
    onWindowResize: function() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
    },

    componentDidMount: function() {
        this.camera, controls, scene, renderer;
        this.renderer = new THREE.WebGLRenderer();
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000 );
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        let { renderer, scene, camera, controls } = this;
        this.refs.container.appendChild(renderer.domElement);
        scene.fog = new THREE.FogExp2( 0xcccccc, 0.002 );
        renderer.setClearColor( scene.fog.color );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        camera.up.set(0, 0, 1);
        camera.position.x = -5;
        controls = new OrbitControls(camera, renderer.domElement);
        //controls.addEventListener( 'change', render ); // add this only if there is no animation loop (requestAnimationFrame)
        controls.enableDamping = true;
        controls.dampingFactor = .9;
        controls.enableZoom = false;
        // lights
        let light = new THREE.DirectionalLight( 0xffffff );
        light.position.set( 1, 1, 1 );
        scene.add( light );
        light = new THREE.DirectionalLight( 0x002288 );
        light.position.set( -1, -1, -1 );
        scene.add( light );
        light = new THREE.AmbientLight( 0x222222 );
        scene.add( light );

        window.addEventListener( 'resize', this.onWindowResize, false );
        this.animate();
    },

    componentWillReceiveProps(newProps) {
        let { wingObject } = newProps;
        if (wingObject) {
            this.scene.add(wingObject.threeObject);
        }
    },

    animate: function() {
        requestAnimationFrame( this.animate );
        this.controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
        this.renderer.render( this.scene, this.camera );
    },

    componentWillUnmount: function() {
        window.removeEventListener('resize', this.onWindowResize);
    },

    shouldComponentUpdate: function() {
        return false;
    },

    render: function() {
        let { wingObject } = this.props;

        return (
            <div ref="container" className='threeCanvasContainer'/>
        );

    }
});

export default Scene;
