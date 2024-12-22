import axios from "axios";
import { EmbedBuilder } from "discord.js";
import { client } from "strife.js";
let messageId: string | null = null;
const models = [
	// { supportsComplex: true, name: "claude-3-sonnet-20240229" },
	{ supportsComplex: true, name: "gpt-4" },
	{ supportsComplex: true, name: "gpt-4o" },
	{ supportsComplex: true, name: "gpt-4o-mini" },
	{ supportsComplex: true, name: "llama-3.2-3b-instruct" }
];

const apiUrl = "https://penguinai.abby.is-a.dev";
export let aiModel = models[0];
export async function updateStatus() {
	const response = await axios.post(`${apiUrl}/v1/chat/completions`, {
		model: aiModel.name,
		messages: [
			{ role: "system", content: "Say only one word" },
			{ role: "user", content: "hi" },
		],
	});
	console.log(response)
	const channel = await client.channels.fetch(
		"1276365384542453790"
	);
	if (!channel?.isTextBased()) return;
	const messages = await channel?.messages.fetch({ limit: 10 }); // get recent messages
	const botMessage = messages.find((msg) => msg.author.id === client.user.id); // find a message that was sent from the bot

	if (botMessage) {
		messageId = botMessage.id; // use the message id we found bcs of yes
	}
	console.log("updating status")
	// updateModels();
	// setInterval(updateModels, 300000);
}

export async function updateModels() {
	let preferred = null;

	const embed = new EmbedBuilder().setTitle("Models Status").setTimestamp();

	for (const model of models) {
		console.log(model)
		try {
			const response = await axios.post(`${apiUrl}/v1/chat/completions`, {
				model: model.name,
				messages: [
					{ role: "system", content: "Say only one word" },
					{ role: "user", content: "hi" },
				],
			});
			console.log(response)
			if (response.status === 200 && response.data.choices) {
				embed.addFields({
					name: ":green_circle: | " + model.name,
					value: response.data.choices[0].message.content.replace("\n", " "),
					inline: true,
				});
				if (!preferred) preferred = model;
			} else {
				embed.addFields({
					name: ":red_circle: | " + model.name,
					value: "Errored",
					inline: true,
				});
			}
		} catch (error) {
			console.log(error)
			embed.addFields({
				name: ":red_circle: | " + model.name,
				value: "Errored",
				inline: true,
			});
		}
	}
	if (!preferred) preferred = { supportsComplex: false, name: "All Down" };
	aiModel = preferred;
	embed.setFooter({ text: `Current Model: ${aiModel.name}` });

	// update msg
	try {
		const channel = await client.channels
			.fetch(
				process.env.NODE_ENV == "production" ?
					"1276928257043857531"
					: "1021061242049286237",
			)
			.catch(() => undefined);
		if (!channel?.isTextBased()) return;
		if (messageId) {
			const message = await channel?.messages.fetch(messageId);
			await message.edit({ embeds: [embed] });
		} else {
			//@ts-ignore im not dealing with that
			const message = await channel?.send({ embeds: [embed] });
			messageId = message.id; // we need the id so we can change later even tho it will be the only message of the channel
		}
	} catch (error) {
		console.error("Error sending/updating message:", error);
	}
}
