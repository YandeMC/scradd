import {
	userMention,
	type ChatInputCommandInteraction,
	ComponentType,
	ButtonStyle,
	ButtonInteraction,
	ThreadAutoArchiveDuration,
	Message,
	InteractionCollector,
	type AnyThreadChannel,
	type CacheType,
} from "discord.js";
import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import { setTimeout as wait } from "node:timers/promises";
import { nth } from "../../util/numbers.js";

// const font = readFileSync("../uno.ttf")

const unoCardWidth = 100;
const unoCardHeight = 150;
const unoColors = (color: string): string => {
	switch (color) {
		case "red":
			return "#d72600";
		case "blue":
			return "#0956bf";
		case "green":
			return "#379711";
		case "yellow":
			return "#ecd407";
	}
	return "#000000";
};
const unoIcons = {
	skip: await loadImage(`./modules/games/unoPhotos/skip.svg`),
	reverse: await loadImage(`./modules/games/unoPhotos/reverse.svg`),
	draw2: await loadImage(`./modules/games/unoPhotos/draw2.svg`),
	draw4: await loadImage(`./modules/games/unoPhotos/draw4.svg`),
	wild: await loadImage(`./modules/games/unoPhotos/wild.svg`),
};
interface Card {
	color: string;
	type: string;
}
interface Game {
	players: { name: string | null; id: string; hand: Card[] }[];
	ids: string[];
	turn: number;
	waiting: boolean;
	reversed: boolean;
	deck: Card[];
	stack: Card[];
	placements: string[];
}

interface Board {
	message: Message | undefined;
	collector:
		| InteractionCollector<ButtonInteraction<"cached">>
		| InteractionCollector<ButtonInteraction<CacheType>>
		| undefined;
}
const cards: Card[] = generateUnoDeck();

