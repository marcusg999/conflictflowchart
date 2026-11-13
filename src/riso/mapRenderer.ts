/**
 * A folded paper map, printed like a risograph: real 3D geometry and diffuse
 * lighting, rendered as two halftone "plates" (blue ink, coral ink) laid down
 * slightly out of register, the way a riso print comes off the drum.
 *
 * Raw WebGL 1 — no library. Used live on the home screen, and offline (in
 * headless Chromium) to render the intro's image sequence.
 */

export type RisoColors = {
  paper: [number, number, number];
  sheet: [number, number, number];
  blue: [number, number, number];
  coral: [number, number, number];
  dark: boolean;
};

export type RisoMap = {
  /** fold: 0 = flat open map, 1 = folded shut. turn: radians of slow sway. */
  render: (fold: number, turn: number, time: number) => void;
  resize: () => void;
  dispose: () => void;
};

const VERT = `
attribute vec2 aUV;
uniform float uFold;
uniform float uTurn;
uniform float uAspect;
uniform float uGround;
varying vec2 vUV;
varying vec3 vNormal;
varying float vGround;

const float PANELS = 4.0;
const float W = 0.42;   // panel width
const float H = 1.15;   // sheet height

mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }

void main(){
  vUV = aUV;
  vGround = uGround;
  vec3 p; vec3 n;
  if (uGround > 0.5) {
    // A soft shadow plane under the map.
    p = vec3((aUV.x - 0.5) * 2.0, -0.66, (aUV.y - 0.5) * 0.9);
    n = vec3(0., 1., 0.);
  } else {
    float theta = uFold * 1.25;               // accordion fold angle
    float u = aUV.x * PANELS;
    float k = min(floor(u), PANELS - 1.0);
    float s = u - k;
    float odd = mod(k, 2.0);
    float cw = W * cos(theta);
    float sw = W * sin(theta);
    float x = (k + s) * cw - PANELS * cw * 0.5;
    float z = mix(s, 1.0 - s, odd) * sw - sw * 0.5;
    float y = (aUV.y - 0.5) * H;
    // a little paper sag
    z += sin(aUV.y * 3.14159) * 0.035 * (1.0 - uFold);
    p = vec3(x, y, z);
    n = normalize(vec3(mix(-sin(theta), sin(theta), odd), 0., cos(theta)));
  }
  mat3 R = rotX(-0.48) * rotY(uTurn);
  if (uGround < 0.5) { p = R * p; n = R * n; }
  else { p = rotX(0.12) * p; }
  // simple perspective camera
  p.z -= 2.55;
  float f = 2.35;
  // near 0.5, far 10: a real depth range so overlapping folds sort correctly
  gl_Position = vec4(p.x * f / uAspect, p.y * f + 0.1, -1.105 * p.z - 1.0526, -p.z);
  vNormal = n;
}`;

const FRAG = `
precision highp float;
uniform vec3 uPaper;
uniform vec3 uSheet;
uniform vec3 uBlue;
uniform vec3 uCoral;
uniform float uDark;
uniform float uCell;     // halftone cell size in px
uniform vec2 uMisreg;    // coral plate offset in px
uniform float uTime;
varying vec2 vUV;
varying vec3 vNormal;
varying float vGround;

// Halftone coverage (0..1) for a plate of given density at screen point p.
float dots(vec2 p, float density, float angle){
  float c = cos(angle), s = sin(angle);
  vec2 q = mat2(c, -s, s, c) * p;
  vec2 cell = mod(q, uCell) - uCell * 0.5;
  float r = sqrt(clamp(density, 0., 1.)) * uCell * 0.62;
  if (density < 0.03) return 0.0;
  return 1.0 - smoothstep(r - 0.8, r + 0.8, length(cell));
}

float wave(vec2 uv){
  return sin(uv.x * 7.0 + 1.3) * cos(uv.y * 5.0 - 0.7)
       + 0.5 * sin(uv.x * 13.0 + uv.y * 11.0)
       + 0.25 * cos(uv.x * 23.0 - uv.y * 17.0);
}

vec3 ink(vec3 base, vec3 inkColor, float a){
  // Light paper: inks multiply (overprint darkens). Dark paper: inks sit on top.
  vec3 lightMix = base * mix(vec3(1.0), inkColor, a);
  vec3 darkMix = mix(base, inkColor, a * 0.92);
  return mix(lightMix, darkMix, uDark);
}

void main(){
  vec2 px = gl_FragCoord.xy;
  if (vGround > 0.5) {
    float d = length((vUV - 0.5) * vec2(1.0, 1.7));
    float shade = smoothstep(0.5, 0.08, d) * 0.36;
    if (shade < 0.03) discard;
    float a = dots(px, shade, 0.26);
    if (a < 0.01) discard;
    gl_FragColor = vec4(ink(uPaper, uBlue, a), 1.0);
    return;
  }
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 L = normalize(vec3(-0.45, 0.65, 0.62));
  float diff = clamp(dot(n, L), 0.0, 1.0);
  float shadow = 1.0 - (0.28 + 0.72 * diff);           // 0 lit .. 1 dark

  // Blue plate: lighting, plus the dotted path you've walked.
  float pathY = 0.5 + 0.22 * sin(vUV.x * 7.2 + 0.6) + 0.05 * sin(vUV.x * 21.0);
  float onPath = smoothstep(0.016, 0.006, abs(vUV.y - pathY)) * step(0.45, fract(vUV.x * 26.0));
  float blueDensity = gl_FrontFacing ? max(shadow * 0.72, onPath * 0.95) : shadow * 0.55;

  // Coral plate: contour lines and a soft area tint (the printed map).
  float h = wave(vUV * 1.4);
  float contour = smoothstep(0.07, 0.02, abs(fract(h * 2.2) - 0.5));
  float marker = smoothstep(0.035, 0.02, length(vUV - vec2(0.86, 0.5 + 0.22 * sin(0.86 * 7.2 + 0.6))));
  float coralDensity = gl_FrontFacing ? max(max(contour * 0.7, 0.05 + 0.05 * h), marker) : 0.05;

  float aBlue = dots(px, blueDensity, 0.26);
  float aCoral = dots(px + uMisreg, coralDensity, 1.31);

  vec3 col = uSheet;
  col = ink(col, uCoral, aCoral);
  col = ink(col, uBlue, aBlue);
  // fold creases catch a sliver of light
  float crease = smoothstep(0.012, 0.0, abs(fract(vUV.x * 4.0 + 0.0001) - 0.0));
  col = mix(col, uSheet, crease * 0.35 * (1.0 - uDark));
  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader: ${log}`);
  }
  return sh;
}

