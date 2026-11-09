(() => {
  "use strict";

  // Front outlines traced from the supplied Café Lento sign. Each entry is
  // one solid silhouette followed by its cutouts, in common lettering units.
  const signOutlines=[
    ["0,43 3,37 11,34 4,21 5,17 10,12 15,12 18,13 27,23 32,26 35,25 37,18 40,14 42,13 49,13 52,15 56,26 85,26 87,26 88,23 89,16 91,9 96,6 99,6 106,8 108,10 108,23 109,26 112,29 127,20 133,19 138,21 141,26 141,30 137,35 131,39 130,43 138,48 156,49 164,51 165,53 166,60 171,60 172,61 173,64 173,69 171,73 166,77 162,79 155,79 143,74 130,63 126,63 113,82 105,89 98,93 82,98 71,99 59,98 43,93 26,82 17,71 6,51 1,46", "154,67 158,63 161,63 163,66 163,71 162,73 158,73 155,71"],
    ["200,51 202,38 206,27 219,13 238,5 250,4 260,6 275,13 284,24 288,33 280,34 268,19 254,12 238,12 230,14 218,23 211,35 208,51 213,69 218,77 228,86 236,90 246,92 266,88 273,83 282,70 288,69 290,71 282,84 266,95 250,99 236,98 221,91 210,80 203,69"],
    ["300,37 302,20 306,13 310,9 328,4 340,5 346,9 352,5 356,5 358,61 356,63 352,63 350,57 348,56 336,63 322,64 316,62 309,57 304,51", "306,35 307,23 311,17 318,12 326,10 336,12 345,19 349,25 350,37 349,45 344,53 340,55 328,57 316,53 309,45"],
    ["369,61 370,57 380,57 383,53 381,7 384,4 390,5 390,53 392,56 404,57 406,59 405,63 394,64 390,65 391,83 396,88 406,88 407,93 404,96 398,96 388,92 383,85 382,65 380,64 370,64"],
    ["416,31 419,17 426,9 436,3 448,1 455,3 462,7 468,13 470,19 464,20 450,10 438,10 427,17 423,27 425,31 472,32 473,33 470,45 464,55 454,62 444,63 433,61 424,54 418,43", "425,41 428,38 432,38 462,38 464,41 461,47 456,53 444,55 438,54 432,51"],
    ["429,77 432,71 434,70 456,81 456,83 454,88 452,88"],
    ["520,93 521,3 562,3 563,11 530,11 528,13 529,95 528,97 522,97"],
    ["572,31 576,15 581,7 592,1 600,0 613,3 622,11 626,17 620,18 610,10 598,8 588,13 583,17 578,27 580,31 584,32 628,31 629,33 626,47 620,55 612,61 600,64 588,60 580,53 574,43", "581,41 581,39 584,38 616,37 621,39 619,45 614,51 604,55 596,54 590,52"],
    ["643,59 644,3 650,3 651,5 651,45 654,50 660,55 670,57 680,54 685,47 686,4 688,2 693,3 692,47 688,58 679,63 672,64 660,61 654,56 650,57 650,63 644,62"],
    ["701,59 702,54 712,55 715,51 715,13 717,7 724,3 736,2 738,3 736,9 728,10 722,15 721,47 724,54 736,55 737,61 724,62 722,63 722,81 718,83 714,81 713,79 713,63 710,61 703,61"],
    ["745,31 748,17 754,9 764,3 776,1 786,3 800,12 806,21 808,33 806,44 798,55 788,61 776,64 762,60 750,50 746,42", "751,33 754,21 758,15 766,10 776,7 784,8 791,13 798,23 800,31 798,41 795,47 787,53 776,56 766,55 757,49 752,41"],
    ["850,70 853,66 858,67 861,65 861,18 862,14 868,14 870,18 871,72 868,75 853,75"],
    ["889,54 890,43 894,39 909,31 909,28 899,15 902,13 907,13 920,30 930,49 931,57 927,63 919,72 907,75 899,72 894,68 891,65", "898,51 898,46 902,42 912,40 918,42 921,46 923,54 921,59 918,64 910,65 902,62 898,57"],
    ["939,70 941,64 959,64 963,62 964,59 942,13 943,11 951,12 976,70 975,72 949,72 941,72"],
    ["979,26 983,17 993,10 1008,10 1017,18 1021,31 1017,43 1008,50 1000,51 993,50 992,51 992,57 995,62 1014,62 1015,70 1014,72 988,71 983,42 988,38 998,44 1008,42 1013,36 1014,31 1013,26 1010,21 1003,16 998,16 991,21 986,28 980,28"]
  ];

  function makeLettering(T) {
    function trace(path, contour) {
      const points=contour.split(" ");
      for (let i=0;i<points.length;i++) {
        const [x,y]=points[i].split(",").map(Number);
        if (i===0) path.moveTo(x,y);
        else path.lineTo(x,y);
      }
      path.closePath();
      return path;
    }
    const shapes=signOutlines.map(([outline,...holes])=>{
      const shape=trace(new T.Shape(),outline);
      shape.holes=holes.map(contour=>trace(new T.Path(),contour));
      return shape;
    });
    const geometry=new T.ExtrudeGeometry(shapes,{
      depth:7,bevelEnabled:true,bevelSize:.85,bevelThickness:1,bevelSegments:1
    });
    geometry.center();
    return geometry;
  }

  function build({T,site,box,place,tube,collider,colliders,roofs}) {
    // Local positive X faces the plaza. Local positive Z faces the window seats.
    const cx=-14.8, cz=10.82, roofY=3.95;
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

    const lettering=makeLettering(T);
    const letterFace=new T.MeshStandardMaterial({
      color:0xf0e9d9,emissive:0xfff5e7,emissiveIntensity:.80,roughness:.55,toneMapped:false
    });
    const letterMaterials=[letterFace,finish(0x8c8376)];
    const fascia=new T.MeshStandardMaterial({color:0x807970,metalness:.14,roughness:.58});
    function sign(name,x,y,z,width,yaw) {
      const mount=new T.Group();
      mount.name=name;
      mount.position.set(x,y,z);
      mount.rotation.y=yaw;
      mount.scale.setScalar(width/1100);
      room.add(mount);
      const board=new T.Mesh(new T.BoxGeometry(1100,34,13),fascia);
      board.name="Steel letter rail";
      board.position.y=-32;
      board.receiveShadow=true;
      mount.add(board);
      const lowerLip=new T.Mesh(new T.BoxGeometry(1104,4,17),finish(0x59544f));
      lowerLip.position.y=-49;
      mount.add(lowerLip);
      const letters=new T.Mesh(lettering,letterMaterials);
      letters.name="Café Lento · illuminated lettering";
      letters.position.z=12;
      mount.add(letters);
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
    // Glazed transom behind the sign; the channel letters stand above their mounting rail.
    const transom=new T.MeshStandardMaterial({
      color:0x768487,transparent:true,opacity:.36,depthWrite:false,roughness:.26
    });
    mesh("Smoked transom",new T.BoxGeometry(.045,.84,7.88),transom,6.067,3.34,1.02);
    sign("Café Lento · entrance marquee",6.29,3.33,1.02,7.71,Math.PI/2);
    block(5.94,3.55,3.0,.16,.14,2.7,espresso);
    const roofCollider=collider(cx,cz,12.34,10.3,4.3,roofY-.14);
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
      slab("Rooflight frame",x,4.18,.32,1.07,.10,4.13,.12,finish(metal));
      slab("Smoked rooflight",x,4.28,.32,.92,.02,3.97,.09,finish(0x93a6a4));
      block(x,4.29,.32,.96,.02,.048,metal);
    }

    // Continuous plaster fascia, recessed ribbed-oak cabinets and the service desk.
    slab("Coffee bar soffit",-.34,2.84,-3.11,10.55,.74,3.14,.28,finish(plaster));
    slab("Coffee bar cove",-.34,3.58,-3.11,10.46,.065,3.08,.25,cove);
    slab("Rounded sign wall",2.40,.12,-2.99,2.88,2.76,2.95,.30,finish(porcelain));
    const smokedGlass=new T.MeshBasicMaterial({
      color:0x6c665e,transparent:true,opacity:.64,depthWrite:false,toneMapped:false
    });
    mesh("Coffee bar glass header",new T.BoxGeometry(9.90,.57,.018),smokedGlass,-.34,3.17,-1.529);
    sign("Café Lento · counter marquee",.56,3.16,-1.51,4.22,0);
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
        hitBox:collider(cx-.92,cz-2.53,8.28,2.17,3.49,.12)}]
    };
  }

  globalThis.HLBCafe={build};
})();
