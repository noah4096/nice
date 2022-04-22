import * as term from "./term.js";

let surface = new term.Surface(80, 24);

surface.text(10, 20, "Hello world!");

surface.drawToTTY();