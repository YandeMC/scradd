import { defineButton, defineChatCommand, defineEvent, defineModal } from "strife.js";
import {
	confirmAcceptAppeal,
	confirmRejectAppeal,
	submitAcceptAppeal,
	submitRejectAppeal,
} from "./appeals/appeals.js";
import confirmInterest, {
	confirmAcceptApp,
	confirmRejectApp,
	fillInterest,
	submitAcceptApp,
	submitInterest,
	submitRejectApp,
} from "./mod-interest.js";
import { ButtonStyle, ComponentType, type Snowflake } from "discord.js";
import config from "../../common/config.js";

export const banDates: Record<Snowflake, number> = {};
defineEvent("guildBanAdd", (ban) => {
	if (ban.guild.id === config.guild.id) banDates[ban.user.id] = Date.now();
});

defineButton("confirmInterest", confirmInterest);
defineChatCommand(
	{ name: "mod-application", description: "fill out the form for moderationr" },
	async (i) => {
		i.reply({
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Secondary,
							label: "Fill out the form",
							customId: "_confirmInterest",
						},
					],
				},
			],
		});
	},
);
defineButton("modInterestForm", fillInterest);
defineModal("modInterestForm", submitInterest);

defineButton("acceptAppeal", confirmAcceptAppeal);
defineModal("acceptAppeal", submitAcceptAppeal);
defineButton("rejectAppeal", confirmRejectAppeal);
defineModal("rejectAppeal", submitRejectAppeal);

defineButton("acceptApp", confirmAcceptApp);
defineModal("acceptApp", submitAcceptApp);
defineButton("rejectApp", confirmRejectApp);
defineModal("rejectApp", submitRejectApp);
