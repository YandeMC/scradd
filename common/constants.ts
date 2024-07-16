import addons from "@sa-community/addons-data" assert { type: "json" };

const domains = {
	npm: "https://npmjs.com/package",
	scradd:
		process.env.NODE_ENV === "production" || !process.env.PORT ?
			"https://scrub.fly.dev"
		:	(`http://localhost:${process.env.PORT}` as const),
	scratch: "https://scratch.mit.edu",
	scratchAddons: "https://scratchaddons.com",
	scratchApi: "https://corsproxy.io/?https://api.scratch.mit.edu",
	scratchdb: "https://scratchdb.lefty.one/v3",
} as const;

export default {
	addonSearchOptions: {
		keys: [
			({ addonId }: (typeof addons)[number]) => addonId.replaceAll("-", " "),
			"addonId",
			"manifest.name",
			"manifest.description",
			"manifest.settings.*.name",
			"manifest.credits.*.name",
			"manifest.presets.*.name",
			"manifest.presets.*.description",
		],
	},

	collectorTime: 45_000,
	defaultPunishment: "No reason given.",
	domains,

	emojis: {
		message: {
			add: "<:add:1195859865579561052>",
			boost: "<:boost:1195860016427696138>",
			call: "<:call:1195858170309001307>",
			deafened: "<:deafened:1195857887155728424>",
			edit: "<:edit:1195857904100708392> ",
			error: "<:error:1193656283396579418>",
			muted: "<:muted:1195857919057612822>",
			no: "<:no:1193656110696112259>",
			pin: "<:pin:1195858189871226922>",
			raisedHand: "<:raised_hand:1195858087853170790>",
			remove: "<:remove:1195859908978016316>",
			reply: "<:reply:1195858012171161631>",
			speaker: "<:speaker:1195858063211643070>",
			stage: "<:stage:1195860523967840347>",
			stageLive: "<:stage_live:1195860538182336793>",
			streaming: "<:streaming:1195860552908558498>",
			thread: "<:thread:1195858146724433990>",
			typing: "<a:typing:1195857946156994711>",
			warning: "<:warning:1193656265520459806>",
			yes: "<:yes:1193656129750847488>",
			subscription: "",
			live: "",
			fail: "",
			success: "",
		},

		misc: {
			addon: "<:_:817273401869205524>",
			blue: "<:primary:1195858102952665268>",
			green: "<:success:1195857992814448681>",
			loading: "<a:_:949436374174560276>",
		},

		scratch: {
			comments: "<:Comments:1101507674442584145>",
			favorite: "<:Star:1101507667857526784>",
			followers: "<:People:1101507672852934837>",
			following: "<:Person:1101507670860632235>",
			love: "<:Heart:1101507665802301560>",
			projects: "<:projects:1101507677894488174>",
			remix: "<:Remix:1101507669489107024>",
			view: "<:View:1101509288221999306>",
		},

		statuses: { no: "<:no:1193656110696112259>", yes: "<:yes:1193656129750847488>" },

		vc: {
			camera: "<:_:1202777712997961768>",
			deafened: "<:deafened:1195857887155728424>",
			muted: "<:muted:1195857919057612822>",
			streaming: "<:streaming:1195860552908558498>",
		},

		welcome: {
			ban: "<:ban:1193655180630184047>",
			kick: "<:kick:1204568132107247646>",
			join: "<:join:1193656153666748548>",
			leave: "<:leave:1193656172297855026>",
		},
	},
	fonts: "Sora, SoraExt, sans-serif",
	footerSeperator: " • ",

	repos: {
		scradd: "theyande/scradd",
		scratchAddons: "ScratchAddons/ScratchAddons",
	},

	scratchColor: 0x88_5c_d4,
	themeColor: process.env.NODE_ENV === "production" ? 0xff_7b_26 : 0x17_5e_f8,

	urls: {
		addonImages: `${domains.scratchAddons}/assets/img/addons`,
		permissions: "https://discordlookup.com/permissions-calculator",
		railway: "https://railway.app?referralCode=RedGuy14",
		settings: `${domains.scratch}/scratch-addons-extension/settings`,
		usercount: `${domains.scratchAddons}/usercount.json`,
	},

	users: {
		disboard: "302050872383242240",
		hans: "279855717203050496",
		robotop: "323630372531470346",
		scradd: "929928324959055932",
		weirdo: "691223009515667457",
	},

	webhookName: "scradd-webhook",
	zws: "\u200B",
} as const;
