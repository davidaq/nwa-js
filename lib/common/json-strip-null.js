global.JSON.stringifyNoNull = function(obj, a, b) {
	if (!obj) {
		return null;
	}
	var passedList = [];
	function removeNulls(obj) {
		if (obj.__REMOVE_NULL__PASSED__)
			return;
		obj.__REMOVE_NULL__PASSED__ = true;
		passedList.push(obj);
		var isArray = obj instanceof Array;
		for ( var k in obj) {
			if (obj[k] === null) {
				isArray ? obj.splice(k, 1) : delete obj[k];
            } else if (obj[k] instanceof Date) {
				var value = obj[k];
				obj[k] = value.getTime();
			} else if (typeof obj[k] == "object")
				removeNulls(obj[k]);
		}
	}
	removeNulls(obj);
	for ( var k in passedList) {
		delete passedList[k].__REMOVE_NULL__PASSED__;
	}
	return JSON.stringify(obj, a, b);
}
