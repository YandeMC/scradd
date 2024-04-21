import { GuildMember, MessageType, User, type Message, type Snowflake } from "discord.js";
import { spongesDB } from "./util.js";
import config from "../../common/config.js";

const latestMessages: Record<Snowflake, Message[]> = {};

export async function giveSpongesForMessage(message: Message): Promise<void> {
	if (!latestMessages[message.channel.id]) {
		const fetched = await message.channel.messages
			.fetch({ limit: 100, before: message.id })
			.then((messages) => [...messages.values()]);

		const accumulator: Message[] = [];
		for (let index = 0; index < fetched.length && accumulator.length < 1; index++) {
			const item = fetched[index];
			if (item && (!item.author.bot || item.interaction)) accumulator.push(item);
		}
		latestMessages[message.channel.id] = accumulator;
	}
	const lastInChannel = latestMessages[message.channel.id] ?? [];
	const spam = lastInChannel.findIndex((foundMessage) => {
		return ![message.author.id, message.interaction?.user.id || ""].some((user) =>
			[foundMessage.author.id, foundMessage.interaction?.user.id].includes(user),
		);
	});

	const newChannel = lastInChannel.length < 1;
	if (!newChannel) lastInChannel.pop();
	lastInChannel.unshift(message);
	const bot = 1 + Number(Boolean(message.interaction));

	await giveSponges(
		message.interaction?.user ?? message.author,
		spam === -1 && !newChannel
			? (await config.guild.members.fetch(message.author)).roles.resolveId("1213666253324030043") ? 5 : 1 
			: Math.max(
					1,
					Math.round(
						(1 - (newChannel ? lastInChannel.length - 1 : spam)) /
							bot /
							(1 +
								Number(
									![
										MessageType.Default,
										MessageType.GuildBoost,
										MessageType.GuildBoostTier1,
										MessageType.GuildBoostTier2,
										MessageType.GuildBoostTier3,
										MessageType.Reply,
										MessageType.ChatInputCommand,
										MessageType.ContextMenuCommand,
										MessageType.RoleSubscriptionPurchase,
										MessageType.GuildApplicationPremiumSubscription,
									].includes(message.type),
								)),
					),
			  ),
	);
}

/**
 * Give Sponges to a user.
 *
 * @param to - Who to give the sponges to.
 * @param amount - How many Sponges to give.
 */
export async function giveSponges(to: GuildMember | User, amount = 1): Promise<void> {
	const user = to instanceof User ? to : to.user;
	if (process.env.NODE_ENV === "production" && user.bot) return;

	const spong = [...spongesDB.data];

	const xpDatabaseIndex = spong.findIndex((entry) => entry.user === user.id);
	const oldXp = spong[xpDatabaseIndex]?.sponges || 0;
	const newXp = oldXp === 0 && amount < 0 ? 0 : oldXp + amount;

	if (xpDatabaseIndex === -1) spong.push({ user: user.id, sponges: amount });
	else spong[xpDatabaseIndex] = { user: user.id, sponges: newXp };

	spongesDB.data = spong;
}

/**
 * See how many sponges a user has.
 *
 * @param to - Who to give the sponges to.
 * @param amount - How many Sponges to give.
 */
export function getSponges(to: GuildMember | User): number {
	const user = to instanceof User ? to : to.user;

	const spong = [...spongesDB.data];

	const xpDatabaseIndex = spong.findIndex((entry) => entry.user === user.id);
	const oldXp = spong[xpDatabaseIndex]?.sponges || 0;
	return oldXp;
}
