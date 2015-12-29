var fs = require("fs");
var pathlib = require("path");

export default class {
	constructor(path) {
		this._path = path;
	}

	get path() {
		return this._path;
	}

	get basename() {
		return pathlib.basename(this.path);
	}

	create() {
		return new Promise((resolve, reject) => {
			fs.open(this.path, "w", (err, fd) => {
				if (err) {
					reject(err);
				} else {
					fs.close(fd, (err) => {
						if (err)
							reject(err);
						else
							resolve();
					});
				}
			});
		});
	}

	mkdir() {
		return new Promise((resolve, reject) => {
			fs.mkdir(this.path, (err) => {
				if (err)
					reject(err);
				else
					resolve();
			});
		});
	}

	createReadStream(options) {
		return new Promise((resolve, reject) => {
			let stream;
			try {
				stream = fs.createReadStream(this.path, options);
			} catch (err) {
				return reject(err);
			}

			//If options.fd exists, no open event will be emitted
			//because the file is already open
			if (options.fd) {
				resolve(stream);
			} else {
				stream.on("open", () => {
					resolve(stream);
				});
			}
		});
	}

	createWriteStream(options) {
		return new Promise((resolve, reject) => {
			let stream;
			try {
				stream = fs.createWriseStream(this.path, options);
			} catch (err) {
				return reject(err);
			}

			//If options.fd exists, no open event will be emitted
			//because the file is already open
			if (options.fd) {
				resolve(stream);
			} else {
				stream.on("open", () => {
					resolve(stream);
				});
			}
		});
	}

	read(enc) {
		return new Promise((resolve, reject) => {
			fs.readFile(this.path, enc, (err, res) => {
				if (err)
					reject(err);
				else
					resolve(res);
			});
		});
	}

	readdir() {
		return new Promise((resolve, reject) => {
			fs.readdir(this.path, (err, files) => {
				if (err)
					reject(err);
				else
					resolve(files.map(file => new File(`${this.path}/file`)));
			});
		});
	}

	stat() {
		return new Promise((resolve, reject) => {
			fs.stat(this.path, function(err, res) {
				if (err)
					reject(err);
				else
					resolve(res);
			});
		});
	}

	write(str) {
		return new Promise((resolve, reject) => {
			fs.writeFile(this.path, str, (err) => {
				if (err)
					reject(err);
				else
					resolve();
			});
		});
	}

	append(str) {
		return new Promise((resolve, reject) => {
			fs.appendFile(this.path, str, (err) => {
				if (err)
					reject(err);
				else
					resolve();
			});
		});
	}

	rename(newPath) {
		return new Promise((resolve, reject) => {
			fs.rename(this.path, newPath, (err) => {
				if (err) {
					reject(err);
				} else {
					this._path = newPath;
					resolve();
				}
			});
		});
	}

	chmod(mode) {
		return new Promise((resolve, reject) => {
			fs.chmod(this.path, mode, (err) => {
				if (err)
					reject(err);
				else
					resolve();
			});
		});
	}

	chown(uid, gid) {
		return new Promise((resolve, reject) => {
			fs.chown(uid, gid, (err) => {
				if (err)
					reject(err);
				else
					resolve();
			});
		});
	}

	rmdir() {
		return new Promise((resolve, reject) => {
			fs.rmdir(this.path, (err) => {
				if (err)
					reject(err);
				else
					resolve();
			});
		});
	}

	unlink() {
		return new Promise((resolve, reject) => {
			fs.unlink(this.path, (err) => {
				if (err)
					reject(err);
				else
					resolve(err);
			});
		});
	}
}
