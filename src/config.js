const yaml = require('js-yaml');
const fs = require('fs');

function getConfig() {
	let fileContents = fs.readFileSync('./entries.yaml', 'utf8');
	let data = yaml.safeLoad(fileContents);
	return data;
}

module.exports = {getConfig};