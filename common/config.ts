import assert from "node:assert";
import {
	ChannelType,
	Collection,
	ForumChannel,
	MediaChannel,
	NewsChannel,
	TextChannel,
	type AnyThreadChannel,
	type Channel,
	type Guild,
	type NonThreadGuildBasedChannel,
	type PublicThreadChannel,
	type Snowflake,
	type ThreadManager,
} from "discord.js";
import { client } from "strife.js";

import type { NonFalsy } from "./misc.js";


const CUSTOM_ROLE_PREFIX = "✨ "
const IS_TESTING = process.argv.some((file) => file.endsWith(".test.js"));

const guild = IS_TESTING ? undefined : await client.guilds.fetch(process.env.GUILD_ID);
if (guild && !guild.available) throw new ReferenceError("Main guild is unavailable!");

function assertOutsideTests<T>(value: T): NonFalsy<T> {
	if (!IS_TESTING) assert(value);
	return value as NonFalsy<T>;
}

const guildIds = {
	testing: "1021061241260740713",
	development: "751206349614088204",
} as const;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function getConfig() {
	const otherGuilds = guild && (await client.guilds.fetch());
	if (otherGuilds) otherGuilds.delete(guild.id);

	const channels = (await guild?.channels.fetch()) ?? new Collection();
	const modlogsChannel =
		guild?.publicUpdatesChannel ?? getChannel("logs", ChannelType.GuildText, "end");
	const modChannel = assertOutsideTests(
		getChannel("mod-talk", ChannelType.GuildText) ?? modlogsChannel,
	);

	const roles = ((await guild?.roles.fetch()) ?? new Collection()).filter(
		(role) => !role.managed && !role.name.startsWith(CUSTOM_ROLE_PREFIX),
	);
	const modRole = roles.find((role) => role.name.toLowerCase().startsWith("mod"));
	const staffRole = assertOutsideTests(
		roles.find((role) => role.name.toLowerCase().startsWith("staff")) ?? modRole,
	);
	const trialRole =
		roles.find((role) => role.name.toLowerCase().startsWith("trial")) ?? staffRole;
	const execRole = roles.find((role) => role.name.toLowerCase().includes("exec")) ?? staffRole;

	return {
		guild: assertOutsideTests(guild),
		otherGuildIds: otherGuilds ? [...otherGuilds.keys()] : [],
		guilds: Object.fromEntries(
			await Promise.all(
				Object.entries(guildIds).map(async ([key, id]) => {
					const basic: Partial<Guild> & { id: Snowflake } = { id, valueOf: () => id };
					return [
						key,
						guild ? await client.guilds.fetch(id).catch(() => basic) : basic,
					] as const;
				}),
			),
		),

		channels: {
			info: getChannel("info", ChannelType.GuildCategory, "start"),
			announcements: getChannel("server-news", ChannelType.GuildText, "start"),
			board: getChannel(
				"board",
				[ChannelType.GuildText, ChannelType.GuildAnnouncement],
				"end",
			),

			tickets: getChannel("tickets", ChannelType.GuildText, "start"),
			verify: getChannel("verify", ChannelType.GuildText, "end"),
			server: "1138116320249000077",
			welcome: getChannel("welcome", ChannelType.GuildText),
			intros: getChannel("intro", ChannelType.GuildText, "partial"),

			mod: modChannel,
			modlogs: assertOutsideTests(modlogsChannel ?? modChannel),
			exec: getChannel("exec", ChannelType.GuildText, "start"),
			admin: getChannel("admin", ChannelType.GuildText, "start") ?? modChannel,

			general: getChannel("general", ChannelType.GuildText, "full"),
			general2:
				getChannel("general2", ChannelType.GuildText, "full") ||
				getChannel("general-2", ChannelType.GuildText, "full") ||
				getChannel("alternate-universe", ChannelType.GuildText, "full"),

			updates: getChannel("updates", ChannelType.GuildText, "partial"),
			suggestions: getChannel("suggestions", ChannelType.GuildForum),
			level: getChannel("level", ChannelType.GuildText),

			qotd: getChannel("question", ChannelType.GuildForum, "partial"),
			share: getChannel("share", ChannelType.GuildForum),
			advertise:
				getChannel("advertise", ChannelType.GuildForum, "partial") ??
				getChannel("promo", ChannelType.GuildForum, "partial"),
			bots: getChannel("bots", ChannelType.GuildText, "partial"),
			trivia: getChannel("trivia", ChannelType.GuildText, "partial"),
			oldSuggestions: getChannel("suggestions", ChannelType.GuildText, "partial"),
			help: getChannel("help", ChannelType.GuildForum, "partial"),
			queer: getChannel("qdex", ChannelType.GuildText, "partial"),
			memes: getChannel("memes", ChannelType.GuildText, "partial"),
			vc:
				getChannel("vc", ChannelType.GuildVoice, "full") ||
				getChannel("voice", ChannelType.GuildVoice, "partial"),
		},

		roles: {
			mod: modRole ?? staffRole,
			ticketSupport:
				roles.find((role) => role.name.toLowerCase().includes("ticket")) ?? modRole,
			exec: execRole,
			staff: staffRole,
			trialMod: trialRole,
			weeklyWinner: roles.find((role) => role.name.toLowerCase().includes("weekly")),
			dev: roles.find((role) => role.name.toLowerCase().startsWith("dev")),
			epic: roles.find((role) => role.name.toLowerCase().includes("premium")),
			booster: roles.find((role) => role.name.toLowerCase().includes("booster")),
			active: roles.find((role) => role.name.toLowerCase().includes("active")),
			established: roles.find((role) => role.name.toLowerCase().includes("established")),
			autoKick: roles.find((role) => role.name.toLowerCase().includes("autokick")),
			verified: roles.find((role) => role.name.toLowerCase() == "linked scratch"),
			verifiedPerms: roles.find((role) => role.name.toLowerCase() == "verified"),
		},
		pingRoles: {
			qotd: roles.find(
				(role) =>
					role.name.toLowerCase().includes("qotd") &&
					role.name.toLowerCase().startsWith("@"),
			),
			trivia: roles.find(
				(role) =>
					role.name.toLowerCase().includes("trivia") &&
					role.name.toLowerCase().startsWith("@"),
			),
			announcements: roles.find(
				(role) =>
					role.name.toLowerCase().includes("announ") &&
					role.name.toLowerCase().startsWith("@"),
			),
			changes: roles.find(
				(role) =>
					role.name.toLowerCase().includes("changes") &&
					role.name.toLowerCase().startsWith("@"),
			),
			givaways: roles.find(
				(role) =>
					role.name.toLowerCase().includes("givaway") &&
					role.name.toLowerCase().startsWith("@"),
			),
			events: roles.find(
				(role) =>
					role.name.toLowerCase().includes("event") &&
					role.name.toLowerCase().startsWith("@"),
			),
			polls: roles.find(
				(role) =>
					role.name.toLowerCase().includes("poll") &&
					role.name.toLowerCase().startsWith("@"),
			),
			qdex: roles.find(
				(role) =>
					role.name.toLowerCase().includes("qdex") &&
					role.name.toLowerCase().startsWith("@"),
			),
			help: {
				js: roles.find(
					(role) =>
						(role.name.toLowerCase().includes("javascript") ||
							role.name.toLowerCase().includes("js")) &&
						role.name.toLowerCase().includes("helper"),
				),
				py: roles.find(
					(role) =>
						(role.name.toLowerCase().includes("python") ||
							role.name.toLowerCase().includes("py")) &&
						role.name.toLowerCase().includes("helper"),
				),
				web: roles.find(
					(role) =>
						(role.name.toLowerCase().includes("html") ||
							role.name.toLowerCase().includes("css")) &&
						role.name.toLowerCase().includes("helper"),
				),
				scratch: roles.find(
					(role) =>
						(role.name.toLowerCase().includes("scratch") ||
							role.name.toLowerCase().includes("scratch")) &&
						role.name.toLowerCase().includes("helper"),
				),
				turbowarp: roles.find(
					(role) =>
						(role.name.toLowerCase().includes("turbowarp") ||
							role.name.toLowerCase().includes("pm")) &&
						role.name.toLowerCase().includes("helper"),
				),
				java: roles.find(
					(role) =>
						(role.name.toLowerCase().includes("java") ||
							role.name.toLowerCase().includes("kotlin")) &&
						role.name.toLowerCase().includes("helper"),
				),
				c: roles.find(
					(role) =>
						(role.name.toLowerCase().includes("c/") ||
							role.name.toLowerCase().includes("cpp") ||
							role.name.toLowerCase().includes("c#") ||
							role.name.toLowerCase().includes("c++")) &&
						role.name.toLowerCase().includes("helper"),
				),
			},
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
					end: channel.name.toLowerCase().endsWith(name),
					full: channel.name.toLowerCase() === name,
					partial: channel.name.toLowerCase().includes(name),
					start: channel.name.toLowerCase().startsWith(name),
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

export async function findRole(roleName: string) {
	const roles =
		(await guild?.roles.fetch())?.filter(
			(role) => role.editable && !role.name.startsWith(CUSTOM_ROLE_PREFIX),
		) ?? new Collection();
	return roles.find((role) => role.name.toLowerCase().includes(roleName));
}
export function getInitialThreads(
	channel: ForumChannel | MediaChannel,
	filter?: string,
): Collection<string, PublicThreadChannel<true>>;
export function getInitialThreads(
	channel: NewsChannel | TextChannel,
	filter: string,
): Collection<string, PublicThreadChannel<false>>;
export function getInitialThreads(
	channel: NewsChannel | TextChannel,
	filter?: undefined,
	//@ts-ignore
): Collection<string, AnyThreadChannel<false>>;
export function getInitialThreads(
	channel?: ForumChannel | MediaChannel | NewsChannel | TextChannel,
	filter?: undefined,
): Collection<string, AnyThreadChannel>;
export function getInitialThreads(
	channel: ForumChannel | MediaChannel | NewsChannel | TextChannel | undefined,
	filter: string,
): Collection<string, PublicThreadChannel>;
export function getInitialThreads(
	channel?: ForumChannel | MediaChannel | NewsChannel | TextChannel,
	filter?: string,
): Collection<string, AnyThreadChannel> {
	return threads.filter(
		(thread) =>
			(!channel || thread.parent?.id === channel.id) &&
			(!filter ||
				(thread.type !== ChannelType.PrivateThread && thread.name.includes(filter))),
	);
}
