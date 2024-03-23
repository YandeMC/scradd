import {
	ChannelType,
	MessageType,
	type PartialMessage,
	type Message,
	type Snowflake,
	type APIEmbed,
	ComponentType,
	ButtonStyle,
} from "discord.js";
import { getSettings } from "../settings.js";
import { BOARD_EMOJI } from "../board/misc.js";
import config from "../../common/config.js";
import { getBaseChannel } from "../../util/discord.js";
import { client, defineEvent } from "strife.js";
import { getMatches, handleMatch } from "./scratch.js";
import constants from "../../common/constants.js";


const ignoreTriggers = [
	/\bkill/i,
	/\bsuicid/i,
	/\bdepress/i,
	/\bpain/i,
	/\bsick/i,
	/\babus/i,
	/\bkms/i,
	/\bkys/i,
	/\bbleed/i,
];

defineEvent("messageCreate", async (message) => {
	let reactions = 0;

	if (
		[
			MessageType.GuildBoost,
			MessageType.GuildBoostTier1,
			MessageType.GuildBoostTier2,
			MessageType.GuildBoostTier3,
		].includes(message.type)
	) {
		await message.react(BOARD_EMOJI).catch(() => void 0);
		reactions++;
	}

	

	
});

defineEvent("messageUpdate", async (_, message) => {
	if (message.partial) return;

	const found = await getAutoResponse(message);
	if (found === false) return;

	const response = await handleMutatable(message);
	const data = typeof response === "object" && !Array.isArray(response) && response;
	if (found)
		await found.edit(data || { content: constants.zws, components: [], embeds: [], files: [] });
	else if (data) await message.reply(data);
});

async function handleMutatable(message: Message) {
	const baseChannel = getBaseChannel(message.channel);
	if (config.channels.modlogs?.id === baseChannel?.id) return;

	const settings = await getSettings(message.author);
	if (settings.scratchEmbeds) {
		const notSet = (await getSettings(message.author, false)).scratchEmbeds === undefined;

		const matches = getMatches(message.content);
		const embeds: APIEmbed[] = [];
		for (const match of matches) {
			const embed = await handleMatch(match);
			if (embed) {
				embeds.push(embed);
			}
		}
		if (embeds.length)
			return {
				content: "",
				files: [],
				embeds,
				components: notSet
					? [
							{
								components: [
									{
										customId: "scratchEmbeds_toggleSetting",
										type: ComponentType.Button as const,
										label: `Disable Scratch Embeds`,
										style: ButtonStyle.Success as const,
									},
								],
								type: ComponentType.ActionRow,
							},
					  ]
					: [],
			};
	}

	const ignored = ignoreTriggers.some((trigger) => message.content.match(trigger));
	if (ignored) return true;

	if (!canDoSecrets(message, true)) return;

	
}

defineEvent("messageDelete", async (message) => {
	const found = await getAutoResponse(message);
	if (!found) return;

	await found.delete();
	autoResponses.delete(found.id);
});

const autoResponses = new Map<Snowflake, Message>();
async function getAutoResponse(message: Message | PartialMessage) {
	const cached = autoResponses.get(message.id);
	if (cached) return cached;

	const fetched = await message.channel.messages.fetch({ limit: 2, after: message.id });
	const found = fetched.find(
		(found) =>
			found.reference?.messageId === message.id &&
			found.author.id === client.user.id &&
			found.createdTimestamp - message.createdTimestamp < 1000,
	);

	if (found) autoResponses.set(message.id, found);
	if (fetched.size && !found) return false;
	return found;
}

function canDoSecrets(message: Message, checkDads = false) {
	if (message.channel.isDMBased()) return false;
	if (
		message.mentions.has(client.user, {
			ignoreEveryone: true,
			ignoreRepliedUser: true,
			ignoreRoles: true,
		})
	)
		return true;

	if (checkDads) {
		const baseChannel = getBaseChannel(message.channel);
		if (
			(message.guild?.id === config.testingGuild?.id &&
				message.guild?.id !== config.guild.id) ||
			!baseChannel ||
			baseChannel.type !== ChannelType.GuildText ||
			!/\bbots?\b/i.test(baseChannel.name)
		)
			return false;
	}

	return message.channel.id !== message.id && !message.author.bot;
}
