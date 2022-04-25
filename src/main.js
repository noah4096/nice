import * as term from "./term.js";

let surface = term.Surface.fullSize();
let tty = new term.Terminal(surface);
let eventManager = new term.TTYEventManager();

eventManager.start();

let x1 = 0, y1 = 0;

let loop = setInterval(() => {
	// tty.format = "1";
	// tty.print("Hello world! ");

	// tty.format = "0";
	// tty.print("Hello world! ");

	if (eventManager.queue.length > 0) {
		let event = eventManager.queue.shift();

		if (event instanceof term.TTYMouseEvent) {
			surface.clear();
			tty.goto(0, 0);
			tty.print(`${event.type} ${event.x} ${event.y} ${event.data.substring(1)}\n`);

			if (event.type == "left") {
				x1 = event.x;
				y1 = event.y;
			}

			if (event.type == "leftDrag") {
				// tty.print(`${x1} ${y1} ${event.x} ${event.y}\n`);
				surface.rect(x1, y1, event.x, event.y, "7");
			}
		}

		if (event.data == "q") {
			eventManager.stop();

			clearInterval(loop);
			process.exit();
		}
	}

	surface.drawToTTY();
});