export async function uno(interaction: ChatInputCommandInteraction): Promise<void> {
	let game: Game = {
		players: [],
		ids: [],
		turn: 0,
		waiting: false,
		reversed: false,
		deck: cards.toSorted(() => Math.random() - 0.5),
		stack: [],
		placements: [],
	};
	const seconds = 15;
	const unix = Math.floor(Date.now() / 1000 + seconds);
	const message = await interaction.reply({
		fetchReply: true,
		embeds: [
			{
				fields: [
					{
						name: `UNO!`,
						value: `${userMention(interaction.user.id)} started a game of UNO\n
					Joining ends <t:${unix}:R>
					\n\nPlayers:\n${game.ids.map((i) => userMention(i)).join("\n") || "no players lmao :skull:"}`,
					},
				],
			},
		],
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Join game",
						customId: `join`,
						style: ButtonStyle.Primary,
					},
					{
						type: ComponentType.Button,
						label: "Leave game",
						customId: `leave`,
						style: ButtonStyle.Danger,
					},
				],
			},
		],
	});

	const collector = message.createMessageComponentCollector({
		componentType: ComponentType.Button,
	});

	collector.on("collect", async (button: ButtonInteraction) => {
		if (button.customId == "join") {
			if (game.ids.includes(button.user.id)) {
				return await button.reply({
					ephemeral: true,
					content: "You already are in this game!",
				});
			}
			game.ids.push(button.user.id);
			game.players.push({
				name: button.user.displayName || button.user.username,
				id: button.user.id,
				hand: [],
			});
		} else {
			if (!game.ids.includes(button.user.id)) {
				return await button.reply({ ephemeral: true, content: "You are'nt in this game!" });
			}
			game.ids = game.ids.filter((i) => i != button.user.id);
			game.players = game.players.filter((i) => i.id != button.user.id);
		}

		await message.edit({
			embeds: [
				{
					fields: [
						{
							name: `UNO!`,
							value: `${userMention(interaction.user.id)} started a game of UNO\n
					Joining ends <t:${unix}:R>
					\n\nPlayers:\n${game.ids.map((i) => userMention(i)).join("\n") || "no players lmao :skull:"}`,
						},
					],
				},
			],
		});
		await button.deferUpdate();
	});
	await wait(seconds * 1000);
	collector.stop();
	await message.edit({
		components: [],
		embeds: [
			{
				fields: [
					{
						name: `UNO!`,
						value: `${userMention(interaction.user.id)} started a game of UNO\n
				Joining ended <t:${unix}:R>
				\n\nPlayers:\n${game.ids.map((i) => userMention(i)).join("\n") || "no players lmao :skull:"}`,
					},
				],
			},
		],
	});

	if (game.ids.length < 1) {
		return void (await message.reply("not enough players to start game"));
	}

	const thread = await message.startThread({
		name: "Uno Game",
		autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
	});
	await Promise.allSettled(game.players.map((player) => thread.members.add(player.id)));
	let board: Board = { message: undefined, collector: undefined };
	board = await updateGame(board, game, thread);
	for (let i = 0; i < 7; i++) {
		game.players.forEach((player) => {
			if (game.deck) player.hand.push(game.deck.pop() as Card);
		});
	}
	game.stack.push({
		color: ["red", "yellow", "green", "blue"][Math.floor(Math.random() * 4)] as string,
		type: `${Math.floor(Math.random() * 10)}`,
	});
	board = await updateGame(board, game, thread);
}
void generateCards;
async function generateCards(
	cards: Card[] | undefined,
	currentCard: Card | undefined,
	onlyNum?: boolean | undefined,
) {
	const canvas = createCanvas(unoCardWidth * (cards?.length || 0), unoCardHeight);
	const ctx = canvas.getContext("2d");
	if (cards == undefined) return canvas.toBuffer("image/png");
	cards.forEach(async (card, index) => {
		drawRound(
			ctx,
			unoCardWidth * index,
			0,
			unoCardWidth,
			unoCardHeight,
			15,
			!checkCard(card, currentCard, onlyNum) && currentCard ? "#888888" : "#ffffff",
		);
		drawRound(
			ctx,
			5 + unoCardWidth * index,
			5,
			unoCardWidth - 10,
			unoCardHeight - 10,
			10,
			!checkCard(card, currentCard, onlyNum) && currentCard
				? darkenHexColor(unoColors(card.color), 0.5)
				: unoColors(card.color),
		);

		drawOval(
			ctx,
			unoCardWidth / 2 + unoCardWidth * index,
			unoCardHeight / 2,
			70,
			108,
			!checkCard(card, currentCard) && currentCard ? "#888888" : "#ffffff",
			5,
			45,
		);
		await drawText(
			ctx,
			unoCardWidth / 2 + unoCardWidth * index,
			unoCardHeight / 2,
			50,
			{ color: "white", text: card.type },
			{ stroke: 4, color: "black" },
			{ x: "center", y: "middle" },
		);
	});

	return canvas.toBuffer("image/png");
}

function drawRound(
	ctx: SKRSContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
	color: string,
) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.arcTo(x + w, y, x + w, y + r, r);
	ctx.lineTo(x + w, y + h - r);
	ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
	ctx.lineTo(x + r, y + h);
	ctx.arcTo(x, y + h, x, y + h - r, r);
	ctx.lineTo(x, y + r);
	ctx.arcTo(x, y, x + r, y, r);
	ctx.closePath();
	ctx.fillStyle = color;
	ctx.fill();
}

