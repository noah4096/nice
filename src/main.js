import * as term from "./term.js";

let surface = term.Surface.fullSize();
let tty = new term.Terminal(surface);

setInterval(() => {
	tty.format = "1";
	tty.print("Hello world! ");

	tty.format = "0";
	tty.print("Hello world! ");

	surface.drawToTTY();
});