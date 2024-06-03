import constants from "../common/constants.js";
import config from "../common/config.js";
import { ApplicationCommandOptionType, TimestampStyles, time } from "discord.js";
import { client, defineChatCommand } from "strife.js";
import { parseTime } from "../util/numbers.js";
import { remindersDatabase, SpecialReminders } from "./reminders/misc.js";
import queueReminders from "./reminders/send.js";

defineChatCommand({
    name: "lock",
    description: "Lock The Channel",
    options: {
        duration: {
            type: ApplicationCommandOptionType.String,
            description: "for how long",
            required: false
        }
    },
    restricted: true
}, async (i, options) => {
    if (!i.memberPermissions.has("ManageChannels")) return i.reply({ ephemeral: true, content: "You Do Not Have The Permissions" })
    const date = options.duration ? parseTime(options.duration) : null;
    if (date) if (+date < Date.now() + 3_000 || +date > Date.now() + 60 * 60 * 24 * 2000) {
        return await i.reply({
            ephemeral: true,
            content: `${constants.emojis.statuses.no} Could not parse the time! Make sure to pass in the value as so: \`1h30m\`, for example. Note that I can’t lock channels sooner than 4 seconds or later than 2 days.`,
        });
    }

    const channel = await i.channel?.fetch()
    if (!channel?.isTextBased()) return
    if (channel.isThread()) return await i.reply({ ephemeral: true, content: "you cannot lock a thread using this command, use the right click menu instead." })
    if (!config.roles.verifiedPerms) return i.reply({ ephemeral: true, content: "Verified Perms Role Does Not Exist." })
    const talkPerms = channel.permissionsFor(config.roles.verifiedPerms).has("SendMessages")
    if (talkPerms)
        await channel.permissionOverwrites.edit(config.roles.verifiedPerms, { SendMessages: false, AddReactions: false, CreatePublicThreads: false })
    else
        await channel.permissionOverwrites.edit(config.roles.verifiedPerms, { SendMessages: true, AddReactions: true, CreatePublicThreads: true })

    if (date) {
        remindersDatabase.data = [
            ...remindersDatabase.data,
            {
                channel: `${channel.id}`,
                date: +date,
                id: SpecialReminders.LockChannel,
                user: client.user.id,
            },
        ];
        await queueReminders();
    }
    await i.reply(`${constants.emojis.statuses.yes} ${talkPerms ? "Locked" : "Unlocked"} ${channel.toString()}${date ? ` until ${time(
        Math.floor(+date / 1000),
        TimestampStyles.RelativeTime,
    )}` : ""}`)
})