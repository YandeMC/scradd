import config from "../common/config.js";
import { defineEvent } from "strife.js";

const upRegex = /Monitor is UP: (.+?) \( (.+?) \).+?It was down for (.+?)\./;
const downRegex = /Monitor is DOWN: (.+?) \( (.+?) \) - Reason: (.+)/;

// Function to transform messages
function transformMessage(message: any) {
	if (upRegex.test(message)) {
		const [, name, , downtime] = message.match(upRegex);
		return `${name} is back up! It was down for ${downtime}.`;
	} else if (downRegex.test(message)) {
		const [, name, , reason] = message.match(downRegex);
		return `${name} is down! Reason: ${reason}.`;
	} else {
		return "Invalid message format.";
	}
}
defineEvent("messageCreate", async (m) => {
	if (m.channelId != "1204520452370735175") return;
	if (m.author.username != "UptimeRobot") return;
	if (!m.author.bot) return;
	config.channels.general?.send({ content: `${transformMessage(m.content)}` });
});
