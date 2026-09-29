export const sdkCodeExamples = {
  typescript: `import { AccountTypeCredentials } from "@soulfiremc/sdk";
import { SoulFire } from "@soulfiremc/sdk/node/promise";

await using soulfire = await SoulFire.install();
const name = "Hello World";
const existing = (await soulfire.instances()).find(
  (item) => item.friendlyName === name,
);
const instance = existing
  ? soulfire.instance(existing.id)
  : await soulfire.createInstance(name);

const username = "SoulFireBot";
let botId = (await instance.bots()).find(
  (item) => item.accountName === username,
)?.profileId;
if (!botId) {
  for await (const result of instance.loginCredentials({
    service: AccountTypeCredentials.OFFLINE,
    payload: [username],
  })) {
    if (
      result.data.case === "oneSuccess" &&
      result.data.value.account
    ) {
      await instance.addAccounts([result.data.value.account]);
      botId = result.data.value.account.profileId;
    }
  }
}
if (!botId) throw new Error("Could not create an offline bot");

const bot = instance.bot(botId);
await bot.start();
await bot.waitForOnline();
await bot.chat.send("Hello from SoulFire");`,
  python: `from soulfire import SoulFire
from soulfire.common_pb2 import OFFLINE

with SoulFire.install() as soulfire:
    name = "Hello World"
    existing = next(
        (item for item in soulfire.instances()
         if item.friendly_name == name),
        None,
    )
    instance = (
        soulfire.instance(existing.id)
        if existing else soulfire.create_instance(name)
    )

    username = "SoulFireBot"
    bot_id = next(
        (item.profile_id for item in instance.bots()
         if item.account_name == username),
        None,
    )
    if bot_id is None:
        for result in instance.login_credentials(OFFLINE, [username]):
            if result.WhichOneof("data") == "one_success":
                account = result.one_success.account
                instance.add_accounts([account])
                bot_id = account.profile_id
    if bot_id is None:
        raise RuntimeError("Could not create an offline bot")

    bot = instance.bot(bot_id)
    bot.start()
    bot.wait_for_online()
    bot.chat.send("Hello from SoulFire")`,
} as const;
