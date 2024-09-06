import {
	ActivityType,
	ApplicationCommandOptionType,
	AutoModerationRuleTriggerType,
	GuildMember,
	MessageMentions,
	MessageType,
	underline,
	type CommandInteractionOption,
} from "discord.js";
import { commands, defineChatCommand, defineEvent } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { escapeMessage } from "../../util/markdown.js";
import { joinWithAnd } from "../../util/text.js";
import { ignoredDeletions } from "../logging/messages.js";
import warn from "../punishments/warn.js";
import automodMessage, { OCR } from "./automod.js";
import tryCensor, { badWordsAllowed } from "./misc.js";
import changeNickname from "./nicknames.js";
import { handleMessage } from "./spam.js";
import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";

defineEvent.pre("interactionCreate", async (interaction) => {
	if (
		!interaction.inGuild() ||
		interaction.guild?.id !== config.guild.id ||
		!interaction.isChatInputCommand()
	)
		return true;

	if (!interaction.command) throw new ReferenceError("Unknown command run");

	const command =
		commands[interaction.command.name]?.find(
			(command) =>
				typeof command.access === "boolean" ||
				!![command.access].flat().includes(interaction.guild?.id),
		) ?? commands[interaction.command.name]?.[0];
	if (!command) throw new ReferenceError(`Command \`${interaction.command.name}\` not found`);

	if (command.censored === "channel" ? badWordsAllowed(interaction.channel) : !command.censored)
		return true;

	const censored = censorOptions(interaction.options.data);

	if (censored.strikes) {
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Please ${
				censored.strikes < 1 ? "don’t say that here" : "watch your language"
			}!`,
		});
		await warn(
			interaction.user,
			censored.words.length === 1 ? "Used a banned word" : "Used banned words",
			censored.strikes,
			`Used command \`${interaction.toString()}\``,
		);
		return false;
	}

	return true;
});
defineEvent.pre("messageCreate", async (message) => {
	if (message.author.bot) return true;
	const a = handleMessage(message.author.id, message.content);
	if (a) {
		const member = await config.guild.members.fetch(message.author.id);
		await member.timeout(10000);
		await message.reply("Slow down!");
		await message.delete();
		await warn(message.author, "Spamming");
		return false;
	}
	if (message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage)
		return false;

	if (message.guild?.id === config.guild.id) return await automodMessage(message);
	return true;
});
defineEvent("messageUpdate", async (_, message) => {
	if (message.partial) return;
	if (
		!message.flags.has("Ephemeral") &&
		message.type !== MessageType.ThreadStarterMessage &&
		message.guild?.id === config.guild.id
	)
		return await automodMessage(message);
	return true;
});
defineEvent.pre("messageReactionAdd", async (partialReaction, partialUser) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
	if (message.guild?.id !== config.guild.id) return true;

	if (reaction.emoji.name && !badWordsAllowed(message.channel)) {
		const censored = tryCensor(reaction.emoji.name, 1);
		if (censored) {
			await warn(
				partialUser.partial ? await partialUser.fetch() : partialUser,
				"Reacted with a banned emoji",
				censored.strikes,
				`:${reaction.emoji.name}:`,
			);
			await reaction.remove();
			return false;
		}
	}
	return true;
});
defineEvent.pre("threadCreate", async (thread, newlyCreated) => {
	if (!newlyCreated) return false;
	if (thread.guild.id !== config.guild.id) return true;

	const censored = tryCensor(thread.name);
	if (censored && !badWordsAllowed(thread)) {
		await thread.delete("Bad words");
		return false;
	}
	return true;
});
defineEvent("threadUpdate", async (oldThread, newThread) => {
	if (newThread.guild.id !== config.guild.id) return;

	const censored = tryCensor(newThread.name);
	if (censored && !badWordsAllowed(newThread)) {
		await newThread.setName(oldThread.name, "Censored bad word");
	}
});
defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;
	await changeNickname(member);
});
defineEvent("guildMemberUpdate", async (_, member) => {
	await changeNickname(member);
});
defineEvent.pre("userUpdate", async (_, user) => {
	const member = await config.guild.members.fetch(user).catch(() => void 0);
	if (member) {
		await changeNickname(member);
		return true;
	}
	return false;
});
defineEvent("presenceUpdate", async (_, newPresence) => {
	if (newPresence.guild?.id !== config.guild.id) return;

	const activity =
		newPresence.activities.find((activity) => activity.type === ActivityType.Custom) ??
		newPresence.activities[0];
	if (!activity) return;

	const status =
		(activity.emoji?.toString() ?? "") +
		" " +
		(activity.type === ActivityType.Custom ? activity.state : activity.name);
	// TODO: Check `.details` for hang statuses
	const censored = tryCensor(status, 1);
	if (censored && newPresence.member?.roles.resolve(config.roles.staff.id)) {
		await warn(
			newPresence.member,
			"As server representatives, staff members are not allowed to have bad words in their statuses. Please change yours now to avoid another strike.",
			censored.strikes,
			"Set status to " + status,
		);
	}
});
function drawRectangle(
	ctx: SKRSContext2D,
	pos: { x0: any; y0: any; x1: any; y1: any },
	color: any,
	opacity: any,
) {
	ctx.fillStyle = hexToRgba(color, opacity);
	const { x0, y0, x1, y1 } = pos;
	const width = x1 - x0;
	const height = y1 - y0;
	ctx.fillRect(x0, y0, width, height);
	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.strokeRect(x0 - 3, y0 - 3, width + 6, height + 6);
}

