var fs = require('fs');
var path = require('path');
var glob = require('glob');
var prettyjson = require('prettyjson');
var _ = require('lodash');
var config = require('../src/utils/config');

function processComponent(filepath) {
	var examplesFile = config.getExampleFilename(filepath);
	var hasExamples = !!fs.existsSync(examplesFile);
	return '{' + [
			'filepath: ' + JSON.stringify(filepath),
			'relativePath: ' + JSON.stringify(path.relative(config.rootDir, filepath)),
			'module: ' + requireIt(filepath),
			'examples: ' + (hasExamples ? requireIt('examples!' + examplesFile) : null)
		].join(',') + '}';
}

function requireIt(filepath) {
	return 'require(' + JSON.stringify(filepath) + ')';
}

module.exports = function() {};
module.exports.pitch = function() {
	this.cacheable && this.cacheable();

	var componentSources;
	if (typeof config.components === 'function') {
		componentSources = config.components(config, glob);
	}
	else {
		componentSources = glob.sync(path.join(config.rootDir, config.components));
	}

	if (config.verbose) {
		console.log();
		console.log('Loading components:');
		console.log(prettyjson.render(componentSources));
		console.log();
	}

	var specPah;
	var specId;
	var components = componentSources.map(function(item){
		specPah = config.getExampleFilename(item);
		specId = path.dirname(specPah.replace(global.userPath, '')).replace(/^\//, '').toLowerCase();

		return '"' + specId + '":' + processComponent(item);
	});

	var simplifiedConfig = _.pick(config, [
		'title',
		'highlightTheme'
	]);

	return [
		'module.exports = {',
		'	config: ' + JSON.stringify(simplifiedConfig) + ',',
		'	components: {' + components.join(',') + '}',
		'};'
	].join('\n');
};
