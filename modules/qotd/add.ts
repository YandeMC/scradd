import {
	ButtonStyle,
	ComponentType,
	TextInputStyle,
	ThreadAutoArchiveDuration,
	type ChatInputCommandInteraction,
	type ModalSubmitInteraction,
} from "discord.js";
import constants from "../../common/constants.js";
import tryCensor from "../automod/misc.js";
import warn from "../punishments/warn.js";
import { DEFAULT_SHAPES, parseOptions } from "./misc.js";
import { Question, questions } from "./send.js";
import config from "../../common/config.js";

export default async function getQuestionData(
	interaction: ChatInputCommandInteraction,
): Promise<void> {
	const user = await config.guild.members.fetch(interaction.user.id);
	const suggesting = !user.permissions.has("ManageGuild");
	await interaction.showModal({
		title: (suggesting ? "Suggest" : "Add") + " A Question of The Day",
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
					},
				],
			},
			// TODO: Specify dates or ranges of dates
		],
	});
}
export async function addQuestion(interaction: ModalSubmitInteraction): Promise<void> {
	const user = await config.guild.members.fetch(interaction.user.id);
	const suggesting = !user.permissions.has("ManageGuild");

	const question = interaction.fields.getTextInputValue("question").trim();
	const rawDescription = interaction.fields.fields.get("description")?.value.trim();
	const rawOptions = interaction.fields.fields.get("answers")?.value.trim() ?? "";
	const description = (rawDescription ?? "") + (rawDescription && rawOptions ? "\n\n" : "");
	const toCensor = `${question}${
		description || rawOptions ? "\n\n\n" : ""
	}${description}${rawOptions}`;
	const censored = tryCensor(toCensor);
	if (censored) {
		await warn(
			interaction.user,
			censored.words.length === 1 ? "Used a banned word" : "Used banned words",
			censored.strikes,
			`Attempted to create QOTD:\n>>> ${toCensor}`,
		);
		await interaction.reply({
			content: `${constants.emojis.statuses.no} Please ${
				censored.strikes < 1 ? "don’t say that here" : "watch your language"
			}!`,
			ephemeral: true,
		});
		return;
	}

	const { options, reactions } = parseOptions(rawOptions);
	if (options.length !== reactions.length) {
		await interaction.reply({
			content: `${constants.emojis.statuses.no} You can’t have over ${
				DEFAULT_SHAPES.length
			} option${DEFAULT_SHAPES.length === 1 ? "" : "s"}!`,
			ephemeral: true,
		});
		return;
	}

	const fullDescription = `${description}${reactions
		.map((reaction, index) => `${reaction} ${options[index] ?? ""}`)
		.join("\n")}`;

	if (suggesting) {
		const name = "QOTD suggestions";
		const thread =
			(await config.channels.admin.threads.fetch()).threads.find(
				(thread) => thread.name === name,
			) ??
			(await config.channels.admin.threads.create({
				name,
				reason: "For QOTD Suggestions",
				autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
			}));
		thread.send({
			content: "QOTD Suggestion from " + interaction.user.toString(),
			embeds: [
				{
					title: question,
					description: rawDescription,
					fields: [...(rawOptions ? [{ name: "options", value: rawOptions }] : [])],
				},
			],
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Add Question",
							customId: "_addquestion",
							style: ButtonStyle.Secondary,
						},
					],
				},
			],
		});
		await interaction.reply({
			content: constants.emojis.statuses.yes + " Added Suggestion!",
			embeds: [
				{ color: constants.themeColor, title: question, description: fullDescription },
			],
		});
	} else {
		questions.push(
			await new Question({
				question,
				description: fullDescription,
				reactions,
				_id: interaction.id,
			}).save(),
		);
		await interaction.message?.edit({ components: [] });
		await interaction.reply({
			content: constants.emojis.statuses.yes + " Added question!",
			embeds: [
				{ color: constants.themeColor, title: question, description: fullDescription },
			],
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							customId: interaction.id + "_removeQuestion",
							type: ComponentType.Button,
							label: "Remove",
							style: ButtonStyle.Danger,
						},
					],
				},
			],
		});
	}
}
