import * as term from "./term.js";

let surface = term.Surface.fullSize();
let tty = new term.Terminal(surface);
let eventManager = new term.TTYEventManager();

eventManager.start();

let loop = setInterval(() => {
	// tty.format = "1";
	// tty.print("Hello world! ");

	// tty.format = "0";
	// tty.print("Hello world! ");

	if (eventManager.queue.length > 0) {
		let event = eventManager.queue.shift();

		if (event instanceof term.TTYMouseEvent) {
			tty.print(`${event.type} ${event.x} ${event.y} ${event.data.substring(1)}\n`);
		}

		if (event.data == "q") {
			eventManager.stop();

			clearInterval(loop);
			process.exit();
		}
	}

	surface.drawToTTY();
});