import { createAnimator } from "./voxel-animation";
import { createEffectsGeometry } from "./voxel-effects-geometry";
import {
  advanceFlora,
  createFloraGeometry,
  createFloraGrowth,
} from "./voxel-flora-geometry";
import {
  createActorGeometry,
  createTerrainGeometry,
  VERTEX_STRIDE,
  type Mesh,
} from "./voxel-geometry";
import { collectLights, MAX_LIGHTS } from "./voxel-lights";
import {
  createSimulation,
  getSimulationSummary,
  setSelectionPressure,
  stepSimulation,
  triggerBreach,
  triggerStorm,
} from "./voxel-simulation";
import type {
  Point,
  SelectionPressure,
  SimulationSummary,
} from "./voxel-simulation-types";

// Firefox rejects a program when a uniform or varying has a different
// precision in each stage. Keep every uniform in one stage only and give
// every varying an explicit precision.
const vertexSource = `
precision highp float;
attribute vec3 a_position;
attribute vec3 a_color;
attribute vec2 a_uv;
attribute float a_glow;
attribute vec2 a_fx;
uniform float u_aspect;
uniform float u_time;
uniform vec2 u_pointer;
uniform vec2 u_shake;
varying mediump vec3 v_color;
varying mediump vec2 v_uv;
varying mediump float v_glow;
varying mediump vec2 v_fx;
varying mediump vec3 v_world;
void main() {
  vec3 p = a_position;
  float kind = a_fx.x;
  if (kind < 0.5) {
    // Wind: plants and flags lean with two overlapping gusts.
    float gust = sin(u_time * 1.7 + p.x * 0.9 + p.z * 0.6) + 0.5 * sin(u_time * 3.1 + p.x * 1.7 - p.z * 1.3);
    p.x += gust * 0.045 * a_fx.y;
    p.z += gust * 0.03 * a_fx.y;
  } else if (kind < 1.5) {
    p.y += (sin(u_time * 1.5 + p.x * 1.1 + p.z * 0.7) + sin(u_time * 1.1 - p.x * 0.6 + p.z * 1.3)) * 0.02 * a_fx.y;
  }
  v_world = p;
  float angle = u_pointer.x * 0.14;
  p.xz = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p.xz;
  float x = (p.x - p.z) * 0.7071;
  float y = p.y * 0.84 - (p.x + p.z) * (0.39 + u_pointer.y * 0.025) - 0.6;
  gl_Position = vec4(x * 0.105 / u_aspect + u_shake.x, y * 0.105 + u_shake.y, -(p.x + p.z + p.y) * 0.025, 1.0);
  if (kind > 3.5 && kind < 4.5) {
    // A halo is a point that grows into a quad facing the camera.
    gl_Position.xy += (a_uv - 0.5) * 2.0 * a_fx.y * 0.105 * vec2(1.0 / u_aspect, 1.0);
    // Draw it in front of everything. With a real depth, nearby blocks cut
    // the glow along a hard diagonal line.
    gl_Position.z = -0.999;
  }
  v_color = a_color;
  v_uv = a_uv;
  v_fx = a_fx;
  v_glow = a_glow;
}`;

