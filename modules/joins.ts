import { AuditLogEvent } from "discord.js";
import Mustache from "mustache";
import { client, defineEvent } from "strife.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import { bans, joins, leaves } from "../common/strings.js";
import { nth } from "../util/numbers.js";


defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;
	await member
		.send({
			"content": "",
			"tts": false,
			"embeds": [
			  {
				
				"description": "Thank you for becoming a part of the Scratch Coders community!",
				"author": {
				  "name": "Scratch Coders",
				  "icon_url": "https://message.style/cdn/images/e2d5d6e419969cacaf87ed1acdd0fc7670957bfb52b6b1607a18f8594c2efe7d.png"
				},
				"fields": [
				  {
					
					"name": "❔ **What is this server?**",
					"value": "You've joined a vibrant community of passionate coders who use Scratch (or similar)! Introduce yourself in <#1218900380306378824> and find like-minded people to get feedback from or to work together with!"
				  },
				  {
					
					"name": "💬 **Why can't I talk yet?**",
					"value": "We have a verification system to slow down raiders from raiding the server. You can learn how to get verified in #how-to-verify!"
				  },
				  {
					
					"name": "‼️ **We are not the Scratch Team.**",
					"value": "Please know that **nobody here is a Scratch developer or moderator**, we’re all just people who like to code! If you wish to contact the Scratch Team, please use the official [Contact Us](<${constants.domains.scratch}/contact-us>) page.\n**No official Scratch server exists**, but please feel free to socialize with other Scratchers here."
				  }
				],
				"title": "Welcome to the __Scratch Coders__ Discord server!",
				"image": {
				  "url": "https://message.style/cdn/images/eb61c1407753278a3285ac4b40b57af2934e7f20d9bc4895d04217c089866298.png"
				}
			  }
			],
			"components": [
			  {
				
				"type": 1,
				"components": [
				  {
					
					"type": 2,
					"style": 5,
					"label": "Server Rules",
					
					"url": "https://discord.com/channels/1141222489582735360/1141227773529182219"
				  }
				]
			  }
			],
			
			
			  })
		.catch(() => void 0);
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
	) ?? (await config.channels.intros?.send(introTemplate));
defineEvent("messageCreate", async (message) => {
	if (message.channel.id !== config.channels.intros?.id) return;

	introCount++;
	if (introCount % INTRO_INTERVAL) return;

	const newMessage = await templateMessage?.reply(introTemplate);
	await templateMessage?.delete();
	templateMessage = newMessage;
});
