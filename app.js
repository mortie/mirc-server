import * as fs from "fs";
import IRCController from "./js/irccontroller.js";
import Comm from "./js/comm.js";
import File from "./js/file.js";
import api from "./js/api.js";

//Catch unhandled rejections, better than swallowing all errors
process.on("unhandledRejection", (err) => {
	console.trace(err);
	process.exit(1);
});

//Catch uncaught exceptions, will prevent crashes
process.on("uncaughtException", (err) => {
	console.trace(err);
	process.exit(1);
});

//Ensure graceful exit
process.on("SIGTERM", deinit);
process.on("SIGINT", deinit);

//Read conf file
let conf = JSON.parse(fs.readFileSync("conf.json"));

//Create IRC controller and HTTP communication
let controller = new IRCController();
let comm = new Comm(conf.port, conf.pass);

//Prepare database things
let db;
{
	let dbdir = new File("db");

	db = {
		networks: dbdir.sub("networks.json"),
		uploads: dbdir.sub("uploads")
	}

	dbdir.mkdir().then(init);
}

//Graceful exit
function deinit() {
	db.networks.write(JSON.stringify(controller.serialize(), null, 4)).then(() => {
		process.exit();
	});
}

function init() {

	//Create all db files
	let promises = [
		db.networks.create(),
		db.uploads.mkdir()
	];

	Promise.all(promises).then(() => {
		
		//Start API listener
		api.init(comm, controller, db, conf);

		//Connect to networks
		db.networks.read().then((str) => {
			let networks;
			if (str.length > 0)
				networks = JSON.parse(str);
			else
				networks = [];

			controller.deserialize(networks, conf.opts).then(() => {
				comm.init();
			});
		});
	});
}
