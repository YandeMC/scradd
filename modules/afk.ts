import { defineChatCommand, defineEvent } from "strife.js";
import { GuildMember, Message } from "discord.js";

defineChatCommand(
	{
		name: "afk",
		description: "Set Afk",
		options: {},
	},
	async (interaction) => {
		const user = interaction.member as GuildMember;
		const currentNickname = user.displayName;
		if (currentNickname.includes("[afk]")) {
			const newNickname = currentNickname.replace("[afk]", "").trim();
			await user.setNickname(newNickname);
			await interaction.reply({ ephemeral: true, content: "You are no longer afk. " });
		} else {
			const newNickname = `${currentNickname} [afk]`;
			await user.setNickname(newNickname);
			await interaction.reply({ content: `You are now afk.`, ephemeral: true });
		}
	},
);

defineEvent("messageCreate", async (message: Message) => {
	const user = message.member;
	if (!user) return;
	const currentNickname = user.displayName;
	if (currentNickname.includes("[afk]")) {
		const newNickname = currentNickname.replace("[afk]", "").trim();
		await user.setNickname(newNickname);
	}
});
