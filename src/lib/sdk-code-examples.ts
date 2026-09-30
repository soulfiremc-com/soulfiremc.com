export const sdkCodeExamples = {
  typescript: `import { Effect, Stream } from "effect";
import { AccountTypeCredentials } from "@soulfiremc/sdk";
import { SoulFire } from "@soulfiremc/sdk/node";

const program = Effect.scoped(
  Effect.gen(function* () {
    const soulfire = yield* SoulFire.install();
    const name = "Hello World";
    const existing = (yield* soulfire.instances()).find(
      (item) => item.friendlyName === name,
    );
    const instance = existing
      ? soulfire.instance(existing.id)
      : yield* soulfire.createInstance(name);

    const username = "SoulFireBot";
    let botId = (yield* instance.bots()).find(
      (item) => item.accountName === username,
    )?.profileId;
    if (!botId) {
      const results = yield* instance.loginCredentials({
        service: AccountTypeCredentials.OFFLINE,
        payload: [username],
      }).pipe(Stream.runCollect);
      for (const result of results) {
        if (result.data.case === "oneSuccess" && result.data.value.account) {
          const account = result.data.value.account;
          yield* instance.addAccounts([account]);
          botId = account.profileId;
        }
      }
    }
    if (!botId) throw new Error("Could not create an offline bot");

    const bot = instance.bot(botId);
    yield* bot.start();
    yield* bot.waitForOnline();
    yield* bot.chat.send("Hello from SoulFire");
  }),
);

await Effect.runPromise(program);`,
  python: `import asyncio

from effect_py import EffectGen, Scope, gen, run_async, scoped
from soulfire import SoulFire, SoulFireOperationError
from soulfire.common_pb2 import OFFLINE


@gen
def program() -> EffectGen[None, SoulFireOperationError, Scope]:
    soulfire = yield from SoulFire.install()
    name = "Hello World"
    instances = yield from soulfire.instances()
    existing = next((item for item in instances if item.friendly_name == name), None)
    instance = (
        soulfire.instance(existing.id)
        if existing else (yield from soulfire.create_instance(name))
    )

    username = "SoulFireBot"
    bots = yield from instance.bots()
    bot_id = next(
        (item.profile_id for item in bots if item.account_name == username), None
    )
    if bot_id is None:
        results = yield from instance.login_credentials(OFFLINE, [username]).run_collect()
        for result in results:
            if result.WhichOneof("data") == "one_success":
                account = result.one_success.account
                yield from instance.add_accounts([account])
                bot_id = account.profile_id
    if bot_id is None:
        raise RuntimeError("Could not create an offline bot")

    bot = instance.bot(bot_id)
    yield from bot.start()
    yield from bot.wait_for_online()
    yield from bot.chat.send("Hello from SoulFire")


asyncio.run(run_async(scoped(program).or_die()))`,
} as const;
