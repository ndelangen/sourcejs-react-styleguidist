export function setComponentsNames(components) {
	Object.keys(components).forEach(key => {
		var component = components[key];

		let module = component.module;
		component.name = module.displayName || module.name;
		if (!component.name) {
			throw Error(`Cannot detect component name for ${component.filepath}`);
		}
	});

	return components;
}

export function globalizeComponents(components) {
	Object.keys(components).forEach(key => {
		var component = components[key];

		global[component.name] = component.module;
	});
}
