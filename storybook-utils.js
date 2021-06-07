/**
 * Access by named export on `@nti/web-client`:
 * ```js
 * import * as StorybookUtils from '@nti/web-client/storybook-utils';
 * or
 * import {useLiveService} from '@nti/web-client/storybook-utils';
 * ```
 *
 * @module StorybookUtils
 */
// eslint-disable-next-line import/no-extraneous-dependencies
import { useEffect } from 'react';

import { setupTestClient, tearDownTestClient } from './test-utils.js';

/**
 * Makes sure the service used by the components within the story get a real instance.
 *
 * @returns {void}
 */
export function useRealService() {
	useEffect(
		() => {
			// clear all mocks
			tearDownTestClient();
			// clear any caches
			return tearDownTestClient;
		},
		// the empty deps list ensures this hook is only run on mount and cleaned up on unmount.
		[]
	);
}

/**
 * Initialize a test environment.
 *
 * @param  {Object} [service={}] A service document object/instance.
 * @param {string} [username='Test']
 * @param {string} [siteName='Tests']
 * @param {Object} [flags]
 * @returns {void}
 */
export function useMockService(
	service = {},
	username = 'Test',
	siteName = 'Tests',
	flags = {}
) {
	useEffect(
		() => {
			setupTestClient(service, username, siteName, flags);

			// clear all mocks and caches
			return tearDownTestClient;
		},
		// the empty deps list ensures this hook is only run on mount and cleaned up on unmount.
		[]
	);
}
