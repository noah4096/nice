import * as term from "./term.js";

let surface = new term.Surface(80, 25);
let tty = new term.Terminal(surface);

setInterval(() => {
	tty.print("Hello world! ");
	surface.drawToTTY();
});