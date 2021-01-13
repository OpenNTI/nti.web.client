/* global $AppConfig */
/**
 * Main module entry point.
 *
 * Exports these modules on top of methods:
 * {@link module:ExternalLibraryManager}
 * {@link module:User}
 * {@link module:TestUtils}
 * @module index
 */


import { Notifier } from '@airbrake/browser';
import { dispatch } from '@nti/lib-dispatcher';
import Logger from '@nti/util-logger';
import dataserver from '@nti/lib-interfaces';
import Storage from '@nti/web-storage';

export * as User from './user';
export { default as ExternalLibraryManager } from './ExternalLibraryManager';
export * as TestUtils from './test-utils';



const logger = Logger.get('nti:bootstrap');


function exposeGlobally (...fns) {

	function wrap (fn) {
		return (...args)=> {
			logger.error(`[DEBUG API ACCESSED (${fn.name})]: This message should only be seen when invoking this method on the REPL.`);
			return fn(...args);
		};
	}

	for (let fn of fns) {
		Object.assign(global, { [fn.name]: wrap(fn) });
	}
}


function noConfig () {
	return typeof global.$AppConfig === 'undefined';
}


/**
 * Get the username of the currently logged in user.
 *
 * @return {string} username
 */
export function getAppUsername () {
	if (noConfig()) {
		logger.error('utils:getAppUsername() was called before config was defined.');
	}
	return $AppConfig.username;
}



/**
 * Get the currently logged in user.
 *
 * @async
 * @return {Promise<User>} user
 */
export function getAppUser () {
	return getService().then(s=> s.getAppUser());
}



/**
 * Resolve the communities the current user is a part of.
 *
 * @async
 * @param  {boolean} excludeGroups Filter out "Groups"
 * @return {Promise<Entity[]>}               [description]
 */
export function getAppUserCommunities (excludeGroups) {
	return getAppUser().then(x => x.getCommunities(excludeGroups));
}


/**
 * Return an interface into local storage the "scopes" all
 * the values to the username.
 *
 * @return {Object}      storage interface
 */
export function getAppUserScopedStorage () {
	getAppUserScopedStorage.cacheScope = getAppUserScopedStorage.cachedScope || btoa(getAppUsername());

	return Storage.scope(getAppUserScopedStorage.cacheScope);
}


/**
 * Get the return url. If we need to redirect back to somewhere a url will be present.
 * This captures the value on first call and retains it for future calls. (So that when
 * routes change we still have it)
 *
 * @param  {boolean} [forceUpdate=false]          Force recapture of the return url value if already set.
 * @param  {Location}  [location=global.location] Supply a custom reference to a Location interface.
 * @param  {string} location.search               A query-string with a 'return' key/value pair.
 * @return {string}                              The return url.
 */
export function getReturnURL (forceUpdate = false, location = global.location) {
	let me = getReturnURL;

	if (!me.value || forceUpdate) {
		const loc = new URLSearchParams(location?.search).get('return');
		if (loc != null) {
			me.value = loc;
		}
	}

	return me.value;
}
getReturnURL(); //capture the return on init.


/**
 * Utility to resolve the basepath for the bootstrap processes.
 *
 * NOTE: This shouldn't be needed in general code/components
 * except in just a few places... if you need this, please ask
 * the team if there is a better way.
 *
 * @return {string} the basePath
 */
export function resolveBasePath () {
	if (typeof document === 'undefined') {
		throw new Error('resolveBasePath() currently does not function for server-side rendering.');
	}

	const {defaultView: {location: {origin}}, scripts, currentScript} = document;
	const ourScripts = x => x.src.startsWith(origin) && /\/js\//.test(x.src);

	// Prefer the current script
	const el = currentScript
		// Fallback to an id,
		|| document.getElementById('main-bundle')
		// Then, if all that fails, the js bundle is generally the last.
		|| Array.from(scripts).filter(ourScripts).pop();

	//{basePath}/js/foobar.js, resolving '..' against it results in {basePath}
	return !el ? '/' : (new URL('..', el.src)).pathname;
}


/**
 * Get the dataserver endpoint url.
 *
 * @return {string} The url where the dataserver (api) endpoint is.
 */
export function getServerURI () {
	if (noConfig()) {
		logger.error('utils:getServerURI() was called before config was defined.');
	}
	return $AppConfig.server;
}


/**
 * Return the name of the current `site`.
 * @return {string} site-name
 */
export function getSiteName () {
	//This can only return a value on the client, on the server it currently returns `undefined`.
	if (typeof $AppConfig !== 'undefined') {
		return $AppConfig.siteName || (global.location || {}).hostname || 'default';
	}
}


/**
 * The url to fetch the user agreement data from.
 *
 * @return {string} user-agreement api endpoint.
 */
export function getUserAgreementURI () {
	return new URL(`${$AppConfig.basepath}api/user-agreement/view`, global.location).toString();
}


/**
 * Feature flag test function. Use this function to test if your feature is enabled or not.
 *
 * @param  {string}  flagName Feature/flag name.
 * @return {boolean}          True if the feature is enabled.
 */
export function isFlag (flagName) {
	if (noConfig()) {
		logger.error('utils:isFlag() was called before config was defined.');
		return false;
	}
	let site = getSiteName();
	let {flags = {}} = $AppConfig;

	flags = { ...flags, ...flags[site] || {}};

	for(const flag of (global.localStorage?.flags || '').split(/,\w*/)) {
		flags[flag] = true;
	}

	return !!flags[flagName];
}


