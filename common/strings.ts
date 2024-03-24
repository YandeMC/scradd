export const joins = [
	`Everybody please welcome {{{MEMBER}}} to the server; they’re our **{{{COUNT}}}** member!{{{RAW_JOKES}}}`,
	`A big shoutout to {{{MEMBER}}}, we’re glad you’ve joined us as our **{{{COUNT}}}** member!{{{RAW_JOKES}}}`,
	`Here we go again… {{{MEMBER}}} is here, our **{{{COUNT}}}** member!{{{RAW_JOKES}}}`,
	`||Do I always have to let you know when there is a new member?|| {{{MEMBER}}} is here (our **{{{COUNT}}}**)!{{{RAW_JOKES}}}`,
	`Is it a bird? Is it a plane? No, it’s {{{MEMBER}}}, our **{{{COUNT}}}** member!{{{RAW_JOKES}}}`,
	`Welcome:tm: {{{MEMBER}}}! You’re our **{{{COUNT}}}** member!{{{RAW_JOKES}}}`,
	`Places, everyone! {{{MEMBER}}}, our **{{{COUNT}}}** member, is here!{{{RAW_JOKES}}}`,
	`{{{MEMBER}}}, our **{{{COUNT}}}** member, is here! (they didn’t bring pizza though)`,
	`{{{MEMBER}}}, the **{{{COUNT}}}** member, has joined the circus!{{{RAW_JOKES}}}`,
	`You have been warned… Welcome to our **{{{COUNT}}}** member, {{{MEMBER}}}!{{{RAW_JOKES}}}`,
	`A wild {{{MEMBER}}} appeared (our **{{{COUNT}}}** member)`,
	`{{{MEMBER}}}, our **{{{COUNT}}}** member, just spawned in!{{{RAW_JOKES}}}`,
	`Act professional, {{{MEMBER}}} is here, our **{{{COUNT}}}** member!{{{RAW_JOKES}}}`,
	`Watch out! {{{MEMBER}}} is here! They’re our **{{{COUNT}}}**!{{{RAW_JOKES}}}`,
	`Rest here weary traveler, {{{MEMBER}}}. You’re the **{{{COUNT}}}** member.`,
] as const;
export const bans = ["Oop, **{{{MEMBER}}}** was banned."] as const;
export const leaves = ["Rip, **{{{MEMBER}}}** left :("] as const;

export const statuses = ["Watching you!"] as const;

export const uwuReplacements: Record<string, string> = {};
export const uwuEndings = [":3"] as const;

export const executeMessages = ["gay"] as const;
export const executeEmojis = [
	["🩷"],
	["❤️"],
	["🧡"],
	["💛"],
	["💚"],
	["🩵"],
	["💙"],
	["💜"],
] as const;
