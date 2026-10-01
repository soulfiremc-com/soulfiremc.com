export const sdkCodeExamples = {
  typescript: `import { Effect } from "effect";
import { SoulFire } from "@soulfiremc/sdk";

const baseUrl = process.env.SOULFIRE_URL;
const token = process.env.SOULFIRE_TOKEN;
if (!baseUrl || !token) {
  throw new Error("Set SOULFIRE_URL and SOULFIRE_TOKEN first");
}

const program = Effect.scoped(
  Effect.gen(function* () {
    const client = yield* SoulFire.connect({ baseUrl, token });
    const record = (yield* client.instances()).find(
      (item) => item.friendlyName === "Docs tutorial",
    );
    if (!record) throw new Error("Create the Docs tutorial instance first");
    const instance = client.instance(record.id);
    const account = (yield* instance.bots()).find(
      (item) => item.accountName === "DocsBot_1",
    );
    if (!account) throw new Error("Add the DocsBot_1 account first");
    const bot = instance.bot(account.profileId);

    yield* Effect.addFinalizer(() => bot.stop().pipe(Effect.orDie));
    yield* bot.start();
    yield* bot.waitForOnline();
    yield* bot.chat.send("Hello from the TypeScript tutorial");
    console.log(\`Sent chat from \${account.accountName}; stopping the bot\`);
  }),
);

await Effect.runPromise(program);`,
  python: `import asyncio
import os

from effect_py import EffectGen, Scope, add_finalizer, gen, run_async, scoped
from soulfire import SoulFire, SoulFireOperationError


@gen
def program() -> EffectGen[None, SoulFireOperationError, Scope]:
    client = yield from SoulFire.connect(
        os.environ["SOULFIRE_URL"], token=os.environ["SOULFIRE_TOKEN"]
    )
    instances = yield from client.instances()
    record = next((item for item in instances if item.friendly_name == "Docs tutorial"), None)
    if record is None:
        raise RuntimeError("Create the Docs tutorial instance first")
    instance = client.instance(record.id)
    accounts = yield from instance.bots()
    account = next((item for item in accounts if item.account_name == "DocsBot_1"), None)
    if account is None:
        raise RuntimeError("Add the DocsBot_1 account first")
    bot = instance.bot(account.profile_id)

    yield from add_finalizer(lambda _: bot.stop().or_die())
    yield from bot.start()
    yield from bot.wait_for_online()
    yield from bot.chat.send("Hello from the Python tutorial")
    print(f"Sent chat from {account.account_name}; stopping the bot")


asyncio.run(run_async(scoped(program).or_die()))`,
} as const;
