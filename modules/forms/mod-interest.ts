import {
	ButtonStyle,
	ComponentType,
	Embed,
	GuildMember,
	MessageMentions,
	TextInputStyle,
	time,
	userMention,
	type ActionRowData,
	type ButtonInteraction,
	type InteractionButtonComponentData,
	type MessageActionRowComponent,
	type MessageEditOptions,
	type ModalSubmitInteraction,
} from "discord.js";
import { client } from "strife.js";
import config, { getInitialChannelThreads } from "../../common/config.js";
import constants from "../../common/constants.js";
import { getAllMessages } from "../../util/discord.js";
import { EXPIRY_LENGTH } from "../punishments/misc.js";
import { strikeDatabase } from "../punishments/util.js";
import giveXp from "../xp/give-xp.js";
import { getLevelForXp } from "../xp/misc.js";
import { getWeeklyXp, xpDatabase } from "../xp/util.js";
import { joinWithAnd } from "../../util/text.js";
import { convertBase } from "../../util/numbers.js";
import { parseIds } from "./appeals/generate-appeal.js";
// import { LoggingEmojis } from "../logging/misc.js";
import { escapeMessage } from "../../util/markdown.js";

export const NEEDED_ACCEPT = 5,
	NEEDED_REJECT = 4;

const thread =
	getInitialChannelThreads(config.channels.admin).find(
		(thread) => thread.name === "Moderator Interest Forms",
	) ??
	(await config.channels.admin.threads.create({
		name: "Moderator Interest Forms",
		reason: "For moderator interest forms",
	}));

const applications = Object.fromEntries(
	(await getAllMessages(thread))
		.filter((message) => message.author.id === client.user.id && message.embeds.length)
		.map(
			(message) =>
				[
					message.embeds[0]?.description ?? "",
					{
						timezone: message.embeds[0]?.fields.find(
							(field) => field.name == "Timezone",
						)?.value,
						activity: message.embeds[0]?.fields.find(
							(field) => field.name == "Activity",
						)?.value,
						age: message.embeds[0]?.fields.find((field) => field.name == "Age")?.value,
						experience: message.embeds[0]?.fields.find(
							(field) => field.name == "Previous Experience",
						)?.value,
						misc: message.embeds[0]?.fields.find((field) => field.name == "Misc")
							?.value,
						message,
					},
				] as const,
		),
);

export default async function confirmInterest(interaction: ButtonInteraction): Promise<void> {
	await interaction.reply({
		ephemeral: true,
		content:
			"## Moderator Application\n If admins think you are a good candidate for moderator, they will DM you further questions before promoting you.\nFinally, please note that 2-factor authentication (2FA) is required for moderators in this server. If you are unable to enable 2FA, please try using an online service such as <https://totp.app/>.\nThanks for being a part of the server and filling out the form!",

		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "_modInterestForm",
						label: "Fill out the form",
						style: ButtonStyle.Primary,
						type: ComponentType.Button,
					},
				],
			},
		],
	});
}

