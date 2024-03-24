import { Constants, type Message } from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import {
	GlobalAnimatedEmoji,
	GlobalBotInvitesPattern,
	InvitesPattern,
	getBaseChannel,
} from "../../util/discord.js";
import { stripMarkdown } from "../../util/markdown.js";
import { joinWithAnd } from "../../util/text.js";
import log, { LogSeverity, LoggingErrorEmoji } from "../logging/misc.js";
import { PARTIAL_STRIKE_COUNT } from "../punishments/misc.js";
import warn from "../punishments/warn.js";
import { getLevelForXp } from "../xp/misc.js";
import { xpDatabase } from "../xp/util.js";
import tryCensor, { badWordRegexps, badWordsAllowed } from "./misc.js";
import { stripMarkdown } from "../../util/markdown.js";
import { joinWithAnd } from "../../util/text.js";
import { createWorker } from "tesseract.js";

const worker = await createWorker("eng");
async function getMessageImageText(message: Message): Promise<string[]> {
	const imageTextPromises = message.attachments
		.filter((attachment) => attachment.contentType?.match(/^image\/(bmp|jpeg|png|bpm|webp)$/i))
		.map(async ({ url }) => {
			if (url) {
				const ret = await worker.recognize(url);
				return ret.data.text;
			}
		})
		.filter(Boolean);

	const imageTextResults = await Promise.all(imageTextPromises);
	return imageTextResults as string[];
}

const WHITELISTED_INVITE_GUILDS = new Set([
	config.guild.id,
	...config.otherGuildIds,
	"898383289059016704", // Scratch Addons SMP Archive
	"837024174865776680", // TurboWarp
	"945340853189247016", // ScratchTools
	"461575285364752384", // 9th Tail Bot Hub
	"333355888058302465", // DISBOARD
	undefined, // Invalid links
]);

