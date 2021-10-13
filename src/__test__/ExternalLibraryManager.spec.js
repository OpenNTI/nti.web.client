/* eslint-env jest */
import Logger from '@nti/util-logger';

import {  
	getSymbol,
	appendToSingletonElement,
	createElement,
} from '../ExternalLibraryManager';

const logger = Logger.get('ExternalLibrariesManager');

describe('External Library Manager (Mixin)', () => {
	beforeEach(() => jest.spyOn(logger, 'warn').mockImplementation(() => {})); //suppress logger to output.

	test('getSymbol', () => {
		const d = { value: '123' };
		const o = { a: { b: { c: { d } } } };

		expect(getSymbol(global, 'foobar')).toBe(false);
		expect(getSymbol(o, 'a.b.c.d.value')).toEqual({
			scope: d,
			symbol: d.value,
		});
	});

	test('appendToSingletonElement', () => {
		const head = document.getElementsByTagName('head')[0];
		const child = document.createElement('div');
		jest.spyOn(head, 'appendChild');

		appendToSingletonElement(document, 'head', child);

		expect(head.appendChild).toHaveBeenCalledWith(child);
	});

	test('createElement', () => {
		const props = {
			id: 'foo',
			name: 'bar',
			style: {
				background: 'red',
			},
			className: 'test',
		};
		const tagName = 'div';

		const doc = {
			createElement(tag) {
				return { tagName: tag };
			},
		};

		const result = createElement(doc, tagName, props);

		expect(result).toEqual({ tagName, ...props });
	});

	describe('Mixin', () => {
		//TODO: test Mixin methods.
		test('Needs Testing...', () => {});
	});
});
