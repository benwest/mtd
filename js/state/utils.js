var vec2 = require('gl-vec2');

var rayDistanceToAxis = component => ( origin, direction ) => {
    
    if ( origin[ component ] === 0 ) return 0;
    
    if ( origin[ component ] > 0 === direction[ component ] > 0 ) return Infinity;
    
    var a = Math.atan2( direction[ 1 ], direction[ 0 ] );
    
    return Math.abs( origin[ component ] / Math.cos( a ) );
    
}

var rayDistanceToXAxis = rayDistanceToAxis( 1 );
var rayDistanceToYAxis = rayDistanceToAxis( 0 );

var rayIntersectAABB = ( origin, direction, [ vmin, vmax ] ) => {
    
    var minX = vec2.fromValues( vmin[ 0 ], 0 );
    var minY = vec2.fromValues( 0, vmin[ 1 ] );
    var maxX = vec2.fromValues( vmax[ 0 ], 0 );
    var maxY = vec2.fromValues( 0, vmax[ 1 ] );
    
    var minXOrigin = vec2.subtract( vec2.create(), origin, minX );
    var minYOrigin = vec2.subtract( vec2.create(), origin, minY );
    var maxXOrigin = vec2.subtract( vec2.create(), origin, maxX );
    var maxYOrigin = vec2.subtract( vec2.create(), origin, maxY );
    
    var distances = [
        rayDistanceToXAxis( minYOrigin, direction ),
        rayDistanceToYAxis( maxXOrigin, direction ),
        rayDistanceToXAxis( maxYOrigin, direction ),
        rayDistanceToYAxis( minXOrigin, direction )
    ]
    
    return distances.reduce( ( [ minDistance, minDistanceIdx ], distance, i ) => {
        
        if ( distance < minDistance ) {
            
            return [ distance, i ];
            
        }
        
        return [ minDistance, minDistanceIdx ];
        
    }, [ distances[ 0 ], 0 ] )
    
}

var aabbToSize = aabb => vec2.fromValues(
    aabb[ 1 ][ 0 ] - aabb[ 0 ][ 0 ],
    aabb[ 1 ][ 1 ] - aabb[ 0 ][ 1 ]
);

var perimeterLength = aabb => {
    
    var [ width, height ] = aabbToSize( aabb );
    
    return width * 2 + height * 2;
    
}

var indexOfMin = ( ...list ) => list.reduce( ( iMin, x, i ) => x < list[ iMin ] ? i : iMin, 0 );

var perimeterPosition = ( aabb, point ) => {
    
    var [ [ minX, minY ], [ maxX, maxY ] ] = aabb;
    var [ x, y ] = point;
    var [ w, h ] = aabbToSize( aabb );
    var perimeter = w * 2 + h * 2;
    
    var dTop = Math.abs( y - minY );
    var dRight = Math.abs( x - maxX );
    var dBottom = Math.abs( y - maxY );
    var dLeft = Math.abs( x - minX );
    
    var p;
    
    switch ( indexOfMin( dTop, dRight, dBottom, dLeft ) ) {
        
        case 0:
            p = x - minX;
            break;
        
        case 1:
            p = w + ( y - minY );
            break;
            
        case 2:
            p = w + h + ( w - ( x - minX ) );
            break;
            
        case 3:
            p = w + h + w + ( h - ( y - minY ) );
            break;

    }
    
    return p / perimeter;
    
}

var wrap = ( value, limit ) => {
    
    while ( value < 0 ) value += limit;
    return value % limit;
    
}

var unsignedMod = ( a, n ) => a - Math.floor( a / n ) * n;

var wrappedDistance = ( a, b, limit = 1 ) => unsignedMod( ( b - a ) + ( limit / 2 ), limit ) - ( limit / 2 );

var clamp = ( x, min = 0, max = 1 ) => {
    if ( min > max ) [ min, max ] = [ max, min ];
    return Math.max( Math.min( x, max ), min );
}

var normalize = ( x, min, max ) => ( x - min ) / ( max - min );

var scale = ( x, oldMin, oldMax, newMin, newMax ) => newMin + ( newMax - newMin ) * normalize( x, oldMin, oldMax );

var getEdgeIndex = ( aabb, position ) => {
    
    var [ width, height ] = aabbToSize( aabb );
    
    var edgeIndex = 0;
    var edgeLength = width;
    
    while ( position > edgeLength ) {
        
        position -= edgeLength;
        edgeIndex++;
        edgeLength = edgeIndex % 2 === 0 ? width : height;
        
    }
    
    return [ edgeIndex, position ];
    
}

var perimeterPositionXY = ( aabb, position ) => {
    
    var [ width, height ] = aabbToSize( aabb );
    
    var [ edgeIndex, edgePosition ] = getEdgeIndex( aabb, position );
    
    var xy = vec2.create();
    
    switch ( edgeIndex ) {
        
        case 0:
            vec2.set( xy, edgePosition, 0 );
            break;
            
        case 1:
            vec2.set( xy, width, edgePosition );
            break;
            
        case 2:
            vec2.set( xy, width - edgePosition, height );
            break;
            
        case 3:
            vec2.set( xy, 0, height - edgePosition );
            break;
        
    }
    
    return vec2.add( xy, xy, aabb[ 0 ] );
    
}

var rgb = color => `rgb(${ color.map( c => Math.floor( clamp( c * 255, 0, 255 ) ) ).join(',') })`
var unrgb = color => [ .../rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)/.exec(color) ].slice(1).map(c => c / 255);

var without = ( array, item ) => array.filter( x => x !== item );

module.exports = {
    clamp,
    scale,
    normalize,
    wrap,
    wrappedDistance,
    rayIntersectAABB,
    perimeterPosition,
    perimeterPositionXY,
    getEdgeIndex,
    aabbToSize,
    perimeterLength,
    rgb,
    unrgb,
    without
};