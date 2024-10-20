import { aiModel, updateModels } from "./model-status.js";
import { getRelations } from "./prompts.js";

export class AIChat {
	private apiUrl: string;
	private history: { role: string; content: string | any[]; type?: string }[];
	private stickyMessages: { role: string; content: string | any[]; type?: string }[] = [];
	private maxMessages: number;

	/**
	 * Constructs an AIChat instance.
	 *
	 * @param apiUrl - The API endpoint URL.
	 * @param sharedHistory - An external array to store shared messages.
	 * @param maxMessages - The maximum number of messages to retain in history.
	 */
	constructor(
		apiUrl: string,
		sharedHistory?: { role: string; content: string | any[]; type?: string }[],
		maxMessages: number = 100,
		stickies: { role: string; content: string | any[]; type?: string }[] = [],
	) {
		this.apiUrl = apiUrl;
		this.history = sharedHistory || [];
		this.maxMessages = maxMessages;
		this.stickyMessages = stickies || [];
	}

	/**
	 * Sends a message to the AI and returns the AI's response.
	 *
	 * @param message - The message content.
	 * @param role - The role of the message sender (default: "user").
	 * @param type - The type of message (default: "text").
	 * @returns The AI's reply as a string.
	 */
	async send(
		message: string | any[],
		role: string = "user",
		type: "text" | "image" | "complex" = "text",
		dontSave = false,
	): Promise<string> {
		this.inform(message, role, type);

		const headers: Record<string, string> = { // why
			"Content-Type": "application/json",
		};
		  
		if (process.env.OPENAI_KEY) {
			headers["Authorization"] = `Bearer ${process.env.OPENAI_KEY}`;
		}
		  
		const response = await fetch(this.apiUrl, {
			method: "POST",
			headers: headers,
			body: JSON.stringify({
			  model: aiModel?.name,
			  messages: this.getEffectiveHistory(),
			}),
		});

		const data = (await response.json().catch(() => undefined)) as any;
		const reply = data.choices?.[0].message.content;
		if (!reply) {
			await updateModels();
			if (aiModel?.name != "All Down") return "[nothing]";
		}
		if (!dontSave) this.inform(reply, "assistant", "text");

		return reply;
	}

	/**
	 * Adds a message to the shared history.
	 *
	 * @param content - The message content.
	 * @param role - The role of the message sender (default: "system").
	 * @param type - The type of message (default: "text").
	 */
	inform(
		content: string | any[],
		role: string = "system",
		type: "text" | "image" | "complex" = "text",
	): void {
		if (this.history.length >= this.maxMessages) {
			this.history.shift(); // Remove the oldest message
		}
		this.history.push({ role, content, type });
	}

	/**
	 * Adds a sticky message unique to this AIChat instance.
	 *
	 * @param content - The sticky message content.
	 * @param role - The role of the message sender (default: "system").
	 * @param type - The type of message (default: "text").
	 */

	/**
	 * Retrieves the full chat history, including sticky messages.
	 *
	 * @returns An array of messages.
	 */
	getChatHistory(): { role: string; content: string | any[]; type?: string }[] {
		return [...this.history];
	}

	getStickies() {
		return this.stickyMessages;
	}

	/**
	 * Combines sticky messages with shared history for API requests.
	 *
	 * @returns An array of messages.
	 */
	getEffectiveHistory(): { role: string; content: string | any[]; type?: string }[] {
		return [
			...this.stickyMessages,
			{ role: "system", content: getRelations() },
			...this.history,
		];
	}
}
