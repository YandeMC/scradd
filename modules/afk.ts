import { defineChatCommand } from "strife.js";
import { GuildMember } from "discord.js";

defineChatCommand(
	{
		name: "afk",
		description: "Set Afk",
		access: false,
		options: {},
	},
	async (interaction) => {
		const user = interaction.member as GuildMember;
		const currentNickname = user.displayName;
		if (currentNickname.includes("[afk]")) {
			const newNickname = currentNickname.replace("[afk]", "").trim();
			await user.setNickname(newNickname);
			await interaction.reply(
				`Removed [afk] from your nickname. New nickname: ${newNickname}`,
			);
		} else {
			const newNickname = `${currentNickname} [afk]`;
			await user.setNickname(newNickname);
			await interaction.reply(`Added [afk] to your nickname. New nickname: ${newNickname}`);
		}
	},
);
