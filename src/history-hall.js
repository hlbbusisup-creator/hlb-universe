(() => {
  "use strict";

  function build(kit) {
    const {T,site,collider,colliders,roofs}=kit;
    const width=14,depth=11.5,half=width/2,mid=-depth/2,top=3.8;
    const red=0xef4136,ink=0x342c2d,cream=0xeee3d2,brass=0xb39773;
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

    // A low archive pavilion: restrained stone, a red book-spine facade and a
    // projecting nameplate all stay below the shared 4.3 m roofline.
    box(0,.014,mid,width+.3,.12,depth+.28,ink,null,"stone");
    box(0,.083,mid,width-.14,.052,depth-.06,0xd7c8b3,null,"stone");
    box(0,top/2,-depth,width,top,.20,cream);solid(0,-depth,width,.24,top);
    for(const side of [-1,1]) {
      box(side*(half-.08),top/2,mid,.20,top,depth,cream);
      solid(side*(half-.08),mid,.24,depth,top);
      const wing=half-1.65,center=side*(1.65+wing/2);
      box(center,top/2,0,wing,top,.20,cream);solid(center,0,wing,.24,top);
      for(let index=0;index<3;index++)box(side*(half-1.3+index*.32),1.95,.13,.10,3.12,.11,red);
      box(side*1.62,1.88,.12,.13,3.76,.22,ink);
      box(side*1.43,3.58,.25,.04,.24,.30,brass);
    }
    box(0,3.88,mid,width+.42,.20,depth+.42,ink);
    box(0,4.08,mid,width+.62,.20,depth+.62,cream);
    box(0,4.255,mid,width+.44,.09,depth+.43,brass);
    roofs.push(collider(0,mid,width+.62,depth+.62,4.30,3.78));
    box(0,3.38,.40,4.45,.82,.15,ink);
    const sign=plate("HLB 역사관",0,3.38,.485,4.28,.72,["HLB 역사관","HISTORY OF HLB"]);
    sign.userData.wayfindingSign={width:4.28,height:.72};
    for(const side of [-1,1]) {
      box(side*1.54,1.85,.11,.055,3.54,.025,0xffd8b5,null,"light");
      box(side*4.2,3.76,mid,.065,.025,depth-1.1,0xffe4c2,null,"light");
    }

    // The central altar holds a closed book; its cover matches the reading UI.
    const altarZ=-5.2,bookStation={x:0,z:altarZ+1.35};
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

    const screenWidth=5.44,screenHeight=3.06,screenY=2.08,screenZ=-depth+.16;
    box(0,screenY,screenZ-.06,screenWidth+.18,screenHeight+.18,.13,ink);
    const screen=plate("History cinema screen",0,screenY,screenZ+.016,screenWidth,screenHeight,
      ["GI 선포식","Human Life Better · HLB"],"#2e2526","#EF4136");
    screen.userData.historyProjection=true;
    plate("GI screening caption",0,.31,screenZ+.027,3.3,.18,"GI 선포식  ·  영상 관람","#eee3d2","#543e32");
    const projector={x:0,y:3.46,z:altarZ-.8};
    box(0,3.64,projector.z,.065,.32,.065,ink);
    box(0,3.43,projector.z,.72,.30,.53,0xd9d9d3);
    kit.place("round",ink,0,3.43,projector.z-.30,.15,.12,.15,[Math.PI/2,0,0],"steel");
    kit.place("round",0xffedcc,0,3.43,projector.z-.37,.116,.018,.116,[Math.PI/2,0,0],"light");
    const coneGeometry=new T.BufferGeometry();
    coneGeometry.setAttribute("position",new T.Float32BufferAttribute([
      0,3.43,projector.z-.38,
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
    const filmStation={x:0,z:-7.9};
    const viewingMark=mesh("History cinema viewing point",new T.RingGeometry(.42,.47,40),
      new T.MeshBasicMaterial({color:red,toneMapped:false,side:T.DoubleSide}),filmStation.x,.116,filmStation.z);
    viewingMark.rotation.x=-Math.PI/2;
    return {id:"history",title:"HLB 역사관",x:0,z:0,
      station:bookStation,lookAt:{x:0,z:altarZ},label:{x:0,y:4.45,z:.5},
      interior:{minX:-half,maxX:half,minZ:-depth,maxZ:.50,ceilingY:top-.08},
      exhibits:[
        {id:"history-book",title:"HLB 역사책",station:bookStation,lookAt:{x:0,z:altarZ},
          hitBox:{minX:-.8,maxX:.8,minY:1.0,maxY:1.27,minZ:altarZ-.56,maxZ:altarZ+.56}},
        {id:"history-film",title:"GI 선포식",station:filmStation,lookAt:{x:0,z:screenZ},
          hitBox:{minX:-screenWidth/2-.06,maxX:screenWidth/2+.06,
            minY:screenY-screenHeight/2-.05,maxY:screenY+screenHeight/2+.05,minZ:screenZ-.06,maxZ:screenZ+.12}}
      ],
      projection:{screen,beam,screenWidth,screenHeight,projector,
        cameraPosition:{x:0,y:screenY,z:filmStation.z-.30},lookAt:{x:0,y:screenY,z:screenZ},station:filmStation},
      book:{cover},object:group};
  }
  globalThis.HLBHistoryHall={build};
})();
