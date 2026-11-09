(() => {
  "use strict";

  const radius = 0.31;
  const speed = 4.8;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  // Bake each rigid body part into a single vertex-coloured mesh. The articulated
  // joints remain independent while fur markings and jacket details share draws.
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

    // A red panda ranger. The soles, chin and ear tips sit near 0, 0.81 and 1.61 m.
    const hipHeight = .354, headHeightAboveHips = .805;
    const hips = joint(root,0,hipHeight,0);
    const chest = joint(hips,0,0,0);
    const red = 0xef4136, piping = 0xb53439, ivory = 0xffefce;
    const fur = 0xd8794d, amber = 0xe98a57, cocoa = 0x79463d, ink = 0x392d37;
    const navy = 0x34485a, sole = 0x594b52;
    part(chest,(oval,band,seam) => {
      oval(navy,0,.026,.005,.194,.115,.146);
      oval(red,0,.211,0,.231,.210,.168);
      band(piping,0,.104,0,.210,.207,.033,.74);
      oval(fur,0,.428,0,.126,.114,.114);
      band(ivory,0,.378,-.008,.137,.153,.054,.83);
      seam(piping,[[0,.115,-.155],[0,.215,-.169],[0,.293,-.151]],.009);
      for (const s of [-1,1]) {
        seam(navy,[[s*.126,.131,-.125],[s*.130,.233,-.140],[s*.136,.329,-.098],
          [s*.127,.371,.006],[s*.135,.313,.111]],.019);
      }
      // Cream triangular neckerchief and its little brass knot.
      oval(ivory,0,.336,-.111,.071,.065,.031,-.47);
      oval(0xefb35b,0,.296,-.147,.020,.024,.018);
      // The layered red satchel is visible in the default, rear-facing camera.
      oval(piping,0,.199,.140,.150,.157,.080);
      oval(red,0,.193,.170,.145,.149,.089);
      oval(ivory,0,.230,.223,.128,.080,.049);
      for (const s of [-1,1]) oval(0xe8ad63,s*.078,.214,.264,.010,.012,.006);
    });
    const head = joint(chest,0,headHeightAboveHips,-.009);
    head.name = "visitor-head";
    const eyes = joint(head,0,-.024,0);
    part(head,(oval,band,seam,add) => {
      oval(fur,0,.005,.008,.424,.359,.323);
      // Broad lower cheeks give the face its soft, pear-shaped silhouette.
      oval(fur,0,-.084,-.023,.413,.261,.306);
      function ear(color,x,y,z,scale,tilt) {
        const shape = new T.Shape();
        shape.moveTo(-.105,-.043);
        shape.quadraticCurveTo(-.128,.026,-.058,.147);
        shape.quadraticCurveTo(-.020,.210,.028,.161);
        shape.quadraticCurveTo(.123,.067,.118,-.034);
        shape.quadraticCurveTo(.084,-.101,0,-.105);
        shape.quadraticCurveTo(-.076,-.105,-.105,-.043);
        const geometry = new T.ExtrudeGeometry(shape,{depth:.044,bevelEnabled:true,bevelThickness:.020,bevelSize:.014,bevelSegments:3,curveSegments:8});
        add(geometry,color,x,y,z,scale,scale,scale,0,0,tilt);
      }
      for (const s of [-1,1]) {
        ear(ivory,s*.294,.266,-.008,1,-s*.33);
        ear(fur,s*.294,.274,.028,.83,-s*.33);
        ear(cocoa,s*.294,.278,-.027,.78,-s*.33);
        ear(0xe6a389,s*.294,.279,-.042,.52,-s*.33);
        // Dark eye markings, buttery brows and the two sweeping cheek patches.
        oval(cocoa,s*.162,-.055,-.272,.101,.118,.055,0,-s*.43,-s*.23);
        oval(ivory,s*.171,.095,-.264,.077,.044,.037,0,-s*.42,-s*.29);
        oval(ivory,s*.283,-.132,-.219,.100,.080,.037,0,-s*.77,s*.38);
        oval(0xefaa8d,s*.284,-.144,-.251,.042,.021,.014,0,-s*.75,s*.20);
      }
      for (const s of [-1,1]) oval(ivory,s*.055,-.142,-.290,.091,.079,.055,0,-s*.12);
      oval(ink,0,-.098,-.344,.046,.032,.021);
      oval(0x976b64,-.012,-.089,-.362,.014,.007,.005);
      seam(cocoa,[[0,-.120,-.346],[0,-.143,-.346]],.006);
      seam(cocoa,[[-.042,-.152,-.347],[-.027,-.159,-.348],[0,-.143,-.346],
        [.026,-.159,-.348],[.042,-.152,-.347]],.006);
      // A small cherry-red beret sits between the ears; its brim clears the brows.
      const crown = new T.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI*.53);
      band(piping,0,.248,.001,.303,.299,.036,.862);
      add(crown,red,0,.261,.002,.313,.137,.269,0,0,-.055);
      oval(piping,.045,.399,.009,.023,.029,.022,0,0,-.27);
      oval(red,.061,.418,.011,.025,.014,.018,0,0,-.16);
    });
    part(eyes,oval => {
      for (const s of [-1,1]) {
        oval(ink,s*.151,0,-.321,.048,.057,.026,0,-s*.35);
        oval(0x975f49,s*.153,-.020,-.339,.029,.021,.009,0,-s*.34);
        oval(0xfffcf1,s*.151-.011,.018,-.345,.015,.016,.008);
        oval(ivory,s*.151+.013,-.019,-.347,.006,.006,.004);
      }
    });

    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 256; labelCanvas.height = 112;
    const labelContext = labelCanvas.getContext("2d");
    labelContext.fillStyle = "#a73035";
    labelContext.fillRect(0,0,256,112);
    labelContext.font = "bold 96px Arial, sans-serif";
    labelContext.textAlign = "center";
    labelContext.textBaseline = "middle";
    labelContext.fillStyle = "#fff5df";
    labelContext.fillText("HLB",128,62);
    const labelMap = new T.CanvasTexture(labelCanvas);
    labelMap.colorSpace = T.SRGBColorSpace;
    const labelMaterial = new T.MeshBasicMaterial({map:labelMap,toneMapped:false});
    const capLabel = new T.Mesh(new T.PlaneGeometry(.112,.049),labelMaterial);
    capLabel.rotation.y = Math.PI;
    capLabel.rotation.x = .34;
    capLabel.position.set(0,.284,-.266);
    head.add(capLabel);
    const packLabel = new T.Mesh(new T.PlaneGeometry(.123,.054),labelMaterial);
    packLabel.position.set(0,.233,.274);
    chest.add(packLabel);

    // Sweep a tapered tube along the tail so its stripes follow each bend.
    const tail = joint(hips,0,.040,.112);
    const tailCurve = new T.CatmullRomCurve3([
      new T.Vector3(0,0,0), new T.Vector3(.037,-.075,.124),
      new T.Vector3(.172,-.092,.211), new T.Vector3(.294,-.027,.204),
      new T.Vector3(.350,.077,.165), new T.Vector3(.354,.136,.136)
    ]);
    const tailRings = 36, tailSides = 16;
    const tube = new T.TubeGeometry(tailCurve,tailRings,1,tailSides,false);
    const tubeVertices = tube.attributes.position;
    const tailPoint = new T.Vector3();
    for (let ring=0; ring<=tailRings; ring++) {
      const t = ring/tailRings;
      const center = tailCurve.getPointAt(t);
      const width = .002 + .096*Math.pow(Math.sin(Math.PI*t),.52);
      for (let side=0; side<=tailSides; side++) {
        const i=ring*(tailSides+1)+side;
        tailPoint.fromBufferAttribute(tubeVertices,i).sub(center).multiplyScalar(width).add(center);
        tubeVertices.setXYZ(i,tailPoint.x,tailPoint.y,tailPoint.z);
      }
    }
    tube.computeVertexNormals();
    const stripes = tube.toNonIndexed();
    tube.dispose();
    const tailColors = [], stripePaint = [fur,cocoa,amber,cocoa,amber,ivory].map(color=>new T.Color(color));
    for (let i=0; i<stripes.attributes.position.count; i++) {
      const ring = Math.floor(i/(tailSides*6));
      const color = stripePaint[Math.floor(ring*stripePaint.length/tailRings)];
      tailColors.push(color.r,color.g,color.b);
    }
    stripes.setAttribute("color",new T.Float32BufferAttribute(tailColors,3));
    const plume = new T.Mesh(stripes,material);
    plume.castShadow = true;
    tail.add(plume);

    const arms = [], legs = [];
    for (const s of [-1,1]) {
      const arm = joint(chest,s*.196,.295,0);
      arm.rotation.z = s*.14;
      const elbow = joint(arm,0,-.111,0);
      part(arm,oval => oval(red,0,-.043,0,.082,.107,.085));
      part(elbow,(oval,band) => {
        oval(red,0,-.025,0,.070,.076,.074);
        band(ivory,0,-.064,0,.067,.064,.027);
        oval(cocoa,0,-.110,-.010,.070,.070,.066);
        oval(cocoa,-s*.044,-.104,-.049,.034,.040,.030);
      });
      const thigh = joint(hips,s*.104,-.005,0);
      const shin = joint(thigh,0,-.131,0);
      part(thigh,oval => oval(navy,0,-.038,0,.107,.113,.109));
      part(shin,(oval,band) => {
        oval(cocoa,0,-.067,0,.077,.086,.084);
        band(ivory,0,-.085,0,.078,.078,.036);
        oval(0xe3a079,0,-.151,-.035,.091,.064,.124);
        oval(sole,0,-.191,-.038,.093,.027,.125);
        oval(ivory,0,-.144,-.105,.074,.033,.062);
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
      tail.rotation.y = reducedMotion ? 0 : Math.sin(phase) * stride * .21 + Math.sin(elapsed * 2) * .07;
      tail.rotation.x = -.22*inAir;
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
    let active=true, yaw=entryYaw, pitch=entryPitch, zoom=1, cameraDistance=7.6;
    const jumpDuration = .68, jumpPeak = .82;
    let jumpTime = jumpDuration;
    let jumpHeight = 0;
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
    function getPosition() {
      return {x:position.x, y:visitor.root.position.y + jumpHeight, z:position.z};
    }
    return {update,setActive,setStick,walkTo,jump,getPosition,resetView,facePoint,dispose};
  }

  globalThis.HLBPlayer3D={create};
})();
