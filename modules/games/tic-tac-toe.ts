import {
	ComponentType,
	type APIInteractionGuildMember,
	type ChatInputCommandInteraction,
	GuildMember,
	type User,
	ButtonStyle,
	Message,
	ButtonInteraction,
	ButtonBuilder,
} from "discord.js";
import constants from "../../common/constants.js";
import { client } from "strife.js";
import { GAME_COLLECTOR_TIME } from "./misc.js";

export default async function ttt(
	this: any,
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
	options: {
		opponent?: APIInteractionGuildMember | GuildMember | User;
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
	if (options.opponent) {
		message = await interaction.reply({
			content: `<@${options.opponent?.id}> get challenged lmao `,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Hell yeah",
							customId: `yes`,
							style: ButtonStyle.Danger,
						},
						{
							type: ComponentType.Button,
							label: "NO",
							customId: `no`,
							style: ButtonStyle.Primary,
						},
					],
				},
			],
			fetchReply: true,
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
		message = await interaction.reply({
			content: "",
			embeds: [{ title: "Playing against bot" }],
			fetchReply: true,
		});
	}
	await message.edit({
		content: "",
		embeds: [{ title: "Starting game..." }],
	});
	let game: {
		players: { name: string | null; id: string }[];
		ids: string[];
		turn: number;
		board: Row[];
		pingmsg: Message | null;
	} = {
		players: [
			{
				name: interaction.user.username,
				id: interaction.user.id,
			},
			options.opponent
				? {
						name: options.opponent.user.username,
						id: options.opponent.user.id,
				  }
				: {
						name: client.user.username,
						id: client.user.id,
				  },
		],
		ids: [interaction.user.id, options.opponent?.user.id || client.user.id],
		turn: 0,
		board: [
			["-", "-", "-"],
			["-", "-", "-"],
			["-", "-", "-"],
		],
		pingmsg: null,
	};
	console.log(game);

	await message.edit({
		content: `<@${game.ids[game.turn]}>, Its your turn!`,
		embeds: [],
		components: board(game.board, false),
	});
	const collector = message
		.createMessageComponentCollector({
			componentType: ComponentType.Button,
			idle: GAME_COLLECTOR_TIME,
		})
		.on("collect", async (button: ButtonInteraction) => {
			if (!game.ids.includes(button.user.id)) {
				await button.deferReply({ ephemeral: true });
				await button.editReply({ content: "You're not in this game!" });
				return;
			}
			if (game.ids[game.turn] != button.user.id) {
				await button.deferReply({ ephemeral: true });
				await button.editReply({ content: "Its not your turn!" });
				return;
			}
			button.deferUpdate();
			const coords: number[] = button.customId.split("-") as unknown as number[];
			game.board[coords[0] || 0]![coords[1] || 0] = game.turn == 0 ? "x" : "o";

			if (game.ids[1] == client.user.id) {
				const empty: { x: number; y: number }[] | any = findEmptySpaces(game.board);
				if (!(empty.length === 0)) {
					const randomIndex = Math.floor(Math.random() * empty.length);
					game.board[empty[randomIndex]?.x]![empty[randomIndex]?.y] = "o";
				}
			} else {
				game.turn = game.turn == 0 ? 1 : 0;
			}

			const winner = checkWinner(game.board);
			if (winner) {
				const resultmsg = `${
					winner == "draw" ? "Its A Draw!" : `<@${game.ids[winner == "x" ? 0 : 1]}> Wins!`
				}`;
				await message.reply({ content: resultmsg });
				await message.edit({ components: board(game.board, true), content: resultmsg });
				if (game.pingmsg) await game.pingmsg?.delete();
				collector.stop();
			} else {
				await message.edit({
					components: board(game.board, false),
					content: `${game.players[game.turn]?.name}'s turn!`,
				});
				if (game.pingmsg) await game.pingmsg?.delete();
				game.pingmsg = await message.reply({
					content: `<@${game.ids[game.turn]}>, its your turn!`,
				});
			}
		})
		.on("end", async (_, endReason) => {
			if (endReason === "idle") {
				message.edit({
					content: "Game became inactive",
					components: board(game.board, true),
				});
			}
		});
}

type Row = [string, string, string];
function board(a: Row[] | any, disabled: boolean): any {
	return [row(a, 0, disabled), row(a, 1, disabled), row(a, 2, disabled)];
}

function label(raw: string) {
	switch (raw) {
		case "-":
			return "<:TTT:1204592236407558154>";
		case "x":
			return "<:TTTX:1204592056664723466>";
		case "o":
			return "<:TTTO:1204592055611957288>";
	}
}

function button(a: Row[] | any, x: number, y: number, disabled: boolean) {
	return {
		type: ComponentType.Button,
		label: "",
		customId: `${x}-${y}`,
		style: ButtonStyle.Secondary,
		emoji: label(a[x][y]),
		disabled,
	};
}
const b = new ButtonBuilder();
b.setDisabled(true);
function row(a: Row[] | any, y: number, disabled: boolean) {
	return {
		type: ComponentType.ActionRow,
		components: [
			button(a, y, 0, disabled),
			button(a, y, 1, disabled),
			button(a, y, 2, disabled),
		],
	};
}

function findEmptySpaces(gameArray: Row[] | any): { x: number; y: number }[] {
	const emptySpaces = [];

	for (let i = 0; i < gameArray.length; i++) {
		for (let j = 0; j < gameArray[i].length; j++) {
			if (gameArray[i][j] === "-") {
				emptySpaces.push({ x: i, y: j });
			}
		}
	}

	return emptySpaces;
}

function checkWinner(board: Row[] | any) {
	// Check rows, columns, and diagonals for a winner
	for (let i = 0; i < 3; i++) {
		// Check rows
		if (board[i][0] !== "-" && board[i][0] === board[i][1] && board[i][0] === board[i][2]) {
			return board[i][0];
		}

		// Check columns
		if (board[0][i] !== "-" && board[0][i] === board[1][i] && board[0][i] === board[2][i]) {
			return board[0][i];
		}
	}

	// Check diagonals
	if (board[0][0] !== "-" && board[0][0] === board[1][1] && board[0][0] === board[2][2]) {
		return board[0][0];
	}

	if (board[0][2] !== "-" && board[0][2] === board[1][1] && board[0][2] === board[2][0]) {
		return board[0][2];
	}

	// Check if the board is full (draw)
	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {
			if (board[i][j] === "-") {
				// There is an empty space, game is still ongoing
				return null;
			}
		}
	}

	// If no winner and the board is full, it's a draw
	return "draw";
}