async function drawText(
	ctx: SKRSContext2D,
	x: number,
	y: number,
	size: number,
	text: { color: string; text: string },
	outline: { stroke: number; color: string } = { stroke: 0, color: "#000000" },
	align: { x: "left" | "center" | "right"; y: "top" | "middle" | "bottom" } = {
		x: "right",
		y: "bottom",
	},
) {
	if (unoIcons[text.text as "skip" | "reverse" | "draw2" | "draw4" | "wild"]) {
		const icon = unoIcons[text.text as "skip" | "reverse" | "draw2" | "draw4" | "wild"];
		const sizeMultiplyer = size / icon.height;
		ctx.drawImage(
			icon,
			x - (icon.width * sizeMultiplyer) / 2,
			unoCardHeight / 2 - (icon.height * sizeMultiplyer) / 2,
			icon.width * sizeMultiplyer,
			icon.height * sizeMultiplyer,
		);
		if (text.text == "draw2" || text.text == "draw4") {
			await drawText(
				ctx,
				x - unoCardWidth / 2 + 20,
				y - unoCardHeight / 2 + 20,
				20,
				{ color: "white", text: text.text == "draw2" ? "+2" : "+4" },
				{ stroke: 4, color: "black" },
				{ x: "center", y: "middle" },
			);
		}
		return;
	}
	if (text.text == "any") return;
	ctx.textAlign = align.x;
	ctx.font = `${size}px Sora`;
	ctx.strokeStyle = outline.color;
	ctx.lineWidth = outline.stroke;
	ctx.textBaseline = align.y;
	ctx.strokeText(text.text, x, y);
	ctx.fillStyle = text.color;
	ctx.fillText(text.text, x, y);
}

function drawOval(
	ctx: SKRSContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	color: string,
	thickness: number,
	rotation: number,
) {
	ctx.save(); // Save the current state of the context

	// Set the rotation if provided
	ctx.translate(x, y);
	ctx.rotate(rotation * (Math.PI / 180));

	// Draw the oval
	ctx.beginPath();
	ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, 2 * Math.PI);

	// Set color and thickness
	ctx.strokeStyle = color;
	ctx.lineWidth = thickness;

	// Draw the oval outline
	ctx.stroke();

	// Restore the saved context state
	ctx.restore();
}

function generateUnoDeck() {
	const colors = ["red", "yellow", "green", "blue"];
	const types = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"];

	const deck = [];

	// Add number cards (0-9) for each color
	for (const color of colors) {
		for (const type of types.slice(0, 10)) {
			deck.push({ type, color });
		}
	}

	for (const color of colors) {
		for (const type of types.slice(1, 10)) {
			deck.push({ type, color });
		}
	}

	// Add action cards (Skip, Reverse, Draw Two) for each color
	for (const color of colors) {
		for (const type of types.slice(10)) {
			deck.push({ type, color }, { type, color });
		}
	}

	// Add Wild cards and Wild Draw Four cards
	const wildCards = ["wild", "draw4"];
	for (const type of wildCards) {
		for (let i = 0; i < 4; i++) {
			deck.push({ type, color: "black" });
		}
	}

	return deck;
}

