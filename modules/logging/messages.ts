import { unifiedDiff } from "difflib";
import {
	Colors,
	messageLink,
	type ReadonlyCollection,
	type GuildTextBasedChannel,
	type Message,
	type MessageReaction,
	type PartialMessage,
	type Snowflake,
	AuditLogEvent,
	time,
} from "discord.js";
import config from "../../common/config.js";
import { databaseThread } from "../../common/database.js";
import { extractMessageExtremities, getBaseChannel, messageToText } from "../../util/discord.js";
import { joinWithAnd } from "../../util/text.js";
import log, { LogSeverity, LoggingEmojis, shouldLog } from "./misc.js";

export const ignoredDeletions = new Set<Snowflake>();

export async function messageDelete(message: Message | PartialMessage): Promise<void> {
	if (
		!shouldLog(message.channel) ||
		message.flags.has("Ephemeral") ||
		ignoredDeletions.delete(message.id)
	)
		return;
	const shush =
		message.partial ||
		(config.channels.modlogs.id === getBaseChannel(message.channel)?.id &&
			databaseThread.id !== message.channel.id);

	const content = !shush && messageToText(message, false);
	const { embeds, files } =
		shush ? { embeds: [], files: [] } : extractMessageExtremities(message);
	const auditLogs = await config.guild
		.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MessageDelete })
		.catch(() => void 0);
	await log(
		`${LoggingEmojis.MessageDelete} ${message.partial ? "Unknown message" : "Message"}${
			message.author ? ` by ${message.author.toString()}` : ""
		} in ${message.url} (Sent: ${time(Math.floor(message.createdTimestamp / 1000))}) deleted ${auditLogs ? `by ${auditLogs.entries.first()?.executor?.toString()}` : ""}`,
		LogSeverity.ContentEdit,
		{
			embeds,
			buttons: [
				...(message.reference?.messageId ?
					[
						{
							label: "Reference",
							url: messageLink(
								message.reference.guildId ?? "@me",
								message.reference.channelId,
								message.reference.messageId,
							),
						},
					]
				:	[]),
			],

			files:
				content ?
					[{ content, extension: "md" }, ...files.map((file) => file.url)]
				:	files.map((file) => file.url),
		},
	);
}
export async function messageDeleteBulk(
	messages: ReadonlyCollection<string, Message | PartialMessage>,
	channel: GuildTextBasedChannel,
): Promise<void> {
	if (!shouldLog(channel)) return;
	const messagesInfo = (
		await Promise.all(
			messages
				.map(async (message) => {
					const embeds = `${message.embeds.length ? `${message.embeds.length} embed` : ""}${
						message.embeds.length > 1 ? "s" : ""
					}`;
					const attachments = `${
						message.attachments.size ? `${message.attachments.size} attachment` : ""
					}${message.attachments.size > 1 ? "s" : ""}`;
					const extremities =
						message.embeds.length || message.attachments.size ?
							` (${embeds}${embeds && attachments && ", "}${attachments})`
						:	"";

					const author =
						message.author ?
							`${message.author.tag} - ${message.author.id}`
						:	"[unknown author]";
					const content = !message.partial && (await messageToText(message));

					return `${author}${extremities}${content ? `:\n${content}` : ""}`;
				})
				.toReversed(),
		)
	).join("\n\n---\n\n");

	const allAuthors = messages.map(({ author }) => author?.toString());
	const unknownCount = allAuthors.filter((author) => !author).length;
	const authors = [
		...new Set(allAuthors.filter(Boolean)),
		...(unknownCount ?
			[`at least ${unknownCount} unknown user${unknownCount === 1 ? "" : "s"}`]
		:	[]),
	];

	const url = messages.first()?.url;
	await log(
		`${LoggingEmojis.MessageDelete} ${messages.size} messages by ${joinWithAnd(
			authors,
		)} in ${channel.toString()} bulk deleted`,
		LogSeverity.ContentEdit,
		{
			files: [{ content: messagesInfo, extension: "md" }],
			buttons: url ? [{ label: "Context", url }] : [],
		},
	);
}
export const ignoredReactionPurges = new Set<Snowflake>();
export async function messageReactionRemoveAll(
	partialMessage: Message | PartialMessage,
	reactions: ReadonlyCollection<string, MessageReaction>,
): Promise<void> {
	const message = partialMessage.partial ? await partialMessage.fetch() : partialMessage;

	if (!shouldLog(message.channel) || ignoredReactionPurges.has(message.id)) return;

	await log(
		`${
			LoggingEmojis.Expression
		} Reactions purged on [message](<${message.url}>) by ${message.author.toString()} in ${message.channel.toString()}`,
		LogSeverity.ContentEdit,
		{
			embeds: [
				{
					fields: reactions.map((reaction) => ({
						name: reaction.emoji.toString(),
						value: `${reaction.count} reaction${reaction.count === 1 ? "" : "s"}`,
						inline: true,
					})),
					color: Colors.Blurple,
				},
			],
		},
	);
}
export async function messageUpdate(
	oldMessage: Message | PartialMessage,
	newMessage: Message | PartialMessage,
): Promise<void> {
	if (newMessage.partial) return;
	if (!shouldLog(newMessage.channel) || newMessage.flags.has("Ephemeral")) return;

	if (oldMessage.flags.has("Crossposted") !== newMessage.flags.has("Crossposted")) {
		await log(
			`${
				LoggingEmojis.MessageUpdate
			} [Message](<${newMessage.url}>) by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${newMessage.flags.has("Crossposted") ? "" : "un"}published`,
			LogSeverity.ServerChange,
		);
	}
	if (oldMessage.flags.has("SuppressEmbeds") !== newMessage.flags.has("SuppressEmbeds")) {
		await log(
			`${LoggingEmojis.MessageUpdate} Embeds ${
				newMessage.flags.has("SuppressEmbeds") ? "removed from" : "shown on"
			} [message](<${newMessage.url}>) by ${newMessage.author.toString()} in ${newMessage.channel.toString()}`,
			LogSeverity.ContentEdit,
			{ embeds: oldMessage.embeds },
		);
	}

	if (!oldMessage.partial && oldMessage.pinned !== newMessage.pinned) {
		await log(
			`${
				LoggingEmojis.MessageUpdate
			} [Message](<${newMessage.url}>) by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${newMessage.pinned ? "" : "un"}pinned`,
			LogSeverity.ServerChange,
		);
	}

	if (!newMessage.author.bot) {
		const files = [];
		const contentDiff =
			!oldMessage.partial &&
			unifiedDiff(oldMessage.content.split("\n"), newMessage.content.split("\n"), {
				lineterm: "",
			})
				.join("\n")
				.replace(/^-{3} \n\+{3} \n/, "");
		if (contentDiff) files.push({ content: contentDiff, extension: "diff" });

		const changedFiles = new Set(newMessage.attachments.map((attachment) => attachment.id));
		files.push(
			...oldMessage.attachments
				.map((attachment) => attachment.id)
				.filter((attachment) => !changedFiles.has(attachment)),
		);

		if (files.length) {
			await log(
				`${LoggingEmojis.MessageEdit} [${
					oldMessage.partial ? "Unknown message" : "Message"
				}](<${newMessage.url}>) by ${newMessage.author.toString()} in ${newMessage.channel.toString()} edited`,
				LogSeverity.ContentEdit,
				{ files },
			);
		}
	}
}
