import {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	VoiceConnectionStatus,
	AudioPlayerStatus,
} from "@discordjs/voice";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import config from "../../common/config.js";
import { readdirSync } from "fs";
import { client } from "strife.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mp3Directory = "../../../musicfiles";
const files = readdirSync(path.join(__dirname, mp3Directory)).filter((file) =>
	file.endsWith(".mp3"),
);

const channel = config.channels.radio;
if (channel && files) {
	const connection = joinVoiceChannel({
		channelId: channel.id,
		guildId: channel.guild.id,
		adapterCreator: channel.guild.voiceAdapterCreator,
	});

	connection.on(VoiceConnectionStatus.Ready, async () => {
		console.log("Connected to voice channel.");
		try {
			let currentIndex = Math.floor(Math.random() * files.length);
			const player = createAudioPlayer();
			connection.subscribe(player);

			function playNext() {
				const filePath = path.join(__dirname, mp3Directory, files[currentIndex] ?? "");

				const resource = createAudioResource(filePath);
				player.play(resource);
				// console.log(`${files[currentIndex]} is now playing.`);
				updateMsg(currentIndex);
				currentIndex =
					(currentIndex + 1 + Math.floor(Math.random() * (files.length - 2))) %
					files.length;
			}

			player.on(AudioPlayerStatus.Idle, playNext);
			playNext();
		} catch (error) {
			console.error("Error:", error);
		}
		async function updateMsg(i: number) {
			const msgs = await channel?.messages.fetch({
				limit: 100,
			});
			let messgae = msgs?.find((msg) => msg.author.id == client.user.id);
			if (!messgae) {
				messgae = await channel?.send({ content: "..." });
			}

			await messgae?.edit({
				embeds: [
					{
						title: "Music Player",
						description: files
							.map(
								(file, index) =>
									`${index == i ? "<:green:1196987578881150976>" : "<:TTT:1204592236407558154>"} ${file.replace(".mp3", "").replace("_", " ").replace("-", " ")}`,
							)
							.join("\n"),
					},
				],
			});
		}
	});
}
