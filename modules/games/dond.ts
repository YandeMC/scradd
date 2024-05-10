import { ButtonStyle, ComponentType, type APIEmbed, type RepliableInteraction } from "discord.js";
import { GAME_COLLECTOR_TIME } from "./misc.js";
import constants from "../../common/constants.js";
import { setTimeout as wait } from "node:timers/promises";

class DealOrNoDeal {
	cases: { amount: number; isOpen: boolean }[] | any[];
	chosenCase: number;
	totalCases: number;
	casesOpened: number;
	dealerCallInterval: number;
	turn: number = 0;
	lastOffer: number = 0;
	casesUntilCalls = -1;
	constructor() {
		this.cases = this.initializeCases();
		this.totalCases = 26;
		this.casesOpened = 0;
		this.dealerCallInterval = 6; // Dealer calls after every 6 cases opened
		this.chosenCase = -1;
	}

	initializeCases(): { amount: number; isOpen: boolean }[] {
		const amounts: number[] = [
			0.01, 1, 5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 750, 1000, 5000, 10000, 25000,
			50000, 75000, 100000, 200000, 300000, 400000, 500000, 750000, 1000000,
		];
		const shuffledAmounts = this.shuffle(amounts);
		return shuffledAmounts.map((amount) => ({ amount, isOpen: false }));
	}

	shuffle(array: number[]) {
		return array.toSorted(() => 0.5 - Math.random());
	}

	openCase(caseNumber: number) {
		if (!this.cases[caseNumber].isOpen) {
			this.cases[caseNumber].isOpen = true;
			this.casesOpened++;
			const casesUntilDealer = this.casesUntilDealerCalls();
			return {
				case: this.cases[caseNumber],
				message: `Case ${caseNumber + 1} opened. It contains $${this.cases[caseNumber].amount}.`,
				casesUntilDealer: casesUntilDealer,
				dealerCall: casesUntilDealer === 0 ? this.dealerCall() : null,
			};
		} else {
			return { message: "This case is already open." };
		}
	}

	casesUntilDealerCalls() {
		const calls = [6, 11, 15, 18, 20, 21, 22, 23, 24, 25];
		this.casesUntilCalls =
			(calls.find((num) => num >= this.casesOpened) ?? 0) - this.casesOpened;
		return (calls.find((num) => num >= this.casesOpened) ?? 0) - this.casesOpened;
	}

	dealerCall() {
		// Replace the existing logic with a call to the new method
		this.turn++;
		const offer = this.calculateBankersOffer();
		return { dealerOffer: offer };
	}

	calculateBankersOffer() {
		const C = this.cases.filter((cas) => !cas.isOpen).length;
		const E =
			this.cases
				.filter((cas) => !cas.isOpen)
				.map((ca) => ca.amount)
				.reduce((p, c) => p + c) / C;
		const M = this.cases
			.filter((cas) => !cas.isOpen)
			.reduce((p, c) => (p > c.amount ? p : c.amount), 0);

		const offer =
			12275.3 +
			0.748 * E +
			-2714.74 * C +
			-0.04 * M +
			((0.0000006986 * E) ^ 2) +
			((32.623 * C) ^ 2);
		return Math.round(offer);
	}

	chooseCase(c: number) {
		this.chosenCase = c;
	}
}

export default async function dond(i: RepliableInteraction) {
	const game = new DealOrNoDeal();

	const message = await i.reply({
		components: components(game),
		embeds: embed(game),
	});
	const choice = await message.awaitMessageComponent({
		componentType: ComponentType.StringSelect,
		idle: GAME_COLLECTOR_TIME,
		filter: (a) => a.user.id == i.user.id,
	});
	if (!choice.values[0]) return;
	choice.deferUpdate();
	game.chooseCase(+choice.values[0]);

	await i.editReply({ components: components(game), embeds: embed(game) });
	message
		.createMessageComponentCollector({
			componentType: ComponentType.Button,
			idle: GAME_COLLECTOR_TIME,
			filter: (a) => a.user.id == i.user.id,
		})
		.on("collect", async (b) => {
			if (Number.isNaN(+b.customId)) {
				b.deferUpdate();
				if (b.customId == "deal") {
					await message.edit({
						components: [],
						embeds: [
							{
								title: "Deal or No Deal",
								description: `## You chose deal`,
							},
						],
					});
					await wait(2000);
					await message.edit({
						components: [],
						embeds: [
							{
								title: "Deal or No Deal",
								description: `## You Win ${game.lastOffer}!`,
							},
						],
					});
					await wait(2000);
					await message.edit({
						components: [],
						embeds: [
							{
								title: "Deal or No Deal",
								description: `## You Win $${game.lastOffer}!\nYour case contained $${game.cases[game.chosenCase].amount}`,
							},
						],
					});
					await wait(2000);
					await message.edit({
						components: [],
						embeds: [
							{
								title: "Deal or No Deal",
								description: `## You Win $${game.lastOffer}!\nYour case contained $${game.cases[game.chosenCase].amount}`,
								fields: embed(game)[0]?.fields,
							},
						],
					});

					return;
				}
				await message.edit({
					components: [],
					embeds: [
						{
							title: "Deal or No Deal",
							description: `## You Chose No Deal\nLet's continue`,
						},
					],
				});
				await wait(2000);
				game.casesUntilCalls = -1;
				await message.edit({ components: components(game), embeds: embed(game) });
				return;
			}
			const caseRes = game.openCase(+b.customId);
			await b.deferUpdate();
			if (game.casesOpened == 25) {
				await message.edit({
					components: [],
					embeds: [
						{
							title: "Deal or No Deal",
							description: `## You kept your case the entire time`,
						},
					],
				});
				await wait(2000);
				await message.edit({
					components: [],
					embeds: [
						{
							title: "Deal or No Deal",
							description: `## Your case contained $${game.cases[game.chosenCase].amount}`,
						},
					],
				});
				await wait(2000);
				await message.edit({
					components: [],
					embeds: [
						{
							title: "Deal or No Deal",
							description: `## Your case contained $${game.cases[game.chosenCase].amount}`,
							fields: embed(game)[0]?.fields,
						},
					],
				});

				return;
			}
			if (caseRes.dealerCall) {
				await message.edit({ components: [], embeds: embed(game, caseRes, 0) });
				await wait(1000);
				await message.edit({ components: [], embeds: embed(game, caseRes, 1) });
				await wait(2000);
				await message.edit({ components: [], embeds: embed(game, caseRes, 2) });
				await wait(2000);
			}
			await message.edit({ components: components(game), embeds: embed(game, caseRes, 3) });
			if (caseRes.dealerCall) game.lastOffer = caseRes.dealerCall.dealerOffer;
		})
		.on("end", async () => {
			message.edit({ components: [] });
		});
}

