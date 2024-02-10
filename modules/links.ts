import { defineEvent } from "strife.js";

defineEvent("messageCreate", async (m) => {
   if (m.content.includes("https://discord.gg/") || m.content.includes("https://discord.com/invite/")) {
     if (!(m.member?.roles.cache.some(role => role.id === '1193758457493471253'))) {
       await m.delete()
       await m.channel.send({content: `<@${m.author.id}>, Only verified users can send discord invite links!`})
    }
}
})