const fragmentSource = `
precision mediump float;
uniform float u_night;
uniform float u_flash;
uniform vec4 u_wave;
uniform float u_lightCount;
uniform vec4 u_lights[${MAX_LIGHTS}];
uniform vec3 u_lightColors[${MAX_LIGHTS}];
varying mediump vec3 v_color;
varying mediump vec2 v_uv;
varying mediump float v_glow;
varying mediump vec2 v_fx;
varying mediump vec3 v_world;
void main() {
  float kind = v_fx.x;
  if (kind > 3.5) {
    float reach = length(v_uv - 0.5) * 2.0;
    if (kind > 4.5) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, v_fx.y * (1.0 - smoothstep(0.35, 1.0, reach)));
      return;
    }
    float falloff = max(0.0, 1.0 - reach);
    vec3 halo = v_color * falloff * falloff * mix(0.4, 1.0, u_night);
    // A low alpha keeps the glow close to additive.
    gl_FragColor = vec4(halo, max(halo.r, max(halo.g, halo.b)) * 0.35);
    return;
  }
  float edge = min(min(v_uv.x, 1.0 - v_uv.x), min(v_uv.y, 1.0 - v_uv.y));
  float border = mix(0.65, 1.0, smoothstep(0.0, 0.025, edge));
  border = mix(border, 1.0, smoothstep(0.75, 1.0, v_glow));
  float ambient = mix(1.0, 0.38, u_night);
  vec3 moonlight = mix(vec3(1.0), vec3(0.68, 0.79, 1.0), u_night);
  // Lights are summed per pixel. Per-vertex sums showed the triangle seam
  // on large faces next to a light.
  vec3 lamps = vec3(0.0);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (float(i) >= u_lightCount) break;
    vec3 offset = v_world - u_lights[i].xyz;
    offset.y *= 0.6;
    lamps += u_lightColors[i] * exp(-dot(offset, offset) / (u_lights[i].w * u_lights[i].w));
  }
  vec3 light = moonlight * ambient + min(lamps, vec3(2.0)) * mix(0.3, 1.0, u_night) + u_flash;
  vec3 color = v_color;
  float glow = v_glow;
  float alpha = 1.0;
  if (kind > 2.5) {
    alpha = v_fx.y;
    border = 1.0;
  } else if (kind > 1.5) {
    // Lava: slow bright veins on a block grid, always at full brightness.
    vec3 cell = floor(v_world * 4.0 + 0.5) / 4.0;
    float flow = sin(cell.x * 2.7 + cell.z * 1.9 + u_wave.z) * sin(cell.z * 3.1 - cell.x * 1.1 + cell.y * 2.3 - u_wave.w);
    color = mix(vec3(0.78, 0.13, 0.02), vec3(1.0, 0.74, 0.18), smoothstep(-0.5, 0.9, flow)) * (0.7 + 0.3 * v_color.r);
    glow = 1.0;
    border = 1.0;
  } else if (kind > 0.5) {
    // Water: ripples and glints on a block grid over a see-through body.
    vec2 cell = floor(v_world.xz * 4.0 + 0.5) / 4.0;
    float ripple = sin(cell.x * 2.1 + cell.y * 1.3 + u_wave.x) * sin(cell.y * 2.6 - cell.x * 0.9 + u_wave.y);
    float glint = smoothstep(0.7, 0.95, ripple);
    color = v_color * (1.0 + ripple * 0.1) + glint * vec3(0.3, 0.4, 0.4);
    alpha = 0.7 + glint * 0.2;
    border = 1.0;
  }
  gl_FragColor = vec4(color * border * max(light, vec3(glow)) * alpha, alpha);
}`;

const TICK_SECONDS = 0.1;

