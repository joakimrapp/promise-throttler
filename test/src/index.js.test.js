require( '@jrapp/node-project-setup' ).testing.file( './test' )( ( throttler ) => ( {
	getArray: ( size ) => Array.from( Array( size ).keys() ).map( value => value + 1 ),
	getSum: ( size ) => Array.from( Array( size ).keys() ).reduce( ( sum, value ) => sum + value + 1, 0 )
} ) )
	.describe( 'throttle()' )
		.it( 'should return all values', ( assert, throttler, { getArray, getSum } ) => {
			const instance = throttler().disable();
			return Promise.all( getArray( 1000 ).map( value => instance.throttle( value ) ) )
				.then( ( values ) =>
					assert.equal( values.reduce( ( sum, value ) => sum + value, 0 ), getSum( 1000 ) ) );
		} )
		.it( 'should throttle', ( assert, throttler, { getArray } ) => {
			const instance = throttler( 10, 10 );
			const timestamp = Date.now();
			return Promise.all( getArray( 100 ).map( value => instance.throttle( value ) ) )
				.then( ( values ) =>
					assert.ok( Date.now() - timestamp >= 100 ) );
		} )
		.it( 'should throttle at specified rate when called one after the other', ( assert, throttler, {} ) => {
			const maxThroughput = 10;
			const perMilliseconds = 100;
			const instance = throttler( maxThroughput, perMilliseconds );
			const timestamp = Date.now();
			const next = ( value ) =>
				value >= 100 ? value : instance.throttle( value + 1 )
					.then( ( value ) => {
						const expected = ( value ) * ( perMilliseconds / maxThroughput );
						assert.ok( Math.abs( ( Date.now() - timestamp ) - expected ) < 30 );
						return value;
					} )
					.then( next );
			return Promise.resolve( 0 ).then( next );
		} )
		.it( 'should throttle at specified rate when called in parallell', ( assert, throttler, { getArray } ) => {
			const maxThroughput = 10;
			const perMilliseconds = 100;
			const instance = throttler( maxThroughput, perMilliseconds );
			const timestamp = Date.now();
			return Promise.all( getArray( 100 ).map( value => instance.throttle( value ).then( value => {
				const expected = ( value ) * ( perMilliseconds / maxThroughput );
				assert.ok( Math.abs( ( Date.now() - timestamp ) - expected ) < 30 );
			} ) ) );
		} )
	.done()
	.describe( 'disable()' )
		.it( 'should not throttle when disabled', ( assert, throttler, { getArray } ) => {
			const instance = throttler().disable();
			const timestamp = Date.now();
			return Promise.all( getArray( 100 ).map( value => instance.throttle( value ) ) )
				.then( ( values ) =>
					assert.ok( Date.now() - timestamp < 5 ) );
		} )
	.done()
	.describe( 'pause()/resume()' )
		.it( 'should pause and resume on demand', ( assert, throttler, { getArray } ) => {
			const maxThroughput = 1;
			const perMilliseconds = 5;
			let current, whenPaused;
			const instance = throttler( maxThroughput, perMilliseconds ).disable().enable();
			return Promise.all( [
				new Promise( resolve => setTimeout( () => {
					whenPaused = current;
					instance.pause();
					resolve();
				}, 52 ) ),
				new Promise( resolve => setTimeout( () => {
					assert.equal( current, whenPaused );
					instance.resume();
					resolve();
				}, 102 ) ),
				Promise.all( getArray( 30 ).map( value => instance.throttle( value ).then( value => ( current = value ) ) ) )
			] );
		} )
	.done()
	.describe( 'maxThroughput' )
		.it( 'should change maxThroughput while running', ( assert, throttler, { getArray } ) => {
			const maxThroughput = 1;
			const perMilliseconds = 100;
			const timestamp = Date.now();
			const instance = throttler( maxThroughput, perMilliseconds );
			return Promise.all( [
				new Promise( resolve => setTimeout( () => {
					instance.maxThroughput = instance.maxThroughput * 1000;
					resolve();
				}, 50 ) ),
				Promise.all( getArray( 10 ).map( value => instance.throttle( value ) ) )
			] ).then( () => {
				assert.ok( Date.now() - timestamp < 100 );
			} );
		} )
		.it( 'should not change maxThroughput if invalid value', ( assert, throttler, { getArray } ) => {
			const maxThroughput = 1000;
			const perMilliseconds = 10;
			const timestamp = Date.now();
			const instance = throttler( maxThroughput, perMilliseconds );
			return Promise.all( [
				new Promise( resolve => {
					instance.maxThroughput = 'hej';
					resolve();
				} ),
				Promise.all( getArray( 10 ).map( value => instance.throttle( value ) ) )
			] ).then( () => {
				assert.ok( Date.now() - timestamp < 5 );
			} );
		} )
	.done()
	.describe( 'perMilliseconds' )
		.it( 'should change perMilliseconds while running', ( assert, throttler, { getArray } ) => {
			const maxThroughput = 1;
			const perMilliseconds = 100;
			const timestamp = Date.now();
			const instance = throttler( maxThroughput, perMilliseconds );
			return Promise.all( [
				new Promise( resolve => setTimeout( () => {
					instance.perMilliseconds = instance.perMilliseconds / 100;
					resolve();
				}, 50 ) ),
				Promise.all( getArray( 10 ).map( value => instance.throttle( value ) ) )
			] ).then( () => {
				assert.ok( Date.now() - timestamp < 100 );
			} );
		} )
		.it( 'should not change perMilliseconds if invalid value', ( assert, throttler, { getArray } ) => {
			const maxThroughput = 1000;
			const perMilliseconds = 10;
			const timestamp = Date.now();
			const instance = throttler( maxThroughput, perMilliseconds );
			return Promise.all( [
				new Promise( resolve => {
					instance.perMilliseconds = 'hej';
					resolve();
				} ),
				Promise.all( getArray( 10 ).map( value => instance.throttle( value ) ) )
			] ).then( () => {
				assert.ok( Date.now() - timestamp < 5 );
			} );
		} )
	.done()
	.describe( 'throughput' )
		.it( 'should return the current throughput', ( assert, throttler, { getArray } ) => {
			const maxThroughput = 10;
			const perMilliseconds = 10;
			const instance = throttler( maxThroughput, perMilliseconds );
			return Promise.all( [
				new Promise( resolve => setTimeout( () => {
					assert.equal( Math.round( instance.throughput ), 10 );
					resolve();
				}, 50 ) ),
				Promise.all( getArray( 100 ).map( value => instance.throttle( value ) ) )
			] );
		} )
	.done()
	.describe( 'queued' )
		.it( 'should return the current queue length', ( assert, throttler, { getArray } ) => {
			const maxThroughput = 10;
			const perMilliseconds = 10;
			const instance = throttler( maxThroughput, perMilliseconds );
			return Promise.all( [
				new Promise( resolve => setTimeout( () => {
					assert.equal( Math.round( instance.queued / 10 ), 5 );
					resolve();
				}, 50 ) ),
				Promise.all( getArray( 100 ).map( value => instance.throttle( value ) ) )
			] );
		} )
	.done()
.done();
