import mongoose, { Document, Schema } from "mongoose";
import { client } from "strife.js";
import {
	ChannelType,
	ThreadAutoArchiveDuration,
	type Snowflake,
	type TextBasedChannel,
} from "discord.js";
import config from "./config.js";

let timeouts: Record<
	Snowflake,
	{ callback(): Promise<void>; timeout: NodeJS.Timeout } | undefined
> = {};

const threadName = "databases";
export const databaseThread =
	(await config.channels.modlogs.threads.fetch()).threads.find(
		(thread) => thread.name === threadName,
	) ??
	(await config.channels.modlogs.threads.create({
		name: threadName,
		reason: "For databases",
		type: ChannelType.PrivateThread,
		invitable: false,
		autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
	}));

// Define Mongoose schema and model for storing databases
interface DatabaseDoc extends Document {
	name: string;
	data: Record<string, any>[];
	extra: string;
}

const databaseSchema = new Schema<DatabaseDoc>({
	name: { type: String, required: true, unique: true },
	//@ts-ignore will fix later
	data: { type: Array, default: [] },
	extra: { type: String, default: "" },
});

const DatabaseModel = mongoose.model<DatabaseDoc>("Database", databaseSchema);

const constructed: string[] = [];

export default class Database<Data extends Record<string, boolean | number | string | null>> {
	#model: mongoose.Model<DatabaseDoc>;
	#doc: DatabaseDoc | undefined;

	constructor(public name: string) {
		if (constructed.includes(name)) {
			throw new RangeError(
				`Cannot create a second database for ${name}, they will have conflicting data`,
			);
		}
		constructed.push(name);
		this.#model = DatabaseModel;
	}

	async init(): Promise<void> {
		if (this.#doc) return;
		//@ts-ignore will fix later
		this.#doc = await this.#model.findOne({ name: this.name }).exec();

		if (!this.#doc) {
			this.#doc = new this.#model({ name: this.name });
			await this.#doc.save();
		}
	}

	get data(): readonly Data[] {
		if (!this.#doc) throw new ReferenceError("Must call `.init()` before reading `.data`");
		return this.#doc.data as Data[];
	}
	set data(content: readonly Data[]) {
		if (!this.#doc) throw new ReferenceError("Must call `.init()` before setting `.data`");
		//@ts-ignore will fix later
		this.#doc.data = content;
		this.#queueWrite();
	}

	get extra(): string | undefined {
		if (!this.#doc) throw new ReferenceError("Must call `.init()` before reading `.extra`");
		return this.#doc.extra;
	}
	set extra(content: string | undefined) {
		if (!this.#doc) throw new ReferenceError("Must call `.init()` before setting `.extra`");
		this.#doc.extra = content ?? "";
		this.#queueWrite();
	}

	updateById<
		Overwritten extends Partial<Data>,
		DefaultKeys extends Extract<
			{
				[P in keyof Data]: Data[P] extends undefined ? never
				: Overwritten[P] extends Data[P] ? never
				: P;
			}[keyof Data],
			keyof Data
		>,
	>(
		newData: Data["id"] extends string ? Overwritten : never,
		oldData?: NoInfer<Partial<Data> & { [P in DefaultKeys]: Data[P] }>,
	): void {
		const data = [...this.data];
		const index = data.findIndex((suggestion) => suggestion.id === newData.id);
		const suggestion = data[index];
		if (suggestion) data[index] = { ...suggestion, ...newData };
		else if (oldData) data.push({ ...oldData, ...newData } as unknown as Data);

		this.data = data;
	}

	#queueWrite(): void {
		if (!this.#doc) {
			throw new ReferenceError(
				"Must call `.init()` before reading or setting `.data` or `.extra`",
			);
		}

		const timeoutId = timeouts[this.#doc.id];

		const callback = async (): Promise<void> => {
			if (!this.#doc) {
				throw new ReferenceError(
					"Must call `.init()` before reading or setting `.data` or `.extra`",
				);
			}

			await this.#doc.save();
			timeouts[this.#doc.id] = undefined;
		};

		timeouts[this.#doc.id] = { timeout: setTimeout(callback, 15_000), callback };
		if (timeoutId) clearTimeout(timeoutId.timeout);
	}
}

export async function cleanListeners(): Promise<void> {
	const count = Object.values(timeouts).length;
	console.log(
		`Cleaning ${count} listener${count === 1 ? "" : "s"}: ${Object.keys(timeouts).join(",")}`,
	);
	await Promise.all(Object.values(timeouts).map((info) => info?.callback()));
	console.log("Listeners cleaned");
	timeouts = {};
}

export async function prepareExit(): Promise<void> {
	await cleanListeners();
	client.user.setStatus("dnd");
	await client.destroy();
}

let called = false,
	exited = false;
for (const [event, code] of Object.entries({
	exit: undefined,
	beforeExit: 0,
	SIGHUP: 12,
	SIGINT: 130,
	SIGTERM: 143,
	SIGBREAK: 149,
	message: 0,
} as const)) {
	// eslint-disable-next-line @typescript-eslint/no-loop-func
	process.on(event, (message) => {
		if (called || (event === "message" && message !== "shutdown")) return;
		called = true;

		function doExit(): void {
			if (exited) return;
			exited = true;

			if (event !== "exit") process.nextTick(() => process.exit(code));
		}

		if (event !== "exit" && Object.values(timeouts).length) {
			void prepareExit().then(() => {
				process.nextTick(doExit);
			});
			setTimeout(doExit, 30_000);
		} else {
			void prepareExit();
			doExit();
		}
	});
}

export async function backupDatabases(channel: TextBasedChannel): Promise<void> {
	if (process.env.NODE_ENV !== "production") return;

	const databases = await DatabaseModel.find({});
	const attachments = databases.map((database) => ({
		attachment: Buffer.from(JSON.stringify(database.data), "utf8"),
		name: `${database.name}.${process.env.NODE_ENV == "production" ? "scrubdb" : "json"}`,
	}));

	await channel.send("# Daily Scradd Database Backup");
	while (attachments.length) {
		await channel.send({ files: attachments.splice(0, 10) });
	}
}
