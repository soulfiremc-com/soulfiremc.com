export const sdkCodeExamples = {
  typescript: `import { Effect } from "effect";
import { SoulFire } from "@soulfiremc/sdk/bun";

const program = Effect.scoped(
  Effect.gen(function* () {
    const bot = yield* SoulFire.createBot({
      server: "localhost:25565",
      username: "DocsBot_1",
      installation: { version: "2.10.2" },
    });

    yield* bot.chat.send("Hello from SoulFire");
    yield* Effect.logInfo(\`Health: \${bot.state.player?.health}\`);
  }),
);

await Effect.runPromise(program);`,
  python: `import asyncio

from effect_py import EffectGen, Scope, gen, run_async, scoped, sync
from soulfire import SoulFire, SoulFireOperationError


@gen
def program() -> EffectGen[None, SoulFireOperationError, Scope]:
    bot = yield from SoulFire.create_bot(
        server="localhost:25565",
        username="DocsBot_1",
        installation={"version": "2.10.2"},
    )
    yield from bot.chat.send("Hello from SoulFire")
    yield from sync(lambda: print(bot.state.player))


asyncio.run(run_async(scoped(program).or_die()))`,
} as const;
