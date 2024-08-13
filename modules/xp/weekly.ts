import {
	TimestampStyles,
	time,
	userMention,
	type MessageCreateOptions,
	type Snowflake,
} from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { SpecialReminders, remindersDatabase } from "../reminders/misc.js";
import { recheckMemberRole } from "../roles/custom.js";
import { getFullWeeklyData, recentXpDatabase } from "./util.js";
import { ACTIVE_THRESHOLD_ONE, ACTIVE_THRESHOLD_TWO } from "./misc.js";

export async function getChatters(): Promise<MessageCreateOptions | undefined> {
	const weeklyWinners = getFullWeeklyData();
	const winnerId = weeklyWinners[0]?.user;
	const winner =
		winnerId &&
		(await config.guild.members
			.fetch(winnerId)
			.catch(() => client.users.fetch(winnerId).catch(() => void 0)));
	weeklyWinners.splice(
		0,
		weeklyWinners.findIndex(
			(gain, index) => index > 3 && gain.xp !== weeklyWinners[index + 1]?.xp,
		) + 1 || weeklyWinners.length,
	);
	if (!weeklyWinners.length) return;

	const formatted = weeklyWinners.map(
		(user) =>
			`${weeklyWinners.findIndex((found) => found.xp === user.xp) + 6}) ${userMention(
				user.user,
			)} - ${Math.floor(user.xp).toLocaleString()} XP`,
	);

	while (formatted.join("\n").length > 4096) formatted.pop();
	const ending = ` ${(weeklyWinners[formatted.length]?.xp ?? 0).toLocaleString()} XP`;
	const filtered = ending ? formatted.filter((line) => !line.endsWith(ending)) : formatted;

	return {
		embeds: [
			{
				description: filtered.join("\n"),
				footer:
					ending ?
						{
							icon_url: config.guild.iconURL() ?? undefined,
							text: `${weeklyWinners.length - filtered.length
								} more users with <=${ending}`,
						}
						: undefined,
				color: constants.themeColor,
				thumbnail: winner ? { url: winner.displayAvatarURL() } : undefined,
			},
		],
	};
}

