import type { TextChannel, ForumChannel, Channel } from "discord.js";
import config from "../../common/config.js";

const disallowFreeWillChannels: (TextChannel | ForumChannel)[] = [
	config.channels.general,
	config.channels.memes,
	config.channels.queer,
	config.channels.general2,
	config.channels.trivia,
	config.channels.advertise,
	config.channels.intros,
	config.channels.verify,
	config.channels.help,
].filter((c) => !!c);

export const allowFreeWill = (channel: Channel): boolean => {
	if (channel.isDMBased()) return true;
	if (channel.isThreadOnly() || channel.isVoiceBased()) return false;
	const idCheck = (i: string) => disallowFreeWillChannels.map(id).includes(i ?? "");
	if (idCheck(channel.id)) return false;
	if (channel.isThread() && idCheck(channel.parent?.id ?? "")) return false;
	return true;
};

const id = (c: { id: string }) => c.id;
