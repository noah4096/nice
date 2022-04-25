import * as process from "process";

const INT = Math.floor;

export function getSize() {
	return {width: process.stdout.columns, height: process.stdout.rows};
}

export class TTYEvent {
	constructor(data) {
		this.data = data;
	}

	static matches(data) {
		return false;
	}
}

export class TTYKeyboardEvent extends TTYEvent {
	constructor(data) {
		super(data);
	}

	static matches(data) {
		return true;
	}
}

export class TTYMouseEvent extends TTYEvent {
	constructor(data) {
		super(data);

		let matches = this.constructor.matches(data);

		this.type = {
			0: "left",
			1: "middle",
			2: "right",
			32: "leftDrag",
			33: "middleDrag",
			34: "rightDrag",
			35: "move",
			64: "scrollUp",
			65: "scrollDown"
		}[matches[1]] || null;

		this.x = matches[2] - 1;
		this.y = matches[3] - 1;
	}

	static matches(data) {
		return data.match(/^\x1b\[\<(\d+);(\d+);(\d+)(.)$/);
	}
}

export class TTYEventManager {
	constructor() {
		this.queue = [];
	}

	start() {
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.setEncoding("utf-8");
		process.stdout.write("\x1b[?1003h\x1b[?1015h\x1b[?1006h"); // enable mouse reporting

		process.stdin.on("data", (data) => {
			if (TTYMouseEvent.matches(data)) {
				this.queue.push(new TTYMouseEvent(data));
				return;
			}

			this.queue.push(new TTYKeyboardEvent(data));
		});
	}

	stop() {
		process.stdin.setRawMode(false);
		process.stdout.write("\x1b[?1000l\x1b[?1003l"); // disable mouse reporting
	}
}

export class Surface {
	constructor(width, height) {
		this.width = width;
		this.height = height;

		this.charBuffer = new Array(this.width * this.height).fill(""); // for displayed chars
		this.formatBuffer = new Array(this.width * this.height).fill(""); // for char cell formatting (eg colour)
		this.dirtyBuffer = new Array(this.width * this.height).fill(true); // set to true when char is set until next TTY draw
	}

	static fullSize() {
		let size = getSize();

		return new this(size.width, size.height);
	}

	coordsToIndex(x, y) {
		return (INT(y) * this.width) + INT(x);
	}

	read(x, y, buffer = this.charBuffer) {
		if (x >= this.width || y >= this.height) {
			throw RangeError("Attempt to read from surface outside of dimensions");
		}

		return buffer[this.coordsToIndex(x, y)];
	}

	write(x, y, data, buffer = this.charBuffer) {
		if (x >= this.width || y >= this.height) {
			throw RangeError("Attempt to write to surface outside of dimensions");
		}

		let i = this.coordsToIndex(x, y);

		buffer[i] = data;
		this.dirtyBuffer[i] = true;
	}

	text(x, y, text, format = "") {
		let chars = [...text];

		for (let i = 0; i < chars.length; i++) {
			this.write(x + i, y, chars[i]);
			this.write(x + i ,y, format, this.formatBuffer);
		}
	}

	scroll(lines = 1) {
		let chars = lines * this.width;

		[this.charBuffer, this.formatBuffer].forEach((buffer) => {
			for (let i = 0; i < buffer.length; i++) {
				buffer[i] = buffer[i + chars] || "";
			}
		});

		this.dirtyBuffer.fill(true, 0, this.dirtyBuffer.length - chars);
	}

	rect(x1, y1, x2, y2, data, buffer = this.formatBuffer) {
		for (let yi = Math.min(y1, y2); yi < Math.max(y1, y2); yi++) {
			for (let xi = Math.min(x1, x2); xi < Math.max(x1, x2); xi++) {
				this.write(xi, yi, data, buffer);
			}
		}
	}

	clear(format = "0") {
		this.charBuffer.fill("");
		this.formatBuffer.fill(format);
		this.dirtyBuffer.fill(true);
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

		// FIXME: writing at bottom-right corner of TTY causes it to scroll

		let commands = [];
		let previousFormat = null; // let first char determine format

		for (let yi = 0; yi < this.height; yi++) {
			let dirtyXStart = 0;
			let isClean = true;

			for (let xi = 0; xi < this.width; xi++) {
				// if we haven't encountered a dirty cell yet and it's still dirty
				if (isClean && !this.read(xi, yi, this.dirtyBuffer)) {
					dirtyXStart++;
					continue;
				}

				// if we haven't encountered a dirty cell yet and this one is the first dirty cell
				if (isClean) {
					isClean = false;
					commands.push(`\x1b[${yi + 1};${dirtyXStart + 1}H`);
				}

				let char = this.read(xi, yi);
				let format = this.read(xi, yi, this.formatBuffer);

				// always fill cell
				if (["", "\0"].includes(char)) char = " ";

				if (format != previousFormat) {
					previousFormat = format;
					commands.push(`\x1b[${format || "0"}m`); // if format string is empty, then put 0 which is SGR reset
				}

				commands.push(char);
			}
		}

		this.dirtyBuffer.fill(false);
		process.stdout.write(commands.join(""));
	}
}

export class Terminal {
	constructor(surface) {
		this.surface = surface;

		this.x = 0;
		this.y = 0;
		this.format = "0";
	}

	get width() {
		return this.surface.width;
	}

	get height() {
		return this.surface.height;
	}

	goto(x, y) {
		this.x = INT(x);
		this.y = INT(y);
	}

	print(text) {
		let chars = [...text];

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
					this.surface.text(this.x, this.y, char, this.format);
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