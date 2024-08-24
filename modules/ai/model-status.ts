import axios from "axios";
import { EmbedBuilder } from "discord.js";
import { client } from "strife.js";
let messageId: string | null = null;
const models = ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"];
const apiUrl = "https://reverse.mubi.tech";
export let aiModel = models[0];
export async function updateStatus() {
	const channel = await client.channels.fetch("1276928257043857531");
	if (!channel?.isTextBased()) return;
	const messages = await channel?.messages.fetch({ limit: 10 }); // get recent messages
	const botMessage = messages.find((msg) => msg.author.id === client.user.id); // find a message that was sent from the bot

	if (botMessage) {
		messageId = botMessage.id; // use the message id we found bcs of yes
	}

	updateModels();
	setInterval(updateModels, 300000);
}

export async function updateModels() {
	let preferred = null;

	const embed = new EmbedBuilder().setTitle("Models Status").setTimestamp();

	for (const model of models) {
		try {
			const response = await axios.post(`${apiUrl}/v1/chat/completions`, {
				model: model,
				messages: [
					{ role: "system", content: "Say only one word" },
					{ role: "user", content: "hi" },
				],
			});

			if (response.status === 200 && response.data.choices) {
				embed.addFields({
					name: ":green_circle: | " + model,
					value: response.data.choices[0].message.content.replace("\n", " "),
					inline: true,
				});
				if (!preferred) preferred = model;
			} else {
				embed.addFields({
					name: ":red_circle: | " + model,
					value: "Errored",
					inline: true,
				});
			}
		} catch (error) {
			embed.addFields({ name: ":red_circle: | " + model, value: "Errored", inline: true });
		}
	}
	if (!preferred) preferred = "All Down";
	aiModel = preferred
	embed.setFooter({ text: `Current Model: ${aiModel}` });

	// update msg
	try {
		const channel = await client.channels.fetch("1276928257043857531");
		if (!channel?.isTextBased()) return;
		if (messageId) {
			const message = await channel?.messages.fetch(messageId);
			await message.edit({ embeds: [embed] });
		} else {
			const message = await channel?.send({ embeds: [embed] });
			messageId = message.id; // we need the id so we can change later even tho it will be the only message of the channel
		}
	} catch (error) {
		console.error("Error sending/updating message:", error);
	}
}
