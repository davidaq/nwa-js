;
JSON.format = function(jsonObj) {
	if (typeof (jsonObj) == "string") {
		jsonObj = JSON.parse(jsonObj);
	}
	if (typeof (jsonObj) == "object") {
		return JSON.stringify(jsonObj, null, 4);
	}
	return jsonObj.toString();
}