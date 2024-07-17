/**
 * Converts a string of numbers (larger than max safe number) to the largest possible base (base 92).
 *
 * @param numStr - The string of numbers to be converted.
 * @returns The base 92 representation of the number.
 */
const base92Chars =
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
	"!\"#$%&'*+,-./:;<=>?@[\\]^_`{|}~";

export function compressId(id: string): string {
	// Define the base 92 characters

	// Function to divide a large number string by a small number
	function divideLargeNumber(
		numStr: string,
		divisor: number,
	): { quotient: string; remainder: number } {
		let remainder = 0;
		let quotient = "";

		for (let i = 0; i < numStr.length; i++) {
			let currentDigit = Number(numStr[i]);
			let currentValue = remainder * 10 + currentDigit;
			quotient += Math.floor(currentValue / divisor).toString();
			remainder = currentValue % divisor;
		}

		// Remove leading zeros from quotient
		quotient = quotient.replace(/^0+/, "");
		if (quotient === "") quotient = "0";

		return { quotient, remainder };
	}

	let result = "";
	let currentNumStr = id;

	while (currentNumStr !== "0") {
		let { quotient, remainder } = divideLargeNumber(currentNumStr, 92);
		result = base92Chars[remainder] + result;
		currentNumStr = quotient;
	}

	return result;
}
/**
 * Converts a base 92 string back to a base 10 string.
 *
 * @param base92Str - The base 92 string to be converted.
 * @returns The base 10 representation of the number as a string.
 */
export function decompressId(compressedId: string): string {
	// Define the base 92 characters
	const base = 92;
	let result = "0";

	// Iterate over each character in the base 92 string
	for (let i = 0; i < compressedId.length; i++) {
		const char = compressedId[i] ?? "";
		const charIndex = base92Chars.indexOf(char);

		if (charIndex === -1) {
			throw new Error(`Invalid character ${char} in base 92 string.`);
		}

		// Update the result by multiplying by base and adding the character value
		result = multiplyByBase(result, base);
		result = addStrings(result, charIndex.toString());
	}

	return result;
}

/**
 * Multiplies a base 10 number represented as a string by a base.
 *
 * @param numStr - The base 10 number as a string.
 * @param base - The base to multiply by.
 * @returns The product as a string.
 */
function multiplyByBase(numStr: string, base: number): string {
	let carry = 0;
	let result = "";

	for (let i = numStr.length - 1; i >= 0; i--) {
		const digit = Number(numStr[i]) * base + carry;
		result = (digit % 10).toString() + result;
		carry = Math.floor(digit / 10);
	}

	// Add remaining carry
	while (carry > 0) {
		result = (carry % 10).toString() + result;
		carry = Math.floor(carry / 10);
	}

	return result;
}

/**
 * Adds two base 10 numbers represented as strings.
 *
 * @param numStr1 - The first base 10 number as a string.
 * @param numStr2 - The second base 10 number as a string.
 * @returns The sum as a string.
 */
function addStrings(numStr1: string, numStr2: string): string {
	let carry = 0;
	let result = "";
	let maxLength = Math.max(numStr1.length, numStr2.length);

	// Pad the shorter number with leading zeros
	numStr1 = numStr1.padStart(maxLength, "0");
	numStr2 = numStr2.padStart(maxLength, "0");

	for (let i = maxLength - 1; i >= 0; i--) {
		const sum = Number(numStr1[i]) + Number(numStr2[i]) + carry;
		result = (sum % 10).toString() + result;
		carry = Math.floor(sum / 10);
	}

	// Add remaining carry
	if (carry > 0) {
		result = carry.toString() + result;
	}

	return result;
}