export function createVoxelRenderer(
  canvas: HTMLCanvasElement,
  onUnavailable: () => void,
  onUpdate: (summary: SimulationSummary) => void,
  /** The first world. Every visit starts a different one by default. */
  seed = Math.floor(Math.random() * 2 ** 32),
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
  const effectsBuffer = gl.createBuffer();
  const floraBuffer = gl.createBuffer();
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (terrainBuffer) gl?.deleteBuffer(terrainBuffer);
    if (actorBuffer) gl?.deleteBuffer(actorBuffer);
    if (effectsBuffer) gl?.deleteBuffer(effectsBuffer);
    if (floraBuffer) gl?.deleteBuffer(floraBuffer);
    if (program) gl?.deleteProgram(program);
    for (const shader of shaders) gl?.deleteShader(shader);
  }
  if (
    !program ||
    !terrainBuffer ||
    !actorBuffer ||
    !effectsBuffer ||
    !floraBuffer
  ) {
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
    [gl.getAttribLocation(program, "a_glow"), 1, 8],
    [gl.getAttribLocation(program, "a_fx"), 2, 9],
  ] as const;
  const aspectUniform = gl.getUniformLocation(program, "u_aspect");
  const pointerUniform = gl.getUniformLocation(program, "u_pointer");
  const shakeUniform = gl.getUniformLocation(program, "u_shake");
  const nightUniform = gl.getUniformLocation(program, "u_night");
  const flashUniform = gl.getUniformLocation(program, "u_flash");
  const timeUniform = gl.getUniformLocation(program, "u_time");
  const waveUniform = gl.getUniformLocation(program, "u_wave");
  const lightsUniform = gl.getUniformLocation(program, "u_lights[0]");
  const lightCountUniform = gl.getUniformLocation(program, "u_lightCount");
  const lightColorsUniform = gl.getUniformLocation(program, "u_lightColors[0]");
  gl.enable(gl.DEPTH_TEST);
  // Fragments are premultiplied, so glows can add light without a second mode.
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  let state = createSimulation(seed);
  const animator = createAnimator();
  let flora = createFloraGrowth();
  let floraStale = true;
  let terrainVersion = -1;
  const empty: Mesh = { vertices: new Float32Array(0), opaque: 0 };
  let terrainMesh = empty;
  let floraMesh = empty;
  let frame = 0;
  let lastFrame = 0;
  let lastUpdate = 0;
  let publishedGeneration = 0;
  let accumulator = 0;
  let time = 0;
  let night = 0;
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
    animator.beforeTick(state);
    stepSimulation(state, TICK_SECONDS);
    if (advanceFlora(flora, state, TICK_SECONDS)) floraStale = true;
  }

  function drawMesh(buffer: WebGLBuffer, mesh: Mesh, blended: boolean) {
    if (!gl) return;
    const first = blended ? mesh.opaque : 0;
    const count = blended
      ? mesh.vertices.length / VERTEX_STRIDE - mesh.opaque
      : mesh.opaque;
    if (count <= 0) return;
    bindGeometry(buffer);
    gl.drawArrays(gl.TRIANGLES, first, count);
  }

  function upload(buffer: WebGLBuffer, mesh: Mesh, usage: number) {
    if (!gl) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, usage);
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
    const playing = !paused;
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
      night += (state.adventure.night - night) * (1 - Math.exp(-elapsed * 3));
    }
    const blast = state.events
      // oxlint-disable-next-line unicorn/prefer-array-find -- this takes the last match; findLast needs the ES2023 lib
      .filter((event) => event.kind === "explode" && event.age < 0.35)
      .at(-1);
    const bolt = state.events
      // oxlint-disable-next-line unicorn/prefer-array-find -- this takes the last match; findLast needs the ES2023 lib
      .filter((event) => event.kind === "lightning" && event.age < 0.25)
      .at(-1);
    const shake = reducedMotion
      ? 0
      : blast
        ? (1 - blast.age / 0.35) * 0.007
        : 0;
    gl.useProgram(program);
    gl.uniform1f(aspectUniform, canvas.width / canvas.height);
    gl.uniform2f(pointerUniform, ...pointer);
    gl.uniform2f(
      shakeUniform,
      Math.sin(time * 71) * shake,
      Math.cos(time * 83) * shake,
    );
    gl.uniform1f(nightUniform, night);
    gl.uniform1f(timeUniform, time);
    // Wrapped phases stay precise in a mediump fragment shader.
    gl.uniform4f(
      waveUniform,
      (time * 1.3) % (Math.PI * 2),
      (time * 1.0) % (Math.PI * 2),
      (time * 0.7) % (Math.PI * 2),
      (time * 0.5) % (Math.PI * 2),
    );
    const lights = collectLights(state, time);
    gl.uniform1f(lightCountUniform, lights.count);
    gl.uniform4fv(lightsUniform, lights.positions);
    gl.uniform3fv(lightColorsUniform, lights.colors);
    gl.uniform1f(
      flashUniform,
      reducedMotion ? 0 : bolt ? (1 - bolt.age / 0.25) * 0.09 : 0,
    );
    if (terrainVersion !== state.terrainVersion) {
      // A paused step or a reset can change tiles without a tick.
      if (advanceFlora(flora, state, 0)) floraStale = true;
      terrainMesh = createTerrainGeometry(state);
      upload(terrainBuffer, terrainMesh, gl.STATIC_DRAW);
      terrainVersion = state.terrainVersion;
      floraStale = true;
    }
    if (floraStale) {
      floraMesh = createFloraGeometry(state, flora);
      upload(floraBuffer, floraMesh, gl.DYNAMIC_DRAW);
      floraStale = false;
    }
    const alpha = playing ? accumulator / TICK_SECONDS : 1;
    const poses = animator.frame(state, alpha, playing ? elapsed * speed : 0);
    const actorMesh = createActorGeometry(state, poses, time);
    upload(actorBuffer, actorMesh, gl.DYNAMIC_DRAW);
    const effectsMesh = createEffectsGeometry(state, time, poses);
    upload(effectsBuffer, effectsMesh, gl.DYNAMIC_DRAW);
    const meshes = [
      [terrainBuffer, terrainMesh],
      [floraBuffer, floraMesh],
      [actorBuffer, actorMesh],
      [effectsBuffer, effectsMesh],
    ] as const;
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for (const [buffer, mesh] of meshes) drawMesh(buffer, mesh, false);
    // Water, shadows, smoke and glows blend over the solid scene.
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    for (const [buffer, mesh] of meshes) drawMesh(buffer, mesh, true);
    gl.depthMask(true);
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
      animator.reset();
      flora = createFloraGrowth();
      terrainVersion = -1;
      accumulator = time = 0;
      night = 0;
      lastFrame = 0;
      publish();
      requestDraw();
    },
    step() {
      if (!paused) return;
      for (let index = 0; index < 10; index++) tick();
      animator.snap();
      time += 1;
      night = state.adventure.night;
      accumulator = 0;
      publish();
      requestDraw();
    },
    breach() {
      const accepted = triggerBreach(state);
      publish();
      requestDraw();
      return accepted;
    },
    storm() {
      const accepted = triggerStorm(state);
      publish();
      requestDraw();
      return accepted;
    },
    destroy,
  };
}
