import { defineEvent } from "strife.js";
// import Database from "../common/database.js";
// import { GuildMember, User } from "discord.js";
import config from "../common/config.js";

// export const flagDB = new Database<{
// 	/** The ID of the user. */
// 	user: Snowflake;
// 	/** How much XP they have. */
// 	flags: number;
// }>("flag");

// await flagDB.init()

defineEvent("messageCreate", async (msg) => {
	const qdexId = "1169972566056763482"
	if (msg.author.id != qdexId) return


	if (msg.content.toLowerCase() == "a wild queer spawned!" && config.pingRoles.qdex) {
		msg.reply({ content: config.pingRoles.qdex.toString(), allowedMentions: { roles: [config.pingRoles.qdex.id] } })
	}
})




// export async function giveFlags(to: string, amount = 1): Promise<void> {
// 	const user = to

// 	const spong = [...flagDB.data];

// 	const xpDatabaseIndex = spong.findIndex((entry) => entry.user === user);
// 	const oldXp = spong[xpDatabaseIndex]?.flags || 0;
// 	const newXp = oldXp === 0 && amount < 0 ? 0 : oldXp + amount;

// 	if (xpDatabaseIndex === -1) spong.push({ user: user, flags: amount });
// 	else spong[xpDatabaseIndex] = { user: user, flags: newXp };

// 	flagDB.data = spong;
// }

// /**
//  * See how many flags a user has.
//  *
//  * @param to - Who to give the flags to.
//  * @param amount - How many flags to give.
//  */
// export function getFlags(to: GuildMember | User): number {
// 	const user = to instanceof User ? to : to.user;

// 	const spong = [...flagDB.data];

// 	const xpDatabaseIndex = spong.findIndex((entry) => entry.user === user.id);
// 	const oldXp = spong[xpDatabaseIndex]?.flags || 0;
// 	return oldXp;
// }
