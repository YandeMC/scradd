import { ApplicationCommandOptionType, GuildMember } from "discord.js";
import { defineButton, defineEvent, defineSubcommands } from "strife.js";
import config from "../../common/config.js";
import { getSponges, giveSpongesForMessage } from "./give-sponges.js";
import { pay } from "./pay.js";
import { getFormattedTransactions } from "./util.js";
import { buyItem, getShopItems } from "./shop.js";

defineEvent("messageCreate", async (message) => {
	if (message.guild?.id !== config.guild.id) return;

	await giveSpongesForMessage(message);
});

defineSubcommands(
	{
		name: "sponges",
		description: "do things with your sponges",

		subcommands: {
			pay: {
				description: "Pay someone sponges",

				options: {
					user: {
						type: ApplicationCommandOptionType.User,
						description: "User to pay sponges to",

						required: true,
					},
					amount: {
						type: ApplicationCommandOptionType.Integer,
						description: "how many",
						required: true,
					},
				},
			},

			shop: {
				description: "View the shop",

				options: {},
			},

			view: {
				description: "look at yr sponges",

				options: {},
			},
			transactions: {
				description: "look at yr sponge transactions",

				options: {},
			},
		},
	},

	async (interaction, options) => {
		const user =
			options?.options &&
			"user" in options.options &&
			(options.options.user instanceof GuildMember ?
				options.options.user.user
			:	options.options.user);

		const amount =
			(options?.options && "amount" in options.options ? options.options.amount : 0) ?? 0;

		switch (options?.subcommand ?? "shop") {
			case "pay": {
				await pay(interaction, user || interaction.user, amount);
				break;
			}

			case "shop": {
				await getShopItems(interaction);
				break;
			}
			case "view": {
				await interaction.reply({
					ephemeral: true,
					content: `${getSponges(interaction.user)}`,
				});
				break;
			}
			case "transactions": {
				await interaction.reply({
					ephemeral: true,
					embeds: splitArrayIntoSections(
						getFormattedTransactions(interaction.user.id),
					).map((list, index) => {
						return {
							title: index == 0 ? "Transactions" : undefined,
							description: list,
						};
					}),
					content: ``,
				});
				break;
			}
		}
	},
);

defineButton("buyItem", buyItem);

function splitArrayIntoSections(strings: string[], maxLength = 4096) {
	const sections = [];
	let currentSection = "";

	strings.forEach((string) => {
		// Check if adding this string to the current section will exceed the limit
		if (currentSection.length + string.length + 1 > maxLength) {
			// If so, push the current section to the array and start a new section
			sections.push(currentSection);
			currentSection = string;
		} else {
			// Otherwise, add the string to the current section
			// Add a space if this is not the first element in the section
			currentSection += (currentSection ? "\n" : "") + string;
		}
	});

	// Push the last section if it contains any string
	if (currentSection) {
		sections.push(currentSection);
	}

	return sections;
}
