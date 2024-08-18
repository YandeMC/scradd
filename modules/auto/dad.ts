	/* On production, this file is replaced with another file with the same structure. */

import type { GuildMember } from "discord.js";
import {
	customComments,
	customNames,
	customResponses,
	customTriggers,
	greetings,
} from "./autos-data.js";
import { client } from "strife.js";

export default function dad(name: string, _: GuildMember): string | readonly (number | string)[] {
	const split = name.split(/\b/);
	// console.log(split);
	const firstName =
		split.find(
			(word) =>
				customResponses[word] ||
				customNames[word] ||
				customComments[word] ||
				customTriggers.includes(word),
		) ||
		split[0] ||
		name;

	const greeting = greetings[Math.floor(Math.random() * greetings.length)] ?? greetings[0];
	const customName = customNames[firstName] || firstName;
	const comment = customComments[firstName] || `I’m ${client.user.displayName}!`;

	return (
		customResponses[firstName] ||
		`${greeting} ${customName}${customTriggers.includes(firstName) ? "!" : ","} ${comment}`
	);
}
