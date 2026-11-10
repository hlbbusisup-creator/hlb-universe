(() => {
  "use strict";
  function create({hall,camera,onState=()=>{}}) {
    const T=globalThis.THREE, projection=hall.projection;
    const video=document.createElement("video");
    video.className="history-video-source";
    video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;
    video.preload="none";video.setAttribute("muted","");video.setAttribute("playsinline","");
    video.setAttribute("aria-hidden","true");video.tabIndex=-1;
    document.body.append(video);
    let present=false,started=false,pending=false,watching=false,savedCamera=null,disposed=false;
    let message="",failed=false;
    const poster=new T.TextureLoader().load("assets/history/gi-poster.jpg");
    poster.colorSpace=T.SRGBColorSpace;
    const texture=new T.VideoTexture(video);
    texture.colorSpace=T.SRGBColorSpace;
    const original=projection.screen.material;
    const material=new T.MeshBasicMaterial({map:poster,toneMapped:false,side:T.DoubleSide});
    projection.screen.material=material;
    if(projection.beam) projection.beam.visible=false;
    function notify() {onState({watching,present,message,failed,playing:!video.paused});}
    function play() {
      if(!present || disposed || document.hidden || pending) return;
      if(!started) {
        started=true;video.src="assets/history/gi-ceremony.mp4";
        video.load();
      }
      pending=true;failed=false;message="영상을 불러오는 중입니다…";notify();
      Promise.resolve(video.play()).then(()=>{
        if(!present || disposed || document.hidden) video.pause();
        else {message="";failed=false;}
      }).catch(error=>{
        if(!present || disposed || error.name==="AbortError") return;
        message=error.name==="NotAllowedError" ? "영상 재생 버튼을 눌러 주세요." : "영상을 불러오지 못했습니다. 다시 재생해 주세요.";
        failed=true;
      }).finally(()=>{pending=false;if(!disposed)notify();});
    }
    function setPresent(value) {
      value=Boolean(value) && !document.hidden;
      if(value===present) return;
      present=value;
      if(projection.beam) projection.beam.visible=present;
      if(present) play();else video.pause();
      notify();
    }
    function fitCamera() {
      const eye=projection.cameraPosition,look=projection.lookAt;
      camera.position.set(eye.x,eye.y,eye.z);
      camera.lookAt(look.x,look.y,look.z);
      const distance=Math.hypot(eye.x-look.x,eye.y-look.y,eye.z-look.z);
      const size=Math.max(projection.screenHeight || 2.88,(projection.screenWidth || 5.12)/camera.aspect);
      camera.fov=Math.min(112,Math.max(38,2*Math.atan(size*.58/distance)*180/Math.PI));
      camera.updateProjectionMatrix();
    }
    function beginWatch() {
      if(watching || !present || disposed) return false;
      savedCamera={position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov};
      watching=true;fitCamera();play();notify();return true;
    }
    function endWatch() {
      if(!watching) return false;
      watching=false;
      camera.position.copy(savedCamera.position);camera.quaternion.copy(savedCamera.quaternion);
      camera.fov=savedCamera.fov;camera.updateProjectionMatrix();savedCamera=null;
      notify();return true;
    }
    const listeners=new AbortController(), options={signal:listeners.signal};
    video.addEventListener("loadeddata",()=>{material.map=texture;material.needsUpdate=true;},options);
    video.addEventListener("playing",()=>{message="";failed=false;notify();},options);
    video.addEventListener("error",()=>{
      if(disposed || !started)return;
      message="영상을 불러오지 못했습니다. 다시 재생해 주세요.";failed=true;notify();
    },options);
    document.addEventListener("pointerup",()=>{if(present && video.paused && !failed)play();},options);
    function retry(){ if(video.error){video.load();}play(); }
    function dispose() {
      if(disposed)return;
      endWatch();disposed=true;listeners.abort();video.pause();video.removeAttribute("src");video.load();video.remove();
      projection.screen.material=original;material.dispose();texture.dispose();poster.dispose();
    }
    return {setPresent,beginWatch,endWatch,retry,dispose,isWatching:()=>watching,
      update:()=>{if(watching)fitCamera();},getState:()=>({present,watching,playing:!video.paused,muted:video.muted,loop:video.loop,currentTime:video.currentTime,duration:video.duration})};
  }
  globalThis.HLBHistoryFilm={create};
})();
