
import { ButtonStyle, ComponentType, type RepliableInteraction, type User } from "discord.js";
import { getSponges, giveSponges } from "./give-sponges.js";
import { addTransaction } from "./util.js";

//we dont need tests where were going/spo
export async function pay(interaction: RepliableInteraction, user: User, amount: number) {
    if (0 >= amount) return await interaction.reply({ ephemeral: true, content: "please put in a number more than 0" })
    if (user.id == interaction.user.id) return await interaction.reply({ ephemeral: true, content: "cant pay yourself sorry" })
    if (getSponges(interaction.user) < amount) return await interaction.reply({ ephemeral: true, content: "u too poor" })
    if (user.bot) return await interaction.reply({ ephemeral: true, content: "cant pay bots" })
    const message = await interaction.reply({
        fetchReply: true, ephemeral: true, content: "", embeds: [{
            title: 'Confirm Payment',
            description: `Confirm payment to <@${user.id}> ${amount} 🧽? this action is **IRRIVERSABLE**`,
            color:0xff0000
        }], components: [
            {
                components: [
                    {
                        type: ComponentType.Button,
                        customId: `confirm`,
                        label: "Confirm",
                        style: ButtonStyle.Danger,
                    },
                    {
                        type: ComponentType.Button,
                        customId: `decline`,
                        label: "Decline",
                        style: ButtonStyle.Secondary,
                    },
                ],
                type: ComponentType.ActionRow,
            },
        ],
    })
    const ans = await message
        .awaitMessageComponent({
            componentType: ComponentType.Button,
        })

    switch (ans.customId) {
        case "confirm": {
            await giveSponges(user, amount)
            await giveSponges(interaction.user, -amount)
            await interaction.editReply({ components: [],embeds: [{
                title: 'Payment Confirmed',
                description: `You paid <@${user.id}> ${amount} 🧽`,
                color:0xff0000
            }], content: "" })
            await user.send(`<@${interaction.user.id}> paid you ${amount} 🧽`).catch(() => interaction.followUp({ephemeral:true, content:"DM failed to send"}))
            addTransaction(interaction.user.id, "Pay", amount, user.id)
            return
        }
        case "decline": {
            await interaction.editReply({ components: [],embeds: [{
                title: 'Payment Declined',
                description: `You declined to pay <@${user.id}> ${amount} 🧽`,
                color:0xff0000
            }], content: "" })
            return
        }

    }


}