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
    eyes.name = "visitor-eyes";
    part(head,(oval,band,seam,add) => {
      oval(skin,0,0,0,.373,.388,.303);
      for (const s of [-1,1]) {
        oval(skin,s*.362,-.053,.006,.076,.094,.069,0,0,-s*.13);
        oval(rose,s*.395,-.055,-.042,.029,.043,.016,0,-s*.39,-s*.09);
        oval(0xf2a695,s*.225,-.112,-.229,.059,.028,.010,0,-s*.60,s*.09);
        oval(hair,s*.138,.091,-.278,.061,.017,.012,0,-s*.38,-s*.1);
      }
      oval(0xf1ad8f,0,-.081,-.298,.040,.032,.039);
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
    const mouth = joint(head,0,-.168,-.275);
    mouth.name = "visitor-mouth";
    part(mouth,(oval,band,seam) => {
      seam(0x9a5455,[[-.056,.009,-.001],[-.027,-.008,0],
        [0,-.013,.001],[.030,-.006,0],[.054,.011,-.001]],.008);
    });
    const smile = joint(head,0,0,0);
    smile.name = "visitor-cafe-smile";
    smile.visible = false;
    part(smile,(oval,band,seam,add) => {
      // Place the expression directly on the rounded face, even at its outer edges.
      function surface(x,y) {
        return -.303*Math.sqrt(1-(x/.373)**2-(y/.388)**2)-.006;
      }
      for (const s of [-1,1]) {
        const eyelid = [[.073,-.040],[.100,-.016],[.139,-.004],[.175,-.010],[.200,-.025]];
        seam(ink,eyelid.map(([x,y])=>[s*x,y,surface(x,y)-.004]),.010);
        oval(0xed8a7c,s*.225,-.101,-.234,.064,.030,.012,0,-s*.60,s*.12);
      }
      // A broad open grin with lifted corners; a pink tongue follows its lower lip.
      const vertices=[], indices=[];
      for (let i=0;i<=20;i++) {
        const u=i/10-1, x=u*.100;
        for (const y of [-.148+.024*u*u,-.207+.083*u*u]) vertices.push(x,y,surface(x,y)-.004);
        if (i) {
          const k=i*2;
          indices.push(k-2,k,k-1,k,k+1,k-1);
        }
      }
      const grin=new T.BufferGeometry();
      grin.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
      grin.setIndex(indices); grin.computeVertexNormals();
      add(grin,0x773c42,0,0,0,1,1,1);
      oval(0xeb9585,0,-.184,surface(0,-.184)-.006,.043,.012,.006,-.49);
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
      });
      const hand = joint(elbow,0,-.114,-.010);
      // The face points towards -Z, so the visitor's right is local +X.
      hand.name = s === 1 ? "visitor-right-hand" : "visitor-left-hand";
      part(hand,oval => {
        oval(skin,0,0,0,.067,.082,.054);
        oval(skin,-s*.047,.008,-.030,.028,.043,.027);
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
      arms.push({arm,elbow,hand}); legs.push({thigh,shin});
    }
    const treats = {coffee:null, bread:null};
    const tastingPose = {turnIn:0, turnBack:0};
    const smileDuration=1.45;
    let consuming = null, consumeTime = 0, smileRemaining = 0;
    function orderCafeItem(item) {
      if ((item !== "coffee" && item !== "bread") || treats[item]) return false;
      const prop = new T.Group();
      prop.name = "cafe-" + item;
      if (item === "coffee") {
        // The narrow waist lies in the palm; the tall lid clears the thumb.
        part(prop,(oval,band) => {
          const x=.040, z=-.049;
          band(0xffebca,x,.028,z,.084,.061,.208);
          band(0xab7650,x,.028,z,.079,.069,.100);
          band(0xe9cb9c,x,.076,z,.081,.080,.007);
          band(0x563c32,x,.135,z,.093,.093,.019);
          band(0x775244,x,.151,z,.079,.089,.020);
          band(0x634136,x,.164,z,.074,.079,.008);
          oval(0x352a28,x,.169,z+.052,.018,.0025,.007);
          // A small cream turtle stamp on both sides of the kraft sleeve.
          for (const face of [-1,1]) {
            const faceZ = z+face*.075;
            oval(ivory,x,.030,faceZ,.031,.018,.003);
            oval(ivory,x+.028,.035,faceZ-face*.004,.011,.009,.004);
            for (const foot of [-1,1]) oval(ivory,x+foot*.017,.016,faceZ,.005,.009,.003);
          }
        });
        arms[1].hand.add(prop);
      } else {
        // Sweep the pastry along a crescent; narrow, toasted grooves follow
        // each wrap of dough around the growing and tapering cross sections.
        const vertices=[], colors=[], indices=[];
        const rings=64, sides=20;
        const toast=new T.Color(0xb96529), honey=new T.Color(0xf2af55), color=new T.Color();
        for (let i=0;i<=rings;i++) {
          const t=i/rings, u=t*2-1, a=u*1.75;
          const crown=Math.sin(Math.PI*t);
          const x=-.029+.157*Math.sin(a), z=-.026-.090*(1-Math.cos(a));
          const dx=.157*Math.cos(a), dz=-.090*Math.sin(a), span=Math.hypot(dx,dz);
          for (let j=0;j<=sides;j++) {
            const angle=j/sides*Math.PI*2, sn=Math.sin(angle), cs=Math.cos(angle);
            const line=(1+Math.cos(t*Math.PI*14 + sn*.85))*.5;
            const crease=line**9;
            const radius=(.002+.077*crown**.64)*(1-.16*crease);
            vertices.push(x-dz/span*cs*radius,.045+.020*crown+sn*radius*.88,z+dx/span*cs*radius);
            color.copy(toast).lerp(honey,clamp(.39+.36*sn+.24*crown-.42*crease,0,1));
            colors.push(color.r,color.g,color.b);
            if (i<rings && j<sides) {
              const k=i*(sides+1)+j;
              indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);
            }
          }
        }
        const geometry=new T.BufferGeometry();
        geometry.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
        geometry.setAttribute("color",new T.Float32BufferAttribute(colors,3));
        geometry.setIndex(indices); geometry.computeVertexNormals();
        const pastry=new T.Mesh(geometry,material);
        pastry.castShadow=true; prop.add(pastry); arms[0].hand.add(prop);
      }
      treats[item]=prop;
      return true;
    }
    function consumeCafeItem(item) {
      if ((item !== "coffee" && item !== "bread") || consuming || !treats[item]) return false;
      consuming=item; consumeTime=0; smileRemaining=0;
      return true;
    }
    function getCafeState() {
      return {coffee:Boolean(treats.coffee), bread:Boolean(treats.bread), consuming};
    }
    const wrist = new T.Quaternion(), tilt = new T.Euler();
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
      let reach=0, chew=0, happy=false, turn=null;
      const smooth=T.MathUtils.smoothstep;
      if (consuming) {
        const drink=consuming==="coffee";
        consumeTime += dt;
        const t=consumeTime/(reducedMotion ? .92 : drink ? 1.76 : 1.56);
        reach=smooth(t,0,.32)*(1-smooth(t,.65,1));
        turn=tastingPose;
        turn.turnIn=reducedMotion ? 1 : smooth(t,0,.32);
        turn.turnBack=0;
        happy=t>=.81;
        if (!drink && !reducedMotion) chew=Math.sin(t*Math.PI*15)*smooth(t,.38,.55)*(1-smooth(t,.78,.99));
        if (t>=1) {
          const prop=treats[consuming];
          prop.removeFromParent();
          prop.traverse(object=>object.geometry?.dispose());
          treats[consuming]=null;
          consuming=null;
          smileRemaining=smileDuration;
        }
      } else if (smileRemaining>0) {
        smileRemaining=Math.max(0,smileRemaining-dt);
        happy=smileRemaining>0;
        if (happy) {
          turn=tastingPose; turn.turnIn=1;
          turn.turnBack=reducedMotion ? 0 : 1-smooth(smileRemaining,0,.38);
        }
      }
      smile.visible=happy;
      eyes.visible=mouth.visible=!happy;
      // Keep the pace unhurried: about 2.5 footfalls per second at full speed.
      // Distance still drives the cycle, so stopped or blocked feet settle.
      phase += travelled * 1.65;
      weight += ((travelled > 0.0002 ? 1 : 0) - weight) * (1 - Math.exp(-dt * 10));
      const inAir = clamp(jumpHeight / .53,0,1);
      const stride = weight * (1-inAir);
      const spring = (1-Math.cos(phase*2))*.5;
      hips.position.y = hipHeight + jumpHeight + (reducedMotion ? 0 : stride*(spring*.028-.004));
      chest.rotation.x = -.045*stride*(1-reach);
      chest.rotation.z = (reducedMotion ? 0 : Math.sin(phase)*stride*.030);
      head.rotation.z = -chest.rotation.z * 0.6;
      head.rotation.x = -.055 * inAir - reach*.30 + chew*.025;
      mouth.scale.y = 1 + Math.max(0,chew)*.55;
      head.position.y = headHeightAboveHips + (reducedMotion ? 0 : Math.sin(elapsed * 2.0) * 0.004 * (1 - weight));
      const blinkTime = (elapsed + .7) % 4.1;
      eyes.scale.y = reducedMotion ? 1 : clamp(Math.abs(blinkTime-.095)/.095,.075,1);
      shadow.scale.setScalar(1-.30*inAir);
      shadowMaterial.opacity = 1-.46*inAir;
      for (let i = 0; i < 2; i++) {
        const swing = Math.sin(phase + i * Math.PI) * stride;
        legs[i].thigh.rotation.x = swing * .57 + inAir * (i ? .54 : .31);
        legs[i].shin.rotation.x = -stride*.10-Math.max(0,swing)*.58-inAir*.70;
        const {arm,elbow}=arms[i], side=i ? 1 : -1;
        const drink=i===1, item=drink ? "coffee" : "bread", prop=treats[item];
        const lift=consuming===item ? reach : 0;
        // Swing an empty arm freely. Carry an order slightly to the side with
        // the wrist level, even while running or jumping.
        const swingX=prop ? .48-swing*.15+inAir*.12 : stride*.10-swing*.34+inAir*.25;
        const spread=prop ? .45+inAir*.30 : .14+inAir*.99;
        // Bring the cup's sipping edge and the croissant's inner tip to the lips.
        arm.position.set(side*(.202+(drink ? -.050 : .030)*lift),
          .366+(drink ? .069 : .045)*lift,-(drink ? .131 : .062)*lift);
        arm.rotation.set(T.MathUtils.lerp(swingX,1.80,lift),side*.60*lift,
          side*T.MathUtils.lerp(spread,-.30,lift));
        const bend=prop ? .68 : .16+stride*.67+Math.max(0,-swing)*.12+inAir*.22;
        elbow.rotation.x=T.MathUtils.lerp(bend,.40,lift);
        if (prop) {
          tilt.set((drink ? .95 : .14)*lift,drink ? 0 : -1.29*lift,(drink ? .60 : .50)*lift);
          wrist.copy(arm.quaternion).multiply(elbow.quaternion).invert();
          prop.quaternion.setFromEuler(tilt).premultiply(wrist);
        }
      }
      return turn;
    }
    const contactLocal=new T.Vector3();
    function reachPortal(point,amount) {
      const {arm,elbow,hand}=arms[1];
      // Aim the two arm bones so the skin near the end of the palm meets the surface.
      const offset=chest.worldToLocal(contactLocal.copy(point)).sub(arm.position);
      // Bring the reaching shoulder forward while leaving space between the face and the crystal.
      const extension=amount*clamp(-offset.z-.28,0,.12);
      arm.position.z-=extension;
      offset.z+=extension;
      const upper=-elbow.position.y;
      const palmEnd=hand.position.y-.065;
      const lower=Math.hypot(palmEnd,hand.position.z);
      const length=Math.hypot(offset.y,offset.z);
      const bend=Math.acos(clamp((length*length-upper*upper-lower*lower)/(2*upper*lower),-1,1));
      const shoulder=Math.atan2(-offset.z,-offset.y)-
        Math.atan2(lower*Math.sin(bend),upper+lower*Math.cos(bend));
      arm.position.x+=amount*clamp(offset.x,-.025,.025);
      arm.rotation.x=T.MathUtils.lerp(arm.rotation.x,shoulder,amount);
      arm.rotation.y*=1-amount;
      arm.rotation.z*=1-amount;
      const forearmTilt=Math.atan2(-hand.position.z,-palmEnd);
      elbow.rotation.x=T.MathUtils.lerp(elbow.rotation.x,bend-forearmTilt,amount);
      head.rotation.x-=.12*amount;
      if (treats.coffee) {
        // Keep the cup upright and turn it clear of the touching side of the hand.
        wrist.copy(arm.quaternion).multiply(elbow.quaternion).invert();
        treats.coffee.quaternion.setFromEuler(tilt.set(0,Math.PI*amount,0)).premultiply(wrist);
      }
    }
    function dispose() {
      root.removeFromParent();
      root.traverse(object => object.geometry?.dispose());
      material.dispose(); shadowMap.dispose(); shadowMaterial.dispose();
      labelMap.dispose(); labelMaterial.dispose();
    }
    return {root,animate,reachPortal,dispose,orderCafeItem,consumeCafeItem,getCafeState};
  }

  function segmentHits(a,b,box) {
    if(box.obb){
      const o=box.obb;
      const local=p=>({x:(p.x-o.x)*o.cos-(p.z-o.z)*o.sin,z:(p.x-o.x)*o.sin+(p.z-o.z)*o.cos});
      return segmentHits(local(a),local(b),{minX:-o.halfX,maxX:o.halfX,minZ:-o.halfZ,maxZ:o.halfZ});
    }
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
    const boxes = world.colliders.filter(b => (b.minY ?? 0) < (b.floorY ?? 0)+1.8 && (b.maxY ?? 3) > (b.floorY ?? 0)+0.2)
      .map(b => {
        const padding=b.obb ? radius*(Math.abs(b.obb.cos)+Math.abs(b.obb.sin)) : radius;
        return {minX:b.minX-padding,maxX:b.maxX+padding,minZ:b.minZ-padding,maxZ:b.maxZ+padding,
          obb:b.obb ? {...b.obb,halfX:b.obb.halfX+radius,halfZ:b.obb.halfZ+radius} : null};
      });
    const b = world.bounds;
    function insideBounds(p) {
      return p.x >= b.minX+radius && p.x <= b.maxX-radius && p.z >= b.minZ+radius && p.z <= b.maxZ-radius &&
        (!world.isWalkablePoint || world.isWalkablePoint(p,radius));
    }
    function clear(a,target) {
      if (!insideBounds(target)) return false;
      // Both route smoothing and manual movement must follow the hillside walk,
      // even when the two endpoints are on otherwise accessible ground.
      if(world.isWalkablePoint) {
        const steps=Math.ceil(distance(a,target)/.25);
        for(let step=1;step<steps;step++) {
          const t=step/steps;
          if(!world.isWalkablePoint({x:a.x+(target.x-a.x)*t,z:a.z+(target.z-a.z)*t},radius))return false;
        }
      }
      const minX=Math.min(a.x,target.x),maxX=Math.max(a.x,target.x);
      const minZ=Math.min(a.z,target.z),maxZ=Math.max(a.z,target.z);
      for (const box of boxes) {
        if (box.maxX<minX || box.minX>maxX || box.maxZ<minZ || box.minZ>maxZ) continue;
        if (segmentHits(a,target,box)) return false;
      }
      return true;
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
    const parent = new Int32Array(size), queue = new Int32Array(size);
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
      for (let row=minRow;row<=maxRow;row++) {
        if(!box.obb) blocked.fill(1,at(minCol,row),at(maxCol,row)+1);
        else for(let col=minCol;col<=maxCol;col++) {
          const id=at(col,row);
          if(world.containsPoint(box,worldPoint(id))) blocked[id]=1;
        }
      }
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
      parent.fill(-1);
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
          // A rotated thin wall can pass between two unblocked grid centres.
          if (!clear(worldPoint(id),worldPoint(next))) continue;
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

  function create(scene,camera,canvas,world,arrival = null,onScenePick = null,onAction = null) {
    const T = globalThis.THREE;
    const visitor = createVisitor(T,scene);
    const lupe = globalThis.HLBLupe3D?.create(T,scene);
    let guideTarget=null, showLupe=true;
    let position = {...(arrival?.station || world.spawn)};
    const groundAt=p=>world.groundHeight?.(p) ?? 0;
    visitor.root.position.set(position.x,groundAt(position)+(arrival ? 0.086 : 0.025),position.z);
    const nav = makeNavigation(world);
    const movementCodes = new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD"]);
    const actionCodes = new Map([
      ["KeyZ","eat-bread"],["KeyX","drink-coffee"],["KeyC","ride-yacht"],
      ["Space","jump"],["KeyF","firework"],["KeyE","interact"]
    ]);
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
    let cafeTurn = null;
    let ride = null;
    let portal = null;
    const ridePosition = new T.Vector3();
    const rideCamera = new T.Vector3();
    const baseFov=camera.fov;
    let route=[], pinchGap=0, touchingMultiple=false;
    function volume(b,padding=0,verticalPadding=0) {
      const o=b.obb;
      return {box:new T.Box3(
        new T.Vector3((o?-o.halfX:b.minX)-padding,(b.minY??0)-verticalPadding,(o?-o.halfZ:b.minZ)-padding),
        new T.Vector3((o?o.halfX:b.maxX)+padding,(b.maxY??3)+verticalPadding,(o?o.halfZ:b.maxZ)+padding)),
        inverse:o ? new T.Matrix4().makeRotationY(-Math.atan2(o.sin,o.cos))
          .multiply(new T.Matrix4().makeTranslation(-o.x,0,-o.z)) : null};
    }
    const cameraBoxes = (world.cameraColliders || world.colliders).map(b=>volume(b,.17,.12));
    const volumeRay=new T.Ray(),volumeHit=new T.Vector3();
    function volumeDistance(inputRay,body) {
      const testRay=body.inverse ? volumeRay.copy(inputRay).applyMatrix4(body.inverse) : inputRay;
      return testRay.intersectBox(body.box,volumeHit) ? testRay.origin.distanceTo(volumeHit) : Infinity;
    }
    const orbitRay=new T.Ray(), orbitDirection=new T.Vector3(), nearbyWalls=[];
    let lastWallX=Infinity,lastWallZ=Infinity;
    function limitOrbit(anchor,goal) {
      // Reuse the broad-phase list while in the same three-metre patch.
      const cellX=Math.floor(anchor.x/3),cellZ=Math.floor(anchor.z/3);
      if(lastWallX!==cellX || lastWallZ!==cellZ) {
        nearbyWalls.length=0;
        const physical=world.cameraColliders || world.colliders;
        for(let i=0;i<physical.length;i++) {
          const b=physical[i];
          if(b.maxX>=cellX*3-2 && b.minX<=(cellX+1)*3+2 &&
             b.maxZ>=cellZ*3-2 && b.minZ<=(cellZ+1)*3+2)nearbyWalls.push(cameraBoxes[i]);
        }
        lastWallX=cellX;lastWallZ=cellZ;
      }
      orbitDirection.subVectors(goal,anchor);
      let limit=orbitDirection.length();
      if(limit<.001)return;
      orbitRay.set(anchor,orbitDirection.normalize());
      for(const wall of nearbyWalls)limit=Math.min(limit,volumeDistance(orbitRay,wall)-.21);
      goal.copy(anchor).addScaledVector(orbitDirection,Math.max(0,limit));
    }
    const ray = new T.Ray(), target = new T.Vector3(), direction = new T.Vector3();
    const lookAt = new T.Vector3();
    const walkSurfaces=world.walkSurfaces || [];
    const terrain = ["Eroded caldera escarpments","Layered basalt cone and breached summit"]
      .map(name=>scene.getObjectByName(name)).filter(Boolean);
    const terrainRay = new T.Raycaster(), terrainHits = [];
    const raycaster = new T.Raycaster(), ndc = new T.Vector2(), floor = new T.Plane(new T.Vector3(0,1,0),0);
    const indoors = world.spaces.filter(s=>s.interior).map(s=>({space:s,
      volume:volume({...s.interior,minY:s.interior.floorY || 0,maxY:s.interior.ceilingY || 3.6}),box:new T.Box3(
        new T.Vector3(s.interior.minX,s.interior.floorY || 0,s.interior.minZ),
        new T.Vector3(s.interior.maxX,s.interior.ceilingY || 3.6,s.interior.maxZ))}));
    const campusBounds=new T.Box3();
    for (const room of indoors) campusBounds.union(room.box);
    const campusCenter=campusBounds.getCenter(new T.Vector3());
    const exhibitBoxes = world.spaces.flatMap(space => (space.exhibits || []).filter(exhibit => exhibit.hitBox).map(exhibit => {
      const b = exhibit.hitBox;
      return {space, exhibit, volume:volume(b)};
    }));
    if (world.warpGate?.pickBox) exhibitBoxes.push({
      space:undefined, exhibit:world.warpGate, volume:volume(world.warpGate.pickBox)
    });
    function roomAt(p) {
      return indoors.find(({space}) => world.containsPoint ? world.containsPoint(space.interior,p) :
        p.x>=space.interior.minX && p.x<=space.interior.maxX && p.z>=space.interior.minZ && p.z<=space.interior.maxZ);
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const markerMaterial = new T.MeshBasicMaterial({color:0xef4136,side:T.DoubleSide,depthWrite:false});
    const marker = new T.Mesh(new T.RingGeometry(0.21,0.29,32),markerMaterial);
    marker.rotation.x=-Math.PI/2; marker.visible=false; scene.add(marker);

    function walkTo(point) {
      if (!active || ride || portal) return false;
      route=nav.route(position,point);
      marker.visible=route.length>0;
      if (!marker.visible) return false;
      const dest=route[route.length-1];
      marker.position.set(dest.x,groundAt(dest)+(roomAt(dest) ? 0.11 : 0.063),dest.z);
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
      if (!active || ride || portal || jumpTime < jumpDuration) return false;
      jumpTime = 0;
      return true;
    }
    function setStick(x,y) {
      if (!active || ride || portal) return;
      stick.x=clamp(x,-1,1); stick.y=clamp(y,-1,1);
      if (Math.hypot(x,y)>0.08) stopRoute();
    }
    function consumeCafeItem(item) {
      if (!active || ride || portal || !visitor.consumeCafeItem(item)) return false;
      const movingKeys = [...held].some(code => movementCodes.has(code));
      if (!route.length && !movingKeys && !freshPresses.size && Math.hypot(stick.x,stick.y)<=.04) {
        const start=visitor.root.rotation.y, home=cafeTurn?.home ?? start;
        const toCamera=yaw+Math.PI+(item==="coffee" ? .32 : -.32);
        const toward=Math.atan2(Math.sin(toCamera-start),Math.cos(toCamera-start));
        const back=Math.atan2(Math.sin(home-toCamera),Math.cos(home-toCamera));
        cafeTurn={start,home,toward,back};
      }
      return true;
    }
    function changeZoom(factor) {
      if (roomAt(position)) indoorZoom=clamp(indoorZoom*factor,.55,1.3);
      else outdoorZoom=clamp(outdoorZoom*factor,.34,6);
    }
    function isOverview() { return !ride && !roomAt(position) && outdoorZoom>=5.7; }
    function toggleOverview() {
      if (!active || ride || portal || roomAt(position)) return;
      outdoorZoom=isOverview() ? 1 : 6;
    }
    function surfaceClearance(surfaces,limit) {
      if(!surfaces.length || limit<=0)return limit;
      terrainRay.set(target,direction);terrainRay.far=limit;terrainHits.length=0;
      terrainRay.intersectObjects(surfaces,false,terrainHits);
      return terrainHits.length ? terrainHits[0].distance-.18 : limit;
    }
    function boomClearance(elevation,desired) {
      direction.set(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation));
      ray.set(target,direction);
      let limit=desired;
      for (const box of cameraBoxes) {
        limit=Math.min(limit,volumeDistance(ray,box)-.06);
      }
      if (direction.y<0) limit=Math.min(limit,(target.y-groundAt(position)-.2)/-direction.y);
      // Nearby raised ground can cross the camera boom even at a high angle.
      limit=surfaceClearance(walkSurfaces,limit);
      // Only a low orbit outside the plateau can meet the distant ridges.
      if (elevation<.42 && limit>0 && Math.hypot(target.x,target.z+4)+limit>25) {
        limit=surfaceClearance(terrain,limit);
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
      target.set(position.x, groundAt(position)+T.MathUtils.lerp(walkingFocus, 1.05, closeUp), position.z);
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
      // Frame the halls together once the boom is clear of nearby buildings.
      const framing=overview*T.MathUtils.smoothstep(cameraDistance,12,35);
      lookAt.copy(target).lerp(campusCenter,framing);
      lookAt.y+=1.8*framing*(1-narrow);
      camera.lookAt(lookAt);
      visitor.root.visible=cameraDistance>0.69;
    }
    function resetView() { yaw=entryYaw; pitch=entryPitch; outdoorZoom=indoorZoom=1; cameraDistance=8; obstacleLift=0; updateCamera(1); }
    function facePoint(point) {
      cafeTurn=null;
      yaw = Math.atan2(position.x - point.x, position.z - point.z);
      visitor.root.rotation.y = yaw;
      pitch = entryPitch;
      updateCamera(1);
    }
    function beginPortalTouch(gate,onContact) {
      if (!active || ride || portal || !gate?.touchPoint || !Number.isFinite(gate.touchYaw)) return false;
      const path=nav.route(position,gate.touchStation);
      if (!path.length || distance(path[path.length-1],gate.touchStation)>.01) return false;
      release();
      jumpTime=jumpDuration;
      jumpHeight=0;
      cafeTurn=null;
      portal={
        gate,path,onContact,shot:null,
        origin:{position:{...position},body:visitor.root.position.clone(),facing:visitor.root.rotation.y,
          eye:camera.position.clone(),rotation:camera.quaternion.clone(),fov:camera.fov,cameraDistance,obstacleLift}
      };
      return true;
    }
    function updatePortalTouch(dt) {
      const {gate}=portal;
      if (!portal.shot) {
        // Frame the character in profile from the reaching-hand side.
        const aim=new T.Vector3((position.x+gate.touchPoint.x)/2,groundAt(position)+.99,
          (position.z+gate.touchPoint.z)/2);
        const sideDistance=Math.max(1.88,1.32/camera.aspect);
        const c=Math.cos(gate.touchYaw),s=Math.sin(gate.touchYaw);
        const eye=aim.clone().add(new T.Vector3(sideDistance*c-.16*s,.38,-sideDistance*s-.16*c));
        const rotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(eye,aim,camera.up));
        const startYaw=visitor.root.rotation.y;
        portal.shot={time:0,contactFrames:0,done:false,startYaw,
          turn:Math.atan2(Math.sin(gate.touchYaw-startYaw),Math.cos(gate.touchYaw-startYaw)),
          startEye:camera.position.clone(),startRotation:camera.quaternion.clone(),
          startFov:camera.fov,eye,rotation};
      }
      const shot=portal.shot;
      if (shot.done) return;
      shot.time+=dt;
      const reduced=reducedMotion.matches;
      const eased=T.MathUtils.smootherstep;
      const framing=reduced ? 1 : eased(shot.time,0,.82);
      const amount=eased(shot.time,reduced?0:.42,reduced?.25:1.13);
      visitor.root.rotation.y=shot.startYaw+shot.turn*(reduced ? 1 : eased(shot.time,0,.46));
      visitor.root.visible=true;
      visitor.animate(dt,0,reduced,0);
      visitor.reachPortal(gate.touchPoint,amount);
      camera.position.lerpVectors(shot.startEye,shot.eye,framing);
      camera.quaternion.slerpQuaternions(shot.startRotation,shot.rotation,framing);
      const fov=T.MathUtils.lerp(shot.startFov,51,framing);
      if (camera.fov!==fov) {camera.fov=fov;camera.updateProjectionMatrix();}
      // Present the held contact for several rendered frames before opening the destination.
      if (amount===1) shot.contactFrames++;
      if (shot.contactFrames>=3 && shot.time>=(reduced?.56:1.65)) {
        shot.done=true;
        portal.onContact?.();
      }
    }
    function endPortalTouch() {
      if (!portal) return false;
      const {origin}=portal;
      portal=null;
      if(lupe)lupe.root.visible=showLupe;
      release();
      position=origin.position;
      visitor.root.position.copy(origin.body);
      visitor.root.rotation.y=origin.facing;
      visitor.animate(0,0,reducedMotion.matches,0);
      cameraDistance=origin.cameraDistance;
      obstacleLift=origin.obstacleLift;
      updateCamera(0);
      camera.position.copy(origin.eye);
      camera.quaternion.copy(origin.rotation);
      camera.fov=origin.fov;camera.updateProjectionMatrix();
      return true;
    }
    function beginRide(craft, passenger) {
      if (ride || portal) return false;
      release();
      jumpTime=jumpDuration;
      jumpHeight=0;
      cafeTurn=null;
      visitor.root.getWorldPosition(ridePosition);
      craft.updateWorldMatrix(true,false);
      ride={craft,boarding:0,start:craft.worldToLocal(ridePosition.clone()),seat:new T.Vector3(passenger.x,passenger.y,passenger.z)};
      craft.add(visitor.root);
      visitor.root.position.copy(ride.start);
      visitor.root.rotation.set(0,0,0);
      visitor.root.visible=true;
      lupe?.board(visitor.root);
      return true;
    }
    function endRide(point, facing) {
      if (!ride) return false;
      lupe?.leave();
      scene.add(visitor.root);
      ride=null;
      position={x:point.x,z:point.z};
      visitor.root.position.set(point.x,groundAt(point)+(roomAt(point) ? .086 : .025),point.z);
      visitor.root.rotation.set(0,0,0);
      visitor.root.visible=true;
      release();
      facePoint(facing);
      return true;
    }
    function updateRide(dt) {
      ride.boarding=Math.min(.75,ride.boarding+dt);
      visitor.root.position.lerpVectors(ride.start,ride.seat,T.MathUtils.smootherstep(ride.boarding,0,.75));
      ride.craft.updateWorldMatrix(true,true);
      visitor.root.getWorldPosition(ridePosition);
      position={x:ridePosition.x,z:ridePosition.z};
      visitor.animate(active ? dt : 0,ride.boarding<.75 ? dt*.7 : 0,reducedMotion.matches,0);
      lupe?.ride(dt,reducedMotion.matches);
      const portrait=camera.aspect<1;
      const fieldOfView=portrait ? 72 : baseFov;
      if (camera.fov!==fieldOfView) { camera.fov=fieldOfView;camera.updateProjectionMatrix(); }
      target.set(ride.craft.position.x,ridePosition.y+.5,ride.craft.position.z);
      // A side view keeps the passenger visible ahead of the cabin and canopy.
      rideCamera.set(target.x+(portrait ? 12 : 10),target.y+(portrait ? 7 : 6),target.z+3);
      camera.position.lerp(rideCamera,1-Math.exp(-dt*5));
      camera.lookAt(target);
      visitor.root.visible=true;
    }
    function down(a,b) {
      return held.has(a)||held.has(b)||freshPresses.has(a)||freshPresses.has(b);
    }
    function update(dt) {
      dt=clamp(Number(dt)||0,0,0.07);
      if (ride) { updateRide(dt); return position; }
      if (portal && !portal.path.length) {
        if(lupe)lupe.root.visible=false;
        if (active && !document.hidden) updatePortalTouch(dt);
        return position;
      }
      // A quick keyboard tap can start and finish between two rendered frames.
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
      } else if (active && (portal || route.length)) {
        const path=portal ? portal.path : route;
        let budget=speed*dt;
        while (path.length && budget>0) {
          const dest=path[0], left=distance(position,dest);
          if (left<=budget) { position=dest; budget-=left; path.shift(); }
          else {
            position={x:position.x+(dest.x-position.x)*budget/left,z:position.z+(dest.z-position.z)*budget/left};
            budget=0;
          }
        }
        marker.visible=route.length>0;
      }
      const travelled=distance(prev,position);
      if (active && (travelled>0.0001 || intensity>.04 || route.length)) cafeTurn=null;
      if (travelled>0.0001) {
        const heading=Math.atan2(prev.x-position.x,prev.z-position.z);
        const turn=Math.atan2(Math.sin(heading-visitor.root.rotation.y),Math.cos(heading-visitor.root.rotation.y));
        visitor.root.rotation.y+=turn*(1-Math.exp(-dt*18));
        visitor.root.position.set(position.x,groundAt(position)+(roomAt(position) ? 0.086 : 0.025),position.z);
      }
      if (active) jumpTime = Math.min(jumpDuration, jumpTime + dt);
      const jumpPhase = jumpTime / jumpDuration;
      jumpHeight = 4 * jumpPeak * jumpPhase * (1 - jumpPhase);
      const tastingPose=visitor.animate(active ? dt : 0,travelled,reducedMotion.matches,jumpHeight);
      if (active && cafeTurn) {
        // Stay facing the viewer after the hand comes down so the smile is visible.
        visitor.root.rotation.y=tastingPose
          ? cafeTurn.start+cafeTurn.toward*tastingPose.turnIn+cafeTurn.back*tastingPose.turnBack
          : cafeTurn.home;
        if (!tastingPose) cafeTurn=null;
      }
      updateCamera(dt);
      if(lupe && showLupe)lupe.fly(dt,visitor.root,camera,guideTarget && (route[0] || guideTarget),reducedMotion.matches,limitOrbit);
      return position;
    }
    function editing(event) {
      return event.target?.closest?.("input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=textbox]");
    }
    function keyDown(event) {
      const moving = movementCodes.has(event.code);
      const action = actionCodes.get(event.code);
      if (!active || ride || portal || document.hidden || (!moving && !action) || event.isComposing ||
        event.altKey || event.ctrlKey || event.metaKey || editing(event)) return;
      if (event.code === "Space" && event.target?.closest?.("button,a")) return;
      // A key kept down across a dialog or a lost window focus needs a new press.
      if (event.repeat && !held.has(event.code)) return;
      event.preventDefault();
      const firstPress = !held.has(event.code);
      held.add(event.code);
      if (moving) {
        if (document.activeElement !== canvas) canvas.focus({preventScroll:true});
        if (firstPress) freshPresses.add(event.code);
        stopRoute();
        onAction?.("move");
      } else if (firstPress) {
        if (action === "jump") jump();
        else onAction?.(action);
      }
    }
    function keyUp(event) { held.delete(event.code); }
    function pointOnGround(x,y) {
      const rect=canvas.getBoundingClientRect();
      ndc.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);
      camera.updateMatrixWorld();
      raycaster.setFromCamera(ndc,camera);
      if(onScenePick && lupe?.root.visible) {
        const center=lupe.root.getWorldPosition(lupePickCenter);
        // Keep a fingertip-sized target when the model shrinks on the yacht.
        const depth=raycaster.ray.origin.distanceTo(center);
        const worldPerPixel=2*depth*Math.tan(T.MathUtils.degToRad(camera.fov/2))/Math.max(1,rect.height);
        const hitRadius=Math.max(.48*lupe.root.scale.x,Math.min(.80,worldPerPixel*15));
        if(raycaster.ray.distanceSqToPoint(center)<hitRadius*hitRadius) {
          onScenePick({id:"lupe"});
          return;
        }
      }
      if(ride)return;
      const room = roomAt(position)?.space;
      if (onScenePick) {
        let picked = null, closest = Infinity;
        for (const display of exhibitBoxes) {
          if (room !== display.space) continue;
          const range=volumeDistance(raycaster.ray,display.volume);
          if (range < closest) { picked = display.exhibit; closest = range; }
        }
        onScenePick(picked);
        if (picked) return;
      }
      let floorHit=raycaster.ray.intersectPlane(floor,new T.Vector3());
      // Pick the visible slope or hilltop before the distant, flat caldera.
      // Keep the exact mesh hit so a tap places the route marker at its height.
      const hillHit=walkSurfaces.length ? raycaster.intersectObjects(walkSurfaces,false)[0] : null;
      if(hillHit && (!floorHit || hillHit.distance<raycaster.ray.origin.distanceTo(floorHit))) floorHit=hillHit.point;
      if (!floorHit) return;
      let nearestHit=raycaster.ray.origin.distanceTo(floorHit), chosen=null;
      for (const room of indoors) {
        const contains=p=>roomAt(p)===room && p.y>=room.box.min.y && p.y<=room.box.max.y;
        if (contains(raycaster.ray.origin) || contains(target)) continue;
        const d=volumeDistance(raycaster.ray,room.volume);
        if (d<nearestHit) { chosen=room.space; nearestHit=d; }
      }
      if (chosen) walkTo(chosen.station);
      else if (floorHit.x>=world.bounds.minX && floorHit.x<=world.bounds.maxX &&
        floorHit.z>=world.bounds.minZ && floorHit.z<=world.bounds.maxZ) walkTo(floorHit);
    }
    function pointerDown(event) {
      if (!active || portal || (event.pointerType==="mouse" && event.button!==0)) return;
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
        if (!ride && gap>2 && pinchGap>2) changeZoom(pinchGap/gap);
        pinchGap=gap; return;
      }
      if (!p.drag && Math.hypot(p.x-p.startX,p.y-p.startY)<5) return;
      p.drag=true; canvas.classList.add("camera-dragging");
      if(ride)return;
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
      if (!active || ride || portal) return;
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
    document.addEventListener("compositionstart",release,options);
    document.addEventListener("focusin",event=>{if(editing(event)) release();},options);
    canvas.addEventListener("pointerdown",pointerDown,options);
    canvas.addEventListener("pointermove",pointerMove,options);
    for (const name of ["pointerup","pointercancel","lostpointercapture"]) canvas.addEventListener(name,pointerUp,options);
    canvas.addEventListener("wheel",wheel,{signal:listeners.signal,passive:false});
    const lupePickCenter=new T.Vector3();
    resetView();
    if(lupe)lupe.fly(0,visitor.root,camera,null,reducedMotion.matches,limitOrbit);
    function dispose() {
      lupe?.dispose();
      release(); listeners.abort(); visitor.dispose();
      marker.removeFromParent(); marker.geometry.dispose(); markerMaterial.dispose();
    }
    function getPosition() {
      if (ride) {
        visitor.root.getWorldPosition(ridePosition);
        return {x:ridePosition.x,y:ridePosition.y,z:ridePosition.z};
      }
      return {x:position.x, y:visitor.root.position.y + jumpHeight, z:position.z};
    }
    return {update,setActive,setStick,walkTo,jump,getPosition,resetView,facePoint,toggleOverview,isOverview,dispose,
      setGuideTarget(point){ guideTarget=point || null; },
      setLupeVisible(value){ showLupe=Boolean(value); if(lupe)lupe.root.visible=showLupe && !portal?.shot; },
      getLupePosition(target = new T.Vector3(), above = 0) {
        if (!lupe?.root.visible) return null;
        lupe.root.getWorldPosition(target);
        target.y += above * lupe.root.scale.y;
        return target;
      },
      beginRide,endRide,isRiding:()=>Boolean(ride),
      beginPortalTouch,endPortalTouch,isPortalTouching:()=>Boolean(portal),
      getCafeState:visitor.getCafeState, orderCafeItem:visitor.orderCafeItem,consumeCafeItem};
  }

  globalThis.HLBPlayer3D={create};
})();
