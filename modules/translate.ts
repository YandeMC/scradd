import { translate } from "@vitalets/google-translate-api";
import { defineEvent } from "strife.js";

defineEvent("messageReactionAdd", async (reaction) => {
    if (reaction.emoji.name) {
        const message = reaction.message;
        const flagCode = reaction.emoji.name
        const language = getLanguageForCountryCode(flagCode); 
        if (language && message.content) {
            try {
                const translatedText = (await translate(message.content, { to: language }));
                message.reply(`${flagCode.toUpperCase()}: ${translatedText.text}`);
            } catch (error) {
                console.error('Error translating message:', error);
                message.reply('There was an error trying to translate the message.');
            }
        }
    }
});



function getLanguageForCountryCode(code: string) {
   
    const languageMap: { [key: string]: string } = {
        "🇺🇸": 'en',
        "🇬🇧": "en",
        "🇫🇷": 'fr',
        "🇪🇸": 'es',
        "🇯🇵": "ja",
        "🇩🇪": "de",
        "🇮🇹": "it"
    };
    return languageMap[code.toLowerCase()];
}