export default async function automodMessage(message: Message): Promise<boolean> {
	const allowBadWords = badWordsAllowed(message.channel);
	const baseChannel = getBaseChannel(message.channel);
	const pings = message.mentions.users.size
		? ` (ghost pinged ${joinWithAnd(message.mentions.users.map((user: { toString: () => any; }) => user.toString()))})`
		: "";

	let needsDelete = false;
	let deletionMessage = "";

	const animatedEmojis =
		baseChannel?.id !== config.channels.bots?.id && message.content.match(GlobalAnimatedEmoji);
	const badAnimatedEmojis =
		animatedEmojis &&
		animatedEmojis.length > 15 &&
		Math.floor((animatedEmojis.length - 16) / 10) * PARTIAL_STRIKE_COUNT;

	if (animatedEmojis && typeof badAnimatedEmojis === "number") {
		needsDelete = true;
		await warn(
			message.author,
			`${animatedEmojis.length} animated emojis`,
			badAnimatedEmojis,
			animatedEmojis.join(""),
		);
		deletionMessage += ` Please don’t post that many animated emojis!`;
	}

	if (allowBadWords) {
		if (!needsDelete) return true;
		if (!message.deletable) {
			await log(
				`${LoggingErrorEmoji} Unable to delete ${message.url} (${deletionMessage.trim()})`,
				LogSeverity.Alert,
			);
			return true;
		}

		const publicWarn = await message.reply({
			content: `${constants.emojis.statuses.no}${deletionMessage}${pings}`,
			allowedMentions: { users: [], repliedUser: true },
		});
		await message.delete();
		setTimeout(() => publicWarn.delete(), 300_000);
		return false;
	}

	const inviteLinks = message.content.match(InvitesPattern) ?? [];
	const invites = await Promise.all(
		inviteLinks.map(
			async (link: string) =>
				[
					link,
					await client.fetchInvite(link.split("/").at(-1) ?? link).catch(() => void 0),
				] as const,
		),
	);

	if (
		config.channels.advertise &&
		baseChannel &&
		config.channels.advertise.id !== baseChannel.id &&
		!baseChannel.isDMBased() &&
		baseChannel.permissionsFor(baseChannel.guild.id)?.has("SendMessages")
	) {
		const badInvites = [
			...new Set(
				invites
					
					.map(([link]) => link),
			),
		];

		if (badInvites.length) {
			needsDelete = true;
			await warn(
				message.author,
				`Server invite in ${message.channel.toString()}`,
				badInvites.length,
				badInvites.join("\n"),
			);
			deletionMessage += ` Please keep server invites in ${config.channels.advertise.toString()}!`;
		}

		const bots = [...new Set(message.content.match(GlobalBotInvitesPattern))];
		if (!message.author.bot && bots.length) {
			needsDelete = true;
			await warn(
				message.author,
				`Bot invite in ${message.channel.toString()}`,
				bots.length,
				bots.join("\n"),
			);
			deletionMessage += ` Please don’t post bot invites outside of ${config.channels.advertise.toString()}!`;
		}

		if (baseChannel.name.includes("general") || baseChannel.name.includes("showcase")) {
			const links = Array.from(
				new Set(message.content.match(/(https?:\/\/[^\s"')*,.:;<>\]]+)/gis) ?? []),
				(link) => new URL(link),
			).filter((link) =>
				[
					"scratch.camp",
					"scratch.love",
					"scratch.mit.edu",
					"scratch.org",
					"scratch.pizza",
					"scratch.team",

					"youtu.be",
					"youtube.com",
				].includes(link.hostname),
			);

			const level = getLevelForXp(
				xpDatabase.data.find(({ user }) => user === message.author.id)?.xp ?? 0,
			);
			const canPostLinks =
				!links.length ||
				level > 4 ||
				[(config.roles.dev?.id, config.roles.epic?.id, config.roles.booster?.id)].some(
					(role) => !message.member || (role && message.member.roles.resolve(role)),
				);

			if (!canPostLinks) {
				needsDelete = true;
				await warn(
					message.author,
					`Posted blacklisted link${
						links.length === 1 ? "" : "s"
					} in ${message.channel.toString()} while at level ${level}`,
					links.length * 0.25,
					links.join(" "),
				);
				deletionMessage += ` Sorry, but you need level 5 to post ${
					links.length === 1 ? "that link" : "those links"
				} outside a channel like ${config.channels.advertise.toString()}!`;
			}
		}
	}

	const badWords = [
		tryCensor(stripMarkdown(message.content)),
		...message.stickers.map(({ name }) => tryCensor(name)),
		...invites.map(([, invite]) => !!invite?.guild && tryCensor(invite.guild.name)),
	].reduce(
		(bad, censored) =>
			typeof censored === "boolean"
				? bad
				: {
						strikes: bad.strikes + censored.strikes,
						words: bad.words.map((words: any, index: number) => [
							...words,
							...(censored.words[index] ?? []),
						]),
				  },
		{ strikes: 0, words: Array.from<string[]>({ length: badWordRegexps.length }).fill([]) },
	);
	if (badWords.strikes) needsDelete = true;

	

	if (
		!([...Constants.NonSystemMessageTypes] as const).includes(message.type)
	)
		needsDelete = true;

	const languageStrikes = badWords.strikes;
	if (languageStrikes) {
		const words = [...badWords.words.flat()];
		await warn(
			message.interaction?.user ?? message.author,
			words.length === 1 ? "Used a banned word" : "Used banned words",
			languageStrikes,
			words.join(", "),
		);
		deletionMessage +=
			languageStrikes < 1 ? " Please don’t say that here!" : " Please watch your language!";
	}

	if (needsDelete) {
		if (message.deletable) {
			const publicWarn = await message.reply({
				content: `${constants.emojis.statuses.no}${deletionMessage}${pings}`,
				allowedMentions: { users: [], repliedUser: true },
			});
			await message.delete();
			setTimeout(() => publicWarn.delete(), 300_000);
			return false;
		}

		await log(
			`${LoggingErrorEmoji} Unable to delete ${message.url} (${deletionMessage.trim()})`,
			LogSeverity.Alert,
		);
	}

	return true;
}
