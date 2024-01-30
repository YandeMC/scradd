import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ComponentType,
	TextInputStyle,
} from "discord.js";
import constants from "../common/constants.js";
import { reactAll } from "../util/discord.js";
import { BOARD_EMOJI } from "./board/misc.js";
import twemojiRegexp from "@twemoji/parser/dist/lib/regex.js";
import { defineChatCommand, defineEvent, client, defineModal, defineButton } from "strife.js";

const DEFAULT_SHAPES = ["🔺", "🔶", "🟡", "🟩", "🔹", "💜", "🟤", "🏳️", "⚫", "⭕", "🔰", "♻"];
const bannedReactions = new Set(BOARD_EMOJI);

defineChatCommand(
	{
		name: "poll",
		description: "Poll people on a question",
		access: false,
		options: {
			"vote-mode": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Only let people answer once. (defaults to true)",
			},
			"open-ended": {
				type: ApplicationCommandOptionType.Boolean,
				description: "People answer with custom responces",
			},
		},
	},

	async (interaction, options) => {
		if (options["open-ended"]) {
			await interaction.showModal({
				title: "Set Up Poll",
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.TextInput,
								customId: "question",
								label: "The question to ask",
								required: true,
								style: TextInputStyle.Short,
								maxLength: 256,
							},
						],
					},
				],
				customId:
					Number(options["vote-mode"] ?? true) +
					"-" +
					Number(options["open-ended"]) +
					"_poll",
			});
		} else {
			await interaction.showModal({
				title: "Set Up Poll",
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.TextInput,
								customId: "question",
								label: "The question to ask",
								required: true,
								style: TextInputStyle.Short,
								maxLength: 256,
							},
						],
					},
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.TextInput,
								customId: "options",
								label: `Options (one per line; max of ${DEFAULT_SHAPES.length})`,
								required: true,
								style: TextInputStyle.Paragraph,
								value: "👍 Yes\n👎 No",
							},
						],
					},
				],
				customId:
					Number(options["vote-mode"] ?? true) +
					"-" +
					Number(options["open-ended"]) +
					"_poll",
			});
		}
	},
);

defineModal("poll", async (interaction, mode) => {
	if (mode.split("-")[1] === "1") {
		await interaction.reply({
			embeds: [
				{
					color: constants.themeColor,
					title: interaction.fields.getTextInputValue("question"),
					description: "answers:",
					footer:
						mode.split("-")[0] === "1"
							? { text: "You can only answer once on this poll." }
							: undefined,
				},
			],
			components:
				mode.split("-")[1] === "1"
					? [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										label: "Answer",
										style: ButtonStyle.Success,
										customId: `_pollAnswer`,
									},
								],
							},
					  ]
					: undefined,
		});
	} else {
		const regexp = new RegExp(`^${twemojiRegexp.default.source}`);

		const { customReactions, options } = interaction.fields
			.getTextInputValue("options")
			.split("\n")
			.reduce<{ customReactions: (string | undefined)[]; options: string[] }>(
				({ customReactions, options }, option) => {
					const emoji = option.match(regexp)?.[0];
					return {
						options: [...options, (emoji ? option.replace(emoji, "") : option).trim()],
						customReactions: [
							...customReactions,
							!emoji || customReactions.includes(emoji) || bannedReactions.has(emoji)
								? undefined
								: emoji,
						],
					};
				},
				{ customReactions: [], options: [] },
			);
		if (options.length > DEFAULT_SHAPES.length)
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} You can’t have over ${
					DEFAULT_SHAPES.length
				} option${DEFAULT_SHAPES.length === 1 ? "" : "s"}!`,
			});

		const shapes = DEFAULT_SHAPES.filter((emoji) => !customReactions.includes(emoji));
		const reactions = customReactions.map((emoji) => emoji ?? shapes.shift() ?? "");

		const message = await interaction.reply({
			embeds: [
				{
					color: constants.themeColor,
					title: interaction.fields.getTextInputValue("question"),
					description: options
						.map((option, index) => `${reactions[index]} ${option}`)
						.join("\n"),
					footer:
						mode.split("-")[0] === "1"
							? { text: "You can only vote once on this poll." }
							: undefined,
				},
			],
			fetchReply: true,
		});
		await reactAll(message, reactions);
	}
});

defineEvent("messageReactionAdd", async (partialReaction, partialUser) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
	const user = partialUser.partial ? await partialUser.fetch() : partialUser;

	const { emoji } = reaction;

	if (
		message.author.id === client.user.id &&
		message.interaction?.commandName === "poll" &&
		message.embeds[0]?.footer?.text &&
		user.id !== client.user.id
	) {
		const emojis = message.embeds[0].description?.match(/^\S+/gm);
		const isPollEmoji = emojis?.includes(emoji.name || "");
		if (isPollEmoji) {
			for (const [, otherReaction] of message.reactions.valueOf()) {
				if (
					emoji.name !== otherReaction.emoji.name &&
					emojis?.includes(otherReaction.emoji.name || "")
				)
					await otherReaction.users.remove(user);
			}
		}
	}
});

defineButton("pollAnswer", async (i) => {
	if (!i.message.embeds[0]) return;
	let answers = i.message.embeds[0]?.fields;
	if (!answers) {
		answers = [];
	}
	if (
		answers.some((obj) => obj["name"] == i.user.displayName) &&
		i.message.embeds[0].footer?.text
	)
		return await i.reply({ ephemeral: true, content: "You already answered" });

	if (answers.length >= 25) {
		return await i.reply({
			ephemeral: true,
			content: "this poll has reached the max answer length of 25",
		});
	}
	await i.showModal({
		title: "Answer Poll",
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						customId: "answer",
						label: "Your answer",
						required: true,
						style: TextInputStyle.Short,
						maxLength: 1024,
					},
				],
			},
		],
		customId: "answer",
	});
	const collectorFilter = (mi: { user: { id: string } }) => {
		return mi.user.id == i.user.id;
	};

	// Get the Modal Submit Interaction that is emitted once the User submits the Modal
	const submitted = await i
		.awaitModalSubmit({
			// Timeout after a minute of not receiving any valid Modals
			time: 60000,
			// Make sure we only accept Modals from the User who sent the original Interaction we're responding to
			filter: collectorFilter,
		})
		.catch(() => {});
	// from it's Custom ID. See https://old.discordjs.dev/#/docs/discord.js/stable/class/ModalSubmitFieldsResolver for more info.
	let answer = "";
	if (submitted) {
		answer = submitted.fields.getTextInputValue("answer");
		submitted.deferUpdate();
	} else return;

	answers?.push({
		name: i.user.displayName,
		value: answer,
	});

	await i.message.edit({
		embeds: [
			{
				color: constants.themeColor,
				title: i.message.embeds[0]?.title || undefined,
				fields: answers,
				description: "answers:",
				footer: i.message.embeds[0]?.footer || undefined,
			},
		],
	});
});
