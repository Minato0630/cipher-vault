// screen.js - Three.js WebGL 3D Background Visualizer for CipherWing
// Renders a rotating wireframe 3D golden lock and dynamic particles react to mouse movement.

(function () {
    // 1. Resolve Three.js dependency dynamically if not already loaded
    if (typeof THREE === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = () => initThree();
        script.onerror = () => console.error("Failed to load Three.js from CDN");
        document.head.appendChild(script);
    } else {
        initThree();
    }

    function initThree() {
        let scene, camera, renderer;
        let lockGroup, particleSystem;
        let mouseX = 0, mouseY = 0;
        let targetX = 0, targetY = 0;
        let isLightMode = document.documentElement.getAttribute("data-theme") === "light";

        // Create Canvas element at the bottom layer of document
        const canvas = document.createElement('canvas');
        canvas.id = 'three-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.zIndex = '-2'; // Behind cards but above dark/light base background
        canvas.style.pointerEvents = 'none';
        canvas.style.transition = 'opacity 1s ease';
        document.body.appendChild(canvas);

        // 2. Initialize Scene & Camera
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.z = 18;

        // 3. Initialize WebGL Renderer
        renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // 4. Create 3D Padlock Group (Gold/Yellow Wireframe)
        lockGroup = new THREE.Group();

        // Color theme properties based on theme
        const getGoldColor = () => isLightMode ? 0xD97706 : 0xFBBF24;
        const getParticleColor = () => isLightMode ? 0xEAB308 : 0xFDE047;

        // Materials
        const shackleMat = new THREE.MeshBasicMaterial({
            color: getGoldColor(),
            wireframe: true,
            transparent: true,
            opacity: 0.28
        });

        const bodyMat = new THREE.MeshBasicMaterial({
            color: getGoldColor(),
            wireframe: true,
            transparent: true,
            opacity: 0.35
        });

        const keyholeMat = new THREE.MeshBasicMaterial({
            color: isLightMode ? 0x92400E : 0xF59E0B,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });

        // A. Padlock Body
        const bodyGeo = new THREE.BoxGeometry(5.5, 4.2, 1.8);
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = -1.2;
        lockGroup.add(bodyMesh);

        // B. Padlock Shackle Loop (Torus Geometry)
        const shackleGeo = new THREE.TorusGeometry(1.9, 0.32, 8, 24, Math.PI);
        const shackleMesh = new THREE.Mesh(shackleGeo, shackleMat);
        shackleMesh.position.y = 0.9;
        lockGroup.add(shackleMesh);

        // C. Shackle Legs
        const legGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.6, 8);
        const legLeft = new THREE.Mesh(legGeo, shackleMat);
        legLeft.position.set(-1.9, 0.1, 0);
        const legRight = legLeft.clone();
        legRight.position.x = 1.9;
        lockGroup.add(legLeft);
        lockGroup.add(legRight);

        // D. Keyhole Detail (Cylinder + Box)
        const khRoundGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.9, 8);
        khRoundGeo.rotateX(Math.PI / 2);
        const khRoundMesh = new THREE.Mesh(khRoundGeo, keyholeMat);
        khRoundMesh.position.set(0, -1.0, 0);
        lockGroup.add(khRoundMesh);

        const khSlotGeo = new THREE.BoxGeometry(0.25, 0.9, 1.9);
        const khSlotMesh = new THREE.Mesh(khSlotGeo, keyholeMat);
        khSlotMesh.position.set(0, -1.5, 0);
        lockGroup.add(khSlotMesh);

        // Add Lock group to scene
        scene.add(lockGroup);

        // 5. Create Glowing Drifting Particle Field
        const particleCount = 180;
        const particlesGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const speeds = [];

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 30;     // X
            positions[i + 1] = (Math.random() - 0.5) * 20; // Y
            positions[i + 2] = (Math.random() - 0.5) * 20; // Z

            speeds.push({
                x: (Math.random() - 0.5) * 0.005,
                y: (Math.random() - 0.5) * 0.008 + 0.004, // Slowly drifts upwards
                z: (Math.random() - 0.5) * 0.005
            });
        }

        particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const particleMat = new THREE.PointsMaterial({
            color: getParticleColor(),
            size: 0.12,
            transparent: true,
            opacity: 0.5,
            sizeAttenuation: true
        });

        particleSystem = new THREE.Points(particlesGeo, particleMat);
        scene.add(particleSystem);

        // 6. Mouse movement parallax listeners
        document.addEventListener('mousemove', (e) => {
            targetX = (e.clientX - window.innerWidth / 2) / 100;
            targetY = (e.clientY - window.innerHeight / 2) / 100;
        });

        // 7. Watch for theme changes to update wireframe colors
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === "data-theme") {
                    isLightMode = document.documentElement.getAttribute("data-theme") === "light";
                    // Update material colors
                    bodyMat.color.setHex(getGoldColor());
                    shackleMat.color.setHex(getGoldColor());
                    keyholeMat.color.setHex(isLightMode ? 0x92400E : 0xF59E0B);
                    particleMat.color.setHex(getParticleColor());
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });

        // 8. Animation & Render Loop
        const clock = new THREE.Clock();

        function animate() {
            requestAnimationFrame(animate);

            const elapsedTime = clock.getElapsedTime();

            // Parallax interpolation (super smooth and responsive)
            mouseX += (targetX - mouseX) * 0.35;
            mouseY += (targetY - mouseY) * 0.35;

            // Rotate lock group (slow spin + mouse wobble)
            lockGroup.rotation.y = elapsedTime * 0.25 + mouseX;
            lockGroup.rotation.x = Math.sin(elapsedTime * 0.15) * 0.1 + mouseY;

            // Slowly hover the lock up and down
            lockGroup.position.y = Math.sin(elapsedTime * 0.7) * 0.35;

            // Drift particles upwards
            const positionsArray = particleSystem.geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                const idx = i * 3;
                positionsArray[idx] += speeds[i].x;
                positionsArray[idx + 1] += speeds[i].y;
                positionsArray[idx + 2] += speeds[i].z;

                // Wrap particles around screen edges when drifting off
                if (positionsArray[idx + 1] > 12) {
                    positionsArray[idx + 1] = -12;
                }
            }
            particleSystem.geometry.attributes.position.needsUpdate = true;

            renderer.render(scene, camera);
        }

        animate();

        // 9. Handle Window Resizing
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // 10. Hook into CipherWing file processing success to speed up lock spin
        window.flashThreeJS = function () {
            let start = Date.now();
            let duration = 1500; // 1.5 seconds flash
            
            function flash() {
                let progress = (Date.now() - start) / duration;
                if (progress < 1) {
                    // Temporarily boost opacity and spin speed
                    bodyMat.opacity = 0.8 * (1 - progress) + 0.35;
                    shackleMat.opacity = 0.7 * (1 - progress) + 0.28;
                    lockGroup.rotation.y += 0.15 * (1 - progress);
                    requestAnimationFrame(flash);
                } else {
                    bodyMat.opacity = 0.35;
                    shackleMat.opacity = 0.28;
                }
            }
            flash();
        };
    }
})();
