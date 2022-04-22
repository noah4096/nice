import * as process from "process";

export class Surface {
	constructor(width, height) {
		this.width = width;
		this.height = height;

		this.charBuffer = new Array(this.width * this.height).fill("");
		// TODO: store other buffers such as for colour etc
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
		let chars = [...text];

		for (let i = 0; i < chars.length; i++) {
			this.write(x + i, y, chars[i]);
		}
	}

	scroll(lines = 1) {
		let chars = lines * this.width;

		[this.charBuffer].forEach((buffer) => {
			for (let i = 0; i < buffer.length; i++) {
				buffer[i] = buffer[i + chars] || "";
			}
		});
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
		// commands holds the data to write to the TTY once assembling the buffer is finished
		// that way we don't get screen tearing when writing data in succession
		// it's an array because performing multiple +=s to strings is bad for performance
		// instead, we push each bit we want to append to the array and then join the whole array up for one final string
		// then we write that final string using a single process.stdout.write command

		// TODO: works fine on 80x25 display but not for large displays
		// we need to have some sort of "dirty" bit so that only changed cells are rerendered

		let commands = [];

		for (let yi = 0; yi < this.height; yi++) {
			commands.push(`\x1b[${yi};0H`);

			for (let xi = 0; xi < this.width; xi++) {
				let char = this.read(xi, yi);

				if (["", "\0"].includes(char)) {
					char = " ";
				}

				commands.push(char);
			}
		}

		process.stdout.write(commands.join(""));
	}
}

export class Terminal {
	constructor(surface) {
		this.surface = surface;

		this.x = 0;
		this.y = 0;
	}

	get width() {
		return this.surface.width;
	}

	get height() {
		return this.surface.height;
	}

	print(chars) {
		let text = [...chars];

		for (let i = 0; i < chars.length; i++) {
			let char = chars[i];

			switch (char) {
				// TODO: maybe handle ANSI escape codes here

				case "\r":
					this.x = 0;
					break;

				case "\n":
					this.x = 0;
					this.y++;
					break;

				case "\t":
					this.x += 8 - (this.x % 8);
					break;

				default:
					this.surface.text(this.x, this.y, char);
					this.x++;
			}

			if (this.x >= this.width) {
				this.x = 0;
				this.y++;
			}

			if (this.y >= this.height) {
				this.surface.scroll();
				this.y = this.height - 1;
			}
		}
	}
}