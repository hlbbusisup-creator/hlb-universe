(() => {
  "use strict";

  // Hall builders use their original local plans. buildAt() aligns the complete
  // geometry, collision boxes and reading stops on the pedestrian street.
  const halls = [
    {id:"group", title:"그룹안내소", en:"GROUP INFORMATION", x:0, front:0, width:10.6, depth:6.7},
    {id:"brand", title:"브랜드관", en:"BRAND ARCHIVE", x:-14.4, front:-4.5, width:9.2, depth:6.2},
    {id:"product", title:"제품전시관", en:"PRODUCT LAB", x:14.4, front:-4.5, width:9.2, depth:6.3},
    {id:"ir", title:"IR 자료관", en:"INVESTOR RELATIONS", x:-10.5, front:-19.5, width:10, depth:6.2},
    {id:"esg", title:"ESG 정원", en:"SUSTAINABILITY", x:10.5, front:-19.5, width:9.2, depth:6.2}
  ];

  function containsPoint(rect, point, padding=0) {
    if (!rect || !point) return false;
    const o=rect.obb;
    if (o) {
      const dx=point.x-o.x,dz=point.z-o.z;
      return Math.abs(dx*o.cos-dz*o.sin)<=o.halfX+padding &&
        Math.abs(dx*o.sin+dz*o.cos)<=o.halfZ+padding;
    }
    return point.x>=rect.minX-padding && point.x<=rect.maxX+padding &&
      point.z>=rect.minZ-padding && point.z<=rect.maxZ+padding;
  }

  function build(scene) {
    const T = globalThis.THREE;
    const site = new T.Group();
    site.name = "HLB Universe";
    scene.add(site);
    const levelBounds = {minX:-29, maxX:29, minZ:-52, maxZ:28};
    const bounds = {...levelBounds,minX:-60};
    const walkSurfaces = [];
    const historyHill = {
      height:4.5,hall:{x:-45,y:4.5,z:-10},branch:{x:0,y:0,z:-9},pathWidth:3.8,
      plateau:{minX:-58,maxX:-32,minZ:-28,maxZ:-4},blockedSlope:{x:-61,z:-16},
      routePoints:[[0,-9],[-9,-9],[-19,-6],[-27,0],[-35,3],[-43,1],[-45,-4],[-45,-10]]
        .map(([x,z])=>({x,z}))
    };
    const hillCurve=new T.CatmullRomCurve3(historyHill.routePoints.map(p=>new T.Vector3(p.x,0,p.z)),false,"centripetal");
    let routeLength=0;
    historyHill.pathSamples=Array.from({length:181},(_,i)=>{
      const p=hillCurve.getPoint(i/180),previous=i?hillCurve.getPoint((i-1)/180):p;
      routeLength+=p.distanceTo(previous);
      return {x:p.x,z:p.z,y:0,distance:routeLength};
    });
    const rampStart=historyHill.pathSamples.find(p=>p.x<=-29).distance;
    const rampEnd=historyHill.pathSamples.find(p=>p.x<-40 && p.z<=-4).distance;
    for(const p of historyHill.pathSamples)p.y=historyHill.height*T.MathUtils.smoothstep(p.distance,rampStart,rampEnd);
    function nearestHillPath(p) {
      let best={distance:Infinity,y:0,x:0,z:0};
      const samples=historyHill.pathSamples;
      for(let i=1;i<samples.length;i++){
        const a=samples[i-1],b=samples[i],dx=b.x-a.x,dz=b.z-a.z;
        const t=T.MathUtils.clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz),0,1);
        const x=a.x+dx*t,z=a.z+dz*t,distance=Math.hypot(p.x-x,p.z-z);
        if(distance<best.distance)best={distance,x,z,y:a.y+(b.y-a.y)*t};
      }
      return best;
    }
    function isWalkablePoint(p,padding=0) {
      if(!p || !Number.isFinite(p.x) || !Number.isFinite(p.z))return false;
      const margin=Math.max(0,padding),top=historyHill.plateau;
      const inside=b=>p.x>=b.minX+margin && p.x<=b.maxX-margin && p.z>=b.minZ+margin && p.z<=b.maxZ-margin;
      if(inside(levelBounds) || inside(top))return true;
      if(p.x<bounds.minX || p.x>levelBounds.minX+3 || p.z<-12 || p.z>8)return false;
      return nearestHillPath(p).distance<=historyHill.pathWidth/2-margin;
    }
    function groundHeight(p) {
      if(!p || p.x>=-27 || p.x<=-67 || p.z<=-37 || p.z>=10)return 0;
      const top=historyHill.plateau;
      if(containsPoint(top,p))return historyHill.height;
      const dx=p.x<top.minX?(top.minX-p.x)/9:Math.max(0,(p.x-top.maxX)/3);
      const dz=p.z<top.minZ?(top.minZ-p.z)/9:Math.max(0,(p.z-top.maxZ)/12);
      const hill=historyHill.height*(1-T.MathUtils.smoothstep(Math.hypot(dx,dz),0,1));
      const path=nearestHillPath(p),half=historyHill.pathWidth/2;
      if(path.distance<=half+.18)return path.y;
      const shoulder=1-T.MathUtils.smoothstep(path.distance,half+.18,half+3);
      return T.MathUtils.lerp(hill,path.y,shoulder);
    }
    for(const point of historyHill.routePoints)point.y=groundHeight(point);
    const district = {title:"HLB 브랜드 거리",minX:-6,maxX:6,minZ:-8,maxZ:19.5};
    const plaza = {title:"HLB 브랜드 광장",x:0,z:-26,radius:26};
    const yachtDocks = [
      {id:"entrance",title:"입구",x:10,y:0,z:23,yaw:0,station:{x:7,y:0,z:23},sign:{x:7,z:25}},
      {id:"group",title:"그룹안내소",x:7.6,y:0,z:-17.5,yaw:0,station:{x:4.4,y:0,z:-17.5},sign:{x:4.3,z:-15.6}},
      {id:"history",title:"HLB 역사관",x:-35.4,y:historyHill.height,z:-6.55,yaw:Math.PI/2,
        station:{x:-40.5,y:historyHill.height,z:-5.35},sign:{x:-41.9,z:-5.25},signYaw:-.65}
    ];
    const lavaLights = [[-4.9,3],[4.9,3],[-25.8,-18],[25.8,-18]];
    const colliders = [], roofs = [], spaces = [];
    let seed = 1171;
    function random() { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }
    const choose = array => array[Math.floor(random() * array.length)];
    const TAU = Math.PI * 2;
    const dark = 0x343338, iron = 0x51545a, red = 0xef4136;
    const up = new T.Vector3(0,1,0);
    const forms = {
      box:new T.BoxGeometry(1,1,1),
      round:new T.CylinderGeometry(1,1,1,18),
      column:new T.CylinderGeometry(.90,1,1,6),
      rock:new T.DodecahedronGeometry(1,0),
      crystal:new T.OctahedronGeometry(1),
      leaf:new T.SphereGeometry(1,8,6)
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
      return {minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:base,maxY:height,floorY:0};
    }
    function buildAt(make,x,z,yaw=0,elevation=0) {
      const firstChild=site.children.length, firstCollider=colliders.length, firstRoof=roofs.length;
      const starts=new Map([...batches].map(([key,batch])=>[key,batch.matrices.length]));
      const room=make();
      const transform=new T.Matrix4().makeTranslation(x,elevation,z)
        .multiply(new T.Matrix4().makeRotationY(yaw))
        .multiply(new T.Matrix4().makeTranslation(-room.x,0,-room.z));
      const coordinate=new T.Vector3();
      function point(p) {
        if(!p)return p;
        coordinate.set(p.x,p.y||0,p.z).applyMatrix4(transform);
        return {...p,x:coordinate.x,y:coordinate.y,z:coordinate.z};
      }
      function rectangle(rect) {
        const corners=[
          point({x:rect.minX,z:rect.minZ}), point({x:rect.maxX,z:rect.minZ}),
          point({x:rect.minX,z:rect.maxZ}), point({x:rect.maxX,z:rect.maxZ})
        ];
        const bounds={...rect,minX:Math.min(...corners.map(p=>p.x)),maxX:Math.max(...corners.map(p=>p.x)),
          minZ:Math.min(...corners.map(p=>p.z)),maxZ:Math.max(...corners.map(p=>p.z)),floorY:(rect.floorY||0)+elevation};
        for(const key of ['minY','maxY','ceilingY'])if(Number.isFinite(rect[key]))bounds[key]=rect[key]+elevation;
        if(Math.abs(yaw)>1e-8){
          const center=point({x:(rect.minX+rect.maxX)/2,z:(rect.minZ+rect.maxZ)/2});
          bounds.obb={x:center.x,z:center.z,halfX:(rect.maxX-rect.minX)/2,halfZ:(rect.maxZ-rect.minZ)/2,
            cos:Math.cos(yaw),sin:Math.sin(yaw)};
        }
        return bounds;
      }
      for(let i=firstChild;i<site.children.length;i++) site.children[i].applyMatrix4(transform);
      for(const [key,batch] of batches) {
        for(let i=starts.get(key) || 0;i<batch.matrices.length;i++) batch.matrices[i].premultiply(transform);
      }
      for(let i=firstCollider;i<colliders.length;i++) colliders[i]=rectangle(colliders[i]);
      for(let i=firstRoof;i<roofs.length;i++) roofs[i]=rectangle(roofs[i]);
      return {...point(room),station:point(room.station),lookAt:point(room.lookAt),label:point(room.label),
        interior:rectangle(room.interior),exhibits:room.exhibits?.map(exhibit=>({...exhibit,
          station:point(exhibit.station),lookAt:point(exhibit.lookAt),hitBox:rectangle(exhibit.hitBox)})),
        projection:room.projection?{...room.projection,
          cameraPosition:point(room.projection.cameraPosition),lookAt:point(room.projection.lookAt),
          station:point(room.projection.station),projector:point(room.projection.projector)}:undefined};
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
    // Keep the volcanic foot behind the rear archive walls and their exits.
    const summit = {x:-10, z:-100};
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
      function lavaRibbon(start,end,bearing,width,phase,strength,splits=[]) {
        const course=r=>bearing+Math.sin(r*13+phase)*.055+Math.sin(r*43+phase)*(.012+.025*r)
          +Math.sin(r*7+phase)*(r-start)/(end-start)*.11;
        const strips=[[-1,-.63,0xad2c21],[-.63,-.25,red],[-.25,.15,0xffba4c],[.15,.60,0xff6d29],[.6,1,0xbd3022]];
        for (const [left,right,shade] of strips) {
          let prevA,prevB;
          for (let step=0;step<=70;step++) {
            const f=step/70,r=start+(end-start)*f;
            const a=course(r);
            const breadth=width*(1+.22*Math.sin(r*63+phase))*(.17+.83*Math.pow(1-f,.33))/Math.max(.11,r);
            const pa=surface(r,a+breadth*left,.09),pb=surface(r,a+breadth*right,.09);
            if (step) {
              lightShade.setHex(shade).multiplyScalar(strength*(.92+.08*Math.sin(r*60)));
              face(flowVerts,flowColors,prevA,pa,pb,lightShade);face(flowVerts,flowColors,prevA,pb,prevB,lightShade);
            }
            prevA=pa;prevB=pb;
          }
        }
        // Old channels split around basalt shelves, then drain into the hot trunk.
        // Interrupt the narrow glow where a tongue has cooled over.
        const crust=new T.Color(0x79423a),melt=new T.Color(0xf05a36);
        for(const [from,to,sweep] of splits){
          let previous;
          for(let i=0;i<=30;i++){
            const t=i/30,r=from+(to-from)*t,arc=Math.sin(Math.PI*t);
            const angle=course(r)+sweep*Math.pow(arc,.81)*(1+.15*Math.sin(t*7+phase));
            const halfWidth=.0042*(.35+.65*arc)*(1+.24*Math.sin(t*21+phase))/r;
            const edges=[surface(r,angle-halfWidth,.081),surface(r,angle+halfWidth,.081)];
            const heat=.48+.34*Math.sin(t*15+phase)+.16*Math.cos(t*37+from*15);
            if(previous && heat>.19){
              lightShade.copy(crust).lerp(melt,heat);
              face(flowVerts,flowColors,previous[0],edges[0],edges[1],lightShade);
              face(flowVerts,flowColors,previous[0],edges[1],previous[1],lightShade);
            }
            previous=edges;
          }
        }
      }
      lavaRibbon(.103,.97,-.26,.038,1,1);
      lavaRibbon(.143,.91,.34,.025,2.9,1);
      lavaRibbon(.15,.76,-.71,.020,3,.93);
      lavaRibbon(.15,.85,1.15,.022,.4,.96);
      lavaRibbon(.15,.91,-1.14,.021,1.6,.93,[[.39,.54,.22],[.53,.75,.24]]);
      lavaRibbon(.15,.74,.74,.015,4.3,1,[[.36,.50,.19],[.49,.70,.24]]);
      lavaRibbon(.15,.89,1.72,.020,2.1,.92);
      lavaRibbon(.15,.82,-1.73,.017,.8,.94);
      lavaRibbon(.35,.98,.06,.010,2.6,1);
      lavaRibbon(.42,.94,-.47,.011,4.8,.96);
      // Low, sinuous seams emerge from the central slope in broken clusters.
      // Their connecting saddle is deliberately lower than the two outer ridges.
      const seamStone=[0x74615b,0x685551,0x53494b,0x7a6059,0x665856];
      const seams=[
        {trace:[[.51,.073],[.56,.128],[.63,.113],[.68,.085],[.74,.061]],stones:17},
        {trace:[[.51,.265],[.56,.251],[.63,.277],[.68,.249],[.727,.220],[.749,.257]],stones:18},
        {trace:[[.627,.122],[.61,.168],[.619,.211],[.604,.251]],stones:9}
      ];
      seams.forEach(({trace,stones},row)=>{
        const curve=new T.CatmullRomCurve3(trace.map(([r,a])=>new T.Vector3(r,0,a)));
        for(let i=0;i<stones;i++){
          const phase=i*4.17+row*2.7;
          if(Math.sin(phase)>.94)continue;
          const p=curve.getPoint(i/(stones-1));
          const [x,y,z]=surface(p.x,p.z+.006*Math.sin(phase),.03);
          const size=.38+.17*Math.cos(phase*1.8);
          place("rock",seamStone[(i+row)%seamStone.length],x,y,z,size,.44*size,(row===2 ? .79 : 1.53)*size,
            [.08,Math.sin(phase)*.49,.15],"stone");
          if(i%2===0){
            const drift=(i%4===0 ? -1 : 1)*(.023+.013*Math.sin(phase));
            const [xx,yy,zz]=surface(p.x+.011,p.z+drift,.015);
            const chip=size*(.38+.16*Math.cos(phase));
            place("rock",seamStone[(i+2)%seamStone.length],xx,yy,zz,chip,.60*chip,.85*chip,
              [0,phase,.12],"stone");
          }
        }
      });
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
      const rings=[31,43,59,78,108], sections=108;
      const ridge=rings.map((radius,j)=>Array.from({length:sections},(_,i)=>{
        const angle=i*TAU/sections, wav=Math.sin(angle*5+.7)*.43+Math.sin(angle*13+1.9)*.34+Math.cos(angle*29)*.23;
        const open=1-.92*Math.pow(Math.max(0,-Math.cos(angle)),3);
        const h=[-1,1.5,5.2,8,1][j];
        const r=radius+(1.8+j)*wav;
        const x=Math.sin(angle)*r,z=Math.cos(angle)*r*1.3-10;
        const height=(h+(j?wav*(2+j*.58):0))*open-1;
        // A low opening on the eastern rim reveals the river beyond the
        // walkable boundary. The historic pavilion and promenade stay intact.
        const riverX=37+2.4*Math.sin(z*.055);
        const opening=(1-T.MathUtils.smoothstep(Math.abs(x-riverX),6,14))*
          T.MathUtils.smoothstep(z,-80,-66)*(1-T.MathUtils.smoothstep(z,40,52));
        const westOpening=(1-T.MathUtils.smoothstep(x,-30,-23))*T.MathUtils.smoothstep(x,-77,-68)*
          T.MathUtils.smoothstep(z,-45,-35)*(1-T.MathUtils.smoothstep(z,11,20));
        return [x,T.MathUtils.lerp(height,-.30,Math.max(opening,westOpening)),z];
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
      const ashTone=new T.Color(0x958276);
      for(let i=0;i<position.count;i++){
        const x=position.getX(i),z=position.getZ(i);
        position.setY(i,-.11+random()*.07);
        const ash=(Math.sin(x*.19+Math.cos(z*.08)*2)*.45+Math.cos(z*.24-x*.08)*.55+1)*.5;
        tint.setHex(0x756971).lerp(ashTone,ash).multiplyScalar(.85+random()*.23);
        tones.push(tint.r,tint.g,tint.b);
      }
      ground.setAttribute("color",new T.Float32BufferAttribute(tones,3));
      ground.computeVertexNormals();
      const grit=grain.clone();grit.repeat.set(180,180);grit.needsUpdate=true;
      const floor=new T.Mesh(ground,new T.MeshStandardMaterial({map:grit,vertexColors:true,roughness:1}));
      floor.name="Volcanic ash plateau";floor.receiveShadow=true;site.add(floor);
    }

    function makeLavaRiver() {
      // A single flowing surface and shared instanced banks: all vertices stay
      // outside the visitor's eastern boundary, so the river is scenery only.
      const sections=140,vertices=[],uvs=[],indices=[];
      const banks=[],riverBounds={minX:Infinity,maxX:-Infinity,minZ:-68,maxZ:42};
      function crossSection(t) {
        const z=42-110*t,x=37+2.4*Math.sin(z*.055),half=4.15+.30*Math.sin(t*11);
        return {x,z,half};
      }
      for(let row=0;row<=sections;row++) {
        const t=row/sections,{x,z,half}=crossSection(t);
        for(const side of [-1,1]) {
          const edge=x+side*half;
          vertices.push(edge,.065,z);uvs.push((side+1)/2,t);
          riverBounds.minX=Math.min(riverBounds.minX,edge);riverBounds.maxX=Math.max(riverBounds.maxX,edge);
        }
        if(row<sections) {const a=row*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
        if(row%3===0)banks.push({...crossSection(t),index:row});
      }
      const geometry=new T.BufferGeometry();
      geometry.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
      geometry.setAttribute("uv",new T.Float32BufferAttribute(uvs,2));
      geometry.setIndex(indices);geometry.computeVertexNormals();
      const material=new T.ShaderMaterial({
        uniforms:{time:{value:0},magma:{value:new T.Color(red)},hot:{value:new T.Color(0xffad50)},
          crust:{value:new T.Color(0x2c2028)}},toneMapped:false,
        vertexShader:`varying vec2 riverUV;
          void main(){riverUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader:`uniform float time;uniform vec3 magma;uniform vec3 hot;uniform vec3 crust;
          varying vec2 riverUV;
          void main(){
            vec2 p=vec2(riverUV.x*7.,riverUV.y*65.-time*.32);
            float fold=sin(p.y*.78+sin(p.x*1.6)*1.7)*sin(p.x*2.6+sin(p.y*.35));
            float vein=1.-smoothstep(.10,.31,abs(fold));
            float rafts=smoothstep(.43,.82,abs(fold));
            float pulse=.5+.5*sin(p.y*1.1-p.x*1.7);
            vec3 lava=mix(magma,hot,vein*(.55+.30*pulse));
            lava=mix(lava,crust,rafts*.73);
            float edge=smoothstep(.72,1.,abs(riverUV.x-.5)*2.);
            gl_FragColor=vec4(mix(lava,crust,edge),1.);
            #include <colorspace_fragment>
          }`
      });
      const mesh=new T.Mesh(geometry,material);mesh.name="Magma Red lava river";
      mesh.userData.sceneryOnly=true;site.add(mesh);
      for(const {x,z,half,index} of banks)for(const side of [-1,1]) {
        const size=.45+(Math.sin(index*2.7+side)+1)*.15;
        place("rock",basalt[(index+3+side)%basalt.length],x+side*(half+.30),.10,z,
          size,.27+size*.28,1.24,[.07,index*.61,.04],"stone");
      }
      let time=0;
      return {mesh,bounds:riverBounds,sceneryOnly:true,update(dt=0,reducedMotion=false) {
        if(reducedMotion) {material.uniforms.time.value=0;return;}
        time=(time+Math.max(0,Math.min(Number(dt)||0,.1)))%3600;
        material.uniforms.time.value=time;
      }};
    }

    // Connected strips of precast basalt panels, with expansion joints and edge studs.
    function path(x1,z1,x2,z2,width) {
      const length=Math.hypot(x2-x1,z2-z1),angle=Math.atan2(x2-x1,z2-z1);
      const cs=Math.cos(angle),sn=Math.sin(angle),midX=(x1+x2)/2,midZ=(z1+z2)/2;
      box(midX,-.037,midZ,width,.09,length,0x4e494a,[0,angle,0],"stone");
      const rows=Math.ceil(length/1.3);
      const rowLength=length/rows;
      for(let i=0;i<rows;i++){
        const along=(i+.5)*rowLength-length/2;
        const seam=(i%3-1)*width*.09;
        for (const [a,b] of [[-width/2,seam],[seam,width/2]]) {
          const across=(a+b)/2;
          box(midX+sn*along+cs*across,.011,midZ+cs*along-sn*across,b-a-.036,.036,rowLength-.045,
              choose([0x938a83,0xa0978b,0x958d89,0x877e7c]),[0,angle,0],"stone");
        }
        if(i%3===0)for(const side of [-1,1]){
          const across=side*(width/2-.15);
          box(midX+sn*along+cs*across,.034,midZ+cs*along-sn*across,.064,.014,.25,0xf2b075,[0,angle,0],"light");
        }
      }
      return rowLength;
    }

    function curvedPath(points,width) {
      const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,.045,z)),false,"centripetal");
      const rows=Math.ceil(curve.getLength()/1.15),vertices=[],colors=[],tone=new T.Color();
      const edge=(t,side)=>{
        const p=curve.getPoint(t),d=curve.getTangent(t);
        return [p.x+d.z*side*width/2,.045,p.z-d.x*side*width/2];
      };
      for(let i=0;i<rows;i++){
        const start=(i+.025)/rows,end=(i+.975)/rows;
        const a=edge(start,-1),b=edge(start,1),c=edge(end,-1),d=edge(end,1);
        tone.setHex(choose([0x938a83,0xa0978b,0x958d89,0x877e7c]));
        face(vertices,colors,a,c,d,tone);face(vertices,colors,a,d,b,tone);
      }
      triangles("Curved plaza approach",vertices,colors,mountainMaterial).receiveShadow=true;
    }

    function makeHistoryHill() {
      // One height field drives the visible hill, walking altitude and camera.
      // Only the ramp and level court are navigable; the remaining slopes are scenery.
      const vertices=[],colors=[],indices=[],shade=new T.Color(),columns=88,rows=96;
      for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
        const x=-67+col*.5,z=-37+row*.5,y=groundHeight({x,z});
        vertices.push(x,y-.018,z);
        shade.setHex(y>3.9?0x897c67:0x665650).multiplyScalar(.93+.09*Math.sin(x*.61+z*.41));
        colors.push(shade.r,shade.g,shade.b);
        if(row<rows && col<columns){const a=row*(columns+1)+col;indices.push(a,a+columns+1,a+1,a+1,a+columns+1,a+columns+2);}
      }
      const geometry=new T.BufferGeometry();
      geometry.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
      geometry.setAttribute("color",new T.Float32BufferAttribute(colors,3));
      geometry.setIndex(indices);geometry.computeVertexNormals();
      const terrain=new T.Mesh(geometry,mountainMaterial);
      terrain.name="History hill · continuous volcanic slope";terrain.receiveShadow=true;site.add(terrain);
      walkSurfaces.push(terrain);

      const top=historyHill.plateau,court=new T.Mesh(new T.PlaneGeometry(top.maxX-top.minX,top.maxZ-top.minZ),
        new T.MeshStandardMaterial({color:0xa89b83,roughness:.95,map:grain}));
      court.rotation.x=-Math.PI/2;court.position.set((top.minX+top.maxX)/2,historyHill.height+.012,(top.minZ+top.maxZ)/2);
      court.name="History hill · level palace court";court.receiveShadow=true;site.add(court);walkSurfaces.push(court);
      // The short approach is seamless with the court and leaves the palace door open.
      const pathVertices=[],pathColors=[],samples=historyHill.pathSamples,half=historyHill.pathWidth/2;
      const edge=(i,side)=>{
        const p=samples[i],a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)];
        const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
        return [p.x+dz/length*side*half,p.y+.04,p.z-dx/length*side*half];
      };
      for(let i=1;i<samples.length;i++){
        const a=edge(i-1,-1),b=edge(i-1,1),c=edge(i,-1),d=edge(i,1);
        shade.setHex([0xbbb0a0,0xaca292,0xb4a895][Math.floor(i/3)%3]);
        face(pathVertices,pathColors,a,c,d,shade);face(pathVertices,pathColors,a,d,b,shade);
      }
      const ramp=triangles("History hill · winding stone ramp",pathVertices,pathColors,mountainMaterial);
      ramp.receiveShadow=true;walkSurfaces.push(ramp);
      // A warm timber rail marks the safe path without narrowing its usable width.
      for(let i=1;i<samples.length;i+=6){
        const p=samples[i];if(p.x>-29 || p.z<-4)continue;
        for(const side of [-1,1]){
          const [x,y,z]=edge(i,side),base=y-.04;
          box(x,base+.48,z,.10,.96,.10,0x635048,null,"stone");
          box(x,base+.97,z,.15,.08,.15,0xd3a768);
          const post=collider(x,z,.12,.12,base+1.01,base);post.floorY=base;colliders.push(post);
          if(i+6<samples.length && samples[i+6].z>=-4){
            const [xx,yy,zz]=edge(i+6,side);
            tube([x,base+.76,z],[xx,yy-.04+.76,zz],.047,0x796556);
          }
        }
      }
      // Low edge stones distinguish the elevated court from the inaccessible slope.
      for(const side of [-1,1]){
        const x=side<0?top.minX+.18:top.maxX-.18;
        for(let z=top.minZ+.5;z<top.maxZ;z+=1.3)box(x,historyHill.height+.13,z,.30,.24,1.23,0x756757,null,"stone");
      }
      for(let x=top.minX+.5;x<top.maxX;x+=1.3){
        box(x,historyHill.height+.13,top.minZ+.18,1.23,.24,.30,0x756757,null,"stone");
        if(Math.abs(x-historyHill.hall.x)>2.6)box(x,historyHill.height+.13,top.maxZ-.18,1.23,.24,.30,0x756757,null,"stone");
      }
      for(const [x,z] of [[-51.5,-6.4],[-40,-8.35]]){
        const y=historyHill.height;
        box(x,y+.25,z,1.8,.50,.95,0x736459,null,"stone");
        box(x,y+.51,z,1.66,.035,.82,0x433b33,null,"stone");
        for(const dx of [-.52,0,.52])place("leaf",0x61724f,x+dx,y+.74,z,.38,.32,.31,null,"stone");
        const planter=collider(x,z,1.8,.95,y+1,y);planter.floorY=y;colliders.push(planter);
      }
      const signX=-6.5,signZ=-6.5;
      box(signX,.78,signZ,.12,1.56,.12,0x6b5344);
      box(signX,1.35,signZ,2.7,.62,.13,0x6b5344);
      colliders.push(collider(signX,signZ,.18,.18,1.68));
      const canvas=document.createElement("canvas");canvas.width=768;canvas.height=176;
      const ctx=canvas.getContext("2d");ctx.fillStyle="#f0e5ce";ctx.fillRect(0,0,768,176);
      ctx.fillStyle="#523c30";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.font='700 68px "Malgun Gothic",sans-serif';ctx.fillText("← HLB 역사관",384,88,710);
      const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
      const sign=new T.Mesh(new T.PlaneGeometry(2.53,.50),new T.MeshBasicMaterial({map,toneMapped:false}));
      sign.name="History hill · left trail wayfinding";sign.position.set(signX,1.35,signZ+.071);site.add(sign);
      historyHill.wayfinding={x:signX,y:1.35,z:signZ};
      historyHill.terrain=terrain;historyHill.ramp=ramp;historyHill.court=court;
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
    const hotRock=[], ventVerts=[], ventColors=[];
    // Each vent is a recessed lava bed with a cooling crust, broken into
    // individual basalt rafts. The irregular open channels glow between them.
    function vent(x,z,rx,rz) {
      const rings=[[],[],[],[]], n=28;
      for(let i=0;i<n;i++){
        const a=TAU*i/n,edge=.84+random()*.23;
        [1.05,.93,.81,.53].forEach((radius,j)=>rings[j].push([
          x+Math.sin(a)*radius*edge*rx,[.014,.21,.105,.085][j],z+Math.cos(a)*radius*edge*rz]));
      }
      const verts=ventVerts,colors=ventColors,shade=new T.Color(),lc=new T.Color(0xff942e);
      const center=[x,.087,z];
      for(let i=0;i<n;i++){
        const j=(i+1)%n;
        for(let band=0;band<2;band++){
          shade.setHex(choose(basalt));
          const a=rings[band][i],b=rings[band][j],c=rings[band+1][i],d=rings[band+1][j];
          face(verts,colors,a,c,b,shade);face(verts,colors,b,c,d,shade);
        }
        const a=rings[2][i],b=rings[2][j],c=rings[3][i],d=rings[3][j];
        lc.setHex(choose([red,0xf95c23,0xf66b23]));
        face(flowVerts,flowColors,a,c,b,lc);face(flowVerts,flowColors,b,c,d,lc);
        lc.setHex(choose([0xff832a,0xff902d,0xff9838]));face(flowVerts,flowColors,c,center,d,lc);
      }
      for(let i=0;i<13;i++){
        const angle=random()*TAU,r=.72*Math.sqrt(random());
        const xx=x+Math.sin(angle)*rx*r,zz=z+Math.cos(angle)*rz*r;
        place("rock",choose(basalt),xx,.128,zz,rx*(.07+random()*.12),.078+random()*.07,rz*(.065+random()*.10),[0,random()*TAU,0],"stone");
      }
      colliders.push(collider(x,z,rx*2.05,rz*2.03,.26));
      hotRock.push([x,z]);
    }
    function siteDetail(){
      // Curved entry walks join a compact semicircle. Short spokes lead
      // straight into gently turned halls, keeping their signs visible on arrival.
      const avenueWidth=8.2,avenueStartZ=28;
      const avenueRow=path(0,avenueStartZ,0,-22.4,avenueWidth);
      path(-5.5,11,5.5,11,2.8);
      const paving=[],pavingColors=[],tone=new T.Color();
      const point=(r,a)=>[Math.sin(a)*r,.045,-22+Math.cos(a)*r];
      for(let i=0;i<64;i++){
        const a=Math.PI/2+i/64*Math.PI+.002,b=Math.PI/2+(i+1)/64*Math.PI-.002;
        const innerA=point(12,a),outerA=point(15,a),innerB=point(12,b),outerB=point(15,b);
        tone.setHex(choose([0x938a83,0xa0978b,0x958d89,0x877e7c]));
        face(paving,pavingColors,innerA,innerB,outerB,tone);
        face(paving,pavingColors,innerA,outerB,outerA,tone);
      }
      triangles("Semicircular brand plaza promenade",paving,pavingColors,mountainMaterial).receiveShadow=true;
      for(const side of [-1,1]){
        const approach=side<0 ? [[0,-11],[-7,-11],[-11.4,-14],[-12.1,-20],[-13.5,-22]] :
          [[0,-11],[7,-11],[12.5,-14],[13.5,-22]];
        curvedPath(approach,3.4);
        path(side*13.5,-22,side*20,-31,3.4);
        path(side*9.546,-31.546,side*15,-41,3.4);
      }
      // Small embarkation pads stay outside the continuous walking line.
      for(const dock of yachtDocks){
        if(dock.id==="history"){
          // A low berth paved into the court, parallel to the palace façade.
          for(let i=0;i<6;i++)
            box(dock.x+i-2.5,dock.y+.038,dock.z,.98,.065,3.89,0x887f73,null,"stone");
        }else{
          path(dock.station.x-.9,dock.station.z,dock.x+2.05,dock.z,7.0);
        }
        const sin=Math.abs(Math.sin(dock.yaw)),cos=Math.abs(Math.cos(dock.yaw));
        const obstruction=collider(dock.x,dock.z,3.7*cos+6*sin,6*cos+3.7*sin,dock.y+3.7,dock.y);
        obstruction.floorY=dock.y;
        colliders.push(obstruction);
      }
      // Continue two full courses out from the avenue's west edge to the warp console.
      const junctionZ=avenueStartZ-Math.round((avenueStartZ-warpGate.station.z)/avenueRow)*avenueRow;
      const west=warpGate.console.x-.45,east=-avenueWidth/2,centerX=(west+east)/2;
      path(centerX,junctionZ+avenueRow,centerX,junctionZ-avenueRow,east-west);
      // The molten beds are kept clear of the promenade, doors and yacht pads.
      for(const side of [-1,1]){
        vent(side*4.9,17.2,.45,2);
        vent(side*4.9,13.6,.40,.65);
        vent(side*4.9,8.2,.40,1.0);
        vent(side*4.9,3,.45,3.3);
        vent(side<0?-26.3:25.8,side<0?-23.5:-18,1,2.4);
        vent(side*27,-42,1,2.4);
        vent(side*25.5,-48,1,2.2);
        vent(side*9,side<0?-1.2:-4.4,2.2,1.6);
        vent(side*2.2,-45,1.4,2.1);
        vent(side*7.5,-26,.8,1.35);
        vent(side<0?-25:19.5,side<0?-14.5:-3.8,1.7,2.4);
      }
      vent(-20.4,22.8,2,2.4);
      vent(20.4,22.8,2,2.4);
      // A named threshold marks the transition from the caldera into the street.
      for(const side of [-1,1]){
        box(side*5.4,1.9,19.5,.30,3.8,.36,dark);
        box(side*5.4,1.88,19.72,.09,3.50,.045,red,null,"light");
        colliders.push(collider(side*5.4,19.5,.36,.42,3.8));
      }
      box(0,3.95,19.5,11.12,.35,.40,dark);
      roofs.push(collider(0,19.5,11.12,.40,4.13,3.77));
      const canvas=document.createElement("canvas");
      canvas.width=1024;canvas.height=128;
      const ctx=canvas.getContext("2d");
      ctx.fillStyle="#30282d";ctx.fillRect(0,0,1024,128);
      ctx.fillStyle="#fff4dd";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.font='700 64px "Malgun Gothic",sans-serif';
      ctx.fillText("HLB 브랜드 거리",512,64,970);
      const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
      const sign=new T.Mesh(new T.PlaneGeometry(4.8,.6),new T.MeshBasicMaterial({map,toneMapped:false}));
      sign.name="HLB 브랜드 거리 입구";
      sign.position.set(0,3.95,19.73);site.add(sign);

      for(let i=0;i<94;i++){
        const a=TAU*i/94+random()*.035,scale=1+random()*2.3;
        const x=Math.sin(a)*(33+random()*10),z=Math.cos(a)*(47+random()*11)-10;
        if(x>27 && z>-72 && z<46)continue;
        const clearance=scale*1.4+1;
        if(x< -24 && x> -69 && z> -35 && z<12)continue;
        if(nearestHillPath({x,z}).distance<clearance+historyHill.pathWidth/2)continue;
        if(spaces.some(({interior:b})=>x>b.minX-clearance && x<b.maxX+clearance &&
          z>b.minZ-clearance && z<b.maxZ+clearance)) continue;
        outcrop(x,z,scale,false);
      }
      for(let i=0;i<430;i++){
        const x=random()*54-27,z=random()*80-52;
        if(Math.abs(x)<6 || Math.hypot(x,z-plaza.z)<27 ||
          nearestHillPath({x,z}).distance<historyHill.pathWidth/2+.5 ||
          (x>warpGate.x-3.5 && x<warpGate.station.x+1.2 && z>20 && z<27) ||
          yachtDocks.some(dock=>Math.abs(x-dock.x)<4 && Math.abs(z-dock.z)<4) || spaces.some(({interior:b})=>
          x>b.minX-.6 && x<b.maxX+.6 && z>b.minZ-.6 && z<b.maxZ+.6)) continue;
        const s=.08+random()*.21;
        place("rock",choose(basalt),x,s*.16,z,s,.36*s,s*(.75+random()),[.06,random()*TAU,.05],"stone");
      }
      // Lamps repeat between the entrances without narrowing any door approach.
      const lampPositions=[];
      for(const side of [-1,1]) for(const z of [14,8,2]) lampPositions.push([side*3.85,z]);
      for(const degrees of [105,120,150,180,210,240,255]){
        const a=degrees*Math.PI/180;
        lampPositions.push([Math.sin(a)*11.5,-22+Math.cos(a)*11.5]);
      }
      for(const [x,z] of lampPositions){
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
          p.position.set(summit.x+.9-age*5.1-age*age*8+Math.sin(age*8)*.85,20.2+age*12.5,summit.z+1.1*age);
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
    const hallKit={T,site,box,place,tube,collider,colliders,roofs};
    const placements={
      group:[0,-22.4,0], brand:[-20,-31,Math.atan2(6.5,9)], product:[20,-31,-Math.atan2(6.5,9)],
      ir:[-15,-41,Math.atan2(5.454,9.454)], esg:[15,-41,-Math.atan2(5.454,9.454)]
    };
    for(const hall of halls) spaces.push(buildAt(()=>globalThis.HLBHalls.build(hallKit,hall),...placements[hall.id]));
    spaces.push(buildAt(()=>globalThis.HLBCologneGallery.build(hallKit),5.5,11));
    spaces.push(buildAt(()=>globalThis.HLBCafe.build(hallKit),-5.5,11));
    spaces.push(buildAt(()=>globalThis.HLBHistoryHall.build(hallKit),historyHill.hall.x,historyHill.hall.z,0,historyHill.height));
    const warpGate=globalThis.HLBWarpGate.build(hallKit);
    const lavaRiver=makeLavaRiver();
    makeHistoryHill();
    siteDetail();
    triangles("Basalt vent rims",ventVerts,ventColors,mountainMaterial);
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
      warpGate.update(dt,reducedMotion);
      lavaRiver.update(dt,reducedMotion);
      if (reducedMotion) {
        summitLogo.rotation.y=0;
        return;
      }
      // Negative yaw is clockwise when the caldera is viewed from above.
      angle=(angle+Math.max(0,dt)*TAU/22)%TAU;
      summitLogo.rotation.y=-angle;
      updateAtmosphere(dt);
    }
    return {spaces,colliders,cameraColliders:[...colliders,...roofs],bounds,district,plaza,yachtDocks,warpGate,lavaRiver,lavaLights,containsPoint,
      groundHeight,isWalkablePoint,walkSurfaces,historyHill,
      spawn:{x:0,z:23},update};
  }
  globalThis.HLBWorld3D={build,containsPoint};
})();
