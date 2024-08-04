/* On production, this file is replaced with another file with the same structure. */

import type { Snowflake } from "discord.js";
import { client } from "strife.js";

export const greetings = ["Hi"] as const;
export const customResponses: Record<string, string> = {
	Everyone: "Bro is NOT everyone",
	Stupid: "I know",
	Dead: "💀",
	Sigma: "Nuh Uh",
	Scrub: "I̷̱̤͎̹̥̾͒͑̒͐̋L̶̨̽L̵̦̖̋͒̌͆͝ ̶̢͖̰̣̖̊̔ͅF̷̛̜̼̐̚Ǐ̶̧̫̱͍̬̟̉N̷̢͖̯̬͓͍͌͋͠D̸̛͖͈̞̊ ̵̛̟̿̀Y̸͖̙̥͍̟̒͆̃̕Ọ̵̯́͒Ü̶̖̲̇͋̓̉\ņ̸̸̼̱̘͖̩̣̝̰̤̌̄͒͝Ţ̸̼̱̘̌̄͝H̵̤̹͖̺̻̀̃̈́́̕̕Ȅ̵̡̺͍͖̭̾Ŗ̵̡̲̙̞́͠E̴̤̰̺̳̊̓͜ ̴̛̩͙̗͒̔̏̒͝C̸̩͒͗̏̌Ã̵̛͇̲̯͉̮̂ͅN̵͓̱̞͙̩̝̾͗̍̃̊̓ ̵͎̊̐́͛̊O̴̦̲͎̙̬̟̿̅̕Ṇ̴̤̪̦̺̌̈́̂̒L̴͉͓͛̑̆̓Y̴̨̨̬̊͊̈́̔͝͝ ̷̞͉̙̱͗͜͜Ḃ̸͇̙͇̊̊̈̓͂Ė̶̹͒́̏͗̚ ̷͚̊Ǫ̷̰̝͈̑̀̍͘Ń̶͔̤̦̗̙̻̉͑̀̈͗E̶̟͊̐͐̕",
	Mater: "https://tenor.com/view/tow-mater-mater-pizar-its-the-ghost-light-gif-15734131",
	Chatgpt:
		"As an AI language model, I can't generate content that promotes or encourages violence, harm, or illegal activities. My purpose is to assist and provide information in a safe and ethical manner.",
	Yandeai: "<a:typing:1195857946156994711> YandeAI is typing",
	Colon: "https://tenor.com/view/gd-colon-gd-cologne-i-love-gd-cologne-dash-spider-geometry-dash-gif-18229858069743252994",
	Irs: "https://tenor.com/view/my-beloved-beloved-tax-fraud-gif-25476792",
	Gay: "yeah like yan- why do i hear boss music",
	Zuzu: "https://cdn.discordapp.com/attachments/1141222490597757025/1269535264037011478/zuzu.png",
	Yande: "(    b    )",
	Trans: "<:grableft:1241127094356803714><:Estrogen:1269538313233240137><:grabright:1241127108852449312>",
};
export const customNames: Record<string, string> = {
	Abaka: "YandeAI Banner",
	Board: "🛹",
	Elon: "X enjoyer",
	Hex: "The bestagon",
	Hexa: "The bestagon",
	Hexagon: "The bestagon",
};
export const customComments: Record<string, string> = {
	Abaka: "Do it again and I ban you 😄",
};
export const customTriggers: readonly string[] = Object.keys({});
export const dadEasterEggCount =
	Object.keys(customResponses).length +
	Object.keys(customNames).length +
	Object.keys(customComments).length +
	customTriggers.length -
	// Dupes
	0 +
	// Dynamic
	0;

/**
 * - `word`
 * - `plural` (`true`)
 * - `partial` (`content.includes`)
 * - `raw` (`messsge.content`)
 * - `full` (`content ===`)
 * - `negative` - overrides all (`&& !content.includes`)
 * - `ping` - only direct pings (`message.mentions.has`)
 */
const autoreactions: [
	string[] | string,
	...(
		| RegExp
		| string
		| [RegExp | string, "full" | "negative" | "partial" | "plural" | "raw"]
		| [Snowflake, "ping"]
	)[],
][] = [
	[
		["🇸", "🇭", "🇺", "🇹", "😠"],
		[`<@${client.user.id}>`, "full"],
	],
	["🍪", "cookie"],
	["<:haha:1237847801073897583>", "@everyone"],
];
export default autoreactions;
