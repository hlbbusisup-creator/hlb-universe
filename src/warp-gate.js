(() => {
  "use strict";

  // A rounded, double-ended crystal. Its elliptical cross section gives the
  // narrow side a different silhouette as the two pieces turn together.
  function crystalGeometry(T) {
    const profile=[
      [0,1.58],[.052,1.60],[.105,1.66],[.91,2.83],[1.01,2.98],
      [1.035,3.065],[1.015,3.15],[.945,3.26],[.112,4.52],[.053,4.59],[0,4.615]
    ];
    const geometry=new T.LatheGeometry(profile.map(([radius,y])=>new T.Vector2(radius,y)),36);
    geometry.scale(1,1,.55);
    return geometry;
  }

  function chevronGeometry(T) {
    const halfWidth=1.04,halfHeight=.45,halfDepth=.20,bevel=.095;
    const geometry=new T.BoxGeometry(2*halfWidth,2*halfHeight,2*halfDepth,32,12,8);
    const positions=geometry.attributes.position;
    const core=new T.Vector3(halfWidth-bevel,halfHeight-bevel,halfDepth-bevel);
    const min=core.clone().negate(),p=new T.Vector3(),inner=new T.Vector3();
    for (let i=0;i<positions.count;i++) {
      p.fromBufferAttribute(positions,i);
      inner.copy(p).clamp(min,core);
      p.sub(inner).normalize().multiplyScalar(bevel).add(inner);
      const wing=Math.abs(p.x)/halfWidth,layer=(p.y+halfHeight)/(2*halfHeight);
      // The top corners turn up and lean inward. The front ridge folds toward
      // the visitor; at the centre its flat touch surface is exactly z=.44.
      positions.setXYZ(i,p.x*(1-.06*layer),.73+p.y+wing*(.53+.16*layer),
        p.z+.24*(1-wing));
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  // Raspberry core, frosted white rim and broad softbox reflections. A single
  // pass per solid keeps the glass effect inexpensive on mobile.
  function frostedGlass(T) {
    return new T.ShaderMaterial({
      uniforms:{
        ruby:{value:new T.Color(0xd91e24)},magma:{value:new T.Color(0xfa4d40)},
        pearl:{value:new T.Color(0xffebe4)}
      },
      transparent:true,toneMapped:false,
      vertexShader:`varying vec3 normalView;
        varying vec3 eyeView;
        varying vec3 localPoint;
        void main(){
          localPoint=position;
          normalView=normalMatrix*normal;
          vec4 mv=modelViewMatrix*vec4(position,1.);
          eyeView=-mv.xyz;
          gl_Position=projectionMatrix*mv;
        }`,
      fragmentShader:`uniform vec3 ruby,magma,pearl;
        varying vec3 normalView;
        varying vec3 eyeView;
        varying vec3 localPoint;
        void main(){
          vec3 n=normalize(normalView),v=normalize(eyeView);
          float rim=pow(1.-clamp(dot(n,v),0.,1.),2.2);
          float key=dot(n,normalize(vec3(-.70,.64,.34)));
          float reflection=dot(reflect(-v,n),normalize(vec3(-.59,.64,.48)));
          float bloom=smoothstep(.08,.98,key)*.61+smoothstep(.38,.99,reflection)*.39;
          float cloud=.5+.5*sin(localPoint.y*1.8-localPoint.x*2.4+localPoint.z);
          vec3 core=mix(ruby,magma,.25+.45*cloud);
          vec3 color=mix(core,pearl,clamp(bloom+rim*.74,0.,.96));
          gl_FragColor=vec4(color,.95+.05*rim);
          #include <colorspace_fragment>
        }`
    });
  }

  function orbitBands(T,root) {
    const canvas=document.createElement("canvas");
    canvas.width=256;canvas.height=64;
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#a9252b";ctx.fillRect(0,0,256,64);
    ctx.fillStyle="#ff9f86";ctx.fillRect(0,1,256,3);ctx.fillRect(0,60,256,3);
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.font='bold 46px Arial, sans-serif';ctx.fillStyle="#fff7ec";ctx.fillText("HLB",128,34);
    const map=new T.CanvasTexture(canvas);
    map.colorSpace=T.SRGBColorSpace;map.wrapS=T.RepeatWrapping;map.repeat.x=11;
    const front=new T.MeshBasicMaterial({map,toneMapped:false});
    const inside=new T.MeshBasicMaterial({map,side:T.BackSide,toneMapped:false});
    const bands=[-1,1].map(side=>{
      const axis=new T.Group();
      axis.name="HLB crossed orbit "+side;
      axis.position.y=2.88;axis.rotation.set(side*.52,0,side*.57);
      root.add(axis);
      const band=new T.Group();
      const radius=side<0 ? 1.63 : 1.72;
      const wall=new T.CylinderGeometry(radius,radius,.19,80,1,true);
      const lining=wall.clone();
      // Text on the inner face must also read left to right.
      const uv=lining.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));
      band.add(new T.Mesh(wall,front),new T.Mesh(lining,inside));
      axis.add(band);
      return band;
    });
    return step=>{
      bands[0].rotation.y=(bands[0].rotation.y+step*.48)%(2*Math.PI);
      bands[1].rotation.y=(bands[1].rotation.y-step*.43)%(2*Math.PI);
    };
  }

  function build({T,site,place,collider,colliders,roofs}) {
    const x=-10,z=23,touchYaw=Math.PI/2,restYaw=Math.PI*.36;
    const root=new T.Group();
    root.name="HLB 포탈";
    root.userData.interactionId="warp";
    root.position.set(x,0,z);site.add(root);
    const sculpture=new T.Group();
    sculpture.name="Portal sculpture";sculpture.rotation.y=restYaw;root.add(sculpture);
    const updateBands=orbitBands(T,root);
    const glass=frostedGlass(T);
    const crystal=new T.Mesh(crystalGeometry(T),glass);
    crystal.name="Portal crystal";sculpture.add(crystal);
    const chevron=new T.Mesh(chevronGeometry(T),glass);
    chevron.name="Portal folded chevron";sculpture.add(chevron);

    place("round",0x63595a,x,-.025,z,2.35,.07,2.35,null,"stone");
    place("round",0xb4a49c,x,.012,z,2.23,.025,2.23,null,"stone");
    const inlay=new T.Mesh(new T.RingGeometry(1.36,1.375,64),
      new T.MeshBasicMaterial({color:0xf59789,toneMapped:false}));
    inlay.name="Portal floor inlay";inlay.position.y=.028;inlay.rotation.x=-Math.PI/2;root.add(inlay);
    const canvas=document.createElement("canvas");canvas.width=384;canvas.height=128;
    const ctx=canvas.getContext("2d");
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.font='bold 94px "Malgun Gothic", sans-serif';ctx.fillStyle="#513f40";
    ctx.fillText("포탈",192,65);
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
    const label=new T.Mesh(new T.PlaneGeometry(.82,.29),new T.MeshBasicMaterial({
      map,transparent:true,depthWrite:false,toneMapped:false
    }));
    label.name="포탈 바닥 표식";label.position.set(1.76,.03,.12);
    label.rotation.set(-Math.PI/2,0,Math.PI/2);root.add(label);

    colliders.push(collider(x,z,.72,.78,1.6));
    roofs.push(collider(x,z,2.10,2.10,4.62,1.64));
    const touchPoint={x:x+.44,y:.82,z};
    let touching=false,alignFrom=restYaw,alignTurn=0,alignmentTime=0;
    function setTouchPose(active) {
      if (touching===Boolean(active)) return;
      touching=Boolean(active);
      alignFrom=sculpture.rotation.y;
      alignTurn=Math.atan2(Math.sin(touchYaw-alignFrom),Math.cos(touchYaw-alignFrom));
      alignmentTime=0;
    }
    function update(dt=0,reducedMotion=false) {
      const step=Math.max(0,Math.min(Number(dt)||0,.1));
      if(!reducedMotion)updateBands(step);
      if (reducedMotion) {
        sculpture.rotation.y=touching?touchYaw:restYaw;
      } else if (touching) {
        alignmentTime=Math.min(.35,alignmentTime+step);
        const t=alignmentTime/.35;
        sculpture.rotation.y=alignFrom+alignTurn*t*t*(3-2*t);
      } else {
        sculpture.rotation.y=(sculpture.rotation.y+step*(2*Math.PI/11))%(2*Math.PI);
      }
    }
    return {id:"warp",title:"포탈",x,z,station:{x:-7.2,z:24.1},radius:2.8,
      lookAt:{x,z},pickBox:{minX:x-1.12,maxX:x+1.12,minY:.18,maxY:4.64,minZ:z-1.12,maxZ:z+1.12},
      console:{x:-7.25,y:0,z:22.55},touchPoint,touchStation:{x:x+.83,z:z+.20},touchYaw,
      setTouchPose,object:root,update};
  }
  globalThis.HLBWarpGate={build};
})();
