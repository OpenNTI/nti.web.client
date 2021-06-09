/**
 * Access by named export on `@nti/web-client`:
 * ```js
 * import * as TestUtils from '@nti/web-client/test-utils';
 * ```
 *
 * @module TestUtils
 */

import { ServiceDocument as Service } from '@nti/lib-interfaces';

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
 * @param {string} [siteName='Tests']
 * @param {Object} [flags]
 * @returns {void}
 */
export const setupTestClient = (
	service = {},
	username = 'Test',
	siteName = 'Tests',
	flags = {}
) => {
	global.dispatchEvent?.(new CustomEvent('flush-service-document'));
	const g = global.$AppConfig || {};
	if (service?.mockInstanceData) {
		service = new Service(service, {
			async getPong() {},
			async get(url) {
				throw new Error('Mock this request: ' + url);
			},
		});
	}

	global.$AppConfig = {
		...g,
		username: username || g.username,
		siteName: siteName || g.siteName,
		flags: flags || g.flags,
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
	global.dispatchEvent?.(new CustomEvent('flush-service-document'));
	const { $AppConfig } = global;
	delete $AppConfig.nodeInterface;
	delete $AppConfig.nodeService;
};
