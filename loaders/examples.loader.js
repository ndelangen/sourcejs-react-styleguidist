var _ = require('lodash');
var marked = require('marked');

var evalPlaceholder = '<%{#eval#}%>';

var requireAnythingTest = 'require\\s*\\(([^)]+)\\)';
var requireAnythingRegex = new RegExp(requireAnythingTest, 'g');
var simpleStringRegex = /^"([^"]+)"$|^'([^']+)'$/;

function readExamples(markdown) {
	var codeChunks = [];
	var renderer = new marked.Renderer();

	renderer.code = function(code, language) {
		if (language && language === 'jsx') {
			codeChunks.push({type: 'code', content: code, evalInContext: evalPlaceholder});
        }

		return code;
	};

	marked(markdown, {renderer: renderer});

	return codeChunks;
}

// Returns a list of all strings used in require(...) calls in the given source code.
// If there is any other expression inside the require call, it throws an error.
function findRequires(codeString) {
	var requires = {};
	codeString.replace(requireAnythingRegex, function(requireExprMatch, requiredExpr) {
		var requireStrMatch = simpleStringRegex.exec(requiredExpr.trim());
		if (!requireStrMatch) {
			throw new Error('Requires using expressions are not supported in examples. (Used: ' + requireExprMatch + ')');
		}
		var requiredString = requireStrMatch[1] ? requireStrMatch[1] : requireStrMatch[2];
		requires[requiredString] = true;
	});
	return Object.keys(requires);
}

function examplesLoader(source, map) {
	this.cacheable && this.cacheable();

	var examples = readExamples(source);

	// We're analysing the examples' source code to figure out the requires. We do it manually with
	// regexes, because webpack unfortunately doesn't expose its smart logic for rewriting requires
	// (https://webpack.github.io/docs/context.html). Note that we can't just use require(...)
	// directly in runtime, because webpack changes its name to __webpack__require__ or sth.
	// Related PR: https://github.com/sapegin/react-styleguidist/pull/25
	var codeFromAllExamples = _.map(_.filter(examples, {type: 'code'}), 'content').join('\n');
	var requiresFromExamples = findRequires(codeFromAllExamples);

	return [
		'if (module.hot) {',
		'	module.hot.accept([]);',
		'}',
		'var requireMap = {',
		requiresFromExamples.map(function(requireRequest) {
			return '    ' + JSON.stringify(requireRequest) + ': require(' + JSON.stringify(requireRequest) + ')';
		}).join(',\n'),
		'};',
		'function requireInRuntime(path) {',
		'	if (!requireMap.hasOwnProperty(path)) {',
		'		throw new Error("Sorry, changing requires in runtime is currently not supported.")',
		'	}',
		'	return requireMap[path];',
		'}',
		'module.exports = ' + JSON.stringify(examples).replace(
			new RegExp(_.escapeRegExp('"' + evalPlaceholder + '"'), 'g'),
			'function(code) {var require=requireInRuntime; return eval(code);}'
		) + ';',
	].join('\n');
}

_.assign(examplesLoader, {
	requireAnythingTest: requireAnythingTest,
	requireAnythingRegex: requireAnythingRegex,
	simpleStringRegex: simpleStringRegex,
	readExamples: readExamples,
	findRequires: findRequires,
});

module.exports = examplesLoader;
