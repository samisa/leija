import React from 'react';
import _ from 'lodash';
import * as THREE from 'three';
import { OrbitControls } from '../OrbitControls';

class Scene extends React.Component {
    constructor(props) {
        super(props);
        _.bindAll(this, 'onWindowResize', 'animate');
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
    }

    componentDidMount() {
        this.renderer = new THREE.WebGLRenderer();
        //this.renderer.shadowMap.enabled = true;
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
        this.controls.saveState(); // so that it can be rocevered with reset

        //lights
        let light = new THREE.DirectionalLight( 0xffffff );
        light.position.set( 1, 1, 1 );
        scene.add( light );
        light = new THREE.DirectionalLight( 0xffffff );
        light.position.set( -1, -1, -1 );
        scene.add( light );
        light = new THREE.AmbientLight( 0x222222 );
        scene.add( light );

        window.addEventListener( 'resize', this.onWindowResize, false );
        this.animate();
    }

    componentWillReceiveProps(newProps) {
        const { objects } = newProps;
        if (objects) {
            this.objects && this.objects.forEach(obj => this.scene.remove(obj));
            objects.forEach(obj => this.scene.add(obj));
            this.objects = objects;
        }
    }

    animate() {
        requestAnimationFrame( this.animate );
        this.controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
        this.renderer.render( this.scene, this.camera );
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.onWindowResize);
    }

    shouldComponentUpdate() {
        return false;
    }

    render() {
        return (
            <div>
                <button onClick={ () => this.controls.reset() }>{ "reset view" } </button>
                <div ref="container" className='threeCanvasContainer'/>
            </div>
        );
    }
}

export default Scene;
