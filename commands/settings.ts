import { SlashCommandBuilder } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import Database from "../common/database.js";
import type { ChatInputCommand } from "../common/types/command";

export const userSettingsDatabase = new Database("user_settings");
await userSettingsDatabase.init();

const info: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setDescription("Customize personal settings")
		.addBooleanOption((input) =>
			input
				.setName("board-pings")
				.setDescription(
					`Whether to ping you when your messages get on #${CONSTANTS.channels.board?.name}`,
				)
				.setRequired(false),
		)
		.addBooleanOption((input) =>
			input
				.setName("level-up-pings")
				.setDescription("Whether to ping you when you level up")
				.setRequired(false),
		)
		.addBooleanOption((input) =>
			input
				.setName("weekly-pings")
				.setDescription(
					"Whether to ping you if you are one of the top 5 chatters in a week",
				)
				.setRequired(false),
		)
		.addBooleanOption((input) =>
			input
				.setName("autoreactions")
				.setDescription("Whether to automatically react to your messages with funny emojis")
				.setRequired(false),
		),
	async interaction(interaction) {
		const settingsForUser = userSettingsDatabase.data.find(({ user }) => user === interaction.user.id);
		const boardPings =
				interaction.options.getBoolean("board-pings") ??
				settingsForUser?.boardPings ??
				true,
			levelUpPings =
				interaction.options.getBoolean("level-up-pings") ??
				settingsForUser?.levelUpPings ??
				true,
			weeklyPings =
				interaction.options.getBoolean("weekly-pings") ??
				settingsForUser?.weeklyPings ??
				true,
			autoreactions =
				interaction.options.getBoolean("autoreactions") ??
				settingsForUser?.autoreactions ??
				true;
		userSettingsDatabase.data = settingsForUser
			? userSettingsDatabase.data.map((data) =>
					data.user === interaction.user.id
						? { user: data.user, boardPings, levelUpPings, weeklyPings, autoreactions }
						: data,
			  )
			: [
					...userSettingsDatabase.data,
					{
						user: interaction.user.id,
						boardPings,
						levelUpPings,
						weeklyPings,
						autoreactions,
					},
			  ];
		await interaction.reply({
			ephemeral: true,
			content:
				`${CONSTANTS.emojis.statuses.yes} Updated your settings!\n\n` +
				`Board Pings: ${CONSTANTS.emojis.statuses[boardPings ? "yes" : "no"]}\n` +
				`Level Up Pings: ${CONSTANTS.emojis.statuses[levelUpPings ? "yes" : "no"]}\n` +
				`Weekly Winner Pings: ${CONSTANTS.emojis.statuses[weeklyPings ? "yes" : "no"]}\n` +
				`Autoreactions: ${CONSTANTS.emojis.statuses[autoreactions ? "yes" : "no"]}`,
		});
	},
};
export default info;
