import { ButtonInteraction, ButtonStyle, ChannelType, ComponentType, GuildMember, TextInputStyle, VoiceChannel } from "discord.js";
import config from "../common/config.js";
import { defineButton, defineEvent, defineSelect } from "strife.js";
import tryCensor from "./automod/misc.js";
import warn from "./punishments/warn.js";
import { joinWithAnd } from "../util/text.js";

export const userChannelPrefix = "🔹";
const cooldownLength = 10000;
let userCooldowns: { [id: string]: number } = {};
let userChannels: { [id: string]: UserChannel | undefined } = {};
type UserChannel = { channel: VoiceChannel, banned: GuildMember[], muted: GuildMember[], deafend: GuildMember[] }
Promise.all(
	[...(await config.guild.channels.fetch()).values()].map((c) =>
		c?.name.startsWith(userChannelPrefix) && c.type == ChannelType.GuildVoice ?
			c.delete()
			: null,
	),
);

defineEvent("voiceStateUpdate", async (oldState, newState) => {
	if (!newState.member) return;
	if (!config.channels.vc) return;

	const { channel, member } = newState;
	if (oldState.channel?.id !== channel?.id && !member.user.bot) {
		const usrCh = userChannels[member.id];

		if (usrCh) {
			if (usrCh.channel.id != channel?.id) {
				userChannels[member.id] = undefined;
				if ([...usrCh.channel.members.values()].length === 0) {
					usrCh.channel.delete("User Channel Deleted");
				} else {
					const theChosenOne = [...usrCh.channel.members.values()][0];
					if (!theChosenOne) usrCh.channel.delete("User Channel Deleted");
					else {
						userChannels[theChosenOne.id] = usrCh;
						usrCh.channel.setName(
							`${userChannelPrefix} ${theChosenOne.displayName}`,
							"User Channel Ownership Changed",
						);
						await usrCh.channel.send({
							content: `${theChosenOne.toString()} Is now the channel owner!`
						})
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
					await usrChannel.send({
						content: `${member.toString()}, Welcome to your **temporary voice channel**`,
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.MentionableSelect,
										customId: "selectuser_userchannel",
										placeholder: "Kick, Ban, or Transfer Ownership"

									}
								]
							},
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										customId: "edit_userchannel",
										label: "Edit Channel Settings",
										style: ButtonStyle.Primary

									}
								]
							}
						]
					})
					userChannels[member.id] = { channel: usrChannel, banned: [], muted: [], deafend: [] };
					// console.log(userChannels)
					// console.log("usrchanle:", userChannels[member.id]?.id)
					member.voice.setChannel(usrChannel.id);

					userCooldowns[member.id] = Date.now();
				} else {
					member.voice.disconnect();
				}
			} else if (channel.name.startsWith(userChannelPrefix)) {
				////is user channel
				const userChannel = Object.values(userChannels).find((uch) => uch?.channel.id == channel.id)
				if (!userChannel) return await channel.delete("User Channel Deleted") // ghost channel
				if (userChannel.banned.some((u) => u.id == member.id)) await member.voice.disconnect()

			}
		}

		return;
	}
});

defineSelect("userchannel", async (select) => {
	if (!select.isMentionableSelectMenu()) return await select.reply({ ephemeral: true, content: ":x:" })
	const target = select.users.first()
	const user = select.member
	const userChannel = userChannels[select.user.id]

	if (!(user instanceof GuildMember)) return await select.reply({ ephemeral: true, content: ":x: `user` is not instance of `GuildMember`!" })
	if (!target) return await select.reply({ ephemeral: true, content: "Select a user!" })
	if (!userChannel) return await select.reply({ ephemeral: true, content: "You can't edit this channel!" })
	if (userChannel.channel.id !== user.voice.channel?.id) return await select.reply({ ephemeral: true, content: "You can't edit this channel!" })
	if (user.voice.channel?.id !== select.channel?.id) return await select.reply({ ephemeral: true, content: "You can't edit this channel!" })
	const buttons = [...[
		{
			type: ComponentType.Button,
			label: `${userChannel.banned.some((u) => u.id == target.id) ? "Unb" : "B"}an`,
			customId: `${userChannel.banned.some((u) => u.id == target.id) ? "un" : ""}ban/${target.id}_userchannel`,
			style: ButtonStyle.Danger
		},
		...(userChannel.channel.members.some((u) => u.id == target.id) ? [{
			type: ComponentType.Button,
			label: "Kick",
			customId: `kick/${target.id}_userchannel`,
			style: ButtonStyle.Danger
		}] as const : []),
		//! i have no freakin clue on how to do this well
		//todo figure out how to do it well 
		//~ and i mean well
		// {
		// 	type: ComponentType.Button,
		// 	label: `${userChannel.banned.some((u) => u.id == target.id) ? "Unm" : "M"}ute`,
		// 	customId: `${userChannel.banned.some((u) => u.id == target.id) ? "un" : ""}mute/${target.id}_userchannel`,
		// 	style: ButtonStyle.Danger
		// },
		// {
		// 	type: ComponentType.Button,
		// 	label: `${userChannel.banned.some((u) => u.id == target.id) ? "Und" : "D"}eafen`,
		// 	customId: `${userChannel.banned.some((u) => u.id == target.id) ? "un" : ""}deafen/${target.id}_userchannel`,
		// 	style: ButtonStyle.Danger
		// },

		...(userChannel.channel.members.some((u) => u.id == target.id) ? [{
			type: ComponentType.Button,
			label: "Transfer ownership",
			customId: `transfer/${target.id}_userchannel`,
			style: ButtonStyle.Danger
		}] as const : []),
	]] as const
	await select.reply({
		ephemeral: true,
		content: `What would you like to do with ${target.toString()}?`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: buttons
			}
		]
	})
})

