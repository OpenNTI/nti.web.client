/* eslint-env jest */
import { getDebugUsernameString, encode, decode, resolve } from '../user';
import { setupTestClient } from '../../test-utils.js';

describe('User utils', () => {
	function enableObfuscation() {
		global.$AppConfig.flags['obfuscate-usernames'] = true;
	}

	beforeEach(() => {
		setupTestClient({
			async resolveEntity(id) {
				return { Username: id };
			},
		});
	});

	test('getDebugUsernameString', () => {
		const username = 'Foobar';
		const entity = { Username: username };
		const randomNonStringNonObject = () => {};

		expect(getDebugUsernameString(username)).toBe(void 0);
		enableObfuscation();
		expect(getDebugUsernameString(username)).toBe(username);
		expect(getDebugUsernameString(entity)).toBe(username);
		expect(getDebugUsernameString(randomNonStringNonObject)).toBe(
			'Unknown'
		);
	});

	test('encode', () => {
		const name = 'johnny appleseed';
		const uriEncoded = encodeURIComponent(name);
		expect(encode(name)).toBe(uriEncoded);

		enableObfuscation();

		const out = encode(name);
		expect(out).toBeTruthy();
		expect(out).not.toBe(uriEncoded);
		expect(out).not.toBe(name);
	});

	test('decode', () => {
		const name = 'johnny appleseed';
		const uriEncoded = encodeURIComponent(name);

		expect(decode(uriEncoded)).toBe(name);

		enableObfuscation();
		expect(decode(uriEncoded)).toBe(name);
		expect(decode(uriEncoded, true)).toBe(null);
		expect(decode(encode(name), true)).toBe(name);
		expect(decode(encode(name))).toBe(name);
	});

	test('resolve', done => {
		const entityId = 'TestABC';
		const entity = { Username: entityId };

		jest.spyOn(global.$AppConfig.nodeService, 'resolveEntity');

		const resolveShortCircuit = resolve({ entity, entityId });
		expect(
			global.$AppConfig.nodeService.resolveEntity
		).not.toHaveBeenCalled();

		const resolveMakeRequest = resolve({ entityId });
		resolveMakeRequest.then(() =>
			expect(
				global.$AppConfig.nodeService.resolveEntity
			).toHaveBeenCalled()
		);

		enableObfuscation();
		const resolveMakeRequestEncoded = resolve({
			entityId: encode(entityId),
		});

		Promise.all([
			resolveShortCircuit,
			resolveMakeRequest,
			resolveMakeRequestEncoded,
		]).then(results => {
			expect(
				results.map(x => x.Username).every(name => name === entityId)
			).toBeTruthy();

			done();
		});
	});
});
