import { translate } from "@vitalets/google-translate-api";
import { defineEvent } from "strife.js";

defineEvent("messageReactionAdd", async (reaction) => {
	if (reaction.emoji.name) {
		const message = reaction.message;
		const flagCode = reaction.emoji.name;
		const language = getLanguageForCountryCode(flagCode);
		if (language && message.content) {
			try {
				const translatedText = await translate(message.content, { to: language });
				message.reply({
					content: `${flagCode.toUpperCase()}: ${translatedText.text}`,
					allowedMentions: { users: [] },
				});
			} catch (error) {
				console.error("Error translating message:", error);
				message.reply({
					content: "There was an error trying to translate the message.",
					allowedMentions: { users: [] },
				});
			}
		}
	}
});

function getLanguageForCountryCode(code: string) {
	const languageMap: { [key: string]: string } = {
		"🇺🇸": "en",
		"🇬🇧": "en",
		"🇫🇷": "fr",
		"🇪🇸": "es",
		"🇯🇵": "ja",
		"🇩🇪": "de",
		"🇮🇹": "it",
	};
	return languageMap[code.toLowerCase()];
}
