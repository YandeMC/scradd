import { client, defineChatCommand, defineEvent } from "strife.js";
// import Database from "../common/database.js";
import { ApplicationCommandOptionType, TimestampStyles, time } from "discord.js";
import constants from "../common/constants.js";
import { parseTime } from "../util/numbers.js";
import { SpecialReminders, remindersDatabase } from "./reminders/misc.js";
import queueReminders from "./reminders/send.js";
import { BOARD_EMOJI } from "./board/misc.js";

defineChatCommand(
	{
		name: "giveaway",
		description: "start a giveaway",
		access: false,
		options: {
			"title": {
				type: ApplicationCommandOptionType.String,
				description: "The title of the giveaway",
				required: true,
			},
			"description": {
				type: ApplicationCommandOptionType.String,
				description: "The description of the giveaway",
				// required:false
			},
			"image": {
				type: ApplicationCommandOptionType.Attachment,
				description: "Image attatched to the giveaway",
				// required:false
			},
			"emoji": {
				type: ApplicationCommandOptionType.String,
				description: "Emoji as an id or a unicode emoji",
				// required:false
			},
			"time": {
				type: ApplicationCommandOptionType.String,
				description: "how long the giveaway lasts",
				required: true,
			},
			"prizes": {
				type: ApplicationCommandOptionType.String,
				description:
					"The items youre giving away, seperated by comma. one winner per prize.",
				required: true,
			},
			"role-required": {
				type: ApplicationCommandOptionType.Role,
				description: "A role required to join the giveaway.",
			},
		},
	},

	async (int, options) => {
		if (options.prizes.includes("_"))
			return await int.reply({
				ephemeral: true,
				content:
					"Due to the way giveaways are stored, underscores are not allowed in the prize input.",
			});
		const prizes = options.prizes
			.split(",")
			.map((p) => p.trim())
			.filter((p) => !!p);
		if (prizes.length > 8)
			return int.reply({ ephemeral: true, content: "The maximum number of prizes is 8." });
		const date = parseTime(options.time);
		if (+date < Date.now() + 60_000 || +date > Date.now() + 31_536_000_000) {
			return await int.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Could not parse the time! Make sure to pass in the value as so: \`1h30m\`, for example. Note that I can’t make a giveaway shorter than 1 minute or longer than 365 days.`,
			});
		}
		if (options.emoji === BOARD_EMOJI)
			return await int.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} You cannot use the board emoji as a reaction emoji`,
			});
		const message = await int.reply({ fetchReply: true, content: "creating giveaway" });

		// console.log("Message ID after creation:", message.id, "FETCHED", (await messagefetch()).id);
		try {
			await message.react(options.emoji ?? "🎉");
		} catch (e: any) {
			if (e.rawError.message == "Unknown Emoji")
				return await message.edit({ content: "Unknown Emoji", embeds: [] });
			else return await message.edit({ content: "an error occured", embeds: [] });
		}

		await message.edit({
			content: "",
			embeds: [
				{
					title: `${options.title}`,
					description:
						(options.description ?? "") +
						`\nGiveaway ends ${time(
							Math.floor(+date / 1000),
							TimestampStyles.RelativeTime,
						)}\nPrizes: ${prizes.join(", ")}`,
					...(options.image ?
						{
							image: {
								url: options.image.url,
							},
						}
					:	{}),
					fields:
						options["role-required"] ?
							[
								{
									name: "Role Required:",
									value: options["role-required"].toString(),
								},
							]
						:	[],
				},
			],
		});
		// console.log(options.emoji);

		remindersDatabase.data = [
			...remindersDatabase.data,
			{
				channel: `${int.channelId}_${message.id}_${prizes.join(",")}`,
				date: +date - 60_000,
				id: SpecialReminders.Giveaway,
				user: client.user.id,
			},
		];
		await queueReminders();
		// console.log("Message ID after editing:", message.id, "FETCHED", (await message.fetch()).id);
	},
);

defineEvent("messageReactionAdd", async (e, rawUser) => {
	if (rawUser.bot) return;
	const guild = await e.message.guild?.fetch();
	const user = await guild?.members.fetch(rawUser.id);
	if (!e.message.author?.bot || !user) return;
	const message = await e.message.fetch();
	if (!([...e.message.reactions.valueOf().values()].at(0)?.emoji.name == e.emoji.name)) return;
	const requiredRole = e.message.embeds
		.at(0)
		?.fields.at(0)
		?.value.match(/<@&(\d+)>/)
		?.at(1);

	if (!requiredRole) return;
	if (![...user.roles.valueOf().values()].find((r) => r.id == requiredRole)) {
		message.reactions.cache.find((m) => m.emoji.name == e.emoji.name)?.users.remove(user.id);
	}
});
