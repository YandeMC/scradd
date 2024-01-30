import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ComponentType,
	GuildMember,
	User,
} from "discord.js";
import config from "../../common/config.js";
import {
	client,
	defineSubcommands,
	defineEvent,
	defineButton,
	defineSelect,
	defineMenuCommand,
} from "strife.js";
import getUserRank, { top } from "./rank.js";
import giveXp, { giveXpForMessage } from "./giveXp.js";
import constants from "../../common/constants.js";

defineEvent("messageCreate", async (message) => {
	if (message.guild?.id !== config.guild.id) return;

	await giveXpForMessage(message);
});

defineSubcommands(
	{
		name: "xp",
		description: "Commands to view users’ XP amounts",

		subcommands: {
			rank: {
				description: "View a user’s XP rank",

				options: {
					user: {
						type: ApplicationCommandOptionType.User,
						description: "User to view (defaults to you)",
					},
				},
			},
			give: {
				description: "Give someone xp (yande only)",

				options: {
					user: {
						type: ApplicationCommandOptionType.User,
						description: "User to give xp to",
					},
					amount: {
						type: ApplicationCommandOptionType.Integer,
						description: "how much",
					},
				},
			},
			leaderboard: {
				description: "View the server XP leaderboard",

				options: {
					user: {
						type: ApplicationCommandOptionType.User,
						description: "User to jump to",
					},
				},
			},
			...(process.env.CANVAS !== "false" && {
				graph: { description: "Graph users’ XP over the last week", options: {} } as const,
			}),
		},
	},

	async (interaction, options) => {
		switch (options?.subcommand) {
			case "rank": {
				const user =
					options.options.user instanceof GuildMember
						? options.options.user.user
						: options.options.user ?? interaction.user;
				await getUserRank(interaction, user);
				return;
			}
			case "graph": {
				return await interaction.reply({
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.UserSelect,
									placeholder: "Select users",
									customId: "_weeklyXpGraph",
									maxValues: 7,
								},
							],
						},
					],
				});
			}
			case "leaderboard": {
				await top(interaction, options.options.user);
				return;
			}
			case "give": {
				
				const { owner } = await client.application.fetch();
				const owners =
					owner instanceof User
						? [owner.id]
						: owner?.members.map((member) => member.id) ?? [];
				if (process.env.NODE_ENV === "production" && !owners.includes(interaction.user.id))
					return await interaction.reply({
						ephemeral: true,
						content: `${constants.emojis.statuses.no} This command is reserved for ${
							owner instanceof User
								? owner.displayName
								: "the " + owner?.name + " team"
						} only!`,
					});
				
				const user =
					options.options.user instanceof GuildMember
						? options.options.user.user
						: options.options.user ?? interaction.user;
				const amount = options.options.amount;
				giveXp(user, undefined, amount);

				return await interaction.reply({
					content: (amount || 0) < 0 ? `:chart_with_downwards_trend: Took ${0 - (amount || 0)} XP from <@${user.id}> `:`:sparkles: Gave <@${user.id}> ${amount} XP`,
				});
			}
		}
	},
);
defineButton("xp", async (interaction, userId = "") => {
	await getUserRank(interaction, await client.users.fetch(userId));
});

defineButton("viewLeaderboard", async (interaction, userId) => {
	await top(interaction, await client.users.fetch(userId));
});

if (process.env.CANVAS !== "false") {
	const { default: weeklyXpGraph } = await import("./graph.js");
	defineSelect("weeklyXpGraph", weeklyXpGraph);
}

defineMenuCommand({ name: "XP Rank", type: ApplicationCommandType.User }, async (interaction) => {
	await getUserRank(interaction, interaction.targetUser);
});
