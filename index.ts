import { GatewayIntentBits } from "discord.js";
import mongoose from "mongoose";
import dns from "node:dns";
import { fileURLToPath } from "node:url";
import { client, login } from "strife.js";
import constants from "./common/constants.js";
dns.setDefaultResultOrder("ipv4first");

if (
	process.env.BOT_TOKEN.startsWith(
		Buffer.from(constants.users.scradd).toString("base64") + ".",
	) &&
	!process.argv.includes("--production")
)
	throw new Error("Refusing to run on production Scradd without `--production` flag");

await mongoose.connect(process.env.MONGO_URI);

await login({
	modulesDirectory: fileURLToPath(new URL("./modules", import.meta.url)),
	defaultCommandAccess: process.env.GUILD_ID,
	async handleError(error, event) {
		void error, event
	},
	clientOptions: {
		intents:
			GatewayIntentBits.Guilds |
			GatewayIntentBits.GuildMembers |
			GatewayIntentBits.GuildModeration |
			GatewayIntentBits.GuildEmojisAndStickers |
			GatewayIntentBits.GuildWebhooks |
			GatewayIntentBits.GuildInvites |
			GatewayIntentBits.GuildVoiceStates |
			GatewayIntentBits.GuildPresences |
			GatewayIntentBits.GuildMessages |
			GatewayIntentBits.GuildMessageReactions |
			GatewayIntentBits.DirectMessages |
			GatewayIntentBits.MessageContent |
			GatewayIntentBits.GuildScheduledEvents |
			GatewayIntentBits.AutoModerationExecution,
		presence: { status: "dnd" },
	},
	commandErrorMessage: `${constants.emojis.statuses.no} An error occurred.`,
});



const { cleanListeners } = await import("./common/database.js");
await cleanListeners();
client.user.setStatus("online");
