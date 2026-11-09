(() => {
  "use strict";

  // Positions are in metres. All entrances face positive Z.
  const halls = [
    {id:"group", title:"그룹안내소", en:"GROUP INFORMATION", x:0, front:0, width:10.6, depth:6.7, trim:0xef4136},
    {id:"brand", title:"브랜드관", en:"BRAND ARCHIVE", x:-14.4, front:-4.5, width:9.2, depth:6.2, trim:0xab5142},
    {id:"product", title:"제품전시관", en:"PRODUCT LAB", x:14.4, front:-4.5, width:9.2, depth:6.3, trim:0x648a91},
    {id:"ir", title:"IR 자료관", en:"INVESTOR RELATIONS", x:-10.5, front:-19.5, width:10, depth:6.2, trim:0x6e778b},
    {id:"esg", title:"ESG 정원", en:"SUSTAINABILITY", x:10.5, front:-19.5, width:9.2, depth:6.2, trim:0x628274}
  ];

  function build(scene) {
    const T = globalThis.THREE;
    const site = new T.Group();
    site.name = "HLB Universe";
    scene.add(site);
    const bounds = {minX:-24, maxX:24, minZ:-29, maxZ:17.5};
    const colliders = [], roofs = [], spaces = [];
    let seed = 1171;
    function random() { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }
    const choose = array => array[Math.floor(random() * array.length)];
    const TAU = Math.PI * 2;
    const dark = 0x343338, iron = 0x51545a, enamel = 0xe4dace, red = 0xef4136;
    const up = new T.Vector3(0,1,0);
    const forms = {
      box:new T.BoxGeometry(1,1,1),
      round:new T.CylinderGeometry(1,1,1,18),
      column:new T.CylinderGeometry(.90,1,1,6),
      rock:new T.DodecahedronGeometry(1,0),
      crystal:new T.OctahedronGeometry(1)
    };
    const grainData = new Uint8Array(64*64*4);
    for (let i=0;i<grainData.length;i+=4) {
      const shade=190+Math.round(65*random());
      grainData.set([shade,shade,shade,255],i);
    }
    const grain = new T.DataTexture(grainData,64,64);
    grain.wrapS=grain.wrapT=T.RepeatWrapping;
    grain.magFilter=T.LinearFilter;
    grain.minFilter=T.LinearMipmapLinearFilter;
    grain.generateMipmaps=true;
    grain.needsUpdate=true;
    const materials={
      stone:new T.MeshStandardMaterial({color:0xffffff,roughness:.94,map:grain,flatShading:true}),
      steel:new T.MeshStandardMaterial({color:0xffffff,roughness:.60,metalness:.23}),
      glass:new T.MeshStandardMaterial({color:0xffffff,roughness:.2,metalness:.28}),
      light:new T.MeshBasicMaterial({color:0xffffff,toneMapped:false})
    };
    const batches = new Map(), temp = new T.Object3D();
    function place(shape,color,x,y,z,sx,sy,sz,rotation,finish="steel") {
      const key=shape+finish;
      if (!batches.has(key)) batches.set(key,{shape,finish,matrices:[],colors:[]});
      const batch=batches.get(key);
      temp.position.set(x,y,z);
      temp.scale.set(sx,sy,sz);
      temp.rotation.set(0,0,0);
      if (rotation?.isQuaternion) temp.quaternion.copy(rotation);
      else if (rotation) temp.rotation.set(...rotation);
      temp.updateMatrix();
      batch.matrices.push(temp.matrix.clone());
      batch.colors.push(new T.Color(color));
    }
    function box(x,y,z,w,h,d,color,rotation,finish) {
      place("box",color,x,y,z,w,h,d,rotation,finish);
    }
    function tube(a,b,r,color,finish) {
      const start=new T.Vector3(...a), end=new T.Vector3(...b), delta=end.sub(start);
      const length=delta.length();
      const mid=start.addScaledVector(delta,.5);
      place("round",color,mid.x,mid.y,mid.z,r,length,r,new T.Quaternion().setFromUnitVectors(up,delta.normalize()),finish);
    }
    function collider(x,z,w,d,height,base=0) {
      return {minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:base,maxY:height};
    }
    function triangles(name,verts,colors,material) {
      const geometry=new T.BufferGeometry();
      geometry.setAttribute("position",new T.Float32BufferAttribute(verts,3));
      geometry.setAttribute("color",new T.Float32BufferAttribute(colors,3));
      geometry.computeVertexNormals();
      const mesh=new T.Mesh(geometry,material);
      mesh.name=name;
      site.add(mesh);
      return mesh;
    }
    function face(verts,colors,a,b,c,color) {
      for (const v of [a,b,c]) { verts.push(...v); colors.push(color.r,color.g,color.b); }
    }

    // A triangulated, eroded stratovolcano. The lava follows the very same
    // triangles as the crust, including the channels below the crater rim.
    const flowVerts=[],flowColors=[];
    const summit = {x:-10, z:-80};
    const mountainMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide,flatShading:true});
    function volcano() {
      const centerX=summit.x,centerZ=summit.z,segments=72;
      const radii=[.035,.105,.151,.208,.27,.35,.47,.6,.76,1];
      const heights=[15.9,16.3,21.6,17.6,14.7,12.6,9.6,6.0,3.2,-.5];
      const stone=[0x99483c,0x8f4940,0x935447,0x6d4844,0x855b53,0x624749,0x846862,0x665657,0x6b5d5d];
      const ridge=(a)=>Math.sin(a*5+1)*.51+Math.cos(a*11)*.35+Math.sin(a*17+.6)*.14;
      const rings=radii.map((r,j)=>Array.from({length:segments},(_,i)=>{
        const a=TAU*i/segments, folds=ridge(a);
        const outward=r*(1+.1*folds+.035*Math.sin(a*3+j*.55));
        return [centerX+Math.sin(a)*outward*59 + (1-r)*.8,
          heights[j]+(j===0?0:(.48+1.1*Math.sin(r*Math.PI))*(folds+.26*Math.sin(i+j*.9))),
          centerZ+Math.cos(a)*outward*48];
      }));
      const verts=[], colors=[];
      const lightShade=new T.Color();
      for (let j=0;j<rings.length-1;j++) {
        for (let i=0;i<segments;i++) {
          const n=(i+1)%segments;
          const a=rings[j][i],b=rings[j][n],c=rings[j+1][i],d=rings[j+1][n];
          lightShade.setHex(stone[j]).multiplyScalar(.74+.32*random()+.15*ridge(i/segments*TAU));
          face(verts,colors,a,d,c,lightShade);
          lightShade.multiplyScalar(.90+random()*.17);
          face(verts,colors,a,b,d,lightShade);
        }
      }
      triangles("Layered basalt cone and breached summit",verts,colors,mountainMaterial);
      function surface(radius,angle,lift) {
        let j=0;
        while (j<radii.length-2 && radius>radii[j+1]) j++;
        const t=T.MathUtils.clamp((radius-radii[j])/(radii[j+1]-radii[j]),0,1);
        const segment=((angle/TAU%1+1)%1)*segments;
        const i=Math.floor(segment)%segments,n=(i+1)%segments,u=segment-Math.floor(segment);
        const a=rings[j][i], d=rings[j+1][n], middle=t>u?rings[j+1][i]:rings[j][n];
        return a.map((value,k)=>value*(1-Math.max(t,u))+d[k]*Math.min(t,u)+middle[k]*Math.abs(t-u)+(k===1?lift:0));
      }
      function lavaRibbon(start,end,bearing,width,phase,strength) {
        const strips=[[-1,-.63,0xad2c21],[-.63,-.25,0xff5125],[-.25,.15,0xffba4c],[.15,.60,0xff6d29],[.6,1,0xbd3022]];
        for (const [left,right,shade] of strips) {
          let prevA,prevB;
          for (let step=0;step<=70;step++) {
            const f=step/70,r=start+(end-start)*f;
            const a=bearing + Math.sin(r*13+phase)*.055 + Math.sin(r*43+phase)*(.012+.025*r) + Math.sin(r*7+phase)*f*.11;
            const breadth=width*(1+.22*Math.sin(r*63+phase))*(.17+.83*Math.pow(1-f,.33))/Math.max(.11,r);
            const pa=surface(r,a+breadth*left,.09),pb=surface(r,a+breadth*right,.09);
            if (step) {
              lightShade.setHex(shade).multiplyScalar(strength*(.92+.08*Math.sin(r*60)));
              face(flowVerts,flowColors,prevA,pa,pb,lightShade);face(flowVerts,flowColors,prevA,pb,prevB,lightShade);
            }
            prevA=pa;prevB=pb;
          }
        }
      }
      lavaRibbon(.103,.93,-.26,.030,1,1);
      lavaRibbon(.143,.69,.34,.016,2.9,1);
      lavaRibbon(.15,.52,-.71,.011,3,.86);
      lavaRibbon(.15,.70,1.15,.012,.4,.93);
      const hot=new T.Color(0xff9c4d);
      for(let i=0;i<segments;i++){
        const a=i/segments*TAU,b=(i+1)/segments*TAU;
        const a1=surface(.145,a,.12),a2=surface(.153,a,.12),b1=surface(.145,b,.12),b2=surface(.153,b,.12);
        face(flowVerts,flowColors,a1,b1,b2,hot);face(flowVerts,flowColors,a1,b2,a2,hot);
      }
      place("round",0xff732c,centerX,15.99,centerZ,3.4,.1,3.3,null,"light");
    }

    function makeSummitLogo() {
      // H, L and B follow the outlined wordmark on the Korean group brochure.
      // Its two narrow counters are cut through the B, including the bevel.
      const h = [[33.5,1],[33,0],[32,0],[31.5,.5],[24.5,11.5],[23,12],[9.5,12],[9,11.5],
        [2,.5],[1,0],[0,.5],[0,28.5],[.5,29.5],[1.5,29.5],[2,29],[9,18],[10.5,17.5],
        [24,17.5],[31.5,29],[32,29.5],[33,29.5],[33.5,28.5]];
      const l = [[73,1.5],[70,6],[69,7],[45,7],[44.5,7.5],[44,8.5],[46.5,13],[46.5,22.5],
        [42.5,29],[42,29.5],[41,29],[41,7.5],[41,6.5],[45,.5],[46.5,0],[72,0],[73,.5]];
      const b = [[108.5,23],[105,28],[103.5,29.5],[79,29.5],[78,29],[77.5,28.5],[77,27.5],
        [77,8],[77.5,6.5],[81,1],[82.5,0],[106.5,0],[107.5,.5],[108.5,1],[108.5,2]];
      const upper = [[105.5,21],[103.5,17],[102,16.5],[84,16.5],[83.5,16.5],[83,17],
        [83,21.5],[84,22.5],[105,22.5],[106,22]];
      const lower = [[106,7.5],[105,7],[84,7],[83,8],[83,12.5],[83.5,13],[84,13],
        [102,13],[103.5,12.5],[106,8.5]];
      const points = outline => outline.map(([x,y]) => new T.Vector2((x-54.25)*.126,(y-14.75)*.126));
      const letters = [h,l,b].map(outline => new T.Shape(points(outline)));
      letters[2].holes.push(new T.Path(points(upper)), new T.Path(points(lower)));
      const lettering = new T.ExtrudeGeometry(letters, {
        depth:.22, bevelEnabled:true, bevelSegments:1, bevelSize:.028, bevelThickness:.035
      });
      const enamelFace = new T.MeshBasicMaterial({color:0xfffaf1,toneMapped:false});
      const enamelEdge = new T.MeshStandardMaterial({color:0xfbc9a9,roughness:.45});
      const rotor = new T.Group();
      rotor.name="HLB summit logo";
      rotor.position.set(summit.x+.8,25.1,summit.z);
      site.add(rotor);

      // Three outward-facing signs keep the mark readable even mid-turn.
      const radius = 9.1;
      function drum(top,bottom,height,y,material) {
        const body = new T.Mesh(new T.CylinderGeometry(top,bottom,height,3,1,false,-Math.PI/3),material);
        body.position.y=y;
        rotor.add(body);
      }
      const painted = new T.MeshStandardMaterial({color:red,roughness:.69,emissive:0x74130c,emissiveIntensity:.36,flatShading:true});
      const trim = new T.MeshStandardMaterial({color:0x642724,roughness:.68,flatShading:true});
      drum(radius,radius,4.55,0,painted);
      drum(radius*.96,radius,.18,2.36,trim);
      drum(radius,radius*.92,.30,-2.42,trim);
      for(let i=0;i<3;i++) {
        const angle = i*TAU/3;
        const mark = new T.Mesh(lettering,[enamelFace,enamelEdge]);
        mark.rotation.y=angle;
        mark.position.set(Math.sin(angle)*(radius/2+.025),0,Math.cos(angle)*(radius/2+.025));
        rotor.add(mark);
      }
      const x=rotor.position.x, z=rotor.position.z;
      place("round",0x41353a,x,19.65,z,2.3,5.8,2.3,null,"steel");
      place("round",red,x,22.31,z,2.68,.22,2.68,null,"light");
      place("round",0x513d40,x,22.53,z,3.18,.25,3.18,null,"steel");
      return rotor;
    }

    function landscape() {
      const verts=[],colors=[];
      // Beyond the walkable plateau the caldera wall rises in jagged layers.
      const rings=[29,39,53,72,100], sections=108;
      const ridge=rings.map((radius,j)=>Array.from({length:sections},(_,i)=>{
        const angle=i*TAU/sections, wav=Math.sin(angle*5+.7)*.43+Math.sin(angle*13+1.9)*.34+Math.cos(angle*29)*.23;
        const open=1-.92*Math.pow(Math.max(0,-Math.cos(angle)),3);
        const h=[-1,1.5,5.2,8,1][j];
        const r=radius+(1.8+j)*wav;
        return [Math.sin(angle)*r,(h+(j?wav*(2+j*.58):0))*open-1,Math.cos(angle)*r-4];
      }));
      const tint=new T.Color();
      for(let j=0;j<ridge.length-1;j++) for(let i=0;i<sections;i++){
        const n=(i+1)%sections;
        tint.setHex([0x766c68,0x736363,0x8a7370,0x74676c][j]).multiplyScalar(.75+random()*.37);
        face(verts,colors,ridge[j][i],ridge[j+1][n],ridge[j+1][i],tint);
        face(verts,colors,ridge[j][i],ridge[j][n],ridge[j+1][n],tint.multiplyScalar(.89+random()*.19));
      }
      triangles("Eroded caldera escarpments",verts,colors,mountainMaterial);
      const ground=new T.PlaneGeometry(205,205,65,65);
      ground.rotateX(-Math.PI/2);
      const position=ground.getAttribute("position"), tones=[];
      for(let i=0;i<position.count;i++){
        const x=position.getX(i),z=position.getZ(i);
        position.setY(i,-.11+random()*.07);
        const ash=(Math.sin(x*.19+Math.cos(z*.08)*2)*.45+Math.cos(z*.24-x*.08)*.55+1)*.5;
        tint.setHex(0x756971).lerp(new T.Color(0x958276),ash).multiplyScalar(.85+random()*.23);
        tones.push(tint.r,tint.g,tint.b);
      }
      ground.setAttribute("color",new T.Float32BufferAttribute(tones,3));
      ground.computeVertexNormals();
      const grit=grain.clone();grit.repeat.set(180,180);grit.needsUpdate=true;
      const floor=new T.Mesh(ground,new T.MeshStandardMaterial({map:grit,vertexColors:true,roughness:1}));
      floor.name="Volcanic ash plateau";floor.receiveShadow=true;site.add(floor);
    }

    // Connected strips of precast basalt panels, with expansion joints and edge studs.
    function path(x1,z1,x2,z2,width) {
      const length=Math.hypot(x2-x1,z2-z1),angle=Math.atan2(x2-x1,z2-z1);
      const cs=Math.cos(angle),sn=Math.sin(angle),midX=(x1+x2)/2,midZ=(z1+z2)/2;
      box(midX,-.037,midZ,width,.09,length,0x4e494a,[0,angle,0],"stone");
      const rows=Math.ceil(length/1.3);
      for(let i=0;i<rows;i++){
        const along=(i+.5)*length/rows-length/2;
        const seam=(i%3-1)*width*.09;
        for (const [a,b] of [[-width/2,seam],[seam,width/2]]) {
          const across=(a+b)/2;
          box(midX+sn*along+cs*across,.011,midZ+cs*along-sn*across,b-a-.036,.036,length/rows-.045,
              choose([0x938a83,0xa0978b,0x958d89,0x877e7c]),[0,angle,0],"stone");
        }
        if(i%3===0)for(const side of [-1,1]){
          const across=side*(width/2-.15);
          box(midX+sn*along+cs*across,.034,midZ+cs*along-sn*across,.064,.014,.25,0xf2b075,[0,angle,0],"light");
        }
      }
    }

    function plaque(x,y,z,w,h,title,english,background="#252a2d",display=null) {
      const canvas=document.createElement("canvas");
      canvas.width=1024;canvas.height=Math.max(134,Math.round(1024*h/w));
      const ctx=canvas.getContext("2d"), ch=canvas.height;
      ctx.fillStyle=background;ctx.fillRect(0,0,1024,ch);
      ctx.fillStyle="#EF4136";ctx.fillRect(0,0,14,ch);
      ctx.textBaseline="middle";ctx.textAlign="left";ctx.fillStyle="#fff6e7";
      let font=Math.min(186,ch*.54);
      if (display) {
        ctx.fillStyle="#b3a7a6";
        ctx.font="600 32px Arial,sans-serif";
        ctx.fillText("FIELD ARCHIVE    /    "+display,54,ch*.15,700);
        for(let i=0;i<6;i++) {
          ctx.fillStyle=i<2?"#ef4136":"#675754";
          ctx.fillRect(815+i*24,ch*.12,14,14);
        }
        ctx.fillStyle="#fff6e7";
        font=Math.min(112,ch*.36);
      }
      ctx.font='700 '+font+'px "Malgun Gothic",sans-serif';
      ctx.fillText(title,52,ch*(display ? .49 : .41),918);
      ctx.font='600 '+Math.min(display?34:55,ch*.20)+'px Arial,sans-serif';
      ctx.fillStyle="#f3c49b";ctx.fillText(english,54,ch*(display ? .76 : .81),904);
      const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
      map.anisotropy=4;
      const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,toneMapped:false}));
      mesh.position.set(x,y,z);site.add(mesh);
    }

    // Detail is instanced after assembly. The glass is a dark ceramic-coated
    // band so both the exterior glazing and the indoor displays read clearly.
    function buildHall(h,index) {
      const {x,front,width,depth}=h, left=x-width/2,right=x+width/2,back=front-depth,cz=(front+back)/2;
      const top=h.id==="group"?3.54:3.32, jamb=1.48,stationZ=back+2.3;
      box(x,.018,cz,width+.40,.12,depth+.34,0x595658,null,"stone");
      box(x,.081,cz,width-.18,.04,depth-.08,0x9e9287,null,"stone");
      // Inset threshold tracks run directly into the reading station.
      for(const side of [-1,1])box(x+side*.88,.109,cz,.05,.015,depth-.28,0xcf9a78);
      box(x,top/2,back,width,top,.22,enamel);
      colliders.push(collider(x,back,width,.22,top));
      for(const side of [-1,1]){
        const edge=x+side*(width/2-.12);
        box(edge,top/2,cz,.24,top,depth,dark);
        colliders.push(collider(edge,cz,.25,depth,top));
        for(let i=0;i<5;i++){
          const z=back+(i+.5)*depth/5;
          box(edge+side*.145,.71,z,.07,1.28,depth/5-.035,0xbeb6a9);
          box(edge+side*.15,1.94,z,.08,.98,depth/5-.06,choose([0x52656b,0x63797c,0x596d74]),null,"glass");
          box(edge+side*.148,2.83,z,.07,.62,depth/5-.04,enamel);
        }
        const wing=width/2-jamb,wx=x+side*(jamb+wing/2);
        box(wx,top/2,front,wing,top,.20,dark);
        colliders.push(collider(wx,front,wing,.23,top));
        box(wx,.67,front+.14,wing-.12,1.10,.10,side===-1?h.trim:enamel);
        box(wx,2.77,front+.13,wing-.08,.71,.10,enamel);
        for(let i=0;i<3;i++){
          const bx=wx-wing*.5+(i+.5)*wing/3;
          box(bx,1.83,front+.138,wing/3-.07,1.05,.08,choose([0x4d646b,0x57727a,0x536c74]),null,"glass");
          box(bx,2.26,front+.19,wing/3-.16,.034,.025,0xa0b6b5);
        }
        box(x+side*(jamb+.08),1.55,front+.17,.16,3.02,.28,iron);
        box(x+side*(jamb+.08),1.60,front+.327,.047,2.69,.02,0xffdbad,null,"light");
        box(x+side*(width/2-.16),1.52,front+.14,.18,2.96,.26,iron);
      }
      // Folded caps, separated fascia and bolted roof panels leave the
      // silhouette low enough to frame the active caldera from the entry path.
      box(x,top+.04,cz,width+.59,.24,depth+.52,dark);
      box(x,top+.185,cz,width+.47,.068,depth+.40,enamel);
      for(let i=0;i<7;i++){
        const xx=left+(i+.5)*width/7;
        box(xx,top+.24,cz,width/7-.045,.085,depth+.22,choose([0x71747b,0x747a7e,0x808486]));
      }
      roofs.push(collider(x,cz,width+.55,depth+.52,top+.3,top-.09));
      box(x,top-.34,front+.22,3.36,.75,.45,dark);
      plaque(x,top-.34,front+.455,3.29,.71,h.title,h.en);
      box(x,top+.13,front+.46,3.68,.13,.85,h.trim);
      box(x,top-.115,cz,1.25,.07,depth-.6,0xffdfaf,null,"light");
      // A screen at the far wall, with a low reading console in front of it.
      box(x,1.92,back+.15,4.64,2.12,.13,dark);
      const deskNames=["그룹사 찾기","브랜드 자료","제품 카탈로그","투자자 자료","지속가능경영"];
      plaque(x,1.92,back+.221,4.46,1.94,deskNames[index],"HLB  /  READING DESK","#352e32","0"+(index+1));
      box(x,.56,back+1.03,2.52,.92,.60,iron);
      box(x,1.05,back+1.04,2.74,.13,.77,h.trim);
      box(x,1.19,back+1.02,1.21,.11,.46,0x7cabb1,[-.21,0,0],"glass");
      colliders.push(collider(x,back+1.03,2.74,.77,1.24));
      for(const side of [-1,1]){
        box(x+side*1.05,.13,stationZ,.13,.035,.55,0xef7354,null,"light");
        const rx=x+side*(width/2-.58);
        box(rx,.49,back+1.45,.81,.77,1.68,0xb5aca2);
        box(rx,.91,back+1.45,.91,.12,1.79,dark);
        colliders.push(collider(rx,back+1.45,.89,1.78,1.20));
        for(let i=0;i<3;i++)place("crystal",choose([0xbb7562,0xb8ad8f,0x665664]),rx,1.14,back+.95+i*.47,.19,.28,.17,[.25,i,.1],"stone");
      }
      if(h.id==="group"){
        const tx=left+.83, tz=front-1.12;
        box(tx,top+.66,tz,1.17,.88,1.56,0xb6b2ad);
        box(tx,top+1.16,tz,1.31,.14,1.66,iron);
        tube([tx,top+1.19,tz],[tx,top+2.22,tz],.04,iron);
        tube([tx-.40,top+1.74,tz],[tx+.42,top+1.92,tz],.032,iron);
        place("round",red,tx,top+2.24,tz,.072,.10,.072,null,"light");
      }else if(h.id==="brand"){
        for(let i=0;i<5;i++)box(left+.77+i*.28,top+.56,cz,.12,.75,depth*.55,h.trim,[0,0,-.35]);
      }else if(h.id==="product"){
        for(const offset of [.85,2.02]){
          place("round",0x9aacac,right-offset,top+.64,cz,.49,.78,.49);
          place("round",iron,right-offset,top+1.05,cz,.53,.12,.53);
        }
      }else if(h.id==="ir"){
        for(let i=0;i<2;i++){
          const xx=left+1.0+i*1.27;
          box(xx,top+.52,cz,1.02,.52,1.29,iron);
          for(let k=0;k<5;k++)box(xx,top+.80,cz-.44+k*.22,.82,.04,.08,0xaaa8a3);
        }
      }else{
        for(let i=0;i<4;i++){
          box(right-1.50,top+.49,cz-1.9+i*1.05,2.11,.08,.96,0x4a656c,[0,0,-.15],"glass");
          box(right-1.50,top+.545,cz-1.9+i*1.05,2.09,.012,.04,0x9eaeb1,[0,0,-.15]);
        }
      }
      // Identification plate on the facade stays visible from side paths.
      plaque(left+1.22,.75,front+.202,2.02,.63,"HLB 유니버스","HLB UNIVERSE","#3b3435");
      spaces.push({id:h.id,x,z:front+.25,station:{x,z:stationZ},label:{x,y:top+.34,z:front+.60},
        interior:{minX:left,maxX:right,minZ:back,maxZ:front+.55,ceilingY:top-.10}});
    }

    const basalt=[0x453f48,0x514951,0x5f5559,0x473f43,0x675551,0x554949];
    function outcrop(x,z,scale,block=true) {
      const count=6;
      for(let i=0;i<count;i++){
        const a=TAU*i/count+.2,spread=i===0?0:.50+.18*random();
        const height=scale*(i===0?1.5:.62+random()*.61);
        const xx=x+Math.sin(a)*spread*scale,zz=z+Math.cos(a)*spread*scale;
        const rad=scale*(.22+random()*.18),tilt=(random()-.5)*.16;
        const rotation=[.08*Math.sin(a),.08+a*.1,tilt];
        place("column",choose(basalt),xx,height*.46,zz,rad,height,rad,rotation,"stone");
        place("column",0x796b65,xx-height*.49*tilt,height*.96,zz+height*.033*Math.sin(a),rad*.91,height*.055,rad*.91,rotation,"stone");
      }
      for(let i=0;i<9;i++){
        const a=random()*TAU, radius=(.7+random()*.34)*scale;
        place("rock",choose(basalt),x+Math.cos(a)*radius,.10*scale,z+Math.sin(a)*radius,
          (.10+random()*.16)*scale,(.08+random()*.14)*scale,(.12+random()*.19)*scale,[random(),a,0],"stone");
      }
      if(block)colliders.push(collider(x,z,scale*1.81,scale*1.81,scale*1.55));
    }
    const hotRock=[];
    // Each vent is a recessed lava bed with a cooling crust, broken into
    // individual basalt rafts. The irregular open channels glow between them.
    function vent(x,z,rx,rz) {
      const rings=[[],[],[],[]], n=28;
      for(let i=0;i<n;i++){
        const a=TAU*i/n,edge=.84+random()*.23;
        [1.05,.93,.81,.53].forEach((radius,j)=>rings[j].push([
          x+Math.sin(a)*radius*edge*rx,[.014,.21,.105,.085][j],z+Math.cos(a)*radius*edge*rz]));
      }
      const verts=[],colors=[],shade=new T.Color(),lc=new T.Color(0xff942e);
      const center=[x,.087,z];
      for(let i=0;i<n;i++){
        const j=(i+1)%n;
        for(let band=0;band<2;band++){
          shade.setHex(choose(basalt));
          const a=rings[band][i],b=rings[band][j],c=rings[band+1][i],d=rings[band+1][j];
          face(verts,colors,a,c,b,shade);face(verts,colors,b,c,d,shade);
        }
        const a=rings[2][i],b=rings[2][j],c=rings[3][i],d=rings[3][j];
        lc.setHex(choose([0xfc5123,0xf95c23,0xf66b23]));
        face(flowVerts,flowColors,a,c,b,lc);face(flowVerts,flowColors,b,c,d,lc);
        lc.setHex(choose([0xff832a,0xff902d,0xff9838]));face(flowVerts,flowColors,c,center,d,lc);
      }
      triangles("Basalt vent rim",verts,colors,mountainMaterial);
      for(let i=0;i<13;i++){
        const angle=random()*TAU,r=.72*Math.sqrt(random());
        const xx=x+Math.sin(angle)*rx*r,zz=z+Math.cos(angle)*rz*r;
        place("rock",choose(basalt),xx,.128,zz,rx*(.07+random()*.12),.078+random()*.07,rz*(.065+random()*.10),[0,random()*TAU,0],"stone");
      }
      colliders.push(collider(x,z,rx*2.05,rz*2.03,.26));
      hotRock.push([x,z]);
    }
    function siteDetail(){
      // All paths meet on level ground, including two side routes behind the hub.
      path(0,18.9,0,.02,3.48);
      path(-14.4,2.08,14.4,2.08,2.65);
      for(const side of [-1,1]){
        path(side*14.4,2.14,side*14.4,-4.47,2.76);
        path(side*7.35,2.14,side*7.35,-14.8,2.33);
        path(side*7.35,-14.8,side*10.5,-16.1,2.31);
        path(side*10.5,-16.1,side*10.5,-19.48,2.33);
      }
      path(-7.35,-13.72,7.35,-13.72,2.25);
      path(0,13.82,8.50,13.82,2.46);
      // Protected geothermal fissures flank the arrival path.
      vent(-6.05,8.85,1.82,3.0);
      vent(6.03,7.46,1.35,2.58);
      vent(0,-18.32,2.04,1.62);
      vent(18.65,-15.25,1.28,2.12);
      const clusters=[[-7.83,6.65,1.43],[-4.69,11.42,.7],[5.15,5.12,.76],[7.07,10.24,.67],[-11.28,-2.04,.86],
        [11.2,-1.78,.9],[-20.90,-12.5,1.89],[21.94,-7.8,2.12],[-3.38,-17.26,1.23],[3.06,-9.85,.86],
        [-16.01,-15.24,1.04],[16.61,-17.01,.73],[-.70,-25.48,1.74],[-19.75,8.5,2.12]];
      for(const [xx,zz,s] of clusters)outcrop(xx,zz,s);
      for(let i=0;i<87;i++){
        const a=TAU*i/87+random()*.035,r=30+random()*12;
        const x=Math.sin(a)*r,z=Math.cos(a)*r-5,scale=1+random()*2.75;
        if (x>7 && x<22+scale && z>3 && z<18+scale) continue;
        outcrop(x,z,scale,false);
      }
      for(let i=0;i<360;i++){
        const x=random()*50-25,z=random()*50-30;
        if ((z>-.6 && Math.abs(x)<2.4) || Math.abs(z-2.08)<1.58 ||
          (Math.abs(Math.abs(x)-7.35)<1.48 && z<2.1 && z>-15.4) ||
          (Math.abs(Math.abs(x)-14.4)<1.61 && z<2.1 && z>-4.8) ||
          (z<-12.1 && z>-20.0) ||
          (x>8 && x<22.1 && z>3.8 && z<17.5) ||
          (x>0 && x<8.7 && Math.abs(z-13.82)<1.4) ||
          halls.some(h=>Math.abs(x-h.x)<h.width*.5+.42 && z<h.front+.8 && z>h.front-h.depth-.5))continue;
        const s=.08+random()*.21;
        place("rock",choose(basalt),x,s*.16,z,s,.36*s,s*(.75+random()),[.06,random()*TAU,.05],"stone");
      }
      // Geothermal supply pipes and steel collars live on the margins of campus.
      for(const side of [-1,1]){
        const x=side*22.4;
        tube([x,.54,10],[x,.54,-26.1],.14,0x8f817b);
        tube([x+side*.36,.48,10],[x+side*.36,.48,-26.1],.092,iron);
        for(let i=0;i<13;i++){
          const z=9.5-i*2.83;
          box(x+side*.12,.19,z,.83,.37,.23,dark);
          tube([x,.54,z-.038],[x,.54,z+.038],.18,i%3===0?red:iron);
        }
        colliders.push(collider(x+side*.10,-8.07,.78,36.4,.72));
      }
      // Pairs of inset signal lamps keep the walking routes legible in the ash.
      for(const [x,z] of [[-2.06,11.48],[2.06,11.48],[-2.06,4.11],[2.06,4.11],[-9.6,3.81],[9.6,3.81],
        [-16.18,-2.65],[16.18,-2.65],[-9.02,-12.0],[9.02,-12.0],[-12.17,-17.65],[12.17,-17.65]]){
        box(x,.35,z,.18,.70,.18,dark);
        box(x,.62,z,.194,.12,.194,0xffbe7b,null,"light");
        box(x,.75,z,.23,.10,.23,iron);
        colliders.push(collider(x,z,.23,.23,.82));
      }
    }

    // Soft ash driven by a constant crosswind, with sparks rising off the hot vents.
    function makeAtmosphere(){
      const texSize=64, pixels=new Uint8Array(texSize*texSize*4);
      for(let y=0;y<texSize;y++)for(let x=0;x<texSize;x++){
        const xx=(x+.5)/texSize*2-1,yy=(y+.5)/texSize*2-1;
        const radial=Math.hypot(xx,yy),angle=Math.atan2(yy,xx);
        const edge=.84+.067*Math.sin(angle*5+1)+.044*Math.sin(angle*9-.7);
        const alpha=Math.max(0,1-radial/edge);
        pixels.set([255,255,255,Math.min(255,Math.round(255*Math.min(1,alpha*2.1)*(.61+.27*random()+.11*Math.cos(xx*8+yy*4))))],(y*texSize+x)*4);
      }
      const texture=new T.DataTexture(pixels,texSize,texSize);
      texture.magFilter=T.LinearFilter;texture.needsUpdate=true;
      const clouds=[];
      for(let i=0;i<8;i++){
        const cloud=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false,
          color:new T.Color(0x785854).lerp(new T.Color(0xb7a7ad),i/8),opacity:.55}));
        cloud.name="Windblown crater ash";
        site.add(cloud);clouds.push(cloud);
      }
      const coordinates=new Float32Array(hotRock.length*5*3), emberSeeds=[];
      for(let i=0;i<coordinates.length/3;i++){
        emberSeeds.push({origin:hotRock[Math.floor(i/5)],phase:random(),side:random()-.5,bend:random()*TAU,lift:.5+random()*.65});
      }
      const geometry=new T.BufferGeometry();
      geometry.setAttribute("position",new T.BufferAttribute(coordinates,3));
      const embers=new T.Points(geometry,new T.PointsMaterial({color:0xffb456,size:.047,toneMapped:false}));
      embers.name="Vent sparks";embers.frustumCulled=false;site.add(embers);
      let time=0;
      function update(dt=0){
        time+=Math.min(.10,Math.max(dt,0));
        clouds.forEach((p,i)=>{
          const age=(i/8+time*.045)%1, size=3.8+11.4*age;
          p.position.set(-9.1-age*5.1-age*age*8+Math.sin(age*8)*.85,20.2+age*12.5,-80+1.1*age);
          p.scale.set(size,size*(.81+.17*age),1);
          p.material.rotation=-.15-age*.70;
          p.material.opacity=.64*Math.min(1,age/.09)*(1-Math.pow(age,2.35));
        });
        emberSeeds.forEach((ember,i)=>{
          const f=(time*.42+ember.phase)%1;
          coordinates[i*3]=ember.origin[0]+ember.side*.86+Math.sin(ember.bend+f*4)*.14;
          coordinates[i*3+1]=.18+ember.lift*f+Math.sin(Math.PI*f)*.25;
          coordinates[i*3+2]=ember.origin[1]+Math.cos(ember.bend)*.47+.12*f;
        });
        geometry.attributes.position.needsUpdate=true;
      }
      update();
      return update;
    }

    landscape();
    volcano();
    const summitLogo=makeSummitLogo();
    halls.forEach(buildHall);
    siteDetail();
    spaces.push(globalThis.HLBCologneGallery.build({T,site,box,place,collider,colliders,roofs}));
    triangles("Incandescent lava channels",flowVerts,flowColors,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,toneMapped:false}));
    for(const {shape,finish,matrices,colors} of batches.values()){
      const mesh=new T.InstancedMesh(forms[shape],materials[finish],matrices.length);
      matrices.forEach((matrix,i)=>{ mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,colors[i]); });
      mesh.name=shape+" "+finish;
      mesh.castShadow=finish!=="light";mesh.receiveShadow=finish!=="light";
      site.add(mesh);
    }
    const updateAtmosphere=makeAtmosphere();
    let angle=0;
    function update(dt=0,reducedMotion=false) {
      if (reducedMotion) {
        summitLogo.rotation.y=0;
        return;
      }
      // Negative yaw is clockwise when the caldera is viewed from above.
      angle=(angle+Math.max(0,dt)*TAU/22)%TAU;
      summitLogo.rotation.y=-angle;
      updateAtmosphere(dt);
    }
    return {spaces,colliders,cameraColliders:[...colliders,...roofs],bounds,spawn:{x:1.55,z:10},update};
  }
  globalThis.HLBWorld3D={build};
})();
