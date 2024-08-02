// // import { defineChatCommand } from "strife.js";
// import { defineEvent } from "strife.js";
// import {
// 	addParticipant,
// 	findMatch,
// 	getAllParticipants,
// 	getMatches,
// 	getParticipant,
// 	removeParticipant,
// } from "./api.js";
// import { decompressId } from "./baseconvert.js";
// import config from "../../common/config.js";
// // import { compressId, decompressId } from "./baseconvert.js";
// addParticipant;
// removeParticipant;
// findMatch;

// // defineChatCommand(
// // 	{
// // 		name: "tournament-join",
// // 		description: "Join the RPS Tournament",
// // 	},
// // 	async (i) => {
// // 		await i.deferReply();
// // 		const result = await addParticipant(formatUser(i.user));
// // 		if (result)
// // 			await (await i.guild?.members.fetch(i.user.id))?.roles.add("1261372320602259458");
// // 		await i.editReply(
// // 			result ?
// // 				"## Success\nYou have been sucessfully added to the tournament"
// // 			:	"## Error\nSomething went wrong when adding you to the tournament",
// // 		);
// // 	},
// // );

// // defineChatCommand(
// // 	{
// // 		name: "tournament-leave",
// // 		description: "Leave the RPS Tournament",
// // 	},
// // 	async (i) => {
// // 		await i.deferReply();
// // 		const result = await removeParticipant(i.user.id);
// // 		if (result)
// // 			await (await i.guild?.members.fetch(i.user.id))?.roles.remove("1261372320602259458");
// // 		await i.editReply(
// // 			result ?
// // 				"## Success\nYou have been sucessfully removed from the tournament"
// // 			:	"## Error\nSomething went wrong when removing you from the tournament",
// // 		);
// // 	},
// // );

// // defineChatCommand({
// //     name: "tournament-opponent",
// //     description: "Find your opponent that youre supposed to be playing against"
// // }, async (i) => {
// //     await i.deferReply()
// //     const match = await findOpponent(compressId(i.user.id))
// //     if (!match) return await i.editReply("Match not found")
// //     const apiPlayer1 = await getParticipant(match.match.player1_id)
// //     const apiPlayer2 = await getParticipant(match.match.player2_id)
// //     await i.editReply({
// //         content: "", embeds: [
// //             {
// //                 title: "Match Found",
// //                 description: `<@${decompressId(apiPlayer1.discordId)}> **VS.** <@${decompressId(apiPlayer2.discordId)}>`
// //             }
// //         ]
// //     })
// // })
// let matches = await getMatches();
// const participants = await getAllParticipants();
// let cooldowns: {
// 	time: number;
// 	p1: string;
// 	p2: string;
// }[] = [];
// let presences: { [id: string]: boolean } = {};
// // defineEvent("presenceUpdate", async (_, presence) => {
// // 	const participant = participants.find((p) => decompressId(p.discordId) == presence.user?.id);
// // 	if (!participant) return;
// // 	presences[presence.user?.id ?? ""] = presence.status != "offline";
// // 	if (presence.status == "offline") return;
// // 	const match = matches
// // 		.filter((m) => m.match.state == "open")
// // 		.find((m) => m.match.player1_id == participant.id || m.match.player2_id == participant.id);
// // 	if (!match) return;
// // 	const opponent = await getParticipant(
// // 		match.match.player1_id == participant.id ? match.match.player2_id : match.match.player1_id,
// // 	);
// // 	const opponentOnline = presences[decompressId(opponent.discordId)] ?? false;
// // 	if (
// // 		opponentOnline &&
// // 		!cooldowns
// // 			.filter((c) => Date.now() - c.time < 7200000)
// // 			.find((c) => c.p1 == presence.user?.id || c.p2 == presence.user?.id)
// // 	) {
// // 		await config.channels.rps?.send(
// // 			`<@${decompressId(opponent.discordId)}> and ${presence.user?.toString()}, looks like both of you are online! you should\n# FIGHT`,
// // 		);
// // 		cooldowns.push({
// // 			time: Date.now(),
// // 			p1: decompressId(opponent.discordId),
// // 			p2: presence.user?.id ?? "",
// // 		});
// // 	}
// // });