function hexToRgba(hex: string, opacity: any) {
	const bigint = parseInt(hex.slice(1), 16);
	const r = (bigint >> 16) & 255;
	const g = (bigint >> 8) & 255;
	const b = bigint & 255;
	return `rgba(${r},${g},${b},${opacity})`;
}
defineChatCommand(
	{
		name: "is-bad-word",
		description: "Check text for banned language",

		options: {
			text: {
				type: ApplicationCommandOptionType.String,
				description: "Text to check",
				required: false,
			},
			image: {
				type: ApplicationCommandOptionType.Attachment,
				description: "Text to check",
				required: false,
			},
		},

		censored: false,
	},

	async (interaction, options) => {
		if (options.image) {
			await interaction.reply({
				ephemeral: true,
				content: "Reading Image...",
			});
			const imageResult = await OCR.recognize(options.image.url);

			// console.log(imageResult.data.words.map((w) => console.log(w.bbox, w.text)))

			const result = tryCensor(imageResult.data.text);

			if (!result)
				return await interaction.editReply({
					content: `${constants.emojis.statuses.yes} No bad words found.`,
				});
			interaction.editReply({
				content: "Highlighting...",
			});
			const imageBadWords = imageResult.data.words
				.map((w) => ({ pos: w.bbox, text: w.text }))
				.filter((w) => result.words.flat().some((s) => w.text.includes(s)));
			const img = await loadImage(options.image.url);
			const canvas = createCanvas(img.width, img.height);
			const ctx = canvas.getContext("2d");
			ctx.drawImage(img, 0, 0);
			imageBadWords.forEach((word) => drawRectangle(ctx, word.pos, "#ff0000", 0.0));

			const words = result.words.flat();
			const strikes = Math.trunc(result.strikes);

			const isMod =
				interaction.member instanceof GuildMember ?
					interaction.member.roles.resolve(config.roles.mod.id)
				:	interaction.member.roles.includes(config.roles.mod.id);

			await interaction.editReply({
				content:
					`## ⚠️ ${words.length} bad word${words.length === 1 ? "s" : ""} detected!\n` +
					(isMod ?
						`That text gives **${strikes} strike${strikes === 1 ? "" : "s"}**.\n\n`
					:	"") +
					`*I detected the following words as bad*: ${joinWithAnd(words, (word) =>
						underline(escapeMessage(word)),
					)}`,
				files: [{ attachment: canvas.toBuffer("image/png"), name: "swears!!!!!!!.png" }],
			});
		} else if (options.text) {
			await interaction.deferReply({
				ephemeral: true,
			});

			// console.log(imageResult.data.words.map((w) => console.log(w.bbox, w.text)))

			const result = tryCensor(options.text);

			if (!result)
				return await interaction.editReply({
					content: `${constants.emojis.statuses.yes} No bad words found.`,
				});

			const words = result.words.flat();
			const strikes = Math.trunc(result.strikes);

			const isMod =
				interaction.member instanceof GuildMember ?
					interaction.member.roles.resolve(config.roles.mod.id)
				:	interaction.member.roles.includes(config.roles.mod.id);

			await interaction.editReply({
				content:
					`## ⚠️ ${words.length} bad word${words.length === 1 ? "s" : ""} detected!\n` +
					(isMod ?
						`That text gives **${strikes} strike${strikes === 1 ? "" : "s"}**.\n\n`
					:	"") +
					`*I detected the following words as bad*: ${joinWithAnd(words, (word) =>
						underline(escapeMessage(word)),
					)}`,
			});
		} else {
			interaction.reply({
				ephemeral: true,
				content: "No inputs found.",
			});
		}
	},
);

defineEvent("autoModerationActionExecution", async (action) => {
	if (
		action.guild.id === config.guild.id &&
		action.ruleTriggerType === AutoModerationRuleTriggerType.KeywordPreset &&
		action.alertSystemMessageId &&
		action.action.metadata.channelId &&
		tryCensor(action.content) &&
		!MessageMentions.EveryonePattern.test(action.content)
	) {
		const channel = await config.guild.channels.fetch(action.action.metadata.channelId);
		if (channel?.isTextBased()) {
			ignoredDeletions.add(action.alertSystemMessageId);
			await channel.messages.delete(action.alertSystemMessageId);
		}
	}
});

function censorOptions(options: readonly CommandInteractionOption[]): {
	strikes: number;
	words: string[];
} {
	let strikes = 0;
	const words: string[] = [];

	for (const option of options) {
		const censoredValue =
			(typeof option.value === "string" && tryCensor(option.value)) || undefined;
		const censoredOptions = option.options && censorOptions(option.options);

		strikes += (censoredValue?.strikes ?? 0) + (censoredOptions?.strikes ?? 0);
		words.push(
			...(censoredValue?.words.flat() ?? []),
			...(censoredOptions?.words.flat() ?? []),
		);
	}

	return { strikes, words };
}
