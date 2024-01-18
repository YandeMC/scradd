import {
	ButtonStyle,
	type ChatInputCommandInteraction,
	type GuildMember,
	type User,
	ComponentType,
	ButtonInteraction,
} from 'discord.js';
let games = {} as any;
let emojis:any = {
	'draw': '<:draw:1196987416939069490>',//draw
	'p1': '<:blurple:1196987629703536640>',//player1 wins
	'p2': '<:green:1196987578881150976>',//player2 wins
	'r': ':rock:',//rock
	'p': ':scroll:',//paper
	's': ':scissors:',//sisors
	'-': '<:notplayed:1196937672774656113>',//not played
	'/': '<:yes:1193656129750847488>',//waiting for other user
};
export default async function rps(
	interaction: ChatInputCommandInteraction<'cached' | 'raw'>,
	options: {
		opponent?: GuildMember | User;
		rounds?: number;
	},
) {
	const message = await interaction.reply({
		embeds: [{ title: 'Starting game...' }],
		fetchReply: true,
	});

	games[interaction.id] = {
		players: [interaction.member.user, options.opponent],
		ids: [interaction.member.user.id, options.opponent?.id],
		round: 1,
		totalRounds: options.rounds || 2,
		choices: Array.from({ length: options.rounds || 2 }, () => [emojis['-'], emojis['-']]),
		results: Array.from({ length: options.rounds || 2 }, () => emojis['-']),
	};

	message.edit({
		embeds: [
			{
				fields: [
					{
						name: `${emojis["p1"]}${games[interaction.id].players[0].displayName}`,
						value: `${games[interaction.id].choices
							.map((arr: any[]) => arr[0])
							.join('\n').replace()}`,
						inline: true,
					},
					{
						name: 'VS.',
						value: `${games[interaction.id].results.join('\n')}`,
						inline: true,
					},
					{
						name: `${emojis["p2"]}${games[interaction.id].players[1].displayName}`,
						value: `${games[interaction.id].choices
							.map((arr: any[]) => arr[1])
							.join('\n')}`,
						inline: true,
					},
				],
				author: {
					name: 'RPS',
				},
			},
		],
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: 'r',
						style: ButtonStyle.Success,
						customId: `r-${interaction.id}`,
					},
					{
						type: ComponentType.Button,
						label: 'p',
						customId: `p-${interaction.id}`,
						style: ButtonStyle.Danger,
					},
					{
						type: ComponentType.Button,
						label: 's',
						customId: `s-${interaction.id}`,
						style: ButtonStyle.Primary,
					},
				],
			},
		],
	});
	console.log(games);
	message
		.createMessageComponentCollector({
			componentType: ComponentType.Button,
		})
		.on('collect', async (button: ButtonInteraction) => {
            if (button.customId.split('-')[1] != interaction.id) return
            
			const currentRound = games[interaction.id].round - 1;
			const playerIdx = games[interaction.id].ids.indexOf(button.member?.user.id);
			if (games[interaction.id]?.choices[currentRound][playerIdx] != emojis['-']) {
				return await button.reply({
					ephemeral: true,
					content: 'you already played this round',
				});
			}
			await button.reply({ephemeral:true, content: `playing`});
			games[interaction.id].choices[currentRound][playerIdx] = emojis[button.customId.split('-')[0]];
			
			const player1Choices: Array<any> = games[interaction.id].choices.map(
				(arr: any[]) => arr[0],
			);
			const player2Choices: Array<any> = games[interaction.id].choices.map(
				(arr: any[]) => arr[1],
			);
			const player1Choice = player1Choices[currentRound];
			const player2Choice = player2Choices[currentRound];
			
			if (!(player1Choice == emojis['-'] || player2Choice == emojis['-'])) {
				//both players chose
				games[interaction.id].results[currentRound] = emojis[checkWinner(
					player1Choice,
					player2Choice,
				)];
				if (games[interaction.id].round >= games[interaction.id].totalRounds) {
					let counter: any = {};
					const arr = games[interaction.id].results;

					arr.forEach((ele: string | number) => {
						if (counter[ele]) {
							counter[ele] += 1;
						} else {
							counter[ele] = 1;
						}
					});
					let result;
					if ((counter[emojis['p1']] == counter[emojis['p2']])) {
						result = 'Draw';
					} else if (counter[emojis['p1']] > counter[emojis['p2']]) {
						result = games[interaction.id].players[0].displayName + ' Wins';
					} else {
						result = games[interaction.id].players[1].displayName + ' Wins';
					}
					let finalEmbed = editEmbed(interaction, player1Choices, player2Choices);
					await message.edit({ components: [], embeds: finalEmbed });
					await message.reply(result);
					return games[interaction.id] = null;
				}
				games[interaction.id].round += 1;
			} else {
				if (player1Choice != emojis['-']) player1Choices[currentRound] = emojis['/'];
				if (player2Choice != emojis['-']) player2Choices[currentRound] = emojis['/'];
			}
			await message.edit({ embeds: editEmbed(interaction, player1Choices, player2Choices) });
		});
}

function checkWinner(p1: any, p2: any) {
	let outcomes: any = {
	};
    outcomes[emojis["r"] + emojis["r"]] = "draw"
    outcomes[emojis["p"] + emojis["p"]] = "draw"
    outcomes[emojis["s"] + emojis["s"]] = "draw"
    outcomes[emojis["p"] + emojis["r"]] = "p1"
    outcomes[emojis["r"] + emojis["s"]] = "p1"
    outcomes[emojis["s"] + emojis["p"]] = "p1"
    outcomes[emojis["r"] + emojis["p"]] = "p2"
    outcomes[emojis["s"] + emojis["r"]] = "p2"
    outcomes[emojis["p"] + emojis["s"]] = "p2"

	return outcomes[p1 + p2];
}

function editEmbed(interaction: ChatInputCommandInteraction, p1c: Array<any>, p2c: Array<any>) {
	return [
		{
			fields: [
				{
					name: `${emojis["p1"]}${games[interaction.id].players[0].displayName}`,
					value: `${p1c.join('\n')}`,
					inline: true,
				},
				{
					name: 'VS.',
					value: `${games[interaction.id].results.join('\n')}`,
					inline: true,
				},
				{
					name: `${emojis["p2"]}${games[interaction.id].players[1].displayName}`,
					value: `${p2c.join('\n')}`,
					inline: true,
				},
			],
			author: {
				name: 'RPS',
			},
			footer: {
				text: '',
			},
		},
	];
}
