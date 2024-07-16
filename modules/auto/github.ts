export default function github(content: string): string | undefined {
	const output = new Set<string>();
	for (const match of content.matchAll(
		/(?:^|\s)(((?<owner>[\w.-]+)\/)(?<repo>[\w.-]+))#(?<issue>[1-9]\d*)\b/gi,
	)) {
		const { owner, repo, issue } = match.groups ?? {};

		const resolvedPath = `${owner}/${repo}`;
		output.add(`https://github.com/${resolvedPath}/issues/${issue}`);
	}
	return [...output].slice(0, 5).join(" ");
	// TODO: Verify the link doesn't already exist in the OG content, also the Set is case-sensitive
}
