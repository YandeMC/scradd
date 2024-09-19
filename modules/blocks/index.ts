// import canvas from '@napi-rs/canvas';
import { JSDOM } from "jsdom";
// import canvas from "@napi-rs/canvas";
import canva from "canvas";
import { defineChatCommand } from "strife.js";
import { ApplicationCommandOptionType } from "discord.js";
import { resolve } from "path";
// import { defineEvent } from 'strife.js';
canva.registerFont(resolve("./Helvetica.otf"), { family: "helvetica" });

const scratchblocks = (await import("./scratchblocks/index.js")).default;
const xmlEscape = (unsafe: string): string => {
	const escapeMap: { [key: string]: string } = {
		"<": "&lt;",
		">": "&gt;",
		"&": "&amp;",
		"'": "&apos;",
		'"': "&quot;",
	};

	return unsafe.replace(/[<>&'"]/g, (c) => escapeMap[c] as any);
};

export async function scratchBlocksToImage(text: string, style: string) {
	const window = new JSDOM(`<pre class='blocks'>${xmlEscape(text)}</pre>`);
	const scratchBlocksInstance = scratchblocks(window.window);
	scratchBlocksInstance.appendStyles();
	scratchBlocksInstance.renderMatching("pre.blocks", {
		style: "scratch" + style,
		languages: ["en"],
	});
	const scratchBlocksDiv = window.window.document.querySelector("div.scratchblocks");
	if (!scratchBlocksDiv) throw "scratchBlocksDiv is null!";
	const svgElement = scratchBlocksDiv.getElementsByTagName("svg").item(0);
	if (!svgElement) throw "svgElement is null!";
	let newWidth = Math.ceil(Number(svgElement.getAttribute("width")) * 2);
	let newHeight = Math.ceil(Number(svgElement.getAttribute("height")) * 2);

	if (newWidth > 4096) {
		const divisor = newWidth / 4096;
		newWidth = Math.ceil(newWidth / divisor);
		newHeight = Math.ceil(newHeight / divisor);
	}
	if (newHeight > 4096) {
		const divisor = newHeight / 4096;
		newWidth = Math.ceil(newWidth / divisor);
		newHeight = Math.ceil(newHeight / divisor);
	}
	svgElement.setAttribute("width", String(newWidth));
	svgElement.setAttribute("height", String(newHeight));
	svgElement.setAttribute("viewbox", `0 0 ${newWidth} ${newHeight}`);
	// add extra style tags & stuff
	const styleTag1 = svgElement.appendChild(window.window.document.createElement("style"));
	styleTag1.innerHTML = `.sb3-comment-label {
fill: black !important;
}
* {
font: 500 12pt helvetica    ; 
}`;
	const styleTag2 = svgElement.appendChild(window.window.document.createElement("style"));
	styleTag2.innerHTML = window.window.document.head.innerHTML;
	const styleTag3 = svgElement.appendChild(window.window.document.createElement("style"));
	styleTag3.innerHTML = scratchBlocksInstance.scratch3.stylee.cssContent;
	// get svg data
	const svgData = scratchBlocksDiv.innerHTML;
	const uri = "data:image/svg+xml;base64," + Buffer.from(svgData, "utf8").toString("base64url");

	const image = await canva.loadImage(uri);
	const drawingCanvas = canva.createCanvas(image.width, image.height);
	const ctx = drawingCanvas.getContext("2d");

	ctx.drawImage(image, 0, 0, image.width, image.height);
	return drawingCanvas.toBuffer("image/png");
}

// defineEvent("messageCreate", async (m) => {
//     if (m.author.bot) return
//     const blocks = /block{(.*)}/ms.exec(m.content)
// if (!blocks?.[1]) return
// console.log(blocks)
//     m.reply({})
// })

defineChatCommand(
	{
		name: "blocks",
		description: "Generate an image of scratchblocks",
		options: {
			blocks: {
				type: ApplicationCommandOptionType.String,
				required: true,
				description: "the text to uses  while generating",
			},
		},
	},
	async (i, o) => {
		i.reply({ files: [await scratchBlocksToImage(o.blocks, "3")] });
	},
);
