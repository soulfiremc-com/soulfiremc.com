import assert from "node:assert/strict";
import test from "node:test";
import { createVoxelRenderer } from "@/components/home/voxel-renderer";
import type { SimulationSummary } from "@/components/home/voxel-simulation-types";

function rendererHarness() {
  const frames = new Map<number, FrameRequestCallback>();
  const saved = new Map<string, PropertyDescriptor | undefined>();
  const document = Object.assign(new EventTarget(), { hidden: false });
  const canvas = Object.assign(new EventTarget(), {
    width: 600,
    height: 500,
    getBoundingClientRect: () => ({ width: 600, height: 500 }),
    getContext: () => gl,
  });
  let intersection: (entries: { isIntersecting: boolean }[]) => void = () => {};
  let observersDisconnected = 0;
  let deletedBuffers = 0;
  let unavailable = 0;
  let pointer = [0, 0];
  let id = 0;
  let now = 100;
  let summary: SimulationSummary;
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    DEPTH_TEST: 5,
    ARRAY_BUFFER: 6,
    STATIC_DRAW: 7,
    DYNAMIC_DRAW: 8,
    FLOAT: 9,
    TRIANGLES: 10,
    COLOR_BUFFER_BIT: 16,
    DEPTH_BUFFER_BIT: 32,
    createProgram: () => ({}),
    createBuffer: () => ({}),
    createShader: () => ({}),
    deleteBuffer: () => {
      deletedBuffers++;
    },
    deleteProgram: () => {},
    deleteShader: () => {},
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => true,
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
    enable: () => {},
    clearColor: () => {},
    bindBuffer: () => {},
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    useProgram: () => {},
    uniform1f: () => {},
    uniform2f: (_location: unknown, x: number, y: number) => {
      pointer = [x, y];
    },
    clear: () => {},
    bufferData: () => {},
    drawArrays: () => {},
    viewport: () => {},
  };
  function install(name: string, value: unknown) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      value,
      configurable: true,
      writable: true,
    });
  }
  install("document", document);
  install("window", { devicePixelRatio: 1 });
  install("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  install("cancelAnimationFrame", (frame: number) => frames.delete(frame));
  install(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {
        observersDisconnected++;
      }
    },
  );
  install(
    "IntersectionObserver",
    class {
      constructor(callback: typeof intersection) {
        intersection = callback;
      }
      observe() {}
      disconnect() {
        observersDisconnected++;
      }
    },
  );
  const renderer = createVoxelRenderer(
    canvas as unknown as HTMLCanvasElement,
    () => {
      unavailable++;
    },
    (value) => {
      summary = value;
    },
  );
  assert.ok(renderer);
  function advance(count: number, milliseconds = 100) {
    for (let frame = 0; frame < count; frame++) {
      now += milliseconds;
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(now);
    }
  }
  return {
    renderer,
    canvas,
    document,
    advance,
    intersect: (entries: boolean[]) =>
      intersection(entries.map((isIntersecting) => ({ isIntersecting }))),
    get pendingFrames() {
      return frames.size;
    },
    get pointer() {
      return [...pointer];
    },
    get unavailable() {
      return unavailable;
    },
    get deletedBuffers() {
      return deletedBuffers;
    },
    get observersDisconnected() {
      return observersDisconnected;
    },
    summary() {
      renderer.setPressure(summary.pressure);
      return summary;
    },
    cleanup() {
      renderer.destroy();
      for (const [name, descriptor] of saved) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
      }
    },
  };
}

void test("the scene advances without pointer events and supports pause, step and speed", () => {
  const h = rendererHarness();
  try {
    h.renderer.setMotion(false, false);
    h.advance(1);
    const start = h.summary().remaining;
    h.advance(20);
    assert.ok(h.summary().remaining < start - 1);
    h.renderer.setMotion(true, false);
    h.advance(1);
    const paused = h.summary().remaining;
    h.advance(20);
    assert.equal(h.summary().remaining, paused);
    h.advance(1);
    assert.equal(h.pendingFrames, 0);
    h.renderer.step();
    assert.ok(Math.abs(h.summary().remaining - (paused - 1)) < 1e-8);
    h.renderer.setSpeed(3);
    h.renderer.setMotion(false, false);
    h.advance(1);
    const fast = h.summary().remaining;
    h.advance(10);
    assert.ok(Math.abs(h.summary().remaining - (fast - 3)) < 1e-8);
  } finally {
    h.cleanup();
  }
});

void test("the latest visibility entry wins and hidden time is not simulated", () => {
  const h = rendererHarness();
  try {
    h.renderer.setMotion(false, false);
    h.advance(1);
    h.intersect([false, true]);
    const before = h.summary().remaining;
    h.advance(20);
    assert.ok(h.summary().remaining < before - 1);
    h.intersect([true, false]);
    h.advance(1);
    assert.equal(h.pendingFrames, 0);
    const offscreen = h.summary().remaining;
    h.advance(10, 30_000);
    assert.equal(h.summary().remaining, offscreen);
    h.intersect([true]);
    h.advance(1);
    h.document.hidden = true;
    h.document.dispatchEvent(new Event("visibilitychange"));
    h.advance(10, 30_000);
    assert.equal(h.pendingFrames, 0);
    h.document.hidden = false;
    h.document.dispatchEvent(new Event("visibilitychange"));
    h.advance(1);
    assert.equal(h.summary().remaining, offscreen);
    h.advance(5);
    assert.ok(Math.abs(h.summary().remaining - (offscreen - 0.5)) < 1e-8);
  } finally {
    h.cleanup();
  }
});

void test("pause preserves the camera and reduced motion uses explicit steps", () => {
  const h = rendererHarness();
  try {
    h.renderer.setMotion(false, false);
    h.renderer.setPointer(1, -1);
    h.advance(10);
    const pointer = h.pointer;
    assert.ok(pointer[0] > 0.9 && pointer[1] < -0.9);
    h.renderer.setMotion(true, false);
    h.advance(1);
    assert.deepEqual(h.pointer, pointer);
    h.renderer.setMotion(false, true);
    h.advance(1);
    assert.deepEqual(h.pointer, [0, 0]);
    h.renderer.setPointer(1, 1);
    h.advance(1);
    assert.deepEqual(h.pointer, [0, 0]);
    assert.equal(h.pendingFrames, 0);
    const before = h.summary().remaining;
    h.renderer.step();
    h.advance(1);
    assert.ok(Math.abs(h.summary().remaining - (before - 1)) < 1e-8);
    h.advance(1);
    assert.equal(h.pendingFrames, 0);
  } finally {
    h.cleanup();
  }
});

void test("context loss disposes resources and publishes unavailable only once", () => {
  const h = rendererHarness();
  try {
    const lost = new Event("webglcontextlost", { cancelable: true });
    h.canvas.dispatchEvent(lost);
    assert.equal(lost.defaultPrevented, true);
    assert.equal(h.unavailable, 1);
    assert.equal(h.deletedBuffers, 2);
    assert.equal(h.observersDisconnected, 2);
    assert.equal(h.pendingFrames, 0);
    h.canvas.dispatchEvent(new Event("webglcontextlost"));
    assert.equal(h.unavailable, 1);
  } finally {
    h.cleanup();
  }
});
