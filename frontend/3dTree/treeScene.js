// treeScene.js - Three.js renderer for the ESG digital tree
// Handles scene, camera, lights, model loading and the render loop.
// Leaf/visitor rendering and animation are not implemented yet.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_URL = '/assets/Tree/tree.glb';

export class TreeScene {
    constructor() {
        this.canvas = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.model = null;
        this.resizeObserver = null;
        this.animationFrameId = null;
        this.clock = new THREE.Clock();
        this._onResize = this._onResize.bind(this);
        this._animate = this._animate.bind(this);
    }

    async init(canvas) {
        if (!canvas) {
            throw new Error('TreeScene.init requires a canvas element');
        }
        if (this.renderer) {
            return;
        }

        this.canvas = canvas;

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio || 1);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

        // Simple lighting: hemisphere fill + directional key light
        const hemisphere = new THREE.HemisphereLight(0xffffff, 0x8a9a7b, 0.9);
        this.scene.add(hemisphere);

        const directional = new THREE.DirectionalLight(0xffffff, 1.2);
        directional.position.set(5, 8, 6);
        directional.castShadow = true;
        directional.shadow.mapSize.set(2048, 2048);
        this.scene.add(directional);

        this.controls = new OrbitControls(this.camera, canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.enablePan = true;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 50;

        this._onResize();
        window.addEventListener('resize', this._onResize);
        this.resizeObserver = new ResizeObserver(this._onResize);
        this.resizeObserver.observe(canvas);

        await this._loadModel();

        this._animate();
    }

    async _loadModel() {
        const loader = new GLTFLoader();
        const gltf = await new Promise((resolve, reject) => {
            loader.load(MODEL_URL, resolve, undefined, reject);
        });

        this.model = gltf.scene;
        this.scene.add(this.model);

        this._frameModel();
    }

    // Center the model and position the camera from its bounding box.
    _frameModel() {
        if (!this.model) return;

        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;

        // Center model at origin
        this.model.position.sub(center);

        const distance = maxDim * 1.8;
        this.camera.position.set(distance * 0.7, distance * 0.5, distance);
        this.camera.near = maxDim / 100;
        this.camera.far = maxDim * 100;
        this.camera.updateProjectionMatrix();

        this.controls.target.set(0, size.y * 0.35, 0);
        this.controls.update();
    }

    _onResize() {
        if (!this.renderer || !this.canvas) return;

        const width = this.canvas.clientWidth || window.innerWidth;
        const height = this.canvas.clientHeight || window.innerHeight;

        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    _animate() {
        this.animationFrameId = requestAnimationFrame(this._animate);
        this.clock.getDelta();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // Reserved for future visitor/leaf rendering
    refresh() {}

    // Reserved for future tree stage visuals
    setStage(stage) {
        this._stage = stage;
    }

    dispose() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        window.removeEventListener('resize', this._onResize);
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
    }
}