async function updateGame(board: Board, game: Game, thread: AnyThreadChannel) {
	await board.message?.delete().catch(() => {});
	board.message = (await thread.send({
		embeds: [
			{
				fields: [
					{
						name: `${game.players[game.turn]?.name}'s turn`,
						value: `${game.ids
							.map((i: any, idx: number) => {
								return `${userMention(i)} - ${
									game.players[idx]?.hand.length
								}<:blank:1215068301407952937>`;
							})
							.join("\n")}`,
					},
				],
				image: { url: "attachment://cards.png" },
			},
		],
		files: [
			{
				attachment: await generateCards(
					[game.stack[game.stack.length - 1] || { color: "", type: "none" }],
					undefined,
				),
				name: "cards.png",
			},
		],

		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Hand",
						customId: `hand`,
						style: ButtonStyle.Primary,
					},
					{
						type: ComponentType.Button,
						label: "Leave game",
						customId: `leave`,
						style: ButtonStyle.Danger,
					},
				],
			},
		],
	})) as Message<true>;
	board.collector?.stop();

	board.collector = board.message.createMessageComponentCollector({
		componentType: ComponentType.Button,
		filter: async (a) => {
			if (a.user.id != game.ids[game.turn]) {
				a.reply({
					ephemeral: true,
					files: [
						{
							attachment: await generateCards(
								game.players[game.ids.indexOf(a.user.id)]?.hand,
								undefined,
							),
							name: "cards.png",
						},
					],
				});
			}
			return a.user.id == game.ids[game.turn];
		},
	});

	board.collector.on("collect", async (btn: ButtonInteraction) => {
		if (btn.customId == "hand") {
			if (!game.ids.includes(btn.user.id))
				return await btn.reply({ ephemeral: true, content: "you are not in this game" });
			if (game.ids[game.turn] == btn.user.id) {
				let i = 0;
				let ch = "";
				let actions = [];
				while (
					!(
						ch == "skip" ||
						game.players[game.turn]?.hand.filter((c) =>
							checkCard(c, game.stack[game.stack.length - 1], true),
						).length == 0
					) ||
					i == 0
				) {
					const msg = await sendCardSelect(
						game,
						btn,
						{
							optionsEnabled: true,
							skipOption: i > 0,
							content:
								i > 0
									? `You played a ${ch}. play another card or end your turn.`
									: "",
						},
						i > 0,
					);

					const choice = await Promise.any([
						msg.awaitMessageComponent({
							componentType: ComponentType.StringSelect,
							time: 30_000,
						}),
						msg.awaitMessageComponent({
							componentType: ComponentType.Button,
							time: 30_000,
						}),
					])
						.then((b) => {
							b.deferUpdate();
							if (b instanceof ButtonInteraction) return { values: [b.customId] };
							return b;
						})
						.catch(() => {
							btn.followUp({
								ephemeral: true,
								content: "you took too long, so i picked for you",
							});
							return {
								values: [`${i > 0 ? "skip" : "draw"}`],
							};
						});

					ch = choice.values[0] as string;
					let idkWhatToNameThisVariable = { color: "#000000", type: "" };
					if (choice.values[0] == "draw") {
						idkWhatToNameThisVariable = game.deck.pop() as Card;
						game.players[game.turn]?.hand.push(idkWhatToNameThisVariable);
						await thread.send({
							content: `${userMention(
								game.ids[game.turn] || "",
							)} Drew a card from the deck!`,
							allowedMentions: { users: [] },
						});
					} else if (choice.values[0] == "skip") {
						ch = "skip";
					} else {
						const playedCard = game.players[game.turn]?.hand.splice(
							Number(choice.values[0] || -1),
							1,
						)[0] as Card;
						idkWhatToNameThisVariable = playedCard;
						ch = cardToString(playedCard);
						game.stack.push(playedCard);
						await thread.send({
							content: `${userMention(game.ids[game.turn] || "")} Played a ${
								playedCard.color == "black" ? "" : playedCard.color + " "
							}${playedCard.type}!`,
							allowedMentions: { users: [] },
						});
						if (game.players[game.turn]?.hand.length == 1) {
							await thread.send({
								content: `# ${userMention(
									game.ids[game.turn] || "",
								)} has **one** card!`,
								allowedMentions: { users: [] },
							});
						} else if (game.players[game.turn]?.hand.length == 0) {
							game.placements.push(btn.user.id);
							game.ids = game.ids.filter((i) => i != btn.user.id);
							game.players = game.players.filter((i) => i.id != btn.user.id);
							await thread.send({
								content: `# ${userMention(btn.user.id)} finished in ${nth(
									game.placements.length,
								)} place`,
								allowedMentions: { users: [] },
							});
							board = await updateGame(board, game, thread);
						}
						if (playedCard.color == "black") {
							board = await updateGame(board, game, thread);
							const colorMsg = await btn.followUp({
								ephemeral: true,
								components: [
									{
										type: ComponentType.ActionRow,
										components: [
											{
												type: ComponentType.StringSelect,
												customId: "cardselect",
												placeholder: "Select A Color",
												options: [
													{ label: "Red", value: "red" },
													{ label: "Yellow", value: "yellow" },
													{ label: "Green", value: "green" },
													{ label: "Blue", value: "blue" },
												],
											},
										],
									},
								],
							});

							const colorChoice = await colorMsg
								.awaitMessageComponent({
									componentType:
										ComponentType.StringSelect || ComponentType.Button,
									time: 20_000,
								})
								.then((b) => {
									b.deferUpdate();
									return b;
								})
								.catch(() => null);
							await btn.deleteReply(colorMsg);
							if (!colorChoice) {
								game.stack.push({
									color: ["red", "yellow", "green", "blue"][
										Math.floor(Math.random() * 4)
									] as string,
									type: "any",
								});
								await thread.send(
									`${userMention(
										game.ids[game.turn] || "",
									)} Took too long to choose a color, so the color is now ${
										game.stack[game.stack.length - 1]?.color
									}`,
								);
							} else {
								game.stack.push({
									color: colorChoice.values[0] as string,
									type: "any",
								});
								await thread.send(
									`${userMention(game.ids[game.turn] || "")} made the color ${
										game.stack[game.stack.length - 1]?.color
									}`,
								);
							}
						}
						if (playedCard.type == "draw2") {
							for (let i = 0; i < 2; i++) {
								game.players[
									(game.turn + (game.reversed ? game.players.length - 1 : 1)) %
										game.players.length
								]?.hand.push(game.deck.pop() as Card);
							}
							await thread.send({
								content: `${userMention(
									game.ids[
										(game.turn +
											(game.reversed ? game.players.length - 1 : 1)) %
											game.players.length
									] || "",
								)} drew 2 cards`,
								allowedMentions: { users: [] },
							});
						} else if (playedCard.type == "draw4") {
							for (let i = 0; i < 4; i++) {
								game.players[
									(game.turn + (game.reversed ? game.players.length - 1 : 1)) %
										game.players.length
								]?.hand.push(game.deck.pop() as Card);
							}
							await thread.send({
								content: `${userMention(
									game.ids[
										(game.turn +
											(game.reversed ? game.players.length - 1 : 1)) %
											game.players.length
									] || "",
								)} Drew 4 cards`,
								allowedMentions: { users: [] },
							});
						} else if (playedCard.type == "skip") {
							await thread.send({
								content: `${userMention(
									game.ids[
										(game.turn +
											(game.reversed ? game.players.length - 1 : 1)) %
											game.players.length
									] || "",
								)} got skipped`,
								allowedMentions: { users: [] },
							});

							actions.push("skip");
						} else if (playedCard.type == "reverse") {
							game.reversed = !game.reversed;
						}
					}
					await btn.deleteReply(msg);

					board = await updateGame(board, game, thread);
					i++;
				}
				actions.forEach((action) => {
					if (action == "skip") {
						game.turn =
							(game.turn + (game.reversed ? game.players.length - 1 : 1)) %
							game.players.length;
					}
				});
				await sendCardSelect(game, btn, { optionsEnabled: false }, i > 0);
				game.turn =
					(game.turn + (game.reversed ? game.players.length - 1 : 1)) %
					game.players.length;
				if (!(game.ids.length == 0)) {
					await thread.send(`${userMention(game.ids[game.turn] || "")}, Its your turn!`);
					board = await updateGame(board, game, thread);
				}
			}
		} else if (btn.customId == "leave") {
			btn.deferUpdate();
			if (!game.ids.includes(btn.user.id)) return;
			game.ids = game.ids.filter((i) => i != btn.user.id);
			game.players = game.players.filter((i) => i.id != btn.user.id);
			await thread.send(`${userMention(btn.user.id)} left the game.`);
			board = await updateGame(board, game, thread);
		}
		if (game.ids.length < 2) {
			game.ids.forEach((id) => {
				game.ids = game.ids.filter((i) => i != id);
				game.players = game.players.filter((i) => i.id != id);
				game.placements.push(id);
			});

			board.message?.delete();
			board.collector?.stop("less than 2 players");
			thread.send("Game Ended.");
			if (game.placements.length > 0) sendEnd(thread, game);
		}
	});

	return board;
}

