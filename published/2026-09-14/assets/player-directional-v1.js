// Directional 2D player slime for the pinned 2026-09-14 release.
// The supplied 3x3 atlas is authoritative: NW/N/NE, W/idle/E, SW/S/SE.
// Lighting is baked from the upper-right and the art is never rotated at runtime.
(() => {
  const GL = globalThis.WebGL2RenderingContext;
  if (!GL) return;

  const proto = GL.prototype;
  const original = {
    getUniformLocation: proto.getUniformLocation,
    uniform1f: proto.uniform1f,
    uniform3fv: proto.uniform3fv,
    uniformMatrix4fv: proto.uniformMatrix4fv,
    drawElements: proto.drawElements,
    drawArrays: proto.drawArrays,
  };

  const uniformNames = new WeakMap();
  const contexts = new WeakMap();
  const runtime = {
    image: null,
    ready: false,
    failed: false,
  };

  function contextState(gl) {
    let state = contexts.get(gl);
    if (!state) {
      state = {
        kind: -1,
        kindProgram: null,
        outline: 0,
        jelly: [0, 0, 0],
        time: 0,
        vp: null,
        model: null,
        sprite: null,
        playerDrawSerial: 0,
      };
      contexts.set(gl, state);
    }
    return state;
  }

  function rememberLocation(program, name, location) {
    if (location) uniformNames.set(location, { program, name });
    return location;
  }

  proto.getUniformLocation = function(program, name) {
    return rememberLocation(program, name, original.getUniformLocation.call(this, program, name));
  };

  proto.uniform1f = function(location, value) {
    const info = uniformNames.get(location);
    if (info?.name === 'kind') { const state=contextState(this); state.kind=value; state.kindProgram=info.program; }
    else if (info?.name === 'outline') contextState(this).outline = value;
    else if (info?.name === 'time') contextState(this).time = value;
    return original.uniform1f.call(this, location, value);
  };

  proto.uniform3fv = function(location, value) {
    const info = uniformNames.get(location);
    if (info?.name === 'jellyMotion') contextState(this).jelly = [value[0], value[1], value[2]];
    return original.uniform3fv.call(this, location, value);
  };

  proto.uniformMatrix4fv = function(location, transpose, value) {
    const info = uniformNames.get(location);
    if (info?.name === 'vp') contextState(this).vp = new Float32Array(value);
    else if (info?.name === 'model') contextState(this).model = new Float32Array(value);
    return original.uniformMatrix4fv.call(this, location, transpose, value);
  };

  const atlasUrl = new URL('./player-slime-directions.webp', import.meta.url).href;
  const image = new Image();
  runtime.image = image;
  image.decoding = 'async';
  image.onload = () => { runtime.ready = true; };
  image.onerror = () => { runtime.failed = true; console.warn('Directional slime atlas failed to load; keeping the original player renderer.'); };
  image.src = atlasUrl;

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader) || 'Directional slime shader compile failed';
      gl.deleteShader(shader);
      throw new Error(error);
    }
    return shader;
  }

  function link(gl, vertexSource, fragmentSource) {
    const program = gl.createProgram();
    const vs = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program) || 'Directional slime shader link failed';
      gl.deleteProgram(program);
      throw new Error(error);
    }
    return program;
  }

  function ensureSprite(gl) {
    const state = contextState(gl);
    if (state.sprite) return state.sprite;
    if (!runtime.ready || runtime.failed) return null;

    const program = link(gl,
      `#version 300 es\nprecision highp float;\nlayout(location=0) in vec2 position;\nlayout(location=1) in vec2 uv;\nout vec2 UV;\nuniform vec2 center;\nuniform vec2 halfSize;\nuniform mat2 deform;\nuniform vec2 leadShift;\nuniform float depthNdc;\nvoid main(){\n  vec2 p=deform*(position*halfSize)+leadShift;\n  gl_Position=vec4(center+p,depthNdc,1.0);\n  UV=uv;\n}`,
      `#version 300 es\nprecision highp float;\nin vec2 UV;\nuniform sampler2D atlas;\nuniform vec4 uvRect;\nout vec4 outColor;\nvoid main(){\n  vec4 tex=texture(atlas,uvRect.xy+UV*uvRect.zw);\n  if(tex.a<0.018) discard;\n  outColor=vec4(tex.rgb*tex.a,tex.a);\n}`
    );

    const vertices = new Float32Array([
      -1,-1, 0,0,
       1,-1, 1,0,
       1, 1, 1,1,
      -1, 1, 0,1,
    ]);
    const indices = new Uint16Array([0,1,2,0,2,3]);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    const texture = gl.createTexture();
    const previousActive = gl.getParameter(gl.ACTIVE_TEXTURE);
    gl.activeTexture(gl.TEXTURE10);
    const previousTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const previousFlip = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
    const previousPremultiply = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, runtime.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, previousFlip);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, previousPremultiply);
    gl.bindTexture(gl.TEXTURE_2D, previousTexture);
    gl.activeTexture(previousActive);

    const locations = {};
    for (const name of ['center','halfSize','deform','leadShift','depthNdc','atlas','uvRect']) {
      locations[name] = original.getUniformLocation.call(gl, program, name);
    }

    state.sprite = { program, vao, vbo, ibo, texture, locations };
    return state.sprite;
  }

  function multiplyPoint(m, x, y, z) {
    const w = m[3]*x + m[7]*y + m[11]*z + m[15];
    return [
      (m[0]*x + m[4]*y + m[8]*z + m[12]) / w,
      (m[1]*x + m[5]*y + m[9]*z + m[13]) / w,
      (m[2]*x + m[6]*y + m[10]*z + m[14]) / w,
    ];
  }

  function decodeYaw(model) {
    // model() stores c*sx at [0] and -s*sx at [2]. This remains valid while squashing.
    return Math.atan2(-model[2], model[0]);
  }

  function normalizeOctant(yaw) {
    return ((Math.round(yaw / (Math.PI / 4)) % 8) + 8) % 8;
  }

  // Octants follow the game's yaw: 0=S, 1=SE, 2=E, 3=NE, 4=N, 5=NW, 6=W, 7=SW.
  const movingCell = [
    [1,2], [2,2], [2,1], [2,0], [1,0], [0,0], [0,1], [0,2],
  ];

  function drawDirectionalSprite(gl) {
    const state = contextState(gl);
    if (!state.vp || !state.model) return false;
    const sprite = ensureSprite(gl);
    if (!sprite) return false;

    const model = state.model;
    const vp = state.vp;
    const x = model[12], z = model[14];
    const yaw = decodeYaw(model);
    const stretchSignal = Math.abs(state.jelly[2]);
    const moving = stretchSignal > 0.0105;
    const [col,row] = moving ? movingCell[normalizeOctant(yaw)] : [1,1];

    // Player location inside the existing supersampled AA tile. The sprite is drawn directly
    // into that tile, so the existing compositor still supplies scene depth/AA afterwards.
    const depth = multiplyPoint(vp, x, 0.30, z)[2];

    // Match the old 3D player's world scale before replacing its silhouette. The determinant
    // cancels the old runtime squash/stretch but preserves any future overall size growth.
    const sx3=Math.hypot(model[0],model[2]), sy3=Math.abs(model[5]), sz3=Math.hypot(model[8],model[10]);
    const baseScale=Math.cbrt(Math.max(1e-6,sx3*sy3*sz3));
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(let j=0;j<=8;j++){
      const l=j/8*Math.PI, rr=.012+.708*Math.pow((1+Math.cos(l))*.5,1.65), radial=.5*Math.sin(l);
      for(let k=0;k<12;k++){
        const t=k/12*Math.PI*2, q=multiplyPoint(vp,x+Math.cos(t)*radial*baseScale,rr*baseScale,z+Math.sin(t)*radial*baseScale);
        minX=Math.min(minX,q[0]);maxX=Math.max(maxX,q[0]);minY=Math.min(minY,q[1]);maxY=Math.max(maxY,q[1]);
      }
    }
    const targetCenter=[(minX+maxX)*.5,(minY+maxY)*.5];
    const targetHalfH=(maxY-minY)*.5;

    // Preserve the authored image orientation. Only the geometry deforms; UVs never rotate,
    // which keeps the fixed upper-right light/highlight in the same world-screen direction.
    const now = state.time;
    const phase = now * (Math.PI * 2 / 0.96);
    const wave = moving ? Math.sin(phase) : Math.sin(now * 2.15) * 0.12;
    const along = moving ? 1 + 0.115 * wave : 1 + 0.012 * wave;
    const cross = moving ? 1 - 0.060 * wave : 1 - 0.006 * wave;
    const theta = yaw - Math.PI / 2; // game yaw -> screen deformation axis (clip-space Y points up)
    const c = Math.cos(theta), s = Math.sin(theta);
    const a = along*c*c + cross*s*s;
    const b = (along-cross)*c*s;
    const d = along*s*s + cross*c*c;

    // Visible-alpha bounds inside each 4:3 atlas cell. They let the new art occupy the same
    // approximate world height as the old player without stretching the authored proportions.
    const cellBounds = [
      [[.14,.16,.98,.967],[.168,.117,.832,.98],[.02,.163,.862,.967]],
      [[.07,.097,1,.883],[0,.08,1,.887],[0,.10,.93,.887]],
      [[.13,.03,.988,.833],[.158,0,.838,.88],[.01,.027,.862,.837]],
    ];
    const bb=cellBounds[row][col], visibleH=Math.max(.2,bb[3]-bb[1]);
    const halfH = targetHalfH / visibleH;
    const halfW = halfH * (4/3);
    const visibleCenterX=(bb[0]+bb[2])*.5, visibleCenterY=(bb[1]+bb[3])*.5;
    const authoredOffsetX=(visibleCenterX-.5)*2*halfW;
    const authoredOffsetY=(.5-visibleCenterY)*2*halfH;
    const centerX=targetCenter[0]-authoredOffsetX;
    const centerY=targetCenter[1]-authoredOffsetY;
    const lead = moving ? (along - 1) * targetHalfH * .42 : 0;
    const leadX = Math.cos(theta) * lead;
    const leadY = Math.sin(theta) * lead;

    const previousProgram = gl.getParameter(gl.CURRENT_PROGRAM);
    const previousVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    const previousActive = gl.getParameter(gl.ACTIVE_TEXTURE);
    const previousCull = gl.isEnabled(gl.CULL_FACE);
    const previousBlend = gl.isEnabled(gl.BLEND);
    const previousDepth = gl.isEnabled(gl.DEPTH_TEST);
    const previousDepthMask = gl.getParameter(gl.DEPTH_WRITEMASK);

    gl.useProgram(sprite.program);
    gl.bindVertexArray(sprite.vao);
    gl.activeTexture(gl.TEXTURE10);
    const previousTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
    gl.bindTexture(gl.TEXTURE_2D, sprite.texture);
    gl.uniform1i(sprite.locations.atlas, 10);
    gl.uniform2f(sprite.locations.center, centerX, centerY);
    gl.uniform2f(sprite.locations.halfSize, halfW, halfH);
    gl.uniformMatrix2fv(sprite.locations.deform, false, new Float32Array([a,b,b,d]));
    gl.uniform2f(sprite.locations.leadShift, leadX, leadY);
    gl.uniform1f(sprite.locations.depthNdc, depth);
    // Texture was flipped on upload: top atlas row occupies V=[2/3,1].
    gl.uniform4f(sprite.locations.uvRect, col/3, (2-row)/3, 1/3, 1/3);

    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    original.drawElements.call(gl, gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    gl.bindTexture(gl.TEXTURE_2D, previousTexture);
    gl.activeTexture(previousActive);
    gl.bindVertexArray(previousVao);
    gl.useProgram(previousProgram);
    gl.depthMask(previousDepthMask);
    previousCull ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE);
    previousBlend ? gl.enable(gl.BLEND) : gl.disable(gl.BLEND);
    previousDepth ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);
    state.playerDrawSerial++;
    return true;
  }

  function thisProgram(gl) { return gl.getParameter(gl.CURRENT_PROGRAM); }

  function replacePlayerDraw(gl, fallback) {
    const state = contextState(gl);
    if (!runtime.ready || runtime.failed || state.kind !== 8 || thisProgram(gl) !== state.kindProgram) return fallback();

    // drawModel(kind=8) renders outline first, body second. Skip the old 3D outline and replace
    // only the body pass with the directional sprite so it is drawn once per frame.
    if (Math.abs(state.outline) > 0.0001) return;
    try {
      if (!drawDirectionalSprite(gl)) return fallback();
    } catch (error) {
      runtime.failed = true;
      console.warn('Directional slime renderer disabled; restoring original player.', error);
      return fallback();
    }
  }

  proto.drawElements = function(mode, count, type, offset) {
    return replacePlayerDraw(this, () => original.drawElements.call(this, mode, count, type, offset));
  };

  proto.drawArrays = function(mode, first, count) {
    return replacePlayerDraw(this, () => original.drawArrays.call(this, mode, first, count));
  };
})();
