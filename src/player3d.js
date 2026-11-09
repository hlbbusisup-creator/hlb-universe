(() => {
  "use strict";

  const radius = 0.31;
  const speed = 4.8;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  // Bake each rigid body part into a single vertex-coloured mesh. The articulated
  // joints remain independent while hair, jacket seams and backpack share draws.
  function createVisitor(T, scene) {
    const material = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.83 });
    const root = new T.Group();
    root.name = "campus-visitor";
    scene.add(root);
    function joint(parent, x, y, z) {
      const group = new T.Group();
      group.position.set(x, y, z);
      parent.add(group);
      return group;
    }
    function part(parent, build) {
      const positions = [], normals = [], colors = [];
      function add(geometry, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
        const raw = geometry.index ? geometry.toNonIndexed() : geometry;
        const transform = new T.Matrix4().compose(new T.Vector3(x,y,z),
          new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)), new T.Vector3(sx,sy,sz));
        raw.applyMatrix4(transform);
        const p = raw.attributes.position, n = raw.attributes.normal;
        const tint = new T.Color(color);
        for (let i = 0; i < p.count; i++) {
          positions.push(p.getX(i), p.getY(i), p.getZ(i));
          normals.push(n.getX(i), n.getY(i), n.getZ(i));
          colors.push(tint.r, tint.g, tint.b);
        }
        raw.dispose();
        if (geometry !== raw) geometry.dispose();
      }
      function oval(color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
        const segments = Math.max(sx,sy,sz) >= .18 ? 24 : 16;
        const rings = segments === 24 ? 16 : 10;
        add(new T.SphereGeometry(1,segments,rings),color,x,y,z,sx,sy,sz,rx,ry,rz);
      }
      function band(color, x, y, z, top, bottom, height, depth = 1, tilt = 0) {
        add(new T.CylinderGeometry(top,bottom,height,16), color, x,y,z,1,1,depth,tilt);
      }
      function seam(color, points, width) {
        const path = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
        add(new T.TubeGeometry(path, 16, width, 6, false),color,0,0,0,1,1,1);
      }
      build(oval,band,seam,add);
      const geo = new T.BufferGeometry();
      geo.setAttribute("position",new T.Float32BufferAttribute(positions,3));
      geo.setAttribute("normal",new T.Float32BufferAttribute(normals,3));
      geo.setAttribute("color",new T.Float32BufferAttribute(colors,3));
      const mesh = new T.Mesh(geo,material);
      mesh.castShadow = true;
      parent.add(mesh);
    }

    // In the rest pose the soles sit at y=0 and the crown at 1.66 m.
    // The head, from the chin to the crown, is about 0.55 m tall.
    const hipHeight = 0.572, headHeightAboveHips = 0.812;
    const hips = joint(root,0,hipHeight,0);
    const chest = joint(hips,0,0,0);
    const red = 0xef4136, piping = 0xb32c36, ivory = 0xffebc9;
    const navy = 0x314355, sole = 0x435365;
    const skin = 0xffc39d, hair = 0x493138, eye = 0x302532;
    part(chest,(oval,band,seam) => {
      oval(navy,0,0.015,0,.224,.153,.153);
      oval(red,0,.246,0,.264,.266,.19);
      band(piping,0,.078,0,.228,.213,.053,.75);
      oval(red,0,.366,0,.257,.145,.174);
      band(skin,0,.485,-.006,.097,.106,.165,.87);
      oval(ivory,0,.444,0,.186,.071,.132);
      // Padded jacket with a cream collar, zipper and two broad shoulder straps.
      seam(piping,[[0,.081,-.154],[0,.195,-.186],[0,.312,-.185],[0,.433,-.156]],.008);
      oval(ivory,0,.360,-.186,.014,.026,.009);
      for (const s of [-1,1]) {
        seam(sole,[[s*.129,.104,-.118],[s*.15,.219,-.157],[s*.149,.357,-.151],
          [s*.146,.453,-.079],[s*.144,.465,.01],[s*.149,.407,.113]],.026);
      }
      // A small red daypack leaves the jacket sleeves visible from behind.
      oval(piping,0,.243,.151,.174,.195,.094);
      oval(red,0,.240,.192,.167,.185,.107);
      oval(ivory,0,.271,.253,.151,.124,.064);
      oval(red,0,.179,.269,.118,.061,.046);
      seam(piping,[[-.096,.164,.288],[0,.151,.310],[.096,.164,.288]],.005);
      for (const s of [-1,1]) oval(0xd49368,s*.101,.265,.307,.012,.012,.006);
    });
    const head = joint(chest,0,headHeightAboveHips,-.014);
    head.name = "visitor-head";
    part(head,(oval,band,seam,add) => {
      oval(skin,0,-.037,-.016,.316,.237,.251);
      oval(hair,0,.058,.036,.322,.208,.241);
      oval(hair,0,-.007,.092,.315,.168,.194);
      for (const s of [-1,1]) {
        oval(skin,s*.301,-.042,.004,.050,.061,.048);
        oval(0xe59a80,s*.325,-.047,-.022,.020,.032,.024);
        oval(hair,s*.282,.028,-.071,.046,.080,.082,0,0,-s*.16);
        // Big dark eyes have a warm iris, upper glint and small lower reflection.
        oval(eye,s*.101,-.036,-.253,.036,.046,.016,0,-s*.30);
        oval(0x805345,s*.101,-.057,-.264,.024,.014,.009,0,-s*.30);
        oval(0xfffcf4,s*.101-.008,-.022,-.268,.012,.013,.008);
        oval(0xffe8d5,s*.101+.009,-.052,-.270,.005,.006,.004);
        oval(hair,s*.101,.038,-.239,.042,.012,.014,0,-s*.30,s*.12);
        oval(0xf3a094,s*.183,-.101,-.211,.046,.020,.010,0,-s*.60,s*.11);
      }
      oval(0xf2ac8c,0,-.086,-.270,.028,.020,.022);
      seam(0x9c5753,[[-.048,-.126,-.245],[-.028,-.141,-.243],[0,-.146,-.242],
        [.028,-.141,-.243],[.048,-.126,-.245]],.008);
      // An asymmetric fringe peeks out below the short-brimmed baseball cap.
      oval(hair,-.163,.029,-.166,.140,.035,.092,0,-.16,.075);
      oval(0x58404a,.155,.031,-.170,.128,.034,.087,0,.21,-.065);
      const crown = new T.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI*.53);
      add(crown,red,0,.107,.003,.341,.163,.279);
      band(piping,0,.087,.003,.339,.336,.030,.822);
      oval(piping,0,.071,-.219,.276,.021,.171,.056);
      oval(red,0,.082,-.222,.274,.018,.171,.057);
      oval(red,0,.268,.003,.032,.012,.031);
      // Tailored crown seams and a small open-look adjustment strap at the back.
      for (const s of [-1,1]) {
        seam(0xd93834,[[s*.013,.268,.014],[s*.116,.251,.061],[s*.217,.220,.102],
          [s*.280,.172,.119],[s*.307,.115,.121]],.004);
      }
      oval(hair,0,.104,.269,.089,.041,.013);
      oval(piping,0,.084,.276,.099,.014,.011);
      oval(ivory,.068,.084,.287,.012,.011,.007);
    });
    // Both fabric labels share one texture and material; the lettering stays
    // readable at the closer camera distances inside the exhibits.
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 256; labelCanvas.height = 112;
    const labelContext = labelCanvas.getContext("2d");
    labelContext.fillStyle = "#773038";
    labelContext.fillRect(0,0,256,112);
    labelContext.font = "bold 96px Arial, sans-serif";
    labelContext.textAlign = "center";
    labelContext.textBaseline = "middle";
    labelContext.fillStyle = "#fff5df";
    labelContext.fillText("HLB",128,62);
    const labelMap = new T.CanvasTexture(labelCanvas);
    labelMap.colorSpace = T.SRGBColorSpace;
    const labelMaterial = new T.MeshBasicMaterial({map:labelMap,toneMapped:false});
    const capLabel = new T.PlaneGeometry(.129,.129*112/256,8,4);
    const vertices = capLabel.attributes.position;
    for (let i=0; i<vertices.count; i++) {
      const x = -vertices.getX(i), y = vertices.getY(i)+.162;
      const crownDepth = Math.sqrt(1-(x/.341)**2-((y-.107)/.163)**2);
      vertices.setXYZ(i,x,y,.003-.279*crownDepth-.003);
    }
    capLabel.computeVertexNormals();
    head.add(new T.Mesh(capLabel,labelMaterial));
    const packLabel = new T.Mesh(new T.PlaneGeometry(.147,.147*112/256),labelMaterial);
    packLabel.position.set(0,.274,.319);
    chest.add(packLabel);
    const arms = [], legs = [];
    for (const s of [-1,1]) {
      const arm = joint(chest,s*.237,.365,.005);
      arm.rotation.z = s*.105;
      const elbow = joint(arm,0,-.174,0);
      part(arm,oval => oval(red,0,-.062,0,.084,.133,.092));
      part(elbow,(oval,band) => {
        oval(red,0,-.040,0,.074,.106,.082);
        band(ivory,0,-.110,0,.066,.064,.036);
        oval(skin,0,-.166,-.012,.061,.074,.065);
        oval(skin,-s*.043,-.150,-.052,.032,.043,.031);
      });
      const thigh = joint(hips,s*.115,-.013,0);
      const shin = joint(thigh,0,-.240,0);
      part(thigh,oval => oval(navy,0,-.095,0,.112,.178,.124));
      part(shin,(oval,band) => {
        oval(0x3e5264,0,-.103,0,.089,.143,.092);
        band(navy,0,-.169,0,.087,.083,.043);
        oval(ivory,0,-.236,-.040,.104,.074,.148);
        oval(sole,0,-.281,-.048,.107,.036,.151);
        oval(red,0,-.224,.068,.088,.034,.035);
        for (const y of [0,.024]) oval(0xb5a89a,0,-.207+y,-.129+y,.043,.006,.012);
      });
      arms.push({arm,elbow}); legs.push({thigh,shin});
    }
    const softShadow = document.createElement("canvas");
    softShadow.width = softShadow.height = 64;
    const ctx = softShadow.getContext("2d");
    const gradient = ctx.createRadialGradient(32,32,1,32,32,31);
    gradient.addColorStop(0,"rgba(45,37,27,0.38)");
    gradient.addColorStop(1,"rgba(45,37,27,0)");
    ctx.fillStyle = gradient; ctx.fillRect(0,0,64,64);
    const shadowMap = new T.CanvasTexture(softShadow);
    const shadowMaterial = new T.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
    const shadow = new T.Mesh(new T.PlaneGeometry(0.96,0.79),shadowMaterial);
    shadow.name = "visitor-shadow";
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.018; root.add(shadow);
    let phase = 0, weight = 0, elapsed = 0;
    function animate(dt, travelled, reducedMotion) {
      elapsed += dt;
      phase += travelled * 9.2;
      weight += ((travelled > 0.0002 ? 1 : 0) - weight) * (1 - Math.exp(-dt * 15));
      hips.position.y = hipHeight + weight * .004 * (1 + Math.cos(phase * 2));
      chest.rotation.z = Math.sin(phase) * weight * 0.035;
      head.rotation.z = -chest.rotation.z * 0.6;
      head.position.y = headHeightAboveHips + (reducedMotion ? 0 : Math.sin(elapsed * 2.0) * 0.004 * (1 - weight));
      for (let i = 0; i < 2; i++) {
        const swing = Math.sin(phase + i * Math.PI) * weight;
        legs[i].thigh.rotation.x = swing * 0.60;
        legs[i].shin.rotation.x = -Math.max(0,swing) * 0.66;
        arms[i].arm.rotation.x = -swing * 0.45;
        arms[i].elbow.rotation.x = 0.18 + Math.max(0,-swing) * 0.32;
      }
    }
    function dispose() {
      root.removeFromParent();
      root.traverse(object => object.geometry?.dispose());
      material.dispose(); shadowMap.dispose(); shadowMaterial.dispose();
      labelMap.dispose(); labelMaterial.dispose();
    }
    return {root,animate,dispose};
  }

  function segmentHits(a,b,box) {
    let start = 0, end = 1;
    for (const [axis,min,max] of [["x",box.minX,box.maxX],["z",box.minZ,box.maxZ]]) {
      const delta = b[axis] - a[axis];
      if (Math.abs(delta) < 1e-8) {
        if (a[axis] < min || a[axis] > max) return false;
      } else {
        const t1 = (min - a[axis]) / delta, t2 = (max - a[axis]) / delta;
        start = Math.max(start,Math.min(t1,t2));
        end = Math.min(end,Math.max(t1,t2));
        if (start > end) return false;
      }
    }
    return true;
  }

  // The same expanded wall rectangles govern direct movement, path smoothing and
  // route planning. A body that fits the route can also walk it with the keys.
  function makeNavigation(world) {
    const boxes = world.colliders.filter(b => (b.minY ?? 0) < 1.8 && (b.maxY ?? 3) > 0.2)
      .map(b => ({minX:b.minX-radius,maxX:b.maxX+radius,minZ:b.minZ-radius,maxZ:b.maxZ+radius}));
    const b = world.bounds;
    function insideBounds(p) {
      return p.x >= b.minX+radius && p.x <= b.maxX-radius && p.z >= b.minZ+radius && p.z <= b.maxZ-radius;
    }
    function clear(a,target) {
      return insideBounds(target) && !boxes.some(box => segmentHits(a,target,box));
    }
    function move(p,dx,dz) {
      const next = {x:p.x+dx,z:p.z+dz};
      if (clear(p,next)) return next;
      const xOnly = {x:next.x,z:p.z};
      const zOnly = {x:p.x,z:next.z};
      const axes = Math.abs(dx) >= Math.abs(dz) ? [xOnly,zOnly] : [zOnly,xOnly];
      return axes.find(step => distance(p,step)>0.00001 && clear(p,step)) || p;
    }
    const cell = 0.53;
    const cols = Math.ceil((b.maxX-b.minX)/cell), rows = Math.ceil((b.maxZ-b.minZ)/cell);
    const size = cols*rows;
    const blocked = new Uint8Array(size);
    const at = (col,row) => row*cols + col;
    const worldPoint = id => ({x:b.minX+(id%cols+0.5)*cell,z:b.minZ+(Math.floor(id/cols)+0.5)*cell});
    for (let i=0;i<size;i++) {
      const p = worldPoint(i);
      blocked[i] = insideBounds(p) ? 0 : 1;
    }
    for (const box of boxes) {
      const minCol = Math.max(0,Math.ceil((box.minX-b.minX)/cell-0.5));
      const maxCol = Math.min(cols-1,Math.floor((box.maxX-b.minX)/cell-0.5));
      const minRow = Math.max(0,Math.ceil((box.minZ-b.minZ)/cell-0.5));
      const maxRow = Math.min(rows-1,Math.floor((box.maxZ-b.minZ)/cell-0.5));
      if (minCol>maxCol || minRow>maxRow) continue;
      for (let row=minRow;row<=maxRow;row++) blocked.fill(1,at(minCol,row),at(maxCol,row)+1);
    }
    function closest(point,requireVisible) {
      const cx = clamp(Math.floor((point.x-b.minX)/cell),0,cols-1);
      const cz = clamp(Math.floor((point.z-b.minZ)/cell),0,rows-1);
      for (let ring=0;ring<Math.max(cols,rows);ring++) {
        let best = -1, near = Infinity;
        for (let z=Math.max(0,cz-ring);z<=Math.min(rows-1,cz+ring);z++) {
          for (let x=Math.max(0,cx-ring);x<=Math.min(cols-1,cx+ring);x++) {
            if (Math.max(Math.abs(x-cx),Math.abs(z-cz)) !== ring) continue;
            const id = at(x,z);
            if (blocked[id]) continue;
            const candidate = worldPoint(id), d = distance(candidate,point);
            if (d < near && (!requireVisible || clear(point,candidate))) { near=d; best=id; }
          }
        }
        if (best >= 0) return best;
      }
      return -1;
    }
    function route(from,requested) {
      if (!Number.isFinite(requested?.x) || !Number.isFinite(requested?.z)) return [];
      const target = {x:clamp(requested.x,b.minX+radius,b.maxX-radius),z:clamp(requested.z,b.minZ+radius,b.maxZ-radius)};
      if (clear(from,target)) return [target];
      const start = closest(from,true), goal = closest(target,false);
      if (start<0 || goal<0) return [];
      // Uniform-cost breadth-first search over the small campus grid, followed by
      // line-of-sight smoothing. Each cell enters the queue only once.
      const parent = new Int32Array(size).fill(-1), queue = new Int32Array(size);
      let read=0, write=1;
      queue[0]=start; parent[start]=start;
      while (read<write && parent[goal]===-1) {
        const id=queue[read++], col=id%cols, row=Math.floor(id/cols);
        for (let dz=-1;dz<=1;dz++) for (let dx=-1;dx<=1;dx++) {
          if (!dx && !dz) continue;
          const x=col+dx, z=row+dz;
          if (x<0 || x>=cols || z<0 || z>=rows) continue;
          const next=at(x,z);
          if (blocked[next] || parent[next]!==-1) continue;
          if (dx && dz && (blocked[at(col+dx,row)] || blocked[at(col,row+dz)])) continue;
          parent[next]=id; queue[write++]=next;
        }
      }
      if (parent[goal]===-1) return [];
      const points=[];
      for (let id=goal;id!==start;id=parent[id]) points.push(worldPoint(id));
      points.push(worldPoint(start));
      points.reverse();
      if (clear(points[points.length-1],target)) points.push(target);
      const result=[];
      let anchor=from;
      for (let i=0;i<points.length;) {
        let last=i;
        if (!clear(anchor,points[i])) return [];
        while (last+1<points.length && clear(anchor,points[last+1])) last++;
        anchor=points[last]; result.push(anchor); i=last+1;
      }
      return result;
    }
    return {move,route};
  }

  function create(scene,camera,canvas,world,arrival = null,onScenePick = null) {
    const T = globalThis.THREE;
    const visitor = createVisitor(T,scene);
    let position = {...(arrival?.station || world.spawn)};
    visitor.root.position.set(position.x,arrival ? 0.086 : 0.025,position.z);
    const nav = makeNavigation(world);
    const movementCodes = new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD"]);
    const held = new Set(), freshPresses = new Set(), pointers = new Map();
    const stick = {x:0,y:0};
    const firstDoor = world.spaces.find(space => space.id === "group") || world.spaces[0];
    const focus = arrival?.lookAt || firstDoor;
    const entryYaw = Math.atan2(position.x-focus.x,position.z-focus.z);
    visitor.root.rotation.y = entryYaw;
    const entryPitch=.17; // Leave headroom above the summit to see the drifting ash.
    let active=true, yaw=entryYaw, pitch=entryPitch, zoom=1, cameraDistance=7.6;
    const baseFov=camera.fov;
    let route=[], pinchGap=0, touchingMultiple=false;
    const cameraBoxes = (world.cameraColliders || world.colliders).map(b=>new T.Box3(
      new T.Vector3(b.minX-0.17,(b.minY??0)-0.12,b.minZ-0.17),
      new T.Vector3(b.maxX+0.17,(b.maxY??3)+0.12,b.maxZ+0.17)));
    const ray = new T.Ray(), hit = new T.Vector3(), target = new T.Vector3(), direction = new T.Vector3();
    const raycaster = new T.Raycaster(), ndc = new T.Vector2(), floor = new T.Plane(new T.Vector3(0,1,0),0);
    const indoors = world.spaces.filter(s=>s.interior).map(s=>({space:s,box:new T.Box3(
      new T.Vector3(s.interior.minX,0,s.interior.minZ),
      new T.Vector3(s.interior.maxX,s.interior.ceilingY || 3.6,s.interior.maxZ))}));
    const exhibitBoxes = world.spaces.flatMap(space => (space.exhibits || []).filter(exhibit => exhibit.hitBox).map(exhibit => {
      const b = exhibit.hitBox;
      return {space, exhibit, bounds:new T.Box3(new T.Vector3(b.minX,b.minY,b.minZ), new T.Vector3(b.maxX,b.maxY,b.maxZ))};
    }));
    function roomAt(p) {
      return indoors.find(({box}) => p.x>=box.min.x && p.x<=box.max.x && p.z>=box.min.z && p.z<=box.max.z);
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const markerMaterial = new T.MeshBasicMaterial({color:0xef4136,side:T.DoubleSide,depthWrite:false});
    const marker = new T.Mesh(new T.RingGeometry(0.21,0.29,32),markerMaterial);
    marker.rotation.x=-Math.PI/2; marker.visible=false; scene.add(marker);

    function walkTo(point) {
      if (!active) return false;
      route=nav.route(position,point);
      marker.visible=route.length>0;
      if (!marker.visible) return false;
      const dest=route[route.length-1];
      marker.position.set(dest.x,roomAt(dest) ? 0.11 : 0.063,dest.z);
      return true;
    }
    function stopRoute() { route=[]; marker.visible=false; }
    function release() {
      held.clear(); freshPresses.clear(); stick.x=0; stick.y=0; stopRoute();
      for (const id of pointers.keys()) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
      pointers.clear(); pinchGap=0; touchingMultiple=false;
      canvas.classList.remove("camera-dragging");
    }
    function setActive(value) { active=Boolean(value); if (!active) release(); }
    function setStick(x,y) {
      if (!active) return;
      stick.x=clamp(x,-1,1); stick.y=clamp(y,-1,1);
      if (Math.hypot(x,y)>0.08) stopRoute();
    }
    function updateCamera(dt) {
      const room=roomAt(position);
      // Pull back and widen the lens in portrait to keep the side routes visible.
      const narrow=clamp((1.65-camera.aspect)/1.17,0,1);
      let fieldOfView = baseFov + 5*narrow;
      if (room?.space.exhibits?.length && camera.aspect < 1) {
        // Keep the two display bays in view when the phone is upright.
        const minimumHorizontalAngle = 45 * Math.PI / 180;
        const portraitFov = 2 * Math.atan(Math.tan(minimumHorizontalAngle / 2) / camera.aspect) * 180 / Math.PI;
        fieldOfView = Math.min(92, Math.max(fieldOfView, portraitFov));
      }
      if (camera.fov !== fieldOfView) {
        camera.fov=fieldOfView;
        camera.updateProjectionMatrix();
      }
      const elevation=room ? Math.min(pitch,0.24) : pitch+0.035*narrow;
      const outsideDistance=(7.1+0.9*narrow)*zoom;
      const desired=room ? Math.min(outsideDistance,4.4) : outsideDistance;
      const walkingFocus = room ? 1.32 : 1.53;
      const closeUp = clamp((1 - zoom) / (1 - .34), 0, 1);
      target.set(position.x, T.MathUtils.lerp(walkingFocus, 1.05, closeUp), position.z);
      direction.set(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation));
      ray.set(target,direction);
      let allowed=desired;
      for (const box of cameraBoxes) {
        if (!ray.intersectBox(box,hit)) continue;
        const stop=hit.distanceTo(target)-0.06;
        if (stop<allowed) allowed=Math.max(0.1,stop);
      }
      if (direction.y<0) allowed=Math.min(allowed,(target.y-0.2)/-direction.y);
      cameraDistance=allowed<cameraDistance ? allowed : T.MathUtils.lerp(cameraDistance,allowed,1-Math.exp(-dt*7));
      camera.position.copy(target).addScaledVector(direction,cameraDistance);
      camera.lookAt(target);
      visitor.root.visible=cameraDistance>0.69;
    }
    function resetView() { yaw=entryYaw; pitch=entryPitch; zoom=1; cameraDistance=8; updateCamera(1); }
    function facePoint(point) {
      yaw = Math.atan2(position.x - point.x, position.z - point.z);
      visitor.root.rotation.y = yaw;
      pitch = entryPitch;
      updateCamera(1);
    }
    function update(dt) {
      dt=clamp(Number(dt)||0,0,0.07);
      // A quick keyboard tap can start and finish between two rendered frames.
      const down=(a,b) => held.has(a)||held.has(b)||freshPresses.has(a)||freshPresses.has(b);
      let right=stick.x + Number(down("KeyD","ArrowRight")) - Number(down("KeyA","ArrowLeft"));
      let forward=stick.y + Number(down("KeyW","ArrowUp")) - Number(down("KeyS","ArrowDown"));
      freshPresses.clear();
      const prev=position;
      const intensity=Math.hypot(right,forward);
      if (active && intensity>0.04) {
        stopRoute();
        if (intensity>1) { right/=intensity; forward/=intensity; }
        const dx=(right*Math.cos(yaw)-forward*Math.sin(yaw))*speed*dt;
        const dz=(-right*Math.sin(yaw)-forward*Math.cos(yaw))*speed*dt;
        position=nav.move(position,dx,dz);
      } else if (active && route.length) {
        let budget=speed*dt;
        while (route.length && budget>0) {
          const dest=route[0], left=distance(position,dest);
          if (left<=budget) { position=dest; budget-=left; route.shift(); }
          else {
            position={x:position.x+(dest.x-position.x)*budget/left,z:position.z+(dest.z-position.z)*budget/left};
            budget=0;
          }
        }
        marker.visible=route.length>0;
      }
      const travelled=distance(prev,position);
      if (travelled>0.0001) {
        const heading=Math.atan2(prev.x-position.x,prev.z-position.z);
        const turn=Math.atan2(Math.sin(heading-visitor.root.rotation.y),Math.cos(heading-visitor.root.rotation.y));
        visitor.root.rotation.y+=turn*(1-Math.exp(-dt*18));
        visitor.root.position.set(position.x,roomAt(position) ? 0.086 : 0.025,position.z);
      }
      visitor.animate(dt,travelled,reducedMotion.matches);
      updateCamera(dt);
      return position;
    }
    function keyDown(event) {
      if (!active || !movementCodes.has(event.code) || event.altKey || event.ctrlKey || event.metaKey ||
        event.target?.closest?.("input,textarea,select,[contenteditable=true],[role=textbox]")) return;
      event.preventDefault();
      if (!held.has(event.code)) freshPresses.add(event.code);
      held.add(event.code); stopRoute();
    }
    function keyUp(event) { held.delete(event.code); }
    function pointOnGround(x,y) {
      const rect=canvas.getBoundingClientRect();
      ndc.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);
      camera.updateMatrixWorld();
      raycaster.setFromCamera(ndc,camera);
      const room = roomAt(position)?.space;
      if (onScenePick) {
        let picked = null, closest = Infinity;
        for (const display of exhibitBoxes) {
          if (room !== display.space || !raycaster.ray.intersectBox(display.bounds, hit)) continue;
          const range = raycaster.ray.origin.distanceTo(hit);
          if (range < closest) { picked = display.exhibit; closest = range; }
        }
        onScenePick(picked);
        if (picked) return;
      }
      const floorHit=raycaster.ray.intersectPlane(floor,new T.Vector3());
      if (!floorHit) return;
      let nearestHit=raycaster.ray.origin.distanceTo(floorHit), chosen=null;
      for (const room of indoors) {
        if (room.box.containsPoint(raycaster.ray.origin) || room.box.containsPoint(target)) continue;
        if (!raycaster.ray.intersectBox(room.box,hit)) continue;
        const d=raycaster.ray.origin.distanceTo(hit);
        if (d<nearestHit) { chosen=room.space; nearestHit=d; }
      }
      if (chosen) walkTo(chosen.station);
      else if (floorHit.x>=world.bounds.minX && floorHit.x<=world.bounds.maxX &&
        floorHit.z>=world.bounds.minZ && floorHit.z<=world.bounds.maxZ) walkTo(floorHit);
    }
    function pointerDown(event) {
      if (!active || (event.pointerType==="mouse" && event.button!==0)) return;
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,drag:false});
      canvas.setPointerCapture(event.pointerId);
      canvas.focus({preventScroll:true});
      if (pointers.size===2) {
        touchingMultiple=true;
        const [a,b]=pointers.values();
        pinchGap=Math.hypot(a.x-b.x,a.y-b.y);
      }
    }
    function pointerMove(event) {
      const p=pointers.get(event.pointerId);
      if (!active || !p) return;
      const dx=event.clientX-p.x, dy=event.clientY-p.y;
      p.x=event.clientX; p.y=event.clientY;
      if (pointers.size>=2) {
        const [a,b]=pointers.values(), gap=Math.hypot(a.x-b.x,a.y-b.y);
        if (gap>2 && pinchGap>2) zoom=clamp(zoom*pinchGap/gap,0.34,1.5);
        pinchGap=gap; return;
      }
      if (!p.drag && Math.hypot(p.x-p.startX,p.y-p.startY)<5) return;
      p.drag=true; canvas.classList.add("camera-dragging");
      yaw-=dx*0.006;
      pitch=clamp(pitch+dy*0.004,-0.10,0.82);
    }
    function pointerUp(event) {
      const p=pointers.get(event.pointerId);
      if (!p) return;
      const tapped=event.type==="pointerup" && !p.drag && !touchingMultiple &&
        Math.hypot(event.clientX-p.startX,event.clientY-p.startY)<7;
      pointers.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (!pointers.size) { touchingMultiple=false; canvas.classList.remove("camera-dragging"); }
      pinchGap=0;
      if (tapped && active) pointOnGround(event.clientX,event.clientY);
    }
    function wheel(event) {
      if (!active) return;
      event.preventDefault();
      const pixels=event.deltaY*(event.deltaMode===1 ? 16 : event.deltaMode===2 ? 600 : 1);
      zoom=clamp(zoom*Math.exp(clamp(pixels,-900,900)*0.0012),0.34,1.5);
    }
    const listeners = new AbortController();
    const options={signal:listeners.signal};
    window.addEventListener("keydown",keyDown,options);
    window.addEventListener("keyup",keyUp,options);
    window.addEventListener("blur",release,options);
    document.addEventListener("visibilitychange",()=>{if(document.hidden) release();},options);
    canvas.addEventListener("pointerdown",pointerDown,options);
    canvas.addEventListener("pointermove",pointerMove,options);
    for (const name of ["pointerup","pointercancel","lostpointercapture"]) canvas.addEventListener(name,pointerUp,options);
    canvas.addEventListener("wheel",wheel,{signal:listeners.signal,passive:false});
    resetView();
    function dispose() {
      release(); listeners.abort(); visitor.dispose();
      marker.removeFromParent(); marker.geometry.dispose(); markerMaterial.dispose();
    }
    return {update,setActive,setStick,walkTo,getPosition:()=>({x:position.x,z:position.z}),resetView,facePoint,dispose};
  }

  globalThis.HLBPlayer3D={create};
})();
