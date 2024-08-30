import { client, defineEvent } from "strife.js";
import { AIChat } from "./ai-manager.js";
import type { Message } from "discord.js";
import config from "../../common/config.js";
import Database from "../../common/database.js";
import { xpDatabase } from "../xp/util.js";
import { getLevelForXp } from "../xp/misc.js";
import { gracefulFetch } from "../../util/promises.js";
import { updateStatus } from "./model-status.js";
import { prompts, freeWillPrompts, dmPrompts } from "./prompts.js";

let sharedHistory: { role: string; content: string | any[]; type?: string }[] | undefined = [];

const normalAi = new AIChat("https://reverse.mubi.tech/v1/chat/completions", sharedHistory, 100);
const freeWill = new AIChat("https://reverse.mubi.tech/v1/chat/completions", sharedHistory, 100);
let dmAis: { [id: string]: AIChat } = {};

prompts.forEach((p) => normalAi.sticky(p));
freeWillPrompts.forEach((p) => freeWill.sticky(p ?? ""));

const memory = new Database<{ content: string }>("aimem");
await memory.init();
defineEvent("messageCreate", async (m) => {
	if (m.author.bot) return;
	if (m.channel.isTextBased())
		if (!m.channel.isDMBased())
			if (!m.channel.permissionsFor(config.roles.verified ?? "")?.has("ViewChannel")) return;
	const forcedReply =
		m.channel.isDMBased() ||
		m.channelId == "1276365384542453790" ||
		m.mentions.has(client.user);
	const ai =
		m.channel.isDMBased() ?
			(() => {
				const userAi = dmAis[m.channel.id];
				if (userAi) return userAi;
				console.log("making new ai for " + m.author.displayName);
				const newAi = new AIChat("https://reverse.mubi.tech/v1/chat/completions", [], 100);
				dmPrompts.forEach((p) => newAi.sticky(p ?? ""));
				dmAis[m.channel.id] = newAi;
				return newAi;
			})()
		:	normalAi;

	if (!forcedReply) {
		const reference = m.reference ? await m.fetchReference() : null;
		let response =
			(
				m.attachments
					.filter((attachment) =>
						attachment.contentType?.match(/^image\/(bmp|jpeg|png|bpm|webp)$/i),
					)
					.map(() => "").length
			) ?
				await freeWill.send(
					[
						{
							type: "text",
							text: `${m.reference ? `\n(replying to ${reference?.author.displayName} : ${reference?.author.id}\n${reference?.content})\n` : ""}${m.author.displayName} : ${m.author.id} : ${m.channel.isDMBased() ? `${m.author.displayName}'s DMs` : m.channel.name}\n${m.content}`,
						},
						...[
							...m.attachments
								.filter((attachment) =>
									attachment.contentType?.match(
										/^image\/(bmp|jpeg|png|bpm|webp)$/i,
									),
								)
								.map((v) => v.url),
						].map((i) => ({ type: "image_url", image_url: { url: i } })),
					],
					"user",
					"complex",
					true,
				)
			:	await freeWill.send(
					`${m.reference ? `\n(replying to ${reference?.author.displayName} : ${reference?.author.id}\n${reference?.content})\n` : ""}${m.author.displayName} : ${m.author.id} : ${m.channel.isDMBased() ? `${m.author.displayName}'s DMs` : m.channel.name}\n${m.content}`,
					"user",
					"text",
					true,
				);
		const commands = parseCommands(response);

		if (!commands.some((c) => c.name == "continue")) return;
	}
	let result = [];
	let intCount = 0;
	const interval = setInterval(() => {
		m.channel.sendTyping();
		if (intCount > 30) clearInterval(interval);
		intCount++;
	}, 4000);
	const reference = m.reference ? await m.fetchReference() : null;
	try {
		let response =
			(
				m.attachments
					.filter((attachment) =>
						attachment.contentType?.match(/^image\/(bmp|jpeg|png|bpm|webp)$/i),
					)
					.map(() => "").length
			) ?
				await ai.send(
					[
						{
							type: "text",
							text: `${!forcedReply ? "!!!you are only answering this message because your freewill system detected it as important\n" : ""}${m.reference ? `\n(replying to ${reference?.author.displayName} : ${reference?.author.id}\n${reference?.content})\n` : ""}${m.author.displayName} : ${m.author.id} : ${m.channel.isDMBased() ? `${m.author.displayName}'s DMs` : m.channel.name}\n${m.content}`,
						},
						...[
							...m.attachments
								.filter((attachment) =>
									attachment.contentType?.match(
										/^image\/(bmp|jpeg|png|bpm|webp)$/i,
									),
								)
								.map((v) => v.url),
						].map((i) => ({ type: "image_url", image_url: { url: i } })),
					],
					"user",
					"complex",
				)
			:	await ai.send(
					`${!forcedReply ? "!!!you are only answering this message because your freewill system detected it as important\n" : ""}${m.reference ? `\n(replying to ${reference?.author.displayName} : ${reference?.author.id}\n${reference?.content})\n` : ""}${m.author.displayName} : ${m.author.id} : ${m.channel.isDMBased() ? `${m.author.displayName}'s DMs` : m.channel.name}\n${m.content}`,
				);
		//[...m.attachments.filter((attachment) => attachment.contentType?.match(/^image\/(bmp|jpeg|png|bpm|webp)$/i)).map(v => v.url)]

		do {
			const commands = parseCommands(response);
			result = await executeCommands(m, commands);
			if (result.length) response = await ai.send(result.join("\n"), "system");
		} while (result.length);
	} catch (error) {
		void error;
	}
	clearInterval(interval);
});