function checkCard(card: Card, stackCard: Card | undefined, onlyMatchNumber?: boolean) {
	if (stackCard == undefined) return false;
	const colorsMatch = card.color === stackCard.color;
	const typesMatch = card.type === stackCard.type;
	return (
		(colorsMatch && !onlyMatchNumber) ||
		typesMatch ||
		card.color === "black" ||
		stackCard.color === "black"
	);
}

function sendEnd(thread: AnyThreadChannel, game: Game) {
	thread.send({
		embeds: [
			{
				title: "Game Placements",
				description: `
					${game.placements.map((playerId, idx) => `#${idx + 1}-${userMention(playerId)}`).join("\n")}
					`,
			},
		],
	});
}

function darkenHexColor(hex: string, factor: number) {
	// Convert hex to RGB
	let r = parseInt(hex.substring(1, 3), 16);
	let g = parseInt(hex.substring(3, 5), 16);
	let b = parseInt(hex.substring(5, 7), 16);

	// Darken the color
	r = Math.round(r * factor);
	g = Math.round(g * factor);
	b = Math.round(b * factor);

	// Ensure the values are within 0-255
	r = Math.min(r, 255);
	g = Math.min(g, 255);
	b = Math.min(b, 255);

	// Convert back to hex
	const darkenHex =
		"#" +
		(r < 16 ? "0" : "") +
		r.toString(16) +
		(g < 16 ? "0" : "") +
		g.toString(16) +
		(b < 16 ? "0" : "") +
		b.toString(16);

	return darkenHex;
}

async function sendCardSelect(
	game: Game,
	btn: ButtonInteraction,
	msgOptions: { optionsEnabled?: boolean; skipOption?: boolean; content?: string } = {
		optionsEnabled: true,
		skipOption: false,
		content: "",
	},
	onlyNum?: boolean,
) {
	let options = [
		...[...new Set(game.players[game.turn]?.hand)]
			.map((card, i) => {
				return {
					card: card,
					index: i,
				};
			})
			.filter((c) => checkCard(c.card, game.stack[game.stack.length - 1], onlyNum))
			.map((c) => {
				return {
					label: cardToString(c.card),
					value: `${c.index}`,
				};
			}),
		{ label: "Draw A Card", value: "draw" },
	];

	return !btn.replied
		? await btn.reply({
				content: msgOptions.content,
				fetchReply: true,
				ephemeral: true,
				files: [
					{
						attachment: await generateCards(
							game.players[game.ids.indexOf(btn.user.id)]?.hand,
							game.stack[game.stack.length - 1] as Card,
							onlyNum,
						),
						name: "cards.png",
					},
				],
				components: msgOptions.optionsEnabled
					? msgOptions.skipOption
						? [
								{
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.StringSelect,
											customId: "cardselect",
											placeholder: "Select A Card",
											options,
										},
									],
								},
								{
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.Button,
											label: "End Turn",
											customId: "skip",
											style: ButtonStyle.Secondary,
										},
									],
								},
						  ]
						: [
								{
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.StringSelect,
											customId: "cardselect",
											placeholder: "Select A Card",
											options,
										},
									],
								},
						  ]
					: [],
		  })
		: btn.followUp({
				content: msgOptions.content,
				fetchReply: true,
				ephemeral: true,
				files: [
					{
						attachment: await generateCards(
							game.players[game.ids.indexOf(btn.user.id)]?.hand,
							game.stack[game.stack.length - 1] as Card,
							onlyNum,
						),
						name: "cards.png",
					},
				],
				components: msgOptions.optionsEnabled
					? msgOptions.skipOption
						? [
								{
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.StringSelect,
											customId: "cardselect",
											placeholder: "Select A Card",
											options,
										},
									],
								},
								{
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.Button,
											label: "End Turn",
											customId: "skip",
											style: ButtonStyle.Secondary,
										},
									],
								},
						  ]
						: [
								{
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.StringSelect,
											customId: "cardselect",
											placeholder: "Select A Card",
											options,
										},
									],
								},
						  ]
					: [],
		  });
}

function cardToString(card: Card) {
	return `${card.color == "black" ? "" : card.color + " "}${card.type}`;
}
