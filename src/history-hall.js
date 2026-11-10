(() => {
  "use strict";

  function build(kit) {
    const {T,site,collider,colliders,roofs}=kit;
    const width=18,depth=13.5,half=width/2,mid=-depth/2,top=4.16;
    const red=0xef4136,ink=0x342c2d,cream=0xeee3d2,brass=0xb39773;
    const timber=0x633731,paintedRed=0xa54235,teal=0x255c55,jade=0x62836b,gold=0xc4a164;
    const group=new T.Group();group.name="HLB 역사관";group.userData.hallId="history";
    group.userData.nightEntrance={x:0,z:0,yaw:0};site.add(group);
    const box=(...args)=>kit.box(...args);
    const solid=(x,z,w,d,h,base=0)=>colliders.push(collider(x,z,w,d,h,base));
    function mesh(name,geometry,material,x,y,z) {
      const object=new T.Mesh(geometry,material);object.name=name;object.position.set(x,y,z);
      object.castShadow=!material.transparent&&!material.isMeshBasicMaterial;
      object.receiveShadow=true;group.add(object);return object;
    }
    function plate(name,x,y,z,w,h,lines,background="#342c2d",color="#fff4e5") {
      const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=Math.round(1024*h/w);
      const ctx=canvas.getContext("2d"),ch=canvas.height;
      ctx.fillStyle=background;ctx.fillRect(0,0,1024,ch);
      ctx.fillStyle=color;ctx.textAlign="center";ctx.textBaseline="middle";
      const titles=Array.isArray(lines)?lines:[lines];
      titles.forEach((line,index)=>{
        const size=titles.length===1?ch*.54:index===0?ch*.39:ch*.17;
        ctx.font=`${index===0?"700":"500"} ${Math.min(120,size)}px "Malgun Gothic",Arial,sans-serif`;
        const baseline=titles.length===1 ? .51 : index===0 ? .38 : .78;
        ctx.fillText(line,512,ch*baseline,960);
      });
      const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
      return mesh(name,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,toneMapped:false}),x,y,z);
    }

    // A broad single-storey Korean palace-inspired hall. The stone platform
    // sits below the floor datum; the central entrance stays step-free.
    box(0,-.36,mid,width+1.1,.72,depth+1.0,0x77746d,null,"stone");
    box(0,-.075,mid,width+1.28,.15,depth+1.15,0xb7afa0,null,"stone");
    box(0,.014,mid,width+.3,.12,depth+.28,0xbdb09a,null,"stone");
    box(0,.083,mid,width-.14,.052,depth-.06,0xd7c8b3,null,"stone");
    box(0,.025,.96,4.45,.05,1.9,0xbdb09a,null,"stone");
    for(const side of [-1,1])for(let i=0;i<7;i++) {
      box(side*(2.75+i*.93),-.34,.61,.87,.43,.06,0x969084,null,"stone");
      box(side*(half+.56),-.34,-1.1-i*1.72,.06,.43,1.64,0x969084,null,"stone");
    }
    box(0,top/2,-depth,width,top,.20,cream);solid(0,-depth,width,.24,top);
    for(const side of [-1,1]) {
      box(side*(half-.08),top/2,mid,.20,top,depth,cream);
      solid(side*(half-.08),mid,.24,depth,top);
      const wing=half-2.25,center=side*(2.25+wing/2);
      box(center,top/2,0,wing,top,.20,cream);solid(center,0,wing,.24,top);
    }
    function pillar(x,z) {
      kit.place("round",0xb8ad98,x,.16,z,.34,.26,.34,null,"stone");
      kit.place("round",paintedRed,x,2.19,z,.22,3.80,.22,null,"steel");
      kit.place("round",timber,x,4.11,z,.28,.18,.28,null,"steel");
      for(let tier=0;tier<3;tier++) {
        box(x,4.20+tier*.17,z,.68+tier*.20,.13,.62,teal);
        box(x,4.22+tier*.17,z,.30,.09,.84+tier*.19,jade);
        box(x,4.24+tier*.17,z+.32,.40+tier*.13,.045,.04,gold);
      }
      solid(x,z,.55,.55,4.18);
    }
    const bays=[-9,-6.75,-4.5,-2.25,2.25,4.5,6.75,9];
    for(const x of bays)pillar(x,.12);
    // Rear pillars stay on the exterior side of the wall, clear of the screen.
    for(const x of [-9,-4.5,0,4.5,9])pillar(x,-depth-.24);
    for(const side of [-1,1])for(const z of [-4.5,-9])pillar(side*half,z);
    // Paper lattice screens are divided into visible timber bays. The geometry
    // is instanced with the rest of the village, including the small lattice.
    function lattice(cx,cz,span,yaw=0) {
      const c=Math.cos(yaw),s=Math.sin(yaw);
      const block=(dx,y,dz,w,h,d,color)=>box(cx+dx*c+dz*s,y,cz-dx*s+dz*c,w,h,d,color,[0,yaw,0]);
      block(0,1.97,0,span,2.68,.11,teal);
      block(0,1.99,.065,span-.16,2.44,.025,0xd6c4a5);
      for(let i=0;i<8;i++)block((i/7-.5)*(span-.17),1.99,.095,.038,2.44,.034,teal);
      for(let i=0;i<9;i++)block(0,.81+i*.294,.101,span-.17,.034,.035,teal);
      block(0,.57,.09,span,.20,.15,timber);
      block(0,3.39,.09,span,.13,.17,paintedRed);
      block(0,3.53,.09,span,.06,.18,gold);
    }
    for(const side of [-1,1]) {
      for(const x of [3.375,5.625,7.875])lattice(side*x,.15,1.96);
      for(const z of [-2.25,-6.75,-11.25])lattice(side*(half+.055),z,3.85,side*Math.PI/2);
      box(0,4.05,side>0?.10:-depth,width+.48,.22,.30,timber);
      box(0,4.29,side>0?.12:-depth,width+.70,.22,.44,teal);
      box(0,4.40,side>0?.36:-depth-.24,width+.70,.055,.035,gold);
      box(side*half,4.05,mid,.30,.22,depth,timber);
      box(side*half,4.29,mid,.44,.22,depth+.7,teal);
      if(side===1)for(const z of [-2.1,-6.75,-11.4]) {
        box(0,4.21,z,width-.30,.26,.21,teal);
        box(0,4.08,z,width-.40,.035,.23,paintedRed);
      }
    }
    box(0,3.66,.43,4.77,.97,.20,timber);
    box(0,3.66,.543,4.59,.83,.025,gold);
    const sign=plate("HLB 역사관",0,3.66,.562,4.44,.72,["HLB 역사관","HISTORY OF HLB"],"#25483e","#f4d69b");
    sign.userData.wayfindingSign={width:4.44,height:.72};
    for(const side of [-1,1]) {
      box(side*2.12,2.06,.14,.045,3.86,.025,0xffd8b5,null,"light");
      box(side*5.2,4.04,mid,.055,.025,depth-1.1,0xffe4c2,null,"light");
    }

    function palaceRoof() {
      const vertices=[],colors=[],seams=[],shade=new T.Color();
      const ridgeHalf=6.3,upperDepth=4.1,eaveHalf=10.4,eaveDepth=8.1;
      function tri(a,b,c,color) {
        shade.setHex(color);
        for(const p of [a,b,c]){vertices.push(...p);colors.push(shade.r,shade.g,shade.b);}
      }
      const line=(a,b)=>seams.push(a[0],a[1]+.014,a[2],b[0],b[1]+.014,b[2]);
      const roofShade=(i,j)=>[0x414a4d,0x465154,0x4b5558,0x394448][(i*3+j)%4];
      // Upper gables and the lower hips join at the same four corners. The
      // cubic profiles flatten into upturned eaves instead of straight wedges.
      function upper(side,u,t) {
        return [(u*2-1)*ridgeHalf,7.73-1.82*t+.27*t*t*t,mid+side*upperDepth*t];
      }
      function hip(side,u,t,lower=false) {
        const hx=lower?T.MathUtils.lerp(8.6,9.98,t):T.MathUtils.lerp(ridgeHalf,eaveHalf,t);
        const hz=lower?T.MathUtils.lerp(6.45,7.73,t):T.MathUtils.lerp(upperDepth,eaveDepth,t);
        const curve=lower?4.91-.72*t+.28*t*t*t:6.18-1.78*t+.58*t*t*t;
        const y=curve+(lower ? .22 : .33)*Math.pow(Math.abs(u*2-1),6)*Math.pow(t,3);
        if(side===0)return [(u*2-1)*hx,y,mid+hz];
        if(side===1)return [hx,y,mid+(1-u*2)*hz];
        if(side===2)return [(1-u*2)*hx,y,mid-hz];
        return [-hx,y,mid+(u*2-1)*hz];
      }
      function surface(point,columns,rows,lower=false) {
        for(let i=0;i<columns;i++)for(let j=0;j<rows;j++) {
          const a=point(i/columns,j/rows),b=point((i+1)/columns,j/rows),
            c=point(i/columns,(j+1)/rows),d=point((i+1)/columns,(j+1)/rows);
          const color=lower?(j===rows-1?0x38574d:0x485253):roofShade(i,j);
          tri(a,c,b,color);tri(b,c,d,color);
          if(!lower)line(a,c);
          if(j===rows-1)line(c,d);
        }
      }
      for(const side of [-1,1])surface((u,t)=>upper(side,u,t),50,9);
      for(let side=0;side<4;side++) {
        surface((u,t)=>hip(side,u,t),side%2?42:64,10);
        surface((u,t)=>hip(side,u,t,true),side%2?26:34,3,true);
        // The exposed rafter ends and double fascia bands give the eaves depth.
        const count=side%2?28:38;
        for(let i=0;i<=count;i++) {
          const u=i/count,a=hip(side,u,.80,true),b=hip(side,u,1,true);
          kit.tube([a[0],a[1]-.10,a[2]],[b[0],b[1]-.10,b[2]],.065,0xadc0a0,"steel");
        }
        for(let i=0;i<24;i++) {
          const a=hip(side,i/24,1),b=hip(side,(i+1)/24,1);
          kit.tube([a[0],a[1]-.065,a[2]],[b[0],b[1]-.065,b[2]],.085,teal,"steel");
          kit.tube([a[0],a[1]-.14,a[2]],[b[0],b[1]-.14,b[2]],.035,gold,"steel");
        }
      }
      // The white gable fields, timber outlines, four hips and restrained
      // ridge caps make the hipped-and-gabled silhouette readable from afar.
      for(const side of [-1,1]) {
        const x=side*(ridgeHalf+.012),a=[x,6.18,mid-upperDepth],b=[x,7.73,mid],c=[x,6.18,mid+upperDepth];
        tri(a,b,c,0xe0cdb1);
        kit.tube(a,b,.105,teal,"steel");kit.tube(b,c,.105,teal,"steel");
        kit.tube(a,c,.10,paintedRed,"steel");
        for(let i=-3;i<=3;i++) {
          const z=mid+i*.86,y=7.73-Math.abs(i*.86)/upperDepth*1.55;
          kit.tube([x,6.23,z],[x,y-.12,z],.035,timber,"steel");
        }
        for(const front of [-1,1])for(let j=0;j<12;j++) {
          const a=hip(front>0?0:2,side>0?1:0,j/12),b=hip(front>0?0:2,side>0?1:0,(j+1)/12);
          kit.tube([a[0],a[1]+.055,a[2]],[b[0],b[1]+.055,b[2]],.12,0x657170,"steel");
        }
      }
      for(let i=0;i<40;i++) {
        const x=-ridgeHalf+i*(ridgeHalf*2/40);
        kit.tube([x,7.80,mid],[x+ridgeHalf*2/40,7.80,mid],.16,0x737d79,"steel");
      }
      for(const side of [-1,1]) {
        box(side*ridgeHalf,7.83,mid,.27,.30,.38,0x737d79);
        kit.tube([side*ridgeHalf,7.86,mid],[side*(ridgeHalf+.22),7.94,mid],.075,0x737d79,"steel");
      }
      const geometry=new T.BufferGeometry();geometry.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
      geometry.setAttribute("color",new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
      const roof=mesh("History palace · curved paljak roof",geometry,
        new T.MeshStandardMaterial({vertexColors:true,roughness:.86,side:T.DoubleSide,flatShading:true}),0,0,0);
      const seamGeometry=new T.BufferGeometry();seamGeometry.setAttribute("position",new T.Float32BufferAttribute(seams,3));
      const tileLines=new T.LineSegments(seamGeometry,new T.LineBasicMaterial({color:0x88918b,transparent:true,opacity:.45}));
      tileLines.name="History palace · curved tile seams";group.add(tileLines);
      roofs.push(collider(0,mid,eaveHalf*2,eaveDepth*2,8.05,4.08));
      return {roof,tileLines,eaveHalf,eaveDepth};
    }
    const palace=palaceRoof();

    // The central altar holds a closed book; its cover matches the reading UI.
    const altarZ=-6.0,bookStation={x:0,z:altarZ+1.35};
    box(0,.16,altarZ,2.40,.24,1.74,ink,null,"stone");
    box(0,.57,altarZ,1.92,.66,1.35,0xcbb99c,null,"stone");
    box(0,.94,altarZ,2.24,.13,1.62,cream,null,"stone");
    box(0,.995,altarZ,2.05,.015,1.42,brass);
    solid(0,altarZ,2.4,1.74,1.27);
    box(0,1.04,altarZ,1.52,.05,1.03,red);
    box(.035,1.115,altarZ,1.38,.11,.94,0xfaf3df);
    box(0,1.19,altarZ,1.52,.055,1.03,red);
    box(-.73,1.11,altarZ,.095,.19,1.03,0xce302a);
    for(let line=0;line<3;line++)box(.04,1.08+line*.028,altarZ+.476,1.34,.007,.009,0xc8bfae);
    const cover=plate("History of HLB · closed book",0,1.223,altarZ,1.40,.91,
      ["History of HLB","HLB GROUP ARCHIVE"],"#f8eedb","#EF4136");
    cover.rotation.x=-Math.PI/2;
    for(const side of [-1,1])box(side*.65,1.225,altarZ,.014,.008,.80,red);
    box(0,1.225,altarZ-.38,1.30,.008,.014,red);
    box(0,1.225,altarZ+.38,1.30,.008,.014,red);
    plate("History altar caption",0,.68,altarZ+.686,1.44,.25,"HLB의 발자취","#cbb99c","#543e32");

    // Shelves are a physical archive motif; the historical facts live in the
    // linked book, rather than invented dates or milestones on the scenery.
    for(const side of [-1,1]) {
      const sx=side*(half-.54),shelfZ=mid+.4;
      box(sx,1.42,shelfZ,.45,2.54,5.8,ink);solid(sx,shelfZ,.53,5.86,2.73);
      for(let level=0;level<3;level++) {
        const y=.45+level*.79;
        box(sx-side*.05,y,shelfZ,.47,.055,5.7,brass);
        for(let book=0;book<14;book++) {
          const zz=shelfZ-2.55+book*.39,hh=.43+(book%3)*.075;
          box(sx-side*.10,y+hh/2+.035,zz,.32,hh,.27,[red,0xe5d5bb,0x8e5550,0x544848][(book+level)%4]);
        }
      }
    }

    const screenWidth=5.8,screenHeight=3.2625,screenY=2.2,screenZ=-depth+.16;
    box(0,screenY,screenZ-.06,screenWidth+.18,screenHeight+.18,.13,ink);
    const screen=plate("History cinema screen",0,screenY,screenZ+.016,screenWidth,screenHeight,
      ["GI 선포식","Human Life Better · HLB"],"#2e2526","#EF4136");
    screen.userData.historyProjection=true;
    plate("GI screening caption",0,.31,screenZ+.027,3.3,.18,"GI 선포식  ·  영상 관람","#eee3d2","#543e32");
    const projector={x:0,y:3.87,z:altarZ-.8};
    box(0,4.02,projector.z,.065,.20,.065,ink);
    box(0,projector.y,projector.z,.72,.30,.53,0xd9d9d3);
    kit.place("round",ink,0,projector.y,projector.z-.30,.15,.12,.15,[Math.PI/2,0,0],"steel");
    kit.place("round",0xffedcc,0,projector.y,projector.z-.37,.116,.018,.116,[Math.PI/2,0,0],"light");
    const coneGeometry=new T.BufferGeometry();
    coneGeometry.setAttribute("position",new T.Float32BufferAttribute([
      0,projector.y,projector.z-.38,
      -screenWidth/2,screenY-screenHeight/2,screenZ+.035,
      screenWidth/2,screenY-screenHeight/2,screenZ+.035,
      screenWidth/2,screenY+screenHeight/2,screenZ+.035,
      -screenWidth/2,screenY+screenHeight/2,screenZ+.035
    ],3));
    coneGeometry.setIndex([0,1,2,0,2,3,0,3,4,0,4,1]);coneGeometry.computeVertexNormals();
    const beam=mesh("History projector beam",coneGeometry,new T.MeshBasicMaterial({color:0xffe9c9,
      transparent:true,opacity:.025,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,toneMapped:false}),0,0,0);
    // Standing room replaces every bench. The central viewing point is on the
    // screen side of the altar, beyond the separate book interaction radius.
    const filmStation={x:0,z:-9.4};
    const viewingMark=mesh("History cinema viewing point",new T.RingGeometry(.42,.47,40),
      new T.MeshBasicMaterial({color:red,toneMapped:false,side:T.DoubleSide}),filmStation.x,.116,filmStation.z);
    viewingMark.rotation.x=-Math.PI/2;
    return {id:"history",title:"HLB 역사관",x:0,z:0,
      station:bookStation,lookAt:{x:0,z:altarZ},label:{x:0,y:4.45,z:.5},
      floorY:0,interior:{minX:-half,maxX:half,minZ:-depth,maxZ:.50,floorY:0,ceilingY:4.08},
      exhibits:[
        {id:"history-book",title:"HLB 역사책",station:bookStation,lookAt:{x:0,z:altarZ},
          hitBox:{minX:-.8,maxX:.8,minY:1.0,maxY:1.27,minZ:altarZ-.56,maxZ:altarZ+.56}},
        {id:"history-film",title:"GI 선포식",station:filmStation,lookAt:{x:0,z:screenZ},
          hitBox:{minX:-screenWidth/2-.06,maxX:screenWidth/2+.06,
            minY:screenY-screenHeight/2-.05,maxY:screenY+screenHeight/2+.05,minZ:screenZ-.06,maxZ:screenZ+.12}}
      ],
      projection:{screen,beam,screenWidth,screenHeight,projector,
        cameraPosition:{x:0,y:screenY,z:filmStation.z-.30},lookAt:{x:0,y:screenY,z:screenZ},station:filmStation},
      book:{cover},palace,object:group};
  }
  globalThis.HLBHistoryHall={build};
})();