export async function fillInterest(interaction: ButtonInteraction): Promise<void> {
	const member = await config.guild.members.fetch(interaction.user);
	if (!member.joinedTimestamp)
		return void interaction.reply({ ephemeral: true, content: "aRRRRR MATEY" });
	const xp = xpDatabase.data.find((e) => e.user == interaction.user.id)?.xp || 0;
	const xpRequirement = xp > 5000;
	const joinRequirement =
		Math.min(1, (Date.now() - 1209600 * 1000) / member.joinedTimestamp).toLocaleString([], {
			maximumFractionDigits: 1,
			style: "percent",
		}) == "100%";

	if (!(xpRequirement && joinRequirement)) {
		return void (await interaction.reply({
			ephemeral: true,
			content:
				"You do not meet the requirements to apply.\nhere are the requirements:\n```The person must have been in the server for atleast 2 weeks\nThe person must have atleast 5k xp```",
			files: await makeCanvasFiles(
				Math.min(1, xp / 5000),
				Math.min(1, (Date.now() - 1209600 * 1000) / member.joinedTimestamp),
			),
		}));
	}

	const mention = interaction.user.toString();
	await interaction.showModal({
		customId: "_modInterestForm",
		title: "Moderator Interest Form",
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "timezone",
						label: "What is your timezone?",
						style: TextInputStyle.Short,
						type: ComponentType.TextInput,
						maxLength: 100,
						value: applications[mention]?.timezone,
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "activity",
						label: "How active would you say you are?",
						style: TextInputStyle.Short,
						type: ComponentType.TextInput,
						maxLength: 1000,
						value: applications[mention]?.activity,
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "age",
						label: "How old are you?",
						style: TextInputStyle.Short,
						type: ComponentType.TextInput,
						maxLength: 10,
						value: applications[mention]?.age,
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "experience",
						label: "What past moderation experience do you have?",
						style: TextInputStyle.Short,
						type: ComponentType.TextInput,
						maxLength: 1000,
						value: applications[mention]?.experience,
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "misc",
						label: "Additional comments",
						style: TextInputStyle.Paragraph,
						type: ComponentType.TextInput,
						required: false,
						maxLength: 1000,
						value: applications[mention]?.misc,
					},
				],
			},
		],
	});
}
async function makeCanvasFiles(
	progressXp: number,
	progressJoin: number,
): Promise<{ attachment: Buffer; name: string }[]> {
	if (process.env.CANVAS === "false") return [];

	const { createCanvas } = await import("@napi-rs/canvas");
	const canvas = createCanvas(1000, 100);
	const context = canvas.getContext("2d");
	context.font = `${(canvas.height / 2) * 0.9}px ${constants.fonts}`;
	context.fillStyle = "#0003";
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = `#${constants.themeColor.toString(16)}`;
	let rectangleSize = canvas.width * progressXp;
	let paddingPixels = (0.18 * canvas.height) / 2;
	context.fillRect(0, 0, rectangleSize, canvas.height / 2);

	if (progressXp < 0.145) {
		context.fillStyle = "#666";
		context.textAlign = "end";
		context.fillText(
			"XP: " + progressXp.toLocaleString([], { maximumFractionDigits: 1, style: "percent" }),
			canvas.width - paddingPixels,
			canvas.height / 2 - paddingPixels,
		);
	} else {
		context.fillStyle = "#0009";
		context.fillText(
			"XP: " + progressXp.toLocaleString([], { maximumFractionDigits: 1, style: "percent" }),
			paddingPixels,
			canvas.height / 2 - paddingPixels,
		);
	}
	context.fillStyle = `#${(0x008f75).toString(16)}`;
	rectangleSize = canvas.width * progressJoin;

	context.fillRect(0, canvas.height / 2, rectangleSize, canvas.height);

	if (progressJoin < 0.345) {
		context.fillStyle = "#666";
		context.textAlign = "end";
		context.fillText(
			"Date: " +
				progressJoin.toLocaleString([], { maximumFractionDigits: 1, style: "percent" }),
			canvas.width - paddingPixels,
			canvas.height - paddingPixels,
		);
	} else {
		context.fillStyle = "#0009";
		context.fillText(
			"Date: " +
				progressJoin.toLocaleString([], { maximumFractionDigits: 1, style: "percent" }),
			paddingPixels,
			canvas.height - paddingPixels,
		);
	}
	return [{ attachment: canvas.toBuffer("image/png"), name: "progress.png" }];
}
export async function submitInterest(interaction: ModalSubmitInteraction): Promise<void> {
	if (!(interaction.member instanceof GuildMember))
		throw new TypeError("interaction.member is not a GuildMember");

	const allXp = xpDatabase.data.toSorted((one, two) => two.xp - one.xp);
	const xp = allXp.find((entry) => entry.user === interaction.user.id)?.xp ?? 0;
	const level = getLevelForXp(xp);
	const rank = allXp.findIndex((info) => info.user === interaction.user.id) + 1;

	const strikes = strikeDatabase.data.filter((strike) => strike.user === interaction.user.id);
	const totalStrikeCount = strikes
		.reduce((accumulator, { count, removed }) => count * Number(!removed) + accumulator, 0)
		.toLocaleString();
	const recentStrikeCount = strikes
		.filter((strike) => strike.date + EXPIRY_LENGTH > Date.now())
		.reduce((accumulator, { count, removed }) => count * Number(!removed) + accumulator, 0)
		.toLocaleString();
	const semiRecentStrikeCount = strikes
		.filter((strike) => strike.date + EXPIRY_LENGTH * 2 > Date.now())
		.reduce((accumulator, { count, removed }) => count * Number(!removed) + accumulator, 0)
		.toLocaleString();

	const mention = interaction.user.toString();
	const fields = {
		timezone: interaction.fields.getTextInputValue("timezone"),
		activity: interaction.fields.getTextInputValue("activity"),
		age: interaction.fields.getTextInputValue("age"),
		experience: interaction.fields.getTextInputValue("experience"),
		misc: interaction.fields.fields.get("misc")?.value,
	};
	const data = {
		embeds: [
			{
				title: "Moderator Interest Form",
				color: interaction.member.displayColor,
				author: {
					name: interaction.user.tag,
					icon_url: interaction.user.displayAvatarURL(),
				},
				description: mention,
				fields: [
					{
						name: "Roles",
						value:
							[
								...interaction.member.roles
									.valueOf()
									.sorted((one, two) => two.comparePositionTo(one))
									.filter(({ id }) => id !== config.guild.id)
									.values(),
							].join(" ") || "*No roles*",
						inline: false,
					},
					{
						name: "Created Account",
						value: time(interaction.user.createdAt),
						inline: true,
					},
					{
						name: "Joined Server",
						value: time(interaction.member.joinedAt ?? new Date()),
						inline: true,
					},
					{
						name: "Strikes",
						value: `${totalStrikeCount} (${recentStrikeCount} in the past 3 weeks; ${semiRecentStrikeCount} in the past 6 weeks)`,
						inline: true,
					},
					{
						name: "XP",
						value: `${rank}) Level ${level} - ${Math.floor(xp).toLocaleString()} XP`,
						inline: true,
					},
					{
						name: "Weekly XP",
						value: `${getWeeklyXp(interaction.user.id).toLocaleString()} XP`,
						inline: true,
					},
					{ name: constants.zws, value: constants.zws, inline: false },
					{ name: "Timezone", value: fields.timezone, inline: true },
					{ name: "Activity", value: fields.activity, inline: true },
					{ name: "Age", value: fields.age, inline: true },
					{ name: "Previous Experience", value: fields.experience, inline: true },
					...(fields.misc ? [{ name: "Misc", value: fields.misc, inline: true }] : []),
				],
			},
		],

		components: [
			getAppComponents(),
			{
				type: ComponentType.ActionRow,
				components: [
					{
						style: ButtonStyle.Secondary,
						type: ComponentType.Button,
						customId: `${interaction.user.id}_userInfo`,
						label: "User Info",
					} as const,
					{
						style: ButtonStyle.Secondary,
						type: ComponentType.Button,
						customId: `${interaction.user.id}_xp`,
						label: "XP",
					} as const,
					...(totalStrikeCount === "0" ?
						[]
					:	([
							{
								style: ButtonStyle.Secondary,
								type: ComponentType.Button,
								customId: `${interaction.user.id}_viewStrikes`,
								label: "Strikes",
							},
						] as const)),
					...((
						config.channels.tickets
							?.permissionsFor(interaction.member)
							?.has("ViewChannel")
					) ?
						([
							{
								style: ButtonStyle.Secondary,
								type: ComponentType.Button,
								customId: `${interaction.user.id}_contactUser`,
								label: "Contact User",
							},
						] as const)
					:	[]),
				],
			},
		],
	};
	const message = await (applications[mention]?.message.edit(data) ?? thread.send(data));
	await applications[mention]?.message.reply(`${mention} updated their application.`);
	applications[mention] = { ...fields, message: applications[mention]?.message ?? message };
	await giveXp(interaction.user, message.url);

	await interaction.reply({
		ephemeral: true,
		content: `${constants.emojis.statuses.yes} Thanks for filling it out!`,
	});
}

