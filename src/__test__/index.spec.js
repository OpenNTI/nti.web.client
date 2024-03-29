/* global $AppConfig */
/* eslint-env jest */

import {
	getAppUsername,
	getAppUser,
	getAppUserCommunities,
	getAppUserScopedStorage,
	getReturnURL,
	getServerURI,
	getSiteName,
	getUserAgreementURI,
	isFlag,
	getConfig,
	externalLibraries,
	getServer,
	getService,
	overrideAppUsername,
	overrideConfigAndForceCurrentHost,
} from '../index';

describe('Client Interface', () => {
	const mockUser = {
		username: 'tester',
		getCommunities() {
			return [{ username: 'ABC' }];
		},
	};

	const mockServerURI = 'http://0.0.0.0:8888/dataserver2test/';

	const mockService = {
		getAppUser() {
			return Promise.resolve(mockUser);
		},
	};

	const mockInterface = {
		getServiceDocument() {
			return Promise.resolve(mockService);
		},
	};

	beforeEach(() => {
		delete getServer.interface;
		delete getServer.datacache;
		global.$AppConfig = {
			siteName: 'Tests',
			server: mockServerURI,
			someConfig: {},
			basepath: '/app/',
			username: mockUser.username,
			nodeInterface: mockInterface,
			nodeService: mockService,
			'external-libraries': {},
			flags: {
				flagA: true,
				flagC: true,

				Tests: {
					flagA: false,
					flagB: true,
				},
			},
		};
	});

	test('getServer', () => {
		const mock = mockInterface;
		//In live code, the getServer returns an an instance of Interface (@nti/lib-interfaces)
		//
		//But... because we mocked it, the function will return the mock.
		expect(getServer()).toBe(mock);
		expect(getServer.interface).toBe(mock);

		//Lets try to clear out the mock and get a real instance, and verify config
		delete $AppConfig.nodeInterface;
		delete getServer.interface;
		delete getServer.datacache;

		try {
			const ds = getServer();
			expect(getServer.interface).toBe(ds);
			expect(ds).toBeTruthy();

			expect(ds.config).toBe($AppConfig);
			expect(ds.config.server).toBe($AppConfig.server);
			expect(getServer.datacache).toBeTruthy();
		} finally {
			//put it back.
			delete getServer.datacache;
			$AppConfig.nodeInterface = mock;
			getServer.interface = mock;
		}
	});

	test('getService', done => {
		jest.spyOn(mockInterface, 'getServiceDocument');
		const mockResult = getService();
		const error = jest.fn();

		delete $AppConfig.nodeService;
		const result = getService();

		expect(mockInterface.getServiceDocument).toHaveBeenCalledWith();
		expect(mockResult).toBeTruthy();
		expect(mockResult.then).toBeTruthy();

		expect(result).toBeTruthy();
		expect(result.then).toBeTruthy();

		Promise.all([mockResult, result])
			.then(r => {
				const [mock, meh] = r;

				expect(mock).toBe(mockService);
				expect(meh).toBeTruthy();
			})
			.catch(error)
			.then(() => expect(error).not.toHaveBeenCalled())
			.then(done);
	});

	test('getServerURI', () => {
		expect(getServerURI()).toBe(mockServerURI);
	});

	test('getAppUsername', () => {
		expect(getAppUsername()).toBe($AppConfig.username);
	});

	test('getAppUser', done => {
		const error = jest.fn();
		getAppUser()
			.then(user => expect(user).toBe(mockUser))
			.catch(error)
			.then(() => {
				expect(error).not.toHaveBeenCalled();
				done();
			});
	});

	test('getAppUserCommunities', done => {
		const error = jest.fn('Error');
		getAppUserCommunities()
			.then(list => {
				//In live code, the list will be instances of Community objects.
				expect(list).toEqual([{ username: 'ABC' }]);
			})
			.catch(error)
			.then(() => {
				expect(error).not.toHaveBeenCalled();
				done();
			});
	});

	test('getAppUserScopedStorage', () => {
		const storage = getAppUserScopedStorage();

		expect(storage.getItem).toBeDefined();
		expect(storage.setItem).toBeDefined();
		expect(storage.removeItem).toBeDefined();
		expect(storage.scope).toBeDefined();

		expect(getAppUserScopedStorage.cacheScope).toBeDefined();
	});

	test('getReturnURL', () => {
		const returnTo = 'http://localhost:8082/mobile/course/foobar';
		const mock = { search: `?return=${encodeURIComponent(returnTo)}` };

		//We expect this to match initially.
		expect(getReturnURL()).toBeUndefined();

		//update to mock...
		expect(getReturnURL(true, mock)).toBe(returnTo);
		expect(getReturnURL()).toBe(returnTo);

		//reset
		delete getReturnURL.value;
		expect(getReturnURL()).toBeUndefined();
	});

	test('getSiteName', () => {
		const expectedSite =
			$AppConfig.siteName ||
			(global.location || {}).hostname ||
			'default';
		expect(getSiteName()).toBe(expectedSite);
	});

	test('getUserAgreementURI', () => {
		const uri = getUserAgreementURI();
		expect(uri).toBeTruthy();
		expect(() => new URL(uri)).not.toThrow();
	});

	test('isFlag', () => {
		expect(isFlag('flagA')).toBe(false);
		expect(isFlag('flagB')).toBe(true);
		expect(isFlag('flagC')).toBe(true);
		expect(isFlag('nope')).toBe(false);

		//Override the site:
		delete $AppConfig.siteName;
		expect(isFlag('flagA')).toBe(true);
	});

	test('getConfig', () => {
		expect(getConfig('someConfig')).toBe($AppConfig.someConfig);
	});

	test('externalLibraries', () => {
		expect(externalLibraries()).toBe($AppConfig['external-libraries']);
	});

	test('overrideAppUsername', () => {
		const overridden = 'foobar!';
		expect(getAppUsername()).toBe(mockUser.username);
		overrideAppUsername(overridden);
		expect(getAppUsername()).toBe(overridden);
	});

	describe('location', () => {
		let oldLocation = window.location;
		beforeEach(() => {
			delete window.location;
		});

		afterEach(() => {
			delete window.location;
			window.location = oldLocation;
		});

		test('overrideConfigAndForceCurrentHost', () => {
			expect($AppConfig.server).toBe(mockServerURI);
			window.location = new URL('https://example.com');
			overrideConfigAndForceCurrentHost();

			expect($AppConfig.server).toBe('/dataserver2test/');
		});

		test('overrideConfigAndForceCurrentHost (bad port)', () => {
			expect($AppConfig.server).toBe(mockServerURI);
			window.location = new URL('https://example.com:0');
			overrideConfigAndForceCurrentHost();

			expect($AppConfig.server).toBe('/dataserver2test/');
		});

		test('overrideConfigAndForceCurrentHost (bad port, int)', () => {
			expect($AppConfig.server).toBe(mockServerURI);
			window.location = new URL('https://example.com');
			window.location.port = 0;
			overrideConfigAndForceCurrentHost();

			expect($AppConfig.server).toBe('/dataserver2test/');
		});
	});
});
