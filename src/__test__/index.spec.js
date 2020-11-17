/* global $AppConfig, spyOn */
/* eslint-env jest */
import Url from 'url';

import QueryString from 'query-string';


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
	overrideConfigAndForceCurrentHost
} from '../index';

describe('Client Interface', () => {
	const mockUser = {
		username: 'tester',
		getCommunities () {
			return [{username:'ABC'}];
		}
	};

	const mockServerURI = 'http://0.0.0.0:8888/dataserver2test/';

	const mockService = {
		getAppUser () {
			return Promise.resolve(mockUser);
		}
	};

	const mockInterface = {
		getServiceDocument () { return Promise.resolve(mockService); }
	};

	beforeEach(() => {
		delete getServer.interface;
		delete getServer.datacache;
		global.$AppConfig = {
			siteName: 'Tests',
			server: mockServerURI,
			someConfig: {},
			username: mockUser.username,
			nodeInterface: mockInterface,
			nodeService: mockService,
			'external-libraries': {},
			flags: {
				flagA: true,
				flagC: true,

				Tests: {
					flagA: false,
					flagB: true
				}
			}
		};
	});


	test ('getServer', () => {
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
		}
		finally {
			//put it back.
			delete getServer.datacache;
			$AppConfig.nodeInterface = mock;
			getServer.interface = mock;
		}
	});


	test ('getService', done => {
		spyOn(mockInterface, 'getServiceDocument').and.callThrough();
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
			.then((r) => {
				const [mock, meh] = r;

				expect(mock).toBe(mockService);
				expect(meh).toBeTruthy();
			})
			.catch(error)
			.then(() => expect(error).not.toHaveBeenCalled())
			.then(done);
	});


	test ('getServerURI', () => {
		expect(getServerURI()).toBe(mockServerURI);
	});


	test ('getAppUsername', () => {
		expect(getAppUsername()).toBe($AppConfig.username);
	});


	test ('getAppUser', done => {
		const error = jest.fn();
		getAppUser()
			.then(user => expect(user).toBe(mockUser))
			.catch(error)
			.then(() => {
				expect(error).not.toHaveBeenCalled();
				done();
			});
	});


	test ('getAppUserCommunities', done => {
		const error = jest.fn('Error');
		getAppUserCommunities()
			.then(list => {
				//In live code, the list will be instances of Community objects.
				expect(list).toEqual([{username: 'ABC'}]);
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


	test ('getReturnURL', () => {
		const returnto = 'http://localhost:8082/mobile/course/foobar';
		const mock = {search: `?return=${encodeURIComponent(returnto)}`};

		//We expect this to match initially.
		expect(getReturnURL()).toBe((QueryString.parse(global.location.search) || {}).return);

		//update to mock...
		expect(getReturnURL(true, mock)).toBe(returnto);
		expect(getReturnURL()).toBe(returnto);

		//reset
		delete getReturnURL.value;
		expect(getReturnURL()).toBe((QueryString.parse(global.location.search) || {}).return);
	});


	test ('getSiteName', () => {
		const expectedSite = $AppConfig.siteName || (global.location || {}).hostname || 'default';
		expect(getSiteName()).toBe(expectedSite);
	});


	test ('getUserAgreementURI', () => {
		const uri = getUserAgreementURI();
		const url = Url.parse(uri);

		expect(url).toBeTruthy();
		expect(uri).toBeTruthy();
	});


	test ('isFlag', () => {
		expect(isFlag('flagA')).toBe(false);
		expect(isFlag('flagB')).toBe(true);
		expect(isFlag('flagC')).toBe(true);
		expect(isFlag('nope')).toBe(false);

		//Override the site:
		delete $AppConfig.siteName;
		expect(isFlag('flagA')).toBe(true);
	});



	test ('getConfig', () => {
		expect(getConfig('someConfig')).toBe($AppConfig.someConfig);
	});


	test ('externalLibraries', () => {
		expect(externalLibraries()).toBe($AppConfig['external-libraries']);
	});


	test ('overrideAppUsername', () => {
		const overridden = 'foobar!';
		expect(getAppUsername()).toBe(mockUser.username);
		overrideAppUsername(overridden);
		expect(getAppUsername()).toBe(overridden);
	});


	test ('overrideConfigAndForceCurrentHost', () => {
		expect($AppConfig.server).toBe(mockServerURI);
		overrideConfigAndForceCurrentHost();

		function forceHost (s) {
			//Force our config to always point to our server...(client side)
			let url = Url.parse(s);
			let {host, hostname, protocol, port} = global.location;
			Object.assign(url, {url, host, hostname, protocol, port});

			return url.format();
		}

		expect($AppConfig.server).toBe(forceHost(mockServerURI));
	});

});
