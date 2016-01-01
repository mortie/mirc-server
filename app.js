import * as fs from "fs";
import IRCController from "./js/irccontroller.js";
import Comm from "./js/comm.js";
import File from "./js/file.js";

process.on("unhandledRejection", (err) => {
	console.trace(err);
});

process.on("uncaughtException", (err) => {
	console.trace(err);
});

let conf = JSON.parse(fs.readFileSync("conf.json"));

let controller = new IRCController();

let comm = new Comm(conf.port, conf.pass);
comm.on("message", (name, obj, cb) => {
	switch (name) {
	case "network_connect":
		controller.network_connect(obj.host, obj.nick).then(cb, cb);
		break;
	case "network_disconnect":
		controller.network_disconnect(obj.host).then(cb, cb);
		break;
	case "channel_join":
		controller.channel_join(obj.host, obj.chan).then(cb, cb);
		break;
	case "channel_part":
		controller.channel_part(obj.host, obj.chan, obj.msg).then(cb, cb);
		break;
	case "channel_say":
		controller.channel_say(obj.host, obj.chan, obj.msg).then(cb, cb);
		break;
	default:
		cb("No such method: "+name);
	}
});

controller.deserialize(JSON.parse(fs.readFileSync("db.json"))).then(() => {
	comm.init();
});