function parseCommands(input: string) {
	const commands: { name: string; option: string }[] = [];
	let lastCommand: { option: any; name: string } | null = null;

	input
		.trim()
		.split("\n")
		.forEach((line) => {
			const match = line.match(/^\[(\w+)\]\s*(.*)/);
			if (match) {
				// If the line contains a command, create a new command object
				lastCommand = {
					name: match[1] ?? "",
					option: match[2]?.trim() ?? "",
				};
				//@ts-ignore
				commands.push(lastCommand);
			} else if (lastCommand) {
				// If the line does not contain a command, add the line to the 'option' of the last command
				lastCommand.option += "\n" + line.trim();
			}
		});

	return commands;
}

async function executeCommands(
	m: Message,
	commands: {
		name: string;
		option: string;
	}[],
) {
	let output: string[] = [];
	if (commands.length == 0)
		return [
			"[SYSTEM]: It looks like your message didnt contain any commands. did you forget to [reply]?",
		];
	for (let command of commands) {
		switch (command.name) {
			case "nothing":
				break;
			case "reply":
				await m.reply(command.option.replaceAll("///", "\n")).catch(() => undefined);
				break;
			case "react":
				await (async () => {
					let emojis = extractEmojis(command.option);
					for (let emoji of emojis) {
						await m.react(emoji).catch(() => undefined);
					}
				})();
				break;
			case "dm":
				await m.author.send(command.option).catch(() => undefined);
				break;
			case "user":
				await (async () => {
					const user = await client.users.fetch(command.option).catch(() => undefined);
					if (!user) return output.push(`[user]: user not found`);
					output.push(
						`[user]: (displayname : globalname : username) ${user.displayName} : ${user.globalName} : ${user.username}`,
					);
				})();
				break;
			case "nick":
				await (
					await config.guild.members.fetchMe()
				).setNickname(command.option, ` requested by: ${m.author.id}`);
				break;
			case "time":
				output.push("[time]: " + new Date().toString());
				break;
			case "alert":
				await config.channels.mod.send({
					content: command.option + "\n" + m.url,
					allowedMentions: { parse: ["everyone", "roles"] },
				});
				break;
			case "store":
				store(command.option);
				break;
			case "recall":
				output.push("[recall]: " + recall(command.option).join("\n") || "nothing found.  ");
				break;
			case "xp":
				output.push(`[xp]: ${await getXp(command.option)}`);
				break;
			case "gif":
				{
					const gifs: {
						src: string;
					}[] =
						(await gracefulFetch(
							`https://discord.com/api/v9/gifs/search?q=${encodeURIComponent(command.option)}&media_format=gif&provider=tenor&locale=en-US`,
						)) ?? [];
					await m.reply(gifs.slice(0, 10).at(Math.round(Math.random() * 10))?.src ?? "");
				}
				break;
			default:
				output.push(`[${command.name}]: ${command.name} command not found`);
		}
	}
	return output;
}

async function getXp(user: string) {
	const allXp = xpDatabase.data.toSorted((one, two) => two.xp - one.xp);

	const xp = allXp.find((entry) => entry.user === user)?.xp ?? 0;
	const level = getLevelForXp(xp);
	const rank = allXp.findIndex((info) => info.user === user) + 1;
	return `(xp : level : nth rank in server) ${xp} : ${level} : ${rank}`;
}

function extractEmojis(str: string) {
	const emojiRegex = /[\p{Emoji}\uFE0F]/gu;
	const discordEmojiRegex = /<a?:\w+:\d+>/g;

	const unicodeEmojis = str.match(emojiRegex) || [];
	const discordEmojis = str.match(discordEmojiRegex) || [];

	return [...unicodeEmojis, ...discordEmojis];
}

function store(input: string): void {
	const content = input.trim();
	if (content) {
		memory.data = [...memory.data, { content }];
	}
}

function recall(query: string) {
	const keywords = query.split(/\s+/).map((word) => word.toLowerCase());
	return memory.data
		.filter((entry) =>
			keywords.every((keyword) => entry.content.toLowerCase().includes(keyword)),
		)
		.map((a) => a.content);
}

updateStatus();