function chunkArray(array: any[], chunkSize: number) {
	const chunks = [];
	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize));
	}
	return chunks;
}
function components(game: DealOrNoDeal): any {
	if (game.casesUntilCalls == 0) {
		return [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						customId: `deal`,
						label: `Deal`,
						style: ButtonStyle.Success,
					},
					{
						type: ComponentType.Button,
						customId: `or`,
						label: `or`,
						style: ButtonStyle.Secondary,
						disabled: true,
					},
					{
						type: ComponentType.Button,
						customId: `nodeal`,
						label: `No Deal`,
						style: ButtonStyle.Danger,
					},
				],
			},
		];
	} else {
		if (game.chosenCase == -1) {
			return [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.StringSelect,
							options: game.cases.slice(0, 26 / 2).map((_: any, index: any) => {
								return {
									label: `${index + 1}`,
									value: `${index}`,
								};
							}),
							customId: "case1",
							placeholder: "Pick a case 1-" + (26 / 2 - 1),
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.StringSelect,
							options: game.cases.slice(26 / 2).map((_: any, index: any) => {
								return {
									label: `${index + 1 + 26 / 2}`,
									value: `${index + 26 / 2}`,
								};
							}),
							customId: "case2",
							placeholder: "Pick a case " + 26 / 2 + "-26",
						},
					],
				},
			];
		} else {
			return chunkArray(
				game.cases.filter((_: any, index: any) => index != game.chosenCase),
				5,
			).map((chunk: any[]) => ({
				type: ComponentType.ActionRow,
				components: chunk.map((item) => ({
					type: ComponentType.Button,
					customId: `${game.cases.findIndex((i: { amount: any }) => i.amount == item.amount)}`,
					label: `${game.cases.findIndex((i: { amount: any }) => i.amount == item.amount) + 1}`,
					style: item.isOpen ? ButtonStyle.Success : ButtonStyle.Secondary,
					disabled: item.isOpen,
				})),
			}));
		}
	}
}

function embed(
	game: DealOrNoDeal,
	c?:
		| {
				case: any;
				message: string;
				casesUntilDealer: number;
				dealerCall: {
					dealerOffer: number;
				} | null;
		  }
		| {
				message: string;
				case?: undefined;
				casesUntilDealer?: undefined;
				dealerCall?: undefined;
		  },
	callStage: number = 0,
): APIEmbed[] {
	const remainingCases = game.cases.toSorted((a, b) => a.amount - b.amount);
	const smallValues = remainingCases.slice(0, 26 / 2);
	const bigValues = remainingCases.slice(26 / 2);
	return [
		{
			title: "Deal Or No Deal",
			description: `Your chosen case: ${game.chosenCase + 1}\n${
				c?.dealerCall ?
					[
						`${c.message}`,
						game.turn == 1 ? "# 📞 Someones calling..." : "# 📞 Its the dealer",
						game.turn == 1 ?
							"# 📞 Its the dealer"
						:	`# 📞 The number went ${game.lastOffer > c.dealerCall.dealerOffer ? "down" : "up"}`,
						`# Dealers Offer: $${c.dealerCall.dealerOffer}`,
					].at(callStage)
				:	`${c?.message ?? ""}\nCases to open: ${game.casesUntilDealerCalls()}`
			}`,
			fields: [
				{
					name: "Big",
					value: `\`\`\`ansi\n${bigValues.map((value) => `${value.isOpen ? "[2;31m" : "[2;37m"}$${value.amount}${value.isOpen ? "" : ""}`).join("\n")}\`\`\``,
					inline: true,
				},
				{
					name: constants.zws,
					value: constants.zws,
					inline: true,
				},
				{
					name: "Small",
					value: `\`\`\`ansi\n${smallValues.map((value) => `${value.isOpen ? "[2;31m" : "[2;37m"}$${value.amount}${value.isOpen ? "" : ""}`).join("\n")}\`\`\``,
					inline: true,
				},
			],
		},
	];
}
