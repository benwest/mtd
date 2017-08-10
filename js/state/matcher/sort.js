var sortBy = require('lodash/sortBy');
var { wrap, wrappedDistance } = require('../utils');

var sum = fn => list => list.reduce( ( a, b ) => a + fn( b ), 0 );

var reusedAndNotNull = now => animation => 
    animation.points[ 0 ].t < now && animation.destination !== null ? 0 : 1;

var dx = animation => {
    if ( animation.destination === null ) return 1;
    var from = animation.points[ 0 ].x;
    var to = animation.points[ animation.points.length - 1 ].x
    return Math.abs( from - to );
}

var dy = animation => {
    var from = animation.points[ 0 ].t;
    var to = animation.points[ animation.points.length - 1 ].t
    return Math.abs( from - to );
}

var isNull = animation => animation.destination === null ? 1 : 0;

var closestDestinations = destinations => animation => {
    var idx = destinations.findIndex( d => d.id === animation.destination );
    if ( idx === -1 ) return 0;
    return -1 / ( idx + 1 );
}

var hasStarted = now => animation => now > animation.startTime ? 0 : 1;

module.exports = ( animationSets, now, destinations ) => {
    
    destinations = sortBy( destinations, 'time' );
    
    return sortBy(
        animationSets,
        sum( closestDestinations( destinations ) ),
        sum( reusedAndNotNull( now ) ),
        sum( hasStarted( now ) ),
        // sum( dy ),
        // sum( isNull ),
        sum( dx )
    )
    
}