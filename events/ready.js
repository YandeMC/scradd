/** @file Initialize Bot on ready. Register commands and etc. */

import { Collection, MessageEmbed } from "discord.js";

import commands from "../lib/commands.js";
import pkg from "../lib/package.js";

/** @type {import("../types/event").default<"ready">} */
const event = {
	async event(client) {
		console.log(
			`Connected to Discord with ID ${client.application.id} and tag ${
				client.user?.tag ?? ""
			}`,
		);

		const GUILD_ID = process.env.GUILD_ID ?? "";
		const guilds = await client.guilds.fetch();

		guilds.forEach(async (guild) => {
			if (guild.id === GUILD_ID) {
				if (process.env.NODE_ENV !== "production") return;

				const { channels } = await guild.fetch();
				const { LOGS_CHANNEL } = process.env;

				if (!LOGS_CHANNEL)
					throw new ReferenceError("LOGS_CHANNEL is not set in the .env");

				const channel = await channels.fetch(LOGS_CHANNEL);

				if (!channel?.isText())
					throw new ReferenceError("Could not find error reporting channel");

				return await channel?.send({
					embeds: [
						new MessageEmbed()
							.setTitle("Bot restarted!")
							.setDescription(`Version **v${pkg.version}**`)
							.setColor("RANDOM"),
					],
				});
			}

			const guildCommands = await client.application?.commands
				.fetch({
					guildId: guild.id,
				})
				.catch(() => {});

			guildCommands?.forEach(async (command) => await command.delete().catch(() => {}));
		});

		const prexistingCommands = await client.application.commands.fetch({
			guildId: GUILD_ID,
		});
		/**
		 * @type {Collection<
		 * 	string,
		 * 	{
		 * 		command: import("../types/command").Command;
		 * 		permissions?: import("discord.js").ApplicationCommandPermissionData[];
		 * 	}
		 * >}
		 */
		const slashes = new Collection();

		for (const [key, command] of commands.entries()) {
			if (command.apply !== false)
				slashes.set(key, { command: command.data, permissions: command.permissions });
		}

		await Promise.all(
			prexistingCommands.map((command) => {
				if (slashes.has(command.name)) return false;

				return command.delete();
			}),
		);

		await Promise.all(
			slashes.map(async ({ command, permissions }, name) => {
				const newCommand = await (prexistingCommands.has(name)
					? client.application?.commands.edit(name, command.toJSON(), GUILD_ID)
					: client.application?.commands.create(command.toJSON(), GUILD_ID));

				if (permissions)
					await newCommand?.permissions.add({ guild: GUILD_ID, permissions });
			}),
		);
	},

	once: true,
};

export default event;
