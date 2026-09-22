/* ============================================================
   UNIVERSO DE EDGAR — experiencia 3D interactiva
   Three.js r128 (CDN, global THREE)
   ============================================================ */

(function () {
  'use strict';

  /* ---------------- WebGL check / fallback ---------------- */
  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  if (!hasWebGL() || typeof THREE === 'undefined') {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('fallback').classList.remove('hidden');
    return;
  }

  /* ---------------- Quality tier detection ---------------- */
  const cores = navigator.hardwareConcurrency || 4;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let QUALITY = 'MEDIUM';
  if (cores <= 2 || dpr < 1) QUALITY = 'LOW';
  else if (cores >= 6 && dpr >= 1.5) QUALITY = 'HIGH';

  const QSET = {
    LOW:    { stars: 2500,  dust: 400,  pixelRatio: 1,   bloom: false, cloudSeg: 24 },
    MEDIUM: { stars: 6000,  dust: 1200, pixelRatio: Math.min(dpr, 1.5), bloom: false, cloudSeg: 36 },
    HIGH:   { stars: 12000, dust: 2500, pixelRatio: dpr, bloom: true,  cloudSeg: 48 },
  };
  let cfg = QSET[QUALITY];

  /* ---------------- Renderer / scene / camera ---------------- */
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: QUALITY !== 'LOW', alpha: false });
  renderer.setPixelRatio(cfg.pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x03040a, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x03040a, 0.0018);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 4000);
  camera.position.set(0, 0, 60);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ---------------- Lighting ---------------- */
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(80, 20, 40);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x223355, 0.5));

  /* ---------------- Starfield ---------------- */
  function makeStars(count, spread, size, color) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.85, depthWrite: false });
    return new THREE.Points(geo, mat);
  }
  const starsFar = makeStars(cfg.stars, 3000, 1.1, 0xffffff);
  const starsNear = makeStars(Math.floor(cfg.stars * 0.35), 1400, 1.8, 0x9fd8ff);
  const dust = makeStars(cfg.dust, 900, 0.6, 0x8b5cf6);
  scene.add(starsFar, starsNear, dust);

  /* ---------------- Nebula (sprite-based) ---------------- */
  function makeNebula() {
    const group = new THREE.Group();
    const colors = [0x3fa9ff, 0x8b5cf6, 0x4dfff0];
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.SphereGeometry(120 + i * 40, 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i], transparent: true, opacity: 0.05, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(Math.random() * 60 - 30, Math.random() * 60 - 30, 0);
      group.add(mesh);
    }
    return group;
  }
  const nebula = makeNebula();
  nebula.position.set(0, 0, -1400);
  scene.add(nebula);

  /* ---------------- Black hole ---------------- */
  const blackHole = new THREE.Group();
  const bhCore = new THREE.Mesh(
    new THREE.SphereGeometry(14, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  const bhGlow = new THREE.Mesh(
    new THREE.RingGeometry(16, 30, 64),
    new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  );
  bhGlow.rotation.x = Math.PI / 2.3;
  blackHole.add(bhCore, bhGlow);
  blackHole.position.set(0, 0, -2600);
  scene.add(blackHole);

  /* ---------------- Earth ---------------- */
  function makeEarthTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0a2a52'; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#1c6b3f';
    for (let i = 0; i < 22; i++) {
      const x = Math.random() * 512, y = Math.random() * 256;
      const w = 30 + Math.random() * 90, h = 18 + Math.random() * 50;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    return new THREE.CanvasTexture(c);
  }
  function makeNightTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#ffdca8';
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * 512, y = Math.random() * 256;
      ctx.fillRect(x, y, 1.4, 1.4);
    }
    return new THREE.CanvasTexture(c);
  }
  const earthGroup = new THREE.Group();
  const earthMesh = new THREE.Mesh(
    new THREE.SphereGeometry(18, 48, 48),
    new THREE.MeshPhongMaterial({ map: makeEarthTexture(), shininess: 6 })
  );
  const nightMesh = new THREE.Mesh(
    new THREE.SphereGeometry(18.02, 48, 48),
    new THREE.MeshBasicMaterial({ map: makeNightTexture(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending })
  );
  const cloudMesh = new THREE.Mesh(
    new THREE.SphereGeometry(18.35, cfg.cloudSeg, cfg.cloudSeg),
    new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 })
  );
  const atmoMesh = new THREE.Mesh(
    new THREE.SphereGeometry(19.2, 40, 40),
    new THREE.MeshBasicMaterial({ color: 0x3fa9ff, transparent: true, opacity: 0.18, side: THREE.BackSide })
  );
  earthGroup.add(earthMesh, nightMesh, cloudMesh, atmoMesh);
  earthGroup.position.set(0, 0, -3200);
  scene.add(earthGroup);

  // orbit particles around earth
  const orbitPts = makeStars(500, 1, 0.6, 0x4dfff0);
  { // reshape into a ring
    const pos = orbitPts.geometry.attributes.position.array;
    for (let i = 0; i < pos.length / 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 24 + Math.random() * 4;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    orbitPts.geometry.attributes.position.needsUpdate = true;
  }
  earthGroup.add(orbitPts);

  // small decorative planets
  const decoPlanets = new THREE.Group();
  const planetColors = [0xe8c987, 0x8b5cf6, 0x4dfff0];
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(2 + Math.random() * 2, 16, 16),
      new THREE.MeshPhongMaterial({ color: planetColors[i] })
    );
    p.position.set((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 60, -3200 + (Math.random() - 0.5) * 200 - 60);
    decoPlanets.add(p);
  }
  scene.add(decoPlanets);

  /* ---------------- Interactive points ---------------- */
  const POINT_MESSAGES = [
    'Gracias por estar ahí.',
    'Por todas las risas.',
    'Por todas las locuras.',
    'Por cada momento.',
    'Por todos los recuerdos.',
    'Y por todos los momentos que todavía faltan.',
  ];
  const interactivePoints = [];
  const pointsGroup = new THREE.Group();
  POINT_MESSAGES.forEach((msg, i) => {
    const a = (i / POINT_MESSAGES.length) * Math.PI * 2;
    const geo = new THREE.SphereGeometry(0.6, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    const star = new THREE.Mesh(geo, mat);
    star.position.set(Math.cos(a) * 26, Math.sin(a * 1.7) * 6, Math.sin(a) * 26);
    star.userData.message = msg;
    pointsGroup.add(star);
    interactivePoints.push(star);
  });
  earthGroup.add(pointsGroup);

  /* ---------------- Heart particles (scene 6) ---------------- */
  function heartPositions(count) {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = Math.random() * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      arr[i * 3] = x * 1.6 + (Math.random() - 0.5) * 4;
      arr[i * 3 + 1] = y * 1.6 + (Math.random() - 0.5) * 4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return arr;
  }
  const heartGeo = new THREE.BufferGeometry();
  heartGeo.setAttribute('position', new THREE.BufferAttribute(heartPositions(700), 3));
  const heartMat = new THREE.PointsMaterial({ color: 0xff9fc7, size: 0.9, transparent: true, opacity: 0 });
  const heartPoints = new THREE.Points(heartGeo, heartMat);
  heartPoints.position.set(0, 0, -3180);
  scene.add(heartPoints);

  /* ---------------- Camera path / state machine ---------------- */
  const SCENES = ['INTRO', 'TRAVEL', 'EARTH', 'EDGAR', 'FRIENDSHIP', 'FINAL'];
  const indicatorLabels = {
    INTRO: '01 — UNIVERSO', TRAVEL: '02 — VIAJE', EARTH: '03 — TIERRA',
    EDGAR: '04 — EDGAR', FRIENDSHIP: '05 — AMISTAD', FINAL: '06 — FINAL',
  };
  let state = 'INTRO';
  let travelProgress = 0; // 0 -> 1 over the journey
  let exploring = false;
  let clock = new THREE.Clock();

  function setIndicator(s) {
    const el = document.getElementById('scene-indicator');
    el.textContent = indicatorLabels[s];
  }

  /* ---------------- Audio (simple WebAudio tones, no external files) ---------------- */
  let audioCtx = null;
  let soundOn = false;
  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { audioCtx = null; }
    }
  }
  function playTone(freq, dur, vol) {
    if (!soundOn || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0;
    osc.connect(gain).connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    gain.gain.linearRampToValueAtTime(vol, now + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + dur);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }
  function toggleSound() {
    ensureAudio();
    soundOn = !soundOn;
    if (soundOn && audioCtx.state === 'suspended') audioCtx.resume();
    document.getElementById('btn-sound').textContent = soundOn ? '🔊' : '🔇';
    if (soundOn) playTone(440, 0.4, 0.05);
  }

  function vibrate(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }

  /* ---------------- Touch / drag camera look (explore mode) ---------------- */
  let dragging = false, lastX = 0, lastY = 0;
  let lookYaw = 0, lookPitch = 0;
  let targetZoom = 1;
  canvas.addEventListener('pointerdown', (e) => {
    if (!exploring) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging || !exploring) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    lookYaw -= dx * 0.003;
    lookPitch = Math.max(-0.5, Math.min(0.5, lookPitch - dy * 0.003));
  });
  window.addEventListener('pointerup', () => dragging = false);
  canvas.addEventListener('wheel', (e) => {
    if (!exploring) return;
    targetZoom = Math.max(0.6, Math.min(1.8, targetZoom + e.deltaY * 0.001));
  }, { passive: true });

  /* raycaster for interactive points */
  const raycaster = new THREE.Raycaster();
  const pointerVec = new THREE.Vector2();
  function handleTap(clientX, clientY) {
    if (!exploring) return;
    pointerVec.x = (clientX / window.innerWidth) * 2 - 1;
    pointerVec.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointerVec, camera);
    const hits = raycaster.intersectObjects(interactivePoints);
    if (hits.length) {
      showPointCard(hits[0].object, clientX, clientY);
      vibrate(15);
      playTone(660, 0.3, 0.04);
    }
  }
  canvas.addEventListener('click', (e) => handleTap(e.clientX, e.clientY));

  function showPointCard(obj, x, y) {
    const card = document.getElementById('point-card');
    card.textContent = '⭐ “' + obj.userData.message + '”';
    card.style.left = x + 'px';
    card.style.top = y + 'px';
    card.classList.remove('hidden');
    clearTimeout(showPointCard._t);
    showPointCard._t = setTimeout(() => card.classList.add('hidden'), 2600);
  }

  /* ---------------- FPS monitor / adaptive quality ---------------- */
  let frameCount = 0, fpsWindowStart = performance.now(), lowFpsStreak = 0;
  function monitorFPS(now) {
    frameCount++;
    if (now - fpsWindowStart > 1000) {
      const fps = frameCount * 1000 / (now - fpsWindowStart);
      frameCount = 0; fpsWindowStart = now;
      if (fps < 28) {
        lowFpsStreak++;
        if (lowFpsStreak > 3 && QUALITY !== 'LOW') {
          QUALITY = QUALITY === 'HIGH' ? 'MEDIUM' : 'LOW';
          cfg = QSET[QUALITY];
          renderer.setPixelRatio(cfg.pixelRatio);
          lowFpsStreak = 0;
        }
      } else {
        lowFpsStreak = 0;
      }
    }
  }

  /* ---------------- Loading sequence (real progress) ---------------- */
  const loadSteps = 5;
  let loaded = 0;
  function bumpLoad() {
    loaded++;
    const pct = Math.round((loaded / loadSteps) * 100);
    document.getElementById('loading-bar-fill').style.width = pct + '%';
    document.getElementById('loading-percent').textContent = pct + '%';
    if (loaded >= loadSteps) finishLoading();
  }
  function finishLoading() {
    setTimeout(() => {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('intro').classList.remove('hidden');
      document.getElementById('ui-floating').classList.remove('hidden');
      document.getElementById('scene-indicator').classList.remove('hidden');
      setIndicator('INTRO');
    }, 250);
  }
  // simulate real asset "readiness" steps (geometry build, textures, etc.)
  requestAnimationFrame(() => { bumpLoad(); // scene graph built
    setTimeout(() => bumpLoad(), 120);       // textures
    setTimeout(() => bumpLoad(), 260);       // stars
    setTimeout(() => bumpLoad(), 400);       // earth
    setTimeout(() => bumpLoad(), 520);       // ready
  });

  /* ---------------- Scene transitions ---------------- */
  function goEnter() {
    ensureAudio();
    vibrate(20);
    document.getElementById('intro').classList.add('hidden');
    state = 'TRAVEL';
    setIndicator('TRAVEL');
    playTone(220, 0.6, 0.05);
  }

  function reachEdgar() {
    state = 'EDGAR';
    setIndicator('EDGAR');
    document.getElementById('edgar-card').classList.remove('hidden');
    setTimeout(() => document.getElementById('btn-explore').classList.remove('hidden'), 1600);
  }

  function startExplore() {
    exploring = true;
    document.getElementById('edgar-card').classList.add('hidden');
    setTimeout(() => document.getElementById('btn-continue').classList.remove('hidden'), 4000);
    vibrate(15);
  }

  function goFriendship() {
    exploring = false;
    document.getElementById('btn-continue').classList.add('hidden');
    state = 'FRIENDSHIP';
    setIndicator('FRIENDSHIP');
    document.getElementById('friendship').classList.remove('hidden');
    heartMat.opacity = 0;
    let t0 = performance.now();
    (function fadeHeart() {
      const k = Math.min(1, (performance.now() - t0) / 1800);
      heartMat.opacity = k * 0.9;
      if (k < 1) requestAnimationFrame(fadeHeart);
    })();
    setTimeout(goFinalMessage, 3200);
  }

  function goFinalMessage() {
    document.getElementById('friendship').classList.add('hidden');
    state = 'FINAL';
    setIndicator('FINAL');
    const msg = document.getElementById('final-message');
    msg.classList.remove('hidden');
    const lines = msg.querySelectorAll('[data-line]');
    lines.forEach((line, i) => setTimeout(() => line.classList.add('show'), i * 900));
    setTimeout(() => {
      msg.classList.add('hidden');
      document.getElementById('end-scene').classList.remove('hidden');
    }, lines.length * 900 + 1800);
  }

  function restartExperience() {
    document.getElementById('end-scene').classList.add('hidden');
    state = 'INTRO';
    travelProgress = 0;
    exploring = false;
    lookYaw = 0; lookPitch = 0; targetZoom = 1;
    document.querySelectorAll('#final-message [data-line]').forEach(l => l.classList.remove('show'));
    document.getElementById('btn-explore').classList.add('hidden');
    camera.position.set(0, 0, 60);
    setIndicator('INTRO');
    document.getElementById('intro').classList.remove('hidden');
  }

  /* ---------------- Buttons ---------------- */
  document.getElementById('btn-enter').addEventListener('click', goEnter);
  document.getElementById('btn-sound-intro').addEventListener('click', toggleSound);
  document.getElementById('btn-sound').addEventListener('click', toggleSound);
  document.getElementById('btn-explore').addEventListener('click', startExplore);
  document.getElementById('btn-continue').addEventListener('click', goFriendship);
  document.getElementById('btn-restart').addEventListener('click', restartExperience);
  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      (document.documentElement.requestFullscreen || function(){})();
    } else {
      (document.exitFullscreen || function(){}).call(document);
    }
  });

  /* ---------------- Main animation loop ---------------- */
  function animate(now) {
    requestAnimationFrame(animate);
    monitorFPS(now || performance.now());
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    starsFar.rotation.y += dt * 0.002;
    starsNear.rotation.y += dt * 0.004;
    dust.rotation.y -= dt * 0.003;
    earthMesh.rotation.y += dt * 0.03;
    nightMesh.rotation.y += dt * 0.03;
    cloudMesh.rotation.y += dt * 0.018;
    orbitPts.rotation.y += dt * 0.05;
    blackHole.rotation.z += dt * 0.15;
    nebula.rotation.y += dt * 0.01;
    decoPlanets.children.forEach((p, i) => { p.rotation.y += dt * (0.2 + i * 0.05); });

    interactivePoints.forEach((p, i) => {
      p.material.opacity = 0.6 + Math.sin(t * 2 + i) * 0.3;
    });

    if (state === 'TRAVEL') {
      travelProgress += dt * 0.045;
      const z = 60 - travelProgress * 3260;
      camera.position.z = Math.max(z, -3140);
      camera.position.x = Math.sin(travelProgress * 3.1) * 30;
      camera.position.y = Math.cos(travelProgress * 2.2) * 14;
      camera.lookAt(0, 0, camera.position.z - 200);

      if (travelProgress > 0.98 && state === 'TRAVEL') {
        state = 'EARTH';
        setIndicator('EARTH');
        setTimeout(reachEdgar, 1400);
      }
    } else if (state === 'EARTH' || state === 'EDGAR') {
      const targetPos = new THREE.Vector3(0, 0, -3140);
      camera.position.lerp(targetPos, dt * 0.6);
      camera.lookAt(earthGroup.position);
    } else if (state === 'FRIENDSHIP' || state === 'FINAL') {
      const dist = state === 'FINAL' ? -3400 : -3180;
      const targetPos = new THREE.Vector3(0, 0, dist);
      camera.position.lerp(targetPos, dt * 0.3);
      camera.lookAt(earthGroup.position);
    }

    if (exploring) {
      const dist = 42 * targetZoom;
      const ex = earthGroup.position.x + Math.sin(lookYaw) * dist * Math.cos(lookPitch);
      const ez = earthGroup.position.z + Math.cos(lookYaw) * dist * Math.cos(lookPitch);
      const ey = Math.sin(lookPitch) * dist;
      camera.position.lerp(new THREE.Vector3(ex, ey, ez), 0.08);
      camera.lookAt(earthGroup.position);
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);

})();
