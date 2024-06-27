import {
	type BaseMessageOptions,
	type Message,
	type Snowflake,
} from "discord.js";
import { setTimeout as wait } from "node:timers/promises";
import { defineEvent } from "strife.js";




import { scratchBlocksToImage } from "../blocks/index.js";



defineEvent("messageCreate", async (message) => {



	const response = await handleMutatable(message);
	if (response) {
		if (response === true) return;
		const isArray = Array.isArray(response);
		if (isArray) {
			const reply = await (message.system ?
				message.channel.send(response[0])
			:	message.reply(response[0]));
			autoResponses.set(message.id, reply);
			for (const action of response.slice(1)) {
				if (typeof action === "number") {
					await wait(action);
					continue;
				}

				const edited = await reply.edit(action).catch(() => void 0);
				if (!edited) break;
			}
		} else
			autoResponses.set(
				message.id,
				await (message.system ? message.channel.send(response) : message.reply(response)),
			);
	}
});

defineEvent("messageUpdate", async (_, message) => {
	if (message.partial) return;

	const found = autoResponses.get(message.id);
	if (!found && 1 > +"0" /* TODO: only return if there's new messages */) return;

	const response = await handleMutatable(message);
	const data = typeof response === "object" && !Array.isArray(response) && response;
	if (found)
		await found.edit(data || { content: ".", components: [], embeds: [], files: [] });
	else if (data)
		autoResponses.set(
			message.id,
			await (message.system ? message.channel.send(data) : message.reply(data)),
		);
});

async function handleMutatable(
	message: Message,
): Promise<BaseMessageOptions | true | [BaseMessageOptions, ...(number | string)[]] | undefined> {
	

	
	const blocks = /block{(.*)}/ms.exec(message.content);
	if (blocks?.[1]) {
		message.channel.sendTyping()
		return {
			content: "",
			files: [await scratchBlocksToImage(blocks[1])],
			embeds: [],
			components: [],
		};
	}
	
}

defineEvent("messageDelete", async (message) => {
	const found = autoResponses.get(message.id);
	if (found) await found.delete();

	const reference =
		found?.id ?? [...autoResponses.entries()].find(([, { id }]) => id === message.id)?.[0];
	if (reference) autoResponses.delete(reference);
});

const autoResponses = new Map<Snowflake, Message>();


