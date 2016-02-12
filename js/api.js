exports.init = function(comm, controller, db, conf) {
	comm.on("method", (name, obj, cb) => {
		switch (name) {
		case "network_connect":
			let opts = {};
			obj.opts = obj.opts || {};
			Object.keys(conf.opts).forEach(key => {
				opts[key] = obj.opts[key] || conf.opts[key]
			});
			controller.network_connect(obj.host, obj.nick, opts).then(cb, cb);
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
		case "state":
			controller.getState().then(res => cb(null, res)).catch(cb);
			break;
		default:
			cb("No such method: "+name);
		}
	});

	comm.on("upload", (body, data, cb) => {
		let lastid = db.uploads.sub("_lastid");

		lastid.create().then(lastid.read("utf8").then((res) => {
			let id = parseInt(res);
			if (isNaN(id))
				id = 0;

			id = (id + 1).toString();
			lastid.write(id);

			db.uploads.sub(id).write(body).then(() => cb)
		})).catch(err => cb(err));
	});

	comm.on("get", (req, res, args) => {
		
	});
}
