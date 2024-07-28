import config from "../common/config.js";
import { CloudConnection, Profile, Project, ScratchSession } from "scratchlink";
import { defineChatCommand } from "strife.js";
import { gracefulFetch } from "../util/promises.js";
import { ButtonStyle, ComponentType, userMention } from "discord.js";
// import { constants } from "";
import { handleUser } from "./auto/scratch.js";
import log, { LoggingEmojis, LogSeverity } from "./logging/misc.js";
import constants from "../common/constants.js";

if (process.env.SCRATCH_PASS) {
	defineChatCommand(
		{
			name: "test-verify",
			description: "Test the verification process to see if it workin",
		},
		async (i) => {
			let cloudStatus = true;
			const session = new ScratchSession();
			const loginSuccess = await session
				.init("YandeTest", process.env.SCRATCH_PASS ?? "")
				.then(() => true)
				.catch(() => {
					i.reply("Login Failed.");
					return false;
				});
			if (!loginSuccess) return;
			let cloud: CloudConnection;
			try {
				cloud = new CloudConnection(session, 961167982);
			} catch (error) {
				cloudStatus = false;
			}

			await session.init("YandeTest", process.env.SCRATCH_PASS ?? "");
			if (!session.auth) throw Error();
			const project = new Project(session, 961167982);

			const user = new Profile(session, session.auth?.username);
			async function testProject() {
				const res = await fetch(
					"https://scratch-coders-auth-server.vercel.app/auth/gettokens?redirect=aa&method=comment",
				);
				const json: res = await res.json();
				await project.comment(json.publicCode);
				// await wait(2000)
				const res2 = await fetch(
					"https://scratch-coders-auth-server.vercel.app/auth/verifytoken/" +
					json.privateCode,
				);
				const json2: { valid: boolean } = await res2.json();
				return { valid: json2.valid, type: "project" };
			}
			async function testComment() {
				const res = await fetch(
					"https://scratch-coders-auth-server.vercel.app/auth/gettokens?redirect=aa&method=profile-comment&username=yandetest",
				);
				const json: res = await res.json();
				await user.comment(json.publicCode);
				// await wait(2000)
				const res2 = await fetch(
					"https://scratch-coders-auth-server.vercel.app/auth/verifytoken/" +
					json.privateCode,
				);
				const json2: { valid: boolean } = await res2.json();
				return { valid: json2.valid, type: "comment" };
			}
			async function TestCloud() {
				const res = await fetch(
					"https://scratch-coders-auth-server.vercel.app/auth/gettokens?redirect=aa&method=cloud",
				);
				const json: res = await res.json();
				cloud.setVariable("cloud", json.publicCode);
				// await wait(4000)
				const res2 = await fetch(
					"https://scratch-coders-auth-server.vercel.app/auth/verifytoken/" +
					json.privateCode,
				);
				const json2: { valid: boolean } = await res2.json();
				return { valid: json2.valid, type: "cloud" };
			}

			let resolved: { [key: string]: string } =
				cloudStatus ?
					{
						project: "queued",
						comment: "queued",
						cloud: "queued",
					}
					: {
						project: "queued",
						comment: "queued",
						cloud: "error",
					};

			await i.reply({ embeds: getEmbeds(resolved) });
			const promises =
				cloudStatus ?
					[
						{ type: "comment", f: testComment },
						{ type: "project", f: testProject },
						{ type: "cloud", f: TestCloud },
					]
					: [
						{ type: "comment", f: testComment },
						{ type: "project", f: testProject },
					];

			for (const promise of promises) {
				resolved[promise.type] = "wait";
				await i.editReply({ embeds: getEmbeds(resolved) });
				const result = await promise.f();
				resolved[promise.type] = result.valid ? "true" : "false";
				await i.editReply({ embeds: getEmbeds(resolved) });
			}
		},
	);
	interface res {
		publicCode: string;
		privateCode: string;
	}

	function getEmbeds(promises: { [key: string]: string }) {
		return [
			{
				title: "Verification Test",
				fields: [
					{
						name: "Project Comments",
						value: getStatus(promises.project),
					},
					{
						name: "Profile Comments",
						value: getStatus(promises.comment),
					},
					{
						name: "Cloud",
						value: getStatus(promises.cloud),
					},
				],
			},
		];
	}

	function getStatus(status?: string) {
		const statuses = {
			wait: "<a:loading:1237879519948439583>",
			true: "<:green:1196987578881150976>",
			false: "<:icons_outage:1199113890584342628>",
			error: `<:icons_outage:1199113890584342628> Server down`,
			queued: `<:draw:1196987416939069490> Queued`,
		};
		return (
			status == "wait" ? `${statuses.wait} In Progress`
				: status == "true" ? `${statuses.true} Success`
					: status == "queued" ? `${statuses.queued} Queued`
						: status == "error" ? `${statuses.error} Cloud Server Down `
							: `${statuses.false} Failed`
		);
	}
}
if (config.roles.verified) {
	defineChatCommand(
		{
			name: "verify",
			description: "Verify with a scratch account.",
		},
		async (i) => {
			const member = await i.guild?.members.fetch(i.user);
			if (!member) throw "what the heck";
			const message = await i.reply({
				content: "Starting",
				components: [],
				fetchReply: true,
			});
			while (true) {
				
				try {
					const roles = [...member.roles.valueOf().values()].map((r) => r.id);
					if (config.roles.verified && roles.includes(config.roles.verified.id))
						return await i.editReply({ content: "You're already verified!" });
					await message.edit({
						content: "Pick a method to verify:",
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.StringSelect,
										customId: "method",
										placeholder: "Select A Method:",
										options: [
											{ label: "Cloud", value: "cloud" },
											{ label: "Project Comment", value: "comment" },
											{ label: "Profile Comment", value: "profile-comment" },
										],
									},
								],
							},
						],
					});
					const choice = await message.awaitMessageComponent({
						componentType: ComponentType.StringSelect,
						filter: (b) => b.user.id === i.user.id,
					});
					choice.deferUpdate();
					const method = choice.values[0];
					let username = "";
					let valid: any;

					if (method == "profile-comment") {
						await message.edit({
							components: [],
							content: `Send your scratch username (note: do not include anything else in your message, just your username)`,
						});
						const reply = [
							...(
								await message.channel.awaitMessages({
									filter: (m) => m.author.id === i.user.id,
									max: 1,
								})
							).values(),
						][0];
						if (!reply)
							return await message.edit({
								components: [],
								content: `no username recieved`,
							});
						username = reply.content.trim();
						await reply.delete();
						const codes = await gracefulFetch(
							`https://scratch-coders-auth-server.vercel.app/auth/gettokens?redirect=aa&method=${method}&username=${username}`,
						);
						await message.edit({
							content: `1. open [the your profile](https://scratch.mit.edu/users/${username})\n2. Paste \`${codes.publicCode}\` into your profile comments\n3. Click the button below`,
							components: [
								{
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.Button,
											customId: "finish",
											label: "Finish",
											style: ButtonStyle.Success,
										},
									],
								},
							],
						});
						await (
							await message.awaitMessageComponent({
								componentType: ComponentType.Button,
								filter: (b) => b.user.id === i.user.id,
							})
						).deferUpdate();
						await message.edit({ components: [], content: "Checking..." });
						valid = await gracefulFetch(
							`https://scratch-coders-auth-server.vercel.app/auth/verifytoken/${codes.privateCode}`,
						);
					} else {
						await message.edit({ components: [], content: `Fetching Auth Codes...` });
						const codes = await gracefulFetch(
							`https://scratch-coders-auth-server.vercel.app/auth/gettokens?redirect=aa&method=${method}`,
						);
						await message.edit({
							content: `1. open [the scratch project](https://scratch.mit.edu/projects/${codes.authProject}/)\n2. Paste \`${codes.publicCode}\` in the project${method == "comment" ? "'s comments" : ""}\n3. Click the button below`,
							components: [
								{
									type: ComponentType.ActionRow,
									components: [
										{
											type: ComponentType.Button,
											customId: "finish",
											label: "Finish",
											style: ButtonStyle.Success,
										},
									],
								},
							],
						});
						await (
							await message.awaitMessageComponent({
								componentType: ComponentType.Button,
								filter: (b) => b.user.id === i.user.id,
							})
						).deferUpdate();
						await message.edit({ components: [], content: "Checking..." });
						valid = await gracefulFetch(
							`https://scratch-coders-auth-server.vercel.app/auth/verifytoken/${codes.privateCode}`,
						);
						username = valid?.username;
					}
					if (valid?.valid && config.roles.verified) {
						await member.roles.add(config.roles.verified);
						await log(
							`${LoggingEmojis.Integration} ${userMention(
								i.user.id,
							)} linked their Scratch account [${username}](${constants.domains.scratch
							}/users/${username})`,
							LogSeverity.ServerChange,
							{ embeds: [await handleUser(["", "", username])] },
						);
						return await message.edit({ components: [], content: "Success" });
					}

				} catch (e) {console.log}
				await message.edit({
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									customId: "retry",
									label: "Try again",
									style: ButtonStyle.Success,
								},
							],
						},
					],
					content: "Something went wrong.",
				});
				await (
					await message.awaitMessageComponent({
						componentType: ComponentType.Button,
					})
				).deferUpdate();
			}
		},
	);
}
