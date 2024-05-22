import { ChannelType, ComponentType, TextInputStyle } from "discord.js";
import {
	client,
	defineButton,
	defineEvent,
	defineModal,
	defineSelect,
	defineSubcommands,
} from "strife.js";
import config from "../../common/config.js";
import getQuestionData, { addQuestion } from "./add.js";
import { listQuestions, removeQuestion, viewQuestion } from "./list.js";
import { DEFAULT_SHAPES } from "./misc.js";

defineSubcommands(
	{
		name: "qotd",
		description: "Manage Questions of The Day",

		subcommands: {
			add: { description: "Add a Question of The Day" },
			list: { description: "List Questions of The Day" },
		},
	},
	async (interaction, { subcommand }) => {
		switch (subcommand) {
			case "add": {
				await getQuestionData(interaction);
				break;
			}
			case "list": {
				await listQuestions(interaction);
				break;
			}
		}
	},
);
defineModal("addQuestion", addQuestion);

defineSelect("viewQuestion", viewQuestion);
defineButton("removeQuestion", removeQuestion);

defineEvent("messageReactionAdd", async (partialReaction, partialUser) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
	const user = partialUser.partial ? await partialUser.fetch() : partialUser;

	if (message.author.id !== client.user.id) return;
	if (
		(message.interaction?.commandName !== "poll" || !message.embeds[0]?.footer?.text) &&
		(message.channel.type !== ChannelType.PublicThread ||
			message.channel.parent?.id !== config.channels.qotd)
	)
		return;

	const emojis = (message.embeds[0]?.description ?? message.content).match(/^\S+/gm);
	if (!reaction.emoji.name || !emojis?.includes(reaction.emoji.name)) return;

	for (const [, other] of message.reactions
		.valueOf()
		.filter(
			({ emoji }) => emoji.name !== reaction.emoji.name && emojis.includes(emoji.name || "_"),
		))
		await other.users.remove(user);
});

defineButton("addquestion", async (b) => {
	const embed = b.message.embeds[0];

	await b.showModal({
		title: "Edit Suggestion",
		customId: "_addQuestion",
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						style: TextInputStyle.Short,
						label: "The question to ask",
						required: true,
						customId: "question",
						maxLength: 256,
						value: embed?.title ?? undefined,
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						style: TextInputStyle.Paragraph,
						label: `Extended description`,
						required: false,
						customId: "description",
						value: embed?.description ?? undefined,
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						style: TextInputStyle.Paragraph,
						label: `Answers (one per line; max of ${DEFAULT_SHAPES.length})`,
						placeholder: "👍 Yes\n👎 No",
						required: false,
						customId: "answers",
						value: embed?.fields[0]?.value ?? undefined,
					},
				],
			},
			// TODO: Specify dates or ranges of dates
		],
	});
});
