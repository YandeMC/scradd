export class AIChat {
	private apiUrl: string;
	private history: { role: string; content: string }[] = [];
	private stickyMessages: { role: string; content: string }[] = [];
	private maxMessages: number;

	constructor(apiUrl: string, maxMessages: number = 100) {
		this.apiUrl = apiUrl;
		this.maxMessages = maxMessages;
	}

	async send(message: string, role: string = "user"): Promise<string> {
		this.inform(message, role);

		const response = await fetch(this.apiUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "gpt-4o",
				messages: this.getEffectiveHistory(),
			}),
		});

		const data = (await response.json()) as any;
		const reply = data.choices?.[0].message.content;
   if (!reply) return "[nothing]"

		this.inform(reply, "assistant");

		return reply;
	}

	inform(content: string, role: string = "system"): void {
		if (this.history.length >= this.maxMessages) {
			this.history.shift(); // Remove the oldest message
		}
		this.history.push({ role, content });
	}

	sticky(content: string, role: string = "system"): void {
		this.stickyMessages.push({ role, content });
	}

	getChatHistory(): { role: string; content: string }[] {
		return [...this.stickyMessages, ...this.history];
	}

	private getEffectiveHistory(): { role: string; content: string }[] {
		// Combine sticky messages and history for the API request
		return [...this.stickyMessages, ...this.history];
	}
}
