import {
	inlineCode,
	type ChatInputCommandInteraction,
	type Snowflake,
	type User,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import pkg from "../../package.json" assert { type: "json" };
import { columnize } from "../../util/discord.js";
import { joinWithAnd } from "../../util/text.js";
import { mentionUser } from "../settings.js";

const designers = "1021061241260740719",
	developers = "1021061241260740720",
	contributer = "1195901524069601350",
	testers = "1021061241260740718";

const dependencies = await Promise.all(
	Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies }).map(async (name) => {
		const { default: dep } = (await import(`../../../node_modules/${name}/package.json`, {
			assert: { type: "json" },
		})) as { default: { name: string; version: `${bigint}.${bigint}.${string}` } };

		return [
			`${inlineCode(dep.name)}@${dep.version}`,
			`${constants.domains.npm}/${dep.name}/v/${dep.version}`,
		] as const;
	}),
);

export default async function credits(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.reply({
		embeds: [
			{
				title: "Credits",
				description: `Scrub is hosted on [ fly.io](https://fly.io) using Node.JS ${process.version}.`,

				fields: [
					{ name: "🧑‍💻 Developers", value: await getRole(developers) },
					{ name: "🧩 Contributers", value: await getRole(contributer) },
					{ name: "🖌️ Designers", value: await getRole(designers) },
					{
						name: "🧪 Additional beta testers",
						value: await getRole(testers),
						// inline: true,
					},
					{
						name: "❤️ Special Credits",
						value: `<@462098932571308033> - Scratch Blocks Images`,
						// inline: false,
					},
					...(await columnize(
						dependencies.toSorted(([one], [two]) => one.localeCompare(two)),
						([specifier, link]) => `- [${specifier}](${link})`,
						"🗄️ Third-party code libraries",
					)),
					...(await columnize(
						dependencies.slice(dependencies.length / 2),
						([specifier, link]) =>
							"- " + (link ? `[${specifier}](${link})` : specifier),
						constants.zws,
					)),
				],

				color: constants.themeColor,
			},
		],
	});

	async function getRole(roleId: Snowflake): Promise<string> {
		const role = await config.guilds.testing.roles?.fetch(roleId);
		const members: { user: User }[] = [...(role?.members.values() ?? [])];

		const mentions = members
			.toSorted((one, two) => one.user.displayName.localeCompare(two.user.displayName))
			.map(({ user }) =>
				mentionUser(user, interaction.user, interaction.guild ?? config.guild),
			);
		return joinWithAnd(await Promise.all(mentions));
	}
}
