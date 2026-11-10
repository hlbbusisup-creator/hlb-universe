(() => {
  "use strict";

  // Static supports join the world's existing instance batches. The ring adds
  // nine draw calls, including its two-sided signs and a single soft energy disc.
  function build({T,site,box,place,collider,colliders,roofs}) {
    const x=-10,z=23,centerY=2.25,red=0xef4136;
    const root=new T.Group();
    root.name="HLB Magma warp gate";
    root.userData.interactionId="warp";
    root.position.set(x,0,z);site.add(root);
    // Face both the central entrance (+X) and the approach path (+Z). Keep the
    // console independent so its already navigable standing point stays fixed.
    const yaw=Math.PI/4,cos=Math.cos(yaw),sin=Math.sin(yaw);
    const assembly=new T.Group();assembly.name="Warp ring assembly";
    assembly.rotation.y=yaw;root.add(assembly);
    const turn=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw);
    function ringBox(xx,yy,zz,w,h,d,color,rotation,finish) {
      const dx=xx-x,dz=zz-z;
      const orientation=turn.clone();
      if(rotation)orientation.multiply(new T.Quaternion().setFromEuler(new T.Euler(...rotation)));
      box(x+dx*cos+dz*sin,yy,z-dx*sin+dz*cos,w,h,d,color,orientation,finish);
    }
    function ringCollider(localX,localZ,w,d,height,base=0) {
      const cx=x+localX*cos+localZ*sin,cz=z-localX*sin+localZ*cos;
      return {...collider(cx,cz,w*cos+d*sin,w*sin+d*cos,height,base),
        obb:{x:cx,z:cz,halfX:w/2,halfZ:d/2,cos,sin}};
    }
    const casing=new T.MeshStandardMaterial({color:0x30363f,roughness:.43,metalness:.58});
    const porcelain=new T.MeshStandardMaterial({color:0xf0e9df,roughness:.36,metalness:.2});
    const glow=new T.MeshBasicMaterial({color:red,toneMapped:false});
    const warm=new T.MeshBasicMaterial({color:0xffe4d2,toneMapped:false});
    function ring(name,radius,tube,material,depth=0) {
      const mesh=new T.Mesh(new T.TorusGeometry(radius,tube,8,64),material);
      mesh.name=name;mesh.position.set(0,centerY,depth);
      mesh.castShadow=material.isMeshStandardMaterial;
      assembly.add(mesh);return mesh;
    }
    ring("Warp ring · graphite housing",1.9,.19,casing);
    ring("Warp ring · porcelain shell",1.91,.105,porcelain,.14);
    ring("Warp ring · Magma Red light",1.72,.048,glow,.17);
    ring("Warp ring · rear guide light",1.72,.035,warm,-.17);

    // A low, flush landing pad and unobstructed path let the visitor approach
    // the console without climbing a step or walking through the ring supports.
    place("round",0x333941,x,-.015,z,2.48,.05,2.48,null,"steel");
    place("round",0xb3aaa0,x,.018,z,2.30,.016,2.30,null,"stone");
    const rim=new T.Mesh(new T.RingGeometry(2.32,2.36,64),glow);
    rim.name="Warp landing pad light";rim.rotation.x=-Math.PI/2;rim.position.y=.03;
    root.add(rim);
    for(const side of [-1,1]) {
      ringBox(x+side*1.66,.17,z,.68,.34,1.05,0x30363f);
      ringBox(x+side*1.66,.67,z,.32,1.05,.55,0xe9e3da);
      ringBox(x+side*1.66,.65,z+.295,.065,.84,.035,red,null,"light");
      colliders.push(ringCollider(side*1.66,0,.72,1.08,3.55));
    }
    for(let i=0;i<8;i++) {
      const angle=i*Math.PI/4;
      const xx=x+Math.sin(angle)*1.94,yy=centerY+Math.cos(angle)*1.94;
      ringBox(xx,yy,z-.04,.21,.37,.44,0x30363f,[0,0,-angle]);
      ringBox(xx,yy,z+.235,.085,.20,.025,red,[0,0,-angle],"light");
    }
    roofs.push(ringCollider(0,0,4.28,.86,4.87,3.6));

    const orbit=new T.Group();orbit.name="Warp orbit lights";orbit.position.y=centerY;assembly.add(orbit);
    const arc=new T.TorusGeometry(1.98,.025,5,18,Math.PI*.27);
    const accents=new T.InstancedMesh(arc,warm,3),matrix=new T.Matrix4();
    for(let i=0;i<3;i++) {
      matrix.makeRotationZ(i*Math.PI*2/3);
      matrix.setPosition(0,0,.27);accents.setMatrixAt(i,matrix);
    }
    accents.name="Warp orbit · three light arcs";orbit.add(accents);

    const energy=new T.ShaderMaterial({
      uniforms:{time:{value:0},tint:{value:new T.Color(red)}},
      transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,toneMapped:false,
      vertexShader:`varying vec2 point;
        void main(){point=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform float time;uniform vec3 tint;varying vec2 point;
        void main(){
          float radius=length(point-.5)*2.;
          float edge=smoothstep(.42,.96,radius);
          float wave=smoothstep(.70,1.,sin(radius*34.-time*1.6));
          float alpha=(.065+.17*edge+.035*wave)*(1.-smoothstep(.97,1.,radius));
          gl_FragColor=vec4(mix(tint,vec3(1.,.77,.62),edge*.22),alpha);
          #include <colorspace_fragment>
        }`
    });
    const field=new T.Mesh(new T.CircleGeometry(1.66,64),energy);
    field.name="Warp energy field";field.position.set(0,centerY,0);assembly.add(field);

    function lettering(main,caption,width,height) {
      const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=256;
      const ctx=canvas.getContext("2d");
      ctx.fillStyle="#252b33";ctx.fillRect(0,0,1024,256);
      ctx.fillStyle="#EF4136";ctx.fillRect(22,26,8,204);ctx.fillRect(994,26,8,204);
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillStyle="#fff3e8";ctx.font='800 106px "Arial", "Malgun Gothic", sans-serif';
      ctx.fillText(main,512,106,930);
      ctx.fillStyle="#ff9b82";ctx.font='600 38px "Arial", "Malgun Gothic", sans-serif';
      ctx.fillText(caption,512,207,920);
      const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
      return {geometry:new T.PlaneGeometry(width,height),material:new T.MeshBasicMaterial({map,toneMapped:false})};
    }
    ringBox(x,4.55,z,2.56,.58,.26,0x30363f);
    for(const side of [-1,1])ringBox(x+side*.78,4.18,z,.085,.50,.13,0x30363f);
    const sign=lettering("WARP / 워프","HLB UNIVERSE",2.47,.55);
    const signs=new T.InstancedMesh(sign.geometry,sign.material,2);
    matrix.makeTranslation(0,4.55,.145);signs.setMatrixAt(0,matrix);
    matrix.makeRotationY(Math.PI);matrix.setPosition(0,4.55,-.145);signs.setMatrixAt(1,matrix);
    signs.name="Warp sign · illuminated front and back";assembly.add(signs);

    const consoleX=x+2.75,consoleZ=z-.45;
    box(consoleX,.07,consoleZ,.77,.14,.73,0x30363f);
    box(consoleX,.56,consoleZ,.28,.99,.33,0xded8cf);
    box(consoleX,1.11,consoleZ+.04,.93,.58,.13,0x30363f,[-.42,0,0]);
    box(consoleX,1.08,consoleZ+.14,.99,.045,.07,red,[-.42,0,0],"light");
    const screen=lettering("WARP","목적지 선택",.84,.44);
    const display=new T.Mesh(screen.geometry,screen.material);
    display.name="Warp destination console";
    display.position.set(consoleX-x,1.12,consoleZ-z+.115);display.rotation.x=-.42;root.add(display);
    colliders.push(collider(consoleX,consoleZ,.98,.85,1.48));

    let time=0;
    function update(dt=0,reducedMotion=false) {
      const step=Math.max(0,Math.min(Number(dt)||0,.1));
      if(reducedMotion) {orbit.rotation.z=0;energy.uniforms.time.value=0;return;}
      time=(time+step)%3600;
      orbit.rotation.z=-time*.13;
      energy.uniforms.time.value=time;
    }
    return {id:"warp",title:"워프",x,z,station:{x:-7.2,z:24.1},radius:2.8,
      lookAt:{x:-10,z:23},pickBox:{minX:-12.25,maxX:-6.65,minY:0,maxY:4.88,minZ:21.3,maxZ:24.7},
      console:{x:consoleX,y:1.12,z:consoleZ+.115},object:root,update};
  }
  globalThis.HLBWarpGate={build};
})();
