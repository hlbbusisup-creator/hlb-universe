(() => {
  "use strict";

  // The entrance lights share a feathered texture; a floor spill per hall keeps
  // the route visible without adding another dynamic light to every material.
  function createHallLights(T,scene) {
    const colors={
      group:0xffcd89, brand:0xffb590, product:0xc5e4f0,
      ir:0xffcc7a, esg:0xdbedaa, cologne:0xffcf91
    };
    const halls=[];
    scene.traverse(object=>{ if (object.userData.hallId) halls.push(object); });
    const size=64, pixels=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
      const u=(x+.5)/size*2-1, v=(y+.5)/size*2-1;
      const radius=Math.sqrt(u*u+v*v);
      const falloff=Math.max(0,1-radius);
      pixels.set([255,255,255,Math.round(255*falloff*falloff)],4*(y*size+x));
    }
    const soft=new T.DataTexture(pixels,size,size);
    soft.minFilter=T.LinearFilter;soft.magFilter=T.LinearFilter;soft.needsUpdate=true;
    const pooledFloor=new T.PlaneGeometry(5.8,6.5);
    pooledFloor.rotateX(-Math.PI/2);
    const pools=[], emitters=new Map();
    for (const hall of halls) {
      const tint=colors[hall.userData.hallId] || 0xffcd98;
      hall.traverse(object=>{
        const mat=object.material;
        if (mat?.emissive && (mat.userData.nightWindow || mat.userData.nightLamp)) {
          emitters.set(mat,{tint,emission:mat.emissive.clone(),intensity:mat.emissiveIntensity});
        }
      });
      const {x=0,z=0,yaw=0}=hall.userData.nightEntrance || {};
      const pool=new T.Mesh(pooledFloor,new T.MeshBasicMaterial({
        color:tint,map:soft,transparent:true,opacity:.62,blending:T.AdditiveBlending,
        depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2
      }));
      pool.name="Entrance light spill";
      pool.rotation.y=yaw;
      pool.position.set(x+Math.sin(yaw)*.55,.145,z+Math.cos(yaw)*.55);
      hall.add(pool);pools.push(pool);
    }
    return dark=>{
      for (const pool of pools) pool.visible=dark;
      for (const [material,original] of emitters) {
        if (dark) material.emissive.setHex(original.tint);
        else material.emissive.copy(original.emission);
        material.emissiveIntensity=dark ? (material.userData.nightLamp ? 1.5 : .65) : original.intensity;
      }
    };
  }

  function create(scene) {
    const T = globalThis.THREE;
    const daylight = {
      horizon:0xf4caba, zenith:0x7f8cae, mist:0xe5b6aa, density:.0053,
      skyLight:0xf3e9f3, groundLight:0xb1867b, ambient:1.68,
      key:0xffddd0, strength:2.18
    };
    const moonlight = {
      horizon:0x586780, zenith:0x141f42, mist:0x404963, density:.0071,
      skyLight:0xc9dbff, groundLight:0x9d7473, ambient:1.10,
      key:0xc1d7ff, strength:.85
    };
    const uniforms = {
      horizon:{value:new T.Color()}, zenith:{value:new T.Color()}, night:{value:0},
      sun:{value:new T.Vector3(-.56,.72,.37).normalize()},
      moon:{value:new T.Vector3(.061,.267,-1).normalize()}
    };
    const sky = new T.Mesh(new T.SphereGeometry(1,32,20), new T.ShaderMaterial({
      uniforms, side:T.BackSide, depthWrite:false, depthTest:false, fog:false,
      vertexShader:`
        varying vec3 direction;
        void main() {
          direction = position;
          vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.);
          gl_Position = clip.xyww;
        }
      `,
      fragmentShader:`
        varying vec3 direction;
        uniform vec3 zenith, horizon, sun, moon;
        uniform float night;
        float hash(vec2 p) {
          vec3 a=fract(vec3(p.xyx)*.1031);
          a+=dot(a,a.yzx+33.33);
          return fract((a.x+a.y)*a.z);
        }
        float noise(vec2 p) {
          vec2 i=floor(p), f=fract(p);
          f=f*f*(3.-2.*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                     mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
        }
        float stars(vec3 d) {
          vec2 grid=vec2(atan(d.x,d.z)*.159155+.5,asin(clamp(d.y,-1.,1.))*.159155+.5)*430.;
          vec2 cell=floor(grid);
          // Wrap longitude so the star field closes behind the volcano.
          cell.x=mod(cell.x,430.);
          float magnitude=hash(cell+13.7);
          vec2 offset=.18+.64*vec2(hash(cell+3.8),hash(cell+74.6));
          vec2 dist=fract(grid)-offset;
          dist.x*=max(.32,sqrt(max(0.,1.-d.y*d.y)));
          float r=length(dist);
          return step(.885,magnitude)*(1.-smoothstep(.018,.11,r))*(.27+.70*hash(cell+41.));
        }
        void main() {
          vec3 d=normalize(direction);
          float h=smoothstep(-.04,.52,d.y);
          vec3 c=mix(horizon,zenith,pow(h,.66));
          vec2 p=d.xz*3./max(.12,d.y+.16);
          float clouds=.55*noise(p)+.30*noise(p*2.1)+.15*noise(p*4.1);
          float veil=smoothstep(.55,.79,clouds)*smoothstep(.03,.20,d.y);
          if(night<.5) {
            c=mix(c,vec3(.83,.70,.70),veil*.44);
            float g=max(dot(d,sun),0.);
            c+=vec3(.8,.52,.25)*pow(g,65.)*.34;
            c=mix(c,vec3(1.,.94,.74),smoothstep(.9994,.9998,g));
          } else {
            c+=vec3(.79,.86,1.)*stars(d)*smoothstep(.03,.21,d.y)*(1.-.8*veil);
            float radius=length(d-moon);
            c+=vec3(.10,.14,.24)*exp(-radius*18.);
            float disc=1.-smoothstep(.0185,.0208,radius);
            vec2 uv=(d.xy-moon.xy)*45.;
            float maria=.14*noise(uv*4.+3.)+.09*noise(uv*9.);
            c=mix(c,vec3(.98,.93,.78)*(1.-maria),disc);
            c=mix(c,vec3(.13,.17,.25),veil*.30);
          }
          gl_FragColor=vec4(c,1.);
          #include <colorspace_fragment>
        }
      `
    }));
    sky.name="Caldera sky";
    sky.renderOrder=-20;
    sky.frustumCulled=false;
    const fill = new T.HemisphereLight();
    const key = new T.DirectionalLight();
    key.castShadow=true;
    key.shadow.mapSize.set(2048,2048);
    Object.assign(key.shadow.camera,{left:-48,right:48,bottom:-45,top:45,near:.3,far:125});
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.normalBias=.032;
    key.shadow.bias=-.00025;
    scene.background=new T.Color();
    scene.fog=new T.FogExp2();
    scene.add(sky,fill,key);

    // The two open lava vents flank the arrival path. Their glow reaches the
    // surrounding basalt and visitor after sunset.
    const ventLights=[[-6.05,8.85],[6.03,7.46]].map(([x,z])=>{
      const glow=new T.PointLight(0xff713c,0,12,2);
      glow.position.set(x,.80,z);
      scene.add(glow);
      return glow;
    });
    const setHallLights=createHallLights(T,scene);
    function setMode(mode) {
      const dark=mode==="night", p=dark ? moonlight : daylight;
      uniforms.zenith.value.setHex(p.zenith);
      uniforms.horizon.value.setHex(p.horizon);
      uniforms.night.value=Number(dark);
      scene.background.setHex(p.mist);
      scene.fog.color.setHex(p.mist);
      scene.fog.density=p.density;
      fill.color.setHex(p.skyLight);
      fill.groundColor.setHex(p.groundLight);
      fill.intensity=p.ambient;
      key.color.setHex(p.key);
      key.intensity=p.strength;
      if (dark) key.position.set(12,32,-23);
      else key.position.set(-24,42,22);
      for (const light of ventLights) light.intensity=dark ? 22 : 0;
      setHallLights(dark);
    }
    setMode("day");
    return {setMode};
  }

  globalThis.HLBTimeOfDay={create};
})();
