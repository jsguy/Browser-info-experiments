//	Ref: http://stackoverflow.com/a/32841164
function findIP(callback) {
	var myPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection,
		pc = new myPeerConnection({
			iceServers: [{urls: "stun:stun.services.mozilla.com"}]
		}, {
			optional: [{RtpDataChannels: true}]
		}),
		noop = function() {},
		capturedIPs = {},
		ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/g,
		ipCapture = function(ip) {
			if (!capturedIPs[ip]){
				capturedIPs[ip] = true;
				callback(ip);
			}
		};

	// create offer and set local description, using empty data channel
 	pc.createDataChannel("");
	pc.createOffer(function(sdp) {
		sdp.sdp.split('\n').forEach(function(line) {
			if (line.indexOf('candidate') < 0) return;
			line.match(ipRegex).forEach(ipCapture);
		});
		pc.setLocalDescription(sdp, noop, noop);
	}, noop);

	//	Listen for candidate events
	pc.onicecandidate = function(ice) { 
		if (!ice || !ice.candidate || !ice.candidate.candidate || !ice.candidate.candidate.match(ipRegex)){
			return;
		}
		ice.candidate.candidate.match(ipRegex).forEach(ipCapture);
	};
};