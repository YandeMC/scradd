import Database from "../common/database.js";
import config from "../common/config.js";
import { ButtonStyle, ComponentType, type Message } from "discord.js";
import { gracefulFetch } from "../util/promises.js";
import { client, defineButton, defineChatCommand, defineEvent } from "strife.js";
import constants from "../common/constants.js";
import { SpecialReminders, remindersDatabase } from "./reminders/misc.js";

interface TriviaResType {
	response_code: number;
	results: [
		{
			type: string;
			difficulty: string;
			category: string;
			question: string;
			correct_answer: string;
			incorrect_answers: string[]
		},
	];
}

const triviaChannel = config.channels.trivia;
if (!triviaChannel) {
}

const triviaAnswer = new Database<{
	answer: string;
	votes: string;
	id: string;
}>("trivia_answer	");
await triviaAnswer.init();

function hint(inputString: string) {
	const words = inputString.split(" ");

	// Replace characters within each word
	const replacedWords = words.map((word) => {
		// Convert the word into an array of characters
		const characters = word.split("");

		// Get a random index within the word (excluding the last character)
		const randomIndex = Math.floor(Math.random() * (characters.length - 1));

		// Replace characters at all indices except the random index with underscores
		const replacedCharacters = characters
			.map((char, index) => {
				// Check if the character is a number or a letter
				if (/[a-zA-Z0-9]/.test(char)) {
					return index === randomIndex ? char : "-";
				} else {
					// If it's not a number or a letter, keep it unchanged
					return char;
				}
			})
			.join("");

		return replacedCharacters;
	});

	// Join the replaced words back into a string
	const replacedString = replacedWords.join(" ");

	return replacedString;
}

export default async function updateTrivia() {
	if (triviaAnswer.data[0]?.answer != "")
		await triviaChannel?.send(
			`No one got the last trivia!\nThe answer was "${triviaAnswer.data[0]?.answer}"`,
		);
	remindersDatabase.data = [
		...remindersDatabase.data.filter(
			(reminder) =>
				!(reminder.id === SpecialReminders.trivia && reminder.user === client.user.id),
		),
		{
			channel: "0",
			date: Date.now() + 86_400_000 / 2,
			reminder: undefined,
			id: SpecialReminders.trivia,
			user: client.user.id,
		},
	];

	const triviaRes: TriviaResType | undefined = await gracefulFetch(
		"https://opentdb.com/api.php?amount=1&encode=base64",
	);
	if (!triviaRes?.results?.[0]) {
		await setTimeout(() => { }, 30000);
		return updateTrivia();
	}
	const messages: any = await triviaChannel?.messages.fetchPinned();
	const message: Message = messages.first();
	if (message && message.pinned) message.unpin();
	triviaAnswer.data = [
		{
			answer: `${atob(triviaRes?.results[0].correct_answer)}`,
			votes: "-",
			id: `${Math.random()}`.replace(".", ""),
		},
	];
	const bool = atob(triviaRes.results[0].type) == "boolean";
	await triviaChannel?.send({
		content: "",
		embeds: [
			{
				author: {
					name: "Trivia",
				},
				title: atob(triviaRes?.results[0].question),
				description:
					(!bool
						? atob(triviaRes?.results[0].question).toLowerCase().includes("which of")
							? [...triviaRes.results[0].incorrect_answers
								.map((a) => atob(a)),
							atob(triviaRes?.results[0].correct_answer)]
								.toSorted(() => Math.random() - 0.5)
								.join(" or ")
							: hint(atob(triviaRes?.results[0].correct_answer) || "")
						: "True or False") +
					`\n\nTrivia expires <t:${Math.floor((Date.now() + 86_400_000 / 2) / 1000)}:R>`,
				footer: {
					text: `Category: ${atob(triviaRes.results[0].category)}\nDifficulty: ${atob(
						triviaRes.results[0].difficulty,
					)}`,
				},
			},
		],
	});
}

defineEvent("messageCreate", async (m: Message) => {
	if (m.channelId != triviaChannel?.id) return;
	if (triviaAnswer.data[0]?.answer == "") return;
	if (m.author.bot) return;
	if (m.content.toLowerCase() == triviaAnswer.data[0]?.answer.toLowerCase()) {
		await m.react(constants.emojis.statuses.yes);

		await m.reply(
			`<@${m.author.id}> Got the correct answer of "${triviaAnswer.data[0]?.answer}"\n\nPosting new trivia...`,
		);
		triviaAnswer.data = [{ answer: "", votes: "-", id: "" }];
		updateTrivia();
	} else {
		m.react(constants.emojis.statuses.no);
	}
});

defineButton("voteskip", async (button) => {
	if ((triviaAnswer.data[0]?.votes.split("/").length || 0 )> 2) return updateTrivia();
	if (triviaAnswer.data[0]?.votes?.split("/").includes(button.user.id)) return button.reply({ content: "You already voted", ephemeral: true });
	if (triviaAnswer.data[0]?.id != button.customId.split("_")[0])
		return button.reply({ content: "this vote is outdated", ephemeral: true });
	triviaAnswer.data = [
		{
			answer: `${triviaAnswer.data[0]?.answer}`,
			votes: `${triviaAnswer.data[0]?.votes != "-" ? `${triviaAnswer.data[0]?.votes}/` : ""}${button.user.id
				}`,
			id: `${triviaAnswer.data[0]?.id}`,
		},
	];
	await button.message.edit({
		content: `${button.message.content.split("\n")[0]}\n> ${triviaAnswer.data[0]?.votes?.split("/").length
			}/3 votes\n${triviaAnswer.data[0]?.votes
				?.split("/")
				.map((i) => {
					return `> <@${i}>`;
				})
				.join("\n")}`,
	});
	await button.reply({ content: "Vote Successful" });
	if ((triviaAnswer.data[0]?.votes.split("/").length || 0 )> 2) return updateTrivia();
});
defineChatCommand(
	{
		name: "skip-trivia",
		description: "starts a vote to skip the current trivia",
		options: {},
	},
	async (interaction) => {
		if (interaction.channelId != config.channels.trivia?.id)
			return interaction.reply({
				ephemeral: true,
				content: `This command can only be used in <#${config.channels.trivia?.id}>`,
			});
		if (triviaAnswer.data[0]?.votes != "-")
			return interaction.reply({
				ephemeral: true,
				content: "Theres already a vote goin on" + `a${triviaAnswer.data[0]?.votes}`,
			});
		const message = await interaction.reply({
			content: `<@${interaction.user.id}> wants to skip the current trivia!`,
			fetchReply: true,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Vote Skip",
							style: ButtonStyle.Success,
							customId: `${triviaAnswer.data[0].id}_voteskip`,
						},
					],
				},
			],
		});
		triviaAnswer.data = [
			{
				answer: `${triviaAnswer.data[0]?.answer}`,
				votes: `${triviaAnswer.data[0]?.votes != "-" ? `${triviaAnswer.data[0]?.votes}/` : ""
					}${interaction.user.id}`,
				id: `${triviaAnswer.data[0]?.id}`,
			},
		];
		await message.edit({
			content: `${message.content.split("\n")[0]}\n> ${triviaAnswer.data[0]?.votes?.split("/").length
				}/3 votes\n${triviaAnswer.data[0]?.votes
					?.split("/")
					.map((i) => {
						return `> <@${i}>`;
					})
					.join("\n")}`,
		});
	},
);
