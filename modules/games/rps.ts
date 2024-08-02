import constants from "../../common/constants.js";
import {
	ButtonStyle,
	type ChatInputCommandInteraction,
	GuildMember,
	type User,
	ComponentType,
	ButtonInteraction,
	type APIInteractionGuildMember,
	Message,
	type APIEmbed,
} from "discord.js";
import { GAME_COLLECTOR_TIME } from "./misc.js";
import { setTimeout } from "timers/promises";

let games = {} as any;
const letters = "rps";
let emojis: Record<string, string> | any = {
	"draw": "<:draw:1196987416939069490>", //draw
	"p1": "<:blurple:1196987629703536640>", //player1 wins
	"p2": "<:green:1196987578881150976>", //player2 wins
	"r": ":rock:", //rock
	"p": ":scroll:", //paper
	"s": ":scissors:", //sisors
	"-": "<:notplayed:1196937672774656113>", //not played
	"=": "<:notplayed:1196937672774656113>", //no result //must be same as '-' for now
	"b": "<:notplayed:1196937672774656113>", //blank //must be same as '-' for nowv
	"/": "<:yes:1193656129750847488>", //waiting for other user
};
export default async function rps(
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
	options: {
		opponent?: APIInteractionGuildMember | GuildMember | User;
		rounds?: number;
	},
) {
	if (
		(!(options.opponent instanceof GuildMember) ||
			options.opponent.user.bot ||
			interaction.user.id === options.opponent.id) &&
		options.opponent != undefined
	) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You can’t play against that user!`,
		});
	}
	let message: Message<boolean>;
	message = await interaction.deferReply({
		fetchReply: true,
	});


	if (options.opponent) {
		await interaction.editReply({
			content: `<@${options.opponent?.id}>, Youve been challenged by <@${interaction.user.id}>! (${
				options.rounds || 2
			} rounds)`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Accept",
							customId: `yes`,
							style: ButtonStyle.Primary,
						},
						{
							type: ComponentType.Button,
							label: "Reject",
							customId: `no`,
							style: ButtonStyle.Danger,
						},
					],
				},
			],
		});
		const collectorFilter = (i: { deferUpdate: () => void; user: { id: string } }) => {
			i.deferUpdate();

			return (
				i.user.id === (!(options.opponent instanceof GuildMember) || options.opponent?.id)
			);
		};

		const ans = await message
			.awaitMessageComponent({
				filter: collectorFilter,
				componentType: ComponentType.Button,
				time: 60_000,
			})
			.then(
				//answer
				(i: { customId: string }) => {
					if (i.customId == "yes") return;
					else {
						return "end";
					}
				},
			)
			.catch((i: any) => {
				void i;
				return "noans";
			});

		if (ans == "end") {
			return message.edit({ content: "no game rn bois (deny)", components: [] });
		} else if (ans == "noans") {
			return message.edit({ content: "ran outta time", components: [] });
		}
	} else {
		await interaction.editReply({
			content: "",
			embeds: [{ title: "Playing against bot" }],
		});
	}
	message.edit({
		content: "",
		embeds: [{ title: "Starting game..." }],
	});

	games[interaction.id] = {
		players: [interaction.member.user, options.opponent],
		ids: [interaction.member.user.id, options.opponent?.id || "bot"],
		round: 1,
		totalRounds: options.rounds || 2,
		choices: Array.from({ length: options.rounds || 2 }, () => [emojis["b"], emojis["b"]]),
		results: Array.from({ length: options.rounds || 2 }, () => emojis["b"]),
	};
	const player1Choices: Array<any> = games[interaction.id].choices.map((arr: any[]) => arr[0]);
	const player2Choices: Array<any> = games[interaction.id].choices.map((arr: any[]) => arr[1]);
	message.edit({
		embeds: GenerateRound(
			{ name: games[interaction.id].players[0].displayName, choices: player1Choices },
			{
				name: games[interaction.id].players[1]?.displayName || "Scrub",
				choices: player2Choices,
			},
			games[interaction.id].results,
		),
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "R",
						style: ButtonStyle.Success,
						customId: `r-${interaction.id}`,
					},
					{
						type: ComponentType.Button,
						label: "P",
						customId: `p-${interaction.id}`,
						style: ButtonStyle.Danger,
					},
					{
						type: ComponentType.Button,
						label: "S",
						customId: `s-${interaction.id}`,
						style: ButtonStyle.Primary,
					},
				],
			},
		],
	});

	let collector = message
		.createMessageComponentCollector({
			componentType: ComponentType.Button,
			idle: GAME_COLLECTOR_TIME,
		})
		.on("collect", async (button: ButtonInteraction) => {
			if (button.customId.split("-")[1] != interaction.id) return;

			const currentRound = games[interaction.id].round - 1;

			const playerIdx = games[interaction.id].ids.indexOf(button.member?.user.id);
			if (games[interaction.id].choices[currentRound][playerIdx] != emojis["-"]) {
				return await button.reply({
					ephemeral: true,
					content: "you already played this round",
				});
			}
			await button.deferUpdate();
			games[interaction.id].choices[currentRound][playerIdx] =
				emojis[button.customId.split("-")[0]];
			if (games[interaction.id].ids[1] == "bot") {
				const randomIndex = Math.floor(Math.random() * letters.length);
				games[interaction.id].choices[currentRound][1] =
					emojis[letters.charAt(randomIndex)];
			}

			let player1Choices: Array<any> = games[interaction.id].choices.map(
				(arr: any[]) => arr[0],
			);
			let player2Choices: Array<any> = games[interaction.id].choices.map(
				(arr: any[]) => arr[1],
			);
			let player1Choice = player1Choices[currentRound];
			let player2Choice = player2Choices[currentRound];

			if (!(player1Choice == emojis["-"] || player2Choice == emojis["-"])) {
				//both players chose
				games[interaction.id].results[currentRound] =
					emojis[checkWinner(player1Choice, player2Choice)];

				if (games[interaction.id].round >= games[interaction.id].totalRounds) {
					const arr = games[interaction.id].results;
					let counter: any = {};
					counter[emojis["p1"]] = 0;
					counter[emojis["p2"]] = 0;
					arr.forEach((ele: string | number) => {
						if (counter[ele] != undefined) {
							counter[ele] += 1;
						}
					});
					if (counter[emojis["p1"]] != counter[emojis["p2"]]) collector.stop();
					else {
						games[interaction.id].totalRounds += 5;

						for (let index = 0; index < 5; index++) {
							games[interaction.id].choices.push(
								...Array.from({ length: 1 }, () => [emojis["b"], emojis["b"]]),
							);
							games[interaction.id].results.push(
								...Array.from({ length: 1 }, () => emojis["b"]),
							);
							player1Choices = games[interaction.id].choices.map(
								(arr: any[]) => arr[0],
							);
							player2Choices = games[interaction.id].choices.map(
								(arr: any[]) => arr[1],
							);
							await message.edit({
								embeds: GenerateRound(
									{
										name: games[interaction.id].players[0].displayName,
										choices: player1Choices,
									},
									{
										name:
											games[interaction.id].players[1]?.displayName ||
											"Scrub",
										choices: player2Choices,
									},
									games[interaction.id].results,
									"TIEBREAKER",
									"",
								),
								components: [],
							});
							await setTimeout(300);
						}
					}
				}
				games[interaction.id].round += 1;
			} else {
				if (player1Choice != emojis["-"]) player1Choices[currentRound] = emojis["/"];
				if (player2Choice != emojis["-"]) player2Choices[currentRound] = emojis["/"];
			}
			await message.edit({
				embeds: GenerateRound(
					{ name: games[interaction.id].players[0].displayName, choices: player1Choices },
					{
						name: games[interaction.id].players[1]?.displayName || "Scrub",
						choices: player2Choices,
					},
					games[interaction.id].results,
					"",
					"",
				),
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								label: "R",
								style: ButtonStyle.Success,
								customId: `r-${interaction.id}`,
							},
							{
								type: ComponentType.Button,
								label: "P",
								customId: `p-${interaction.id}`,
								style: ButtonStyle.Danger,
							},
							{
								type: ComponentType.Button,
								label: "S",
								customId: `s-${interaction.id}`,
								style: ButtonStyle.Primary,
							},
						],
					},
				],
			});
		})
		.on("end", async (_, endReason) => {
			const player1Choices: Array<any> = games[interaction.id].choices.map(
				(arr: any[]) => arr[0],
			);
			const player2Choices: Array<any> = games[interaction.id].choices.map(
				(arr: any[]) => arr[1],
			);
			let counter: any = {};
			counter[emojis["p1"]] = 0;
			counter[emojis["p2"]] = 0;
			const arr = games[interaction.id].results;

			arr.forEach((ele: string | number) => {
				if (counter[ele] != undefined) {
					counter[ele] += 1;
				}
			});

			let result;

			if (counter[emojis["p1"]] == counter[emojis["p2"]]) {
				result = "Draw";
			} else if (counter[emojis["p1"]] > counter[emojis["p2"]]) {
				result = games[interaction.id].players[0].displayName + " Wins";
			} else {
				result = (games[interaction.id].players[1]?.displayName || "Scrub") + " Wins";
			}
			let finalEmbed = GenerateRound(
				{ name: games[interaction.id].players[0].displayName, choices: player1Choices },
				{
					name: games[interaction.id].players[1]?.displayName || "Scrub",
					choices: player2Choices,
				},
				arr,
				result,
				"",
			);
			const scoreDiff: number = Math.abs(counter[emojis["p1"]] - counter[emojis["p2"]]);
			const resultsEmbed: APIEmbed = {
				author: {
					name: result + (scoreDiff != 0 ? ` by ${scoreDiff} points` : ``),
				},
				fields: [
					{
						name: `${games[interaction.id].players[0].displayName}`,
						value: `${counter[emojis["p1"]]} Points`,
						inline: true,
					},
					{
						name: `${games[interaction.id].players[1]?.displayName || "Scrub"}`,
						value: `${counter[emojis["p2"]]} Points`,
						inline: true,
					},
				],
			};
			await message.reply({ embeds: [resultsEmbed] });
			await message.edit({
				content: endReason === "idle" ? "Game became inactive." : "",
				components: [],
				embeds: finalEmbed,
			});


			collector.stop();
			return (games[interaction.id] = null);
		});
}

function checkWinner(p1: any, p2: any) {
	let outcomes: any = {};
	outcomes[emojis["r"] + emojis["r"]] = "draw";
	outcomes[emojis["p"] + emojis["p"]] = "draw";
	outcomes[emojis["s"] + emojis["s"]] = "draw";
	outcomes[emojis["p"] + emojis["r"]] = "p1";
	outcomes[emojis["r"] + emojis["s"]] = "p1";
	outcomes[emojis["s"] + emojis["p"]] = "p1";
	outcomes[emojis["r"] + emojis["p"]] = "p2";
	outcomes[emojis["s"] + emojis["r"]] = "p2";
	outcomes[emojis["p"] + emojis["s"]] = "p2";

	return outcomes[p1 + p2];
}

function GenerateRound(
	p1: { name: string; choices: Array<any> },
	p2: { name: string; choices: Array<any> },
	results: Array<any>,
	title: string = "",
	footer: string = "",
): APIEmbed[] {
	const result = p1.choices.map((element, index) => {
		return `${element} ${results[index]} ${p2.choices[index]}`;
	});
	return [
		{
			description: `
			${emojis["p1"]}${p1.name}\n${emojis["p2"]}${p2.name}\n\n${
				emojis["p1"] + " " + emojis["draw"] + " " + emojis["p2"]
			}\n${result.join("\n")}
			`,
			author: {
				name: "RPS",
			},
			footer: {
				text: footer,
			},
			title: title,
		},
	];
}
