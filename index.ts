import { GatewayIntentBits } from "discord.js";
import { fileURLToPath } from "node:url";
import { client, login } from "strife.js";
import constants from "./common/constants.js";

await login({
	modulesDirectory: fileURLToPath(new URL("./modules", import.meta.url)),
	defaultCommandAccess: process.env.GUILD_ID,
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
}).catch((e) => {
	console.log(e);
});

client.user.setStatus("online");
