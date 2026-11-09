(() => {
  "use strict";

  const radius = 0.31;
  const speed = 4.8;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  // Bake each rigid body part into a single vertex-coloured mesh. The articulated
  // joints remain independent while facial features and clothing share draws.
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

    const hipHeight = .354, headHeightAboveHips = .82;
    const hips = joint(root,0,hipHeight,0);
    const chest = joint(hips,0,0,0);
    const red = 0xef4136, piping = 0xb53439, ivory = 0xfff1d7;
    const skin = 0xf5bc99, rose = 0xe69884, hair = 0x49332f, ink = 0x392c32;
    const navy = 0x34485a, sole = 0x544b53;
    part(chest,(oval,band,seam) => {
      oval(navy,0,.026,.005,.194,.115,.146);
      oval(red,0,.228,0,.240,.226,.169);
      // The shoulders extend under the chin. Both move with the same chest joint.
      oval(red,0,.395,0,.248,.122,.161);
      band(piping,0,.104,0,.210,.207,.033,.74);
      seam(piping,[[0,.115,-.148],[0,.224,-.171],[0,.344,-.152]],.009);
      oval(ivory,0,.300,-.166,.015,.021,.008);
      for (const s of [-1,1]) {
        seam(navy,[[s*.146,.132,-.121],[s*.154,.243,-.137],[s*.161,.344,-.113],
          [s*.159,.427,-.057],[s*.162,.460,.035],[s*.150,.348,.117]],.018);
      }
      oval(piping,0,.235,.144,.167,.161,.096);
      oval(red,0,.227,.173,.161,.148,.100);
      seam(0xf47760,[[-.136,.242,.223],[-.093,.271,.255],[0,.278,.268],
        [.093,.271,.255],[.136,.242,.223]],.006);
    });

    const head = joint(chest,0,headHeightAboveHips,-.009);
    head.name = "visitor-head";
    const eyes = joint(head,0,-.022,0);
    part(head,(oval,band,seam,add) => {
      oval(skin,0,0,0,.373,.388,.303);
      for (const s of [-1,1]) {
        oval(skin,s*.362,-.053,.006,.076,.094,.069,0,0,-s*.13);
        oval(rose,s*.395,-.055,-.042,.029,.043,.016,0,-s*.39,-s*.09);
        oval(0xf2a695,s*.225,-.112,-.229,.059,.028,.010,0,-s*.60,s*.09);
        oval(hair,s*.138,.091,-.278,.061,.017,.012,0,-s*.38,-s*.1);
      }
      oval(0xf1ad8f,0,-.081,-.298,.040,.032,.039);
      seam(0x9a5455,[[-.056,-.159,-.276],[-.027,-.176,-.275],
        [0,-.181,-.274],[.030,-.174,-.275],[.054,-.157,-.276]],.008);

      // A swept fringe follows the forehead at the front and the nape at the back.
      // Trimming each meridian separately leaves the round human ears exposed.
      function hairline(a) {
        const bump = (center, width) => Math.exp(-(((a-center)/width)**2));
        return 1.80 - .50*Math.cos(a) + .17*bump(-.22,.38) - .25*bump(.49,.18)
          - .13*bump(-.70,.13) + .36*bump(-1.14,.21) + .30*bump(1.15,.20);
      }
      function hairPoint(a, angle, lift = 0) {
        const wave = .008*Math.cos(7*a + angle*2.1)*Math.sin(angle);
        const ring = Math.sin(angle);
        return [.386*Math.sin(a)*ring*(1+wave+lift),
          .015+(.403 + lift*.27)*Math.cos(angle),
          .011-.322*Math.cos(a)*ring*(1+wave+lift)];
      }
      const cap = new T.SphereGeometry(1,48,22,0,Math.PI*2,0,Math.PI/2);
      const p = cap.attributes.position;
      for (let i=0; i<p.count; i++) {
        const a = Math.atan2(p.getX(i),-p.getZ(i));
        const latitude = Math.acos(clamp(p.getY(i),0,1))/(Math.PI/2);
        // Turn the last ring into the face to close the visible hairline in profile.
        const angle = Math.min(1, latitude*22/21) * hairline(a);
        p.setXYZ(i,...hairPoint(a,angle,latitude > .999 ? -.12 : 0));
      }
      cap.computeVertexNormals();
      add(cap,hair,0,0,0,1,1,1);
      // Soft, tapered raised locks give the haircut a part from every view.
      function lock(from, to, width, color) {
        const verts=[], indices=[];
        for (let j=0; j<=20; j++) {
          const t=j/20, ease=t*t*(3-2*t), arc=from+(to-from)*ease;
          const angle=.30+(hairline(to)-.35)*t;
          const taper=Math.sin(Math.PI*t)**.72;
          for (let k=0; k<9; k++) {
            const u=(k-4)/4;
            const lift=-.030+.081*(1-u*u)*taper;
            verts.push(...hairPoint(arc+u*width*taper,angle,lift));
          }
          if (j>0) for (let k=0; k<8; k++) {
            const n=j*9+k;
            indices.push(n-9,n-8,n,n-8,n+1,n);
          }
        }
        const geometry=new T.BufferGeometry();
        geometry.setAttribute("position",new T.Float32BufferAttribute(verts,3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        add(geometry,color,0,0,0,1,1,1);
      }
      lock(.57,-.56,.27,0x583b33);
      lock(.28,-1.06,.20,0x503731);
      lock(1.10,1.33,.24,0x533832);
      lock(1.75,2.40,.20,0x513731);
      lock(-2.45,-2.95,.25,0x563a32);
    });
    part(eyes,oval => {
      for (const s of [-1,1]) {
        oval(0xfff6e7,s*.143,0,-.275,.070,.072,.022,0,-s*.39);
        oval(ink,s*.139,.004,-.292,.049,.063,.021,0,-s*.38);
        oval(0x89573f,s*.139,-.017,-.308,.031,.031,.008,0,-s*.38);
        oval(ink,s*.139,.007,-.310,.026,.040,.009,0,-s*.38);
        oval(0xfffbef,s*.139-.013,.027,-.317,.013,.014,.006);
      }
    });

    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 256; labelCanvas.height = 112;
    const labelContext = labelCanvas.getContext("2d");
    labelContext.fillStyle = "#b93431";
    labelContext.fillRect(0,0,256,112);
    labelContext.font = "bold 96px Arial, sans-serif";
    labelContext.textAlign = "center";
    labelContext.textBaseline = "middle";
    labelContext.fillStyle = "#fff5df";
    labelContext.fillText("HLB",128,62);
    const labelMap = new T.CanvasTexture(labelCanvas);
    labelMap.colorSpace = T.SRGBColorSpace;
    const labelMaterial = new T.MeshBasicMaterial({map:labelMap,toneMapped:false});
    const chestLabel = new T.Mesh(new T.PlaneGeometry(.115,.050),labelMaterial);
    chestLabel.rotation.set(.17,Math.PI+.22,0);
    chestLabel.position.set(-.076,.277,-.165);
    chest.add(chestLabel);
    const packLabel = new T.Mesh(new T.PlaneGeometry(.126,.054),labelMaterial);
    packLabel.position.set(0,.212,.274);
    chest.add(packLabel);

    const arms = [], legs = [];
    for (const s of [-1,1]) {
      const arm = joint(chest,s*.202,.366,0);
      arm.rotation.z = s*.14;
      const elbow = joint(arm,0,-.137,0);
      part(arm,oval => oval(red,0,-.047,0,.091,.124,.093));
      part(elbow,(oval,band) => {
        oval(red,0,-.025,0,.070,.076,.074);
        band(ivory,0,-.064,0,.067,.064,.027);
        oval(skin,0,-.114,-.010,.067,.082,.054);
        oval(skin,-s*.047,-.106,-.040,.028,.043,.027);
      });
      const thigh = joint(hips,s*.104,-.005,0);
      const shin = joint(thigh,0,-.131,0);
      part(thigh,oval => oval(navy,0,-.038,0,.107,.113,.109));
      part(shin,(oval,band) => {
        oval(navy,0,-.067,0,.077,.086,.084);
        band(ivory,0,-.085,0,.078,.078,.036);
        oval(ivory,0,-.151,-.035,.091,.064,.124);
        oval(sole,0,-.191,-.038,.093,.027,.125);
        oval(red,0,-.131,-.102,.060,.011,.033);
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
    function animate(dt, travelled, reducedMotion, jumpHeight = 0) {
      elapsed += dt;
      phase += travelled * 7.2;
      weight += ((travelled > 0.0002 ? 1 : 0) - weight) * (1 - Math.exp(-dt * 15));
      const inAir = clamp(jumpHeight / .53,0,1);
      const stride = weight * (1-inAir);
      hips.position.y = hipHeight + jumpHeight + stride * .010 * (1 + Math.cos(phase * 2));
      chest.rotation.z = Math.sin(phase) * stride * .058;
      head.rotation.z = -chest.rotation.z * 0.6;
      head.rotation.x = -.055 * inAir;
      head.position.y = headHeightAboveHips + (reducedMotion ? 0 : Math.sin(elapsed * 2.0) * 0.004 * (1 - weight));
      const blinkTime = (elapsed + .7) % 4.1;
      eyes.scale.y = reducedMotion ? 1 : clamp(Math.abs(blinkTime-.095)/.095,.075,1);
      shadow.scale.setScalar(1-.30*inAir);
      shadowMaterial.opacity = 1-.46*inAir;
      for (let i = 0; i < 2; i++) {
        const swing = Math.sin(phase + i * Math.PI) * stride;
        legs[i].thigh.rotation.x = swing * .78 + inAir * (i ? .54 : .31);
        legs[i].shin.rotation.x = -Math.max(0,swing)*.70 - inAir*.70;
        arms[i].arm.rotation.x = -swing*.63 + inAir*.25;
        arms[i].arm.rotation.z = (i ? 1 : -1) * (.14 + inAir*.99);
        arms[i].elbow.rotation.x = .16 + Math.max(0,-swing)*.32 + inAir*.22;
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
    visitor.root.rotation.y = arrival ? entryYaw : entryYaw + Math.PI;
    const entryPitch=.17; // Leave headroom above the summit to see the drifting ash.
    let active=true, yaw=entryYaw, pitch=entryPitch, outdoorZoom=1, indoorZoom=1;
    let cameraDistance=7.6, obstacleLift=0;
    const jumpDuration = .68, jumpPeak = .82;
    let jumpTime = jumpDuration;
    let jumpHeight = 0;
    const baseFov=camera.fov;
    let route=[], pinchGap=0, touchingMultiple=false;
    const cameraBoxes = (world.cameraColliders || world.colliders).map(b=>new T.Box3(
      new T.Vector3(b.minX-0.17,(b.minY??0)-0.12,b.minZ-0.17),
      new T.Vector3(b.maxX+0.17,(b.maxY??3)+0.12,b.maxZ+0.17)));
    const ray = new T.Ray(), hit = new T.Vector3(), target = new T.Vector3(), direction = new T.Vector3();
    const lookAt = new T.Vector3();
    const terrain = ["Eroded caldera escarpments","Layered basalt cone and breached summit"]
      .map(name=>scene.getObjectByName(name)).filter(Boolean);
    const terrainRay = new T.Raycaster(), terrainHits = [];
    const raycaster = new T.Raycaster(), ndc = new T.Vector2(), floor = new T.Plane(new T.Vector3(0,1,0),0);
    const indoors = world.spaces.filter(s=>s.interior).map(s=>({space:s,box:new T.Box3(
      new T.Vector3(s.interior.minX,0,s.interior.minZ),
      new T.Vector3(s.interior.maxX,s.interior.ceilingY || 3.6,s.interior.maxZ))}));
    const campusBounds=new T.Box3();
    for (const room of indoors) campusBounds.union(room.box);
    const campusCenter=campusBounds.getCenter(new T.Vector3());
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
    function jump() {
      if (!active || jumpTime < jumpDuration) return false;
      jumpTime = 0;
      return true;
    }
    function setStick(x,y) {
      if (!active) return;
      stick.x=clamp(x,-1,1); stick.y=clamp(y,-1,1);
      if (Math.hypot(x,y)>0.08) stopRoute();
    }
    function changeZoom(factor) {
      if (roomAt(position)) indoorZoom=clamp(indoorZoom*factor,.55,1.3);
      else outdoorZoom=clamp(outdoorZoom*factor,.34,6);
    }
    function isOverview() { return !roomAt(position) && outdoorZoom>=5.7; }
    function toggleOverview() {
      if (!active || roomAt(position)) return;
      outdoorZoom=isOverview() ? 1 : 6;
    }
    function boomClearance(elevation,desired) {
      direction.set(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation));
      ray.set(target,direction);
      let limit=desired;
      for (const box of cameraBoxes) {
        if (ray.intersectBox(box,hit)) limit=Math.min(limit,hit.distanceTo(target)-.06);
      }
      if (direction.y<0) limit=Math.min(limit,(target.y-.2)/-direction.y);
      // Only a low orbit outside the plateau can meet the distant ridges.
      if (elevation<.42 && limit>0 && Math.hypot(target.x,target.z+4)+limit>25) {
        terrainRay.set(target,direction);
        terrainRay.far=limit;
        terrainHits.length=0;
        terrainRay.intersectObjects(terrain,false,terrainHits);
        if (terrainHits.length) limit=terrainHits[0].distance-.18;
      }
      return Math.max(.1,limit);
    }
    function updateCamera(dt) {
      const room=roomAt(position);
      const zoom=room ? indoorZoom : outdoorZoom;
      const overview=room ? 0 : T.MathUtils.smoothstep(zoom,1.2,4.8);
      // Pull back and widen the lens in portrait to keep the side routes visible.
      const narrow=clamp((1.65-camera.aspect)/1.17,0,1);
      let fieldOfView = baseFov + 5*narrow + 8*(1-narrow)*overview;
      if ((overview>0 || room?.space.exhibits?.length) && camera.aspect < 1) {
        // Leave room for both exhibit bays indoors and the outlying halls in the overview.
        const minimumHorizontalAngle = (room ? 45 : 51) * Math.PI / 180;
        const portraitFov = 2 * Math.atan(Math.tan(minimumHorizontalAngle / 2) / camera.aspect) * 180 / Math.PI;
        const wideFov = Math.min(room ? 92 : 96, Math.max(fieldOfView, portraitFov));
        fieldOfView = T.MathUtils.lerp(fieldOfView,wideFov,room ? 1 : overview);
      }
      if (camera.fov !== fieldOfView) {
        camera.fov=fieldOfView;
        camera.updateProjectionMatrix();
      }
      const elevation=room ? Math.min(pitch,.24) :
        T.MathUtils.lerp(pitch+.035*narrow,.73+.40*pitch,overview);
      const desired=(room ? 4.4 : 7.1+(.9+.4*overview)*narrow)*zoom;
      const walkingFocus = room ? 1.32 : 1.53;
      const closeUp = clamp((1 - zoom) / (1 - (room ? .55 : .34)), 0, 1);
      target.set(position.x, T.MathUtils.lerp(walkingFocus, 1.05, closeUp), position.z);
      let allowed=boomClearance(elevation,desired), bestLift=0;
      // As the visitor pulls out beside a hall, find a clear angle over its roof.
      const checkRoof=overview>.04 && allowed<desired-.15;
      if (checkRoof) {
        let best=allowed;
        for (let angle=elevation+.13;angle<=1.47;angle+=.13) {
          const clearance=boomClearance(angle,desired);
          if (clearance>best+.15) { best=clearance; bestLift=angle-elevation; }
          if (best>=desired-.15) break;
        }
      }
      obstacleLift=room ? 0 : T.MathUtils.lerp(obstacleLift,bestLift,1-Math.exp(-dt*11));
      if (obstacleLift<.001) obstacleLift=0;
      if (checkRoof || obstacleLift) allowed=boomClearance(elevation+obstacleLift,desired);
      cameraDistance=allowed<cameraDistance ? allowed : T.MathUtils.lerp(cameraDistance,allowed,1-Math.exp(-dt*7));
      camera.position.copy(target).addScaledVector(direction,cameraDistance);
      // Frame the six halls together once the boom is clear of nearby buildings.
      const framing=overview*T.MathUtils.smoothstep(cameraDistance,12,35);
      lookAt.copy(target).lerp(campusCenter,framing);
      lookAt.y+=1.8*framing*(1-narrow);
      camera.lookAt(lookAt);
      visitor.root.visible=cameraDistance>0.69;
    }
    function resetView() { yaw=entryYaw; pitch=entryPitch; outdoorZoom=indoorZoom=1; cameraDistance=8; obstacleLift=0; updateCamera(1); }
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
      if (active) jumpTime = Math.min(jumpDuration, jumpTime + dt);
      const jumpPhase = jumpTime / jumpDuration;
      jumpHeight = 4 * jumpPeak * jumpPhase * (1 - jumpPhase);
      visitor.animate(dt,travelled,reducedMotion.matches,jumpHeight);
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
        if (gap>2 && pinchGap>2) changeZoom(pinchGap/gap);
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
      changeZoom(Math.exp(clamp(pixels,-900,900)*.0012));
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
    function getPosition() {
      return {x:position.x, y:visitor.root.position.y + jumpHeight, z:position.z};
    }
    return {update,setActive,setStick,walkTo,jump,getPosition,resetView,facePoint,toggleOverview,isOverview,dispose};
  }

  globalThis.HLBPlayer3D={create};
})();
