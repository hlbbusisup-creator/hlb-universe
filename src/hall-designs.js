(() => {
  "use strict";

  const magma = 0xef4136, cream = 0xf5ead4, brass = 0xb58b56;
  const themes = {
    group:   {floor:0xddd2b8, frame:0x336266, wall:0x477273, sign:"#234c50"},
    brand:   {floor:0xe6d5c3, frame:0x862e32, wall:0xf4ddc7, sign:"#7c2730"},
    product: {floor:0xd3dfe1, frame:0x395768, wall:0xe2eaea, sign:"#294552"},
    ir:      {floor:0xc9b59d, frame:0x524439, wall:0xd4c2a5, sign:"#443d35"},
    esg:     {floor:0xc0b998, frame:0x356252, wall:0x789483, sign:"#294c3e"}
  };
  const repositoryCovers = new Map();

  function build(kit, hall) {
    const {T,site,collider,colliders,roofs} = kit;
    const {width,depth} = hall;
    const half=width/2, mid=-depth/2, back=-depth;
    const theme=themes[hall.id], top=3.8;
    const entry=1.55, wing=half-entry;
    const group=new T.Group();
    group.name=hall.title;
    group.userData.hallId=hall.id;
    group.userData.nightEntrance={x:0,z:0,yaw:0};
    group.position.set(hall.x,0,hall.front);
    site.add(group);

    function box(x,y,z,w,h,d,color,rotation=null,finish="steel") {
      kit.box(hall.x+x,y,hall.front+z,w,h,d,color,rotation,finish);
    }
    function form(shape,x,y,z,sx,sy,sz,color,rotation=null,finish="steel") {
      kit.place(shape,color,hall.x+x,y,hall.front+z,sx,sy,sz,rotation,finish);
    }
    function tube(start,end,r,color,finish) {
      kit.tube([start[0]+hall.x,start[1],start[2]+hall.front],
        [end[0]+hall.x,end[1],end[2]+hall.front],r,color,finish);
    }
    function solid(x,z,w,d,h) { colliders.push(collider(hall.x+x,hall.front+z,w,d,h)); }
    function mesh(name,geometry,material,x,y,z) {
      const object=new T.Mesh(geometry,material);
      object.name=name;
      object.position.set(x,y,z);
      object.castShadow=!material.transparent && !material.isMeshBasicMaterial;
      object.receiveShadow=true;
      group.add(object);
      return object;
    }
    const enamel = color=>new T.MeshStandardMaterial({color,roughness:.64});
    const glazing = new T.MeshStandardMaterial({color:hall.id==="esg" ? 0x94d8ba : 0xa9d6d6,
      transparent:true,opacity:hall.id==="esg" ? .21 : .32,side:T.DoubleSide,depthWrite:false,roughness:.32});
    glazing.userData.nightWindow=true;
    function pane(x,y,z,w,h,yaw=0) {
      const panel=mesh("Glazing",new T.PlaneGeometry(w,h),glazing,x,y,z);
      panel.rotation.y=yaw;
      return panel;
    }
    function sign(x,y,z,w,h,title,subtitle,background=theme.sign,yaw=0) {
      const canvas=document.createElement("canvas");
      canvas.width=768;canvas.height=Math.round(768*h/w);
      const ctx=canvas.getContext("2d"),ch=canvas.height;
      ctx.fillStyle=background;ctx.fillRect(0,0,768,ch);
      ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#fff9e9";
      ctx.font='700 '+Math.round(Math.min(116,ch*(subtitle ? .51 : .66)))+'px "Malgun Gothic",sans-serif';
      ctx.fillText(title,384,ch*(subtitle ? .36 : .49),727);
      if(subtitle){
        ctx.fillStyle="#efe2c6";
        ctx.font='600 '+Math.round(Math.min(43,ch*.20))+'px Arial,"Malgun Gothic",sans-serif';
        ctx.fillText(subtitle,384,ch*.77,723);
      }
      const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
      mesh(title,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,toneMapped:false}),x,y,z).rotation.y=yaw;
    }
    function cover(x,y,z,w,h,file) {
      box(x,y,z,w+.11,h+.11,.085,brass);
      const mat=new T.MeshBasicMaterial({color:cream,toneMapped:false});
      mesh(file,new T.PlaneGeometry(w,h),mat,x,y,z+.05);
      if(typeof document.createElementNS==="function"){
        if(!repositoryCovers.has(file)){
          const texture=new T.TextureLoader().load("assets/exhibits/"+file+".jpg");
          texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
          repositoryCovers.set(file,texture);
        }
        mat.color.set(0xffffff);mat.map=repositoryCovers.get(file);
      }
    }
    function beam(x1,y1,x2,y2,z,height,d,color) {
      box((x1+x2)/2,(y1+y2)/2,z,Math.hypot(x2-x1,y2-y1),height,d,color,
        [0,0,Math.atan2(y2-y1,x2-x1)]);
    }
    function ring(name,x,y,z,r,thickness,color,rx=0,ry=0) {
      const hoop=mesh(name,new T.TorusGeometry(r,thickness,7,44),enamel(color),x,y,z);
      hoop.rotation.set(rx,ry,0);
      return hoop;
    }
    function suspendedSign(z=0.22,y=top-.27,w=3.5) {
      box(0,y,z,w+.12,.75,.12,theme.frame);
      sign(0,y,z+.068,w,.68,hall.title,hall.en);
    }
    function wallPair(glass,frontGlass) {
      box(0,top/2,back,width,top,.18,theme.wall);
      solid(0,back,width,.22,top);
      for(const side of [-1,1]){
        const edge=side*(half-.08), center=side*(entry+wing/2);
        solid(edge,mid,.19,depth,top);
        solid(center,0,wing,.21,top);
        if(glass){
          box(edge,.28,mid,.18,.54,depth,theme.frame);
          pane(edge,top/2+.17,mid,depth-.07,top-.42,side*Math.PI/2);
          for(let k=0;k<=4;k++)box(edge,top/2,back+k*depth/4,.12,top,.09,theme.frame);
        }else{
          box(edge,top/2,mid,.17,top,depth,theme.wall);
        }
        if(frontGlass){
          box(center,.28,0,wing,.53,.17,theme.frame);
          pane(center,top/2+.14,0,wing-.05,top-.36);
          for(let k=0;k<=3;k++)box(side*(entry+k*wing/3),top/2,0,.085,top,.13,theme.frame);
        }else{
          box(center,top/2,0,wing,top,.18,theme.wall);
        }
      }
    }
    function consoleDesk(tint) {
      box(0,.57,back+1.03,2.35,.89,.61,theme.frame);
      box(0,1.05,back+1.03,2.61,.11,.78,tint);
      box(0,1.15,back+1.04,.76,.07,.42,0xe4d5bc,[-.18,0,0]);
      solid(0,back+1.03,2.62,.80,1.2);
    }
    function compassHall() {
      wallPair(true,true);
      const jade=theme.frame;
      for(const side of [-1,1]){
        for(let k=0;k<7;k++){
          const x=side*(entry+.22+k*(wing-.44)/6);
          box(x,1.63,.13,.043,2.16,.13,brass);
        }
      }
      // An elliptical drum and graduated eaves give the directory its low rotunda silhouette.
      box(0,top-.01,mid,width,.12,depth,0x477273);
      for(const [z,h,dx,dz,c] of [[top,.22,half+.53,depth*.58,jade],
        [top+.16,.12,half+.45,depth*.56,brass],[top+.31,.21,half+.17,depth*.52,cream],
        [top+.45,.10,half-.26,depth*.48,0x658b83]]){
        form("round",0,z,mid,dx,h,dz,c);
      }
      // The compass is inset into the facade beneath the shared roofline.
      const cx=-half+1.18,cy=top-.72,cz=.30;
      ring("Compass rose",cx,cy,cz,.50,.043,brass);
      ring("Compass bezel",cx,cy,cz,.42,.020,cream);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4, dx=Math.sin(a),dy=Math.cos(a);
        tube([cx+dx*.35,cy+dy*.35,cz],[cx+dx*.45,cy+dy*.45,cz],.018,cream);
      }
      for(const side of [-1,1])form("crystal",cx+side*.10,cy+side*.17,cz+.03,.075,.25,.042,
        side<0?cream:magma,[0,0,-.5]);
      suspendedSign(.31,top-.33);
      // The lobby plan follows the three facing pairs along the exhibition street.
      const gx=-half+1.32,gz=back+1.67;
      form("round",gx,.18,gz,.84,.24,.84,jade);
      form("round",gx,.67,gz,.29,.78,.29,brass);
      mesh("Atlas globe",new T.SphereGeometry(.71,24,16),enamel(0x83b4aa),gx,1.72,gz);
      for(const y of [-.38,0,.38])ring("Latitude",gx,1.72+y,gz,Math.sqrt(.715**2-y*y),.014,cream,Math.PI/2);
      for(const ry of [0,Math.PI/3,2*Math.PI/3])ring("Longitude",gx,1.72,gz,.72,.012,cream,0,ry);
      ring("Globe gimbal",gx,1.72,gz,.81,.041,brass,0,.28).rotation.z=.28;
      solid(gx,gz,1.7,1.7,1.4);
      box(0,1.86,back+.14,4.1,2.45,.12,jade);
      sign(0,2.70,back+.207,3.54,.52,"유니버스 안내도","",theme.sign);
      const planZ=back+.215;
      const marker=(x,y,w,h,col)=>box(x,y,planZ+.025,w,h,.04,col,null,"light");
      marker(0,1.61,.05,1.50,brass);
      for(const y of [1.0,1.43,1.86]) marker(0,y,2.46,.04,brass);
      for(const [x,y,title,c] of [[0,2.30,"그룹안내소","#b94339"],[-1.30,1.43,"브랜드관","#9c5046"],
        [1.30,1.43,"제품전시관","#476d82"],[-1.30,1.86,"IR 자료관","#74604b"],[1.30,1.86,"ESG 정원","#527351"],
        [-1.30,1.0,"카페 렌토","#785841"],[1.30,1.0,"에데꼬론","#826b50"]]){
        sign(x,y,planZ+.055,.94,.24,title,"",c);
      }
      consoleDesk(brass);
      for(const side of [-1,1])box(side*.76,.118,mid,.025,.008,depth-.4,brass);
    }
    function brandGallery() {
      wallPair(false,true);
      box(0,top,mid,width+.38,.18,depth+.38,cream);
      // Folded red fascia follows the shared low roofline.
      for(const z of [.28,-1.19]){
        const folds=[[-half+.22,.18],[-half+.22,top+.28],[-2.85,top+.33],[-.74,top-.08],
          [1.15,top-.06],[half-.05,top+.33],[half-.05,.18]];
        for(let i=1;i<folds.length;i++){
          const [a,b]=[folds[i-1],folds[i]];
          beam(...a,...b,z,.34,z>0 ? .48 : .17,z>0 ? magma : 0xa6302f);
        }
      }
      for(let i=0;i<5;i++)box(-half+.42+i*.29,1.60,.34,.065,2.85,.17,0xa93634);
      suspendedSign(.43,top-.37,3.24);
      box(0,1.79,back+.12,4.56,2.63,.14,0x8e302e);
      sign(0,2.03,back+.198,4.13,1.48,"HLB","Human Life Better","#ab302e");
      const colors=[magma,0x842830,0xd9ab9e,0xf1dac5];
      colors.forEach((c,i)=>box(-1.53+i*1.02,1.0,back+.21,.90,.25,.045,c));
      cover(-half+1.35,1.88,back+.17,2.13,1.50,"brochure-ko");
      const sampleX=half-1.16;
      box(sampleX,1.96,back+.15,1.71,1.91,.13,cream);
      box(sampleX,2.24,back+.23,1.44,1.13,.04,magma,null,"light");
      sign(sampleX,1.44,back+.24,1.44,.36,"Magma Red","#EF4136","#913b36");
      // Freestanding colour studies alternate along the side walls without closing the central aisle.
      for(const side of [-1,1]){
        const x=side*(half-.93),z=mid+.16;
        box(x,.45,z,1.22,.61,1.38,cream,null,"stone");
        const material=enamel(side<0?magma:0xb94944);
        const sculpture=mesh("Colour study",new T.TorusGeometry(.41,.11,10,38,Math.PI*1.75),material,x,1.24,z);
        sculpture.rotation.set(.24,side*.35,side*.60);
        solid(x,z,1.25,1.4,1.60);
      }
      consoleDesk(0xd1a784);
    }
    function productLab() {
      wallPair(true,true);
      const frame=theme.frame,cyan=0x89bbcb;
      for(let i=0;i<3;i++){
        const left=-half-.15+i*(width+.30)/3, right=left+(width+.30)/3;
        beam(left,top,right-.22,top+.42,mid,.12,depth+.23,0xe2e8df);
        pane(right-.14,top+.20,mid,depth+.12,.36,Math.PI/2);
        box(right-.22,4.28,mid,.15,.04,depth+.23,frame);
        for(const z of [.12,back-.10]) {
          beam(left,top,right-.22,top+.42,z,.14,.19,frame);
          box(right-.15,top+.21,z,.12,.42,.17,frame);
        }
        for(let rib=0;rib<4;rib++){
          const z=back+rib*depth/3;
          box(right-.17,top+.21,z,.09,.42,.06,frame);
        }
      }
      box(0,top-.055,.15,width+.36,.27,.38,0xe0e9e5);
      for(const side of [-1,1])box(side*(half-.21),1.62,.19,.36,3.28,.33,cyan);
      suspendedSign(.39,top-.38);
      cover(0,1.93,back+.15,1.38,1.79,"products-ko");
      sign(0,2.98,back+.20,3.50,.43,"제품 카탈로그","",theme.sign);
      for(const side of [-1,1]){
        const bay=side*2.42;
        box(bay,1.76,back+.14,2.39,1.88,.15,0x718e99);
        box(bay,1.77,back+.23,2.25,1.72,.03,0xc8d7d5);
        for(const level of [1.10,1.76]){
          box(bay,level,back+.32,2.18,.064,.36,frame);
          for(let i=0;i<5;i++){
            const x=bay+(i-2)*.38, height=.22+.08*(i%3);
            const tint=[0xe1c98d,0xa9bbca,0xc39591,0x98b4a2,0xcabbd2][i];
            if(side<0) {
              form("round",x,level+.044+height/2,back+.36,.091,height,.091,cream);
              form("round",x,level+.068+height,back+.36,.067,.06,.067,tint);
            } else {
              box(x,level+.04+height/2,back+.36,.23,height,.15,tint);
              box(x,level+.17,back+.439,.163,.04,.012,cream);
            }
          }
        }
        solid(bay,back+.29,2.38,.55,2.72);
        const x=side*(half-1.04), z=mid-.08;
        box(x,.49,z,1.26,.81,2.21,frame);
        box(x,.93,z,1.40,.085,2.37,cream);
        const caseMesh=mesh("Glass sample vitrine",new T.BoxGeometry(1.31,1.08,2.23),glazing,x,1.50,z);
        caseMesh.castShadow=false;
        for(const xx of [-.65,.65])for(const zz of [-1.12,1.12])box(x+xx,1.49,z+zz,.035,1.10,.035,cyan);
        for(let i=0;i<3;i++){
          const cz=z+(i-1)*.60, tint=[0xd69178,0x89b8b3,0xb8afce][i];
          if(side<0){
            form("round",x,1.20,cz,.15,.45,.15,0xf5ede2);
            form("round",x,1.45,cz,.105,.09,.105,tint);
            box(x,1.20,cz+.14,.16,.12,.011,tint);
          }else{
            box(x,1.23,cz,.45,.56,.24,tint);
            box(x,1.21,cz+.125,.37,.075,.013,cream);
          }
        }
        solid(x,z,1.42,2.38,2.05);
      }
      consoleDesk(cyan);
    }
    function readingRoom() {
      wallPair(false,false);
      const walnut=0x654833,sandstone=0xd9c6a5;
      const lampGlass=enamel(0xffe3ab);
      lampGlass.userData.nightLamp=true;
      box(0,top+.04,mid,width+.46,.22,depth+.49,sandstone,null,"stone");
      for(let i=0;i<3;i++)box(0,top+.12+i*.12,mid,width+.56-.56*i,.16,depth+.54-.45*i,
        i===1?0x887457:sandstone,null,"stone");
      box(0,top-.32,.51,width+.48,.48,.96,theme.frame);
      const gable=new T.Shape();
      gable.moveTo(-half-.21,0);gable.lineTo(0,.34);gable.lineTo(half+.21,0);gable.closePath();
      mesh("Pediment",new T.ExtrudeGeometry(gable,{depth:.27,bevelEnabled:false}),enamel(sandstone),0,top+.08,.38);
      for(const side of [-1,1])beam(side*(half+.29),top+.08,0,top+.44,.64,.12,.33,brass);
      for(const side of [-1,1]){
        const sx=side*1.95;
        box(sx,2.11,.15,.23,.41,.14,brass);
        tube([sx,2.05,.17],[sx,2.05,.38],.039,brass);
        mesh("Portico lantern",new T.CylinderGeometry(.123,.103,.40,8),lampGlass,sx,2.19,.37);
        for(const y of [1.97,2.41])form("round",sx,y,.37,.141,.065,.141,brass);
        for(const x of [2.45,half-.38]){
          form("round",side*x,1.68,.58,.20,3.20,.20,sandstone,null,"stone");
          for(const y of [.16,3.27])form("round",side*x,y,.58,.31,.18,.31,brass);
          solid(side*x,.58,.55,.55,3.37);
        }
        for(let i=0;i<4;i++)box(side*(entry+.30+i*.71),1.76,.105,.038,3.38,.034,0xbaaa92);
      }
      suspendedSign(1.02,top-.28,3.51);
      cover(0,2.09,back+.16,1.93,1.49,"ir-pharma");
      sign(0,3.11,back+.18,3.19,.45,"투자자 자료","",theme.sign);
      const covers=[0x586674,0x89615c,0x607162,0x9b815a,0xa26250,0x49484f];
      for(const side of [-1,1]){
        const bay=side*2.88;
        box(bay,1.66,back+.18,2.48,2.64,.21,walnut);
        for(let row=0;row<3;row++){
          const y=.59+row*.71;
          box(bay,y,back+.34,2.41,.08,.40,0x957651);
          for(let col=0;col<8;col++){
            const x=bay-.98+col*.278,h=.38+((row+col*2)%4)*.072;
            box(x,y+.045+h/2,back+.36,.19,h,.22,covers[(row+col)%6]);
            box(x,y+.12,back+.474,.14,.038,.017,brass);
          }
        }
        solid(bay,back+.26,2.48,.53,2.98);
        const x=side*(half-.81);
        box(x,1.43,mid,.74,2.72,depth-1.46,walnut);
        solid(x,mid,.83,depth-1.43,2.78);
        for(let shelf=0;shelf<4;shelf++){
          const y=.32+shelf*.60;
          box(x-side*.13,y,mid,.72,.074,depth-1.43,sandstone);
          for(let i=0;i<11;i++){
            const z=back+1.06+i*(depth-2.12)/10;
            const size=.29+(i*7+shelf*3)%5*.045;
            box(x-side*.29,y+.046+size/2,z,.35,size,.15+(i%2)*.05,covers[(i+shelf)%6]);
            box(x-side*.47,y+.095,z,.022,.034,.12,brass);
          }
        }
      }
      consoleDesk(0xceab77);
      for(const side of [-1,1]){
        const x=side*1.0,z=back+1.03;
        tube([x,1.10,z],[x,1.44,z],.029,brass);
        form("round",x,1.46,z,.17,.12,.17,0x769c7b);
        mesh("Reading lamp",new T.CylinderGeometry(.145,.145,.038,12),lampGlass,x,1.387,z);
      }
    }
    function garden() {
      wallPair(true,true);
      const rise=.40,ridge=top+rise,g=theme.frame, amber=0xbc9669;
      for(const side of [-1,1]){
        const panel=pane(0,top+rise/2,mid,Math.hypot(half,rise),depth);
        panel.position.x=side*half/2;
        panel.rotation.order="ZXY";panel.rotation.set(-Math.PI/2,0,-side*Math.atan2(rise,half),"ZXY");
        for(let i=0;i<5;i++){
          const z=back+i*depth/4;
          tube([side*(half+.07),top,z],[0,ridge,z],.067,g);
          tube([side*(half-.06),top-.10,z],[side*(half-.06),.26,z],.047,g);
        }
        for(let i=0;i<2;i++){
          const x=side*half*(i+1)/3,y=ridge-rise*(i+1)/3;
          tube([x,y,back],[x,y,.04],.041,amber);
        }
        const x=side*(half-1.20);
        box(x,.27,mid,1.64,.40,depth-1.23,amber,null,"stone");
        box(x,.47,mid,1.51,.05,depth-1.35,0x4b5340,null,"stone");
        solid(x,mid,1.68,depth-1.19,1.56);
        for(let i=0;i<6;i++){
          const z=back+.95+i*(depth-1.94)/5,px=x+Math.sin(i*2.7)*.26;
          const scale=.48+(i%3)*.21;
          tube([px,.47,z],[px,.48+scale,z],.036,0x746246);
          for(let j=0;j<6;j++){
            const a=i*1.7+j*2.40, reach=scale*.27;
            form("leaf",px+Math.cos(a)*reach,.61+scale*(.36+.16*(j%3)),z+Math.sin(a)*reach,
              .19*scale,.43*scale,.14*scale,[0x68935d,0x3e785a,0x91a858][(i+j)%3],
              [.60*Math.cos(a),a,.68*Math.sin(a)]);
          }
        }
        // A tall specimen anchors each bed; the warm timber trellis climbs the end wall.
        const tx=x-side*.18,tz=back+1.03;
        tube([tx,.47,tz],[tx,2.02,tz],.080,0x77543e);
        for(let branch=0;branch<6;branch++){
          const a=branch*2.40, reach=branch===5 ? .04 : .46;
          const bx=tx+Math.cos(a)*reach,bz=tz+Math.sin(a)*reach,by=1.86+branch*.13;
          tube([tx,1.22+branch*.09,tz],[bx,by,bz],.034,0x846147);
          form("rock",bx,by+.19,bz,.42,.36,.40,[0x59854d,0x6f9851,0x8aa65b][branch%3],
            [branch*.3,a,0],"stone");
        }
        const trellis=side*2.08;
        for(let i=-2;i<=2;i++)box(trellis+i*.24,1.65,back+.14,.038,2.05,.04,amber);
        for(let i=0;i<4;i++)box(trellis,1.0+i*.42,back+.165,1.15,.033,.05,amber);
        for(let i=0;i<7;i++) {
          form("leaf",trellis+Math.sin(i*.95)*.36,.94+i*.21,back+.23,.11,.20,.07,
            [0x709353,0x84a368][i%2],[0,0,Math.cos(i)*.59]);
        }
      }
      tube([0,ridge,back-.13],[0,ridge,.17],.10,amber);
      suspendedSign(.20,top-.19,2.94);
      cover(0,1.96,back+.15,1.46,1.94,"esg-ko");
      consoleDesk(0x9eb18d);
    }

    box(0,.015,mid,width+.23,.12,depth+.21,theme.frame,null,"stone");
    box(0,.083,mid,width-.14,.052,depth-.09,theme.floor,null,"stone");
    const make={group:compassHall,brand:brandGallery,product:productLab,ir:readingRoom,esg:garden};
    make[hall.id]();
    // Each room has a clear central exit and a protected camera plane under the roof.
    roofs.push(collider(hall.x,hall.front+mid,width+.35,depth+.29,top+.26,top-.11));
    return {id:hall.id,x:hall.x,z:hall.front+.25,station:{x:hall.x,z:hall.front+back+2.3},
      lookAt:{x:hall.x,z:hall.front+back+.25},label:{x:hall.x,y:top+.27,z:hall.front+.48},
      interior:{minX:hall.x-half,maxX:hall.x+half,minZ:hall.front+back,maxZ:hall.front+.52,ceilingY:top-.08}};
  }
  globalThis.HLBHalls={build};
})();
