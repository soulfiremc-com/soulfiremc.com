import {
  createActorGeometry,
  createTerrainGeometry,
  VERTEX_STRIDE,
  type RenderPosition,
} from "./voxel-geometry";
import {
  createSimulation,
  getSimulationSummary,
  INITIAL_SIMULATION_SEED,
  setSelectionPressure,
  stepSimulation,
} from "./voxel-simulation";
import type {
  Point,
  SelectionPressure,
  SimulationSummary,
} from "./voxel-simulation-types";

const vertexSource = `
precision highp float;
attribute vec3 a_position;
attribute vec3 a_color;
attribute vec2 a_uv;
uniform float u_aspect;
uniform vec2 u_pointer;
varying mediump vec3 v_color;
varying mediump vec2 v_uv;
void main() {
  vec3 p = a_position;
  float angle = u_pointer.x * 0.14;
  p.xz = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p.xz;
  float x = (p.x - p.z) * 0.7071;
  float y = p.y * 0.84 - (p.x + p.z) * (0.39 + u_pointer.y * 0.025) - 0.6;
  gl_Position = vec4(x * 0.109 / u_aspect, y * 0.109, -(p.x + p.z + p.y) * 0.025, 1.0);
  v_color = a_color;
  v_uv = a_uv;
}`;

const fragmentSource = `
precision mediump float;
varying mediump vec3 v_color;
varying mediump vec2 v_uv;
void main() {
  float edge = min(min(v_uv.x, 1.0 - v_uv.x), min(v_uv.y, 1.0 - v_uv.y));
  float border = mix(0.65, 1.0, smoothstep(0.0, 0.025, edge));
  gl_FragColor = vec4(v_color * border, 1.0);
}`;

const TICK_SECONDS = 0.1;

