import { CloudConnection, Profile, Project, ScratchSession } from "scratchlink";
import { defineChatCommand } from "strife.js";

if (process.env.SCRATCH_PASS) {
	let status = true;
	const session = new ScratchSession();
	await session.init("YandeTest", process.env.SCRATCH_PASS).catch(console.error);
	let cloud: CloudConnection;
	try {
		cloud = new CloudConnection(session, 961167982);
	} catch (error) {
		status = false;
	}

	if (status) {
		await session.init("YandeTest", process.env.SCRATCH_PASS);
		if (!session.auth) throw Error();
		const project = new Project(session, 961167982);

		const user = new Profile(session, session.auth?.username);

		defineChatCommand(
			{
				name: "test-verify",
				description: "Test the verification process to see if it workin",
			},
			async (i) => {
				let resolved: { [key: string]: string } = {
					project: "queued",
					comment: "queued",
					cloud: "queued",
				};

				await i.reply({ embeds: getEmbeds(resolved) });
				const promises = [
					{ type: "comment", f: testComment },
					{ type: "project", f: testProject },
					{ type: "cloud", f: TestCloud },
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
				: `${statuses.false} Failed`
			);
		}
	} else {
		await session.init("YandeTest", process.env.SCRATCH_PASS);
		if (!session.auth) throw Error();
		const project = new Project(session, 961167982);
		const user = new Profile(session, session.auth?.username);

		defineChatCommand(
			{
				name: "test-verify",
				description: "Test the verification process to see if its workin",
			},
			async (i) => {
				let resolved: { [key: string]: string } = {
					project: "queued",
					comment: "queued",
					cloud: "error",
				};

				await i.reply({ embeds: getEmbeds(resolved) });
				await i.reply({ embeds: getEmbeds(resolved) });
				const promises = [
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

		async function testProject() {
			const res = await fetch(
				"https://scratch-coders-auth-server.vercel.app/auth/gettokens?redirect=aa&method=comment",
			);
			try {
				const json: res = await res.json();
				await project.comment(json.publicCode);
				// await wait(2000)
				const res2 = await fetch(
					"https://scratch-coders-auth-server.vercel.app/auth/verifytoken/" +
						json.privateCode,
				);
				const json2: { valid: boolean } = await res2.json();
				return { valid: json2.valid, type: "project" };
			} catch (error) {
				return { valid: false, type: "project" };
			}
		}
		async function testComment() {
			try {
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
			} catch (error) {
				return { valid: false, type: "comment" };
			}
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
				: status == "error" ? `${statuses.error}`
				: `${statuses.false} Failed`
			);
		}
	}
}
