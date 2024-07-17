import { defineChatCommand } from "strife.js";
import { addParticipant, findMatch, formatUser, removeParticipant } from "./api.js";
addParticipant
removeParticipant
findMatch


defineChatCommand({
    name:"tournament-join",
    description:"Join the RPS Tournament"
}, async (i) => {
    const result = await addParticipant(formatUser(i.user))

    i.reply(result ? "## Success\nYou have been sucessfully added to the tournament" : "## Error\nSomething went wrong when adding you to the tournament")
})


defineChatCommand({
    name:"tournament-leave",
    description:"Leave the RPS  "
}, async (i) => {
    i.deferReply()
    const result = await removeParticipant(i.user.id)

    i.editReply(result ? "## Success\nYou have been sucessfully removed from the tournament" : "## Error\nSomething went wrong when removing you from the tournament")
})