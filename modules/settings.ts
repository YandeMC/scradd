import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ComponentType,
	User,
	hyperlink,
	userMention,
	type Guild,
	type InteractionReplyOptions,
	type RepliableInteraction,
	type Snowflake,
	type UserMention,
} from "discord.js";
import { client, defineButton, defineChatCommand, type BasicOption } from "strife.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import Database from "../common/database.js";
import { disableComponents } from "../util/discord.js";
import { censor } from "./automod/misc.js";
import { getWeeklyXp } from "./xp/util.js";
import type { CamelToKebab } from "../common/misc.js";

/**
 * ## How to add a setting
 *
 * 1. Add it to the {@link SETTINGS} object. The key is the name in camelCase and the value is in Title Case.
 * 2. Add a default value for the setting in the {@link getDefaultSettings} function. This is enforced by the types.
 * 3. Add the option to the `/settings` commands as desired. Name the option the same, but kebab-cased. The types enforce
 *    correct casing.
 * 4. Add buttons in {@link updateSettings} as desired to toggle this setting.
 */
const SETTINGS = {
	autoreactions: "Autoreactions",
	boardPings: "Board Pings",
	dmReminders: "DM Reminders",
	github: "GitHub Reference Links",
	levelUpPings: "Level Up Pings",
	scratchEmbeds: "Scratch Link Embeds",
	useMentions: "Use Mentions",
} as const;
export async function getDefaultSettings(user: {
	id: Snowflake;
	/** Whether to ping the user when their message gets on the board. */
	boardPings?: boolean;
	/** Whether to ping the user when they level up. */
	levelUpPings?: boolean;
	/** Whether to automatically react to their messages with random emojis. */
	autoreactions?: boolean;
	useMentions?: boolean;
	dmReminders?: boolean;
	scratchEmbeds?: boolean;
	scraddChat?: boolean;
	leaderPassPings?: boolean;
}>("user_settings");
await userSettingsDatabase.init();

async function settingsCommand(
	interaction: RepliableInteraction,
	options: {
		"board-pings"?: boolean;
		"level-up-pings"?: boolean;
		"autoreactions"?: boolean;
		"use-mentions"?: boolean;
		"dm-reminders"?: boolean;
		"scratch-embeds"?: boolean;
		"leader-pass-pings"?: boolean;
	},
): Promise<void> {
	await interaction.reply(
		await updateSettings(interaction.user, {
			autoreactions: options.autoreactions,
			boardPings: options["board-pings"],
			levelUpPings: options["level-up-pings"],
			useMentions: options["use-mentions"],
			dmReminders: options["dm-reminders"],
			scratchEmbeds: options["scratch-embeds"],
			leaderPassPings: options["leader-pass-pings"]
		}),
	);
}

defineChatCommand(
	{
		name: "settings",
		description: "Customize your personal settings",

		options: {
			"autoreactions": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Add automatic funny emoji reactions to your messages",
			},
			"board-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: `Ping you when your messages get on ${
					config.channels.board ? "#" + config.channels.board.name : "the board"
				}`,
			},
			"dm-reminders": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Send reminders in your DMs by default",
			},
			"level-up-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Ping you when you level up",
			},
			"scratch-embeds": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Show information about Scratch links you send",
			},
			"leader-pass-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Ping you when you pass someone on the leaderboard",
			},
		},
	},
	settingsCommand,
);
defineChatCommand(
	{
		name: "settings",
		description: "Customize personal settings",
		access: config.otherGuildIds,

		options: {
			"board-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: `Pings you when your messages get on ${
					config.channels.board ? "#" + config.channels.board.name : "the board"
				} in the community server`,
			},
			"dm-reminders": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Send reminders in your DMs by default",
			},
			"github": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Link GitHub issues, PRs, and discussions when you send references",
			},
			"scratch-embeds": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Show information about Scratch links you send",
			},
			"leader-pass-pings": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Ping you when you pass someone on the leaderboard",
			},
		},
	},
	settingsCommand,
);

async function settingsCommand(
	interaction: RepliableInteraction,
	options: Partial<{ [key in CamelToKebab<keyof typeof SETTINGS>]?: boolean }>,
): Promise<void> {
	const newOptions = Object.fromEntries(
		Object.entries(options).map(([option, value]) => [
			option.replaceAll(/-./g, (match) => match[1]?.toUpperCase() ?? ""),
			value,
		]),
	);
	await interaction.reply(await updateSettings(interaction.user, newOptions));
}
export async function updateSettings(
	user: User,
	settings: { [key in keyof typeof SETTINGS]?: boolean | "toggle" },
): Promise<InteractionReplyOptions> {
	const old = await getSettings(user);
	const updated = {
		id: user.id,
		...Object.fromEntries(
			Object.keys(SETTINGS).map((setting) => {
				const value = settings[setting];
				return [setting, value === "toggle" ? !old[setting] : value ?? old[setting]];
			}),
		),
	};

	userSettingsDatabase.updateById(updated, old);

	const buttons = Object.fromEntries(
		Object.entries(SETTINGS).map(([setting, label]) => [
			setting,
			{
				customId: `${setting}-${user.id}_toggleSetting`,
				label: label,
				style: ButtonStyle[updated[setting] ? "Success" : "Danger"],
				type: ComponentType.Button,
			} as const,
		]),
	);

	return {
		components: [
			{
				components: [
					buttons.dmReminders,
					...(await config.guild.members.fetch(user.id).then(
						() => [buttons.boardPings, buttons.levelUpPings],
						() => [],
					)),
				],
				type: ComponentType.ActionRow,
			},
			{
				components: [
					buttons.useMentions,
					buttons.autoreactions,
					buttons.scratchEmbeds,
					...((await config.guilds.development.members?.fetch(user.id).then(
						() => [buttons.github],
						() => [],
					)) ?? [buttons.github]),
				],
				type: ComponentType.ActionRow,
			},
		],

		content: `${constants.emojis.statuses.yes} Updated your settings!`,
		ephemeral: true,
	};
}

defineButton("toggleSetting", async (interaction, data) => {
	const [setting, id] = data.split("-");
	if (interaction.user.id !== id) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to update other people’s settings!`,
		});
	}
	await interaction.reply(await updateSettings(interaction.user, { [setting]: "toggle" }));

	if (!interaction.message.flags.has("Ephemeral"))
		await interaction.message.edit({
			components: disableComponents(interaction.message.components),
		});
});

