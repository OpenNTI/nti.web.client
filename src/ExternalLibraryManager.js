import Logger from '@nti/util-logger';

import {externalLibraries} from './';

const logger = Logger.get('ExternalLibrariesManager');

const injected = {};

//export for testing
export function getSymbol (scope, expression) {
	const path = expression.split('.').reverse();

	let prop;
	while(path.length > 1 && scope) {
		prop = path.pop();
		scope = scope[prop];
	}

	const leafExists = scope && scope.hasOwnProperty(path[0]);

	if (!scope || path.length > 1 || !leafExists) {
		if (!leafExists) {
			prop = path[0];
		}
		logger.warn(`"${expression}" did not evaluate to a value. Last property tried: ${prop}`);
		return false;
	}

	return {
		scope,
		symbol: scope[path.pop()]
	};
}

//export for testing
export function appendToSingletonElement (document, tagName, child) {
	const el = (document[tagName] || document.getElementsByTagName(tagName)[0]);
	el.appendChild(child);
}

//export for testing
export function createElement (document, tag, props) {
	const el = document.createElement(tag);
	Object.assign(el, props || {});
	return el;
}

/**
 * This module is intended to be mixed into a component, but may be used directly.
 *
 * Access by named export on `@nti/web-client`:
 * ```js
 * import {ExternalLibraryManager} from '@nti/web-client';
 * ```
 * @module ExternalLibraryManager
 */
export default {


	/**
	 * Reuses or loads external libraries. It will wait for them to load & initialize based
	 * on a predicate defined in the external libraries entry.
	 *
	 * @async
	 * @param  {string|string[]} id The key or keys in the external-libraries object.
	 * @return {Promise<string|string[]>} Resolves when all the scripts have loaded and their predicates are satisfied.
	 */
	ensureExternalLibrary (id) {
		if (Array.isArray(id)) {
			return Promise.all(id.map(x => this.ensureExternalLibrary(x)));
		}

		const config = externalLibraries();

		const lib = config[id] || {};
		const {requires = [], url, definesSymbol, invokeDefinedSymbol = false, stylesheets = []} = lib;


		if (!url) {
			return Promise.reject(`No ${id} Library (properly) Defined`);
		}

		if (!definesSymbol) {
			return Promise.reject(`Library ${id} should have an expression for "definesSymbol"`);
		}

		return Promise.all(requires.map(dep => this.ensureExternalLibrary(dep)))
			.then(() => {
				this.injectStyles(stylesheets, id);
				return this.injectScript(url, definesSymbol, invokeDefinedSymbol);
			});
	},


	/**
	 * Injects a stylesheet into the dom.
	 *
	 * @async
	 * @param  {string[]} urls Urls for stylesheets to inject
	 * @param  {string} forDep external-libraries id (key in object)
	 * @return {Promise<Link[]>} fulfills with an array of link elements that represent the individual stylesheets
	 */
	injectStyles (urls, forDep) {
		const promises = [];

		for (let url of urls) {
			const id = `${forDep}-${url.replace(/[/\\]/gi, '-')}`;

			if (!injected[id]) {
				injected[id] = new Promise((fulfill, reject) => {
					let i = 0;
					const link = createElement(document, 'link', {
						rel: 'stylesheet',
						type: 'text/css',
						href: url,
						id
					});

					function check () {
						if (link.style) { fulfill(link); }

						//30 seconds, if each interval is 10ms
						else if (i++ > 3000) { reject('Timeout'); }

						else {
							schedualCheck();
						}
					}

					function schedualCheck () {
						setTimeout(check, 10);
					}


					appendToSingletonElement(document, 'head', link);
					schedualCheck();
				});
			}

			promises.push(injected[id]);
		}

		return Promise.all(promises);
	},


	/**
	 * Inject a script into the document. Waits for it to load & initialize.
	 *
	 * @async
	 * @param  {string} scriptUrl            The url of the script
	 * @param  {string} shouldDefineSymbol   A key-path expression that should evaluate to truthy once the script is loaded.
	 * @param  {boolean} invokeDefinedSymbol If true, the defined symbol is assumed to be a function and will be invoked.
	 * @return {Promise<Script>}             The script element for this injected script.
	 */
	injectScript (scriptUrl, shouldDefineSymbol, invokeDefinedSymbol) {

		if (!injected[shouldDefineSymbol]) {
			injected[shouldDefineSymbol] = new Promise((fulfill, reject)=> {

				let script = createElement(document, 'script', {
					async: true, //Do not block the UI thread while loading.
					defer: true, //legacy version of async
					charset: 'utf-8',  //Be explicit
					type: 'text/javascript', //Be explicit
					src: scriptUrl,

					// Some browsers may not fire an error... so we mush check in the 'load' event
					// for an expected symbol to be defined.
					onerror: reject,

					onload: ()=> {
						const symbolDescriptor = getSymbol(global, shouldDefineSymbol);

						if (shouldDefineSymbol && !symbolDescriptor) {
							return reject('Loaded, but expected interface was not found: '.concat(shouldDefineSymbol));
						} else if (invokeDefinedSymbol) {
							const {scope, symbol} = symbolDescriptor;
							symbol.call(scope);
						}

						fulfill(script);
					}
				});

				// don't inject the element until all handlers are registered. If the src is cached,
				// the handlers may fire before they're registered.
				appendToSingletonElement(document, 'body', script);
			});
		}

		return injected[shouldDefineSymbol];
	}

};
