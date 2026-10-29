import {
  BOT_COUNT,
  getFormation,
  terrain,
  type Formation,
  type Point,
} from "./voxel-world";

const vertexSource = `
precision highp float;
attribute vec3 a_position;
attribute vec2 a_uv;
attribute float a_face;
attribute float a_bot;
uniform float u_time;
uniform float u_progress;
uniform float u_aspect;
uniform vec2 u_pointer;
uniform vec2 u_from[${BOT_COUNT}];
uniform vec2 u_to[${BOT_COUNT}];
varying vec2 v_uv;
varying vec3 v_world;
varying float v_face;
varying float v_bot;
void main() {
  vec3 p = a_position;
  if (a_bot >= 0.0) {
    int id = int(a_bot);
    vec2 start = vec2(0.0);
    vec2 target = vec2(0.0);
    for (int i = 0; i < ${BOT_COUNT}; i++) {
      if (i == id) { start = u_from[i]; target = u_to[i]; }
    }
    vec2 position = mix(start, target, u_progress);
    vec2 tile = floor(position + 0.5);
    float h = 1.0 + max(0.0, floor((length(tile) - 4.0) * 0.45 + sin(tile.x * 0.7) * cos(tile.y * 0.6)));
    p += vec3(position.x, h + 0.04, position.y);
  }
  v_world = p;
  float angle = u_pointer.x * 0.12;
  p.xz = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p.xz;
  float x = (p.x - p.z) * 0.7071;
  float y = p.y * 0.84 - (p.x + p.z) * (0.39 + u_pointer.y * 0.025) - 0.35;
  gl_Position = vec4(x * 0.104 / u_aspect, y * 0.104, -(p.x + p.z + p.y) * 0.025, 1.0);
  v_uv = a_uv;
  v_face = a_face;
  v_bot = a_bot;
}`;

const fragmentSource = `
precision mediump float;
uniform float u_time;
varying vec2 v_uv;
varying vec3 v_world;
varying float v_face;
varying float v_bot;
void main() {
  float edge = min(min(v_uv.x, 1.0 - v_uv.x), min(v_uv.y, 1.0 - v_uv.y));
  float face = v_face;
  vec3 color = vec3(0.035, 0.13, 0.17);
  if (face > 1.5) color = vec3(0.075, 0.24, 0.28);
  if (face > 2.5) {
    float variation = sin(floor(v_world.x) * 7.3 + floor(v_world.z) * 4.7) * 0.035;
    color = vec3(0.12, 0.36, 0.40) + variation;
    float ring = abs(length(v_world.xz) - mod(u_time * 0.8, 13.0));
    color += vec3(0.07, 0.37, 0.42) * exp(-ring * ring * 2.0);
    color *= mix(0.68, 1.0, smoothstep(0.0, 0.035, edge));
  } else {
    color *= 0.65 + 0.35 * smoothstep(0.0, 2.5, v_world.y);
    color *= mix(0.6, 1.0, smoothstep(0.0, 0.02, edge));
  }
  if (v_bot >= 0.0) {
    color = mix(vec3(0.25, 0.70, 0.79), vec3(0.77, 0.98, 0.96), face / 3.0);
  }
  gl_FragColor = vec4(color, 1.0);
}`;

function createGeometry() {
  const vertices: number[] = [];
  function cube(
    x: number,
    z: number,
    bottom: number,
    top: number,
    half: number,
    bot = -1,
  ) {
    const faces = [
      [
        [x - half, bottom, z + half],
        [x + half, bottom, z + half],
        [x + half, top, z + half],
        [x - half, top, z + half],
      ],
      [
        [x + half, bottom, z - half],
        [x + half, bottom, z + half],
        [x + half, top, z + half],
        [x + half, top, z - half],
      ],
      [
        [x - half, top, z - half],
        [x + half, top, z - half],
        [x + half, top, z + half],
        [x - half, top, z + half],
      ],
    ];
    const uv = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    for (const [face, corners] of faces.entries()) {
      for (const index of [0, 1, 2, 0, 2, 3]) {
        vertices.push(...corners[index], ...uv[index], face + 1, bot);
      }
    }
  }
  for (const block of terrain) cube(block.x, block.z, -0.7, block.height, 0.49);
  for (let id = 0; id < BOT_COUNT; id++) {
    cube(0, 0, 0, 0.42, 0.12, id);
    cube(0, 0, 0.42, 0.68, 0.17, id);
  }
  return new Float32Array(vertices);
}

