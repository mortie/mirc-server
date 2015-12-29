import File from "./js/file";
import irclib from "./js/irclib";

//For sanity
process.on("unhandledRejection", (err) => console.trace(err));

function initIrc(dir) {
	let networks = {};

	dir.readdir().then((files) => {
		files.forEach((file) => {
			let name = file.basename;

			file.read((str) => {
				networks[name] = irclib.IRCNetwork.deserialize(str);
			});
		});
	});
}

export function start(path) {
	let dir = new File(path);

	dir.mkdir().then(() => {
		initIrc(dir);
	}).catch((err) => {
		if (err.code === "EEXIST")
			return initIrc(dir);
		else
			throw err;
	});
}
