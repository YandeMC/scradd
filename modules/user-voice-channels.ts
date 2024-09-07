import { ChannelType, VoiceChannel } from "discord.js";
import config from "../common/config.js";
import { defineEvent } from "strife.js";

export const userChannelPrefix = "🔹";
const cooldownLength = 10000;
let userCooldowns: { [id: string]: number } = {};
let userChannels: { [id: string]: VoiceChannel | undefined } = {};

Promise.all(
	[...(await config.guild.channels.fetch()).values()].map((c) =>
		c?.name.startsWith(userChannelPrefix) && c.type == ChannelType.GuildVoice ?
			c.delete()
		:	null,
	),
);

defineEvent("voiceStateUpdate", async (oldState, newState) => {
	if (!newState.member) return;
	if (!config.channels.vc) return;

	const { channel, member } = newState;
	if (oldState.channel?.id !== channel?.id && !member.user.bot) {
		const usrCh = userChannels[member.id];

		if (usrCh) {
			if (usrCh.id != channel?.id) {
				userChannels[member.id] = undefined;
				if ([...usrCh.members.values()].length === 0) {
					usrCh.delete("User Channel Deleted");
				} else {
					const theChosenOne = [...usrCh.members.values()][0];
					if (!theChosenOne) usrCh.delete();
					else {
						userChannels[theChosenOne.id] = usrCh;
						usrCh.setName(
							`${userChannelPrefix} ${theChosenOne.displayName}`,
							"User Channel Ownership Changed",
						);
					}
				}
			}
		}
		if (channel) {
			if (channel.id == config.channels.vc.id) {
				const cooldown = userCooldowns[member.id];
				if (!usrCh && (!cooldown || Date.now() - cooldown > cooldownLength)) {
					const usrChannel = await config.guild.channels.create({
						parent: config.channels.vc.parent?.id,
						position: config.channels.vc.position,
						name: `${userChannelPrefix} ${member.displayName}`,
						type: ChannelType.GuildVoice,
						reason: "User Channel Created",
					});
					userChannels[member.id] = usrChannel;
					// console.log(userChannels)
					// console.log("usrchanle:", userChannels[member.id]?.id)
					member.voice.setChannel(usrChannel.id);

					userCooldowns[member.id] = Date.now();
				} else {
					member.voice.disconnect();
				}
			}
		}

		return;
	}
});
