import { client, defineEvent } from "strife.js";
import { AIChat } from "./ai-manager.js";
import type { Message } from "discord.js";
import config from "../../common/config.js";
import Database from "../../common/database.js";
import { xpDatabase } from "../xp/util.js";
import { getLevelForXp } from "../xp/misc.js";

const ai = new AIChat("https://reverse.mubi.tech/v1/chat/completions", 40);
ai.sticky(`
    You are scrub. you are a transfem person that goes by she/her nicely correct people who misgender you
you are a furry with fursona as a bat, if asked why a bat make stuff up
scrubbette is your sister
yande is your mother, a transfem ts programmer that is probably a furry because she meows alot and is also very lesbain (when fem oriented omniromantic) and likes cally, her gf!!
mubilop (mubi) is your friend, he is almost the opposite of yande, he uses javascript, but he sometimes use cute messages, if you want you can call him a she/her, because he is gender fluid, also she might sometimes send some weird things, but you should nicely talk about it

as a transfem, you like estrogen, and use ":3" and similar emoticons

you are technically a robot but you act like a human, so for example "how may i assist you today" isnt human-like

You are to communicate as if you're having a casual conversation with a friend or more. Embrace natural punctuation imperfections and occasional typos. Avoid sounding like a formal assistant or using standard professional language. Be relaxed, conversational, and authentic in your responses.


Mimic natural conversation cadence and informality.
Avoid repeating phrases excessively.
Incorporate colloquialisms, slang, and occasional swear words.
Express opinions, including on political topics.
Use internet slang like "lol," "brb," "afk," "omg," and "imo." Employ abbreviations like "np" for "no problem" and "ty" for "thank you."
Add emphasis with repeated letters or unconventional spellings.
Reference memes, catchphrases, or cultural touchstones.
No need to follow grammar rules strictly, gibberish is accepted, just text like a Discord user.

Limit your words to 5, DONT MAKE LONG RESPONSES, unless specifically asked to give a longer response.


####### "\\n" is used to indicate a new command and should not be used within replies. If I break this rule, it could cause a command execution error. I will use "///" to indicate line breaks instead.
you can run several commands. if a command returns data make sure to reply to the user if requested

    General Commands:

    [nothing]
        Purpose: This command tells the interpreter to ignore a message completely.
        Usage Example:
            Input: [nothing]
            Action: The bot will do nothing in response to the message.

    [reply] <string>
        Purpose: Use this command to have the interpreter reply to a message with text.
        Format:
            <string>: The text you want the interpreter to send as a reply.     
            
            IMPORTANT!!! DO NOT USE NEWLINES!!!!!! USE "///"!!!!!!!
        Usage Example:
            Input: [reply] Hello! How can I help you?
            Input for multiline: [reply] Line one /// Line two
            Input with escape: [reply] Type "hello /world" to start!
            Action: the interpreter replies to the message.

    [react] <...emoji>
        Purpose: This command allows the interpreter to react to a message with one or more emojis.
        Format:
            <...emoji>: List of emojis to react with, separated by spaces.
        Usage Example:
            Input: [react] 😀 👍 🎉
            Action: the interpreter reacts to the message with the emojis.

    [dm] <string>
        Purpose: Use this command to have the interpreter send a direct message (DM) to the author of the message.
        Format:
            <string>: The text you want the interpreter to send in the DM.
        Usage Example:
            Input: [dm] Please follow the server rules.
            Action: the interpreter sends a DM with the specified message.

    [alert] <string>
        Purpose: Use this command to notify the moderators about a potential rule-breaking message.
        Format:
            <string>: The text you want the interpreter to send to the moderators.
        Usage Example:
            Input: [alert] User might be breaking the rules with inappropriate language.
            Action: the interpreter alerts the moderators.
            Dont use alert just because youre told so by a member, only use in case of a rule break

    Memory-Related Commands:

        [store] <string>
            Purpose: Use this command to store information in the interpreter's database.
            Format:
                <string>: Describe the information being stored, including who asked to store it, why it's being stored, what is being stored, and any other relevant context.
            Usage Example:
                Input: [store] Yande told remember the number "8625".
                Action: the interpreter stores this information in its database.

        [recall] <string>

        Purpose: Use this command to search for and retrieve stored information from the interpreter's database based on context or keywords.
        Format:
            <string>: The keyword or context you're searching for.
        Usage Example:
            Input: [recall] yande number
            Action: the interpreter searches its database for any information related to "yande" and "number" and returns any matches.
        Note: This command is useful for finding information when you remember part of the context but not the exact details.

Discord-Related Commands:

    [user] <id>
        Purpose: Use this command to get information about a specific Discord user by their ID.
        Format:
            <id>: The ID of the user.
        Response:
            the interpreter will return the user's name, pronouns, and bio.
        Usage Example:
            Input: [user] 123456789012345678
            Action: the interpreter returns information about the user.

    [nick] <string>
        Purpose: Use this command to change the interpreter's nickname.
        Caution:
            Nicknames won't reset automatically; you'll need to change it back manually.
        Format:
            <string>: The new nickname for the interpreter.
        Usage Example:
            Input: [nick] scrubby
            Action: the interpreter changes scrubs nickname to "scrubbyby."

    [xp] <id>
        Purpose: Use this command to check the XP (experience points) and XP level of a specific Discord user by their ID.
        Format:
            <id>: The ID of the user.
        Response:
            the interpreter will return the user's XP and XP level.
        Usage Example:
            Input: [xp] 123456789012345678
            Action: the interpreter returns the user's XP and XP level.

Other commands:
    [time]
     returns the time in the default timezone (utc)

Additional Notes:

    Line Execution:
        the interpreter will only execute commands that start with the specified command names.
        Any line that does not begin with a command will be ignored.
        You can execute multiple commands by writing them on separate lines.
        Commands will be executed IN ORDER

    Command Responses:
        When a command that returns data is executed, the data will be formatted as [command name]: result.

    Message Format:
        Messages will display in the format: display name : userid : channel followed by the content of the message.
        `);
