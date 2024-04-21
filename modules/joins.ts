import { AuditLogEvent, ButtonStyle, ComponentType, channelLink } from "discord.js";
import Mustache from "mustache";
import { client, defineEvent } from "strife.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import { bans, joins, leaves } from "../common/strings.js";
import { nth } from "../util/numbers.js";

const directoryUrl =
	config.channels.servers ? `${config.channels.servers.url}/${config.channels.servers.id}` : "";

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;
	await member.send({
		embeds: [
			{
				color: constants.themeColor,
				title: "Welcome to the __Scratch Coders__ Discord server!",
				description: "Thank you for joining the Scratch Coders community!",
				fields: [
					{
						name: "**What is this server?**",
						value: "This is *the second largest [Scratch](<https://scratch.mit.edu>) server*!( after scratch addons ofc ) Check out some of our funniest and most memorable moments on the <#1183872537411731598> and introduce yourself in <#1218900380306378824>.",
					},
					{
						name: "**We are not the Scratch Team.**",
						value: "Please know that *nobody here is a Scratch developer or moderator*, we’re just some people who like to code, like you! If you wish to contact the ST, please use [Contact Us](<https://scratch.mit.edu/contact-us>). **No official Scratch server exists**, but please feel free to socialize with other Scratchers here.",
					},
				],
				footer: {
					icon_url: "https://scrub.fly.dev/icon.png",
					text: "~ the Scratch Coders team",
				},
			},
		],
	});
});

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;

	const countString = config.guild.memberCount.toString();
	const jokes =
		/^[1-9]0+$/.test(countString) ? ` (${"🥳".repeat(countString.length - 1)})`
		: countString.includes("69") ? " (nice)"
		: countString.endsWith("87") ?
			` (WAS THAT THE BITE OF ’87${"⁉".repeat(Math.ceil(countString.length / 2))})`
		:	"";
	const memberCount = nth(config.guild.memberCount) + jokes;

	const greeting = joins[Math.floor(Math.random() * joins.length)] ?? joins[0];
	await config.channels.welcome?.send(
		`${constants.emojis.welcome.join} ${Mustache.render(greeting, {
			MEMBER: member.toString(),
			COUNT: memberCount,
			RAW_COUNT: countString,
			RAW_JOKES: jokes,
		})}`,
	);
});
defineEvent("guildMemberRemove", async (member) => {
	if (member.guild.id !== config.guild.id) return;

	const auditLogs = await config.guild
		.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick })
		.catch(() => void 0);
	const kicked = auditLogs?.entries.first()?.target?.id === member.id;
	const banned = await config.guild.bans.fetch(member).catch(() => void 0);

	const byes = banned || kicked ? bans : leaves;
	const bye = byes[Math.floor(Math.random() * byes.length)] ?? byes[0];

	await config.channels.welcome?.send(
		`${constants.emojis.welcome[banned ? "ban" : "leave"]} ${Mustache.render(bye, {
			MEMBER: member.user.displayName,
		})}`,
	);
});

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;
	await config.channels.info?.setName(
		`Info - ${config.guild.memberCount.toLocaleString([], {
			compactDisplay: "short",
			maximumFractionDigits: 1,
			minimumFractionDigits: config.guild.memberCount > 1000 ? 1 : 0,
			notation: "compact",
		})} members`,
		`${member.user.tag} joined the server`,
	);
});

const INTRO_INTERVAL = 10;
let introCount = 0;
const introTemplate = {
	embeds: [
		{
			title: "Introduction Template",
			color: constants.themeColor,
			description: `\`\`\`md\n- Name/Nickname: \n- Pronouns: \n- Age: \n- Scratch profile: ${constants.domains.scratch}/users/\n- Country/Location: \n- Favorite addon: \n- Hobbies: \n- Extra: \n\`\`\``,
		},
	],
};
let templateMessage =
	(await config.channels.intros?.messages.fetch({ limit: 100 }))?.find(
		(message) =>
			message.author.id === client.user.id &&
			message.embeds[0]?.title === "Introduction Template",
	) ??
	(await config.channels.intros?.send({
		embeds: [
			{
				title: "Introduction Template",
				color: constants.themeColor,
				description:
					"```md\n- Name/Nickname: \n- Pronouns: \n- Age: \n- Scratch profile: https://scratch.mit.edu/users/\n- Country/Location: \n- Hobbies: \n- Extra: \n```",
			},
		],
	}));
defineEvent("messageCreate", async (message) => {
	if (message.channel.id !== config.channels.intros?.id) return;

	introCount++;
	if (introCount % INTRO_INTERVAL) return;

	const newMessage = await templateMessage?.reply(introTemplate);
	await templateMessage?.delete();
	templateMessage = newMessage;
});
