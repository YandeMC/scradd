import {
	inlineCode,
	type ChatInputCommandInteraction,
	type Snowflake,
	type User,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import lockFile from "../../package-lock.json" assert { type: "json" };
import pkg from "../../package.json" assert { type: "json" };
import { columnize } from "../../util/discord.js";
import { joinWithAnd } from "../../util/text.js";
import { mentionUser } from "../settings.js";

const designers = "1021061241260740719",
	developers = "1021061241260740720",
	contributer = "1195901524069601350",
	testers = "1021061241260740718";

export default async function credits(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.deferReply();
	const dependencies = Object.keys(pkg.dependencies)
		.map((name) => {
			const { version } = lockFile.dependencies[name];

			if (version.startsWith("file:")) return [inlineCode(name)] as const;

			if (/^https?:\/\//.test(version)) return [inlineCode(name), version] as const;

			if (version.startsWith("git+")) {
				const git = version.split("+")[1]?.split("#");
				return git ?
						([git[1] ? (`${name}@${git[1]}` as const) : name, git[0]] as const)
					:	([inlineCode(name)] as const);
			}
			if (version.startsWith("npm:")) {
				const npm = version.split("@");
				const reference = `${npm.length > 2 ? "@" : ""}${npm.at(-2) ?? npm[0]}`;
				const resolvedVersion = npm.at(-1) ?? npm[0];
				return [
					`${inlineCode(reference)}@${resolvedVersion}`,
					`${constants.domains.npm}/${reference}/v/${resolvedVersion}`,
				] as const;
			}

			return [
				`${inlineCode(name)}@${version}`,
				`${constants.domains.npm}/${name}/v/${version}`,
			] as const;
		})
		.toSorted(([one], [two]) => one.localeCompare(two));

	await interaction.editReply({
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
						dependencies.slice(0, dependencies.length / 2),
						([specifier, link]) =>
							"- " + (link ? `[${specifier}](${link})` : specifier),
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

		return joinWithAnd(
			await Promise.all(
				members
					.toSorted((one, two) =>
						one.user.displayName.localeCompare(two.user.displayName),
					)
					.map(({ user }) =>
						mentionUser(user, interaction.user, interaction.guild ?? config.guild),
					),
			),
		);
	}
}
