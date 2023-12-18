let scene, camera, renderer, orbitControls, snowParticles, planeMesh;
const noise = new SimplexNoise();
const particleNum = 10000;
const maxRange = 1000;
const minRange = maxRange / 2;
const textureSize = 64.0;

const drawRadialGradation = (ctx, canvasRadius, canvasW, canvasH) => {
    ctx.save();
    const gradient = ctx.createRadialGradient(canvasRadius, canvasRadius, 0, canvasRadius, canvasRadius, canvasRadius);
    gradient.addColorStop(0, 'rgba(255,255,255,1.0)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();
};

const getTexture = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const diameter = textureSize;
    canvas.width = diameter;
    canvas.height = diameter;
    const canvasRadius = diameter / 2;

    drawRadialGradation(ctx, canvasRadius, canvas.width, canvas.height);

    const texture = new THREE.Texture(canvas);
    texture.type = THREE.FloatType;
    texture.needsUpdate = true;
    return texture;
};

const makeRoughGround = (mesh) => {
    const time = Date.now();
    mesh.geometry.vertices.forEach(function (vertex, i) {
        const noise1 = noise.noise2D(
            vertex.x * 0.01 + time * 0.0003,
            vertex.y * 0.01 + time * 0.0003,
            vertex.z * 0.01 + time * 0.0003,
        ) * 5;
        const noise2 = noise.noise2D(
            vertex.x * 0.02 + time * 0.00012,
            vertex.y * 0.02 + time * 0.00015,
            vertex.z * 0.02 + time * 0.00015,
        ) * 4;
        const noise3 = noise.noise2D(
            vertex.x * 0.009 + time * 0.00015,
            vertex.y * 0.012 + time * 0.00009,
            vertex.z * 0.015 + time * 0.00015,
        ) * 4;
        const distance = noise1 + noise2 + noise3;
        vertex.z = distance;
    });
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.normalsNeedUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeFaceNormals();
};

const render = () => {
    orbitControls.update();
    requestAnimationFrame(render);
    renderer.render(scene, camera);
};

const renderSnow = (timeStamp) => {
    orbitControls.update();

    makeRoughGround(planeMesh);

    const posArr = snowParticles.geometry.vertices;
    const velArr = snowParticles.geometry.velocities;

    posArr.forEach((vertex, i) => {
        const velocity = velArr[i];

        const velX = Math.sin(timeStamp * 0.001 * velocity.x) * 0.1;
        const velZ = Math.cos(timeStamp * 0.0015 * velocity.z) * 0.1;

        vertex.x += velX;
        vertex.y += velocity.y;
        vertex.z += velZ;

        if (vertex.y < -minRange) {
            vertex.y = minRange;
        }
    });

    snowParticles.geometry.verticesNeedUpdate = true;
    renderer.render(scene, camera);
    requestAnimationFrame(renderSnow);
};

const onResize = () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(newWidth, newHeight);
};

const init = () => {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000036);

    // Camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 80);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('WebGL-output').appendChild(renderer.domElement);

    // OrbitControls
    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x666666);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 0, 50);
    scene.add(directionalLight);

    // Christmas Tree
    const trunkGeometry = new THREE.CylinderGeometry(2, 2, 10, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    scene.add(trunk);

    const treeGeometry = new THREE.ConeGeometry(20, 30, 4);
    const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // Green color
    const tree = new THREE.Mesh(treeGeometry, treeMaterial);
    tree.position.set(0, 15, 0);
    scene.add(tree);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 1, 1);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    planeMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    planeMesh.rotation.x = -Math.PI / 2;
    planeMesh.position.y = -10;
    scene.add(planeMesh);

    // Snow Particles
    const pointGeometry = new THREE.Geometry();
    const velocities = [];

    for (let i = 0; i < particleNum; i++) {
        const x = Math.floor(Math.random() * maxRange - minRange);
        const y = Math.floor(Math.random() * maxRange - minRange);
        const z = Math.floor(Math.random() * maxRange - minRange);
        const particle = new THREE.Vector3(x, y, z);
        pointGeometry.vertices.push(particle);

        const velX = Math.floor(Math.random() * 6 - 3) * 0.1;
        const velY = Math.floor(Math.random() * 10 + 3) * -0.05;
        const velZ = Math.floor(Math.random() * 6 - 3) * 0.1;
        const velocity = new THREE.Vector3(velX, velY, velZ);
        velocities.push(velocity);
    }

    const pointMaterial = new THREE.PointsMaterial({
        size: 8,
        color: 0xffffff,
        vertexColors: false,
        map: getTexture(),
        transparent: true,
        fog: true,
        depthWrite: false,
    });

    snowParticles = new THREE.Points(pointGeometry, pointMaterial);
    snowParticles.geometry.velocities = velocities;
    scene.add(snowParticles);

    // Resize listener
    window.addEventListener('resize', onResize);

    // Render
    requestAnimationFrame(renderSnow);
};

document.addEventListener('DOMContentLoaded', () => {
    init();
});