export function generateApp(
	data: { components?: ActionRowData<MessageActionRowComponent>; appeal?: Embed },
	notes: { accepted?: string; rejected?: string },
	users: { accepters: Set<string>; rejecters: Set<string> },
): MessageEditOptions {
	return {
		components: [
			getAppComponents(users),
			data.components ?? { type: ComponentType.ActionRow, components: [] },
		],
		embeds: [
			data.appeal ?? {},
			{
				title:
					users.accepters.size === NEEDED_ACCEPT ? "Accepted"
					: users.rejecters.size === NEEDED_REJECT ? "Rejected"
					: "Pending",
				fields: [
					{
						name: "Accepters",
						value: joinWithAnd([...users.accepters], userMention) || "Nobody",
						inline: true,
					},
					{
						name: "Rejecters",
						value: joinWithAnd([...users.rejecters], userMention) || "Nobody",
						inline: true,
					},
					{ name: constants.zws, value: constants.zws, inline: true },
					{ name: "Accepted Note", value: notes.accepted ?? "N/A", inline: true },
					{ name: "Rejected Note", value: notes.rejected ?? "N/A", inline: true },
				],
			},
		],
	};
}

export function getAppComponents({
	accepters = new Set<string>(),
	rejecters = new Set<string>(),
} = {}): {
	type: ComponentType.ActionRow;
	components: [InteractionButtonComponentData, InteractionButtonComponentData];
} {
	const counts = `${Array.from(accepters, (id) => convertBase(id, 10, convertBase.MAX_BASE)).join(
		"+",
	)}|${Array.from(rejecters, (id) => convertBase(id, 10, convertBase.MAX_BASE)).join("+")}`;
	return {
		components: [
			{
				style: ButtonStyle.Success,
				type: ComponentType.Button,
				customId: `${counts}_acceptApp`,
				label: `Accept (${accepters.size}/${NEEDED_ACCEPT})`,
				disabled: rejecters.size >= NEEDED_REJECT || accepters.size >= NEEDED_ACCEPT,
			} as const,
			{
				style: ButtonStyle.Danger,
				type: ComponentType.Button,
				customId: `${counts}_rejectApp`,
				label: `Reject (${rejecters.size}/${NEEDED_REJECT})`,
				disabled: rejecters.size >= NEEDED_REJECT || accepters.size >= NEEDED_ACCEPT,
			} as const,
		],
		type: ComponentType.ActionRow,
	};
}

