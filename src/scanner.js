var scanner = {
	log: function(){
		console.log.apply(console, arguments);
	},
	def: function(obj1, obj2){
		for(var i in obj2) {if(obj2.hasOwnProperty(i)){
			obj1[i] = obj2[i];
		}}
		return obj1;
	},
	resultTypes: {"timeout": "timeout", "open": "open", "closed": "closed", "blocked": "blocked"},
	knownBlockedPorts: [0,1,7,9,11,13,15,17,19,20,21,22,23,25,37,42,43,53,77,79,87,95,101,102,103,104,109,110,111,113,115,117,119,123,135,139,143,179,389,465,512,513,514,515,526,530,531,532,540,556,563,587,601,636,993,995,2049,4045,6000],
	isBlocked: function(port) {
		for(var i = 0; i < scanner.knownBlockedPorts.length; i += 1) {
			if(scanner.knownBlockedPorts[i] == port) {
				return true;
			}
		}
		return false;
	},

	maxCalls: 32,

	currentCalls: 0,

	callQueue: [],

	scanIp: function(args){
		var xhr,
			start = (new Date).getTime(),
			doneCall = function(args, type){
				scanner.currentCalls -= 1;
				args.cb({
					ip: args.ip,
					type: type,
					port: args.port
				});
				if(scanner.callQueue.length > 0){
					scanner.scanIp(scanner.callQueue.pop());
				}
			},
			checkProgress = function(){
				var diff = (new Date).getTime() - start;
				if(xhr.readyState == 1) {
					if(diff > args.timeout) {
						xhr.abort();
						doneCall(args, scanner.resultTypes.timeout);
					} else {
						setTimeout(checkProgress, args.progressTimeout);
					}
				} else {
					if(diff < args.timeout) {
						doneCall(args, scanner.resultTypes.open);
					} else {
						doneCall(args, scanner.resultTypes.closed);
					}
				}
			};

		args = scanner.def({
			timeout: 2000,
			progressTimeout: 500
		}, args);

		try {
			if(!scanner.isBlocked(args.port)) {
				if(scanner.currentCalls < scanner.maxCalls) {
					xhr = new XMLHttpRequest();
					xhr.open('GET', "http://" + args.ip + ":" + args.port);
					xhr.send();
					scanner.currentCalls += 1;
					setTimeout(checkProgress, args.progressTimeout);
				} else {
					scanner.callQueue.push(args);
				}
			} else {
				args.cb({type: scanner.resultTypes.blocked, ip: args.ip, port: args.port });
			}
		} catch(ex) {
			scanner.log({error: 'Exception', message: ex.message});
		}
	},
	scanPorts: function(args){
		var results = [],
			count = 0,
			len = args.ports.length,
			callback = function(result){
				results.push(result);
				count += 1;
				if(args.immediate) {
					args.immediate(result);
				}
				if(count == len && args.cb) {
					args.cb(results);
				}
			};
		for(var i = 0; i < args.ports.length; i += 1) {
			scanner.scanIp(scanner.def(args.options || {}, {
				ip: args.ip,
				port: args.ports[i],
				cb: callback
			}));
		}
	},
	scanRange: function(args){
		var results = [],
			count = 0,
			len = args.ips.length * args.ports.length,
			callback = function(result){
				results.push(result);
				count += 1;
				if(args.immediate) {
					args.immediate(result);
				}
				if(count == len && args.cb) {
					args.cb(results);
				}
			};
		
		for(var i = 0; i < args.ips.length; i += 1) {
			for(var j = 0; j < args.ports.length; j += 1) {
				scanner.scanIp(scanner.def(args.options || {}, {
					ip: args.ips[i],
					port: args.ports[j],
					cb: callback
				}));
			}
		}
	},
	scanNetwork: function(args){
		//	Ref: http://stackoverflow.com/a/22927549
		var getRange = function(start, end){
			var startIp = start.split("."),
				endIp = end.split("."),
				ips = [];

			startAddr = 
				parseInt(startIp[0], 10) * 16777216 + 
				parseInt(startIp[1], 10) * 65536 + 
				parseInt(startIp[2], 10) * 256 + 
				parseInt(startIp[3], 10);

			endAddr = 
				parseInt(endIp[0], 10) * 16777216 + 
				parseInt(endIp[1], 10) * 65536 + 
				parseInt(endIp[2], 10) * 256 + 
				parseInt(endIp[3], 10);

			for(var i = startAddr; i < endAddr; i++) {
				var oc4 = (i>>24) & 0xff;
				var oc3 = (i>>16) & 0xff;
				var oc2 = (i>>8) & 0xff;
				var oc1 = i & 0xff;
				
				ips.push(oc4 + "." + oc3 + "." + oc2 + "." + oc1);
			}
			return ips;				
		};

		scanner.scanRange(scanner.def(args, {
			ips: getRange(args.fromIp, args.toIp)
		}));
	}
};