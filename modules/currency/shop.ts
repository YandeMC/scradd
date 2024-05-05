import {
	ButtonStyle,
	ComponentType,
	type ButtonInteraction,
	type RepliableInteraction,
	type User,
} from "discord.js";
import { getSponges, giveSponges } from "./give-sponges.js";
import config, { findRole } from "../../common/config.js";
import constants from "../../common/constants.js";
import log, { LogSeverity } from "..//logging/misc.js";
import { addTransaction } from "./util.js";
class ShopItem {
	price: number;
	name: string;
	description: string;
	buy: (user: User) => Promise<number> | number;
	constructor(
		name: string,
		description: string,
		price: number,
		buyFunction: (user: User) => Promise<number> | number,
	) {
		this.name = name;
		this.description = description;
		this.price = price;
		this.buy = (user: User) => {
			if (getSponges(user) < this.price) {
				return -1;
			}
			giveSponges(user, -this.price);
			addTransaction(user.id, "Buy", this.price, this.name);
			return buyFunction(user);
		};
	}
}
/* 
Return codes meaning
1: success
0: user already has item
-1: not enough money
-2: error: item does not exist



*/
let shopItems = [
	new ShopItem("Bronze role", "Just a role", 500, async function (user) {
		const role = await findRole("bronze");
		if (!role) return -2;
		const u = await config.guild.members.fetch(user);
		if (u.roles.cache.some((r) => r.id == role.id)) return 0;
		await u.roles.add(role).catch((e) => {
			log(`${constants.emojis.statuses.no} ${e}`, LogSeverity.Alert);
			return -3;
		});
		return 1;
	}),
	new ShopItem("Silver role", "Just a role", 1000, async function (user) {
		const role = await findRole("silver");
		if (!role) return -2;
		const u = await config.guild.members.fetch(user);
		if (u.roles.cache.some((r) => r.id == role.id)) return 0;
		await u.roles.add(role).catch((e) => {
			log(`${constants.emojis.statuses.no} ${e}`, LogSeverity.Alert);
			return -3;
		});
		return 1;
	}),
	new ShopItem("Gold role", "Just a role", 1500, async function (user) {
		const role = await findRole("gold");
		if (!role) return -2;
		const u = await config.guild.members.fetch(user);
		if (u.roles.cache.some((r) => r.id == role.id)) return 0;
		await u.roles.add(role).catch((e) => {
			log(`${constants.emojis.statuses.no} ${e}`, LogSeverity.Alert);
			return -3;
		});
		return 1;
	}),
	new ShopItem("Diamond role", "Just a role", 3000, async function (user) {
		const role = await findRole("diamond");
		if (!role) return -2;
		const u = await config.guild.members.fetch(user);
		if (u.roles.cache.some((r) => r.id == role.id)) return 0;
		await u.roles.add(role).catch((e) => {
			log(`${constants.emojis.statuses.no} ${e}`, LogSeverity.Alert);
			return -3;
		});
		return 1;
	}),
	new ShopItem("Sponger Chat Access", "Access to the sponge chat", 3000, async function (user) {
		const role = await findRole("sponger");
		if (!role) return -2;
		const u = await config.guild.members.fetch(user);
		if (u.roles.cache.some((r) => r.id == role.id)) return 0;
		await u.roles.add(role).catch((e) => {
			log(`${constants.emojis.statuses.no} ${e}`, LogSeverity.Alert);
			return -3;
		});
		return 1;
	}),
	new ShopItem(
		"Staff role",
		"become staff for the low low price of 9007199254740991 🧽",
		9007199254740991,
		async function (user) {
			const role = await findRole("fake staff");
			if (!role) return -2;
			const u = await config.guild.members.fetch(user);
			if (u.roles.cache.some((r) => r.id == role.id)) return 0;
			await u.roles.add(role).catch((e) => {
				log(`${constants.emojis.statuses.no} ${e}`, LogSeverity.Alert);
				return -3;
			});
			return 1;
		},
	),
];
function chunkArray(array: any[], chunkSize: number) {
	const chunks = [];
	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize));
	}
	return chunks;
}

export async function getShopItems(interaction: RepliableInteraction) {
	// Map each chunk to an ActionRow with up to 5 buttons

	await interaction.reply({
		embeds: [
			{
				title: "<:market:1230344179461263430> The sponge shop",
				fields: [
					...shopItems.map((item) => {
						return { name: `${item.name} (${item.price} 🧽)`, value: item.description };
					}),
				],
			},
		],
		components: chunkArray(shopItems, 5).map((chunk: any[]) => ({
			type: ComponentType.ActionRow,
			components: chunk.map((item: { name: any }) => ({
				type: ComponentType.Button,
				customId: `${shopItems.findIndex((i) => i.name == item.name)}_buyItem`,
				label: item.name,
				style: [
					ButtonStyle.Danger,
					ButtonStyle.Primary,
					ButtonStyle.Secondary,
					ButtonStyle.Success,
				].at(Math.floor(Math.random() * 4)) as any,
			})),
		})),
	});
}

export async function buyItem(button: ButtonInteraction) {
	const item = shopItems[+button.customId.split("_")[0]];
	if (!item)
		return await button.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Invalid Option (this is probably a bug please report it)`,
		});
	const message = await button.reply({
		fetchReply: true,
		ephemeral: true,
		content: "",
		embeds: [
			{
				title: "Confirm Purchase",
				description: `Confirm Purchase of ${item.name} for ${item.price} 🧽? this action is **IRRIVERSABLE**`,
				color: 0xff0000,
			},
		],
		components: [
			{
				components: [
					{
						type: ComponentType.Button,
						customId: `confirm`,
						label: "Confirm",
						style: ButtonStyle.Danger,
					},
					{
						type: ComponentType.Button,
						customId: `decline`,
						label: "Cancel",
						style: ButtonStyle.Secondary,
					},
				],
				type: ComponentType.ActionRow,
			},
		],
	});
	const ans = await message.awaitMessageComponent({
		componentType: ComponentType.Button,
	});
	ans.deferUpdate();
	if (ans.customId == "decline")
		return button.editReply({
			content: `${constants.emojis.statuses.yes} Canceled Purchase`,
			embeds: [],
			components: [],
		});
	await button.editReply({
		content: `${constants.emojis.statuses.yes} Attempting Purchase`,
		embeds: [],
		components: [],
	});
	const result = await item.buy(button.user);
	switch (result) {
		case 1: {
			return await button.editReply({
				content: `${constants.emojis.statuses.yes} Purchase Successful`,
				embeds: [],
				components: [],
			});
		}
		case 0: {
			return await button.editReply({
				content: `${constants.emojis.statuses.no} You already have the thing`,
				embeds: [],
				components: [],
			});
		}
		case -1: {
			return await button.editReply({
				content: `${constants.emojis.statuses.no} You dont have enough money`,
				embeds: [],
				components: [],
			});
		}
		case -2: {
			return await button.editReply({
				content: `${constants.emojis.statuses.no} item does not exist`,
				embeds: [],
				components: [],
			});
		}
		case -3: {
			return await button.editReply({
				content: `${constants.emojis.statuses.no} general error happened, it has been reported`,
				embeds: [],
				components: [],
			});
		}
	}
}
