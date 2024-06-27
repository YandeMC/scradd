import { AutoModerationActionType, type CommandInteractionOption } from "discord.js";
import { commands, defineEvent } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";

import { ignoredDeletions } from "../logging/messages.js";
import warn from "../punishments/warn.js";
// import automodMessage from "./automod.js";
import tryCensor, { badWordsAllowed } from "./misc.js";
// import changeNickname from "./nicknames.js";
import { handleMessage } from "./spam.js";
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
	if (message.author.bot) return true
	const a = handleMessage(message.author.id, message.content);
	if (a) {
		await message.reply("Slow down!")
		await message.delete();
		await warn(message.author, "Spamming");
		const member = await config.guild.members.fetch(message.author.id)
		member.disableCommunicationUntil(Date.now() + 30_000)
	}
	return !a;
});
defineEvent("messageCreate", async (message) => {
	if (message.channel.id != config.channels.modlogs?.id) return;
	if (message.author.id != "1248032347027406952") return;
	if (!message.content.match(/^WARN\s/)) return;
	const w: {
		user: {
			id: string;
		};
		reason: string;
		rawStrikes: number;
		contextOrModerator: string;
	} = JSON.parse(message.content.replace(/^WARN\s/, "")) as {
		user: {
			id: string;
		};
		reason: string;
		rawStrikes: number;
		contextOrModerator: string;
	};
	warn(await config.guild.members.fetch(w.user.id), w.reason, w.rawStrikes, w.contextOrModerator);
});

defineEvent("autoModerationActionExecution", async (action) => {
	if (
		action.guild.id === config.guild.id &&
		action.action.type === AutoModerationActionType.SendAlertMessage &&
		action.alertSystemMessageId &&
		tryCensor(action.content)
	) {
		const channel =
			action.action.metadata.channelId &&
			(await config.guild.channels.fetch(action.action.metadata.channelId));
		if (channel && channel.isTextBased()) {
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
