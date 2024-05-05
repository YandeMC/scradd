/* On production, this file is replaced with another file with the same structure. */

export const joins = [
	`{{{MEMBER}}} exists now! 😁`,
	"**{{{MEMBER}}}** arose from the depths of discordia",
	"**{{{MEMBER}}}** just joined and hopefully isn’t a bot",
	"**{{{MEMBER}}}** Joined the game",
	"A wild **{{{MEMBER}}}** appeared!"
] as const;
export const bans = [
	"Oop, **{{{MEMBER}}}** was bonked.",
	"**{{{MEMBER}}}** did a no-no",
	"**{{{MEMBER}}}** was killed with hammers 🔨",
	"**{{{MEMBER}}}** was thrown in the recycling bin 😔",
	"**{{{MEMBER}}}** ate taco bell and died.",
	"The mods use **BAN**! **{{{MEMBER}}}** fainted!",
	"`await {{{MEMBER}}}.ban()`",
	"**{{{MEMBER}}}** had a skill issue"
] as const;
export const leaves = [
	"Rip, **{{{MEMBER}}}** left :(",
	"**{{{MEMBER}}}** no longer exists 😔 ",
	"**{{{MEMBER}}}** fell from a high place",
	"**{{{MEMBER}}}** death.fell.accident.water",
	"**{{{MEMBER}}}** tried to swim in lava",
	"**{{{MEMBER}}}** withered away",
	"**{{{MEMBER}}}** was squashed by a falling anvil"
] as const;

export const statuses = ["Watching you!", ":3", "૮ ˶ᵔ ᵕ ᵔ˶ ა"] as const;

export const uwuReplacements: Record<string, string> = {};
export const uwuEndings = [":3"] as const;
export const executeMessages = [	
	`Spot a common trigger, it’s a thrilling quest,\nFind the hidden code, then you pass the test.`,
	`With symbol emojis, react the key,\nIn digital realms, let the secrets free.`,
	`Start the climb, then down below,Legends unfold, as you go.\nLeft to past, right to the light,Prepare to face, the ancient fight.`,
	`A code of old, a player's aid,In times of need, this charm was played.`] as const;
export const executeEmojis = ((process.env.SHHHHH_EMOJIS && JSON.parse(process.env.SHHHHH_EMOJIS.replace(/quote/g,'"').replace(/lbr/g,"[").replace(/rbr/g,"]").replace(/comma/g,","))) as string[][])  ?? [
	["🩷"],
	["❤️"],
	["🧡"],
	["💛"],
	["💚"],
	["🩵"],
	["💙"],
	["💜"],
] as const;