export async function confirmAcceptApp(
	interaction: ButtonInteraction,
	counts: string,
): Promise<void> {
	const value = interaction.message.embeds[1]?.fields.find(
		(field) => field.name == "Accepted Note",
	)?.value;
	await interaction.showModal({
		components: [
			{
				components: [
					{
						customId: "note",
						label: "Why should they be mod?",
						style: TextInputStyle.Paragraph,
						type: ComponentType.TextInput,
						value: value === "N/A" ? undefined : value,
						minLength: 10,
						maxLength: 1024,
					},
				],

				type: ComponentType.ActionRow,
			},
		],

		customId: `${counts}_acceptApp`,
		title: "Accept Mod App (user may see the reason)",
	});
}
export async function confirmRejectApp(
	interaction: ButtonInteraction,
	counts: string,
): Promise<void> {
	const value = interaction.message.embeds[1]?.fields.find(
		(field) => field.name == "Rejected Note",
	)?.value;
	await interaction.showModal({
		components: [
			{
				components: [
					{
						customId: "note",
						label: "Why shouldn’t they be mod?",
						style: TextInputStyle.Paragraph,
						type: ComponentType.TextInput,
						value: value === "N/A" ? undefined : value,
						minLength: 10,
						maxLength: 1024,
					},
				],

				type: ComponentType.ActionRow,
			},
		],

		customId: `${counts}_rejectApp`,
		title: "Reject Mod App (user may see the reason)",
	});
}
export async function submitAcceptApp(
	interaction: ModalSubmitInteraction,
	ids: string,
): Promise<void> {
	const users = parseIds(ids);
	await interaction.reply({
		content: `${
			constants.emojis.statuses.yes
		} ${interaction.user.toString()} accepted the Mod Application.`,
		ephemeral: users.accepters.has(interaction.user.id),
	});
	users.accepters.add(interaction.user.id);
	users.rejecters.delete(interaction.user.id);

	const note = escapeMessage(interaction.fields.getTextInputValue("note"));
	await interaction.message?.edit(
		generateApp(
			{
				components: interaction.message.components[1],
				appeal: interaction.message.embeds[0],
			},
			{
				accepted: note,
				rejected: interaction.message.embeds[1]?.fields.find(
					(field) => field.name == "Rejected Note",
				)?.value,
			},
			users,
		),
	);

	if (users.accepters.size >= NEEDED_ACCEPT) {
		const mention = interaction.message?.embeds[0]?.description ?? "";
		const user = await config.guild.members.fetch(
			MessageMentions.UsersPattern.exec(mention)?.[1] ?? "",
		);
		const roleGiven =
			(await user.roles
				.add(config.roles.trialMod)
				.then(() => true)
				.catch(() => false)) &&
			(await user.roles
				.add(config.roles.staff)
				.then(() => true)
				.catch(() => false));
		// appeals[mention] = { unbanned: true, note, date: new Date().toISOString() };
		await interaction.message?.reply(
			`${constants.emojis.statuses[roleGiven ? "yes" : "no"]}  ${
				roleGiven ?
					`${mention} has joined the mod team!`
				:	"failed to give the role or they already have mod"
			}`,
		);
		const embed = interaction.message?.embeds ?? [];
		await user.send({	
			embeds: [
				{
					title: "Mod Application Status",
					description: `**Urgent News From Our Staff Team:**\n\nHi ${user.displayName},\n\nWe have news regarding your recent **mod application** in Scratch Coders. After reviewing your application, the admin teams have come to a decision.\n\n**Status:**\n\n||Your trial mod application has been **accepted**! Congratulations! Our staff members will reach out and acquaint you with the staff rules and procedures soon! We look forward to working with you! \n accepted reason:\n${embed[1]?.fields.find((field) => field.name == "Accepted Note")?.value} ||`,
					color: 0xffffff,
					fields: [],
				},
				embed[0] ? embed[0] : {},
			],
		});
	}
}
export async function submitRejectApp(
	interaction: ModalSubmitInteraction,
	ids: string,
): Promise<void> {
	const users = parseIds(ids);
	await interaction.reply({
		content: `${
			constants.emojis.statuses.no
		} ${interaction.user.toString()} rejected the Mod Application.`,
		ephemeral: users.rejecters.has(interaction.user.id),
	});
	users.rejecters.add(interaction.user.id);
	users.accepters.delete(interaction.user.id);

	const note = escapeMessage(interaction.fields.getTextInputValue("note"));
	await interaction.message?.edit(
		generateApp(
			{
				components: interaction.message.components[1],
				appeal: interaction.message.embeds[0],
			},
			{
				accepted: interaction.message.embeds[1]?.fields.find(
					(field) => field.name == "Accepted Note",
				)?.value,
				rejected: note,
			},
			users,
		),
	);

	if (users.rejecters.size >= NEEDED_REJECT) {
		const mention = interaction.message?.embeds[0]?.description ?? "";
		const user = await config.guild.members.fetch(
			MessageMentions.UsersPattern.exec(mention)?.[1] ?? "",
		);
		// applications[mention] = { unbanned: false, note, date: new Date().toISOString() };d
		await interaction.message?.reply(
			`${constants.emojis.statuses.yes} ${mention} will not get mod.`,
		);
		const embed = interaction.message?.embeds ?? [];
		await user.send({
			content: `Your moderator application has been rejected for the reason:\n${embed[1]?.fields.find((field) => field.name == "Rejected Note")?.value} `,
			embeds: [embed[0] ? embed[0] : {}],
		});
	}
}
