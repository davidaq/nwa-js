var fs = require('fs');
var path = require('path');
var _ = require('underscore');

var jsonPath = path.join(BASE, 'build', 'api.json');
// 检查json文件
var exist = fs.existsSync(jsonPath);
var theJson;
if (exist) {
	var data = fs.readFileSync(jsonPath, "utf-8");
	theJson = JSON.parse(data);
} else {
    theJson = {
        types: {},
        actions: {}
    };
}
var theBeans = theJson.types;

global.String.prototype.startsWith = global.String.prototype.startsWith
		|| function(prefix) {
			return this.slice(0, prefix.length) == prefix;
		}
global.String.prototype.endsWith = global.String.prototype.endsWith
		|| function(suffix) {
			return this.slice(0 - suffix.length, this.length) == suffix;
		}

var baseType = {
	"String" : "string",
	"Integer" : "number",
	"Long" : "number",
	"Float" : "number",
	"Double" : "number",
	"Boolean" : "boolean",
}

var er = false;

function checkType(data, bean, dataPath, dataKey) {
	var resultStr = "";
	if (bean.endsWith("[]")) {
		if (_.isArray(data)) {
			for ( var key in data) {
				resultStr += checkType(data[key], bean.slice(0, -2), dataPath
						+ "." + key, key);
			}
		} else {
			resultStr += "field '" + dataPath + ' need to be ' + bean
					+ "' instead of '" + typeof (data) + "'" + "\n";
			console.log("field '\033[35m" + dataPath + "\033[0m' need to be '"
					+ bean + "' instead of '" + typeof (data) + "'");
		}
	} else if (baseType[bean]) {
		if (data instanceof Date && bean == 'Long') {
		} else if (typeof (data) == baseType[bean]) {

		} else {
			resultStr += "field '" + dataPath + ' need to be ' + bean
					+ "' instead of '" + typeof (data) + "'" + "\n";
			console.log("field '\033[35m" + dataPath + "\033[0m' need to be '"
					+ bean + "' instead of '" + typeof (data) + "'");
		}
	} else {
		// 这是一个对象
		var theBean = theBeans[bean];
		var beanAttrArray = {};
		for ( var key in theBean.fields) {
			var value = theBean.fields[key];
			beanAttrArray[key] = value.type;
		}

		for ( var key in data) {
			var value = data[key];
			if (beanAttrArray[key]) {
				resultStr += checkType(data[key], beanAttrArray[key], dataPath
						+ "." + key, key);
			} else {
				if (er) {
					// resultStr += "" + dataPath + "." + key + ' is redundant.'
					// + "\n";
					console.log("\033[37m" + dataPath + "." + key
							+ " is redundant.\033[0m");
				}
			}
		}
	}
	return resultStr;
}

function dataMatchBean(data, bean, echoRedundant, types) {
	er = false;
	console.log("-------------dataMatchBean----------------");
    if (types) {
        theBeans = types;
    }
	return checkType(data, bean, "baseObj", "");
}

module.exports = dataMatchBean;