defineButton("userchannel", async (button) => {

	const user = button.member
	const userChannel = userChannels[button.user.id]


	if (!(user instanceof GuildMember)) return await button.reply({ ephemeral: true, content: ":x: `user` is not instance of `GuildMember`!" })

	if (!userChannel) return await button.reply({ ephemeral: true, content: "You can't edit this channel!" })
	if (userChannel.channel.id !== user.voice.channel?.id) return await button.reply({ ephemeral: true, content: "You can't edit this channel!" })
	if (user.voice.channel?.id !== button.channel?.id) return await button.reply({ ephemeral: true, content: "You can't edit this channel!" })
	const buttonId = button.customId.split("_")[0]

	if (buttonId == "edit") return await editChannel(button, userChannel)

	const [action, userId] = buttonId.split("/")

	const target = await button.guild?.members.fetch(userId ?? "").catch(() => undefined)
	if (!target) return await button.reply({ ephemeral: true, content: ":x: Target not found." })

	switch (action) {
		case "ban": {
			if (userChannel.banned.some((u) => u.id === target.id)) return await button.reply({
				ephemeral: true,
				content: `${target.toString()} Is already banned from your channel!`
			})
			userChannel.banned.push(target)
			if (target.voice.channel?.id == userChannel.channel.id) await target.voice.disconnect()
			await button.reply({
				ephemeral: true,
				content: `${target.toString()} Banned from your channel successfully.`
			})
		} break
		case "unban": {
			if (!userChannel.banned.some((u) => u.id === target.id)) return await button.reply({
				ephemeral: true,
				content: `${target.toString()} Isnt banned from your channel!`
			})
			userChannel.banned = userChannel.banned.filter((b) => b.id !== target.id)

			await button.reply({
				ephemeral: true,
				content: `${target.toString()} Unbanned from your channel successfully.`
			})
		} break
		case "kick": {
			if (target.voice.channel?.id == userChannel.channel.id) {
				await target.voice.disconnect()
				await button.reply({
					ephemeral: true,
					content: `${target.toString()} Kicked from your channel successfully.`
				})
			} else await button.reply({
				ephemeral: true,
				content: `${target.toString()} Isnt in your channel!`
			})
		} break
		case "transfer": {
			if (target.voice.channel?.id !== userChannel.channel.id) return await button.reply({
				ephemeral: true,
				content: `${target.toString()} Isnt in your channel!`
			})
			userChannels[user.id] = undefined;
			userChannels[target.id] = userChannel;
			userChannel.channel.setName(
				`${userChannelPrefix} ${target.displayName}`,
				"User Channel Ownership Changed",
			);

			await button.reply({
				content: `${target.toString()} Is now the channel owner!`
			})

		} break
		default: {
			await button.reply({
				ephemeral: true,
				content: `:x: action ${action} is invalid!`
			})
		}
	}
})