export default async function getWeekly(nextWeeklyDate: Date) {
	if (config.channels.announcements) {
		remindersDatabase.data = [
			...remindersDatabase.data,
			{
				channel: config.channels.announcements.id,
				date: Number(nextWeeklyDate),
				reminder: undefined,
				id: SpecialReminders.Weekly,
				user: client.user.id,
			},
		];
	}

	const weeklyWinners = getFullWeeklyData();

	const latestActiveMembers = weeklyWinners
		.filter((item) => item.xp >= ACTIVE_THRESHOLD_ONE)
		.map((item) => item.user);

	if (config.roles.active) {
		const activeMembers = new Set([
			...latestActiveMembers,
			...Object.entries(
				recentXpDatabase.data.reduce<Record<Snowflake, number>>((accumulator, gain) => {
					accumulator[gain.user] = (accumulator[gain.user] ?? 0) + gain.xp;
					return accumulator;
				}, {}),
			)
				.filter(([, xp]) => xp >= ACTIVE_THRESHOLD_TWO)
				.map((entry) => entry[0]),
		]);
		for (const [, member] of config.roles.active.members) {
			if (activeMembers.has(member.id)) continue;
			await member.roles.remove(config.roles.active, "Inactive");
		}
	}

	recentXpDatabase.data = recentXpDatabase.data.filter(
		(entry) => entry.time + 604_800_000 > Date.now(),
	);

	const date = new Date();
	date.setUTCDate(date.getUTCDate() - 7);
	const chatters = weeklyWinners.length;
	const allXp = Math.floor(weeklyWinners.reduce((one, two) => one + two.xp, 0));

	weeklyWinners.splice(
		weeklyWinners.findIndex(
			(gain, index) => index > 3 && gain.xp !== weeklyWinners[index + 1]?.xp,
		) + 1 || weeklyWinners.length,
	);
	const ids = new Set(weeklyWinners.map((gain) => gain.user));

	const role = config.roles.weeklyWinner;
	if (role) {
		for (const [, weeklyMember] of role.members) {
			if (!ids.has(weeklyMember.id))
				await weeklyMember.roles.remove(role, "No longer weekly winner");
		}

		for (const [index, { user }] of weeklyWinners.entries()) {
			const member = await config.guild.members.fetch(user).catch(() => void 0);
			await member?.roles.add(
				index || !config.roles.epic ? role : [role, config.roles.epic],
				"Weekly winner",
			);
		}
	}

	for (const winner of weeklyWinners) {
		const member = await config.guild.members.fetch(winner.user).catch(() => void 0);
		if (member) await recheckMemberRole(member, member);
	}
	const { createCanvas } = await import("@napi-rs/canvas");
	const { Chart } = await import("chart.js/auto");

	const recentXp = recentXpDatabase.data.toSorted((one, two) => one.time - two.time);
	const maxDate = (recentXp[0]?.time ?? 0) + 604_800_000;

	// Function to convert HSV to hex
	function hsvToHex(h: number, s: number, v: number) {
		let r, g, b;
		let i = Math.floor(h * 6);
		let f = h * 6 - i;
		let p = v * (1 - s);
		let q = v * (1 - f * s);
		let t = v * (1 - (1 - f) * s);

		switch (i % 6) {
			case 0: r = v; g = t; b = p; break;
			case 1: r = q; g = v; b = p; break;
			case 2: r = p; g = v; b = t; break;
			case 3: r = p; g = q; b = v; break;
			case 4: r = t; g = p; b = v; break;
			case 5: r = v; g = p; b = q; break;
		}

		return `#${Math.round(r ?? 0 * 255).toString(16).padStart(2, '0')}${Math.round(g ?? 0 * 255).toString(16).padStart(2, '0')}${Math.round(b ?? 0 * 255).toString(16).padStart(2, '0')}`;
	}

	const datasets = config.guild.members.cache
		.map((user: { id: string; displayName: any; }) => {
			const data = recentXp
				.filter((gain) => gain.time < maxDate && gain.user === user.id)
				.reduce((accumulator, xp) => {
					const previous = accumulator.at(-1) ?? { y: 0, x: recentXp[0]?.time ?? 0 };
					return [
						...accumulator,
						...Array.from(
							{ length: Math.floor((xp.time - previous.x) / 3_600_000) },
							(_, index) => ({ y: previous.y, x: previous.x + 3_600_000 * index }),
						),
						{ x: xp.time, y: xp.xp + previous.y },
					];
				}, [] as any);

			return {
				label: user.displayName,
				data: [
					...(data.length ? data : [{ y: 0, x: recentXp[0]?.time ?? 0 }]),
					{ x: maxDate, y: data.at(-1)?.y ?? 0 },
				],
			};
		})
		.toSorted((one: { data: { (): any; new(): any; y: any; }[]; }, two: { data: { (): any; new(): any; y: any; }[]; }) => (two.data.at(-1)?.y ?? 0) - (one.data.at(-1)?.y ?? 0))
		.slice(0, 10)
		.map((dataset: any, index: number, array: string | any[]) => {
			const hue = index / array.length; // Distribute hues evenly
			const color = hsvToHex(hue, 1, 1); // Full saturation and value (S=1, V=1)
			return {
				...dataset,
				borderColor: color, // Assign the generated color to the border
				backgroundColor: color, // Assign the generated color to the background
			};
		});

	const canvas = createCanvas(1000, 750);
	const context = canvas.getContext("2d");

	Chart.defaults.color = "#fff";
	new Chart(context as any, {
		options: {
			parsing: false,
			scales: { x: { type: "time", grid: { display: false } }, y: { min: 0 } },
			elements: { point: { radius: 0 } },
		},
		plugins: [
			{
				id: "customCanvasBackgroundColor",
				beforeDraw(chart) {
					chart.ctx.save();
					chart.ctx.globalCompositeOperation = "destination-over";
					chart.ctx.fillStyle = "#444";
					chart.ctx.fillRect(0, 0, chart.width, chart.height);
					chart.ctx.restore();
				},
			},
		],
		type: "line",
		data: { datasets },
	});



	return ({
		content: `## 🏆 Weekly Winners week of ${new Date().toLocaleString([], {
			month: "long",
			day: "numeric",
		})}\n${weeklyWinners
			.map(
				(gain, index) =>
					`${["🥇", "🥈", "🥉"][index] || "🏅"} ${userMention(gain.user)} - ${Math.floor(
						gain.xp,
					).toLocaleString()} XP`,
			)
			.join("\n") || "*Nobody got any XP this week!*"
			}\n\n*This week, ${chatters.toLocaleString()} people chatted, and ${latestActiveMembers.length.toLocaleString()} people were active. Altogether, people gained ${allXp.toLocaleString()} XP this week.*\n### Next week’s weekly winners will be posted ${time(
				nextWeeklyDate,
				TimestampStyles.RelativeTime,
			)}.`,
		files: [{ attachment: canvas.toBuffer("image/png"), name: "graph.png" }],
	});
}