export function createVoxelRenderer(
  canvas: HTMLCanvasElement,
  onUnavailable: () => void,
) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  function dispose() {
    if (buffer) gl?.deleteBuffer(buffer);
    if (program) gl?.deleteProgram(program);
    for (const shader of shaders) gl?.deleteShader(shader);
  }
  if (!program || !buffer) {
    dispose();
    return null;
  }
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertexSource],
    [gl.FRAGMENT_SHADER, fragmentSource],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader) {
      dispose();
      return null;
    }
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      dispose();
      return null;
    }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    dispose();
    return null;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const geometry = createGeometry();
  gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.STATIC_DRAW);
  for (const [name, size, offset] of [
    ["a_position", 3, 0],
    ["a_uv", 2, 3],
    ["a_face", 1, 5],
    ["a_bot", 1, 6],
  ] as const) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 7 * 4, offset * 4);
  }
  const uniforms = Object.fromEntries(
    [
      "u_time",
      "u_progress",
      "u_aspect",
      "u_pointer",
      "u_from[0]",
      "u_to[0]",
    ].map((name) => [name, gl.getUniformLocation(program, name)]),
  );
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);
  let from = getFormation("scatter");
  let to = from;
  let transitionElapsed = 1400;
  let frame = 0;
  let lastFrame = 0;
  let time = 4;
  let paused = false;
  let visible = true;
  let reducedMotion = false;
  let destroyed = false;
  let pointer: Point = [0, 0];
  const ease = (value: number) => {
    const t = Math.min(1, Math.max(0, value));
    return t * t * (3 - 2 * t);
  };
  function updatePositions() {
    gl?.uniform2fv(uniforms["u_from[0]"], new Float32Array(from.flat()));
    gl?.uniform2fv(uniforms["u_to[0]"], new Float32Array(to.flat()));
  }
  function draw(now: number) {
    frame = 0;
    if (destroyed || !gl || !visible || document.hidden) {
      lastFrame = 0;
      return;
    }
    if (lastFrame && !paused && !reducedMotion) {
      const elapsed = Math.min(now - lastFrame, 50);
      time += elapsed / 1000;
      transitionElapsed += elapsed;
    }
    lastFrame = now;
    const progress = reducedMotion ? 1 : ease(transitionElapsed / 1400);
    gl.uniform1f(uniforms.u_time, time);
    gl.uniform1f(uniforms.u_progress, progress);
    gl.uniform1f(uniforms.u_aspect, canvas.width / canvas.height);
    gl.uniform2f(uniforms.u_pointer, ...pointer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, geometry.length / 7);
    if (!paused && !reducedMotion) frame = requestAnimationFrame(draw);
  }
  function requestDraw() {
    if (!frame && !destroyed && visible && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      1.5,
      Math.sqrt(1_000_000 / Math.max(width * height, 1)),
    );
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    gl?.viewport(0, 0, canvas.width, canvas.height);
    requestDraw();
  }
  function contextLost(event: Event) {
    event.preventDefault();
    cancelAnimationFrame(frame);
    destroyed = true;
    onUnavailable();
  }
  function visibilityChanged() {
    lastFrame = 0;
    requestDraw();
  }
  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    lastFrame = 0;
    if (!visible) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else requestDraw();
  });
  resizeObserver.observe(canvas);
  intersectionObserver.observe(canvas);
  canvas.addEventListener("webglcontextlost", contextLost);
  document.addEventListener("visibilitychange", visibilityChanged);
  updatePositions();
  resize();
  return {
    setFormation(formation: Formation) {
      const progress = reducedMotion ? 1 : ease(transitionElapsed / 1400);
      from = from.map((point, id) => [
        point[0] + (to[id][0] - point[0]) * progress,
        point[1] + (to[id][1] - point[1]) * progress,
      ]);
      to = getFormation(formation);
      transitionElapsed = paused || reducedMotion ? 1400 : 0;
      updatePositions();
      requestDraw();
    },
    setMotion(nextPaused: boolean, nextReducedMotion: boolean) {
      paused = nextPaused;
      reducedMotion = nextReducedMotion;
      if (reducedMotion) transitionElapsed = 1400;
      if (paused || reducedMotion) pointer = [0, 0];
      requestDraw();
    },
    setPointer(x: number, y: number) {
      if (paused || reducedMotion) return;
      pointer = [x, y];
      requestDraw();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", contextLost);
      document.removeEventListener("visibilitychange", visibilityChanged);
      dispose();
    },
  };
}
