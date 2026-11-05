const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!DISCORD_BOT_TOKEN || !DISCORD_CLIENT_ID) {
  console.error(
    "Error: DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID environment variables are required",
  );
  process.exit(1);
}

const metadata = [
  {
    key: "verified_account",
    name: "Soulfire Account",
    description: "Has a verified Soulfire account",
    type: 7, // boolean_equal
  },
  {
    key: "email_verified",
    name: "Email Verified",
    description: "Has a verified email address",
    type: 7, // boolean_equal
  },
  {
    key: "account_created",
    name: "Account Created",
    description: "Account creation date",
    type: 6, // datetime_less_than_or_equal
  },
];

async function main() {
  const response = await fetch(
    `https://discord.com/api/v10/applications/${DISCORD_CLIENT_ID}/role-connections/metadata`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(`Failed to register metadata: ${response.status} ${body}`);
    process.exit(1);
  }

  const result = await response.json();
  console.log(
    "Metadata registered successfully:",
    JSON.stringify(result, null, 2),
  );
}

main().catch(console.error);
