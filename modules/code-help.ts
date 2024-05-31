import type { GuildForumTag, GuildMember, Role } from "discord.js";
import config from "../common/config.js";
import { defineEvent } from "strife.js";
const tagMap: { [tag: string]: string } = {
	"scratch": "scratch",
	"turbowarp/penguinmod": "turbowarp",
	"python": "py",
	"javascript": "js",
	"html/css": "web",
	"java/kotlin": "java",
	"c/c++": "c",
};
const roles = config.pingRoles.help as { [name: string]: Role };
// console.log(roles);//
defineEvent("messageCreate", async (message) => {
	if (
		message.channel.id !== message.id ||
		!message.channel.isThread() ||
		message.channel.parent?.id !== config.channels.help?.id
	)
		return;
	if (
		!message.channel.appliedTags
			.map(getTag)
			.find((t) => t?.name.toLowerCase() === "code help needed")
	)
		return;
	const msgrole = message.channel.appliedTags
		.map(getTag)
		.filter((r) => r != undefined)
		?.map((tag) => roles[tagMap[tag?.name.toLowerCase() ?? ""] ?? ""])
		.filter((role): role is Role => role !== undefined);
	let msg = [];
	for (const role of msgrole) {
		msg.push(
			`### ${role.name}:\n${pickMembers(Array.from(role?.members.values()), 10).map((u) => u.toString())}`,
		);
	}
	await message.channel.send(msg.join("\n"));
});

function getTag(id: string): GuildForumTag | undefined {
	return config.channels.help?.availableTags.find((tag) => tag.id === id);
}

function pickMembers(array: GuildMember[], x: number) {
	const shuffledArray = array
		.filter((u) => u.presence?.status !== "offline")
		.sort(() => Math.random() - 0.5);

	return shuffledArray.slice(0, x);
}
