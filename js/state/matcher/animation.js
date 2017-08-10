var distance = require('./distance');
var ease = require('./ease');
var { scale, wrap, wrappedDistance } = require('../utils');

var SPEED = .15;
var MIN_DURATION = .5;
var PRECISION = .05;

var create = ( now, word, destination, direction ) => {
    
    var d = distance( word.position, destination.position, direction );
    
    var dT = Math.max( Math.abs( d ) / SPEED, MIN_DURATION );
    
    var fromTime = Math.max( now, destination.time - dT );
    
    var points = [];
    
    if ( fromTime > now ) {
        
        points.push({
            t: now,
            x: word.position
        })
        
    }
    
    points.push({
        t: fromTime,
        x: word.position
    }, {
        t: destination.time,
        x: word.position + d
    })
    
    return {
        points,
        direction,
        fromTime,
        word: word.id,
        destination: destination.id,
        width: word.width
    }
    
}

var sample = ( { points }, t ) => {
    
    if ( points[ 0 ].t > t || points[ points.length - 1 ].t < t ) {
        
        return false;
        
    }
    
    var i = 0;
    var p1, p2;
    
    do {
        
        p1 = points[ i ];
        p2 = points[ i + 1 ];
        i++;
        
    } while ( p2.t < t );
    
    var p = scale( t, p1.t, p2.t, 0, 1 );
    
    return wrap( scale( ease( p ), 0, 1, p1.x, p2.x ), 1 );
    
}

var intersects = ( a1, a2 ) => {
    
    if ( a1.destination !== null && a1.destination === a2.destination ) return true;
    
    var points1 = a1.points;
    var points2 = a2.points;
    
    var overlap = ( a1.width / 2 ) + ( a2.width / 2 );
    
    var min1 = points1[ 0 ].t;
    var min2 = points2[ 0 ].t;
    
    var max1 = points1[ points1.length - 1 ].t;
    var max2 = points2[ points2.length - 1 ].t;
    
    var min = Math.max( min1, min2 );
    var max = Math.min( max1, max2 );
    var range = max - min;
    
    var samples = Math.ceil( range / PRECISION );
    
    var t, x1, x2;
    
    for ( var i = 0; i <= samples; i++ ) {
        
        t = min + range * ( i / samples );
        
        x1 = sample( a1, t );
        x2 = sample( a2, t );
        
        if ( Math.abs( wrappedDistance( x1, x2 ) ) < overlap ) return true;
        
    }
    
    return false;
    
}

var noneIntersect = animations => {
    
    for ( var i = 0; i < animations.length; i++ ) {
        
        for ( var j = i + 1; j < animations.length; j++ ) {
            
            if ( intersects( animations[ i ], animations[ j ] ) ) return false;
            
        }
        
    }
    
    return true;
    
}

var equals = ( animation, word, destination, direction ) => {
    
    return (
        animation.word === word.id &&
        animation.destination === destination.id &&
        animation.direction === direction
    );
    
}

module.exports = { create, sample, intersects, noneIntersect, equals };