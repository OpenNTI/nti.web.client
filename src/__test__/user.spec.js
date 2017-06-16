/* globals spyOn */
/* eslint-env jest */
import {getDebugUsernameString, encode, decode, resolve} from '../user';

describe('User utils', () => {

	function enableObfuscation () {
		global.$AppConfig.flags['obfuscate-usernames'] = true;
	}

	beforeEach(() => {
		global.$AppConfig = {
			flags: {},
			siteName: 'Tests',
			nodeService: {
				resolveEntity (id) {
					return Promise.resolve({Username: id});
				}
			}
		};
	});


	test ('getDebugUsernameString', () => {
		const username = 'Foobar';
		const entity = {Username: username};
		const randomNonStringNonObject = () => {};

		expect(getDebugUsernameString(username)).toBe(void 0);
		enableObfuscation();
		expect(getDebugUsernameString(username)).toBe(username);
		expect(getDebugUsernameString(entity)).toBe(username);
		expect(getDebugUsernameString(randomNonStringNonObject)).toBe('Unknown');
	});


	test ('encode', () => {
		const name = 'johnny appleseed';
		const uriencoded = encodeURIComponent(name);
		expect(encode(name)).toBe(uriencoded);

		enableObfuscation();

		const out = encode(name);
		expect(out).toBeTruthy();
		expect(out).not.toBe(uriencoded);
		expect(out).not.toBe(name);
	});


	test ('decode', () => {
		const name = 'johnny appleseed';
		const uriencoded = encodeURIComponent(name);

		expect(decode(uriencoded)).toBe(name);

		enableObfuscation();
		expect(decode(uriencoded)).toBe(name);
		expect(decode(uriencoded, true)).toBe(null);
		expect(decode(encode(name)), true).toBe(name);
		expect(decode(encode(name))).toBe(name);
	});


	test ('resolve', done => {
		const entityId = 'TestABC';
		const entity = {Username: entityId};

		spyOn(global.$AppConfig.nodeService,'resolveEntity').and.callThrough();

		const resolveShortCircut = resolve({entity, entityId});
		expect(global.$AppConfig.nodeService.resolveEntity).not.toHaveBeenCalled();

		const resolveMakeRequest = resolve({entityId});
		resolveMakeRequest.then(() =>
			expect(global.$AppConfig.nodeService.resolveEntity).toHaveBeenCalled()
		);

		enableObfuscation();
		const resolveMakeRequestEncoded = resolve({entityId: encode(entityId)});

		Promise.all([
			resolveShortCircut,
			resolveMakeRequest,
			resolveMakeRequestEncoded
		])
			.then(results => {

				expect(results.map(x => x.Username).every(name => name === entityId)).toBeTruthy();

				done();
			});
	});

});
