import Database from "../common/database.js";
import config from "../common/config.js";
import { ButtonStyle, ComponentType, type Message } from "discord.js";
import { gracefulFetch } from "../util/promises.js";
import { client, defineButton, defineEvent } from "strife.js";
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
		},
	];
}

const triviaChannel = config.channels.trivia;
if (!triviaChannel) {
}

const triviaAnswer = new Database<{
	answer: string;
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
	if (!triviaRes?.results[0]) {
		await setTimeout(() => {}, 30000);
		return updateTrivia();
	}
	const messages: any = await triviaChannel?.messages.fetchPinned();
	const message: Message = messages.first();
	if (message && message.pinned) message.unpin();
	triviaAnswer.data = [{ answer: `${atob(triviaRes?.results[0].correct_answer)}` }];
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
						? hint(atob(triviaRes?.results[0].correct_answer) || "")
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
	if (m.content == "skiptrivia" && m.author.id == "713805665407205426") {
		m.reply({
			content: "u sure?",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							label: "First Message",
							customId: "_resetTrivia",
						},
					],
				},
			],
		});
	}
	if (m.content.toLowerCase() == triviaAnswer.data[0]?.answer.toLowerCase()) {
		await m.react(constants.emojis.statuses.yes);

		await m.reply(
			`<@${m.author.id}> Got the correct answer of "${triviaAnswer.data[0]?.answer}"\n\nPosting new trivia...`,
		);
		triviaAnswer.data = [{ answer: "" }];
		updateTrivia();
	} else {
		m.react(constants.emojis.statuses.no);
	}
});

defineButton("resetTrivia", async (button) => {
	if (button.user.id != "713805665407205426") return;
	await button.deferReply();
	await updateTrivia();
	await button.message.delete();
});
