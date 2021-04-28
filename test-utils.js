/**
 * Access by named export on `@nti/web-client`:
 * ```js
 * import { * as TestUtils } from '@nti/web-client/test-utils';
 * ```
 *
 * @module TestUtils
 */

/** @typedef {import('@nti/lib-interfaces/src/stores/Service').default} Service */

/**
 * Apply values to the service.
 *
 * @param  {Object} keyValues An object of key/value pairs to apply to the service document instance.
 * @returns {Service} Returns the current instance of the service document.
 */
export const hookService = keyValues =>
	Object.assign(global.$AppConfig.nodeService, keyValues);

/**
 * Initialize a test environment.
 *
 * @param  {Object} [service={}] A service document object/instance.
 * @param {string} [username='Test']
 * @returns {void}
 */
export const setupTestClient = (service = {}, username = 'Test') => {
	global.$AppConfig = {
		username,
		...(global.$AppConfig || {}),
		nodeService: service || {},
		nodeInterface: {
			getServiceDocument: () =>
				Promise.resolve(global.$AppConfig.nodeService),
		},
	};
};

/**
 * Destroy the test environment.
 *
 * @returns {void}
 */
export const tearDownTestClient = () => {
	//unmock getService()
	const { $AppConfig } = global;
	delete $AppConfig.nodeInterface;
	delete $AppConfig.nodeService;
};