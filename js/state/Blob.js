var vec2 = require('gl-vec2');
var random = require('lodash/random');
var { scale } = require("./utils");

var destinationID = 0;

var EDGE_BUFFER = 1;
var LOOKAHEAD = 3;

module.exports = class Blob {
    
    constructor ( color, speed ) {
        
        this.color = color;
        this.position = vec2.fromValues( 400, 400 );
        this.size = vec2.fromValues( 350, 350 );
        this.direction = vec2.fromValues( 1, 1 );
        this.speed = speed;
        this.path = [];
        this.blur = 1;
        
    }
    
    randomize ( aabb ) {
        
        var [ [ minX, minY ], [ maxX, maxY ] ] = aabb;
        
        var hw = this.size[ 0 ] / 2;
        var hh = this.size[ 1 ] / 2;
        
        var x = random( minX + hw + EDGE_BUFFER, maxX - hw - EDGE_BUFFER );
        var y = random( minY + hh + EDGE_BUFFER, maxY - hh - EDGE_BUFFER );
        
        vec2.set( this.position, x, y );
        
        var dirx = Math.random() > .5 ? -1 : 1;
        var diry = Math.random() > .5 ? -1 : 1;
        
        vec2.set( this.direction, dirx, diry );
        
        this.path = [];
        
    }
    
    gather ( aabb ) {
        
        var [ [ minX, minY ], [ maxX, maxY ] ] = this.getCollisionBounds( aabb );
        
        var [ x, y ] = this.position;
        
        vec2.set(
            this.position,
            Math.max( Math.min( x, maxX - EDGE_BUFFER ), minX + EDGE_BUFFER ),
            Math.max( Math.min( y, maxY - EDGE_BUFFER ), minY + EDGE_BUFFER )
        )
        
        this.path = [];
        
    }
    
    setSpeed ( speed ) {
        
        this.speed = speed;
        this.path = [];
        
    }
    
    update ( now, aabb ) {
        
        var pathChanged = this.path.length === 0;
        
        var bounds = this.getCollisionBounds( aabb );
        
        while (
            this.path.length &&
            this.path[ 0 ].toTime < now
        ) {
            pathChanged = true;
            this.path.shift();
        }
        
        while (
            this.path.length < LOOKAHEAD
        ) {
            this.extendPath( now, bounds );
        }
        
        var {
            fromPosition,
            toPosition,
            fromTime,
            toTime,
            fromDirection: direction
        } = this.path[ 0 ];
        
        var t = scale( now, fromTime, toTime, 0, 1 );
        
        var eased = t + ( ( t * ( 2 - t ) ) - t ) * .35;
        
        vec2.lerp( this.position, fromPosition, toPosition, eased );
        vec2.copy( this.direction, direction );
        
        // if ( pathChanged ) this.blur = 1.25;
        
        // this.blur = 1 + ( this.blur - 1 ) * .99;
        
        return pathChanged;
        
    }
    
    getCollisionBounds ( aabb ) {
        
        var halfSize = vec2.scale( vec2.create(), this.size, .5 );
        
        return [
            vec2.add( vec2.create(), aabb[ 0 ], halfSize ),
            vec2.subtract( vec2.create(), aabb[ 1 ], halfSize ),
        ];
        
    }
    
    extendPath ( now, bounds ) {
        
        var fromPosition, fromDirection, fromTime;
        
        if ( this.path.length === 0 ) {
            
            fromPosition = vec2.clone( this.position );
            fromDirection = vec2.clone( this.direction );
            fromTime = now;
            
        } else {
            
            var last = this.path[ this.path.length - 1 ];
            
            fromPosition = vec2.clone( last.toPosition );
            fromDirection = vec2.clone( last.toDirection );
            fromTime = last.toTime;
            
        }
        
        var [ fromX, fromY ] = fromPosition;
        var [ dirX, dirY ] = fromDirection;
        var [ [ minX, minY ], [ maxX, maxY ] ] = bounds;
        
        var dXAxis = Math.abs( dirX < 0 ? minX - fromX : maxX - fromX );
        var dYAxis = Math.abs( dirY < 0 ? minY - fromY : maxY - fromY );
        var dMin = Math.min( dXAxis, dYAxis );
        
        var delta = vec2.fromValues(
            dirX < 0 ? -dMin : dMin,
            dirY < 0 ? -dMin : dMin
        )
        
        var reflect = vec2.fromValues(
            dXAxis < dYAxis ? -1 : 1,
            dXAxis < dYAxis ? 1 : -1
        )
        
        var toPosition = vec2.add(
            vec2.create(),
            fromPosition,
            delta
        );
        
        var toDirection = vec2.multiply(
            vec2.create(),
            fromDirection,
            reflect
        );
        
        var toTime = fromTime + vec2.length( delta ) / this.speed;
        
        this.path.push({
            fromPosition,
            fromDirection,
            fromTime,
            toPosition,
            toDirection,
            toTime,
            id: ++destinationID
        });
        
    }
    
    viewModel () {
        
        return {
            color: [ ...this.color ],
            position: [ ...this.position ],
            size: [ ...this.size ],
            blur: this.blur
        }
        
    }
    
}