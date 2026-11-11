(() => {
  "use strict";

  // The twin hulls and flybridge follow the supplied BlackCAT photographs.
  // Local -Z is the bow, Y=0 is the bottom of the hull, and the passenger stands
  // on the open foredeck so their face remains visible while the boat flies.
  function create(scene, docks = []) {
    const T = globalThis.THREE;
    const craft = new T.Group();
    craft.name = "BlackCAT flying catamaran";
    const geometry = {
      box:new T.BoxGeometry(1,1,1),
      cylinder:new T.CylinderGeometry(1,1,1,10),
      fender:new T.CapsuleGeometry(.13,.35,4,10)
    };
    const materials = {
      white:new T.MeshStandardMaterial({color:0xf4f3e8,roughness:.46,metalness:.08}),
      navy:new T.MeshStandardMaterial({color:0x243a54,roughness:.52}),
      glass:new T.MeshStandardMaterial({color:0x223b4b,roughness:.17,metalness:.48}),
      silver:new T.MeshStandardMaterial({color:0xb8c9ca,roughness:.28,metalness:.78}),
      deck:new T.MeshStandardMaterial({color:0xcbb69a,roughness:.88}),
      shade:new T.MeshStandardMaterial({color:0xd7c7a8,roughness:.83,side:T.DoubleSide}),
      rope:new T.MeshStandardMaterial({color:0x7b8280,roughness:.97}),
      wood:new T.MeshStandardMaterial({color:0x896345,roughness:.95}),
      woodEdge:new T.MeshStandardMaterial({color:0x634831,roughness:.95}),
      green:new T.MeshStandardMaterial({color:0x4caf8d,emissive:0x33765b,emissiveIntensity:.8}),
      red:new T.MeshStandardMaterial({color:0xef4136,emissive:0xb42a20,emissiveIntensity:.8})
    };
    const buckets = new Map();
    const temporary = new T.Object3D();
    const up = new T.Vector3(0,1,0);
    function part(shape,material,x,y,z,sx,sy,sz,rotation) {
      const key = shape + ":" + material;
      if (!buckets.has(key)) buckets.set(key,{shape,material,matrices:[]});
      temporary.position.set(x,y,z);
      temporary.scale.set(sx,sy,sz);
      temporary.rotation.set(0,0,0);
      if (rotation?.isQuaternion) temporary.quaternion.copy(rotation);
      else if (rotation) temporary.rotation.set(...rotation);
      temporary.updateMatrix();
      buckets.get(key).matrices.push(temporary.matrix.clone());
    }
    function box(x,y,z,w,h,d,material,rotation) {
      part("box",material,x,y,z,w,h,d,rotation);
    }
    function tube(start,end,r,material="silver") {
      const a=new T.Vector3(...start), b=new T.Vector3(...end);
      const delta=b.sub(a), length=delta.length(), center=a.addScaledVector(delta,.5);
      part("cylinder",material,center.x,center.y,center.z,r,length,r,
        new T.Quaternion().setFromUnitVectors(up,delta.normalize()));
    }
    function mesh(name,shape,material,parent=craft) {
      const object=new T.Mesh(shape,material);
      object.name=name;
      object.castShadow=true;
      object.receiveShadow=true;
      parent.add(object);
      return object;
    }
    function surface(name,points,indices,material) {
      const shape=new T.BufferGeometry();
      shape.setAttribute("position",new T.Float32BufferAttribute(points.flat(),3));
      shape.setIndex(indices);
      shape.computeVertexNormals();
      return mesh(name,shape,material);
    }
    function panel(name,corners,material) {
      return surface(name,corners,[0,1,2,0,2,3],material);
    }
    function lettering(text,subtitle,color) {
      const canvas=document.createElement("canvas");
      canvas.width=1024;canvas.height=256;
      const pen=canvas.getContext("2d");
      pen.textAlign="center";pen.textBaseline="middle";
      pen.fillStyle=color;
      pen.font='800 155px "Arial", "Malgun Gothic", sans-serif';
      pen.fillText(text,512,subtitle ? 107 : 128,960);
      if (subtitle) {
        pen.font='500 34px "Arial", "Malgun Gothic", sans-serif';
        pen.fillText(subtitle,512,213,940);
      }
      const map=new T.CanvasTexture(canvas);
      map.colorSpace=T.SRGBColorSpace;
      map.anisotropy=4;
      return new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide});
    }

    const sections = [
      {z:2.56,w:.49,top:1.04,bottom:.09},
      {z:.8,w:.55,top:1.07,bottom:0},
      {z:-1.25,w:.51,top:1.10,bottom:.12},
      {z:-2.72,w:.045,top:1.15,bottom:.50}
    ];
    function hull(offset) {
      const points=[], indices=[];
      for (const {z,w,top,bottom} of sections) {
        for (const [x,y] of [[-w,top],[-w*.87,bottom+.16],[-w*.28,bottom],[w*.28,bottom],[w*.87,bottom+.16],[w,top]]) {
          points.push([offset+x,y,z]);
        }
      }
      for(let ring=0;ring<sections.length-1;ring++) for(let edge=0;edge<6;edge++) {
        const a=ring*6+edge,b=ring*6+(edge+1)%6,c=a+6,d=b+6;
        indices.push(a,d,b,a,c,d);
      }
      for (let i=1;i<5;i++) indices.push(0,i,i+1,18,18+i+1,18+i);
      const shape=surface("BlackCAT twin hull",points,indices,materials.white);
      shape.geometry.computeVertexNormals();
      const side=Math.sign(offset);
      for (let i=0;i<sections.length-1;i++) {
        const a=sections[i],b=sections[i+1];
        const corners=[
          [offset+side*(a.w+.004),a.top-.13,a.z],
          [offset+side*(b.w+.004),b.top-.13,b.z],
          [offset+side*(b.w-.009),b.top-.22,b.z],
          [offset+side*(a.w-.009),a.top-.22,a.z]
        ];
        if(side>0) corners.reverse();
        panel("BlackCAT navy hull stripe",corners,materials.navy);
      }
    }
    hull(-1.22);hull(1.22);
    box(0,1.02,.18,3.46,.15,4.67,"white");
    box(0,1.104,.02,3.28,.025,4.27,"deck");
    for (let i=-7;i<=7;i++) box(i*.205,1.121,-.01,.012,.008,4.22,"rope");

    // The open mesh bridge between both bows is characteristic of a catamaran.
    box(0,1.03,-2.35,2.35,.08,.67,"navy");
    for(let x=-1.1;x<=1.11;x+=.145) tube([x,1.082,-2.65],[x,1.082,-2.03],.011,"rope");
    for(let z=-2.63;z<=-2.02;z+=.13) tube([-1.12,1.086,z],[1.12,1.086,z],.011,"rope");
    tube([-1.27,1.15,-2.72],[1.27,1.15,-2.72],.045);

    // Sloped front and panoramic windows wrap the compact cabin.
    box(0,1.32,1.0,2.72,.37,2.65,"white");
    box(0,2.17,1.08,2.82,.13,2.58,"white");
    panel("Cabin windshield",[[-1.19,2.10,-.14],[1.19,2.10,-.14],[1.30,1.47,-.36],[-1.30,1.47,-.36]],materials.glass);
    for(const x of [-1.28,-.43,.43,1.28]) tube([x,1.45,-.38],[x*.925,2.12,-.16],.035,"white");
    tube([-1.32,1.47,-.37],[1.32,1.47,-.37],.034,"silver");
    for (const side of [-1,1]) {
      const corners=[[side*1.32,1.47,-.34],[side*1.32,1.47,2.25],[side*1.20,2.10,2.25],[side*1.20,2.10,-.14]];
      if (side>0) corners.reverse();
      panel("Dark panoramic cabin window",corners,materials.glass);
      for(const z of [.45,1.37,2.25]) tube([side*1.33,1.44,z],[side*1.20,2.12,z],.037,"white");
      box(side*1.48,1.22,1.10,.26,.10,2.76,"white");
      for(const z of [-1.93,-1.15,.1,1.35,2.44]) {
        tube([side*1.67,1.12,z],[side*1.67,1.65,z],.021);
      }
      tube([side*1.67,1.65,-1.93],[side*1.67,1.65,2.44],.026);
      tube([side*1.67,1.40,-1.93],[side*1.67,1.40,2.44],.014);
      tube([side*1.67,1.65,-1.93],[side*1.27,1.65,-2.72],.026);
      tube([side*1.27,1.15,-2.72],[side*1.27,1.65,-2.72],.022);
      for (const z of [-.45,.88,2.02]) {
        tube([side*1.68,1.62,z],[side*1.80,.73,z],.012,"rope");
        part("fender","navy",side*1.81,.58,z,1,1,1,[0,0,-side*.15]);
      }
      part("cylinder",side<0?"red":"green",side*1.67,1.68,-1.93,.055,.065,.055);
    }
    panel("Cabin aft window",[[1.20,2.09,2.27],[-1.20,2.09,2.27],[-1.30,1.48,2.27],[1.30,1.48,2.27]],materials.glass);
    box(0,1.14,2.47,2.16,.12,.4,"deck");
    tube([-1.67,1.64,2.44],[-.45,1.64,2.44],.026);
    tube([1.67,1.64,2.44],[.45,1.64,2.44],.026);

    // Raised helm, seating and a light fabric canopy above the cabin roof.
    box(0,2.26,1.04,2.32,.12,1.87,"white");
    box(0,2.46,.43,.72,.38,.36,"white",[-.12,0,0]);
    box(0,2.68,.39,.63,.035,.29,"navy",[-.12,0,0]);
    const wheel=mesh("Flybridge steering wheel",new T.TorusGeometry(.16,.022,6,20),materials.silver);
    wheel.position.set(0,2.60,.65);wheel.rotation.x=.28;
    box(0,2.43,1.61,1.30,.17,.47,"navy");
    box(0,2.64,1.82,1.30,.39,.14,"white");
    for(const side of [-1,1]) {
      for(const z of [.19,1.91]) tube([side*.96,2.24,z],[side*.84,3.25,z+.05],.027);
      tube([side*1.13,2.27,.08],[side*1.13,2.72,.08],.023);
      tube([side*1.13,2.72,.08],[side*1.13,2.72,1.96],.024);
    }
    box(0,3.28,1.10,2.15,.08,2.19,"shade");
    tube([-.99,3.25,.06],[.99,3.25,.06],.029);
    tube([-.99,3.25,2.15],[.99,3.25,2.15],.029);
    const wordmark=lettering("BlackCAT","YOUR DREAM WE MAKE","#203449");
    for(const side of [-1,1]) {
      const mark=mesh("BlackCAT hull wordmark",new T.PlaneGeometry(1.56,.39),wordmark);
      mark.position.set(side*1.765,.64,.68);mark.rotation.y=side*Math.PI/2;
      mark.castShadow=false;
    }

    for (const {shape,material,matrices} of buckets.values()) {
      const batch=new T.InstancedMesh(geometry[shape],materials[material],matrices.length);
      batch.name="BlackCAT " + material + " fittings";
      matrices.forEach((matrix,i)=>batch.setMatrixAt(i,matrix));
      batch.castShadow=true;batch.receiveShadow=true;
      craft.add(batch);
    }
    const dockGroups=[];
    const signFace=lettering("블랙캣","","#fff2d4");
    for (const dock of docks) {
      const group=new T.Group();
      group.name="BlackCAT " + dock.id + " dock";
      group.userData.yachtDock=dock.id;
      group.position.y=dock.y ?? 0;
      scene.add(group);
      const sign=dock.sign || {x:dock.x+2.8,z:dock.z};
      const stand=new T.Group();
      stand.position.set(sign.x,0,sign.z);
      stand.rotation.y=dock.signYaw ?? 0;
      group.add(stand);
      for(const side of [-1,1]) {
        const post=mesh("Wooden sign post",geometry.box,materials.woodEdge,stand);
        post.position.set(side*.52,.60,0);post.scale.set(.095,1.20,.10);
      }
      for(const y of [1.03,1.26]) {
        const plank=mesh("BlackCAT wooden sign board",geometry.box,materials.wood,stand);
        plank.position.set(0,y,.025);plank.scale.set(1.52,.219,.12);
        for(let n=0;n<3;n++) {
          const grain=mesh("Wood grain",geometry.box,materials.woodEdge,stand);
          grain.position.set(-.10+n*.07,y-.08+n*.06,.087);
          grain.scale.set(1.26-n*.13,.006,.004);
        }
      }
      for (const side of [-1,1]) {
        const letters=mesh("블랙캣 나무 간판",new T.PlaneGeometry(1.27,.32),signFace,stand);
        letters.position.set(0,1.14,side>0 ? .09 : -.041);
        letters.rotation.y=side>0 ? 0 : Math.PI;
        letters.castShadow=false;
      }
      const station=dock.station || {x:dock.x+2.8,z:dock.z+1.5};
      for(let n=0;n<5;n++) {
        const plank=mesh("Boarding step",geometry.box,materials.wood,group);
        plank.position.set(station.x,.045,station.z+(n-2)*.23);
        plank.scale.set(1.65,.075,.215);
      }
      group.updateWorldMatrix(true,true);
      const inverse=new T.Matrix4().copy(group.matrixWorld).invert();
      for (const material of [materials.wood,materials.woodEdge]) {
        const pieces=[];
        group.traverse(object=>{
          if (object.isMesh && object.geometry===geometry.box && object.material===material) pieces.push(object);
        });
        const batch=new T.InstancedMesh(geometry.box,material,pieces.length);
        batch.name="BlackCAT dock woodwork";
        batch.castShadow=true;batch.receiveShadow=true;
        pieces.forEach((object,index)=>{
          batch.setMatrixAt(index,new T.Matrix4().multiplyMatrices(inverse,object.matrixWorld));
          object.removeFromParent();
        });
        group.add(batch);
      }
      dockGroups.push(group);
    }
    scene.add(craft);
    const first=docks[0];
    if (first) {craft.position.set(first.x,(first.y ?? 0)+.08,first.z);craft.rotation.y=first.yaw || 0;}
    return {
      craft, dockGroups,
      passenger:{x:0,y:1.14,z:-1.70},
      deckHeight:1.14,
      hullBounds:{minX:-2,maxX:2,minY:0,maxY:3.32,minZ:-2.78,maxZ:2.70}
    };
  }
  globalThis.HLBBlackcat={create};
})();
