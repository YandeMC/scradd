import { ApplicationCommandOptionType } from "discord.js";
import { defineChatCommand } from "strife.js";

defineChatCommand(
	{
		name: "ship",
		description: "Ship 2 users",
		access: true,

		options: {
			user1: {
				type: ApplicationCommandOptionType.User,
				description: "user1",
				required: true
			},
			user2: {
				type: ApplicationCommandOptionType.User,
				description: "user2",
				required: true
			},
		},
	},

	async (interaction, options) => {
		interaction.reply(`
		${combineNames(options.user1.displayName, options.user2.displayName)}\n${generateFloat(options.user1.id, options.user2.id)}/5`)
	},
);
function generateFloat(bigNum1: string | number | bigint | boolean, bigNum2: string | number | bigint | boolean) {
	let combinedNumber = BigInt(bigNum1) + BigInt(bigNum2);

	// Convert the combined BigInt to a number that can be worked with
	// Since BigInts can be larger than what Number can safely represent,
	// we take the last few digits to ensure it fits within Number's safe range.
	let manageableNumber = Number(combinedNumber % BigInt(87323));
	return (((Math.floor(100 * Math.sqrt(manageableNumber)) + 1) % 10) + 1) / 2
}

function combineNames(name1: string, name2: string) {
	// Calculate the index at which to split the names
	let splitIndex1 = Math.ceil(name1.length / 2);
	let splitIndex2 = Math.floor(name2.length / 2);

	// Get the first half of the first name and the second half of the second name
	let firstHalf = name1.substring(0, splitIndex1);
	let secondHalf = name2.substring(splitIndex2);

	// Combine the two halves
	let combinedName = firstHalf + secondHalf;

	return combinedName;
}
