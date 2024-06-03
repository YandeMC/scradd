import { defineSubcommands } from "strife.js";
import Database from "../../common/database.js";
import { ApplicationCommandOptionType, GuildMember } from "discord.js";
import config from "../../common/config.js";

export const roleCategoryDB = new Database<{
    categoryid: string, children: string
}>("rolecategories")

await roleCategoryDB.init()

defineSubcommands(
    {
        name: "role-categories",
        description: "do stuff with role categories",

        subcommands: {
            "add-child": {
                description: "add a listener for a role",
                options: {
                    "parent-role": {

                        description: "the role to add when any of the children are added",
                        required: true,
                        type: ApplicationCommandOptionType.Role,
                    },
                    "child-role": {

                        description: "the role to watch for",
                        required: true,
                        type: ApplicationCommandOptionType.Role,
                    }
                }
            },
            "remove-child": {
                description: "remove a listener for a role",
                options: {
                    "parent-role": {

                        description: "the role to add when any of the children are added",
                        required: true,
                        type: ApplicationCommandOptionType.Role,
                    },
                    "child-role": {

                        description: "the role to watch for",
                        required: true,
                        type: ApplicationCommandOptionType.Role,
                    }
                }
            },
            "list": {
                description: "list all the categories and children",
                options: {}
            },
            "sync": {
                description: "list all the categories and children",
                options: {}
            }
        }
    },
    async (i, o) => {
        const sbcmd = o.subcommand
        switch (sbcmd) {
            case "add-child": {
                if (!i.memberPermissions.has("ManageRoles")) return await i.reply({ ephemeral: true, content: `# NO PERMS!!! GET OUT!!!` })
                addChild(o.options["parent-role"].id, o.options["child-role"].id)
                await i.reply({ allowedMentions: {}, content: `Added ${o.options["child-role"].toString()} as a child of ${o.options["parent-role"]}` })
                return
            }
            case "remove-child": {
                if (!i.memberPermissions.has("ManageRoles")) return await i.reply({ ephemeral: true, content: `# NO PERMS!!! GET OUT!!!` })
                removeChild(o.options["parent-role"].id, o.options["child-role"].id)
                await i.reply({ allowedMentions: {}, content: `Removed ${o.options["child-role"].toString()} as a child of ${o.options["parent-role"]}` })
                return
            }
            case "list": {
                i.reply({ content: roleCategoryDB.data.map((r) => `${`<@&${r.categoryid}>`}:\n   ${r.children?.split("/").map((r) => `<@&${r}>`)}`).join("\n\n"), allowedMentions: {} })
                return
            }
            case "sync": {
                const msg = await i.reply({ fetchReply: true, content: "Syncing Categories\nFetching Members..." })
                const steps = 100
                let lastStep = 0
                const members = [...(await config.guild.members.fetch()).values()]
                await msg.edit("Syncing Categories\n`" + createProgressBar(50, 0) + ` ${Math.round((0 / members.length) * 1000) / 10}% (${0}/${members.length})\``)
                for (let index = 0; index < members.length; index++) {
                    const member = members[index];
                    if (member)
                        await updateCategories(member)
                    if (lastStep < index) {
                        lastStep += Math.floor(members.length / steps)

                        await i.editReply("Syncing Categories\n`" + createProgressBar(50, index / members.length) + ` ${Math.round((index / members.length) * 1000) / 10}% (${index}/${members.length})\``)
                    }

                }
                await msg.edit("Syncing Categories\n`[======================Done======================>] 100%`")
            }
        }

    })



export async function updateCategories(member: GuildMember) {
    // console.log("member updated")
    const roles = [...member.roles.valueOf().values()].map(r => r.id)
    for (const role of roleCategoryDB.data) {
        try {
            if (!roles.includes(role.categoryid) == haveCommonItem(roles, role.children?.split("/")))
                if (haveCommonItem(roles, role.children?.split("/")))
                    await member.roles.add(role.categoryid).catch(void 0)
                else
                    await member.roles.remove(role.categoryid).catch(void 0)
        } catch (e) { void e }
    }
}



function getChildren(id: string) {
    return [...(roleCategoryDB.data.find((e) => e.categoryid == id)?.children.split("/") ?? [])]
}

function addChild(id: string, element: string) {
    if (getChildren(id).includes(element)) return
    const data = [...roleCategoryDB.data]
    const index = data.findIndex((e) => e.categoryid == id)
    if (index == -1)
        data.push({ categoryid: id, children: [element].join("/") })
    else
        data[index] = { categoryid: id, children: [...(data[index]?.children.split("/") ?? []), element].join("/") }
    roleCategoryDB.data = data
    // console.log(roleCategoryDB.data)
}

function removeChild(id: string, element: string) {
    const data = [...roleCategoryDB.data]
    const index = data.findIndex((e) => e.categoryid == id)
    if (index == -1)
        data.push({ categoryid: id, children: [element].join("/") })
    else
        data[index] = { categoryid: id, children: [...(data[index]?.children?.split("/") ?? [])].filter((r) => r != element).join("/") }
    data.filter((r) => r.children && r.children?.split("/").length != 0)
    roleCategoryDB.data = data
    // console.log(roleCategoryDB.data)
}

void removeChild

function haveCommonItem(arr1: any[], arr2: any[]) {
    return arr1.some((item: any) => arr2?.includes(item));
}


function createProgressBar(length: number, progress: number) {
    // Ensure progress is between 0 and 1
    if (progress < 0) progress = 0;
    if (progress > 1) progress = 1;

    // Calculate the number of filled and empty positions
    const filledLength = Math.floor(progress * length);
    const emptyLength = length - filledLength;

    // Create the progress bar string
    let bar = '[';

    // Fill the progress bar with '=' and '-'
    for (let i = 0; i < filledLength; i++) {
        if (i === filledLength - 1) {
            bar += '>';
        } else {
            bar += '=';
        }
    }
    for (let i = 0; i < emptyLength; i++) {
        bar += ' ';
    }

    bar += ']';

    return bar;
}