(() => {
  "use strict";

  const phrase = "Human Life Better HLB";
  const ascent = .73, embers = 1.55, captionTime = 2.15;
  const rays = 54, samples = 22, fuseSparks = 30;
  const palette = [0xef4136, 0xef4136, 0xff6a4c, 0xffaa73, 0xffe2ae, 0xdb3850];

  function makeCaption(T) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 160;
    const pen = canvas.getContext("2d");
    pen.font = '800 82px "Arial", sans-serif';
    pen.textAlign = "center";
    pen.textBaseline = "middle";
    pen.lineJoin = "round";
    // A dark silhouette and a cream keyline preserve the red lettering against both sky and lava.
    const letteringWidth = canvas.width - 76;
    pen.strokeStyle = "#672d32";
    pen.lineWidth = 19;
    pen.strokeText(phrase, 512, 85, letteringWidth);
    pen.strokeStyle = "#fff3da";
    pen.lineWidth = 11;
    pen.strokeText(phrase, 512, 81, letteringWidth);
    pen.fillStyle = "#ef4136";
    pen.fillText(phrase, 512, 81, letteringWidth);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    const material = new T.SpriteMaterial({
      map:texture, transparent:true, depthTest:false, depthWrite:false, fog:false, toneMapped:false
    });
    const sprite = new T.Sprite(material);
    sprite.name = phrase;
    sprite.renderOrder = 31;
    sprite.frustumCulled = false;
    sprite.visible = false;
    return sprite;
  }

  function create(scene, camera, canvas, {onBurst} = {}) {
    const T = globalThis.THREE;
    const group = new T.Group();
    group.name = "HLB fireworks";
    scene.add(group);
    const caption = makeCaption(T);
    group.add(caption);
    const captionAnchor = new T.Vector3();
    const local = new T.Vector3(), temp = new T.Vector3();
    const shots = [];
    let captionAge = captionTime, cooldown = 0, disposed = false;

    const material = new T.ShaderMaterial({
      uniforms:{pixelRatio:{value:1}}, transparent:true, depthTest:false, depthWrite:false,
      vertexShader:[
        "attribute vec3 tint; attribute float intensity; attribute float size;",
        "uniform float pixelRatio; varying vec3 color; varying float alpha;",
        "void main(){ color=tint; alpha=intensity; gl_PointSize=size*pixelRatio;",
        "gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }"
      ].join("\n"),
      fragmentShader:[
        "varying vec3 color; varying float alpha;",
        "void main(){ float r=2.0*length(gl_PointCoord-0.5);",
        "if(r>=1.0) discard;",
        "vec3 glow=mix(color,vec3(1.0,0.93,0.76),0.85*(1.0-smoothstep(0.17,0.49,r)));",
        "gl_FragColor=vec4(glow,alpha*(1.0-smoothstep(0.47,1.0,r)));",
        "#include <colorspace_fragment>", "}"
      ].join("\n")
    });
    const colors = palette.map(hex => new T.Color(hex));
    const gravity = new T.Vector3(0, -1, 0);

    function burst(shot) {
      shot.burst = true;
      captionAnchor.copy(shot.end);
      captionAge = 0;
      caption.visible = true;
      onBurst?.(phrase);
    }

    function launch(position, reducedMotion = false) {
      if (disposed || cooldown > 0 || shots.length >= 3) return false;
      camera.updateMatrixWorld();
      const origin = new T.Vector3(position.x, (position.y || 0) + 1.06, position.z);
      // Aim into the upper part of the current view, including in narrow exhibition rooms.
      local.copy(origin).applyMatrix4(camera.matrixWorldInverse);
      const depth = Math.max(2.5, -local.z + 1.45);
      const halfHeight = depth * Math.tan(T.MathUtils.degToRad(camera.fov / 2));
      const end = new T.Vector3(
        (Math.random() - .5) * .31 * halfHeight * Math.min(1, camera.aspect),
        .43 * halfHeight, -depth
      ).applyMatrix4(camera.matrixWorld);
      temp.setFromMatrixColumn(camera.matrixWorld, 0);
      origin.addScaledVector(temp, .29);
      const radius = halfHeight * Math.min(.51, .71 * camera.aspect);
      const geometry = new T.BufferGeometry();
      for (const [name, size] of [["position",3], ["tint",3], ["intensity",1], ["size",1]]) {
        const attribute = new T.BufferAttribute(new Float32Array(rays * samples * size), size);
        attribute.setUsage(T.DynamicDrawUsage);
        geometry.setAttribute(name, attribute);
      }
      const directions = [];
      const spin = Math.random() * Math.PI * 2;
      for (let i = 0; i < rays; i++) {
        const y = 1 - 2 * (i + .5) / rays, angle = spin + i * 2.39996;
        const ring = Math.sqrt(1 - y*y);
        directions.push(new T.Vector3(ring * Math.cos(angle), y, ring * Math.sin(angle))
          .multiplyScalar(radius * (.68 + .45 * Math.random())));
        const color = colors[i % colors.length];
        for (let j = 0; j < samples; j++) geometry.attributes.tint.setXYZ(i*samples+j, color.r,color.g,color.b);
      }
      geometry.setDrawRange(0, 0);
      const points = new T.Points(geometry, material);
      points.renderOrder = 30;
      points.frustumCulled = false;
      group.add(points);
      const shot = {origin,end,radius,directions,points,reducedMotion,age:reducedMotion ? ascent : 0,burst:false};
      shots.push(shot);
      cooldown = .46;
      if (reducedMotion) burst(shot);
      return true;
    }

    function drawShot(shot) {
      const geometry = shot.points.geometry;
      const {position, intensity, size} = geometry.attributes;
      let count = 0;
      function dot(point, brightness, diameter) {
        position.setXYZ(count, point.x, point.y, point.z);
        intensity.setX(count, brightness);
        size.setX(count++, diameter);
      }
      if (!shot.burst) {
        const progress = shot.age / ascent;
        for (let j = 0; j < fuseSparks; j++) {
          const lag = j / (fuseSparks - 1);
          const t = Math.max(0, progress - lag * .29);
          temp.lerpVectors(shot.origin, shot.end, 1 - (1-t)*(1-t));
          temp.y += shot.radius * .16 * Math.sin(Math.PI*t);
          dot(temp, 1 - .85*lag, j === 0 ? 11 : 5.2 - 3*lag);
        }
      } else {
        const age = (shot.age - ascent) / embers;
        const fade = 1 - T.MathUtils.smoothstep(age, .4, 1);
        const stride = shot.reducedMotion ? 4 : 1;
        const trailTime = Math.min(.32, age * .92);
        for (let i = 0; i < rays; i += stride) {
          for (let j = 0; j < (shot.reducedMotion ? 1 : samples); j++) {
            const lag = j / (samples - 1);
            const t = shot.reducedMotion ? .47 : age - lag * trailTime;
            const reach = 1 - Math.exp(-t * 4.0);
            temp.copy(shot.end).addScaledVector(shot.directions[i], reach)
              .addScaledVector(gravity, shot.radius * .56 * t*t);
            const diameter = j === 0 ? 11 : 6.8 - 4.2*lag;
            dot(temp, fade * (1 - .69*lag), diameter);
          }
        }
      }
      geometry.setDrawRange(0, count);
      position.needsUpdate = intensity.needsUpdate = size.needsUpdate = true;
    }

    function updateCaption(dt) {
      if (!caption.visible) return;
      captionAge += dt;
      if (captionAge >= captionTime) { caption.visible = false; return; }
      local.copy(captionAnchor).applyMatrix4(camera.matrixWorldInverse);
      // Limit the caption to the viewport as visitors keep walking or turn while it fades.
      const depth = Math.max(1, -local.z);
      const halfHeight = depth * Math.tan(T.MathUtils.degToRad(camera.fov / 2));
      const halfWidth = halfHeight * camera.aspect;
      const viewportWidth = Math.max(1, canvas.clientWidth);
      const fraction = Math.min(.87, Math.min(450, Math.max(265, viewportWidth * .35)) / viewportWidth);
      const width = fraction * 2 * halfWidth;
      const sideLimit = halfWidth * (1 - fraction - .04);
      local.x = T.MathUtils.clamp(local.x, -sideLimit, sideLimit);
      local.y = T.MathUtils.clamp(local.y, -.48 * halfHeight, .58 * halfHeight);
      local.z = -depth;
      caption.position.copy(local).applyMatrix4(camera.matrixWorld);
      caption.scale.set(width, width * 160/1024, 1);
      caption.material.opacity = 1 - T.MathUtils.smoothstep(captionAge, captionTime - .48, captionTime);
    }

    function update(dt) {
      if (disposed) return;
      cooldown = Math.max(0, cooldown - dt);
      if (!shots.length && !caption.visible) return;
      camera.updateMatrixWorld();
      material.uniforms.pixelRatio.value = canvas.width / Math.max(canvas.clientWidth, 1);
      for (let i = shots.length - 1; i >= 0; i--) {
        const shot = shots[i];
        shot.age += dt;
        if (shot.age >= ascent + embers) {
          shot.points.removeFromParent();
          shot.points.geometry.dispose();
          shots.splice(i,1);
          continue;
        }
        if (!shot.burst && shot.age >= ascent) burst(shot);
        drawShot(shot);
      }
      updateCaption(dt);
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      for (const shot of shots) shot.points.geometry.dispose();
      shots.length = 0;
      group.removeFromParent();
      group.clear();
      material.dispose();
      caption.material.map.dispose();
      caption.material.dispose();
    }
    return {launch, update, dispose};
  }

  globalThis.HLBFireworks = {create};
})();
