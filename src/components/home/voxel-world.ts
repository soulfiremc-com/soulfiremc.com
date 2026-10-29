import { generateN } from "@/lib/utils";

export type Formation = "scatter" | "circle" | "grid";
export type Point = readonly [number, number];

export const BOT_COUNT = 36;
export const botIds = generateN(BOT_COUNT);

export function terrainHeight(x: number, z: number) {
  const distance = Math.hypot(x, z);
  return (
    1 +
    Math.max(
      0,
      Math.floor((distance - 4) * 0.45 + Math.sin(x * 0.7) * Math.cos(z * 0.6)),
    )
  );
}

export const terrain = Array.from({ length: 21 * 21 }, (_, id) => {
  const x = (id % 21) - 10;
  const z = Math.floor(id / 21) - 10;
  return { id: `${x}:${z}`, x, z, height: terrainHeight(x, z) };
}).filter(
  ({ x, z }) => Math.hypot(x, z) < 9.2 + Math.sin(x * 1.3 + z * 0.7) * 0.65,
);

export function getFormation(formation: Formation): Point[] {
  return botIds.map((botId) => {
    const id = botId - 1;
    if (formation === "circle") {
      const angle = (id / BOT_COUNT) * Math.PI * 2;
      return [Math.cos(angle) * 4.7, Math.sin(angle) * 4.7];
    }
    if (formation === "grid") {
      return [((id % 6) - 2.5) * 1.25, (Math.floor(id / 6) - 2.5) * 1.25];
    }
    const angle = id * 2.399963;
    const radius = Math.sqrt((id + 0.5) / BOT_COUNT) * 6.1;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });
}