export function createVoxelRenderer(
  canvas: HTMLCanvasElement,
  onUnavailable: () => void,
  onUpdate: (summary: SimulationSummary) => void,
) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const terrainBuffer = gl.createBuffer();
  const actorBuffer = gl.createBuffer();
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (terrainBuffer) gl?.deleteBuffer(terrainBuffer);
    if (actorBuffer) gl?.deleteBuffer(actorBuffer);
    if (program) gl?.deleteProgram(program);
    for (const shader of shaders) gl?.deleteShader(shader);
  }
  if (!program || !terrainBuffer || !actorBuffer) {
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
  const attributes = [
    [gl.getAttribLocation(program, "a_position"), 3, 0],
    [gl.getAttribLocation(program, "a_color"), 3, 3],
    [gl.getAttribLocation(program, "a_uv"), 2, 6],
  ] as const;
  const aspectUniform = gl.getUniformLocation(program, "u_aspect");
  const pointerUniform = gl.getUniformLocation(program, "u_pointer");
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  let state = createSimulation(INITIAL_SIMULATION_SEED);
  let previous = new Map<string, RenderPosition>();
  let terrainVersion = -1;
  let terrainVertices = 0;
  let frame = 0;
  let lastFrame = 0;
  let lastUpdate = 0;
  let publishedGeneration = 0;
  let accumulator = 0;
  let time = 0;
  let speed: 1 | 3 = 1;
  let paused = true;
  let reducedMotion = true;
  let visible = true;
  let destroyed = false;
  let pointer: Point = [0, 0];
  let targetPointer: Point = [0, 0];

  function publish() {
    publishedGeneration = state.generation;
    onUpdate(getSimulationSummary(state));
  }

  function tick() {
    previous = new Map(
      state.bots.map((bot) => [bot.id, { x: bot.x, z: bot.z }]),
    );
    stepSimulation(state, TICK_SECONDS);
  }

  function bindGeometry(buffer: WebGLBuffer) {
    if (!gl) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [location, size, offset] of attributes) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(
        location,
        size,
        gl.FLOAT,
        false,
        VERTEX_STRIDE * 4,
        offset * 4,
      );
    }
  }

  function draw(now: number) {
    frame = 0;
    if (destroyed || !gl || !visible || document.hidden) {
      lastFrame = 0;
      return;
    }
    const elapsed = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
    lastFrame = now;
    const playing = !paused && !reducedMotion;
    if (playing) {
      time += elapsed * speed;
      accumulator += elapsed * speed;
      while (accumulator >= TICK_SECONDS) {
        tick();
        accumulator -= TICK_SECONDS;
      }
      const blend = 1 - Math.exp(-elapsed * 9);
      pointer = [
        pointer[0] + (targetPointer[0] - pointer[0]) * blend,
        pointer[1] + (targetPointer[1] - pointer[1]) * blend,
      ];
    }
    gl.useProgram(program);
    gl.uniform1f(aspectUniform, canvas.width / canvas.height);
    gl.uniform2f(pointerUniform, ...pointer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    bindGeometry(terrainBuffer);
    if (terrainVersion !== state.terrainVersion) {
      const geometry = createTerrainGeometry(state);
      gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.STATIC_DRAW);
      terrainVertices = geometry.length / VERTEX_STRIDE;
      terrainVersion = state.terrainVersion;
    }
    gl.drawArrays(gl.TRIANGLES, 0, terrainVertices);
    const alpha = playing ? accumulator / TICK_SECONDS : 1;
    const positions = new Map<string, RenderPosition>();
    const moving = new Set<string>();
    for (const bot of state.bots) {
      const from = previous.get(bot.id) ?? bot;
      positions.set(bot.id, {
        x: from.x + (bot.x - from.x) * alpha,
        z: from.z + (bot.z - from.z) * alpha,
      });
      if (Math.hypot(bot.x - from.x, bot.z - from.z) > 0.001)
        moving.add(bot.id);
    }
    const actors = createActorGeometry(state, positions, time, moving);
    bindGeometry(actorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, actors, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, actors.length / VERTEX_STRIDE);
    if (now - lastUpdate >= 500 || publishedGeneration !== state.generation) {
      publish();
      lastUpdate = now;
    }
    if (playing) frame = requestAnimationFrame(draw);
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
    destroy();
    onUnavailable();
  }

  function visibilityChanged() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    requestDraw();
  }

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver((entries) => {
    const entry = entries.at(-1);
    if (!entry) return;
    visible = entry.isIntersecting;
    visibilityChanged();
  });
  function destroy() {
    destroyed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    canvas.removeEventListener("webglcontextlost", contextLost);
    document.removeEventListener("visibilitychange", visibilityChanged);
    dispose();
  }
  resizeObserver.observe(canvas);
  intersectionObserver.observe(canvas);
  canvas.addEventListener("webglcontextlost", contextLost);
  document.addEventListener("visibilitychange", visibilityChanged);
  publish();
  resize();

  return {
    setMotion(nextPaused: boolean, nextReducedMotion: boolean) {
      paused = nextPaused;
      reducedMotion = nextReducedMotion;
      lastFrame = 0;
      if (reducedMotion) pointer = targetPointer = [0, 0];
      requestDraw();
    },
    setPointer(x: number, y: number) {
      if (paused || reducedMotion) return;
      targetPointer = [x, y];
      requestDraw();
    },
    setSpeed(nextSpeed: 1 | 3) {
      speed = nextSpeed;
    },
    setPressure(pressure: SelectionPressure) {
      setSelectionPressure(state, pressure);
      publish();
      requestDraw();
    },
    reset() {
      state = createSimulation((state.seed + 1) >>> 0, state.pressure);
      previous.clear();
      terrainVersion = -1;
      accumulator = time = 0;
      lastFrame = 0;
      publish();
      requestDraw();
    },
    step() {
      if (!paused && !reducedMotion) return;
      for (let index = 0; index < 10; index++) tick();
      time += 1;
      accumulator = 0;
      publish();
      requestDraw();
    },
    destroy,
  };
}
