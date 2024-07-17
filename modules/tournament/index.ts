import { defineChatCommand } from "strife.js";
import {
	addParticipant,
	findMatch,
	findOpponent,
	formatUser,
	getParticipant,
	removeParticipant,
} from "./api.js";
import { compressId, decompressId } from "./baseconvert.js";
addParticipant;
removeParticipant;
findMatch;

defineChatCommand(
	{
		name: "tournament-join",
		description: "Join the RPS Tournament",
	},
	async (i) => {
		await i.deferReply();
		const result = await addParticipant(formatUser(i.user));
		if (result)
			await (await i.guild?.members.fetch(i.user.id))?.roles.add("1261372320602259458");
		await i.editReply(
			result ?
				"## Success\nYou have been sucessfully added to the tournament"
			:	"## Error\nSomething went wrong when adding you to the tournament",
		);
	},
);

defineChatCommand(
	{
		name: "tournament-leave",
		description: "Leave the RPS Tournament",
	},
	async (i) => {
		await i.deferReply();
		const result = await removeParticipant(i.user.id);
		if (result)
			await (await i.guild?.members.fetch(i.user.id))?.roles.remove("1261372320602259458");
		await i.editReply(
			result ?
				"## Success\nYou have been sucessfully removed from the tournament"
			:	"## Error\nSomething went wrong when removing you from the tournament",
		);
	},
);

defineChatCommand(
	{
		name: "tournament-opponent",
		description: "Find your opponent that youre supposed to be playing against",
	},
	async (i) => {
		await i.deferReply();
		const match = await findOpponent(compressId(i.user.id));
		if (!match) return await i.editReply("Match not found");
		const apiPlayer1 = await getParticipant(match.match.player1_id);
		const apiPlayer2 = await getParticipant(match.match.player2_id);
		await i.editReply({
			content: "",
			embeds: [
				{
					title: "Match Found",
					description: `<@${decompressId(apiPlayer1.discordId)}> **VS.** <@${decompressId(apiPlayer2.discordId)}>`,
				},
			],
		});
	},
);
