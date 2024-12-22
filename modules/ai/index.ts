import { client, defineEvent } from "strife.js";
import { AIChat } from "./ai-manager.js";
import type { Message } from "discord.js";
import config from "../../common/config.js";
import Database from "../../common/database.js";
import { gracefulFetch } from "../../util/promises.js";
import { updateStatus } from "./model-status.js";
import { prompts, people } from "./prompts.js";

let sharedHistory: { role: string; content: string | any[]; type?: string }[] | undefined = [];

const normalAi = new AIChat(
	"https://penguinai.abby.is-a.dev/v1/chat/completions",
	sharedHistory,
	100,
	prompts.map((p) => ({ content: `${p}`, role: "system" })),
);


const memory = new Database<{ content: string }>("aimem");

await memory.init();
defineEvent("messageCreate", async (m) => {
	if (m.author.bot) return;
	console.log(m.content)
	if (!m.channel.isTextBased()) return
	if (m.channel.isDMBased()) return
	// console.log(normalAi.getEffectiveHistory());

	const forcedReply =
		m.channelId == "1276365384542453790" ||
		m.mentions.has(client.user);
	const ai =
		m.channel.isDMBased() ?
			null
			: normalAi;
	if (!ai) return
	const canReply = forcedReply;


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
				)
				: await ai.send(
					`${m.reference ? `\n(replying to ${reference?.author.displayName} : ${reference?.author.id}\n${reference?.content})\n` : ""}${m.author.displayName} : ${m.author.id} : ${m.channel.isDMBased() ? `${m.author.displayName}'s DMs` : m.channel.name}\n${m.content}`,
				);
		//[...m.attachments.filter((attachment) => attachment.contentType?.match(/^image\/(bmp|jpeg|png|bpm|webp)$/i)).map(v => v.url)]

		do {
			const commands = parseCommands(response);
			if (!commands) return;
			result = await executeCommands(m, commands, canReply);
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
	if (!input) return;
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
	canReply: boolean,
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
				if (canReply) await m.reply(command.option).catch(() => undefined);
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

			case "store":
				store(command.option);
				break;
			case "recall":
				output.push("[recall]: " + recall(command.option).join("\n") || "nothing found.  ");
				break;
			case "gif":
				{
					const gifs: {
						src: string;
					}[] =
						(await gracefulFetch(
							`https://discord.com/api/v9/gifs/search?q=${encodeURIComponent(command.option)}&media_format=gif&provider=tenor&locale=en-US`,
						)) ?? [];
					output.push(`[${command.name}]: top ${gifs.length} gifs for ${command.option}\n${gifs.join("\n")}`);
				}
				break;
			case "updatedesc":
				{
					const parts = command.option.split(" ");
					const id = parts.shift() ?? "";
					if (id !== m.author.id) break;
					const desc = parts.join(" ");
					console.log(id, desc);
					let data = [...people.data];
					const index = data.findIndex((a) => a.id == id);
					if (index === -1) data.push({ id, desc });
					else data[index] = { id, desc };

					people.data = data;
				}
				break;
			default:
				output.push(`[${command.name}]: ${command.name} command not found`);
		}
	}
	return output;
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
