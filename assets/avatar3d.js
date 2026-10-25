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
    const root = T.SkeletonUtils ? T.SkeletonUtils.clone(gltf.scene) : gltf.scene, group = new T.Group(); group.add(root);
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
    const lap = new T.Group(); lap.position.set(0, 1.755, 0.6); props.desk.add(lap);
    const shell = std(0x3a4250, { roughness: 0.35, metalness: 0.5 });
    const kb = new T.Mesh(new T.BoxGeometry(0.62, 0.022, 0.42), shell); kb.castShadow = true; lap.add(kb);
    const lid = new T.Group(); lid.position.set(0, 0.01, 0.2); lid.rotation.x = 0.32; lap.add(lid);
    const lb = new T.Mesh(new T.BoxGeometry(0.62, 0.4, 0.018), shell); lb.position.y = 0.2; lid.add(lb);
    const screen = new T.Mesh(new T.PlaneGeometry(0.56, 0.35), new T.MeshBasicMaterial({ map: scr, toneMapped: false })); screen.position.set(0, 0.2, -0.011); screen.rotation.y = PI; lid.add(screen);
    const logo = new T.Mesh(new T.CircleGeometry(0.045, 32), new T.MeshBasicMaterial({ color: 0x9fc4ff, toneMapped: false })); logo.position.set(0, 0.2, 0.011); lid.add(logo);
    const holo = new T.Mesh(new T.PlaneGeometry(0.95, 0.6), new T.MeshBasicMaterial({ map: scr, transparent: true, opacity: 0.88, toneMapped: false, side: T.DoubleSide }));
    holo.position.set(0.66, 3.0, -0.25); holo.rotation.y = -0.4; holo.scale.setScalar(0.62); props.desk.add(holo);
    const holoEdge = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(0.95, 0.6)), new T.LineBasicMaterial({ color: 0x74aef2 })); holoEdge.position.copy(holo.position); holoEdge.rotation.copy(holo.rotation); holoEdge.scale.copy(holo.scale); props.desk.add(holoEdge);
    // Skills scene: seated workstation, chair and a wall clock that races through a workday
    props.work = new T.Group();
    const wtop = new T.Mesh(new T.BoxGeometry(1.5, 0.05, 0.62), std(0xe7ebf0, { roughness: 0.35 })); wtop.position.set(0, 1.12, 0.82); wtop.castShadow = wtop.receiveShadow = true; props.work.add(wtop);
    [-0.68, 0.68].forEach(x => { const l = new T.Mesh(new T.BoxGeometry(0.05, 1.1, 0.55), std(0xcfd6de)); l.position.set(x, 0.55, 0.82); props.work.add(l); });
    const mon = new T.Group(); mon.position.set(0, 1.15, 0.98); props.work.add(mon);
    const mstand = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.32, 12), metal); mstand.position.y = 0.16; mon.add(mstand);
    const mback = new T.Mesh(new T.BoxGeometry(0.8, 0.48, 0.035), shell); mback.position.y = 0.52; mback.castShadow = true; mon.add(mback);
    const mscr = new T.Mesh(new T.PlaneGeometry(0.74, 0.42), new T.MeshBasicMaterial({ map: scr, toneMapped: false })); mscr.position.set(0, 0.52, -0.019); mscr.rotation.y = PI; mon.add(mscr);
    const mlogo = new T.Mesh(new T.CircleGeometry(0.04, 32), new T.MeshBasicMaterial({ color: 0x9fc4ff, toneMapped: false })); mlogo.position.set(0, 0.52, 0.019); mon.add(mlogo);
    const kbd = new T.Mesh(new T.BoxGeometry(0.5, 0.02, 0.16), shell); kbd.position.set(0, 1.155, 0.66); props.work.add(kbd);
    const mug = new T.Mesh(new T.CylinderGeometry(0.05, 0.045, 0.12, 20), std(0xc77f00, { roughness: 0.4 })); mug.position.set(0.5, 1.2, 0.75); props.work.add(mug);
    const chairM = std(0x2b3546, { roughness: 0.6 });
    const fixedChair = new T.Group(); props.work.add(fixedChair);
    const seat = new T.Mesh(new T.BoxGeometry(0.62, 0.07, 0.56), chairM); seat.position.set(0, 0.8, 0.12); seat.castShadow = true; fixedChair.add(seat);
    const back = new T.Mesh(new T.BoxGeometry(0.6, 0.75, 0.06), chairM); back.position.set(0, 1.25, -0.2); back.rotation.x = -0.1; fixedChair.add(back);
    const post = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.6, 12), metal); post.position.set(0, 0.48, 0.1); fixedChair.add(post);
    const base5 = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.04, 5), metal); base5.position.set(0, 0.06, 0.1); fixedChair.add(base5);
    let clockHours = 9;
    const clockTex = canvasTex(256, 300, ctx => {
      ctx.clearRect(0, 0, 256, 300);
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(128, 128, 120, 0, 2 * PI); ctx.fill();
      ctx.lineWidth = 8; ctx.strokeStyle = "#16233B"; ctx.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * 2 * PI; ctx.lineWidth = i % 3 ? 3 : 6; ctx.beginPath(); ctx.moveTo(128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96); ctx.lineTo(128 + Math.sin(a) * 110, 128 - Math.cos(a) * 110); ctx.stroke(); }
      const hh = clockHours % 12, mm = (clockHours % 1) * 60;
      const hand = (a, len, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len); ctx.stroke(); };
      hand(hh / 12 * 2 * PI, 58, 9, "#16233B"); hand(mm / 60 * 2 * PI, 88, 5, "#1F5FAD");
      ctx.fillStyle = "#C77F00"; ctx.beginPath(); ctx.arc(128, 128, 8, 0, 2 * PI); ctx.fill();
      const H = Math.floor(clockHours) % 24, M = Math.floor(mm);
      ctx.fillStyle = "#16233B"; ctx.fillRect(58, 256, 140, 40); ctx.fillStyle = "#EBA83C"; ctx.font = "700 30px monospace"; ctx.textAlign = "center";
      ctx.fillText(String(H).padStart(2, "0") + ":" + String(M).padStart(2, "0"), 128, 287);
    });
    const wallClock = new T.Mesh(new T.PlaneGeometry(0.7, 0.82), new T.MeshBasicMaterial({ map: clockTex, transparent: true, toneMapped: false }));
    wallClock.position.set(1.05, 2.55, -0.5); props.work.add(wallClock);
    // ---- studio film props
    const coatM = std(0xb08a5a, { roughness: 0.85 }), coatD = std(0x8c6b43, { roughness: 0.85 });
    const coat = new T.Group();
    const cBody = new T.Mesh(new T.BoxGeometry(0.42, 0.62, 0.05), coatM); cBody.castShadow = true; coat.add(cBody);
    const cFold = new T.Mesh(new T.BoxGeometry(0.42, 0.22, 0.05), coatD); cFold.position.set(0, 0.36, 0.06); cFold.rotation.x = -0.6; coat.add(cFold);
    [-1, 1].forEach(sd => { const sl = new T.Mesh(new T.CylinderGeometry(0.045, 0.05, 0.5, 12), coatD); sl.position.set(sd * 0.2, 0.02, 0.02); sl.rotation.z = sd * 0.15; coat.add(sl); });
    const collar = new T.Mesh(new T.BoxGeometry(0.44, 0.06, 0.08), coatD); collar.position.y = 0.3; coat.add(collar);
    props.coat = coat;
    const chairG = new T.Group(); props.chair = chairG;
    { const seatS = new T.Mesh(new T.BoxGeometry(0.62, 0.07, 0.56), std(0x2b3546, { roughness: 0.6 })); seatS.position.y = 0.8; seatS.castShadow = true; chairG.add(seatS);
      const backS = new T.Mesh(new T.BoxGeometry(0.6, 0.75, 0.06), std(0x2b3546, { roughness: 0.6 })); backS.position.set(0, 1.25, -0.3); backS.rotation.x = -0.1; backS.castShadow = true; chairG.add(backS);
      const postS = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.6, 12), metal); postS.position.y = 0.48; chairG.add(postS);
      const baseS = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.04, 5), metal); baseS.position.y = 0.06; chairG.add(baseS); }
    const skillsTex = canvasTex(512, 300, ctx => {
      ctx.fillStyle = "#0E1520"; ctx.fillRect(0, 0, 512, 300);
      ctx.fillStyle = "#EBA83C"; ctx.font = "700 30px monospace"; ctx.fillText("skills.txt", 26, 46);
      ["SQL & Python", "Databricks & PySpark", "Machine learning", "Power BI & DAX", "LLMs & RAG", "BPMN & stakeholders"].forEach((k, i) => {
        ctx.fillStyle = "#5CC2AE"; ctx.font = "700 24px monospace"; ctx.fillText("✓", 26, 92 + i * 34); ctx.fillStyle = "#E4E9F0"; ctx.font = "22px monospace"; ctx.fillText(k, 60, 92 + i * 34); });
    });
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
      if (p === "skills") return { pos: [0.35, 2.35, 8.2], look: [0.3, 1.75, 0] };
      if (p === "type") return { pos: [0, 2.95, 5.2], look: [0, 2.45, 0.3] };
      return { pos: [0, 2.65, 4.6], look: [0, 2.48, 0] };
    }

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
        case "flip": A.R = { sx: -1.1, sz: -0.3, ex: -1.3, ez: 0, curl: 0.8 }; A.L = { sx: -1.1, sz: 0.3, ex: -1.3, ez: 0, curl: 0.8 }; A.headX = 0.25; A.mouth = 0.3; A.smile = 1; break;
        case "walk": { const w = Math.sin(u * 10); A.R = { sx: w * 0.45, sz: -0.12, ex: -0.3, ez: 0 }; A.L = { sx: -w * 0.45, sz: 0.12, ex: -0.3, ez: 0 }; A.walk = 1; A.smile = 0.6; break; }
        case "skills": {
          const k = u - baseStart;
          if (k < 1.3) { const w = Math.sin(u * 10); A.R.sx = w * 0.4; A.L.sx = -w * 0.4; A.walk = 1; A.x = lerp(2.3, 0, k / 1.3); A.smile = 0.5; }
          else if (k < 2.1) { A.thigh = -1.5; A.knee = 1.5; A.drop = -0.68; A.bodyX = 0.15; }
          else if (k < 8.2) { const t1 = Math.sin(u * 15), t2 = Math.sin(u * 15 + 2);
            A.thigh = -1.5; A.knee = 1.5; A.drop = -0.68; A.bodyX = 0.08; A.headX = 0.12; A.look = [0, 0.3];
            A.R = { sx: -0.3 + t1 * 0.04, sz: 0.12, ex: -0.9 + t1 * 0.1, ez: 0.25, tw: 1.45, curl: 0.45 }; A.L = { sx: -0.3 + t2 * 0.04, sz: -0.12, ex: -0.9 + t2 * 0.1, ez: -0.25, tw: -1.45, curl: 0.45 };
            A.clock = true; if (k > 6.6) { A.headY = 0.5; A.look = [0.9, -0.4]; A.brow = 0.006; A.mouth = 0.4; } }
          else if (k < 9.0) { A.thigh = -0.7; A.knee = 0.7; A.drop = -0.3; A.bodyX = 0.3; }
          else { A.turn = -0.7; A.R = { sx: -1.42 + Math.sin(u * 3) * 0.05, sz: -0.12, ex: -0.05, ez: 0, curl: 0.15 }; A.L = { sx: -1.42 + Math.sin(u * 3 + 1) * 0.05, sz: 0.12, ex: -0.05, ez: 0, curl: 0.15 }; A.smile = 1; A.mouth = 0.25; A.point = true; }
          break; }
        case "studio": {
          const k = u - baseStart, e = (a, b) => Math.min(1, Math.max(0, (k - a) / (b - a))), sm = x => x * x * (3 - 2 * x);
          A.x = -0.65; A.z = -4.6;
          if (k < 0.5) { A.z = -4.6; }
          else if (k < 2.0) { const w = Math.sin(u * 10); A.z = lerp(-4.2, -0.35, e(0.5, 2.0)); A.walk = 1; A.L.sx = -w * 0.4; A.R = { sx: -2.55, sz: -0.25, ex: -2.0, ez: 0.2, curl: 0.9 }; A.smile = 0.5; }
          else if (k < 2.9) { A.z = -0.35; const f = sm(e(2.0, 2.45)); A.R = { sx: lerp(-2.7, -0.7, f), sz: -0.2, ex: lerp(-2.1, -0.2, f), ez: 0, curl: lerp(0.9, 0.1, f) }; A.bodyX = 0.12 * f; A.mouth = 0.3; A.smile = 0.7; }
          else if (k < 3.9) { A.z = -0.35; A.headY = 0.7; A.look = [0.9, 0.2]; A.brow = 0.004; A.smile = 0.6; }
          else if (k < 4.6) { const f = sm(e(3.9, 4.5)); A.x = lerp(-0.65, 0, f); A.z = lerp(-0.35, 0, f); A.walk = 0.6; }
          else if (k < 11.2) { A.x = 0; A.z = 0; A.thigh = -1.5; A.knee = 1.5; A.drop = -0.68;
            if (k < 5.0) A.bodyX = 0.15;
            else if (k < 6.4) { A.turn = sm(e(5.0, 6.3)) * 2 * PI; A.R = { sx: -0.4, sz: -0.9, ex: -0.3, ez: 0, curl: 0.2 }; A.L = { sx: -0.4, sz: 0.9, ex: -0.3, ez: 0, curl: 0.2 }; A.mouth = 0.6; A.smile = 1; A.brow = 0.006; }
            else { A.turn = 2 * PI; const t1 = Math.sin(u * 15), t2 = Math.sin(u * 15 + 2); A.bodyX = 0.08;
              A.R = { sx: -0.3 + t1 * 0.04, sz: 0.12, ex: -0.9 + t1 * 0.1, ez: 0.25, tw: 1.45, curl: 0.45 }; A.L = { sx: -0.3 + t2 * 0.04, sz: -0.12, ex: -0.9 + t2 * 0.1, ez: -0.25, tw: -1.45, curl: 0.45 };
              A.clock = true; if (k > 9.6) { A.headY = -0.6; A.headX = -0.15; A.look = [-0.9, -0.5]; A.brow = 0.007; A.mouth = 0.35; } } }
          else if (k < 12.4) { A.turn = 2 * PI; const f = sm(e(11.2, 11.8)); A.thigh = -1.5 * (1 - f); A.knee = 1.5 * (1 - f); A.drop = -0.68 * (1 - f); A.x = lerp(0, -1.05, sm(e(11.7, 12.4))); A.z = 0; if (k > 11.7) A.walk = 0.6; }
          else { A.turn = 2 * PI; A.x = -1.05; A.z = 0;
            if (k < 15.6) { A.L = { sx: -0.35, sz: 1.25, ex: -0.35, ez: 0.1, tw: -1.2, curl: 0.05 }; A.R = { sx: 0.1, sz: -0.6, ex: -0.3, ez: 1.2, curl: 0.6 };
              A.headZ = 0.17; A.headY = 0.25; A.smirk = 1; A.brow = 0.005; A.browOne = 1; A.look = k > 13.6 && k < 14.2 ? [0, -1] : [0.2, 0]; }
            else { const c = Math.max(0, Math.sin(u * 3.2)); A.R = { sx: -1.05, sz: 0.3 - c * 0.22, ex: -1.35, ez: 0.45, curl: 0.05 }; A.L = { sx: -1.05, sz: -0.3 + c * 0.22, ex: -1.35, ez: -0.45, curl: 0.05 };
              A.smirk = 1; A.headZ = -0.08; A.browOne = 1; A.brow = 0.004; } }
          break; }
        case "tickle": { const w = Math.sin(u * 22); A.R = { sx: -0.5, sz: 0.5, ex: -1.6, ez: 0.4, curl: 0.7 }; A.L = { sx: -0.5, sz: -0.5, ex: -1.6, ez: -0.4, curl: 0.7 };
          A.turn = w * 0.12; A.headZ = w * 0.12; A.headX = 0.1; A.mouth = 0.8; A.smile = 1; A.brow = 0.006; A.bodyX = 0.12; break; }
        case "think": A.R = { sx: -1.3, sz: 0.32, ex: -2.0, ez: 0.55 }; A.headZ = 0.1; A.headX = -0.1; A.headY = -0.2 + Math.sin(u * 0.6) * 0.08; A.brow = 0.006; A.look = [-0.5, -0.6]; break;
      }
      return A;
    }

    const camPos = new T.Vector3(...camFor(basePose).pos), camLook = new T.Vector3(...camFor(basePose).look);
    let baseStart = 0, baseX = 0, pointSaid = false, workSaid = 0; const film = { said: {}, thrown: false, landed: false, from: new T.Vector3(), t0: 0 };
    function setBase(name) {
      basePose = name; baseStart = t; pointSaid = false; workSaid = 0; clockHours = 9; film.said = {}; film.thrown = false; film.landed = false;
      if (st.turn !== undefined) st.turn = ((st.turn % (2 * PI)) + 2 * PI) % (2 * PI) > PI ? 0 : st.turn % (2 * PI);
      fixedChair.visible = name !== "studio"; mon.rotation.y = 0; mscr.material.map = scr; wallClock.scale.setScalar(name === "studio" ? 0.001 : 1);
      if (name === "studio") { camPos.set(7.4, 2.25, -0.55); camLook.set(0, 1.55, -0.55); wallClock.position.set(-1.3, 2.75, 1.25); chairG.position.set(0, 0, -5.5); chairG.rotation.y = 0; coat.rotation.set(0, 0, 0); } else wallClock.position.set(1.05, 2.55, -0.5);
      const show = { type: ["desk"], present: ["board"], build: ["blocks"], read: ["doc"], skills: ["work"], studio: ["work", "coat", "chair"] }[name] || [];
      ["desk", "board", "blocks", "doc", "work", "coat", "chair"].forEach(k => props[k].visible = show.includes(k));
      if (ch) { ch.hat.visible = ch.hammer.visible = name === "build"; ch.group.position.x = name === "present" ? -0.15 : name === "build" ? -0.35 : 0; }
      baseX = name === "present" ? -0.15 : name === "build" ? -0.35 : 0;
    }
    function play(seq) { queue.length = 0; queue.push(...seq); next(); }
    function next() { const s = queue.shift(); if (!s) { action = null; return; } action = s; actionT = 0; s.start && s.start(); }
    const api = {
      setPose(name) { if (name !== basePose) setBase(name); }, say,
      greet() { jump = 0.25; play([{ name: "wave", dur: 1.9, start: () => say("Hi! Namaste 🙏", 3800) }, { name: "namaste", dur: 2.0 }]); },
      celebrate(text) { jump = 0.4; play([{ name: "celebrate", dur: 1.8, start: () => text && say(text, 2600) }]); },
      react() { jump = 0.22; say(["Hey!", "That tickles.", "Tap me 3 times…"][Math.floor(Math.random() * 3)], 1600); },
      wave(text) { play([{ name: "wave", dur: 1.8, start: () => text && say(text, 3000) }]); },
      flip(then) { play([{ name: "flip", dur: 1.6 }].concat(then || [])); },
      entry(then) { play([{ name: "walk", dur: 0.9, from: 2.8, to: 1.0 }, { name: "flip", dur: 1.6, from: 1.0, to: 0 }].concat(then || [])); },
      namaste() { play([{ name: "namaste", dur: 2.4, start: () => say("Namaste 🙏", 2400) }]); },
      tickle() { jump = 0.22; play([{ name: "tickle", dur: 1.6, start: () => say("Hehe, that tickles! 😄", 2000) }]); },
      somersault() { const back = Math.random() < 0.5; play([{ name: "flip", dur: 1.6, dir: back ? -1 : 1, start: () => say(back ? "Backflip! 🤸" : "Front flip! 🤸", 1800) }, { name: "celebrate", dur: 1.2 }]); },
      think(text) { play([{ name: "think", dur: 2.4, start: () => text && say(text, 2600) }]); },
      _play(name, dur) { play([{ name, dur }]); },
      _seek(k) { baseStart = t - k; },
      restart(name) { setBase(name || basePose); },
      ready: null,
    };
    let taps = 0, tapTimer;
    renderer.domElement.addEventListener("click", () => { taps++; clearTimeout(tapTimer); tapTimer = setTimeout(() => { const n = taps; taps = 0;
      if (n >= 5) api.somersault(); else if (n >= 3) api.tickle(); else if (n === 2) api.namaste(); else api.react(); }, 420); });

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
      const smk = S("smirk", P.smirk || 0, r); ch.setMorph("mouthSmileLeft", sm * 0.55 * (1 - smk) + smk * 0.75); ch.setMorph("mouthSmileRight", sm * 0.55 * (1 - smk) + smk * 0.05); ch.setMorph("cheekSquintLeft", sm * 0.3); ch.setMorph("cheekSquintRight", sm * 0.3);
      ch.setMorph("jawOpen", mo * 0.32); ch.setMorph("mouthFunnel", Math.max(0, mo - 0.3) * 0.15);
      const up = Math.max(0, bv) * 110, down = Math.max(0, -bv) * 110;
      const one = S("browOne", P.browOne || 0, r); ch.setMorph("browInnerUp", up * (1 - one * 0.7)); ch.setMorph("browOuterUpLeft", up * 0.8 + one * 0.7); ch.setMorph("browOuterUpRight", up * 0.8 * (1 - one)); ch.setMorph("browDownRight", down + one * 0.35); ch.setMorph("browDownLeft", down); ch.setMorph("browDownRight", down);
      const lk = P.look || [0, 0], lx = S("lx", lk[0], r), ly = S("ly", lk[1], r);
      ch.delta("LeftEye", qE(ly * 0.22, lx * 0.32, 0)); ch.delta("RightEye", qE(ly * 0.22, lx * 0.32, 0));
      jump = Math.max(0, jump - dt);
      // front flip: crouch, jump, rotate forward 360 degrees around the hips, land
      let fy = 0, fr = 0, tuck = 0;
      if (action && action.name === "flip") {
        const f = Math.min(1, actionT / action.dur);
        if (f < 0.18) { tuck = f / 0.18 * 0.5; fy = -0.12 * (f / 0.18); }
        else if (f < 0.82) { const g = (f - 0.18) / 0.64; fy = Math.sin(g * PI) * 1.05; fr = (1 - Math.cos(g * PI)) / 2 * 2 * PI * (action.dir || 1); tuck = 0.5 + Math.sin(g * PI) * 0.5; }
        else { const g = (f - 0.82) / 0.18; tuck = 0.5 * (1 - g); fy = -0.12 * (1 - g); }
      }
      const tk = S("tuck", tuck, Math.min(1, r * 2.5)), th = S("thigh", P.thigh || 0, r), kn = S("knee", P.knee || 0, r), wk = S("walk", P.walk || 0, r), ws = Math.sin(t * 10) * 0.55 * wk;
      ch.delta("LeftUpLeg", qE(-tk * 1.5 + th + ws, 0, 0)); ch.delta("RightUpLeg", qE(-tk * 1.5 + th - ws, 0, 0));
      ch.delta("LeftLeg", qE(tk * 2.1 + kn + Math.max(0, -ws) * 1.1, 0, 0)); ch.delta("RightLeg", qE(tk * 2.1 + kn + Math.max(0, ws) * 1.1, 0, 0));
      if (tk > 0.02) { ch.delta("Spine", qE(tk * 0.4, 0, 0)); ch.delta("Spine1", qE(tk * 0.4, 0, 0)); }
      const pc = 0.93 * K, hop = jump > 0 ? Math.sin(Math.min(1, jump / 0.25) * PI) * 0.12 : 0;
      ch.group.rotation.x = fr;
      const drop = S("drop", P.drop || 0, r);
      ch.group.position.y = hop + fy + drop + pc - pc * Math.cos(fr); ch.group.position.z = (P.z || 0) - pc * Math.sin(fr);
      if (action && action.from !== undefined) ch.group.position.x = lerp(action.from, action.to, Math.min(1, actionT / action.dur));
      else ch.group.position.x = P.x !== undefined ? P.x : S("bx0", baseX, r);
      if (basePose === "studio" && ch) {
        const k = t - baseStart, hand = B.RightHand.getWorldPosition(tmp2);
        const cue = (key, at, text, ms) => { if (k > at && !film.said[key]) { film.said[key] = 1; say(text, ms); } };
        // coat: carried over the shoulder, thrown in an arc onto the desk
        if (k < 2.35) { coat.position.copy(hand).add(new T.Vector3(0.02, -0.33, -0.16)); coat.rotation.set(0.15, 0, 0); film.from.copy(coat.position); film.t0 = t; }
        else if (k < 3.0) { const f = Math.min(1, (t - film.t0) / 0.62), to = new T.Vector3(0.45, 1.2, 0.85);
          coat.position.lerpVectors(film.from, to, f); coat.position.y += Math.sin(f * PI) * 0.75; coat.rotation.set(-f * 2.2 * PI * 0.75, f * 1.4, 0); }
        else { coat.position.set(0.45, 1.17, 0.85); coat.rotation.set(-PI / 2, 0.5, 0); }
        // chair rolls in, then turns with him
        if (k < 2.9) chairG.position.set(0, 0, -5.5);
        else if (k < 3.9) { const f = (k - 2.9); const g = 1 - Math.pow(1 - f, 3); chairG.position.set(0, 0, lerp(-5.5, 0.05, g)); chairG.rotation.y = g * 3 * PI; }
        else if (k < 11.2) { chairG.position.set(0, 0, 0.05); chairG.rotation.y = ch.group.rotation.y; }
        // clock pops in and runs one full round while he works
        const cs = k < 6.3 ? 0.001 : k < 6.7 ? (k - 6.3) / 0.4 * 1.15 : k < 6.85 ? 1.15 - (k - 6.7) / 0.15 * 0.15 : k < 11.0 ? 1 : Math.max(0.001, 1 - (k - 11.0) / 0.4);
        wallClock.scale.setScalar(cs); wallClock.lookAt(cam.position);
        if (P.clock) clockHours = 9 + Math.min(1, (k - 6.6) / 4.3) * 12;
        // the monitor swivels round to show the skills checklist
        if (k > 12.4) { const f = Math.min(1, (k - 12.4) / 0.8); mon.rotation.y = (1 - Math.cos(f * PI)) / 2 * PI; if (f > 0.5) mscr.material.map = skillsTex; }
        cue("hi", 0.9, "Morning!", 1300); cue("coat", 2.15, "Yeet.", 1100); cue("chair", 3.1, "Ah, my throne.", 1300); cue("spin", 5.1, "Wheee…", 1200);
        cue("work", 6.9, "Deep work mode…", 2200); cue("late", 9.7, "Wait… 12 hours?!", 1900);
        cue("tada", 13.3, "Ta-da… 12 hours for a checklist. Try to contain your excitement. 😏", 3600); cue("clap", 16.0, "*slow clap*", 2400);
        if (k > 17.5 && !film.said.end) { film.said.end = 1; el.dispatchEvent(new CustomEvent("yb:film-end")); }
      }
      if (props.work.visible) {
        clockHours += dt * (P.clock ? (basePose === "studio" ? 0 : 8 / 5.5) : 0.002);
        const k = t - baseStart;
        if (basePose === "skills" && P.clock && workSaid === 0 && k > 2.4) { workSaid = 1; say("Deep work mode…", 2200); }
        if (basePose === "skills" && P.clock && workSaid === 1 && k > 6.7) { workSaid = 2; say("8 hours later… still on it!", 1900); }
        if (P.point && !pointSaid) { pointSaid = true; say("👈 My skills, with proof", 4200); }
      }
      texTick += dt;
      if (texTick > 0.08) { texTick = 0; if (props.work.visible) { clockTex.userData.draw(clockTex.userData.ctx, t); clockTex.needsUpdate = true; scr.userData.draw(scr.userData.ctx, t); scr.needsUpdate = true; } if (props.desk.visible) { scr.userData.draw(scr.userData.ctx, t); scr.needsUpdate = true; } if (props.board.visible) { brd.userData.draw(brd.userData.ctx, t); brd.needsUpdate = true; } }
      if (props.doc.visible) { B.RightHand.getWorldPosition(tmp); B.LeftHand.getWorldPosition(tmp2); props.doc.position.copy(tmp).add(tmp2).multiplyScalar(0.5).add(new T.Vector3(0, 0.0, 0.32)); props.doc.rotation.set(-0.22, Math.sin(t * 0.5) * 0.08, 0); }
      if (props.blocks.visible) props.blocks.children.forEach(b => { const i = b.userData.i, cyc = (t * 0.5 + i * 0.33) % 3;
        const y = cyc < 0.6 ? lerp(3.6, 0.21, Math.pow(cyc / 0.6, 2)) : 0.21 + (cyc < 0.75 ? Math.sin((cyc - 0.6) / 0.15 * PI) * 0.06 : 0);
        b.position.set(0.5 + i * 0.47, y, 0.4); b.rotation.y = -0.25 + (cyc < 0.6 ? (1 - cyc / 0.6) * 1.2 : 0); });
      const fk = t - baseStart;
      const c = action && (action.name === "flip" || action.name === "walk") ? { pos: [0.6, 2.3, 9.5], look: [0.5, 2.0, 0] }
        : basePose === "studio" ? (fk < 11.3 ? { pos: [7.4, 2.25, -0.55], look: [0, 1.55, -0.55] } : { pos: [-0.35, 2.4, 7.2], look: [-0.45, 1.75, 0.3] })
        : camFor(basePose); camPos.lerp(tmp.set(...c.pos), r * 0.5); camLook.lerp(tmp2.set(...c.look), r * 0.5); cam.position.copy(camPos); cam.lookAt(camLook);
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
