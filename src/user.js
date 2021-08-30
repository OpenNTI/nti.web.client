/**
 * Utilities to deal with user entity objects and their IDs.
 *
 * Access by named export on `@nti/web-client`:
 * ```js
 * import {User} from '@nti/web-client';
 * ```
 *
 * @module User
 */

import { getService } from './index';

/**
 * URL encodes username (and if the site is configured to hide usernames, it obfuscates them too)
 *
 * @param {string} username The username to encode. *
 * @returns {string} encoded username
 */
export function encode(username) {
	return encodeURIComponent(username);
}

/**
 * URL decode username (and if the site is configured to hide usernames,
 * its will be encoded per the method above, so decode that too so we can
 * reveal the username)
 *
 * @param {string} blob The string blog to decode.
 * @param {boolean} strict If true this will return NULL if the decoded string is not encoded by the encode method.
 * @returns {string} decoded username.
 */
export function decode(blob, strict) {
	let decoded = decodeURIComponent(blob);
	let str = decoded;

	return str;
}

/**
 * Resolves an entity.
 *
 * @param {Object} props  A dict with keys that will tell us what to do. (For
 *                         react components, this is the props object) If the
 *                         entity object is given, the name is ignored.
 * @param {Object} props.entity The full entity object. No resolve will be
 *                               made, just used as if resolved.
 * @param {Object} props.entityId The entityId to resolve.
 * @param {boolean} props.me
 * @param {boolean} strict Passed to the decode method. If the encoded name
 *                          doesn't pass safety-checks, strict throws it out.
 * @returns {Promise} A promise that will resolve with the entity, or reject
 *                     with a reason for failure.
 */
export async function resolve({ me, entity, entityId }, strict = false) {
	const service = await getService();
	entity = me ? service.getAppUsername() : entity || entityId;

	if (!entity) {
		throw new Error('No Entity');
	}

	if (typeof entity === 'object') {
		return entity;
	}

	entityId = decode(entity, strict);

	return service.resolveEntity(entityId);
}