export async function updateSettings(
	user: User,
	settings: {
		autoreactions?: boolean | "toggle";
		boardPings?: boolean | "toggle";
		levelUpPings?: boolean | "toggle";
		useMentions?: boolean | "toggle";
		dmReminders?: boolean | "toggle";
		scratchEmbeds?: boolean | "toggle";
		leaderPassPings?: boolean | "toggle";
	},
): Promise<InteractionReplyOptions> {
	const old = await getSettings(user);
	const updated = {
		id: user.id,
		leaderPassPings:
			settings.leaderPassPings === "toggle"
				? !old.leaderPassPings
				: settings.leaderPassPings ?? old.leaderPassPings,
		boardPings:
			settings.boardPings === "toggle"
				? !old.boardPings
				: settings.boardPings ?? old.boardPings,
		levelUpPings:
			settings.levelUpPings === "toggle"
				? !old.levelUpPings
				: settings.levelUpPings ?? old.levelUpPings,
		autoreactions:
			settings.autoreactions === "toggle"
				? !old.autoreactions
				: settings.autoreactions ?? old.autoreactions,
		useMentions:
			settings.useMentions === "toggle"
				? !old.useMentions
				: settings.useMentions ?? old.useMentions,
		dmReminders:
			settings.dmReminders === "toggle"
				? !old.dmReminders
				: settings.dmReminders ?? old.dmReminders,
		scratchEmbeds:
			settings.scratchEmbeds === "toggle"
				? !old.scratchEmbeds
				: settings.scratchEmbeds ?? old.scratchEmbeds,
				
	};

	userSettingsDatabase.updateById(updated, old);

	return {
		ephemeral: true,
		content: `${constants.emojis.statuses.yes} Updated your settings!`,

		components: [
			...(await config.guild.members.fetch(user.id).then(
				() => [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								customId: "levelUpPings_toggleSetting",
								type: ComponentType.Button,
								label: "Level Up Pings",
								style: ButtonStyle[updated.levelUpPings ? "Success" : "Danger"],
							} as const,
							{
								customId: "boardPings_toggleSetting",
								type: ComponentType.Button,
								label: "Board Pings",
								style: ButtonStyle[updated.boardPings ? "Success" : "Danger"],
							} as const,
						],
					},
				],
				() => [],
			)),
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "scratchEmbeds_toggleSetting",
						type: ComponentType.Button,
						label: "Scratch Link Embeds",
						style: ButtonStyle[updated.scratchEmbeds ? "Success" : "Danger"],
					},
					{
						customId: "dmReminders_toggleSetting",
						type: ComponentType.Button,
						label: "DM Reminders",
						style: ButtonStyle[updated.dmReminders ? "Success" : "Danger"],
					},
					{
						customId: "autoreactions_toggleSetting",
						type: ComponentType.Button,
						label: "Autoreactions",
						style: ButtonStyle[updated.autoreactions ? "Success" : "Danger"],
					},
					{
						customId: "useMentions_toggleSetting",
						type: ComponentType.Button,
						label: "Use Mentions",
						style: ButtonStyle[updated.useMentions ? "Success" : "Danger"],
					},
				],
			},
		],
	};
}

export async function getSettings(
	user: { id: Snowflake },
	defaults?: true,
): Promise<Required<(typeof userSettingsDatabase.data)[number]>>;
export async function getSettings(
	user: { id: Snowflake },
	defaults: false,
): Promise<(typeof userSettingsDatabase.data)[number]>;
export async function getSettings(
	user: { id: Snowflake },
	defaults = true,
): Promise<(typeof userSettingsDatabase.data)[number]> {
	return {
		autoreactions: true,
		dmReminders: true,
		boardPings: process.env.NODE_ENV === "production",
		levelUpPings: process.env.NODE_ENV === "production",
		useMentions:
			getWeeklyXp(user.id) > 100 ||
			!(await config.guild.members.fetch(user.id).catch(() => void 0)),
		scratchEmbeds: true,
		scraddChat: false,
		leaderPassPings: true,
	};
}

export async function mentionUser(
	user: Snowflake | User,
	interactor?: { id: Snowflake },
	guild?: Guild,
): Promise<UserMention | `[${string}](${string})`> {
	const useMentions = interactor && (await getSettings(interactor)).useMentions;
	const id = user instanceof User ? user.id : user;
	if (useMentions) return userMention(id);

	const presence = interactor && guild?.presences.resolve(interactor.id);
	const url = `<${
		presence && !presence.clientStatus?.mobile && !presence.clientStatus?.web ?
			"discord://-"
		:	"https://discord.com"
	}/users/${id}>`;

	const { displayName } =
		user instanceof User ? user : (await client.users.fetch(user).catch(() => void 0)) ?? {};
	return displayName ? hyperlink(censor(displayName), url) : userMention(id);
}
