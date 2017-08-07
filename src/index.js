module.exports = ( maxThroughput = 1, perMilliseconds = 1000 ) => {
	let paused = false;
	let enabled = true;
	const queued = [];
	const timestamps = [];
	const throughputWindow = Math.round( perMilliseconds * 5.5 );
	const getThroughput = () => {
		let age, length;
		while( ( length = timestamps.length ) && ( ( age = Date.now() - timestamps[ 0 ] ) > throughputWindow ) )
			timestamps.shift();
		return length ? perMilliseconds * length / age : 0;
	};
	const waitTimeWindow = Math.round( perMilliseconds * 5 );
	const getWaitTime = () => {
		let age, length;
		while( ( length = timestamps.length ) && ( ( age = Date.now() - timestamps[ 0 ] ) > waitTimeWindow ) )
			timestamps.shift();
		return Math.max( 0, Math.floor( ( perMilliseconds * length / maxThroughput ) - age + 1 ) );
	};
	let timeoutObject;
	const evict = () => {
		if( !timeoutObject )
			if( !enabled )
				while( queued.length )
					process.nextTick( queued.shift() );
			else if( !paused ) {
				const pre = queued.length;
				while( queued.length && getThroughput() <= maxThroughput ) {
					timestamps.push( Date.now() );
					process.nextTick( queued.shift() );
				}
				if( queued.length )
					timeoutObject = setTimeout( () => evict( timeoutObject = undefined ), getWaitTime() );
			}
	};
	const pub = Object.defineProperties( {
		pause: () => ( ( paused = true ), pub ),
		resume: () => ( ( paused = false ), evict(), pub ),
		enable: () => ( ( enabled = true ), pub ),
		disable: () => ( ( enabled = false ), evict(), pub ),
		throttle: ( value ) =>
			new Promise( ( resolve ) => ( queued.push( resolve ), evict() ) ).then( () => value ),
		on: {
			queuedAbove: ( value, listener ) => {},
			queuedBelow: ( value, listener ) => {}
		}
	}, {
		maxThroughput: {
			get: () => maxThroughput,
			set: ( value ) => {
				const parsed = parseInt( value, 10 );
				if( parsed > 0 ) {
					maxThroughput = parsed;
					clearTimeout( timeoutObject );
					timeoutObject = undefined;
					evict();
				}
			}
		},
		perMilliseconds: {
			get: () => perMilliseconds,
			set: ( value ) => {
				const parsed = parseInt( value, 10 );
				if( parsed > 0 ) {
					perMilliseconds = parsed;
					clearTimeout( timeoutObject );
					timeoutObject = undefined;
					evict();
				}
			}
		},
		throughput: {
			get: () => getThroughput()
		},
		queued: {
			get: () => queued.length
		}
	} );
	return pub;
};
