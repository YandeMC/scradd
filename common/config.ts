import {
	ChannelType,
	type NonThreadGuildBasedChannel,
	type Channel,
	type ThreadManager,
	Collection,
	type AnyThreadChannel,
} from "discord.js";
import { client } from "strife.js";
import { CUSTOM_ROLE_PREFIX } from "../modules/roles/misc.js";

const IS_TESTING = process.argv.some((file) => file.endsWith(".test.js"));

const guild = IS_TESTING ? undefined : await client.guilds.fetch(process.env.GUILD_ID);
if (guild && !guild.available) throw new ReferenceError("Main guild is unavailable!");

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function getConfig() {
	const channels = (await guild?.channels.fetch()) ?? new Collection();
	const roles = ((await guild?.roles.fetch()) ?? new Collection()).filter(
		(role) => role.editable && !role.name.startsWith(CUSTOM_ROLE_PREFIX),
	);

	const otherGuilds = guild && (await client.guilds.fetch());
	if (otherGuilds) otherGuilds.delete(guild.id);

	const mod = roles.find((role) => role.name.toLowerCase().startsWith("mod"));
	return {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		guild: guild!,
		otherGuildIds: guilds ? [...guilds.keys()] : [],
		testingGuild: IS_TESTING
			? undefined
			: await client.guilds.fetch("1021061241260740713").catch(() => void 0),

		channels: {
			info: getChannel("Info", ChannelType.GuildCategory, "start"),
			announcements: getChannel("week", ChannelType.GuildText, "partial"),
			board: getChannel(
				"board",
				[ChannelType.GuildText, ChannelType.GuildAnnouncement],
				"end",
			),
			tickets: getChannel("tickets", ChannelType.GuildText, "partial"),
			welcome: getChannel("welcome", ChannelType.GuildText, "partial"),

			mod:
				getChannel("staff", ChannelType.GuildText, "partial") ||
				getChannel("mod", ChannelType.GuildText, "partial"),
			modlogs: getChannel("logs", ChannelType.GuildText, "partial"),
			exec: getChannel("exec", ChannelType.GuildText, "partial"),
			admin: getChannel("admin", ChannelType.GuildText, "partial"),

			general: getChannel("general", ChannelType.GuildText, "partial"),

			support: "826250884279173162",
			updates: getChannel("updates", ChannelType.GuildText, "partial"),
			suggestions: getChannel("suggestions", ChannelType.GuildForum, "partial"),
			bugs: getChannel("bug", ChannelType.GuildForum, "partial"),
			devs: getChannel("devs", ChannelType.GuildText, "partial"),

			advertise:
				getChannel("advertise", ChannelType.GuildText, "partial") ??
				getChannel("promo", ChannelType.GuildText, "partial"),
			bots: getChannel("bots", ChannelType.GuildText, "partial"),

			old_suggestions: getChannel("suggestions", ChannelType.GuildText, "partial"),
			verify: getChannel("verif", ChannelType.GuildText, "partial"),
			trivia: getChannel("trivia", ChannelType.GuildText, "partial"),
		},

		roles: {
			mod,
			exec: roles.find((role) => role.name.toLowerCase().includes("exec")),
			staff: roles.find((role) => role.name.toLowerCase().startsWith("staff")) ?? mod,
			weeklyWinner: roles.find((role) => role.name.toLowerCase().includes("weekly")),
			dev: roles.find((role) => role.name.toLowerCase().startsWith("contributor")),
			epic: roles.find((role) => role.name.toLowerCase().includes("premium")),
			booster: roles.find(
				(role) => role.editable && role.name.toLowerCase().includes("booster"),
			),
			active: roles.find(
				(role) => role.editable && role.name.toLowerCase().includes("active"),
			),
		},
	};

	function getChannel<T extends ChannelType>(
		name: string,
		type: T | T[] = [],
		matchType: "end" | "full" | "partial" | "start" = "partial",
	): Extract<NonThreadGuildBasedChannel, { type: T }> | undefined {
		const types = new Set<ChannelType>([type].flat());
		return channels.find(
			(channel): channel is Extract<NonThreadGuildBasedChannel, { type: T }> =>
				!!channel &&
				types.has(channel.type) &&
				{
					end: channel.name.endsWith(name),
					full: channel.name === name,
					partial: channel.name.includes(name),
					start: channel.name.startsWith(name),
				}[matchType],
		);
	}
}

const config = await getConfig();
export async function syncConfig(): Promise<void> {
	const newConfig = await getConfig();
	config.roles = newConfig.roles;
	config.channels = newConfig.channels;
}
export default config;

const threads = (await guild?.channels.fetchActiveThreads())?.threads ?? new Collection();
export function getInitialChannelThreads(
	channel: Extract<Channel, { threads: ThreadManager }>,
): Collection<string, AnyThreadChannel> {
	return threads.filter(({ parent }) => parent?.id === channel.id);
}
