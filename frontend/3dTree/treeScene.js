// treeScene.js - Three.js renderer for the ESG digital tree
// Handles scene, camera, lights, model loading and the render loop.
// Leaf/visitor rendering and animation are not implemented yet.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_URL = '/assets/Tree/widen_leaves.glb';

// Leaf placement tuning (fractions of the model bounding box)
const CANOPY_CENTER_Y = 0.60;    // canopy centre height, fraction of model height from bottom
const CANOPY_RADIUS_XZ = 0.40;   // canopy horizontal radii, fraction of model width/depth
const CANOPY_RADIUS_Y = 0.30;    // canopy vertical radius, fraction of model height
const LEAF_REFERENCE_PX = 800;   // 2D leaf pixel size that maps to the model's max dimension
const LEAF_SURFACE_OFFSET = 0.35; // how far leaves sit proud of the surface (x leaf size)

export class TreeScene {
    constructor() {
        this.canvas = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.model = null;
        this.leafGroup = null;
        this.raycaster = new THREE.Raycaster();
        this._leafTextures = new Map();
        this._tintedTextures = new Map();
        this._leafToken = 0;
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
        this.leafGroup = new THREE.Group();
        this.scene.add(this.leafGroup);

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
        // Lock vertical rotation: camera stays at a fixed horizontal angle
        // so the ground/platform always appears level. 360° azimuth only.
        this.controls.minPolarAngle = Math.PI / 2;
        this.controls.maxPolarAngle = Math.PI / 2;
        this._userHasInteracted = false;
        this.controls.addEventListener('start', () => {
            this._userHasInteracted = true;
        });

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
        this._modelSize = size;
        this._modelMaxDim = maxDim;

        // Fit the whole bounding box (base to canopy tip) inside the viewport.
        // Distance is derived from the camera FOV and aspect ratio so the
        // framing stays correct on any screen size.
        const distance = this._fitDistance(size);
        const camDir = new THREE.Vector3(0.55, 0, 1).normalize();
        this.camera.position.copy(camDir).multiplyScalar(distance);
        this.camera.near = maxDim / 100;
        this.camera.far = maxDim * 100;
        this.camera.updateProjectionMatrix();

        // Orbit/zoom target is the box centre so zooming stays balanced and
        // the base is not pushed off-screen.
        this.controls.target.set(0, 0, 0);
        this.controls.minDistance = maxDim * 0.25;
        this.controls.maxDistance = maxDim * 10;
        this.controls.update();
    }

    // Smallest camera distance where the model's bounding box fits both the
    // vertical and horizontal fields of view, plus a small margin.
    _fitDistance(size) {
        const halfHeight = size.y / 2;
        const halfWidth = Math.max(size.x, size.z) / 2;
        const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
        const aspect = this.camera.aspect || 1;

        const distForHeight = halfHeight / tanHalfFov;
        const distForWidth = halfWidth / (tanHalfFov * aspect);

        return Math.max(distForHeight, distForWidth) * 1.1;
    }

    _onResize() {
        if (!this.renderer || !this.canvas) return;

        const width = this.canvas.clientWidth || window.innerWidth;
        const height = this.canvas.clientHeight || window.innerHeight;

        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        // Keep the initial fit correct across resizes until the user
        // takes over the camera.
        if (!this._userHasInteracted && this.model) {
            this._frameModel();
        }
    }

