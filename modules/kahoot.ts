import constants from "../common/constants.js";
import {
	ApplicationCommandOptionType,
	ButtonInteraction,
	ButtonStyle,
	ComponentType,
	TimestampStyles,
	time,
} from "discord.js";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { defineChatCommand } from "strife.js";
const msgses = ["Feeling Competitive?", "Lightning Smart?", "Easy Does It!", "Solid Effort!"];

const kahootEmojis = {
	array: [
		"<:khred:1247304316251934791>",
		"<:khblue:1247304313781354628>",
		"<:khyellow:1247304314733465683>",
		"<:khgreen:1247304312523198485>",
	],
	names: ["red", "blue", "yellow", "green"],
	red: "<:khred:1247304316251934791>",
	blue: "<:khblue:1247304313781354628>",
	yellow: "<:khyellow:1247304314733465683>",
	green: "<:khgreen:1247304312523198485>",
};
defineChatCommand(
	{
		name: "kahoot",

		description: "start a kahoot in discord",

		options: {
			id: {
				type: ApplicationCommandOptionType.String,
				description: "The kahoot id",

				minLength: 36,
				maxLength: 36,
			},
		},
		restricted: true,
	},
	async (i, o) => {
		if (!i.memberPermissions.has("ManageGuild")) return i.reply("nuh uh");
		const data = await fetch(`https://kahoot.it/rest/kahoots/${o.id}`);
		const kahoot: res = await data.json();
		if (!kahoot.questions) return i.reply("kahoot id did a no-no");
		const message = await i.reply({
			fetchReply: true,
			embeds: [
				{
					title: kahoot.title,
					description:
						"Questions:\n" +
						kahoot.questions
							.map((q) => NodeHtmlMarkdown.translate(q.question))
							.join("\n\n"),
					fields: [],
				},
			],
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							customId: "start",
							label: "Start Kahoot",
							style: ButtonStyle.Secondary,
						},
					],
				},
			],
		});
		const startbtn = await message
			.awaitMessageComponent({
				componentType: ComponentType.Button,
				time: 10000,
				filter: async (b) => {
					await b.deferUpdate();
					return b.user.id == i.user.id;
				},
			})
			.then(() => true)
			.catch(() => false);
		await message.edit({ components: [] });

		if (!startbtn) return;
		let players: {
			[playerid: string]: {
				points: number;
				name: string;
			};
		} = {};
		await message.edit({
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							customId: "join",
							label: "Join Kahoot",
							style: ButtonStyle.Secondary,
						},
					],
				},
			],
		});
		message
			.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 20000,
				filter: async (b) => {
					await b.deferUpdate();
					return true;
				},
			})
			.on("collect", async (b) => {
				players[b.user.id] = {
					points: 0,
					name: b.user.displayName,
				};
				await message.edit({
					embeds: [
						{
							title: kahoot.title,
							description:
								"Questions:\n" +
								kahoot.questions
									.map((q) => NodeHtmlMarkdown.translate(q.question))
									.join("\n\n") +
								`\n\n${Object.keys(players).length} playing`,
							fields: [],
						},
					],
				});
			})
			.on("end", async () => {
				for (const q of kahoot.questions) {
					let answerd: {
						[id: string]: {
							interaction: ButtonInteraction;
							choice: boolean;
							responseTime: number;
						};
					} = {};
					let count: number[] = [0, 0, 0, 0];
					await message.edit({
						embeds: [
							{
								title: NodeHtmlMarkdown.translate(q.question),
								description: `${Object.keys(answerd).length}/${Object.keys(players).length} Answered\n${q.choices.map((c, i) => `${kahootEmojis.array[i]} ${c.answer}`).join("\n\n")}\n${time(Math.floor((Date.now() + q.time) / 1000), TimestampStyles.RelativeTime)}`,
								...(q.image ?
									{
										image: {
											url: q.image,
										},
									}
								:	{}),
							},
						],
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										customId: "red",
										emoji: kahootEmojis.red,
										style: ButtonStyle.Secondary,
									},
									{
										type: ComponentType.Button,
										customId: "blue",
										emoji: kahootEmojis.blue,
										style: ButtonStyle.Secondary,
									},
									{
										type: ComponentType.Button,
										customId: "yellow",
										emoji: kahootEmojis.yellow,
										style: ButtonStyle.Secondary,
									},
									{
										type: ComponentType.Button,
										customId: "green",
										emoji: kahootEmojis.green,
										style: ButtonStyle.Secondary,
									},
								].slice(0, q.choices.length) as [],
							},
						],
					});
					let now = Date.now();
					const p = new Promise(async (resolve) => {
						const collector = message.createMessageComponentCollector({
							componentType: ComponentType.Button,
							time: q.time,
						});

						collector
							.on("collect", async (button) => {
								if (!players[button.user.id])
									return await button.reply({
										content: "You Arent In This Game!",
										ephemeral: true,
									});
								if (answerd[button.user.id]) {
									await button.deferUpdate();
								} else {
									await button.reply({
										ephemeral: true,
										fetchReply: true,
										content: msgses.at(
											Math.floor(Math.random() * msgses.length),
										),
									});
									answerd[button.user.id] = {
										choice:
											q.choices[kahootEmojis.names.indexOf(button.customId)]
												?.correct || false,
										interaction: button,
										responseTime: Date.now() - now,
									};
									//@ts-ignore
									count[kahootEmojis.names.indexOf(button.customId)] += 1;
									await message.edit({
										embeds: [
											{
												title: NodeHtmlMarkdown.translate(q.question),
												description: `${Object.keys(answerd).length}/${Object.keys(players).length} Answered\n${q.choices.map((c, i) => `${kahootEmojis.array[i]} ${c.answer}`).join("\n\n")}\n${time(Math.floor((now + q.time) / 1000), TimestampStyles.RelativeTime)}`,
												...(q.image ?
													{
														image: {
															url: q.image,
														},
													}
												:	{}),
											},
										],
									});
								}
								await checkCondition();
							})
							.on("end", () => {
								resolve("");
							});

						const checkCondition = async () => {
							if (Object.keys(players).length == Object.keys(answerd).length) {
								collector.stop(); // Stop the collector if the condition is met
								resolve("");
							}
						};
					});
					await p;
					await message.edit({ components: [] });
					for (const key in answerd) {
						const a = answerd[key];
						if (a) {
							const pPoints = Math.round(
								(1 - a.responseTime / q.time / 2) * 1000 * q.pointsMultiplier,
							);

							if (!Number.isNaN(pPoints))
								if (answerd[key]?.choice) {
									//@ts-ignore
									players[a.interaction.user.id].points += pPoints;
								}

							await a.interaction.editReply(
								`${answerd[key]?.choice ? "Correct!" : "Wrong!"} +${pPoints} Points`,
							);
						}
					}
					await message.edit({
						embeds: [
							{
								title: q.question,
								...(q.image ?
									{
										image: {
											url: q.image,
										},
									}
								:	{}),
								description: `${q.choices.map((c, i) => `${kahootEmojis.array[i]}${c.correct ? constants.emojis.statuses.yes : constants.emojis.statuses.no} ${c.answer}`).join("\n\n")}`,
							},
						],
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										customId: "next",
										label: "Scoreboard",
										style: ButtonStyle.Secondary,
									},
								],
							},
						],
					});
					await message
						.awaitMessageComponent({
							componentType: ComponentType.Button,
							time: 20000,
							filter: async (b) => {
								await b.deferUpdate();
								return b.user.id == i.user.id;
							},
						})
						.then(() => true)
						.catch(() => false);
					await message.edit({
						embeds: [
							{
								title: "Scoreboard",
								description: `${Object.entries(players)
									.toSorted((a, b) => b[1].points - a[1].points)
									.map((p, i) => `${i + 1}<@${p[0]}> ${p[1].points}`)
									.slice(0, 5)
									.join("\n")}`,
							},
						],
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										customId: "next",
										label: "Next Round",
										style: ButtonStyle.Secondary,
									},
								],
							},
						],
					});
					await message
						.awaitMessageComponent({
							componentType: ComponentType.Button,
							time: 20000,
							filter: async (b) => {
								await b.deferUpdate();
								return b.user.id == i.user.id;
							},
						})
						.then(() => true)
						.catch(() => false);
					await message.edit({ components: [] });
				}
				await message.edit({
					embeds: [
						{
							title: "Podium",
							description: `${Object.entries(players)
								.toSorted((a, b) => b[1].points - a[1].points)
								.map(
									(p, i) =>
										`${i <= 2 ? "## " : ""}${i + 1}<@${p[0]}> ${p[1].points} Points`,
								)
								.slice(0, 5)
								.join("\n")}`,
						},
					],
					components: [],
				});
			});
	},
);

type res = {
	uuid: string;
	language: string;
	creator: string;
	creator_username: string;
	compatibilityLevel: number;
	creator_primary_usage: string;
	folderId: string;
	visibility: number;
	audience: string;
	title: string;
	description: string;
	quizType: string;
	cover: string;
	questions: {
		type: string;
		image?: string;
		question: string;
		time: number;
		points: boolean;
		pointsMultiplier: number;
		choices: {
			answer: string;
			correct: boolean;
		}[];
	}[];
	created: number;
	modified: number;
};

/* 
Feeling Competitive?
Lightning Smart?
Easy Does It!
Solid Effort!
*/
