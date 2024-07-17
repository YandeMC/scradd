import axios from "axios";
import type { User } from "discord.js";
import { compressId } from "./baseconvert.js";

const API_KEY = process.env.CHALLONGE_API_KEY ?? "";
const TOURNAMENT_URL = "CodersRPS";

interface Participant {
	participant: {
		id: number;
		display_name: string;
	};
}

interface Match {
	match: {
		id: number;
		player1_id: number;
		player2_id: number;
		state: string;
	};
}

interface Tournament {
	id: number;
	name: string;
	state: string;
}
export function formatUser(user: User) {
	return `${user.displayName} (${compressId(user.id)})`;
}
export async function addParticipant(name: string): Promise<boolean> {
	try {
		const response = await axios.post(
			`https://api.challonge.com/v1/tournaments/${TOURNAMENT_URL}/participants.json`,
			{
				api_key: API_KEY,
				participant: { name },
			},
		);
		return response.status === 200;
	} catch (error) {
		console.error("Error adding participant:", error);
		return false;
	}
}

export async function getTournamentData(): Promise<Tournament> {
	return await axios.get(`https://api.challonge.com/v1/tournaments/${TOURNAMENT_URL}.json`, {
		params: { api_key: API_KEY },
	});
}
export async function getParticipant(id: number) {
	const response = await axios.delete(
		`https://api.challonge.com/v1/tournaments/${TOURNAMENT_URL}/participants/${id}.json`,
		{
			params: { api_key: API_KEY },
		},
	);
	const regex = /^.*\((.+)\)$/;

	return {
		...(response.data as Participant).participant,
		discordId: regex.exec(response.data.participant.display_name)?.[1] as string,
	};
}
export async function removeParticipant(name: string): Promise<boolean> {
	try {
		const participantsResponse = await axios.get(
			`https://api.challonge.com/v1/tournaments/${TOURNAMENT_URL}/participants.json`,
			{
				params: { api_key: API_KEY },
			},
		);

		const participants: Participant[] = participantsResponse.data;
		const regex = /^.*\((.+)\)$/;
		const participant = participants.find(
			(p) => regex.exec(p.participant.display_name)?.[1] === compressId(name),
		);

		if (!participant) {
			console.error("Participant not found");
			return false;
		}

		const response = await axios.delete(
			`https://api.challonge.com/v1/tournaments/${TOURNAMENT_URL}/participants/${participant.participant.id}.json`,
			{
				params: { api_key: API_KEY },
			},
		);

		return response.status === 200;
	} catch (error) {
		console.error("Error removing participant:", error);
		return false;
	}
}

export async function findMatch(player1Name: string, player2Name: string): Promise<Match | false> {
	try {
		const participantsResponse = await axios.get(
			`https://api.challonge.com/v1/tournaments/${TOURNAMENT_URL}/participants.json`,
			{
				params: { api_key: API_KEY },
			},
		);
		const regex = /^.*\((.+)\)$/;
		const participants: Participant[] = participantsResponse.data;
		const player1 = participants.find(
			(p) => regex.exec(p.participant.display_name)?.[1] === compressId(player1Name),
		);
		const player2 = participants.find(
			(p) => regex.exec(p.participant.display_name)?.[1] === compressId(player2Name),
		);

		if (!player1 || !player2) {
			console.error("One or both participants not found");
			return false;
		}

		const matchesResponse = await axios.get(
			`https://api.challonge.com/v1/tournaments/${TOURNAMENT_URL}/matches.json`,
			{
				params: { api_key: API_KEY },
			},
		);

		const matches: Match[] = matchesResponse.data;

		const match = matches
			.filter((m) => m.match.state == "open")
			.find(
				(m) =>
					(m.match.player1_id === player1.participant.id &&
						m.match.player2_id === player2.participant.id) ||
					(m.match.player2_id === player2.participant.id &&
						m.match.player2_id === player1.participant.id),
			);

		return match || false;
	} catch (error) {
		console.error("Error finding match:", error);
		return false;
	}
}
export async function findOpponent(player1Name: string): Promise<Match | false> {
	try {
		const participantsResponse = await axios.get(
			`https://api.challonge.com/v1/tournaments/${TOURNAMENT_URL}/participants.json`,
			{
				params: { api_key: API_KEY },
			},
		);
		const regex = /^.*\((.+)\)$/;
		const participants: Participant[] = participantsResponse.data;
		const player1 = participants.find(
			(p) => regex.exec(p.participant.display_name)?.[1] === compressId(player1Name),
		);

		if (!player1) {
			console.error("One or both participants not found");
			return false;
		}

		const matchesResponse = await axios.get(
			`https://api.challonge.com/v1/tournaments/${TOURNAMENT_URL}/matches.json`,
			{
				params: { api_key: API_KEY },
			},
		);

		const matches: Match[] = matchesResponse.data;

		const match = matches
			.filter((m) => m.match.state == "open")
			.find(
				(m) =>
					m.match.player1_id === player1.participant.id ||
					m.match.player2_id === player1.participant.id,
			);

		return match || false;
	} catch (error) {
		console.error("Error finding match:", error);
		return false;
	}
}
export async function setMatchWinner(
	matchId: number,
	winnerId: number,
	scores: [number, number],
): Promise<boolean> {
	try {
		const response = await axios.put(
			`https://api.challonge.com/v1/tournaments/${TOURNAMENT_URL}/matches/${matchId}.json`,
			{
				api_key: API_KEY,
				match: {
					winner_id: winnerId,
					scores_csv: scores.join("-"),
				},
			},
		);

		return response.status === 200;
	} catch (error) {
		console.error("Error setting match winner:", error);
		return false;
	}
}