    _animate() {
        this.animationFrameId = requestAnimationFrame(this._animate);
        this.clock.getDelta();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    // ==================== LEAVES ====================

    // leaves: array of { url, tint (hex|null), sizePx, seed, opacity }
    async refresh(leaves = []) {
        if (!this.leafGroup) return;

        const token = ++this._leafToken;
        this.leafGroup.clear();

        if (!leaves.length || !this._modelSize) return;

        // Compute positions synchronously so occupancy checks see all leaves
        const occupied = [];
        let raycastPlaced = 0;
        const placed = leaves.map(desc => {
            const leafSize = this._leafWorldSize(desc.sizePx);
            const result = this._placeLeafOnSurface(desc.seed, leafSize, occupied);
            if (result) {
                occupied.push(result.position);
                if (result.viaRaycast) raycastPlaced++;
            }
            return { desc, leafSize, position: result ? result.position : null };
        });
        console.debug(`3D tree leaves: ${raycastPlaced}/${leaves.length} placed via raycast`);

        const sprites = await Promise.all(
            placed.map(p => p.position ? this._createLeafSprite(p.desc, p.leafSize, p.position) : null)
        );

        // Ignore stale rebuilds if refresh was called again
        if (token !== this._leafToken) return;

        sprites.forEach(sprite => {
            if (sprite) this.leafGroup.add(sprite);
        });
    }

    // Reserved for future tree stage visuals
    setStage(stage) {
        this._stage = stage;
    }

    _leafWorldSize(sizePx) {
        return this._modelMaxDim * (Number(sizePx) || 80) / LEAF_REFERENCE_PX;
    }

    _hashSeed(seed) {
        let hash = 2166136261;
        const text = String(seed || '');
        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    _createSeededRandom(seed) {
        let state = this._hashSeed(seed) || 1;
        return () => {
            state = Math.imul(1664525, state) + 1013904223;
            return (state >>> 0) / 4294967296;
        };
    }

    _getTexture(url) {
        if (!this._leafTextures.has(url)) {
            this._leafTextures.set(url, new THREE.TextureLoader().loadAsync(url));
        }
        return this._leafTextures.get(url);
    }

    // Solid badge-colour silhouette using the leaf PNG's alpha (matches 2D leaf-tinted look)
    _getTintedTexture(url, color) {
        const key = `${url}|${color}`;
        if (!this._tintedTextures.has(key)) {
            this._tintedTextures.set(key, (async () => {
                const texture = await this._getTexture(url);
                const image = texture.image;
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0);
                ctx.globalCompositeOperation = 'source-in';
                ctx.fillStyle = color;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                const tinted = new THREE.CanvasTexture(canvas);
                tinted.colorSpace = THREE.SRGBColorSpace;
                return tinted;
            })());
        }
        return this._tintedTextures.get(key);
    }

    _canopyCenter() {
        return new THREE.Vector3(
            0,
            this._modelSize.y * (CANOPY_CENTER_Y - 0.5),
            0
        );
    }

    _canopyRadii() {
        return new THREE.Vector3(
            this._modelSize.x * CANOPY_RADIUS_XZ,
            this._modelSize.y * CANOPY_RADIUS_Y,
            this._modelSize.z * CANOPY_RADIUS_XZ
        );
    }

    _frontDirection(random) {
        return new THREE.Vector3(
            random() * 2 - 1,
            (random() * 2 - 1) * 0.7,
            0.25 + random() * 0.75
        ).normalize();
    }

    // Raycast from the front toward the tree and place the leaf on the first
    // front-facing canopy surface hit, offset along the surface normal so it
    // sits on the tree instead of floating inside the canopy volume.
    // Retries with new directions until a spot clear of `occupied` is found.
    _placeLeafOnSurface(seed, leafSize, occupied) {
        const random = this._createSeededRandom(seed);
        const center = this._canopyCenter();
        const radii = this._canopyRadii();
        const rayDistance = Math.max(radii.x, radii.y, radii.z) * 2.2;
        const minSpacing = leafSize * 0.9;

        for (let attempt = 0; attempt < 16; attempt++) {
            const dir = this._frontDirection(random);
            const origin = center.clone().addScaledVector(dir, rayDistance);

            this.raycaster.set(origin, dir.clone().negate());
            this.raycaster.far = rayDistance * 2;
            const hits = this.raycaster.intersectObject(this.model, true);

            for (const hit of hits) {
                if (!hit.face) continue;

                const point = hit.point;

                // Keep leaves on the front canopy: front half of the model,
                // within the canopy's horizontal bounds, above the platform.
                if (point.z < center.z) continue;
                if (Math.abs(point.x - center.x) > radii.x * 1.3) continue;
                if (Math.abs(point.y - center.y) > radii.y * 1.6) continue;
                if (point.y < this._modelSize.y * -0.35) continue;

                // Offset outward from the canopy centre (toward the viewer)
                // so the leaf hugs the surface instead of sinking into foliage.
                const outward = point.clone().sub(center);
                if (outward.lengthSq() < 1e-6) continue;
                outward.normalize();

                const position = point.clone()
                    .addScaledVector(outward, leafSize * LEAF_SURFACE_OFFSET);

                const clear = occupied.every(o => o.distanceTo(position) >= minSpacing);
                if (clear) return { position, viaRaycast: true };
                break; // closest acceptable surface point is taken; try another direction
            }
        }

        // Fallback: ellipsoid surface point with spacing check
        for (let attempt = 0; attempt < 16; attempt++) {
            const dir = this._frontDirection(random);
            const radial = 0.7 + random() * 0.3;
            const position = new THREE.Vector3(
                center.x + dir.x * radii.x * radial,
                center.y + dir.y * radii.y * radial,
                center.z + dir.z * radii.z * radial
            );
            const outward = new THREE.Vector3(
                dir.x * radii.x,
                dir.y * radii.y,
                dir.z * radii.z
            ).normalize();
            position.addScaledVector(outward, leafSize * LEAF_SURFACE_OFFSET);

            if (occupied.every(o => o.distanceTo(position) >= minSpacing)) {
                return { position, viaRaycast: false };
            }
        }

        return null;
    }

    // Draw the visitor name onto the leaf image, matching the 2D tree's
    // centered white bold label with a dark outline.
    _compositeLeafTexture(sourceTexture, name) {
        const image = sourceTexture.image;
        if (!image || !image.width) return sourceTexture;

        const maxSize = 512;
        const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const text = String(name || 'Anonymous');
        const fontSize = Math.max(10, Math.round(canvas.height * 0.13));
        const maxTextWidth = canvas.width * 0.72;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Word-wrap into at most 3 lines
        const words = text.split(/\s+/);
        const lines = [];
        let line = '';
        for (const word of words) {
            const candidate = line ? `${line} ${word}` : word;
            if (ctx.measureText(candidate).width > maxTextWidth && line) {
                lines.push(line);
                line = word;
            } else {
                line = candidate;
            }
        }
        if (line) lines.push(line);
        const visibleLines = lines.slice(0, 3);

        const lineHeight = fontSize * 1.2;
        const totalHeight = visibleLines.length * lineHeight;
        let y = canvas.height / 2 - totalHeight / 2 + lineHeight / 2;

        ctx.lineWidth = Math.max(1, fontSize * 0.14);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillStyle = '#ffffff';

        visibleLines.forEach((textLine, i) => {
            ctx.strokeText(textLine, canvas.width / 2, y + i * lineHeight);
            ctx.fillText(textLine, canvas.width / 2, y + i * lineHeight);
        });

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    async _createLeafSprite(desc, leafSize, position) {
        const baseTexture = desc.tint
            ? await this._getTintedTexture(desc.url, desc.tint)
            : await this._getTexture(desc.url);
        const texture = this._compositeLeafTexture(baseTexture, desc.name);

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: desc.opacity ?? 0.9,
            depthWrite: false,
            rotation: (this._createSeededRandom(`${desc.seed}|rot`)() - 0.5) * 0.5
        });

        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        // Preserve texture aspect ratio
        const aspect = texture.image && texture.image.width
            ? texture.image.height / texture.image.width
            : 1;
        sprite.scale.set(leafSize, leafSize * aspect, 1);
        sprite.userData.leafKey = desc.seed;
        sprite.userData.visitorIndex = desc.visitorIndex ?? null;
        return sprite;
    }

    // Raycast the leaf sprites at a client (mouse) position.
    // Returns the sprite's userData, or null if no leaf was hit.
    pickLeaf(clientX, clientY) {
        if (!this.canvas || !this.camera || !this.leafGroup) return null;

        const rect = this.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;

        const mouse = new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        );

        this.raycaster.far = Infinity;
        this.raycaster.setFromCamera(mouse, this.camera);
        const hits = this.raycaster.intersectObjects(this.leafGroup.children, false);
        return hits.length ? hits[0].object.userData : null;
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
        if (this.leafGroup) {
            this.leafGroup.traverse(child => {
                if (child.material) child.material.dispose();
            });
            this.leafGroup.clear();
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