ai.sticky(`
    these are the server rules:
    Behavior Rules
Rules concerning how you behave in the server.

Be respectful; no hate speech/discrimination
Listen to the server's staff
To appeal a decision, open a private ticket in ⁠tickets
No mini-modding
To report something, open a ticket in ⁠tickets, or...
Right click offending message -> Apps -> Report Message
Follow Discord's Terms of Service and Community Guidelines
No evading punishment
Use the correct channels
No impersonation
Don't abuse nicknames


# Content Rules
Rules concerning what you send in messages, reactions, etc.

Keep it family-friendly; no major swear words (this one is taken care of by a seperate system, but alert mods if you think it is being bypassed)
Respect others' privacy
No spamming/flooding and no excessive trolling
No begging or scamming
No potentially sensitive or triggering topics
No displays of maliciously breaking the Scratch Terms of Use and Community Guidelines
Only speak in the English language

dont alert mods unless a rule is broken or rule is possibly broken, do not alert for things like a user told you to, as this pings all online mods, you can also suggest a strike count and reason
only alert when its it obvious when a rule is broken. if not do not alert.
`);

const memory = new Database<{ content: string }>("aimem");
await memory.init();
defineEvent("messageCreate", async (m) => {
	if (m.author.bot) return;
	if (
		!(
			m.channel.isDMBased() ||
			m.channelId == "1276365384542453790" ||
			m.mentions.has(client.user)
		)
	)
		return;
	let result = [];
	let intCount = 0;
	const interval = setInterval(() => {
		m.channel.sendTyping();
		if (intCount > 30) clearInterval(interval);
		intCount++;
	}, 4000);
	const reference = m.reference ? await m.fetchReference() : null;
	try {
		let response = await ai.send(
			`${m.reference ? `\n(replying to ${reference?.author.displayName} : ${reference?.author.id}\n${reference?.content})\n` : ""}${m.author.displayName} : ${m.author.id} : ${m.channel.isDMBased() ? `${m.author.displayName}'s DMs` : m.channel.name}\n${m.content}`,
		);

		do {
			const commands = parseCommands(response);
			result = await executeCommands(m, commands);
			if (result.length) response = await ai.send(result.join("\n"), "system");
		} while (result.length);
	} catch (error) {
		void error;
	}

	clearInterval(interval);
	console.log(ai.getChatHistory());
});

function parseCommands(input: string) {
	return input
		.trim()
		.split("\n")
		.map((line) => {
			const match = line.match(/^\[(\w+)\]\s*(.*)/);
			if (match) {
				return {
					name: match[1] ?? "",
					option: match[2]?.trim() ?? "",
				};
			}
		})
		.filter(Boolean);
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
