(() => {
  "use strict";
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};

  function create({scene,world,player,onChange=()=>{}}) {
    const docks=world.yachtDocks;
    const {craft,passenger}=globalThis.HLBBlackcat.create(scene,docks);
    const originalRouteLength=distance(docks[0],docks[1]);
    let phase="idle", dockIndex=0, sourceIndex=0, targetIndex=null, elapsed=0;
    let flight=null, message="";
    function getState() {
      return {phase,busy:phase!=="idle",dockIndex,sourceIndex,targetIndex,message};
    }
    function change(next,copy) {
      phase=next;elapsed=0;message=copy;onChange(getState());
    }
    function beginFlight(to,empty=false) {
      const from=docks[dockIndex];
      const end=docks[to];
      const heading=Math.atan2(from.x-end.x,from.z-end.z);
      const turn=Math.atan2(Math.sin(heading-craft.rotation.y),Math.cos(heading-craft.rotation.y));
      const endTurn=Math.atan2(Math.sin((end.yaw||0)-heading),Math.cos((end.yaw||0)-heading));
      // The original entrance–group route takes 9 seconds with a passenger, 5 when called.
      const speed=originalRouteLength/(empty?5:9);
      const multiplier=from.id==="history" || end.id==="history" ? 1.3 : 1;
      const startY=craft.position.y, endY=(end.y??0)+.08;
      flight={from,to,end,startY,endY,cruiseY:Math.max(startY,endY)+9,
        startYaw:craft.rotation.y,turn,endTurn,duration:distance(from,end)/(speed*multiplier)};
      change(empty?"calling":"flying",empty?"블랙캣이 정박소로 오고 있어요":end.title+" 정박소로 비행 중");
    }
    function board() {
      if (!player.beginRide(craft,passenger)) {cancelApproach();return;}
      change("boarding","블랙캣에 탑승하고 있어요");
    }
    function request(index,to) {
      if (phase!=="idle" || !Number.isInteger(index) || !Number.isInteger(to) ||
          !docks[index] || !docks[to] || index===to) return false;
      const station=docks[index].station;
      if (distance(player.getPosition(),station)>.14 && !player.walkTo(station)) return false;
      sourceIndex=index;targetIndex=to;
      change("walking","블랙캣 탑승장으로 걸어가는 중");
      return true;
    }
    function cancelApproach() {
      if (phase!=="walking" && phase!=="waiting" && phase!=="boarding") return false;
      if (player.isRiding()) return false;
      change("idle","");return true;
    }
    function nearby() {
      const p=player.getPosition();
      const group=world.spaces.find(space=>space.id==="group")?.interior;
      if (group && p.x>=group.minX && p.x<=group.maxX && p.z>=group.minZ && p.z<=group.maxZ) return 1;
      const index=docks.findIndex(d=>distance(p,d.station)<4.6);
      return index<0?null:index;
    }
    function update(dt,reducedMotion=false) {
      dt=Math.max(0,Math.min(Number(dt)||0,.07));
      if (phase==="idle") return;
      elapsed+=dt;
      if (phase==="walking") {
        if (distance(player.getPosition(),docks[sourceIndex].station)<.16) {
          if (dockIndex===sourceIndex) board();
          else beginFlight(sourceIndex,true);
        } else if (elapsed>20) change("idle","이동이 멈췄어요. 이동하기를 다시 눌러 주세요.");
      } else if (phase==="boarding") {
        if (elapsed>=.9) beginFlight(targetIndex);
      } else if (phase==="waiting") {
        if (distance(player.getPosition(),docks[sourceIndex].station)<.16) board();
        else if (elapsed>20) change("idle","");
      } else if (flight) {
        const t=Math.min(1,elapsed/flight.duration);
        // Rise vertically before crossing the roofs, then descend at the dock.
        const progress=smooth((t-.20)/.60);
        const takeoff=smooth(t/.20), landing=smooth((t-.80)/.20);
        const height=flight.startY+(flight.cruiseY-flight.startY)*takeoff+
          (flight.endY-flight.cruiseY)*landing;
        craft.position.set(flight.from.x+(flight.end.x-flight.from.x)*progress,height,
          flight.from.z+(flight.end.z-flight.from.z)*progress);
        craft.rotation.y=flight.startYaw+flight.turn*smooth(t/.18)+flight.endTurn*smooth((t-.82)/.18);
        craft.rotation.z=reducedMotion?0:Math.sin(t*Math.PI*2)*.025*takeoff*(1-landing);
        if (t===1) {
          const wasCalling=phase==="calling";
          dockIndex=flight.to;flight=null;craft.rotation.z=0;
          craft.rotation.y=docks[dockIndex].yaw||0;
          if (wasCalling) {
            if (distance(player.getPosition(),docks[sourceIndex].station)<.16) board();
            else if (player.walkTo(docks[sourceIndex].station)) change("waiting","블랙캣 탑승장으로 걸어가는 중");
            else change("idle","");
          } else {
            const dock=docks[dockIndex];
            player.endRide(dock.station,world.spaces.find(space=>space.id===dock.id) ?? {x:0,z:11});
            change("idle",dock.title+"에 도착했어요");
          }
        }
      }
    }
    return {request,update,getState,nearby,cancelApproach};
  }
  globalThis.HLBYachtRide={create};
})();
