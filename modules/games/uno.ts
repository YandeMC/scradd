import {
	userMention,
	type ChatInputCommandInteraction,
	ComponentType,
	ButtonStyle,
	ButtonInteraction,
	ThreadAutoArchiveDuration,
	Message,
} from "discord.js";
import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import { setTimeout as wait } from "node:timers/promises";

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
	deck: Card[];
	stack: Card[];
}
const cards: Card[] = generateUnoDeck();

export async function uno(interaction: ChatInputCommandInteraction): Promise<void> {
	let game: Game = {
		players: [],
		ids: [],
		turn: 0,
		deck: cards.toSorted(() => Math.random() - 0.5),
		stack: [],
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
	const board = await thread.send({
		embeds: [{ title: "Loading Game" }],
	});
	await board.pin();
	updateGame(board, game);
	for (let i = 0; i < 7; i++) {
		game.players.forEach((player) => {
			if (game.deck) player.hand.push(game.deck.pop() as Card);
		});
	}
	game.stack.push({
		color: ["red", "yellow", "green", "blue"][Math.floor(Math.random() * 4)] as string,
		type: `${Math.floor(Math.random() * 10)}`,
	});
	updateGame(board, game);
	await board.edit({
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
	});
	const c = board.createMessageComponentCollector({
		componentType: ComponentType.Button,
	});
	c.on("collect", async (btn: ButtonInteraction) => {
		if (btn.customId == "hand") {
			if (!game.ids.includes(btn.user.id))
				return await btn.reply({ ephemeral: true, content: "you are not in this game" });
			if (game.ids[game.turn] != btn.user.id) {
				btn.reply({
					ephemeral: true,
					files: [
						{
							attachment: await generateCards(
								game.players[game.ids.indexOf(btn.user.id)]?.hand,
							),
							name: "cards.png",
						},
					],
				});
			} else {
				const msg = await btn.reply({
					fetchReply: true,
					ephemeral: true,
					files: [
						{
							attachment: await generateCards(
								game.players[game.ids.indexOf(btn.user.id)]?.hand,
							),
							name: "cards.png",
						},
					],
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.StringSelect,
									customId: "cardselect",
									placeholder: "Select A Card",
									options: [
										...[...new Set(game.players[game.turn]?.hand)]
											.map((card, i) => {
												return {
													card: card,
													index: i,
												};
											})
											.filter((c) =>
												checkCard(
													c.card,
													game.stack[game.stack.length - 1],
												),
											)
											.map((c) => {
												return {
													label: `${
														c.card.color == "black"
															? ""
															: c.card.color + " "
													}${c.card.type}`,
													value: `${c.index}`,
												};
											}),
										{ label: "Draw A Card", value: "draw" },
									],
								} as const,
							],
						},
					],
				});

				const choice = await msg
					.awaitMessageComponent({
						componentType: ComponentType.StringSelect || ComponentType.Button,
						time: 60_000,
					})
					.then((b) => {
						b.deferUpdate();
						return b;
					});
				await btn.deleteReply(msg);
				console.log(choice);
				if (choice.values[0] == "draw") {
					game.players[game.turn]?.hand.push(game.deck.pop() as Card);
					await thread.send(
						`${userMention(game.ids[game.turn] || "")} Drew a card from the deck!`,
					);
				} else {
					const playedCard = game.players[game.turn]?.hand.splice(
						Number(choice.values[0] || -1),
						1,
					)[0] as Card;
					game.stack.push(playedCard);
					await thread.send(
						`${userMention(game.ids[game.turn] || "")} Played a ${
							playedCard.color == "black" ? "" : playedCard.color + " "
						}${playedCard.type}!`,
					);
					if (playedCard.color == "black") {
						updateGame(board, game);
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
								componentType: ComponentType.StringSelect || ComponentType.Button,
								time: 60_000,
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
				}
				game.turn = (game.turn + 1) % game.players.length;
				updateGame(board, game);
			}
		} else if (btn.customId == "leave") {
			game.ids = game.ids.filter((i) => i != btn.user.id);
			game.players = game.players.filter((i) => i.id != btn.user.id);
			await thread.send(`${userMention(btn.user.id)} left the game.`);
			if (game.ids.length == 0) {
				c.stop("0 Players");
				thread.send("Game Ended.");
			}
		}
	});
}
void generateCards;
async function generateCards(cards: Card[] | undefined) {
	const canvas = createCanvas(unoCardWidth * (cards?.length || 0), unoCardHeight);
	const ctx = canvas.getContext("2d");
	if (cards == undefined) return canvas.toBuffer("image/png");
	cards.forEach(async (card, index) => {
		drawRound(ctx, unoCardWidth * index, 0, unoCardWidth, unoCardHeight, 15, "white");
		drawRound(
			ctx,
			5 + unoCardWidth * index,
			5,
			unoCardWidth - 10,
			unoCardHeight - 10,
			10,
			unoColors(card.color),
		);

		drawOval(
			ctx,
			unoCardWidth / 2 + unoCardWidth * index,
			unoCardHeight / 2,
			70,
			108,
			"white",
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
	ctx.font = `${size}px uno`;
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

async function updateGame(message: Message, game: Game) {
	await message.edit({
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
				attachment: await generateCards([
					game.stack[game.stack.length - 1] || { color: "", type: "none" },
				]),
				name: "cards.png",
			},
		],
	});
}

function checkCard(card: Card, stackCard: Card | undefined) {
	if (stackCard == undefined) return false;
	const colorsMatch =
		card.color === stackCard.color || card.color === "black" || stackCard.color === "black";
	const typesMatch = card.type === stackCard.type;
	return colorsMatch || typesMatch;
}
