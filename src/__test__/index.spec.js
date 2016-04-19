/* global $AppConfig */
import QueryString from 'query-string';
import Url from 'url';
import Interface from 'nti-lib-interfaces/lib/interface';
import {
	getAppUsername,
	getAppUser,
	getAppUserCommunities,
	getReturnURL,
	getServerURI,
	getSiteName,
	getUserAgreementURI,
	isFlag,
	getConfigFor,
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


	it('getServer', () => {
		const mock = mockInterface;
		//In live code, the getServer returns an an instance of Interface (nti-lib-interfaces)
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
			expect(ds instanceof Interface).toBeTruthy();
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


	it('getService', done => {
		spyOn(mockInterface, 'getServiceDocument').and.callThrough();
		const mockResult = getService();
		const error = jasmine.createSpy();

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


	it('getServerURI', () => {
		expect(getServerURI()).toBe(mockServerURI);
	});


	it ('getAppUsername', () => {
		expect(getAppUsername()).toBe($AppConfig.username);
	});


	it('getAppUser', done => {
		const error = jasmine.createSpy();
		getAppUser()
			.then(user => expect(user).toBe(mockUser))
			.catch(error)
			.then(() => {
				expect(error).not.toHaveBeenCalled();
				done();
			});
	});


	it('getAppUserCommunities', done => {
		const error = jasmine.createSpy('Error');
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


	it('getReturnURL', () => {
		const returnto = 'http://localhost:8082/mobile/course/foobar';
		const mock = {search: `?return=${encodeURIComponent(returnto)}`};

		//We expect this to match initially.
		expect(getReturnURL()).toBe((QueryString.parse(location.search) || {}).return);

		//update to mock...
		expect(getReturnURL(true, mock)).toBe(returnto);
		expect(getReturnURL()).toBe(returnto);

		//reset
		delete getReturnURL.value;
		expect(getReturnURL()).toBe((QueryString.parse(location.search) || {}).return);
	});


	it('getSiteName', () => {
		const expectedSite = $AppConfig.siteName || (global.location || {}).hostname || 'default';
		expect(getSiteName()).toBe(expectedSite);
	});


	it('getUserAgreementURI', () => {
		const uri = getUserAgreementURI();
		const url = Url.parse(uri);

		expect(url).toBeTruthy();
		expect(uri).toBeTruthy();
	});


	it('isFlag', () => {
		expect(isFlag('flagA')).toBe(false);
		expect(isFlag('flagB')).toBe(true);
		expect(isFlag('flagC')).toBe(true);
		expect(isFlag('nope')).toBe(false);

		//Override the site:
		delete $AppConfig.siteName;
		expect(isFlag('flagA')).toBe(true);
	});



	it('getConfigFor', () => {
		expect(getConfigFor('someConfig')).toBe($AppConfig.someConfig);
	});


	it('externalLibraries', () => {
		expect(externalLibraries()).toBe($AppConfig['external-libraries']);
	});


	it('overrideAppUsername', () => {
		const overridden = 'foobar!';
		expect(getAppUsername()).toBe(mockUser.username);
		overrideAppUsername(overridden);
		expect(getAppUsername()).toBe(overridden);
	});


	it('overrideConfigAndForceCurrentHost', () => {
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
