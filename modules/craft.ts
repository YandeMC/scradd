// import constants from "../common/constants.js";
import Database from "../common/database.js";
import {
	ApplicationCommandOptionType,
	AutocompleteInteraction,
	ComponentType,
	TextInputStyle,
	type Snowflake,
} from "discord.js";
import { matchSorter } from "match-sorter";
import { defineSubcommands } from "strife.js";

export const elementDB = new Database<{
	name: string;
	id: string;
	recipie?: string;
	discoverer?: string;
}>("elements");

await elementDB.init();
export const ownedElementDB = new Database<{
	user: Snowflake;
	elements: string;
}>("playerelements");

await ownedElementDB.init();

const searchOptions = {
	keys: [
		({ name }: (typeof elementDB.data)[number]) => name.replaceAll("-", " "),
		({ id }: (typeof elementDB.data)[number]) => id,
		({ discoverer }: (typeof elementDB.data)[number]) => discoverer ?? "",
	],
};
defineSubcommands(
	{
		name: "craft",
		description: "Infinite Craft in discord",

		subcommands: {
			combine: {
				description: "combine 2 elements",
				options: {
					a: {
						autocomplete(interaction: AutocompleteInteraction) {
							return matchSorter(
								elementDB.data.filter((e) =>
									getOwnerships(interaction.user.id).includes(e.name),
								),
								interaction.options.getString("a") ?? "",
								searchOptions,
							).map((element) => ({ name: element.name, value: element.name }));
						},
						description: "element 1",
						required: true,
						type: ApplicationCommandOptionType.String,
					},
					b: {
						autocomplete(interaction: AutocompleteInteraction) {
							return matchSorter(
								elementDB.data.filter((e) =>
									getOwnerships(interaction.user.id).includes(e.name),
								),
								interaction.options.getString("b") ?? "",
								searchOptions,
							).map((element) => ({ name: element.name, value: element.name }));
						},
						description: "element 2",
						required: true,
						type: ApplicationCommandOptionType.String,
					},
				},
			},
		},
	},
	async (i, o) => {
		const sbcmd = o.subcommand;
		switch (sbcmd) {
			case "combine": {
				return i.reply("not implimented yet");
				//@ts-ignore
				const a = o.options.a;
				const b = o.options.b;
				const crafted = getElements().find(
					(element) =>
						(element.recipie?.[0] == a && element.recipie?.[1] == b) ||
						(element.recipie?.[0] == b && element.recipie?.[1] == a),
				);
				if (!crafted) {
					await i.showModal({
						customId: "SubmitElement",
						title: "Submit New Element",
						components: [
							{
								components: [
									{
										customId: "name",
										label: `${a} + ${b} = `,
										style: TextInputStyle.Short,
										type: ComponentType.TextInput,
									},
								],

								type: ComponentType.ActionRow,
							},
						],
					});
					const submit = await i.awaitModalSubmit({ time: 1000 * 60 * 60 }).catch(void 0);
					submit.deferUpdate();
					elementDB.data = [
						...elementDB.data,
						{
							name: submit.fields.getTextInputValue("name"),
							id: elementDB.data.reduce((p, c): any => {
								return +p < +c.id ? c.id : p;
							}, "0"),
							recipie: JSON.stringify([a, b]),
						},
					];
				}
				if (crafted) addOwnership(i.user.id, crafted?.name ?? "");
				i.reply(`element: ${crafted?.name}`);
			}
		}
	},
);

function getElements() {
	return elementDB.data.map((e) => ({
		...e,
		recipie: JSON.parse(e.recipie ?? "[]") as [string, string] | undefined,
	}));
}

function getOwnerships(id: string) {
	return [
		"air",
		"fire",
		"water",
		"earth",
		...(ownedElementDB.data.find((e) => e.user == id)?.elements.split("/") ?? []),
	];
}

function addOwnership(id: string, element: string) {
	if (getOwnerships(id).includes(element)) return;
	// console.log(`giving ${id} ${element}`)
	const data = [...ownedElementDB.data];
	const index = data.findIndex((e) => e.user == id);
	if (index == -1) data.push({ user: id, elements: [element].join("/") });
	else
		data[index] = {
			user: id,
			elements: [...(data[index]?.elements.split("/") ?? []), element].join("/"),
		};
	ownedElementDB.data = data;
	// console.log(ownedElementDB.data)
}
