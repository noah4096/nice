import * as process from "process";

export class Surface {
	constructor(width, height) {
		this.width = width;
		this.height = height;

		this.charBuffer = new Array(this.width * this.height).fill("");
	}

	read(x, y, buffer = this.charBuffer) {
		if (x >= this.width || y >= this.height) {
			throw RangeError("Attempt to read from surface outside of dimensions");
		}

		return buffer[(y * this.width) + x];
	}

	write(x, y, data, buffer = this.charBuffer) {
		if (x >= this.width || y >= this.height) {
			throw RangeError("Attempt to write to surface outside of dimensions");
		}

		buffer[(y * this.width) + x] = data;
	}

	text(x, y, text) {
		var chars = [...text];

		for (let i = 0; i < chars.length; i++) {
			this.write(x + i, y, chars[i]);
		}
	}

	drawToSurface(surface, x = 0, y = 0) {
		for (let yi = 0; yi < this.height; yi++) {
			for (let xi = 0; xi < this.width; xi++) {
				let xd = x + xi, yd = y + yi;

				if (xd >= surface.width || yd >= surface.height) {
					continue;
				}

				surface.write(xd, yd, this.read(xi, yi));
			}
		}
	}

	drawToTTY() {
		process.stdout.write("\x1b[2J");

		// TODO: this needs heavy optimisation

		for (let yi = 0; yi < this.height; yi++) {
			process.stdout.write(`\x1b[${yi};0H`);

			for (let xi = 0; xi < this.width; xi++) {
				let char = this.read(xi, yi);

				if (["", "\0"].includes(char)) {
					char = " ";
				}

				process.stdout.write(char);
			}
		}
	}
}