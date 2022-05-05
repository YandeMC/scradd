/** @file Have The bot mimic what you say but don’t tell anyone who said it first. */
import { SlashCommandBuilder } from "@discordjs/builders";
import CONSTANTS from "../common/CONSTANTS.js";

import { replaceBackticks } from "../lib/markdown.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription(
			"(Mods only) Say what you tell me to say. Won’t publically share the author.",
		)
		.setDefaultPermission(false)
		.addStringOption((input) =>
			input.setName("message").setDescription("What you want me to say").setRequired(true),
		),

	async interaction(interaction) {
		const content = interaction.options.getString("message") ?? "";

		const message = await interaction.channel?.send({ content });

		if (message) {
			const channel = await interaction.guild?.channels.fetch(process.env.LOG_CHANNEL ?? "");

			await Promise.all([
				interaction.reply({ content: CONSTANTS.emojis.statuses.yes, ephemeral: true }),
				channel?.isText() &&
					channel.send({
						content: `${interaction.user.toString()} used \`/say\` in ${message.channel.toString()} to say \`${replaceBackticks(
							content,
						)}\` (${message.url})`,

						allowedMentions: { users: [] },
					}),
			]);
		}
	},
	censored:"channel"
};

export default info;
