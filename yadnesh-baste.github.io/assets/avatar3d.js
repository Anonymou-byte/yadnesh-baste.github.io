/* 3D avatar of Yadnesh Baste. © 2026 Yadnesh Baste.
   Loads assets/avatar/model.glb (Yadnesh's own avatar: 73-bone skeleton, 51 ARKit face shapes) and animates it live:
   arms, spine, head and eyes on the skeleton; blinking, smiling, talking and brows with the face shapes.
   API: const a = YBAvatar.mount(el, {pose, board}); a.setPose(name); a.greet(); a.say(text, ms); a.celebrate(text); a.wave(text); a.think(text) */
(function () {
  if (!window.THREE || !THREE.GLTFLoader) return;
  const T = THREE, PI = Math.PI, K = 1.69; // K: metres -> scene units used by props and cameras
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const base = (document.currentScript && document.currentScript.src || "").replace(/[^/]*$/, "");
  let dataPromise = null;
  function loadData() {
    if (!dataPromise) dataPromise = new Promise((res, rej) => {
      const ld = new T.GLTFLoader(); if (window.MeshoptDecoder) ld.setMeshoptDecoder(MeshoptDecoder);
      ld.load(base + "avatar/model.glb", res, undefined, rej);
    });
    return dataPromise;
  }
  const lin = hex => new T.Color(hex).convertSRGBToLinear();
  const lerp = (a, b, k) => a + (b - a) * k;
  const canvasTex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4; tex.userData = { ctx: c.getContext("2d"), draw }; draw(tex.userData.ctx, 0); tex.needsUpdate = true; return tex; };
  const qE = (x, y, z) => new T.Quaternion().setFromEuler(new T.Euler(x, y, z, "XYZ"));
  const qZ = a => new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), a);

  function buildCharacter(gltf) {
    const root = gltf.scene, group = new T.Group(); group.add(root);
    root.updateMatrixWorld(true);
    const bones = {}; root.traverse(o => { if (o.isBone) bones[o.name] = o; });
    const morphs = [];
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach(m => { if ("envMapIntensity" in m) m.envMapIntensity = 0.85; });
        if (o.morphTargetDictionary) morphs.push(o);
      }
    });
    // rest pose: local and parent-world rotations, so we can apply rotations expressed in the character's own frame
    const rest = {};
    Object.values(bones).forEach(b => {
      const pw = new T.Quaternion(); if (b.parent) b.parent.getWorldQuaternion(pw);
      const w = new T.Quaternion(); b.getWorldQuaternion(w);
      rest[b.name] = { local: b.quaternion.clone(), pw, pwi: pw.clone().invert(), w, pos: b.getWorldPosition(new T.Vector3()) };
    });
    const tmpQ = new T.Quaternion();
    function delta(name, D) { const b = bones[name], r = rest[name]; if (!b) return; tmpQ.copy(r.pwi).multiply(D).multiply(r.pw).multiply(r.local); b.quaternion.copy(tmpQ); }
    // arm geometry: rest angle of each upper arm (0 = hanging straight down) and forearm axis
    const arm = {};
    [["R", "Right", -0.36], ["L", "Left", 0.36]].forEach(([n, side, vA]) => {
      const a = rest[side + "Arm"].pos, f = rest[side + "ForeArm"].pos, h = rest[side + "Hand"].pos;
      const rT = Math.atan2(f.x - a.x, -(f.y - a.y));
      arm[n] = { side, rT, vA, axis: h.clone().sub(f).normalize(), conj: qZ(rT - vA), conjI: qZ(vA - rT), fix: qZ(-rT) };
    });
    const setMorph = (name, v) => morphs.forEach(m => { const i = m.morphTargetDictionary[name]; if (i !== undefined) m.morphTargetInfluences[i] = v; });
    // props attached to bones, placed in the character frame
    function attach(boneName, obj, posWorld, rotWorld) {
      const b = bones[boneName], r = rest[boneName], s = b.getWorldScale(new T.Vector3()).x;
      const qi = r.w.clone().invert();
      obj.position.copy(posWorld.clone().applyQuaternion(qi).divideScalar(s));
      obj.quaternion.copy(qi.multiply(rotWorld || new T.Quaternion()));
      obj.scale.setScalar(1 / s); b.add(obj);
    }
    const hatM = new T.MeshPhysicalMaterial({ color: lin(0xf2b315), roughness: 0.3, clearcoat: 0.8 });
    const hat = new T.Group(); hat.visible = false;
    const dome = new T.Mesh(new T.SphereGeometry(0.128, 40, 20, 0, 2 * PI, 0, PI / 2), hatM); dome.scale.set(1, 0.95, 1.12); dome.castShadow = true; hat.add(dome);
    const brim = new T.Mesh(new T.CylinderGeometry(0.152, 0.152, 0.008, 40), hatM); brim.scale.set(1, 1, 1.15); brim.position.z = 0.012; hat.add(brim);
    const ridge = new T.Mesh(new T.CylinderGeometry(0.011, 0.011, 0.21, 12), hatM); ridge.rotation.x = PI / 2; ridge.position.set(0, 0.118, 0.01); hat.add(ridge);
    const top = rest.HeadTop_End ? rest.HeadTop_End.pos : rest.Head.pos.clone().add(new T.Vector3(0, 0.17, 0));
    attach("Head", hat, new T.Vector3(0, top.y - rest.Head.pos.y - 0.07, 0.006));
    const hammer = new T.Group(); hammer.visible = false;
    const wood = new T.MeshStandardMaterial({ color: lin(0xb07a45), roughness: 0.6 }), steel = new T.MeshStandardMaterial({ color: lin(0x9aa3ab), roughness: 0.3, metalness: 0.9 });
    const handle = new T.Mesh(new T.CylinderGeometry(0.011, 0.012, 0.3, 12), wood); handle.rotation.x = PI / 2; handle.position.z = 0.1; hammer.add(handle);
    const hh = new T.Mesh(new T.BoxGeometry(0.042, 0.042, 0.12), steel); hh.rotation.y = PI / 2; hh.position.z = 0.25; hammer.add(hh);
    // hammer was designed in a hand frame whose rest axes are the character's axes with the arm hanging at the virtual angle vA
    { const A = arm.R, hw = rest.RightHand.w, Qv = qZ(A.vA - A.rT).multiply(hw); const s = bones.RightHand.getWorldScale(new T.Vector3()).x;
      const Qi = Qv.clone().invert(); hammer.quaternion.copy(Qi); hammer.position.copy(new T.Vector3(Math.sin(A.vA), -Math.cos(A.vA), 0).multiplyScalar(0.08).applyQuaternion(Qi).divideScalar(s)); hammer.scale.setScalar(1 / s); bones.RightHand.add(hammer); }
    group.scale.setScalar(K);
    return { group, bones, rest, delta, arm, setMorph, hat, hammer, morphs };
  }

  // ---------- props
  function codeScreen() {
    const lines = Array.from({ length: 40 }, (_, i) => ({ ind: (i * 7) % 4, w: 30 + ((i * 37) % 60), c: ["#74AEF2", "#5CC2AE", "#EBA83C", "#C8D3E0"][(i * 3) % 4] }));
    return canvasTex(256, 160, (ctx, t) => {
      ctx.fillStyle = "#0E1520"; ctx.fillRect(0, 0, 256, 160); const off = (t * 22) % 14;
      for (let i = 0; i < 14; i++) { const L = lines[(Math.floor(t * 22 / 14) + i) % lines.length]; ctx.fillStyle = L.c; ctx.fillRect(14 + L.ind * 14, 10 + i * 14 - off, L.w * 2, 6); }
    });
  }
  function boardTex(kind) {
    return canvasTex(512, 320, (ctx, t) => {
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, 512, 320); ctx.fillStyle = "#16233B"; ctx.font = "600 26px sans-serif";
      if (kind === "process") {
        ctx.fillText("Demand → Decision", 24, 44); const k = (t * 0.6) % 4;
        [30, 150, 270, 390].forEach((x, i) => { ctx.fillStyle = i <= k ? "#1F5FAD" : "#C8D3E0"; ctx.fillRect(x, 130, 92, 60); if (i < 3) { ctx.fillStyle = "#566376"; ctx.fillRect(x + 94, 158, 22, 4); } });
        ctx.fillStyle = "#C77F00"; ctx.beginPath(); ctx.moveTo(436, 230); ctx.lineTo(460, 254); ctx.lineTo(436, 278); ctx.lineTo(412, 254); ctx.fill(); return;
      }
      ctx.fillText(kind === "secom" ? "Failures caught" : "Churn by segment", 24, 44);
      const vals = kind === "secom" ? [0.22, 0.34, 0.42, 0.55, 0.66] : [0.08, 0.11, 0.31, 0.56, 0.28], grow = Math.min(1, (t % 6) / 1.2);
      vals.forEach((v, i) => { const h = 210 * v * grow / 0.66; ctx.fillStyle = v > 0.3 && kind !== "secom" ? "#C77F00" : "#1F5FAD"; ctx.fillRect(40 + i * 92, 290 - h, 60, h); });
      ctx.fillStyle = "#566376"; ctx.fillRect(30, 291, 460, 3);
    });
  }
  function docTex() { return canvasTex(200, 260, ctx => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 200, 260); ctx.fillStyle = "#16233B"; ctx.font = "600 22px sans-serif"; ctx.fillText("CV", 16, 34); ctx.fillStyle = "#C77F00"; ctx.fillRect(16, 44, 40, 4); for (let i = 0; i < 11; i++) { ctx.fillStyle = i % 4 === 0 ? "#16233B" : "#9AA6B5"; ctx.fillRect(16, 66 + i * 17, i % 4 === 0 ? 120 : 150 - (i * 13) % 50, i % 4 === 0 ? 7 : 5); } }); }
  function letterTex(ch, color) { return canvasTex(128, 128, ctx => { ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = "#fff"; ctx.font = "700 92px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ch, 64, 70); }); }

  function mount(el, opts = {}) {
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(26, 1, 0.1, 60);
    if (T.RoomEnvironment) { const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; }
    scene.add(new T.HemisphereLight(0xffffff, 0x4a5466, 0.35));
    const key = new T.DirectionalLight(0xfff0e0, 1.6); key.position.set(-2.2, 4.2, 4.5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
    Object.assign(key.shadow.camera, { left: -2.2, right: 2.2, top: 3.6, bottom: -0.3, near: 0.5, far: 14 }); scene.add(key);
    const rim = new T.DirectionalLight(0xa9c8ff, 0.9); rim.position.set(2.5, 3.5, -4); scene.add(rim);
    const ground = new T.Mesh(new T.PlaneGeometry(8, 8), new T.ShadowMaterial({ opacity: 0.18 })); ground.rotation.x = -PI / 2; ground.receiveShadow = true; scene.add(ground);

    const bubble = document.createElement("div"); bubble.className = "av-bubble"; bubble.setAttribute("role", "status"); el.appendChild(bubble);
    let bubbleTimer;
    function say(text, ms = 3200) { bubble.textContent = text; bubble.classList.add("show"); clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => bubble.classList.remove("show"), ms); }

    const std = (hex, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: lin(hex), roughness: 0.5 }, o));
    const props = {}, scr = codeScreen(), brd = boardTex(opts.board || "churn");
    const metal = std(0x9aa4ad, { roughness: 0.3, metalness: 0.8 });
    props.desk = new T.Group();
    const top = new T.Mesh(new T.BoxGeometry(1.5, 0.05, 0.62), std(0xe7ebf0, { roughness: 0.35 })); top.position.set(0, 1.72, 0.62); top.castShadow = top.receiveShadow = true; props.desk.add(top);
    [-0.65, 0.65].forEach(x => { const l = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1.7, 12), metal); l.position.set(x, 0.85, 0.62); props.desk.add(l); });
    const lap = new T.Group(); lap.position.set(0, 1.755, 0.62); lap.rotation.y = PI; props.desk.add(lap);
    const shell = std(0x3a4250, { roughness: 0.35, metalness: 0.5 });
    const kb = new T.Mesh(new T.BoxGeometry(0.62, 0.022, 0.42), shell); kb.castShadow = true; lap.add(kb);
    const lid = new T.Group(); lid.position.set(0, 0.01, 0.2); lid.rotation.x = 0.32; lap.add(lid);
    const lb = new T.Mesh(new T.BoxGeometry(0.62, 0.4, 0.018), shell); lb.position.y = 0.2; lid.add(lb);
    const screen = new T.Mesh(new T.PlaneGeometry(0.56, 0.35), new T.MeshBasicMaterial({ map: scr, toneMapped: false })); screen.position.set(0, 0.2, -0.011); screen.rotation.y = PI; lid.add(screen);
    props.board = new T.Group();
    const bp = new T.Mesh(new T.PlaneGeometry(1.5, 0.94), new T.MeshBasicMaterial({ map: brd, toneMapped: false })); bp.position.y = 2.05; props.board.add(bp);
    const frm = new T.Mesh(new T.BoxGeometry(1.58, 1.02, 0.04), std(0xdfe5ec)); frm.position.set(0, 2.05, -0.03); frm.castShadow = true; props.board.add(frm);
    const pole = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 1.6, 12), metal); pole.position.set(0, 0.8, -0.05); props.board.add(pole);
    props.board.position.set(1.6, 0, -0.25); props.board.rotation.y = -0.38;
    props.doc = new T.Mesh(new T.PlaneGeometry(0.36, 0.47), new T.MeshBasicMaterial({ map: docTex(), side: T.DoubleSide, toneMapped: false }));
    props.blocks = new T.Group();
    ["4", "0", "4"].forEach((c, i) => { const face = std(0xdfe5ec), b = new T.Mesh(new T.BoxGeometry(0.42, 0.42, 0.42), [face, face, face, face, new T.MeshStandardMaterial({ map: letterTex(c, ["#1F5FAD", "#C77F00", "#1F5FAD"][i]), roughness: 0.5 }), face]); b.castShadow = true; b.userData.i = i; props.blocks.add(b); });
    Object.values(props).forEach(p => { p.visible = false; scene.add(p); });

    let ch = null, basePose = opts.pose || "idle", action = null, actionT = 0, t = 0, blinkAt = 1.5, jump = 0;
    const mouse = { x: 0, y: 0 }, st = {}, queue = [];
    window.addEventListener("pointermove", e => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
    const S = (k, v, r) => (st[k] = st[k] === undefined ? v : lerp(st[k], v, r));

    function camFor(p) {
      if (opts.cam) return opts.cam;
      if (p === "present") return { pos: [0.75, 2.35, 8.0], look: [0.72, 2.05, 0] };
      if (p === "build") return { pos: [0.6, 2.0, 8.4], look: [0.55, 1.7, 0] };
      if (p === "type") return { pos: [0, 2.95, 5.2], look: [0, 2.45, 0.3] };
      return { pos: [0, 2.65, 4.6], look: [0, 2.48, 0] };
    }
    const camPos = new T.Vector3(...camFor(basePose).pos), camLook = new T.Vector3(...camFor(basePose).look);

    // Pose angles: shoulder (sx forward/back, sz sideways; 0 = arm hanging straight down), elbow (ex, ez), head, spine bow
    function pose(name, u) {
      const A = { bodyX: 0, turn: 0, headX: 0, headY: 0, headZ: 0, mouth: 0.05, smile: 0.3, brow: 0, look: null,
        R: { sx: 0.04, sz: -0.13, ex: -0.12, ez: 0.05 }, L: { sx: 0.04, sz: 0.13, ex: -0.12, ez: -0.05 } };
      const br = Math.sin(u * 1.6) * 0.015;
      switch (name) {
        case "idle": A.headY = mouse.x * 0.42; A.headX = mouse.y * 0.16; A.turn = Math.sin(u * 0.45) * 0.07; A.R.sx += br; A.L.sx -= br; A.look = [mouse.x, mouse.y]; break;
        case "wave": A.R = { sx: -0.15, sz: -2.7, ex: -0.25, ez: -0.4 + Math.sin(u * 10) * 0.42, curl: 0.04, tw: -0.4 }; A.headZ = 0.07; A.mouth = 0.55; A.smile = 1; A.brow = 0.006; A.turn = 0.1; break;
        case "namaste": { const tw = -0.9, ez = 1.18; A.R = { sx: -0.35, sz: 0.42, ex: -1.85, ez: ez, tw: tw, curl: 0 }; A.L = { sx: -0.35, sz: -0.42, ex: -1.85, ez: -ez, tw: -tw, curl: 0 }; A.bodyX = 0.18 + Math.sin(u * 2) * 0.03; A.headX = 0.2; A.mouth = 0.08; A.smile = 1; } A.bodyX = 0.2 + Math.sin(u * 2) * 0.03; A.headX = 0.2; A.mouth = 0.08; A.smile = 1; break;
        case "type": { const k = Math.sin(u * 15), k2 = Math.sin(u * 15 + 2);
          A.R = { sx: -0.3 + k * 0.04, sz: 0.12, ex: -0.9 + k * 0.1, ez: 0.25, tw: 1.45, curl: 0.45 }; A.L = { sx: -0.3 + k2 * 0.04, sz: -0.12, ex: -0.9 + k2 * 0.1, ez: -0.25, tw: -1.45, curl: 0.45 };
          A.headX = 0.3; A.headY = Math.sin(u * 0.7) * 0.1; A.smile = 0.2; A.look = [0, 0.8]; break; }
        case "present": A.turn = 0.28; A.L = { sx: -0.2, sz: 1.5 + Math.sin(u * 1.8) * 0.1, ex: -0.1, ez: 0.05, curl: 0.1 }; A.R = { sx: -0.35, sz: -0.2, ex: -0.7, ez: 0.1 };
          A.headY = 0.2 + Math.sin(u * 0.8) * 0.3; A.mouth = 0.15 + Math.max(0, Math.sin(u * 7)) * 0.4; A.smile = 0.6; A.look = [Math.sin(u * 0.8) > 0 ? 0.9 : 0, 0]; break;
        case "read": A.R = { sx: -0.55, sz: 0.22, ex: -1.25, ez: 0.4, curl: 0.55 }; A.L = { sx: -0.55, sz: -0.22, ex: -1.25, ez: -0.4, curl: 0.55 }; A.headX = 0.34; A.headY = Math.sin(u * 0.9) * 0.1; A.brow = 0.003; A.look = [Math.sin(u * 2.2) * 0.4, 0.9]; break;
        case "build": { const sw = Math.sin(u * 5.5); A.turn = 0.35; A.R = { sx: -1.7 + sw * 0.75, sz: -0.12, ex: -0.5 - Math.max(0, sw) * 0.45, ez: 0, curl: 1.1 }; A.L = { sx: -0.45, sz: 0.3, ex: -0.9, ez: 0 }; A.headY = 0.35; A.headX = 0.16; A.mouth = 0.12; A.brow = -0.003; A.look = [0.8, 0.5]; break; }
        case "celebrate": A.R = { sx: 0, sz: -2.65 + Math.sin(u * 9) * 0.12, ex: -0.3, ez: -0.3 }; A.L = { sx: 0, sz: 2.65 - Math.sin(u * 9) * 0.12, ex: -0.3, ez: 0.3 }; A.mouth = 0.85; A.smile = 1; A.brow = 0.007; A.headX = -0.12; break;
        case "think": A.R = { sx: -1.3, sz: 0.32, ex: -2.0, ez: 0.55 }; A.headZ = 0.1; A.headX = -0.1; A.headY = -0.2 + Math.sin(u * 0.6) * 0.08; A.brow = 0.006; A.look = [-0.5, -0.6]; break;
      }
      return A;
    }

    function setBase(name) {
      basePose = name;
      const show = { type: ["desk"], present: ["board"], build: ["blocks"], read: ["doc"] }[name] || [];
      ["desk", "board", "blocks", "doc"].forEach(k => props[k].visible = show.includes(k));
      if (ch) { ch.hat.visible = ch.hammer.visible = name === "build"; ch.group.position.x = name === "present" ? -0.15 : name === "build" ? -0.35 : 0; }
    }
    function play(seq) { queue.length = 0; queue.push(...seq); next(); }
    function next() { const s = queue.shift(); if (!s) { action = null; return; } action = s; actionT = 0; s.start && s.start(); }
    const api = {
      setPose(name) { if (name !== basePose) setBase(name); }, say,
      greet() { jump = 0.25; play([{ name: "wave", dur: 1.9, start: () => say("Hi! Namaste 🙏", 3800) }, { name: "namaste", dur: 2.0 }]); },
      celebrate(text) { jump = 0.4; play([{ name: "celebrate", dur: 1.8, start: () => text && say(text, 2600) }]); },
      react() { jump = 0.22; say(["Hey!", "That tickles.", "Tap me 3 times…"][Math.floor(Math.random() * 3)], 1600); },
      wave(text) { play([{ name: "wave", dur: 1.8, start: () => text && say(text, 3000) }]); },
      think(text) { play([{ name: "think", dur: 2.4, start: () => text && say(text, 2600) }]); },
      _play(name, dur) { play([{ name, dur }]); },
      ready: null,
    };
    let taps = 0, tapTimer;
    renderer.domElement.addEventListener("click", () => { taps++; clearTimeout(tapTimer); tapTimer = setTimeout(() => { if (taps >= 3) api.greet(); else api.react(); taps = 0; }, 380); });

    function size() { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    new ResizeObserver(size).observe(el); size();
    let visible = true; new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(el);

    api.ready = loadData().then(d => { ch = buildCharacter(d); scene.add(ch.group); setBase(basePose); el.classList.add("av-ready"); return api; })
      .catch(e => { console.warn("Avatar could not load:", e); el.classList.add("av-failed"); });

    const clock = new T.Clock(), tmp = new T.Vector3(), tmp2 = new T.Vector3();
    let texTick = 0;
    function frame() {
      requestAnimationFrame(frame);
      if (!visible || document.hidden || !ch) { clock.getDelta(); return; }
      const dt = Math.min(0.05, clock.getDelta()); t += dt * (reduce ? 0.5 : 1);
      if (action) { actionT += dt; if (actionT > action.dur) next(); }
      const P = pose(action ? action.name : basePose, t), r = 1 - Math.pow(0.0006, dt), B = ch.bones;
      ch.group.rotation.y = S("turn", P.turn, r);
      const bx = S("bodyX", P.bodyX, r), breath = Math.sin(t * 1.6) * 0.012;
      ch.delta("Spine", qE(bx * 0.3 + breath, 0, 0)); ch.delta("Spine1", qE(bx * 0.35, 0, 0)); ch.delta("Spine2", qE(bx * 0.35 - breath, 0, 0));
      const hx = S("hx", P.headX, r), hy = S("hy", P.headY, r), hz = S("hz", P.headZ, r);
      ch.delta("Neck", qE(hx * 0.4, hy * 0.4, hz * 0.4)); ch.delta("Head", qE(hx * 0.6, hy * 0.6, hz * 0.6));
      ["R", "L"].forEach(n => { const J = P[n], A = ch.arm[n];
        const sx = S(n + "sx", J.sx, r), sz = S(n + "sz", J.sz, r), ex = S(n + "ex", J.ex, r), ez = S(n + "ez", J.ez, r), tw = S(n + "tw", J.tw || 0, r);
        ch.delta(A.side + "Arm", qE(sx, 0, sz).multiply(A.fix));
        ch.delta(A.side + "ForeArm", A.conj.clone().multiply(qE(ex, 0, ez)).multiply(A.conjI));
        ch.delta(A.side + "Hand", new T.Quaternion().setFromAxisAngle(A.axis, tw));
        const curl = S(n + "curl", J.curl ?? 0.25, r), sg = n === "L" ? -1 : 1;
        ["Index", "Middle", "Ring", "Pinky"].forEach((f, i) => [1, 2, 3].forEach(k => ch.delta(A.side + "Hand" + f + k, qZ(sg * curl * (k === 1 ? 0.7 : 1) * (1 + i * 0.12)))));
      });
      // face: blink, smile, talk, brows, gaze
      const mo = S("mouth", P.mouth, r), sm = S("smile", P.smile, r), bv = S("brow", P.brow, r);
      blinkAt -= dt; let open = 1; if (blinkAt < 0.14) open = Math.abs(blinkAt / 0.07 - 1); if (blinkAt < 0) blinkAt = 2 + Math.random() * 3.5;
      ch.setMorph("eyeBlinkLeft", 1 - open); ch.setMorph("eyeBlinkRight", 1 - open);
      ch.setMorph("mouthSmileLeft", sm * 0.55); ch.setMorph("mouthSmileRight", sm * 0.55); ch.setMorph("cheekSquintLeft", sm * 0.3); ch.setMorph("cheekSquintRight", sm * 0.3);
      ch.setMorph("jawOpen", mo * 0.32); ch.setMorph("mouthFunnel", Math.max(0, mo - 0.3) * 0.15);
      const up = Math.max(0, bv) * 110, down = Math.max(0, -bv) * 110;
      ch.setMorph("browInnerUp", up); ch.setMorph("browOuterUpLeft", up * 0.8); ch.setMorph("browOuterUpRight", up * 0.8); ch.setMorph("browDownLeft", down); ch.setMorph("browDownRight", down);
      const lk = P.look || [0, 0], lx = S("lx", lk[0], r), ly = S("ly", lk[1], r);
      ch.delta("LeftEye", qE(ly * 0.22, lx * 0.32, 0)); ch.delta("RightEye", qE(ly * 0.22, lx * 0.32, 0));
      jump = Math.max(0, jump - dt); ch.group.position.y = jump > 0 ? Math.sin(Math.min(1, jump / 0.25) * PI) * 0.12 : 0;
      texTick += dt;
      if (texTick > 0.08) { texTick = 0; if (props.desk.visible) { scr.userData.draw(scr.userData.ctx, t); scr.needsUpdate = true; } if (props.board.visible) { brd.userData.draw(brd.userData.ctx, t); brd.needsUpdate = true; } }
      if (props.doc.visible) { B.RightHand.getWorldPosition(tmp); B.LeftHand.getWorldPosition(tmp2); props.doc.position.copy(tmp).add(tmp2).multiplyScalar(0.5).add(new T.Vector3(0, 0.02, 0.2)); props.doc.rotation.set(-0.3, Math.sin(t * 0.5) * 0.08, 0); }
      if (props.blocks.visible) props.blocks.children.forEach(b => { const i = b.userData.i, cyc = (t * 0.5 + i * 0.33) % 3;
        const y = cyc < 0.6 ? lerp(3.6, 0.21, Math.pow(cyc / 0.6, 2)) : 0.21 + (cyc < 0.75 ? Math.sin((cyc - 0.6) / 0.15 * PI) * 0.06 : 0);
        b.position.set(0.5 + i * 0.47, y, 0.4); b.rotation.y = -0.25 + (cyc < 0.6 ? (1 - cyc / 0.6) * 1.2 : 0); });
      const c = camFor(basePose); camPos.lerp(tmp.set(...c.pos), r * 0.5); camLook.lerp(tmp2.set(...c.look), r * 0.5); cam.position.copy(camPos); cam.lookAt(camLook);
      renderer.render(scene, cam);
      B.Head.getWorldPosition(tmp); tmp.y += 0.5; tmp.project(cam);
      const bw = bubble.offsetWidth || 0, rect = el.getBoundingClientRect(), rightRoom = innerWidth - rect.left - 8;
      bubble.style.left = Math.max(bw / 2 + 4 - rect.left, Math.min((tmp.x + 1) / 2 * el.clientWidth, rightRoom - bw / 2)) + "px";
      bubble.style.top = Math.max(34, (1 - tmp.y) / 2 * el.clientHeight) + "px";
    }
    frame();
    return api;
  }
  window.YBAvatar = { mount };
})();
