(() => {
  "use strict";

  function build({T,site,box,place,tube,collider,colliders,roofs}) {
    // Local positive X faces the plaza. Local positive Z faces the window seats.
    const cx=-14.8, cz=10.82, roofY=3.92;
    const room=new T.Group();
    room.name="Café Lento 1975";
    room.position.set(cx,0,cz);
    room.userData.hallId="cafe";
    room.userData.nightEntrance={x:6,z:3,yaw:Math.PI/2};
    site.add(room);

    const porcelain=0xedeae2, plaster=0xe5e0d5, tile=0xc9c4bc, grout=0xaba59e;
    const oak=0xc2a17e, oakShadow=0x967857, caramel=0xb28358, leather=0xab7446;
    const metal=0xc4c2b9, espresso=0x302c2b, brass=0xba9064, glow=0xffe7ae;
    const point=(x,z)=>({x:cx+x,z:cz+z});
    function block(x,y,z,w,h,d,color,rotation,finish) {
      box(cx+x,y,cz+z,w,h,d,color,rotation,finish);
    }
    function form(shape,x,y,z,sx,sy,sz,color,rotation,finish) {
      place(shape,color,cx+x,y,cz+z,sx,sy,sz,rotation,finish);
    }
    function rod(x1,y1,z1,x2,y2,z2,r,color) {
      tube([cx+x1,y1,cz+z1],[cx+x2,y2,cz+z2],r,color);
    }
    function solid(x,z,w,d,h) {
      colliders.push(collider(cx+x,cz+z,w,d,h));
    }
    function mesh(name,geometry,material,x,y,z) {
      const object=new T.Mesh(geometry,material);
      object.name=name;
      object.position.set(x,y,z);
      room.add(object);
      return object;
    }
    const finishes=new Map();
    function finish(color) {
      if (!finishes.has(color)) finishes.set(color,new T.MeshStandardMaterial({color,roughness:.72}));
      return finishes.get(color);
    }
    // Horizontal extrusions preserve the soft corners of the plaster shell and counter.
    function slab(name,x,base,z,w,h,d,r,material) {
      const a=w/2,b=d/2;
      const shape=new T.Shape();
      shape.moveTo(-a+r,-b);
      shape.lineTo(a-r,-b); shape.quadraticCurveTo(a,-b,a,-b+r);
      shape.lineTo(a,b-r); shape.quadraticCurveTo(a,b,a-r,b);
      shape.lineTo(-a+r,b); shape.quadraticCurveTo(-a,b,-a,b-r);
      shape.lineTo(-a,-b+r); shape.quadraticCurveTo(-a,-b,-a+r,-b);
      shape.closePath();
      const geom=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:7});
      geom.rotateX(-Math.PI/2);
      const object=mesh(name,geom,material,x,base,z);
      object.castShadow=object.receiveShadow=true;
      return object;
    }
    const glass=new T.MeshStandardMaterial({
      color:0xa8c5c5,transparent:true,opacity:.16,depthWrite:false,roughness:.18,
      emissive:0xeacb9f,emissiveIntensity:.035
    });
    glass.userData.nightWindow=true;
    const cove=new T.MeshStandardMaterial({color:glow,emissive:0xffcf84,emissiveIntensity:.65});
    cove.userData.nightLamp=true;
    function glazing(x,z,w,d) {
      mesh("Floor-to-ceiling glazing",new T.BoxGeometry(w,3.25,d),glass,x,1.79,z);
      solid(x,z,Math.max(w,.16),Math.max(d,.16),3.56);
    }
    function type(text,x,y,z,w,h,ink,yaw=0) {
      const canvas=document.createElement("canvas");
      canvas.width=512; canvas.height=Math.max(64,Math.round(512*h/w));
      const ctx=canvas.getContext("2d");
      ctx.textBaseline="middle"; ctx.textAlign="center";
      ctx.fillStyle=ink;
      ctx.font="600 "+Math.round(canvas.height*.74)+"px Arial, sans-serif";
      ctx.fillText(text,canvas.width/2,canvas.height/2,canvas.width*.97);
      const map=new T.CanvasTexture(canvas);
      map.colorSpace=T.SRGBColorSpace;
      const mat=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false});
      mesh(text,new T.PlaneGeometry(w,h),mat,x,y,z).rotation.y=yaw;
    }

    // Two identical photographic light boxes use the supplied original sign.
    const signMaterial=new T.MeshBasicMaterial({color:0xb9afa0,toneMapped:false});
    if (typeof document.createElementNS==="function") {
      new T.TextureLoader().load("assets/cafe/cafe-lento-sign.jpg",texture=>{
        texture.colorSpace=T.SRGBColorSpace;
        texture.anisotropy=4;
        signMaterial.map=texture;
        signMaterial.color.setHex(0xffffff);
        signMaterial.needsUpdate=true;
      });
    }
    function sign(x,y,z,w,yaw) {
      const h=w*494/800;
      const bezel=mesh("Champagne sign surround",new T.BoxGeometry(w+.07,h+.07,.035),finish(brass),x,y,z);
      bezel.rotation.y=yaw;
      const face=mesh("Café Lento · turtle sign",new T.PlaneGeometry(w,h),signMaterial,
        x+Math.sin(yaw)*.022,y,z+Math.cos(yaw)*.022);
      face.rotation.y=yaw;
    }

    slab("Limestone plinth",0,.003,0,12.22,.12,10.22,.3,finish(tile));
    for (let x=-5;x<6;x+=1.5) block(x,.125,0,.012,.003,9.91,grout);
    for (let z=-4;z<5;z+=1.5) block(0,.125,z,11.92,.003,.012,grout);
    block(0,1.99,-4.94,12,3.82,.18,plaster);
    block(-5.94,1.99,0,.18,3.82,9.93,porcelain);
    solid(0,-4.94,12,.18,3.9);
    solid(-5.94,0,.18,9.93,3.9);

    // The west and north walls enclose the service area. The south wall is
    // clear glass, with a frameless opening between the east jambs at z=3.
    glazing(0,4.94,11.89,.037);
    glazing(5.94,-2.64,.037,4.48);
    glazing(5.94,4.65,.037,.59);
    for (let x=-5.88;x<=5.9;x+=1.96) block(x,1.82,4.94,.045,3.52,.091,metal);
    for (const z of [-4.88,-2.65,-.45,1.65,4.35,4.94]) block(5.94,1.82,z,.09,3.54,.05,metal);
    block(0,.19,4.94,12,.14,.14,metal);
    block(0,3.48,4.94,12,.075,.11,metal);
    block(5.94,.19,-2.64,.14,.14,4.49,metal);
    block(5.94,3.48,0,.12,.075,9.92,metal);
    slab("Ivory entrance pier",5.83,.12,.61,.46,3.72,2.1,.18,finish(porcelain));
    solid(5.83,.61,.46,2.1,3.85);
    sign(6.074,2.05,.61,1.9,Math.PI/2);
    block(5.94,3.55,3.0,.16,.14,2.7,espresso);
    const roofCollider=collider(cx,cz,12.34,10.3,4.18,roofY-.14);
    roofs.push(roofCollider);
    slab("Floating pavilion eave",0,roofY-.15,0,12.32,.10,10.30,.34,cove);
    slab("Warm white ceiling",0,roofY-.164,0,12.10,.04,10.08,.29,finish(porcelain));
    slab("Rounded ivory roof",0,roofY-.05,0,12.42,.28,10.40,.37,finish(porcelain));
    // Narrow black tracks on the ceiling continue the simple lines of the glasswork.
    for (const x of [-4,-.40,3.72]) {
      block(x,roofY-.164,.72,.066,.03,6.53,espresso);
      for (const z of [-1.2,1.4,3.15]) block(x,roofY-.185,z,.032,.018,.22,glow,null,"light");
    }
    for (const x of [-3.55,.1,3.55]) {
      slab("Rooflight frame",x,4.15,.32,1.07,.13,4.13,.12,finish(metal));
      slab("Smoked rooflight",x,4.28,.32,.92,.022,3.97,.09,finish(0x93a6a4));
      block(x,4.31,.32,.96,.029,.048,metal);
    }

    // Continuous plaster fascia, recessed ribbed-oak cabinets and the service desk.
    slab("Coffee bar soffit",-.34,2.84,-3.11,10.55,.74,3.14,.28,finish(plaster));
    slab("Coffee bar cove",-.34,3.58,-3.11,10.46,.065,3.08,.25,cove);
    slab("Rounded sign wall",2.40,.12,-2.99,2.88,2.76,2.95,.30,finish(porcelain));
    sign(2.00,1.98,-1.49,1.48,0);
    block(-1.57,1.04,-4.23,6.9,1.75,.8,oakShadow);
    block(-1.57,1.93,-4.20,6.98,.12,.86,porcelain);
    block(-1.57,2.42,-4.72,6.95,.75,.32,oak);
    for(let i=0;i<52;i++) {
      block(-4.96+i*.133,2.42,-4.55,.018,.71,.026,oakShadow);
    }
    block(-1.57,2.034,-4.54,6.89,.027,.069,glow,null,"light");
    slab("Marble order counter", -1.53,.13,-2.23,6.87,1.03,1.11,.13,finish(0xe4e2db));
    slab("Polished counter top",-1.53,1.16,-2.23,6.99,.08,1.18,.13,finish(porcelain));
    block(-1.53,.26,-1.674,6.52,.047,.018,0xd3d0c8);
    solid(-.20,-3.18,9.79,3.10,2.75);
    type("ORDER",-1.42,1.07,-1.658,.62,.14,"#724c35");
    type("PICK UP",.53,1.07,-1.658,.65,.14,"#724c35");

    // Transparent pastry case with two oak trays and individually scored rolls.
    const caseX=-1.51, caseZ=-2.21;
    block(caseX,1.28,caseZ,1.75,.085,.79,brass);
    mesh("Glass pastry case",new T.BoxGeometry(1.74,.69,.76),glass,caseX,1.64,caseZ);
    for(const x of [-.85,.85]) for(const z of [-.36,.36]) {
      block(caseX+x,1.63,caseZ+z,.035,.69,.035,brass);
    }
    for(const y of [1.35,1.64]) {
      block(caseX,y,caseZ,1.61,.025,.70,oak);
      for(let i=0;i<4;i++){
        const x=caseX-.59+i*.39;
        form("leaf",x,y+.084,caseZ,.158,.091,.164,i%2?0xd49651:0xc28645);
        for(const dx of [-.046,.041]) {
          form("leaf",x+dx,y+.165,caseZ,.013,.012,.073,0xeac58c,[0,-.53,0]);
        }
      }
    }
    block(caseX,1.994,caseZ,1.78,.035,.8,brass);

    block(-.19,1.29,-2.00,.44,.055,.39,espresso);
    rod(-.19,1.32,-2.04,-.19,1.50,-2.08,.045,metal);
    block(-.19,1.60,-2.06,.52,.35,.055,espresso,[-.25,0,0]);
    block(-.19,1.60,-2.023,.447,.269,.01,0x93b5b0,[-.25,0,0],"light");
    for (const x of [.34,.70]) {
      block(x,1.26,-2.14,.33,.032,.24,oakShadow);
      block(x,1.44,-2.14,.29,.34,.038,porcelain,[-.15,0,0]);
      for(let i=0;i<3;i++) block(x,1.5-i*.055,-2.112,.19-i*.025,.013,.01,0x917c69);
    }

    // Twin-group espresso machine, portafilters, steam wand, grinder and ceramic cups.
    block(-1.65,1.99,-4.02,1.60,.085,.72,espresso);
    block(-1.65,2.27,-4.24,1.57,.5,.35,metal);
    block(-1.65,2.46,-4.04,1.60,.19,.61,0xe3dcd1);
    block(-1.65,2.42,-3.721,1.46,.085,.021,espresso);
    for(const x of [-2.01,-1.32]) {
      form("round",x,2.31,-3.85,.095,.12,.095,metal);
      rod(x,2.28,-3.81,x+.10,2.28,-3.62,.033,espresso);
      block(x,2.42,-3.704,.12,.024,.016,glow,null,"light");
      form("round",x,2.097,-3.87,.081,.13,.081,porcelain);
    }
    rod(-.92,2.32,-3.83,-.87,2.08,-3.74,.019,metal);
    block(-.50,2.024,-4.12,.40,.09,.42,espresso);
    form("round",-.50,2.24,-4.16,.147,.38,.147,0x52524d);
    form("round",-.50,2.56,-4.16,.17,.24,.17,0x57483b);
    form("round",-.50,2.70,-4.16,.18,.036,.18,espresso);
    for(let i=0;i<4;i++) for(let j=0;j<3;j++) {
      form("round",.05+i*.22,2.01+j*.047,-4.15,.090+j*.004,.075,.090+j*.004,porcelain);
    }
    const lamp=new T.PointLight(0xffe7c4,11,9,2);
    lamp.position.set(-1,2.64,-.80);
    room.add(lamp);

    // Window bench, planting trough and loose café chairs. Furniture stays
    // along the edges, leaving a continuous aisle from the open doorway.
    slab("Window bench plinth",-1.43,.13,4.07,8.75,.42,1.36,.18,finish(plaster));
    slab("Window seat",-1.43,.55,3.97,8.68,.18,1.04,.15,finish(caramel));
    slab("Camel leather backrest",-1.43,.73,4.36,8.62,.54,.24,.105,finish(leather));
    for(let i=0;i<6;i++) {
      const x=-4.58+i*1.26;
      block(x,.738,3.9,.012,.009,.76,oakShadow);
      block(x,.991,4.233,.013,.46,.009,oakShadow);
    }
    solid(-1.43,4.06,8.75,1.36,1.28);
    block(-1.43,1.17,4.66,8.69,.24,.45,porcelain);
    block(-1.43,1.294,4.66,8.39,.018,.34,0x574b38);
    const leafColors=[0x586b43,0x46613e,0x768751,0x89945e];
    for(let i=0;i<24;i++) {
      const x=-5.48+i*.348;
      for(let j=0;j<5;j++) {
        const angle=i*2.12+j*2.4, length=.18+(i+j)%4*.034;
        form("leaf",x+Math.sin(angle)*.082,1.39+length*.39,4.65+Math.cos(angle)*.078,
          .051,length,.075,leafColors[(i+j)%4],[Math.cos(angle)*.72,angle,Math.sin(angle)*.72]);
      }
    }
    function chair(x,z,yaw) {
      const c=Math.cos(yaw),s=Math.sin(yaw);
      function pos(dx,dz) {return [x+dx*c+dz*s,z-dx*s+dz*c];}
      form("leaf",x,.59,z,.38,.091,.34,leather,[0,yaw,0]);
      const [bx,bz]=pos(0,-.27);
      form("leaf",bx,.90,bz,.365,.186,.074,caramel,[.18,yaw,0]);
      for(const dx of [-.24,.24]) for(const dz of [-.20,.20]) {
        const [topX,topZ]=pos(dx,dz), [footX,footZ]=pos(dx*1.23,dz*1.4);
        rod(footX,.13,footZ,topX,.55,topZ,.021,metal);
      }
      for(const dx of [-.25,.25]) {
        const [legX,legZ]=pos(dx,-.20),[backX,backZ]=pos(dx,-.27);
        rod(legX,.57,legZ,backX,.87,backZ,.022,metal);
      }
      solid(x,z,.70,.68,1.03);
    }
    for(const [x,turn] of [[-4.16,-.14],[-1.66,.11],[.88,-.17]]) {
      form("round",x,.158,2.96,.31,.058,.31,metal);
      form("round",x,.54,2.96,.057,.72,.057,metal);
      form("round",x,.925,2.96,.64,.07,.64,porcelain);
      solid(x,2.96,1.20,1.20,.97);
      chair(x+.27,1.97,turn);
    }

    // White open bookcase beside the west wall, with staggered spines and bookends.
    const caseCenter=-4.36;
    for(const y of [.18,.68,1.19]) block(caseCenter,y,.02,2.53,.075,.69,porcelain);
    for(const x of [-5.58,-4.76,-3.94,-3.14]) block(x,.69,.02,.075,1.04,.68,porcelain);
    const bookColors=[0x788e95,0xb68973,0xddcf99,0xb6b7af,0x8ca87c,0xc0a1a4,0x737f91,0xe4ddc8];
    for(let row=0;row<2;row++) for(let bay=0;bay<3;bay++) for(let i=0;i<6;i++) {
      const x=-5.49+bay*.82+i*.086,h=.28+(i*3+bay+row)%4*.038;
      block(x,.22+row*.50+h/2,.15,.069,h,.245,bookColors[(i+bay*3+row)%8]);
      block(x,.29+row*.50,.276,.046,.022,.009,porcelain);
    }
    solid(caseCenter,.02,2.53,.69,1.23);

    const entry=point(6.06,3),station=point(.41,.05),lookAt=point(.52,-2.54);
    return {
      id:"cafe",...entry,station,lookAt,label:{...entry,y:3.68},
      interior:{minX:cx-6,maxX:cx+6,minZ:cz-5,maxZ:cz+5,ceilingY:roofY-.15},
      exhibits:[{id:"cafe-counter",title:"카페 주문대",station,lookAt,
        hitBox:collider(cx-.92,cz-2.53,8.28,2.12,2.76,.12)}]
    };
  }

  globalThis.HLBCafe={build};
})();
