(() => {
  "use strict";

  // The west entrance opens onto the arrival plaza. Local Z runs from
  // the north exhibition wall towards the south windows.
  const centerX = 15.05;
  const northZ = 4.35;
  const halfWidth = 6.6;
  const depth = 12.7;
  const height = 4.65;
  const scents = [
    { label:"티 우디", color:"#d6e0d2", names:["T1  Thé Clair","T2  Thé Doré","T3  Bois Calme"] },
    { label:"아이리스 머스크", color:"#ded9e8", names:["I1  Iris Voilé","I2  Nuage Blanc","I3  Musc Tendre"] },
    { label:"플로럴 스웨이드", color:"#eddbda", names:["F1  Pétale Rosé","F2  Fleur Solaire","F3  Daim Fleuri"] }
  ];

  function build({T, site, box, place, collider, colliders, roofs}) {
    const gallery = new T.Group();
    gallery.position.set(centerX,0,northZ);
    gallery.name = "AI de cologne · 에데꼬론 상품관";
    site.add(gallery);
    const ivory = 0xf3eada;
    const plaster = 0xe9d9c2;
    const brass = 0xb69b72;
    const espresso = 0x392e2b;
    const limestone = 0xd8c3a7;
    const printed = [];
    const worldPoint = (x,z) => ({x:centerX+x,z:northZ+z});
    function piece(x,y,z,w,h,d,color,finish,rotation) {
      box(centerX+x,y,northZ+z,w,h,d,color,rotation,finish);
    }
    function solid(x,z,w,d,h,minY=0) {
      colliders.push(collider(centerX+x,northZ+z,w,d,h,minY));
    }
    function drum(x,y,z,r,h,tint,finish) {
      place("round",tint,centerX+x,y,northZ+z,r,h,r,null,finish);
    }
    function addMesh(geometry,material,x,y,z,name) {
      const mesh = new T.Mesh(geometry,material);
      mesh.name = name;
      mesh.position.set(x,y,z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      gallery.add(mesh);
      return mesh;
    }
    const plain = (color,roughness=.78,metalness=.03) =>
      new T.MeshStandardMaterial({color,roughness,metalness});

    // Text is part of each physical sign. The font is sized for the
    // sign's proportions, so none of the product names are truncated.
    function print(x,y,z,w,h,background,lines,yaw=0) {
      const canvas=document.createElement("canvas");
      const aspect=w/h;
      canvas.width=aspect>=1 ? 1024 : Math.round(1024*aspect);
      canvas.height=aspect>=1 ? Math.round(1024/aspect) : 1024;
      const ctx=canvas.getContext("2d");
      if (background) {
        ctx.fillStyle=background;
        ctx.fillRect(0,0,canvas.width,canvas.height);
      }
      ctx.textBaseline="middle"; ctx.textAlign="center";
      for (const line of lines) {
        ctx.font=(line.style || "600")+" "+Math.round(canvas.height*line.size)+"px "+
          (line.font || '"Malgun Gothic",sans-serif');
        ctx.fillStyle=line.color || "#362823";
        ctx.fillText(line.text,canvas.width*.5,canvas.height*line.y,canvas.width*.94);
      }
      const map=new T.CanvasTexture(canvas);
      map.colorSpace=T.SRGBColorSpace; map.anisotropy=4;
      const material=new T.MeshBasicMaterial({map,transparent:!background,toneMapped:false,depthWrite:Boolean(background)});
      const sign=addMesh(new T.PlaneGeometry(w,h),material,x,y,z,lines[0].text);
      sign.rotation.y=yaw;
      sign.castShadow=false;
      return sign;
    }
    function photograph(x,y,z,w,h,file,title,yaw=0) {
      const mat=new T.MeshBasicMaterial({color:0xc4b194,toneMapped:false});
      const frame=addMesh(new T.PlaneGeometry(w,h),mat,x,y,z,title);
      frame.rotation.y=yaw;
      frame.castShadow=false;
      printed.push({file,mat});
    }

    // Three-dimensional plaster reveals around the product bays, with a
    // semicircular top and a narrow contrasting inlay on its inside edge.
    function arch(x,base,z,r,leg,thickness,material) {
      const inner=r-thickness, outline=new T.Shape();
      outline.moveTo(-r,0); outline.lineTo(-r,leg);
      outline.absarc(0,leg,r,Math.PI,0,true);
      outline.lineTo(r,0); outline.lineTo(inner,0); outline.lineTo(inner,leg);
      outline.absarc(0,leg,inner,0,Math.PI,false);
      outline.lineTo(-inner,0); outline.closePath();
      return addMesh(new T.ExtrudeGeometry(outline,{depth:.10,bevelEnabled:false,curveSegments:24}),
        material,x,base,z,"Arched display reveal");
    }

    // Travertine floor with thin inlays, solid perimeter and a clear route
    // across the west threshold. The southern glazing admits the caldera light.
    piece(0,.026,depth/2,halfWidth*2+.34,.12,depth+.34,limestone,"stone");
    piece(0,.083,depth/2,halfWidth*2-.05,.035,depth-.1,ivory,"stone");
    for(let x=-5.4;x<6;x+=1.8) piece(x,.103,depth/2,.014,.006,depth-.12,0xd2c2ab);
    for(let z=1.8;z<depth;z+=1.8) piece(0,.104,z,13.05,.006,.014,0xd2c2ab);
    piece(0,height/2,0,13.35,height,.27,plaster,"stone");
    solid(0,0,13.35,.27,height);
    piece(halfWidth,height/2,depth/2,.25,height,depth,ivory,"stone");
    solid(halfWidth,depth/2,.25,depth,height);
    const doorStart=7.25,doorEnd=11.7;
    for(const [from,to] of [[0,doorStart],[doorEnd,depth]]) {
      piece(-halfWidth,height/2,(from+to)/2,.24,height,to-from,ivory,"stone");
      solid(-halfWidth,(from+to)/2,.24,to-from,height);
    }
    piece(-halfWidth,height-.60,(doorStart+doorEnd)/2,.32,1.2,doorEnd-doorStart,ivory,"stone");
    roofs.push(collider(centerX-halfWidth,northZ+(doorStart+doorEnd)/2,.35,doorEnd-doorStart,height,height-1.2));
    for(const z of [doorStart+.10,doorEnd-.10]){
      piece(-halfWidth,1.72,z,.31,3.44,.12,brass);
      piece(-halfWidth-.18,1.78,z,.025,3.24,.035,0xffe3aa,"light");
    }
    piece(0,.40,depth,13.28,.8,.21,plaster,"stone");
    solid(0,depth,13.28,.23,height);
    piece(0,4.13,depth,13.28,1.04,.24,ivory,"stone");
    const glazing=new T.MeshPhysicalMaterial({color:0xe0d4cc,transparent:true,opacity:.16,
      roughness:.18,side:T.DoubleSide,depthWrite:false});
    const windows=addMesh(new T.PlaneGeometry(12.9,2.88),glazing,0,2.18,depth,"Panoramic glazing");
    windows.castShadow=false;
    for(const x of [-6.45,-4.30,-2.15,0,2.15,4.30,6.45]) piece(x,2.18,depth,.065,3.13,.20,brass);
    // Skylights flank a central acoustic soffit. The light coves stay visible
    // from within the room while the outer fascia hides the roof assembly.
    for(const x of [-5.5,0,5.5]) piece(x,height+.10,depth/2,x===0?4.5:2.35,.20,depth+.36,ivory);
    for(const z of [0,depth]) piece(0,height+.12,z,13.72,.39,.39,ivory);
    for(const x of [-halfWidth,halfWidth]) piece(x,height+.12,depth/2,.39,.39,depth+.35,ivory);
    for(const x of [-4.33,-2.33,2.33,4.33]){
      piece(x,height-.048,depth/2,.10,.18,depth,brass);
      piece(x,height-.145,depth/2,.075,.018,depth-.58,0xffdfaa,"light");
    }
    roofs.push(collider(centerX,northZ+depth/2,13.6,depth+.32,height+.32,height-.22));
    // West-facing shop sign and a smaller southern sign are readable on
    // approach from either side of the plaza.
    const wordmark=[{text:"AI de cologne",size:.58,y:.38,font:"Georgia,serif",style:"italic",color:"#fbe8c1"},
      {text:"에데꼬론 상품관",size:.19,y:.83,color:"#f8e7ce"}];
    print(-halfWidth-.182,4.02,(doorStart+doorEnd)/2,4.82,.98,"#352a28",wordmark,-Math.PI/2);
    print(-2.56,4.09,depth+.132,5.00,.90,"#352a28",wordmark);
    // Narrow grooves break up the stone frontage and frame the shop entry.
    for(let z=.35;z<doorStart-.2;z+=.29) piece(-halfWidth-.135,1.89,z,.09,3.65,.035,0xcdbca4);

    const archStone=plain(0xf2e5ce);
    const archMetal=plain(brass,.34,.44);
    for(const x of [-3.45,3.45]){
      arch(x,.14,.19,2.48,1.10,.17,archStone);
      arch(x,.15,.301,2.31,1.10,.025,archMetal);
    }
    piece(0,height-.47,.16,12.92,.88,.095,espresso);
    print(0,height-.47,.22,9.6,.81,"#392e2b",[
      {text:"AI de cologne",size:.65,y:.47,font:"Georgia,serif",style:"italic",color:"#ead5a7"}
    ]);
    // Left-hand bay. The printed handbag photo is from the supplied brochure.
    piece(-3.47,2.02,.285,2.47,2.47,.17,brass);
    photograph(-3.47,2.02,.377,2.37,2.37,"diffuser-hero.jpg","Brochure · personal diffuser");
    const deviceX=-3.40,deviceZ=2.02;
    drum(deviceX,.15,deviceZ,1.13,.10,espresso);
    drum(deviceX,.51,deviceZ,1.03,.67,limestone,"stone");
    drum(deviceX,.85,deviceZ,1.06,.06,brass);
    drum(deviceX,.90,deviceZ,1.03,.045,ivory);
    solid(deviceX,deviceZ,2.08,2.08,.944);
    createDiffuser(T,gallery,deviceX,1.60,deviceZ);
    piece(deviceX,.52,deviceZ+.99,1.53,.27,.07,espresso);
    print(deviceX,.52,deviceZ+1.033,1.49,.255,"#392e2b",[
      {text:"퍼스널 디퓨저",size:.44,y:.50,color:"#fae8c9"}
    ]);

    // The family colours match the supplied fragrance guide. Cartridge shells
    // are shown in the brochure's violet; the nine printed entries identify scents.
    const cabinetX=3.45;
    piece(cabinetX,.46,1.12,5.55,.76,1.40,espresso);
    piece(cabinetX,.865,1.12,5.65,.09,1.46,brass);
    piece(cabinetX,.94,1.12,5.63,.08,1.43,ivory);
    solid(cabinetX,1.12,5.61,1.47,.99);
    for(const [index,scent] of scents.entries()){
      const x=cabinetX+(index-1)*1.65;
      const mountY=1.75;
      piece(x,mountY,.70,1.52,1.56,.14,brass);
      const lines=[{text:scent.label,size:.105,y:.19,color:"#332622"}];
      scent.names.forEach((name,i)=>lines.push({text:name,size:.087,y:.46+.185*i,
        font:"Georgia,serif",style:"normal",color:"#352b2b"}));
      print(x,mountY,.778,1.46,1.49,scent.color,lines);
      drum(x,1.025,1.43,.42,.105,limestone,"stone");
      createCartridge(T,gallery,x,1.30,1.43);
    }
    print(cabinetX,.54,1.831,2.77,.36,"#392e2b",[
      {text:"향 카트리지 컬렉션",size:.47,y:.5,color:"#fae8c9"}]);
    // Direction labels are part of the wall so they stay legible as the camera orbits.
    print(-5.35,2.48,1.02,1.40,.88,"#f1e7d6",[
      {text:"The Device",size:.29,y:.34,font:"Georgia,serif",style:"italic"},
      {text:"퍼스널 디퓨저",size:.18,y:.72}]);
    print(3.45,3.07,.33,2.65,.43,"#e8d9c1",[
      {text:"Fragrance Collection",size:.49,y:.51,font:"Georgia,serif",style:"italic"}]);

    // Local fill lights give the product display its own warmer studio lighting.
    for(const x of [deviceX,cabinetX]){
      const lamp=new T.PointLight(0xffe3bc,13,7.5,2);
      lamp.position.set(x,3.45,2.60); gallery.add(lamp);
    }
    if (typeof document.createElementNS === "function") {
      const loader = new T.TextureLoader();
      for (const {file,mat} of printed) loader.load("assets/reading/cologne/"+file,texture=>{
        texture.colorSpace=T.SRGBColorSpace;
        texture.anisotropy=4;
        mat.map=texture; mat.color.set(0xffffff); mat.needsUpdate=true;
      });
    }
    const reception=worldPoint(0,9.28);
    const entry=worldPoint(-halfWidth-.12,9.47);
    return {
      id:"cologne", ...entry, station:reception, lookAt:worldPoint(0,.48),
      label:{...entry,y:4.1},
      interior:{minX:centerX-halfWidth,maxX:centerX+halfWidth,minZ:northZ,maxZ:northZ+depth,ceilingY:height-.17},
      exhibits:[
        {
          id:"cologne-diffuser",title:"퍼스널 디퓨저",
          station:worldPoint(deviceX,4.45),lookAt:worldPoint(deviceX,deviceZ),
          hitBox:{minX:centerX-6.10,maxX:centerX-1.05,minY:.10,maxY:3.66,minZ:northZ+.14,maxZ:northZ+3.17}
        },
        {
          id:"cologne-cartridges",title:"향 카트리지",
          station:worldPoint(cabinetX,4.48),lookAt:worldPoint(cabinetX,1.13),
          hitBox:{minX:centerX+.58,maxX:centerX+6.34,minY:.10,maxY:3.66,minZ:northZ+.14,maxZ:northZ+1.90}
        }
      ]
    };
  }

  function createCartridge(T,parent,x,y,z) {
    const shell=new T.Group();
    shell.name="Brochure cartridge shell";
    shell.position.set(x,y,z);
    shell.rotation.set(.20,.15,-.30);
    parent.add(shell);
    const material = new T.MeshStandardMaterial({color:0x7452ae,roughness:.42});
    const surface=new T.LatheGeometry([
      [.16,-.19],[.209,-.18],[.22,-.145],[.22,.148],[.214,.178],[.19,.19],[0,.19]
    ].map(([r,h])=>new T.Vector2(r,h)),36);
    const body=new T.Mesh(surface,material);
    body.castShadow=true;
    shell.add(body);
    const ridge=new T.TorusGeometry(.218,.0035,5,32);
    for(const level of [-.12,-.08,-.04,0,.04,.08,.12]){
      const edge=new T.Mesh(ridge,material);
      edge.rotation.x=Math.PI/2; edge.position.y=level;
      shell.add(edge);
    }
  }

  function createDiffuser(T,parent,x,y,z) {
    const model=new T.Group();
    model.name="AI de cologne · rose-gold tripod diffuser";
    model.position.set(x,y,z);
    model.rotation.y=-.13;
    parent.add(model);
    // A small studio reflection map gives polished metal its soft vertical
    // reflections even when the showroom is viewed without an HDR panorama.
    const width=64,height=32, pixels=new Uint8Array(width*height*4);
    for(let row=0;row<height;row++) for(let col=0;col<width;col++){
      const u=col/width, v=row/height;
      const softbox=Math.max(0,1-Math.abs(u-.24)*9,1-Math.abs(u-.67)*18,1-Math.abs(u-.90)*13);
      const shade=Math.max(.12,.18+.45*(1-v)+softbox*.7);
      const i=(row*width+col)*4;
      pixels.set([Math.min(255,255*shade),Math.min(255,238*shade),Math.min(255,218*shade),255],i);
    }
    const reflection=new T.DataTexture(pixels,width,height);
    reflection.mapping=T.EquirectangularReflectionMapping;
    reflection.colorSpace=T.SRGBColorSpace; reflection.needsUpdate=true;
    const metal=new T.MeshStandardMaterial({color:0xd89576,metalness:.85,roughness:.18,envMap:reflection,envMapIntensity:1.55});
    const trim=new T.MeshStandardMaterial({color:0xa26955,metalness:.53,roughness:.25});
    function at(geometry,material,place,onto=model) {
      const m=new T.Mesh(geometry,material);
      m.position.set(...place);
      m.castShadow=true; m.receiveShadow=true;
      onto.add(m);
      return m;
    }
    const core=at(new T.SphereGeometry(.333,40,24),metal,[0,0,0]);
    core.scale.set(1,1,.92);
    const armProfile=[[.322,.02],[.316,.14],[.273,.25],[.226,.35],[.228,.45],[.25,.47]];
    const arm=new T.LatheGeometry(armProfile.map(([r,h])=>new T.Vector2(r,h)),40);
    const capsuleProfile=[[.252,.0],[.266,.017],[.274,.062],[.274,.276],[.267,.308],[.244,.325],[.04,.329],[0,.329]];
    const cap=new T.LatheGeometry(capsuleProfile.map(([r,h])=>new T.Vector2(r,h)),40);
    const ring=new T.TorusGeometry(.252,.018,8,40);
    const directions=[[.05,1,-.17],[-.91,-.42,.17],[.76,-.58,.26]];
    const colors=[0x71469d,0xe7772f,0x39a8a7];
    const up=new T.Vector3(0,1,0);
    directions.forEach((vector,i)=>{
      const limb=new T.Group();
      limb.quaternion.setFromUnitVectors(up,new T.Vector3(...vector).normalize());
      model.add(limb);
      at(arm,metal,[0,0,0],limb);
      at(ring,trim,[0,.447,0],limb).rotation.x=Math.PI/2;
      at(cap,new T.MeshStandardMaterial({color:colors[i],roughness:.46}),[0,.462,0],limb);
    });
    const crown=at(new T.CylinderGeometry(.163,.205,.18,32),trim,[0,.04,.28]);
    crown.rotation.x=Math.PI/2;
    const grille=new T.MeshStandardMaterial({color:0x402e29,roughness:.63});
    for(let i=-2;i<=2;i++){
      const length=.202-Math.abs(i)*.018;
      at(new T.BoxGeometry(length,.012,.01),grille,[0,.04+i*.038,.376]);
    }
    const loop=new T.CatmullRomCurve3([
      new T.Vector3(-.08,.28,-.10),new T.Vector3(-.17,.64,-.18),new T.Vector3(-.22,.94,-.21),
      new T.Vector3(-.15,1.04,-.20),new T.Vector3(-.05,.88,-.19),new T.Vector3(-.02,.34,-.14)
    ]);
    at(new T.TubeGeometry(loop,30,.014,6,false),new T.MeshStandardMaterial({color:0xb17d52,roughness:.78}),[0,0,0]);
  }

  globalThis.HLBCologneGallery={build};
})();