async function editChannel(button: ButtonInteraction, userChannel: UserChannel) {
	// button.showModal(	)

	const modal =
		{
			customId: "editUserChannel",
			title: "Edit User Channel",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							customId: "name",
							label: "Channel Name",
							style: TextInputStyle.Short,
							type: ComponentType.TextInput,
							maxLength: 20,
							value: userChannel.channel.name.split("").slice(userChannelPrefix.length).join("").trim(),
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							customId: "slowmode",
							label: "Slowmode Cooldown (ex: 4s)",
							style: TextInputStyle.Short,
							type: ComponentType.TextInput,
							maxLength: 10,
							value: formatSeconds(userChannel.channel.rateLimitPerUser ?? 0),
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							customId: "bitrate",
							label: "Bitrate (8 - 96)kbps",
							style: TextInputStyle.Short,
							type: ComponentType.TextInput,
							maxLength: 2,
							value: (userChannel.channel.bitrate / 1000).toString(),
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							customId: "limit",
							label: "User Limit (0 (none) - 99) Users",
							style: TextInputStyle.Short,
							type: ComponentType.TextInput,
							maxLength: 2,
							value: userChannel.channel.userLimit.toString(),
						},
					],
				},
			],
		} as const
	await button.showModal(modal)
	const submit = await button.awaitModalSubmit({ time: 0 })
	//~ lol help me
	submit.deferUpdate()
	const changed = findChangedValues({ ...modal as any }, submit as any)
	for (let change of changed) {
		switch (change.customId) {
			case "name": {
				const censored = tryCensor(change.value)
				if (censored) {
					await warn(button.user, `Set User Channel name to ${change.value}`, censored.strikes, `Used banned words\n${joinWithAnd(censored.words.flat())}`)
					break
				}
				await userChannel.channel.setName(`${userChannelPrefix} ${change.value}`)
				await userChannel.channel.send(`Name set to ${change.value}`)
			} break
			case "slowmode": {
				const time = parseTimeToSeconds(change.value)

				await userChannel.channel.setRateLimitPerUser(time).then(() => userChannel.channel.send(`Slowmode set to ${change.value}(${time} secs)`)).catch(() => userChannel.channel.send(`Failed to set slowmode to ${change.value}(${time} secs)`))

			} break
			case "bitrate": {
				await userChannel.channel.setBitrate(+change.value * 1000).then(() => userChannel.channel.send(`Slowmode set to ${change.value} kbps (${+change.value * 1000} bps)`)).catch(() => userChannel.channel.send(`Failed to set bitrate to ${change.value} kbps (${+change.value * 1000} bps)`))

			} break
			case "limit": {
				await userChannel.channel
					.setUserLimit(+change.value)
					.then(() => userChannel.channel.send(`User limit set to ${change.value} users `))
					.catch(() => userChannel.channel.send(`Failed to set user limit to ${change.value} users `))

			} break
		}

	}
}

function formatSeconds(seconds: number): string {
	const days = Math.floor(seconds / (24 * 60 * 60));
	seconds %= 24 * 60 * 60;

	const hours = Math.floor(seconds / (60 * 60));
	seconds %= 60 * 60;

	const minutes = Math.floor(seconds / 60);
	seconds %= 60;

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

	return parts.join('');
}


function findChangedValues(input1: {
	components: {
		components: {
			customId: string;
			value: string;
		}[];
	}[];
}, input2: {
	components: {
		components: {
			customId: string;
			value: string;
		}[];
	}[];
}): { customId: string; value: string }[] {
	const differences: { customId: string; value: string }[] = [];

	const map1 = new Map(input1.components.flatMap((c: { components: { customId: any; value: any; }[]; }) => c.components.map((comp: { customId: any; value: any; }) => [comp.customId, comp.value])));
	const map2 = new Map(input2.components.flatMap((c: { components: { customId: any; value: any; }[]; }) => c.components.map((comp: { customId: any; value: any; }) => [comp.customId, comp.value])));

	for (const [customId, value] of map2) {
		if (map1.get(customId) !== value) {
			differences.push({ customId, value });
		}
	}

	return differences;
}

export function parseTimeToSeconds(time: string): number {
	const number = Number(time);

	if (!Number.isNaN(number)) {
		return number;
	}

	const timeUnitsRegex = new RegExp(
		/(?:(?<hours>\d+|\d+\.\d*)\s*h(?:(?:ou)?rs?)?\s*)?\s*/.source +
		/(?:(?<minutes>\d+|\d+\.\d*)\s*m(?:in(?:ute)?s?)?\s*)?\s*/.source +
		/(?:(?<seconds>\d+|\d+\.\d*)\s*s(?:ec(?:ond)?s?)?)?\s*$/.source,
		"i"
	);

	const {

		hours = 0,
		minutes = 0,
		seconds = 0,
	} = timeUnitsRegex.exec(time)?.groups ?? {};

	const totalSeconds =
		(+hours * 60 * 60) +
		(+minutes * 60) +
		(+seconds);

	return totalSeconds;
}
