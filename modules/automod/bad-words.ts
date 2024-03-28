/* On production, this file is replaced with another file with the same structure. */

/**
 * The index of each array determines how many strikes the word gives.
 *
 * The second sub-array is for words that must be surrounded by a word boundary and the third is for words that must be
 * preceded by a word boundary.
 *
 * All RegExps are ROT13-encoded. Additionally, RegExp character classes are not supported here. Use capture groups
 * instead.
 */
const badWords: [RegExp[]?, RegExp[]?, RegExp[]?][] = [
	[
		[/cbea/, /grfgvpyr/, /erpghz/, /ihyin/, /🖕/, /卐/, /fjnfgvxn/, /卍/],
		[
			/intva(?:f|l|n|r|y)+/,
			/(?:urzv ?)?cravf(?:rf)?/,
			/nahf(?:rf)?/,
			/frzra/,
			/(?:c(?:bfg|er) ?)?phz/,
			/pyvg/,
			/gvg(?:(?:gvr)?f)?/,
			/chff(?:l|vrf)/,
			/fpebghz/,
			/ynovn/,
			/xlf/,
			/preivk/,
			/ubeal/,
			/obaref?/,
			/fcrez/,
		],
	],
	[
		[
			/fuv+r*g(?!nx(?:r|v))/,
			/rwnphyngr/,
			/fcyb+tr/,
			/oybj ?wbo/,
			/shpx/,
			/znfg(?:h|r)eong/,
			/ohgg ?cvengr/,
			/qvyqb/,
			/xhxfhtre/,
			/dhrrs/,
			/wnpx ?bss/,
			/wrex ?bss/,
			/ovg?pu/,
			/ubeal/,
		],
		[
			/wvm+z?/,
			/(?:ovt ?)?qvp?xr?(?: ?(?:q|l|evat|ef?|urnqf?|vre?|vat|f|jnqf?))?/,
			/(?:8|o)=+Q/,
			/fzhg+(?:e|fg?|l|vr)?/,
			/pbpx(?: ?svtug|(?:svtug)(?:re|vat)|znafuvc|hc)?f?/,
			/onfgneq(?:vfz|(?:e|y)?l|evrf|f)?/,
			/phagf?/,
			/shx/,
			/ovg?fu/,
			/jnax(?:v?ref?|v(?:at|rfg)|yr|f|l)?/,
		],
	],
	[
		[
			/puvat ?(?:punat ?)?puba/,
			/xvxr/,
			/pnecrg ?zhapure/,
			/fyhg/,
			/fur ?znyr/,
			/shqtr ?cnpxr/,
			/ergneq/,
		],
		[
			/tbbx(?:f|l)?/,
			/yrfobf?/,
			/fcvpf?/,
			/j?uber/,
			/av+t{2,}(?:(?:h|r)?e|n)(?: ?rq|l|qbz|urnq|vat|vf(?:u|z)|yvat)?f?/,
			/snv?t+(?:rq|vr(?:e|fg)|va|vg|bgf?|bge?l|l)?f?/,
			/wnc(?:rq?|r?f|vatf?|crq|cvat|cn)?/,
		],
	],
];

if (process.env.NODE_ENV !== "production") badWords[1]?.[0]?.push(/nhgbzbqzhgr/);

export default badWords;
