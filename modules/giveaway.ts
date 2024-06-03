import { client, defineChatCommand } from "strife.js";
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
			item: {
				type: ApplicationCommandOptionType.String,
				description: "the name of the thing youre giving away",
				required: true,
			},
			description: {
				type: ApplicationCommandOptionType.String,
				description: "description of the thing",
				// required:false
			},
			image: {
				type: ApplicationCommandOptionType.Attachment,
				description: "image",
				// required:false
			},
			emoji: {
				type: ApplicationCommandOptionType.String,
				description: "Emoji as an id or a unicode emoji",
				// required:false
			},
			time: {
				type: ApplicationCommandOptionType.String,
				description: "how long the giveaway lasts",
				required: true,
			},
		},
	},

	async (int, options) => {
		const date = parseTime(options.time);
		if (+date < Date.now() + 60_000 || +date > Date.now() + 31_536_000_000) {
			return await int.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Could not parse the time! Make sure to pass in the value as so: \`1h30m\`, for example. Note that I can’t remind you sooner than 1 minute or later than 365 days.`,
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
					title: `GIVEAWAY: ${options.item}`,
					description:
						(options.description ?? "") +
						`\nGiveaway ends ${time(
							Math.floor(+date / 1000) + 60,
							TimestampStyles.RelativeTime,
						)}`,
					...(options.image ?
						{
							image: {
								url: options.image.url,
							},
						}
					:	{}),
				},
			],
		});
		// console.log(options.emoji);

		remindersDatabase.data = [
			...remindersDatabase.data,
			{
				channel: `${int.channelId}_${message.id}`,
				date: +date,
				id: SpecialReminders.Giveaway,
				user: client.user.id,
			},
		];
		await queueReminders();
		// console.log("Message ID after editing:", message.id, "FETCHED", (await message.fetch()).id);
	},
);
// a;a;