/**
 * Get the config value for a given key.
 *
 * @param  {string} key The key in the config.
 * @return {*}     The value at the key, or an empty object.
 */
export function getConfig (key) {
	const path = key ? key.split('.') : [];
	let value = key ? global.$AppConfig : undefined;

	while (path.length > 0 && value) {
		key = path.shift();
		value = value[key];
	}

	return value || {};
}

/**
 * Get the config value for a given key.
 *
 * @deprecated use getConfig instead
 * @param  {string} key The key in the config.
 * @return {*}     The value at the key, or an empty object.
 */
export function getConfigFor (key) {
	return getConfig(key);
}

/**
 * Gets the external-libraries block. External libraries are loaded on demand.
 *
 * @return {Object} A mapping of external libraries
 * @see {@link module:ExternalLibraryManager}
 */
export function externalLibraries () {
	return getConfig('external-libraries');
}


/**
 * This is for low-level (or anonymous/non-authenticated) work ONLY.
 *
 * @private
 * @returns {Interface} the shared instance of the server interface.
 */
export function getServer () {
	if (noConfig()) {
		logger.error('utils:getServer() was called before config was defined.');
	}
	let fn = getServer;

	if (!fn.interface) {
		let s = $AppConfig.nodeInterface;
		if (!s) {
			if (!$AppConfig.dispatch) {
				Object.assign($AppConfig, { dispatch });
			}
			let i = dataserver($AppConfig);

			s = i.interface;

			fn.datacache = i.datacache;
		}

		fn.interface = s;
	}
	return fn.interface;
}


/**
 * @async
 * @returns {Promise<Service>} a promise that fulfills with the service descriptor.
 */
export function getService () {
	if (noConfig()) {
		logger.error('utils:getService() was called before config was defined.');
	}
	return $AppConfig.nodeService ?
		Promise.resolve($AppConfig.nodeService) :
		getServer().getServiceDocument();
}


exposeGlobally(getServer, getService);


/**
 * DANGER: Do not use in the applications!
 *
 * Used to stub out a non-authenticated config for Widgets.
 * See the History Landing page Gifting Widget
 *
 * @return {void}
 */
export function installAnonymousService () {
	if (noConfig() || $AppConfig.nodeInterface) {
		return;
	}

	delete getServer.interface; //force any previous instances to get rebuilt.
	getServer();//(re)build instances

	//preset-cache to empty doc
	getServer.datacache.getForContext().set('service-doc', {Items: []});
}


/**
 * Force the username to be the given string.
 * Primarily used for unit-tests.
 *
 * @param  {string} name The name you want the username to be.
 * @returns {void}
 */
export function overrideAppUsername (name) {
	if (noConfig()) {
		logger.error('utils:overrideAppUsername() was called before config was defined.');
	}
	$AppConfig.username = name;
}


/**
 * The server url location is configured from the perspective of the node-service. Client-side,
 * we need to rewrite it to point back to the domain that we were served from. Call this once
 * before any other calls to the dataserver in the main entry point.
 *
 * @return {void}
 */
export function overrideConfigAndForceCurrentHost () {
	if (noConfig()) {
		logger.error('utils:overrideConfigAndForceCurrentHost() was called before config was defined.');
	}

	function forceHost (s) {
		const { location } = global;
		//Force our config to always point to our server...(client side)
		const url = new URL(s, location.href);
		let {hostname, protocol, port} = location;
		if (!port || port === '0') {
			port = '';
		}
		Object.assign(url, {hostname, protocol, port});
		return url.toString();
	}

	$AppConfig.server = forceHost($AppConfig.server);
}


// module private variable
let airbrake = null;


/**
 * Initialize the error reporter
 *
 * @method initErrorReporter
 * @return {void}
 */
export async function initErrorReporter () {
	const empty = x => !x || x === '' || x.length === 0;
	if (noConfig()) {
		logger.error('utils:initErrorReporter() was called before config was defined.');
	}

	if (airbrake) {
		logger.warn('utils:initErrorReporter() Airbrake initialized?');
		return;
	}

	const {airbrake: config, appName, appVersion, siteName} = $AppConfig;


	if (typeof config !== 'object') {
		logger.error('utils:initErrorReporter() Airbrake config missing in app config!');
		return;
	}

	if (empty(config.projectKey)) {
		logger.error('utils:initErrorReporter() missing airbrake projectKey config property!');
		return;
	}

	// We're expecting these properties:
	// 		host: string **optional**
	// 		projectId: integer **optional**
	// 		projectKey: string


	airbrake = new Notifier({
		host: 'https://errors.nextthought.io',
		projectId: 1,
		...config,
	});

	function getLocale () {
		try {
			return (new Intl.DateTimeFormat()).resolvedOptions();
		} catch (e) {
			return {};
		}
	}

	airbrake.addFilter(notice => (
		Object.assign(notice.context, {
			environment: siteName,
			client: appName,
			version: appVersion,
			user: {
				id: getAppUsername(),
				...getLocale()
			}
		}),
		//notice.params = QueryString.parse(global.location.search || ''),
		notice
	));
}


/**
 * get the instance of the error reporter
 *
 * @method getErrorReporter
 * @return {Airbrake.Client} The Airbrake Client instance. See https://airbrake.io
 */
export function getErrorReporter () {
	return airbrake;
}


/**
 * Sends the error to our error log.
 *
 * @method reportError
 * @param  {object}    notice The error descriptor. Should have at least an 'error' key.
 * @return {void}
 */
export function reportError (notice) {
	if (!airbrake) { return; }
	airbrake.notify(notice);
}
