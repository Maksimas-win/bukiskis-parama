/* Native WebGL typography. No libraries, video, cookies or external requests. */
(() => {
  'use strict';
  const root = document.querySelector('.intro3d');
  const canvas = root?.querySelector('canvas');
  const shapes = window.Percent3DMesh;
  if (!root || !canvas || !shapes) return;
  const stage = root.querySelector('.intro3d__stage');
  const copy = root.querySelector('.intro3d__copy');
  const arrival = root.querySelector('.intro3d__arrival');
  const progress = root.querySelector('.intro3d__progress-fill');
  const header = document.querySelector('.site-header');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-height: 560px), (max-width: 370px) and (max-height: 700px)');
  const finePointer = matchMedia('(pointer: fine)');
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  let gl, program, parts = [], raf = 0, failed = false, visible = true;
  let x = 0, y = 0, targetX = 0, targetY = 0, p = 0, targetP = 0;
  let started = performance.now(), previous = started, headerHeight = 100;
  let viewport = { width: 1, height: 1 }, observer, resizeObserver;
  const identity = () => new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  function multiply(a,b) {
    const r = new Float32Array(16);
    for (let c=0;c<4;c++) for (let row=0;row<4;row++)
      for (let k=0;k<4;k++) r[c*4+row] += a[k*4+row]*b[c*4+k];
    return r;
  }
  function translation(a,b,c) { const m=identity(); m[12]=a; m[13]=b; m[14]=c; return m; }
  function rotation(axis,a) {
    const m=identity(), c=Math.cos(a), s=Math.sin(a);
    if (axis===0) { m[5]=c; m[6]=s; m[9]=-s; m[10]=c; }
    if (axis===1) { m[0]=c; m[2]=-s; m[8]=s; m[10]=c; }
    if (axis===2) { m[0]=c; m[1]=s; m[4]=-s; m[5]=c; }
    return m;
  }
  function perspective(aspect) {
    const m=new Float32Array(16), f=1/Math.tan(Math.PI/10), near=.1, far=60;
    m[0]=f/aspect; m[5]=f; m[10]=(far+near)/(near-far); m[11]=-1; m[14]=2*far*near/(near-far);
    return m;
  }
  function createGeometry(shape) {
    const v=shape.points, inset=v.map(q=>q.slice()), outward=v.map(()=>[0,0]);
    for (const ring of shape.rings) for (let i=0;i<ring.length;i++) {
      const id=ring[i], a=v[ring[(i+ring.length-1)%ring.length]], b=v[id], c=v[ring[(i+1)%ring.length]];
      const al=Math.hypot(b[0]-a[0],b[1]-a[1]), bl=Math.hypot(c[0]-b[0],c[1]-b[1]);
      const na=[(b[1]-a[1])/al,-(b[0]-a[0])/al], nb=[(c[1]-b[1])/bl,-(c[0]-b[0])/bl];
      const len=Math.hypot(na[0]+nb[0],na[1]+nb[1]) || 1;
      const n=[(na[0]+nb[0])/len,(na[1]+nb[1])/len];
      const offset=Math.min(.016/Math.max(.25,n[0]*na[0]+n[1]*na[1]), Math.min(al,bl)*.32);
      inset[id]=[b[0]-n[0]*offset,b[1]-n[1]*offset]; outward[id]=n;
    }
    const data=[];
    const vertex=(pt,z,n)=>data.push(pt[0],pt[1],z,n[0],n[1],n[2]);
    for (let i=0;i<shape.triangles.length;i+=3) {
      const [a,b,c]=shape.triangles.slice(i,i+3);
      for (const id of [a,b,c]) vertex(inset[id],.16,[0,0,1]);
      for (const id of [c,b,a]) vertex(inset[id],-.16,[0,0,-1]);
    }
    for (const ring of shape.rings) for (let i=0;i<ring.length;i++) {
      const a=ring[i], b=ring[(i+1)%ring.length], dx=v[b][0]-v[a][0], dy=v[b][1]-v[a][1], len=Math.hypot(dx,dy);
      const n=[dy/len,-dx/len,0];
      for (const [id,z] of [[a,.135],[a,-.135],[b,-.135],[a,.135],[b,-.135],[b,.135]]) vertex(v[id],z,n);
      for (const sign of [1,-1]) {
        const face=sign*.16, side=sign*.135;
        const corners=[[inset[a],face,a],[v[a],side,a],[v[b],side,b],[inset[a],face,a],[v[b],side,b],[inset[b],face,b]];
        if (sign<0) corners.reverse();
        for (const [pt,z,id] of corners) vertex(pt,z,[outward[id][0]*.7,outward[id][1]*.7,sign*.72]);
      }
    }
    return new Float32Array(data);
  }
  const vertexSource = `attribute vec3 aPosition; attribute vec3 aNormal;
    uniform mat4 uMVP; uniform mat4 uModel; varying vec3 vNormal; varying vec3 vPosition;
    void main(){ vec4 pos=uModel*vec4(aPosition,1.0); vPosition=pos.xyz;
    vNormal=mat3(uModel)*aNormal; gl_Position=uMVP*vec4(aPosition,1.0); }`;
  const fragmentSource = `precision mediump float;
    varying vec3 vNormal; varying vec3 vPosition; uniform vec3 uCamera; uniform float uOpacity;
    void main(){ vec3 n=normalize(vNormal), v=normalize(uCamera-vPosition), r=reflect(-v,n);
      float diffuse=max(0.0,dot(n,normalize(vec3(-0.6,1.1,1.8))));
      float softbox=pow(max(0.0,dot(r,normalize(vec3(-0.65,0.85,1.2)))),18.0);
      float strip=smoothstep(-0.25,-0.08,r.y)-smoothstep(0.12,0.28,r.y);
      float edge=pow(1.0-max(0.0,dot(n,v)),3.0);
      vec3 metal=vec3(0.07,0.14,0.23)+vec3(0.38,0.51,0.60)*max(0.0,n.z);
      metal+=vec3(0.16,0.20,0.24)*diffuse+vec3(0.55,0.62,0.65)*softbox;
      metal+=vec3(0.17,0.24,0.27)*strip+vec3(0.20,0.48,0.66)*edge;
      gl_FragColor=vec4(pow(min(metal,vec3(1.0)),vec3(0.9)),uOpacity);
    }`;
  function shader(type,source) {
    const s=gl.createShader(type); if (!s) throw Error('Shader allocation');
    gl.shaderSource(s,source); gl.compileShader(s);
    if (!gl.getShaderParameter(s,gl.COMPILE_STATUS)) { gl.deleteShader(s); throw Error('Shader compilation'); }
    return s;
  }
  let locations;
  function setup() {
    gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,stencil:false,powerPreference:'low-power'});
    if (!gl) throw Error('WebGL unavailable');
    const vs=shader(gl.VERTEX_SHADER,vertexSource), fs=shader(gl.FRAGMENT_SHADER,fragmentSource);
    program=gl.createProgram(); gl.attachShader(program,vs); gl.attachShader(program,fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error('Shader linking');
    gl.useProgram(program);
    locations={position:gl.getAttribLocation(program,'aPosition'),normal:gl.getAttribLocation(program,'aNormal'),
      mvp:gl.getUniformLocation(program,'uMVP'),model:gl.getUniformLocation(program,'uModel'),
      camera:gl.getUniformLocation(program,'uCamera'),opacity:gl.getUniformLocation(program,'uOpacity')};
    const keys=['one',document.documentElement.lang==='en'?'dot':'comma','two','percent'];
    let offset=0;
    const width=keys.reduce((n,key)=>n+shapes[key].advance,0)+.06;
    parts=keys.map((key,i)=>{
      const shape=shapes[key], data=createGeometry(shape), buffer=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
      const part={buffer,count:data.length/6,x:offset+shape.advance/2-width/2,y:shape.offsetY,i};
      offset+=shape.advance+(i===2?.06:0); return part;
    });
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0,0,0,0);
  }
  function readProgress() {
    if (!root.classList.contains('is-animated')) { targetP=0; return; }
    const rect=root.getBoundingClientRect(), pin=root.querySelector('.intro3d__pin');
    targetP=clamp((headerHeight-rect.top)/Math.max(1,root.offsetHeight-pin.offsetHeight));
  }
  function updateMode() {
    root.classList.toggle('is-animated',!failed&&!reduced.matches&&!compact.matches);
    p=targetP=0; x=y=targetX=targetY=0; readProgress(); p=targetP; requestFrame();
  }
  function resize() {
    if (failed) return;
    headerHeight=header ? header.getBoundingClientRect().height : 0;
    root.style.setProperty('--intro-header',`${headerHeight}px`);
    const rect=stage.getBoundingClientRect();
    viewport={width:Math.max(1,rect.width),height:Math.max(1,rect.height)};
    const dpr=Math.min(devicePixelRatio||1,innerWidth<700?1.35:1.65);
    const width=Math.round(viewport.width*dpr), height=Math.round(viewport.height*dpr);
    if (canvas.width!==width || canvas.height!==height) { canvas.width=width; canvas.height=height; }
    gl.viewport(0,0,canvas.width,canvas.height); readProgress(); requestFrame();
  }
  function paint(now) {
    raf=0;
    if (failed || document.hidden || !visible) return;
    const dt=Math.min(48,Math.max(1,now-previous)); previous=now;
    const mix=reduced.matches?1:1-Math.exp(-dt/65);
    p+=(targetP-p)*mix; x+=(targetX-x)*mix; y+=(targetY-y)*mix;
    const entry=reduced.matches?1:smooth(0,1100,now-started);
    const fly=smooth(.025,.94,p), fade=1-smooth(.72,1,p);
    const aspect=viewport.width/viewport.height;
    const distance=Math.max(2.9,2.02/(Math.tan(Math.PI/10)*aspect));
    const pv=multiply(perspective(aspect),translation(0,0,-distance));
    let base=multiply(rotation(2,-.045),rotation(1,-.20+x*.13));
    base=multiply(base,rotation(0,.12+y*.10));
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT); gl.useProgram(program);
    gl.uniform3f(locations.camera,0,0,distance); gl.uniform1f(locations.opacity,fade*entry);
    const travel=[[-1.65,.35,-3.8,-1.05],[-.9,-.65,-5,.85],[.75,.55,-4.9,1.2],[1.85,-.3,-5.8,-1.15]];
    for (const part of parts) {
      const t=travel[part.i], f=smooth(part.i*.025,1,fly);
      let model=multiply(base,translation(part.x+t[0]*f,part.y+t[1]*f+(1-entry)*.16,t[2]*f-(1-entry)*.5));
      model=multiply(model,rotation(1,t[3]*f)); model=multiply(model,rotation(2,(part.i-1.5)*.19*f));
      gl.uniformMatrix4fv(locations.model,false,model); gl.uniformMatrix4fv(locations.mvp,false,multiply(pv,model));
      gl.bindBuffer(gl.ARRAY_BUFFER,part.buffer);
      gl.enableVertexAttribArray(locations.position); gl.vertexAttribPointer(locations.position,3,gl.FLOAT,false,24,0);
      gl.enableVertexAttribArray(locations.normal); gl.vertexAttribPointer(locations.normal,3,gl.FLOAT,false,24,12);
      gl.drawArrays(gl.TRIANGLES,0,part.count);
    }
    const copyFade=1-smooth(.08,.52,p), arrivalFade=smooth(.46,.85,p);
    copy.style.opacity=String(copyFade); copy.style.transform=`translateY(${-18*(1-copyFade)}px)`;
    arrival.style.opacity=String(arrivalFade); arrival.style.transform=`translateY(${18*(1-arrivalFade)}px)`;
    progress.style.transform=`scaleX(${p})`;
    root.dataset.progress=String(Math.round(p*100));
    if (entry<1 || Math.abs(targetP-p)>.0005 || Math.abs(targetX-x)>.001 || Math.abs(targetY-y)>.001) requestFrame();
  }
  function requestFrame() { if (!raf&&!failed&&visible&&!document.hidden) raf=requestAnimationFrame(paint); }
  function fallback() {
    failed=true; cancelAnimationFrame(raf); raf=0;
    root.classList.remove('has-webgl','is-animated');
    copy.style.opacity='1'; copy.style.transform='none'; arrival.style.opacity='0';
    observer?.disconnect(); resizeObserver?.disconnect();
    if (gl && !gl.isContextLost()) { parts.forEach(part=>gl.deleteBuffer(part.buffer)); if(program) gl.deleteProgram(program); }
  }
  try {
    setup(); root.classList.add('has-webgl'); updateMode(); resize();
    addEventListener('scroll',()=>{readProgress();requestFrame();},{passive:true});
    addEventListener('resize',resize,{passive:true});
    stage.addEventListener('pointermove',event=>{
      if(reduced.matches||!finePointer.matches||event.pointerType==='touch') return;
      const r=stage.getBoundingClientRect(); targetX=clamp((event.clientX-r.left)/r.width,0,1)*2-1;
      targetY=clamp((event.clientY-r.top)/r.height,0,1)*2-1; requestFrame();
    },{passive:true});
    stage.addEventListener('pointerleave',()=>{targetX=targetY=0;requestFrame();},{passive:true});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){cancelAnimationFrame(raf);raf=0;} else {previous=performance.now();readProgress();requestFrame();}
    });
    addEventListener('pageshow',()=>{resize();previous=performance.now();requestFrame();});
    reduced.addEventListener('change',()=>{updateMode();resize();});
    compact.addEventListener('change',()=>{updateMode();resize();});
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback();});
    if ('IntersectionObserver' in window) {
      observer=new IntersectionObserver(entries=>{
        visible=entries[0].isIntersecting;
        if(visible){previous=performance.now();readProgress();requestFrame();} else {cancelAnimationFrame(raf);raf=0;}
      },{rootMargin:'100px'}); observer.observe(root);
    }
    if ('ResizeObserver' in window) {
      resizeObserver=new ResizeObserver(resize); resizeObserver.observe(stage); if(header) resizeObserver.observe(header);
    }
    root.querySelector('[data-intro-skip]')?.addEventListener('click',()=>{
      document.getElementById('intro3d-content')?.focus({preventScroll:true});
    });
  } catch(error) { fallback(); }
})();
