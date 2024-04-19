import type { Snowflake } from "discord.js";
import Database from "../../common/database.js";
export const spongesDB = new Database<{
	/** The ID of the user. */
	user: Snowflake;
	/** How much XP they have. */
	sponges: number;
}>("sponges");

export const transactionDB = new Database<{
	/** The ID of the user. */
	user: Snowflake;
	/** How much XP they have. */
	action: string;
	to: Snowflake;
	amount: number;
}>("transactions");

await spongesDB.init();
await transactionDB.init()

export async function addTransaction(user: Snowflake, action: string, amount: number, to?: Snowflake,) {
	const t = [...transactionDB.data];
	t.push({ user, action, amount, to: to || "" })
	transactionDB.data = t
}

export function getTransactions(user: Snowflake) {
	const t = [...transactionDB.data];
	return t.filter((transaction) => transaction.user == user || transaction.to == user)
}

export function formatTransactions(user:Snowflake,list: {
	/** The ID of the user. */
	user: Snowflake;
	/** How much XP they have. */
	action: string;
	to: Snowflake;
	amount: number;
}[]) {
	let formatted:string[] = []

list.forEach((t) => {
	switch (t.action.toLowerCase()) {
		case "pay":
		   if (t.user == user) 
			formatted.push(`paid <@${t.to}> ${t.amount} 🧽`)
			else
			formatted.push(`Recieved ${t.amount} 🧽 from <@${t.user}>`)
			break;
			case "buy": formatted.push(`bought ${t.to} for ${t.amount} 🧽`)
	
		default:
			break;
	}
})
return formatted
 }

 export function getFormattedTransactions(user:Snowflake) {
	return formatTransactions(user,getTransactions(user))
 }