/** Returns null when WebGL isn't available; callers show the still image instead. */
export function createRisoMap(canvas: HTMLCanvasElement, colors: RisoColors, { maxDpr = 2, cell = 5 } = {}): RisoMap | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    gl = null;
  }
  if (!gl) return null;

  let program: WebGLProgram;
  try {
    program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  } catch {
    return null;
  }

  // A grid of (u, v) — dense along x so the folds are crisp.
  const NX = 160;
  const NY = 24;
  const verts: number[] = [];
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const u0 = i / NX, u1 = (i + 1) / NX, v0 = j / NY, v1 = (j + 1) / NY;
      verts.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
    }
  }
  const sheet = new Float32Array(verts);
  const ground = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]);
  const sheetBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sheetBuf);
  gl.bufferData(gl.ARRAY_BUFFER, sheet, gl.STATIC_DRAW);
  const groundBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, groundBuf);
  gl.bufferData(gl.ARRAY_BUFFER, ground, gl.STATIC_DRAW);

  const loc = (n: string) => gl!.getUniformLocation(program, n);
  const aUV = gl.getAttribLocation(program, 'aUV');
  const u = {
    fold: loc('uFold'), turn: loc('uTurn'), aspect: loc('uAspect'), ground: loc('uGround'),
    paper: loc('uPaper'), sheet: loc('uSheet'), blue: loc('uBlue'), coral: loc('uCoral'),
    dark: loc('uDark'), cell: loc('uCell'), misreg: loc('uMisreg'), time: loc('uTime'),
  };

  let dpr = 1;
  const resize = () => {
    dpr = Math.min(maxDpr, globalThis.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };
  resize();

  const draw = (buf: WebGLBuffer | null, count: number) => {
    gl!.bindBuffer(gl!.ARRAY_BUFFER, buf);
    gl!.enableVertexAttribArray(aUV);
    gl!.vertexAttribPointer(aUV, 2, gl!.FLOAT, false, 0, 0);
    gl!.drawArrays(gl!.TRIANGLES, 0, count);
  };

  return {
    resize,
    render(fold, turn, time) {
      const g = gl!;
      g.viewport(0, 0, canvas.width, canvas.height);
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
      g.enable(g.DEPTH_TEST);
      g.useProgram(program);
      g.uniform1f(u.fold, fold);
      g.uniform1f(u.turn, turn);
      g.uniform1f(u.aspect, canvas.width / canvas.height);
      g.uniform3fv(u.paper, colors.paper);
      g.uniform3fv(u.sheet, colors.sheet);
      g.uniform3fv(u.blue, colors.blue);
      g.uniform3fv(u.coral, colors.coral);
      g.uniform1f(u.dark, colors.dark ? 1 : 0);
      g.uniform1f(u.cell, cell * dpr);
      g.uniform2f(u.misreg, 2.2 * dpr, -1.6 * dpr);
      g.uniform1f(u.time, time);
      // Shadow first, without depth, then the sheet on top.
      g.disable(g.DEPTH_TEST);
      g.uniform1f(u.ground, 1);
      draw(groundBuf, 6);
      g.enable(g.DEPTH_TEST);
      g.uniform1f(u.ground, 0);
      draw(sheetBuf, sheet.length / 2);
    },
    dispose() {
      const g = gl!;
      g.deleteBuffer(sheetBuf);
      g.deleteBuffer(groundBuf);
      g.deleteProgram(program);
      g.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

/** Read the riso colours from the page's CSS tokens, so the map follows light/dark mode. */
export function risoColorsFromCss(): RisoColors {
  const cs = getComputedStyle(document.documentElement);
  const hex = (name: string, fallback: string): [number, number, number] => {
    const v = (cs.getPropertyValue(name).trim() || fallback).replace('#', '');
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255) as [number, number, number];
  };
  const dark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  return {
    paper: hex('--paper', '#f4eddf'),
    sheet: hex('--card', '#fbf7ee'),
    blue: hex('--blue', '#2d4fa8'),
    coral: hex('--coral', '#ff7f6a'),
    dark,
  };
}
