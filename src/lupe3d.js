(() => {
  "use strict";

  // The loupe is part of the tail silhouette, so Lupe can be recognized
  // even from behind while leading a visitor along the path.
  function create(T, scene) {
    const root = new T.Group();
    root.name = "루페";
    scene.add(root);
    const skin = new T.MeshStandardMaterial({vertexColors:true, roughness:.74, side:T.DoubleSide});
    const red=0xef4136, cream=0xffdcac, amber=0xffae42, ink=0x392c37, rim=0xb73637;
    const membrane=new T.MeshStandardMaterial({color:0xffad7d, emissive:0x572212, emissiveIntensity:.17,
      roughness:.62,side:T.DoubleSide,transparent:true,opacity:.8,depthWrite:false});
    const ball = new T.SphereGeometry(1,16,12).toNonIndexed();
    const transform = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3();
    function part(name) {
      const group = new T.Group();
      group.name = name;
      root.add(group);
      const positions=[], colors=[], tint=new T.Color();
      const normals=[], normalTransform=new T.Matrix3(), normal=new T.Vector3();
      function add(geometry,color,offset=[0,0,0],size=[1,1,1],rotation=[0,0,0]) {
        const data=geometry.index ? geometry.toNonIndexed() : geometry;
        transform.compose(new T.Vector3(...offset),q.setFromEuler(new T.Euler(...rotation)),new T.Vector3(...size));
        normalTransform.getNormalMatrix(transform);
        tint.setHex(color);
        for (let i=0; i<data.attributes.position.count; i++) {
          v.fromBufferAttribute(data.attributes.position,i).applyMatrix4(transform);
          normal.fromBufferAttribute(data.attributes.normal,i).applyNormalMatrix(normalTransform);
          positions.push(v.x,v.y,v.z); normals.push(normal.x,normal.y,normal.z); colors.push(tint.r,tint.g,tint.b);
        }
        if (data!==ball) data.dispose();
        if (geometry!==data) geometry.dispose();
      }
      function oval(color,offset,size,rotation) { add(ball,color,offset,size,rotation); }
      function limb(color,points,width,endWidth=width) {
        const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
        const segments=points.length*3, sides=8;
        const tube=new T.TubeGeometry(path,segments,width,sides,false);
        const pos=tube.attributes.position,centre=new T.Vector3();
        for(let ring=0;ring<=segments;ring++) {
          const t=ring/segments;
          path.getPointAt(t,centre);
          const radius=T.MathUtils.lerp(1,endWidth/width,t);
          for(let j=0;j<=sides;j++) {
            const i=ring*(sides+1)+j;
            v.fromBufferAttribute(pos,i).sub(centre).multiplyScalar(radius).add(centre);
            pos.setXYZ(i,v.x,v.y,v.z);
          }
        }
        add(tube,color);
      }
      function finish() {
        const mesh = new T.BufferGeometry();
        mesh.setAttribute("position",new T.Float32BufferAttribute(positions,3));
        mesh.setAttribute("normal",new T.Float32BufferAttribute(normals,3));
        mesh.setAttribute("color",new T.Float32BufferAttribute(colors,3));
        group.add(new T.Mesh(mesh,skin));
        return group;
      }
      return {group,add,oval,limb,finish};
    }
    const body = part("Lupe · tail loupe");
    body.oval(red,[0,0,0],[.19,.18,.36],[-.15,0,0]);
    body.oval(cream,[0,-.073,.04],[.173,.137,.30],[-.15,0,0]);
    body.oval(red,[0,.16,.28],[.263,.208,.208]);
    body.oval(cream,[0,.109,.40],[.224,.127,.139]);
    body.oval(red,[0,.159,.41],[.230,.092,.141]);
    for (const s of [-1,1]) {
      const size=s<0 ? 1.12 : .9;
      body.oval(amber,[s*.139,.228,.426],[.098*size,.093*size,.056]);
      body.oval(ink,[s*.132,.228,.473],[.050*size,.066*size,.022]);
      body.oval(0xfffaeb,[s*.132-.012,.25,.492],[.017,.02,.008]);
      body.oval(0x8e3f3e,[s*.068,.206,.522],[.011,.009,.014]);
      body.limb(rim,[[s*.066,.326,.399],[s*.133,.350,.395],[s*.208,.312,.387]],.018,.010);
    }
    body.limb(0x874245,[[-.126,.12,.518],[-.055,.106,.536],[.065,.113,.533],[.139,.14,.510]],.008,.005);
    body.add(new T.TorusGeometry(.121,.021,8,32),rim,[-.146,.246,.494],[1,1,1],[.06,-.09,0]);
    body.limb(0xffe2b6,[[-.237,.287,.509],[-.221,.317,.514],[-.198,.337,.511]],.008,.006);
    body.finish();
    // The middle of the tail sways, but its base and the loupe at the eye stay connected.
    const tailBase=new T.Vector3(0,-.032,-.26), tailTip=new T.Vector3(-.214,.342,.47);
    const tailAxis=tailTip.clone().sub(tailBase).normalize();
    const tailPart=part("Lupe · swimming tail");
    tailPart.limb(red,[tailBase.toArray(),[-.14,-.048,-.47],[-.365,.04,-.43],[-.48,.27,-.25],
      [-.443,.444,.025],[-.31,.464,.272],tailTip.toArray()],.088,.026);
    const tail=tailPart.finish();
    tail.children[0].position.copy(tailBase).multiplyScalar(-1);
    tail.position.copy(tailBase);
    const glass = new T.MeshStandardMaterial({color:0xc9f9ff, roughness:.13, transparent:true, opacity:.23, depthWrite:false});
    const lens = new T.Mesh(new T.SphereGeometry(1,24,12),glass);
    lens.position.set(-.146,.246,.503); lens.scale.set(.116,.116,.026); lens.rotation.y=-.09;
    root.add(lens);

    const wings=[];
    for (const s of [-1,1]) {
      const wing=part("Lupe · gliding membrane");
      const hand=[s*.53,.057,.223], foot=[s*.36,-.06,-.26];
      const outline=[[s*.12,.025,.172],hand,[s*.49,.004,.085],[s*.455,-.02,-.11],foot,[s*.12,-.045,-.22]];
      const centre=[s*.28,-.006,-.027], vertices=[];
      for(let i=0;i<outline.length;i++) vertices.push(...centre,...outline[i],...outline[(i+1)%outline.length]);
      const film=new T.BufferGeometry();
      film.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
      film.computeVertexNormals();
      wing.group.add(new T.Mesh(film,membrane));
      wing.limb(red,[outline[0],[s*.32,.015,.15],hand],.048,.026);
      wing.limb(red,[outline[5],[s*.21,-.09,-.17],foot],.048,.027);
      wing.limb(0xd97754,[hand,[s*.355,.005,.00],outline[5]],.009,.006);
      for(let i=0;i<3;i++) {
        wing.oval(red,[s*(.235+.052*i),.017,-.047+.022*i],[.014,.009,.014]);
      }
      for(const [x,y,z] of [hand,foot]) {
        for(let i=-1;i<=1;i++) {
          const tip=[x+s*(.037+.018*(1-Math.abs(i))),y+.011,z+i*.051];
          wing.limb(cream,[[x,y,z],[(x+tip[0])/2,y+.006,(z+tip[2])/2],tip],.015,.012);
          wing.oval(cream,tip,[.028,.017,.024]);
        }
      }
      wings.push(wing.finish());
    }
    ball.dispose();

    const perches=[
      {id:"left-shoulder",x:-.388,y:.79,z:.045}, {id:"right-shoulder",x:.388,y:.79,z:.045},
      {id:"head",x:0,y:1.69,z:.008}, {id:"deck-seat",x:.72,y:.16,z:.12}
    ];
    const goal=new T.Vector3(), start=new T.Vector3(), anchor=new T.Vector3();
    const velocity=new T.Vector3(), step=new T.Vector3();
    let phase=.53, heading=0, pitch=0, bank=0, initialized=false, perch=null, previousPerch=-1, landing=0;
    root.rotation.order="YXZ";
    function animate(dt,reduced,folded) {
      if(!reduced)phase+=dt;
      const stroke=phase*2.65+.4*Math.sin(phase*.73);
      const wingBeat=reduced || folded ? 0 : Math.sin(stroke)+.25*Math.sin(2*stroke-.7);
      for(let i=0;i<wings.length;i++) {
        const side=i===0 ? -1 : 1;
        const lift=folded ? -1.02 : .07+.21*wingBeat;
        wings[i].rotation.z=side*lift;
        wings[i].rotation.y=reduced || folded ? 0 : side*.08*Math.sin(stroke-.7);
      }
      tail.quaternion.setFromAxisAngle(tailAxis,reduced || folded ? 0 : .26*Math.sin(stroke-1.15));
    }
    function board(visitor) {
      // Draw from the other locations each time to vary successive trips too.
      let i=Math.floor(Math.random()*(previousPerch<0?perches.length:perches.length-1));
      if(previousPerch>=0 && i>=previousPerch)i++;
      previousPerch=i; perch=perches[i]; landing=0;
      visitor.attach(root);
      start.copy(root.position);
    }
    function ride(dt,reduced) {
      if(!perch)return;
      landing=Math.min(1,landing+dt/.65);
      const t=reduced ? 1 : T.MathUtils.smoothstep(landing,0,1);
      root.position.lerpVectors(start,goal.set(perch.x,perch.y,perch.z),t);
      root.scale.setScalar(T.MathUtils.lerp(.91,.46,t));
      root.rotation.set(-.05,Math.PI*.64,0);
      animate(dt,reduced,true);
    }
    function leave() {
      scene.attach(root); perch=null;
      heading=root.rotation.y;
      pitch=root.rotation.x; bank=root.rotation.z; velocity.set(0,0,0);
    }
    function fly(dt,visitor,camera,waypoint,reduced,limitOrbit) {
      animate(dt,reduced,false);
      const angle=phase*.62+.21*Math.sin(phase*.78);
      const x=visitor.position.x,z=visitor.position.z;
      const dx=waypoint ? waypoint.x-x : 0, dz=waypoint ? waypoint.z-z : 0;
      const along=Math.hypot(dx,dz);
      const bob=reduced ? 0 : .16*Math.sin(angle*1.55)+.045*Math.sin(phase*2.65-.5);
      anchor.set(x,visitor.position.y+1.59+bob,z);
      if(along>.45) {
        const lead=Math.min(1.28,along)/along;
        const sway=.25*Math.cos(angle)/along;
        goal.set(x+dx*lead-dz*sway,anchor.y,z+dz*lead+dx*sway);
      } else {
        const radius=1.35+.18*Math.sin(phase*.93);
        goal.set(x+radius*Math.cos(angle),anchor.y,z+(radius-.20)*Math.sin(angle));
      }
      // Clip the actual step after easing so the companion stays on the visitor's side of walls.
      const follow=initialized ? 1-Math.exp(-dt*5.8) : 1;
      goal.lerpVectors(root.position,goal,follow);
      limitOrbit(anchor,goal);
      if(initialized && dt>0) {
        step.subVectors(goal,root.position).multiplyScalar(1/dt);
        velocity.lerp(step,1-Math.exp(-dt*7));
      }
      const speed=Math.hypot(velocity.x,velocity.z);
      let face=heading;
      if(along>.45) face=Math.atan2(dx,dz);
      else if(speed>.10 && !reduced) face=Math.atan2(velocity.x,velocity.z);
      else if(!initialized || reduced) face=Math.atan2(camera.position.x-goal.x,camera.position.z-goal.z);
      const turn=Math.atan2(Math.sin(face-heading),Math.cos(face-heading));
      const steer=initialized ? 1-Math.exp(-dt*5) : 1;
      heading+=turn*steer;
      const desiredPitch=reduced ? -.06 : T.MathUtils.clamp(-velocity.y/(.9+speed),-.25,.22);
      const desiredBank=reduced ? 0 : T.MathUtils.clamp(-turn*.94,-.36,.36);
      pitch=T.MathUtils.lerp(pitch,desiredPitch,steer);
      bank=T.MathUtils.lerp(bank,desiredBank,steer);
      root.position.copy(goal);
      root.rotation.set(pitch,heading,bank);
      root.scale.setScalar(T.MathUtils.lerp(root.scale.x,.91,follow));
      initialized=true;
    }
    function dispose() {
      root.removeFromParent();
      root.traverse(node=>node.geometry?.dispose());
      skin.dispose(); glass.dispose(); membrane.dispose();
    }
    return {root,fly,board,ride,leave,dispose};
  }
  globalThis.HLBLupe3D={create};
})();
