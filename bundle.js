(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global dat */

var { rgb, unrgb } = require('./state/utils');

function addColor( gui, obj, prop ) {
    
    var dummy = {
        [ prop ]: rgb( obj[ prop ] )
    }
    
    return gui.addColor( dummy, prop )
        .onChange( v => {
            obj[ prop ] = unrgb( v );
        })
    
}

module.exports = state => {
    
    var gui = new dat.GUI();
    
    gui.add( state.config.size, 0, 1, 2000 ).name('Width').onChange( state.gather );
    
    gui.add( state.config.size, 1, 1, 2000 ).name('Height').onChange( state.gather );
    
    gui.add( state.config, 'margin', 0, 200 ).name('Margin').onChange( state.gather );
    
    gui.add( state.config, 'fontSize', 1, 96 ).name('Font size');
    
    gui.add( state.config, 'cornerRadius', 0, 200 ).name('Corner radius');
    
    gui.add( state.config, 'blur', 0, 200 ).name('Blur');
    
    addColor( gui, state.config, 'backgroundColor' ).name('Background');
    
    addColor( gui, state.config, 'textColor' ).name('Text');
    
    state.blobs.forEach( ( blob, i ) => {
        
        var f = gui.addFolder( 'Blob ' + ( i + 1 ) );
        
        f.add( { size: blob.size[ 0 ] }, 'size', 1, 1000 ).name('Size').onChange( v => {
            blob.size[ 0 ] = blob.size[ 1 ] = v;
            state.gather();
        })
        
        // f.add( blob.size, 0, 1, 1000 ).name('Width').onChange( state.gather );
        // f.add( blob.size, 1, 1, 1000 ).name('Height').onChange( state.gather );
        f.add( { speed: blob.speed }, 'speed', 1, 400 ).name('Speed').onChange( v => {
            blob.setSpeed(v);
        });
        addColor( f, blob, 'color' ).name('Color');
        
        f.open();
        
    })
    
    gui.add( state, 'randomize' );
    
    gui.add( state.config, 'debug' );
    
}
},{"./state/utils":17}],2:[function(require,module,exports){
var blobCanvas = document.createElement('canvas');
var blobContext = blobCanvas.getContext( 'webgl' );
document.body.appendChild( blobCanvas );

var textCanvas = document.createElement('canvas');
var textContext = textCanvas.getContext('2d');
document.body.appendChild( textCanvas );

var setCanvasSize = canvas => ( w, h ) => {
    
    if ( w !== canvas.width || h !== canvas.height ) {
        
        canvas.width = w;
        canvas.height = h;
        
    }
    
}

var state = require('./state/state');
var createRenderer = require('./renderer/renderer');

var render = createRenderer(
    blobContext,
    setCanvasSize( blobCanvas ),
    textContext,
    setCanvasSize( textCanvas )
);

var then = Date.now() / 1000;

var tick = () => {
    
    var now = Date.now() / 1000;
    var dT = Math.min( ( now - then ), 1 );
    then = now;
    
    state.update( dT, now );
    
    render( state );
    
    requestAnimationFrame( tick );
    
}

require('./gui')( state );
require('./record');

state.randomize();

tick();

window.record = () => {
    
    console.log( JSON.stringify({
        config: state.config,
        blobs: state.blobs.map(({position, direction, color, size}) => ({ position, direction, color, size })),
        words: state.words.map(({position}) => ({position}))
    }, ( _, v ) => {
        if ( v instanceof Float32Array ) {
            v = [ ...v ];
        }
        return v;
    }))
    
}
},{"./gui":1,"./record":3,"./renderer/renderer":6,"./state/state":15}],3:[function(require,module,exports){
var m = require('mithril');
var state = require('./state/state');

var recorder = {
    
    recording: false,
    
    state: {},
    
    startTime: 0,
    
    record: () => {
        
        recorder.state = {
            
            config: Object.assign( {}, state.config ),
            
            blobs: state.blobs.map( ({position, direction, color, size}) => {
                
                return { position, direction, color, size }
                
            }),
            
            words: state.words.map(({position}) => {
                
                return { position };
                
            })
            
        }
        
        recorder.recording = true;
        recorder.startTime = Date.now() / 1000;
        
    },
    
    cancel: () => {
        
        recorder.recording = false;
        
    },
    
    done: () => {
        
        var duration = ( Date.now() / 1000 ) - recorder.startTime;
        
        m.request({
            method: 'POST',
            url: 'http://95.85.2.199:8080/render',
            data: { state: recorder.state, duration }
        })
        
        recorder.recording = false;
        
    }
    
}

var UI = {
    
    oninit: vnode => {
        
        vnode.state.status = null;
        
        var update = () => {
            
            m.request({
                method: 'GET',
                url: 'http://95.85.2.199:8080/status'
            }).then( r => {
                vnode.state.status = r;
                setTimeout( update, 500 );
            })
            
        }
        
        update();
        
    },
    
    view: vnode => {
        
        return [
            m('.buttons',
                m('button', {
                    disabled: recorder.recording,
                    onclick: recorder.record
                }, 'Record'),
                m('button', {
                    disabled: !recorder.recording,
                    onclick: recorder.done
                }, 'Done'),
                m('button', {
                    disabled: !recorder.recording,
                    onclick: recorder.cancel
                }, 'Cancel')
            ),
            
            vnode.state.status === null ?
                'Renderer busy, waiting...'
            :
                m('ul', vnode.state.status.map( item => {
                    
                    if ( item.done ) {
                        
                        return m('li', m('a', {
                            href: 'http://95.85.2.199:8080/' + item.url,
                            target: '_blank'
                        }, item.url ) )
                        
                    } else {
                        
                        return m('li', `rendered ${item.progress} frames` );
                        
                    }
                    
                }))
        ]

        
    }
    
}

var container = document.createElement('div');
container.classList.add('recorder');
document.body.appendChild( container );

m.mount( container, UI );

module.exports = recorder;
},{"./state/state":15,"mithril":189}],4:[function(require,module,exports){
var vec2 = require('gl-vec2');

var rgb = color =>
    `rgb(${ color.map( c =>
        Math.min( Math.max( Math.floor( c * 255 ), 0 ), 255 ) ).join(',') })`

var drawPath = ( ctx, path ) => path.forEach( cmd => {
        
    switch ( cmd.type ) {
        
        case 'M':
            ctx.moveTo( cmd.x, cmd.y );
            break;
            
        case 'L':
            ctx.lineTo( cmd.x, cmd.y );
            break;
            
        case 'C':
            ctx.bezierCurveTo( cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y );
            break;
            
        case 'Q':
            ctx.quadraticCurveTo( cmd.x1, cmd.y1, cmd.x, cmd.y );
            break;
            
        case 'Z':
            ctx.closePath();
            break;
            
    }
        
});

module.exports = ( ctx, setSize ) => vm => {
    
    setSize( vm.size[ 0 ], vm.size[ 1 ] );
    
    ctx.clearRect( 0, 0, vm.size[ 0 ], vm.size[ 1 ] );
    
    ctx.fillStyle = rgb( vm.textColor );
    
    ctx.beginPath();
    
    vm.words.forEach( letters => {
        
        letters.forEach( ({ path, width, position, angle }) => {
            
            ctx.save();
            
            ctx.translate( position[ 0 ], position[ 1 ] );
            
            ctx.rotate( angle );
            
            ctx.scale( vm.fontSize, vm.fontSize );
            
            ctx.translate( ( -width / 2 ), 0 );
            
            drawPath( ctx, path );
            
            ctx.restore();
            
        })
        
    });
    
    ctx.fill();
    
}
},{"gl-vec2":28}],5:[function(require,module,exports){
var fragmentShaderSource = require('glslify')(["precision highp float;\n#define GLSLIFY 1\n\nuniform vec2 resolution;\nuniform vec3 background;\nuniform float radius;\nuniform float blur;\nuniform float threshold;\nuniform float margin;\n\nuniform vec2 positions[ 3 ];\nuniform vec2 sizes[ 3 ];\nuniform vec3 colors[ 3 ];\nuniform float blurs[ 3 ];\n\nfloat maxComponent ( vec3 v ) {\n    \n    return max( max( v.x, v.y ), v.z );\n    \n}\n\nfloat box ( vec2 p, vec2 position, vec2 size ) {\n    \n    vec2 d = abs( p - position ) - size * .5;\n    \n    return min( max( d.x, d.y ), 0. ) + length( max( d, 0. ) );\n    \n}\n\nfloat roundedBox( vec2 p, vec2 position, vec2 size, float radius ) {\n    \n    return box( p, position, size - vec2( radius * 2. ) ) - radius;\n    \n}\n\nvoid main () {\n    \n    vec2 p = gl_FragCoord.xy;\n    \n    vec3 color = vec3( 0.0 );\n    \n    // float mask = 0.0;\n    \n    // float prev = 0.0;\n    \n    for ( int i = 0; i < 3; i++ ) {\n        \n        float blob = smoothstep( blur, 0., roundedBox( p, positions[ i ], sizes[ i ], radius ) );\n        \n        color += blob * colors[ i ];\n        \n        // mask = max( mask, length( vec2( blob, prev ) ) );\n        \n        // prev = blob;\n        \n    //     float blob = roundedBox( p, positions[ i ], sizes[ i ], radius );\n        \n    //     float blurredBlob = clamp( ( blob + blur ) / blur, 0., 1. );\n        \n    //     color += blurredBlob * colors[ i ] * blurs[ i ];\n        \n    }\n    \n    float frameStart = margin - blur * .5;\n    float frameEnd = margin + blur * .5;\n    \n    float frame = \n        smoothstep( frameStart, frameEnd, p.x ) * \n        smoothstep( resolution.x - frameStart, resolution.x - frameEnd, p.x ) * \n        smoothstep( frameStart, frameEnd, p.y ) * \n        smoothstep( resolution.y - frameStart, resolution.y - frameEnd, p.y );\n    \n    \n    // float mask = length( vec4( color, frame ) ) / length( vec2( 1. ) );\n    \n    // gl_FragColor = vec4( vec3( mask ), 1. );\n    \n    // gl_FragColor = vec4( mix( background, color, step( 1., mask ) ), 1. );\n    \n    \n    \n    // gl_FragColor = vec4( vec3( color.r + color.g + color.b ), 1. );\n    \n    // frame = 1.;\n    \n    float mask = step( 1., length( color ) );\n    \n    gl_FragColor = vec4( mix( background, color, mask ), 1. );\n    \n}"]);

module.exports = ( gl, setSize ) => {

    var vs = gl.createShader( gl.VERTEX_SHADER );
    
    gl.shaderSource( vs, `
                
        precision highp float;
        attribute vec3 position;
        
        void main () {
            gl_Position = vec4( position, 1. );
        }
            
    `);
    
    gl.compileShader( vs );
    
    var fs = gl.createShader( gl.FRAGMENT_SHADER );
    
    gl.shaderSource( fs, fragmentShaderSource );
    
    gl.compileShader( fs );
    
    var shader = gl.createProgram();
    
    gl.attachShader( shader, vs );
    gl.attachShader( shader, fs );
    gl.linkProgram( shader );
    gl.useProgram( shader );
    
    var triangle = new Float32Array([
        -1, -1, 0,
        -1, 3, 0,
        3, -1, 0
    ])
    
    gl.bindBuffer( gl.ARRAY_BUFFER, gl.createBuffer() );
    gl.bufferData( gl.ARRAY_BUFFER, triangle, gl.STATIC_DRAW );
    
    var aPosition = gl.getAttribLocation( shader, "position" );
    
    gl.enableVertexAttribArray( aPosition );
    gl.vertexAttribPointer( aPosition, 3, gl.FLOAT, false, 0, 0 );
    
    var uResolution = gl.getUniformLocation( shader, "resolution" );
    var uBackground = gl.getUniformLocation( shader, "background" );
    
    var uRadius = gl.getUniformLocation( shader, "radius" );
    var uBlur = gl.getUniformLocation( shader, "blur" );
    var uMargin = gl.getUniformLocation( shader, "margin" );
    
    var uPostions = gl.getUniformLocation( shader, "positions[0]" );
    var uSizes = gl.getUniformLocation( shader, "sizes[0]" );
    var uColors = gl.getUniformLocation( shader, "colors[0]" );

    var positions = new Float32Array( 6 );
    var sizes = new Float32Array( 6 );
    var colors = new Float32Array( 9 );

    return vm => {
        
        setSize( vm.size[ 0 ], vm.size[ 1 ] );
        
        gl.viewport( 0, 0, vm.size[ 0 ], vm.size[ 1 ] );
            
        gl.uniform2fv( uResolution, new Float32Array( vm.size ) );
        
        gl.uniform3fv( uBackground, new Float32Array( vm.backgroundColor ) );
        gl.uniform1f( uRadius, vm.cornerRadius );
        gl.uniform1f( uBlur, vm.blur );
        gl.uniform1f( uMargin, vm.margin );
    
        vm.blobs.forEach( ( { color, position, size, blur }, i ) => {
            
            positions[ i * 2 + 0 ] = position[ 0 ];
            positions[ i * 2 + 1 ] = vm.size[ 1 ] - position[ 1 ];
            
            sizes[ i * 2 + 0 ] = size[ 0 ];
            sizes[ i * 2 + 1 ] = size[ 1 ];
            
            colors[ i * 3 + 0 ] = color[ 0 ];
            colors[ i * 3 + 1 ] = color[ 1 ];
            colors[ i * 3 + 2 ] = color[ 2 ];
    
        })
        
        gl.uniform2fv( uPostions, positions );
        gl.uniform2fv( uSizes, sizes );
        gl.uniform3fv( uColors, colors );

        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT );
        
        gl.drawArrays( gl.TRIANGLES, 0, 3 );
        
    }
    
}
},{"glslify":47}],6:[function(require,module,exports){
var createCanvasRenderer = require('./canvasRenderer');
var createGLRenderer = require('./glRenderer');

module.exports = ( glContext, setGLSize, canvasContext, setCanvasSize ) => {
    
    var glRenderer = createGLRenderer( glContext, setGLSize );
    var canvasRenderer = createCanvasRenderer( canvasContext, setCanvasSize );
    
    return state => {
        
        var vm = state.viewModel();
        
        glRenderer( vm );
        canvasRenderer( vm );
        
    }
    
}
},{"./canvasRenderer":4,"./glRenderer":5}],7:[function(require,module,exports){
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
},{"./utils":17,"gl-vec2":28,"lodash/random":182}],8:[function(require,module,exports){
var {
    aabbToSize,
    perimeterLength,
    wrap,
    getEdgeIndex,
    perimeterPositionXY
} = require('./utils');

var FONT = 'Helvetica';
var TRACKING = 1;
var SPEED = .2;
var CORNER_RADIUS = 50;

class Word {
    
    constructor ( text, position ) {
        
        this.position = position;
        this.width = text.width;
        this.letters = text.letters;
        
    }
    
    viewModel ( aabb, size ) {
        
        var [ viewWidth, viewHeight ] = aabbToSize( aabb );
        
        var perimeter = perimeterLength( aabb );
        
        var position = this.position * perimeter;
        
        return this.letters.map( ({ path, width, offset }) => {
            
            var p = wrap( position + offset * size, perimeter );
            
            var [ edgeIndex, edgePosition ] = getEdgeIndex( aabb, p );
            
            var angle = ( Math.PI / 2 ) * edgeIndex;
            
            var edgeLength = edgeIndex % 2 === 0 ? viewWidth : viewHeight;
            
            if ( edgePosition < CORNER_RADIUS ) {
                
                angle -= ( 1 - ( edgePosition / CORNER_RADIUS ) ) * Math.PI / 4;
                
            } else if ( edgeLength - edgePosition < CORNER_RADIUS ) {
                
                angle += ( 1 - ( ( edgeLength - edgePosition ) / CORNER_RADIUS ) )  * Math.PI / 4;
                
            }
            
            return {
                path, width, angle,
                position: perimeterPositionXY( aabb, p )
            }
            
        })
        
    }
    
}

module.exports = Word;
},{"./utils":17}],9:[function(require,module,exports){
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
},{"../utils":17,"./distance":11,"./ease":12}],10:[function(require,module,exports){
var { rgb } = require('../utils');
var { sample } = require('./animation');

var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');

document.body.appendChild(canvas);
canvas.width = canvas.height = 900;
canvas.style.right = 0;

var duration = 10;

module.exports = ( now, words, destinations, animations ) => {
    
    ctx.clearRect( 0, 0, canvas.width, canvas.height );
    
    var render = offset => {
        
        ctx.strokeStyle = 'blue';
        ctx.strokeRect( 0, 0, canvas.width, canvas.height );
        
        ctx.fillStyle = 'black';
    
        words.forEach( ({ position, width }) => {
            
            var x = position * canvas.width;
            var w = width * canvas.width;
            
            ctx.fillRect(
                offset + x - w / 2,
                canvas.height - 5,
                w,
                5
            );
            
        });
        
        destinations.forEach( ({ position, time, color }) => {
            
            ctx.fillStyle = rgb( color );
            
            var x = position * canvas.width;
            var y = canvas.height - ( ( time - now ) / duration ) * canvas.height;
            
            ctx.fillRect(
                offset + x - 20,
                y - 40,
                40,
                40
            )
            
        });
        
        ctx.fillStyle = 'yellow';
        
        animations.forEach( animation => {
            
            for ( var i = 0; i < duration; i += .1 ) {
                
                var x = sample( animation, now + i );
                
                if ( x === false ) continue;
                
                var y = 1 - ( i / duration );
                
                ctx.fillRect( x * canvas.width, y * canvas.height, 2, 2 );
                
            }
            
        })
        
    }
    
    render( 0 );
    // render( canvas.width );
    // render( -canvas.width );
    
}
},{"../utils":17,"./animation":9}],11:[function(require,module,exports){
module.exports = ( x1, x2, direction ) => {
    
    switch ( direction ) {
        
        case -1:
            return distanceLeft( x1, x2 );
            
        case 1:
            return distanceRight( x1, x2 );
        
    }
    
}

var distanceLeft = ( x1, x2 ) => {
    
    if ( x2 <= x1 ) {
        
        return x2 - x1;
        
    } else {
        
        return x2 - ( x1 + 1 );
        
    }
    
}

var distanceRight = ( x1, x2 ) => {
    
    if ( x2 >= x1 ) {
        
        return x2 - x1;
        
    } else {
        
        return x2 - ( x1 - 1 );
        
    }
    
}
},{}],12:[function(require,module,exports){
module.exports = p => p < .5 ? 4 * p * p * p : ( p - 1 ) * ( 2 * p - 2 ) * ( 2 * p - 2 ) + 1;
},{}],13:[function(require,module,exports){
var LOOKAHEAD = 10;

var { cartesianProduct } = require('js-combinatorics');
var sortBy = require('lodash/sortBy');

var animation = require('./animation');
var sort = require('./sort');

var directions = [ -1, 1 ];

module.exports = ( now, words, destinations, prevAnimations ) => {
    
    // [ dest1, dir1 ], [ dest1, dir2 ], [ dest2, dir1 ]...
    var animationParameters = cartesianProduct( destinations, directions ).toArray();
    
    // All permutations of where each word could go
    // [
    //     word 1: [ dest, dir ], [ dest, dir ], [ dest, dir ]...
    //     word 2: [ dest, dir ], [ dest, dir ], [ dest, dir ]...
    //     word 3: [ dest, dir ], [ dest, dir ], [ dest, dir ]...
    //     ...
    // ]
    var animationsByWord = words.map( word => {
        
        var noDestination = {
            position: word.position,
            time: now + 10,
            id: null
        };
        
        var params = [ [ noDestination, 1 ] ].concat( animationParameters );
        // var params = animationParameters
        
        var prev = prevAnimations[ word.id ];
        
        return params.map( ([ destination, direction ]) => {
            
            if (
                prev &&
                animation.equals( prev, word, destination, direction )
            ) {
                return prev;
            }
            
            return animation.create( now, word, destination, direction );
            
        });
        
    });
    
    // Sets of animations which account for all words
    // [
    //     [ word 1 anim 1 ], [ word 2 anim 1 ], [ word 3 anim 1 ]...
    //     [ word 1 anim 2 ], [ word 2 anim 1 ], [ word 3 anim 1 ]...
    //     ...
    // ]
    var animationSets = cartesianProduct( ...animationsByWord ).toArray();
    
    animationSets = animationSets.filter( animation.noneIntersect );
    
    if ( !animationSets.length ) {
        console.log( 'i cannot' );
        return prevAnimations;
    }
    
    animationSets = sort( animationSets, now, destinations );
    
    // console.log( prevAnimations.indexOf( animationSets[ 0 ][ 0 ] ) );
    
    return sortBy( animationSets[ 0 ], 'word' );
    
}
},{"./animation":9,"./sort":14,"js-combinatorics":48,"lodash/sortBy":183}],14:[function(require,module,exports){
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
},{"../utils":17,"lodash/sortBy":183}],15:[function(require,module,exports){
var vec2 = require('gl-vec2');
var Blob = require('./Blob');
var Word = require('./Word')
var match = require('./matcher/matcher');
var { sample } = require('./matcher/animation');
var text = require('./text.json');

var isBrowser = new Function("try {return this===window;}catch(e){ return false;}");

if ( isBrowser() ) var debugRender = require('./matcher/debug');

var { perimeterLength, perimeterPosition } = require('./utils');

var WORD_PADDING = 30;

var state = {
    
    config: {
        
        margin: 60,
        
        size: [ 800, 1000 ],
        
        backgroundColor: [ 1, 1, 1 ],
        
        textColor: [ 0, 0, 0 ],
        
        cornerRadius: 40,
        
        blur: 100,
        
        fontSize: 60,
        
        debug: false,
        
    },
    
    blobs: [
        new Blob( [ 1, 0, 0 ], 35 ),
        new Blob( [ 0, 1, 0 ], 50 ),
        new Blob( [ 0, 0, 1 ], 75 )
    ],
    
    words: text.map( ( t, i ) => new Word( t, i / text.length ) ),
    
    animations: [],
    
    aabb: () => {
        
        var margin = state.config.margin;
        var [ w, h ] = state.config.size;
        
        return [
            vec2.fromValues( margin, margin ),
            vec2.fromValues( w - margin, h - margin )
        ]
        
    },
    
    randomize: () => {
        
        state.blobs.forEach( blob => blob.randomize( state.aabb() ) );
        
    },
    
    gather: () => {
        
        var aabb = state.aabb();
        
        state.blobs.forEach( blob => blob.gather( aabb ) );
        
    },
    
    update: ( dT, now ) => {
        
        var aabb = state.aabb();
        
        var pathChanged = state.blobs.filter( blob => {
            return blob.update( now, aabb )
        }).length > 0;
        
        if ( pathChanged ) {
            
            state.animations = match(
                now,
                state.wordModels( aabb ),
                state.destinationModels( aabb ),
                state.animations
            );
            
        }
        
        state.animations.forEach( ( animation, i ) => {
            
            var x = sample( animation, now );
            
            if ( x !== false ) state.words[ i ].position = x;
            
        });
        
        if ( state.config.debug ) {
        
            debugRender(
                now,
                state.wordModels( aabb ),
                state.destinationModels( aabb ),
                state.animations
            );
        
        }
        
    },
    
    wordModels: aabb => {;
        
        var perimeter = perimeterLength( aabb );
        
        return state.words.map( ( word, i ) => {
            
            return {
                id: i,
                position: word.position,
                width: ( word.width * state.config.fontSize + WORD_PADDING ) / perimeter
            }
            
        });
        
    },
    
    destinationModels: aabb => {
        
        return state.blobs.reduce( ( destinations, blob ) => {
            
            var points = blob.path.slice( 0, 2 );
            
            return destinations.slice().concat( points.map( ({ toPosition, toTime, id }) => {
                
                return {
                    id,
                    position: perimeterPosition( aabb, toPosition ),
                    time: toTime,
                    color: blob.color
                }
                
            }))
            
        }, [] );
        
    },
    
    viewModel: () => {
        
        var aabb = state.aabb();
        
        return {
            
            size: [ ...state.config.size ],
            
            cornerRadius: state.config.cornerRadius,
            
            blur: state.config.blur,
            
            margin: state.config.margin,
            
            backgroundColor: [ ...state.config.backgroundColor ],
            
            textColor: [ ...state.config.textColor ],
            
            blobs: state.blobs.map( blob => blob.viewModel() ),
            
            fontSize: state.config.fontSize,
            
            words: state.words.map( word => word.viewModel( aabb, state.config.fontSize ) )
            
        }
        
    }
    
}

module.exports = state;
},{"./Blob":7,"./Word":8,"./matcher/animation":9,"./matcher/debug":10,"./matcher/matcher":13,"./text.json":16,"./utils":17,"gl-vec2":28}],16:[function(require,module,exports){
module.exports=[{"width":4.649,"letters":[{"width":0.9590000000000001,"offset":-1.845,"path":[{"type":"M","x":0.871,"y":0},{"type":"L","x":0.755,"y":0},{"type":"L","x":0.755,"y":-0.358},{"type":"L","x":0.755,"y":-0.358},{"type":"Q","x1":0.755,"y1":-0.508,"x":0.759,"y":-0.628},{"type":"L","x":0.759,"y":-0.628},{"type":"L","x":0.757,"y":-0.628},{"type":"L","x":0.757,"y":-0.628},{"type":"Q","x1":0.722,"y1":-0.511,"x":0.671,"y":-0.36},{"type":"L","x":0.671,"y":-0.36},{"type":"L","x":0.548,"y":0},{"type":"L","x":0.41100000000000003,"y":0},{"type":"L","x":0.28800000000000003,"y":-0.36},{"type":"L","x":0.28800000000000003,"y":-0.36},{"type":"Q","x1":0.23700000000000002,"y1":-0.511,"x":0.202,"y":-0.628},{"type":"L","x":0.202,"y":-0.628},{"type":"L","x":0.2,"y":-0.628},{"type":"L","x":0.2,"y":-0.628},{"type":"Q","x1":0.20400000000000001,"y1":-0.508,"x":0.20400000000000001,"y":-0.358},{"type":"L","x":0.20400000000000001,"y":-0.358},{"type":"L","x":0.20400000000000001,"y":0},{"type":"L","x":0.088,"y":0},{"type":"L","x":0.088,"y":-0.712},{"type":"L","x":0.281,"y":-0.712},{"type":"L","x":0.396,"y":-0.373},{"type":"L","x":0.396,"y":-0.373},{"type":"Q","x1":0.443,"y1":-0.23600000000000002,"x":0.47800000000000004,"y":-0.105},{"type":"L","x":0.47800000000000004,"y":-0.105},{"type":"L","x":0.48,"y":-0.105},{"type":"L","x":0.48,"y":-0.105},{"type":"Q","x1":0.519,"y1":-0.244,"x":0.5630000000000001,"y":-0.373},{"type":"L","x":0.5630000000000001,"y":-0.373},{"type":"L","x":0.678,"y":-0.712},{"type":"L","x":0.871,"y":-0.712},{"type":"L","x":0.871,"y":0},{"type":"Z"}]},{"width":0.296,"offset":-1.2008333333333332,"path":[{"type":"M","x":0.20800000000000002,"y":0},{"type":"L","x":0.088,"y":0},{"type":"L","x":0.088,"y":-0.712},{"type":"L","x":0.20800000000000002,"y":-0.712},{"type":"L","x":0.20800000000000002,"y":0},{"type":"Z"}]},{"width":0.766,"offset":-0.6531666666666665,"path":[{"type":"M","x":0.677,"y":0},{"type":"L","x":0.505,"y":0},{"type":"L","x":0.35100000000000003,"y":-0.298},{"type":"L","x":0.35100000000000003,"y":-0.298},{"type":"Q","x1":0.27,"y1":-0.456,"x":0.2,"y":-0.604},{"type":"L","x":0.2,"y":-0.604},{"type":"L","x":0.198,"y":-0.604},{"type":"L","x":0.198,"y":-0.604},{"type":"Q","x1":0.20400000000000001,"y1":-0.442,"x":0.20400000000000001,"y":-0.28},{"type":"L","x":0.20400000000000001,"y":-0.28},{"type":"L","x":0.20400000000000001,"y":0},{"type":"L","x":0.088,"y":0},{"type":"L","x":0.088,"y":-0.712},{"type":"L","x":0.261,"y":-0.712},{"type":"L","x":0.41400000000000003,"y":-0.41400000000000003},{"type":"L","x":0.41400000000000003,"y":-0.41400000000000003},{"type":"Q","x1":0.495,"y1":-0.256,"x":0.5650000000000001,"y":-0.108},{"type":"L","x":0.5650000000000001,"y":-0.108},{"type":"L","x":0.5670000000000001,"y":-0.108},{"type":"L","x":0.5670000000000001,"y":-0.108},{"type":"Q","x1":0.562,"y1":-0.28800000000000003,"x":0.562,"y":-0.432},{"type":"L","x":0.562,"y":-0.432},{"type":"L","x":0.562,"y":-0.712},{"type":"L","x":0.677,"y":-0.712},{"type":"L","x":0.677,"y":0},{"type":"Z"}]},{"width":0.729,"offset":0.11100000000000021,"path":[{"type":"M","x":0.316,"y":-0.712},{"type":"L","x":0.316,"y":-0.712},{"type":"Q","x1":0.495,"y1":-0.712,"x":0.592,"y":-0.6195},{"type":"L","x":0.592,"y":-0.6195},{"type":"L","x":0.592,"y":-0.6195},{"type":"Q","x1":0.6890000000000001,"y1":-0.527,"x":0.6890000000000001,"y":-0.356},{"type":"L","x":0.6890000000000001,"y":-0.356},{"type":"L","x":0.6890000000000001,"y":-0.356},{"type":"Q","x1":0.6890000000000001,"y1":-0.185,"x":0.592,"y":-0.0925},{"type":"L","x":0.592,"y":-0.0925},{"type":"L","x":0.592,"y":-0.0925},{"type":"Q","x1":0.495,"y1":0,"x":0.316,"y":0},{"type":"L","x":0.316,"y":0},{"type":"L","x":0.088,"y":0},{"type":"L","x":0.088,"y":-0.712},{"type":"L","x":0.316,"y":-0.712},{"type":"Z"},{"type":"M","x":0.20700000000000002,"y":-0.608},{"type":"L","x":0.20700000000000002,"y":-0.10400000000000001},{"type":"L","x":0.314,"y":-0.10400000000000001},{"type":"L","x":0.314,"y":-0.10400000000000001},{"type":"Q","x1":0.438,"y1":-0.10400000000000001,"x":0.5015000000000001,"y":-0.1675},{"type":"L","x":0.5015000000000001,"y":-0.1675},{"type":"L","x":0.5015000000000001,"y":-0.1675},{"type":"Q","x1":0.5650000000000001,"y1":-0.231,"x":0.5650000000000001,"y":-0.356},{"type":"L","x":0.5650000000000001,"y":-0.356},{"type":"L","x":0.5650000000000001,"y":-0.356},{"type":"Q","x1":0.5650000000000001,"y1":-0.481,"x":0.5015000000000001,"y":-0.5445},{"type":"L","x":0.5015000000000001,"y":-0.5445},{"type":"L","x":0.5015000000000001,"y":-0.5445},{"type":"Q","x1":0.438,"y1":-0.608,"x":0.314,"y":-0.608},{"type":"L","x":0.314,"y":-0.608},{"type":"L","x":0.20700000000000002,"y":-0.608},{"type":"Z"}]},{"width":0.296,"offset":0.640166666666667,"path":[{"type":"M","x":0.20800000000000002,"y":0},{"type":"L","x":0.088,"y":0},{"type":"L","x":0.088,"y":-0.712},{"type":"L","x":0.20800000000000002,"y":-0.712},{"type":"L","x":0.20800000000000002,"y":0},{"type":"Z"}]},{"width":0.766,"offset":1.1878333333333333,"path":[{"type":"M","x":0.677,"y":0},{"type":"L","x":0.505,"y":0},{"type":"L","x":0.35100000000000003,"y":-0.298},{"type":"L","x":0.35100000000000003,"y":-0.298},{"type":"Q","x1":0.27,"y1":-0.456,"x":0.2,"y":-0.604},{"type":"L","x":0.2,"y":-0.604},{"type":"L","x":0.198,"y":-0.604},{"type":"L","x":0.198,"y":-0.604},{"type":"Q","x1":0.20400000000000001,"y1":-0.442,"x":0.20400000000000001,"y":-0.28},{"type":"L","x":0.20400000000000001,"y":-0.28},{"type":"L","x":0.20400000000000001,"y":0},{"type":"L","x":0.088,"y":0},{"type":"L","x":0.088,"y":-0.712},{"type":"L","x":0.261,"y":-0.712},{"type":"L","x":0.41400000000000003,"y":-0.41400000000000003},{"type":"L","x":0.41400000000000003,"y":-0.41400000000000003},{"type":"Q","x1":0.495,"y1":-0.256,"x":0.5650000000000001,"y":-0.108},{"type":"L","x":0.5650000000000001,"y":-0.108},{"type":"L","x":0.5670000000000001,"y":-0.108},{"type":"L","x":0.5670000000000001,"y":-0.108},{"type":"Q","x1":0.562,"y1":-0.28800000000000003,"x":0.562,"y":-0.432},{"type":"L","x":0.562,"y":-0.432},{"type":"L","x":0.562,"y":-0.712},{"type":"L","x":0.677,"y":-0.712},{"type":"L","x":0.677,"y":0},{"type":"Z"}]},{"width":0.737,"offset":1.956,"path":[{"type":"M","x":0.37,"y":-0.727},{"type":"L","x":0.37,"y":-0.727},{"type":"Q","x1":0.496,"y1":-0.727,"x":0.5725,"y":-0.664},{"type":"L","x":0.5725,"y":-0.664},{"type":"L","x":0.5725,"y":-0.664},{"type":"Q","x1":0.649,"y1":-0.601,"x":0.66,"y":-0.494},{"type":"L","x":0.66,"y":-0.494},{"type":"L","x":0.532,"y":-0.494},{"type":"L","x":0.532,"y":-0.494},{"type":"Q","x1":0.521,"y1":-0.555,"x":0.47950000000000004,"y":-0.5875},{"type":"L","x":0.47950000000000004,"y":-0.5875},{"type":"L","x":0.47950000000000004,"y":-0.5875},{"type":"Q","x1":0.438,"y1":-0.62,"x":0.37,"y":-0.62},{"type":"L","x":0.37,"y":-0.62},{"type":"L","x":0.37,"y":-0.62},{"type":"Q","x1":0.275,"y1":-0.62,"x":0.2195,"y":-0.5485},{"type":"L","x":0.2195,"y":-0.5485},{"type":"L","x":0.2195,"y":-0.5485},{"type":"Q","x1":0.164,"y1":-0.47700000000000004,"x":0.164,"y":-0.353},{"type":"L","x":0.164,"y":-0.353},{"type":"L","x":0.164,"y":-0.353},{"type":"Q","x1":0.164,"y1":-0.228,"x":0.218,"y":-0.156},{"type":"L","x":0.218,"y":-0.156},{"type":"L","x":0.218,"y":-0.156},{"type":"Q","x1":0.272,"y1":-0.084,"x":0.365,"y":-0.084},{"type":"L","x":0.365,"y":-0.084},{"type":"L","x":0.365,"y":-0.084},{"type":"Q","x1":0.449,"y1":-0.084,"x":0.497,"y":-0.134},{"type":"L","x":0.497,"y":-0.134},{"type":"L","x":0.497,"y":-0.134},{"type":"Q","x1":0.545,"y1":-0.184,"x":0.546,"y":-0.28500000000000003},{"type":"L","x":0.546,"y":-0.28500000000000003},{"type":"L","x":0.364,"y":-0.28500000000000003},{"type":"L","x":0.364,"y":-0.385},{"type":"L","x":0.658,"y":-0.385},{"type":"L","x":0.658,"y":0},{"type":"L","x":0.555,"y":0},{"type":"L","x":0.555,"y":-0.088},{"type":"L","x":0.553,"y":-0.088},{"type":"L","x":0.553,"y":-0.088},{"type":"Q","x1":0.524,"y1":-0.041,"x":0.4675,"y":-0.014},{"type":"L","x":0.4675,"y":-0.014},{"type":"L","x":0.4675,"y":-0.014},{"type":"Q","x1":0.41100000000000003,"y1":0.013000000000000001,"x":0.338,"y":0.013000000000000001},{"type":"L","x":0.338,"y":0.013000000000000001},{"type":"L","x":0.338,"y":0.013000000000000001},{"type":"Q","x1":0.247,"y1":0.013000000000000001,"x":0.18,"y":-0.031},{"type":"L","x":0.18,"y":-0.031},{"type":"L","x":0.18,"y":-0.031},{"type":"Q","x1":0.113,"y1":-0.075,"x":0.0765,"y":-0.1575},{"type":"L","x":0.0765,"y":-0.1575},{"type":"L","x":0.0765,"y":-0.1575},{"type":"Q","x1":0.04,"y1":-0.24,"x":0.04,"y":-0.353},{"type":"L","x":0.04,"y":-0.353},{"type":"L","x":0.04,"y":-0.353},{"type":"Q","x1":0.04,"y1":-0.468,"x":0.08,"y":-0.5525},{"type":"L","x":0.08,"y":-0.5525},{"type":"L","x":0.08,"y":-0.5525},{"type":"Q","x1":0.12,"y1":-0.637,"x":0.1945,"y":-0.682},{"type":"L","x":0.1945,"y":-0.682},{"type":"L","x":0.1945,"y":-0.682},{"type":"Q","x1":0.269,"y1":-0.727,"x":0.37,"y":-0.727},{"type":"L","x":0.37,"y":-0.727},{"type":"Z"}]}]},{"width":6.292666666666668,"letters":[{"width":0.607,"offset":-2.842833333333334,"path":[{"type":"M","x":0.597,"y":-0.608},{"type":"L","x":0.363,"y":-0.608},{"type":"L","x":0.363,"y":0},{"type":"L","x":0.244,"y":0},{"type":"L","x":0.244,"y":-0.608},{"type":"L","x":0.01,"y":-0.608},{"type":"L","x":0.01,"y":-0.712},{"type":"L","x":0.597,"y":-0.712},{"type":"L","x":0.597,"y":-0.608},{"type":"Z"}]},{"width":0.744,"offset":-2.1506666666666674,"path":[{"type":"M","x":0.655,"y":0},{"type":"L","x":0.536,"y":0},{"type":"L","x":0.536,"y":-0.318},{"type":"L","x":0.20800000000000002,"y":-0.318},{"type":"L","x":0.20800000000000002,"y":0},{"type":"L","x":0.088,"y":0},{"type":"L","x":0.088,"y":-0.712},{"type":"L","x":0.20800000000000002,"y":-0.712},{"type":"L","x":0.20800000000000002,"y":-0.422},{"type":"L","x":0.536,"y":-0.422},{"type":"L","x":0.536,"y":-0.712},{"type":"L","x":0.655,"y":-0.712},{"type":"L","x":0.655,"y":0},{"type":"Z"}]},{"width":0.625,"offset":-1.4495000000000007,"path":[{"type":"M","x":0.5640000000000001,"y":-0.608},{"type":"L","x":0.20800000000000002,"y":-0.608},{"type":"L","x":0.20800000000000002,"y":-0.41500000000000004},{"type":"L","x":0.542,"y":-0.41500000000000004},{"type":"L","x":0.542,"y":-0.312},{"type":"L","x":0.20800000000000002,"y":-0.312},{"type":"L","x":0.20800000000000002,"y":-0.10400000000000001},{"type":"L","x":0.5740000000000001,"y":-0.10400000000000001},{"type":"L","x":0.5740000000000001,"y":0},{"type":"L","x":0.088,"y":0},{"type":"L","x":0.088,"y":-0.712},{"type":"L","x":0.5640000000000001,"y":-0.712},{"type":"L","x":0.5640000000000001,"y":-0.608},{"type":"Z"}]},{"width":0.23,"offset":-1.0053333333333336,"path":[]},{"width":0.729,"offset":-0.5091666666666672,"path":[{"type":"M","x":0.316,"y":-0.712},{"type":"L","x":0.316,"y":-0.712},{"type":"Q","x1":0.495,"y1":-0.712,"x":0.592,"y":-0.6195},{"type":"L","x":0.592,"y":-0.6195},{"type":"L","x":0.592,"y":-0.6195},{"type":"Q","x1":0.6890000000000001,"y1":-0.527,"x":0.6890000000000001,"y":-0.356},{"type":"L","x":0.6890000000000001,"y":-0.356},{"type":"L","x":0.6890000000000001,"y":-0.356},{"type":"Q","x1":0.6890000000000001,"y1":-0.185,"x":0.592,"y":-0.0925},{"type":"L","x":0.592,"y":-0.0925},{"type":"L","x":0.592,"y":-0.0925},{"type":"Q","x1":0.495,"y1":0,"x":0.316,"y":0},{"type":"L","x":0.316,"y":0},{"type":"L","x":0.088,"y":0},{"type":"L","x":0.088,"y":-0.712},{"type":"L","x":0.316,"y":-0.712},{"type":"Z"},{"type":"M","x":0.20700000000000002,"y":-0.608},{"type":"L","x":0.20700000000000002,"y":-0.10400000000000001},{"type":"L","x":0.314,"y":-0.10400000000000001},{"type":"L","x":0.314,"y":-0.10400000000000001},{"type":"Q","x1":0.438,"y1":-0.10400000000000001,"x":0.5015000000000001,"y":-0.1675},{"type":"L","x":0.5015000000000001,"y":-0.1675},{"type":"L","x":0.5015000000000001,"y":-0.1675},{"type":"Q","x1":0.5650000000000001,"y1":-0.231,"x":0.5650000000000001,"y":-0.356},{"type":"L","x":0.5650000000000001,"y":-0.356},{"type":"L","x":0.5650000000000001,"y":-0.356},{"type":"Q","x1":0.5650000000000001,"y1":-0.481,"x":0.5015000000000001,"y":-0.5445},{"type":"L","x":0.5015000000000001,"y":-0.5445},{"type":"L","x":0.5015000000000001,"y":-0.5445},{"type":"Q","x1":0.438,"y1":-0.608,"x":0.314,"y":-0.608},{"type":"L","x":0.314,"y":-0.608},{"type":"L","x":0.20700000000000002,"y":-0.608},{"type":"Z"}]},{"width":0.296,"offset":0.019999999999999574,"path":[{"type":"M","x":0.20800000000000002,"y":0},{"type":"L","x":0.088,"y":0},{"type":"L","x":0.088,"y":-0.712},{"type":"L","x":0.20800000000000002,"y":-0.712},{"type":"L","x":0.20800000000000002,"y":0},{"type":"Z"}]},{"width":0.737,"offset":0.5531666666666664,"path":[{"type":"M","x":0.37,"y":-0.727},{"type":"L","x":0.37,"y":-0.727},{"type":"Q","x1":0.496,"y1":-0.727,"x":0.5725,"y":-0.664},{"type":"L","x":0.5725,"y":-0.664},{"type":"L","x":0.5725,"y":-0.664},{"type":"Q","x1":0.649,"y1":-0.601,"x":0.66,"y":-0.494},{"type":"L","x":0.66,"y":-0.494},{"type":"L","x":0.532,"y":-0.494},{"type":"L","x":0.532,"y":-0.494},{"type":"Q","x1":0.521,"y1":-0.555,"x":0.47950000000000004,"y":-0.5875},{"type":"L","x":0.47950000000000004,"y":-0.5875},{"type":"L","x":0.47950000000000004,"y":-0.5875},{"type":"Q","x1":0.438,"y1":-0.62,"x":0.37,"y":-0.62},{"type":"L","x":0.37,"y":-0.62},{"type":"L","x":0.37,"y":-0.62},{"type":"Q","x1":0.275,"y1":-0.62,"x":0.2195,"y":-0.5485},{"type":"L","x":0.2195,"y":-0.5485},{"type":"L","x":0.2195,"y":-0.5485},{"type":"Q","x1":0.164,"y1":-0.47700000000000004,"x":0.164,"y":-0.353},{"type":"L","x":0.164,"y":-0.353},{"type":"L","x":0.164,"y":-0.353},{"type":"Q","x1":0.164,"y1":-0.228,"x":0.218,"y":-0.156},{"type":"L","x":0.218,"y":-0.156},{"type":"L","x":0.218,"y":-0.156},{"type":"Q","x1":0.272,"y1":-0.084,"x":0.365,"y":-0.084},{"type":"L","x":0.365,"y":-0.084},{"type":"L","x":0.365,"y":-0.084},{"type":"Q","x1":0.449,"y1":-0.084,"x":0.497,"y":-0.134},{"type":"L","x":0.497,"y":-0.134},{"type":"L","x":0.497,"y":-0.134},{"type":"Q","x1":0.545,"y1":-0.184,"x":0.546,"y":-0.28500000000000003},{"type":"L","x":0.546,"y":-0.28500000000000003},{"type":"L","x":0.364,"y":-0.28500000000000003},{"type":"L","x":0.364,"y":-0.385},{"type":"L","x":0.658,"y":-0.385},{"type":"L","x":0.658,"y":0},{"type":"L","x":0.555,"y":0},{"type":"L","x":0.555,"y":-0.088},{"type":"L","x":0.553,"y":-0.088},{"type":"L","x":0.553,"y":-0.088},{"type":"Q","x1":0.524,"y1":-0.041,"x":0.4675,"y":-0.014},{"type":"L","x":0.4675,"y":-0.014},{"type":"L","x":0.4675,"y":-0.014},{"type":"Q","x1":0.41100000000000003,"y1":0.013000000000000001,"x":0.338,"y":0.013000000000000001},{"type":"L","x":0.338,"y":0.013000000000000001},{"type":"L","x":0.338,"y":0.013000000000000001},{"type":"Q","x1":0.247,"y1":0.013000000000000001,"x":0.18,"y":-0.031},{"type":"L","x":0.18,"y":-0.031},{"type":"L","x":0.18,"y":-0.031},{"type":"Q","x1":0.113,"y1":-0.075,"x":0.0765,"y":-0.1575},{"type":"L","x":0.0765,"y":-0.1575},{"type":"L","x":0.0765,"y":-0.1575},{"type":"Q","x1":0.04,"y1":-0.24,"x":0.04,"y":-0.353},{"type":"L","x":0.04,"y":-0.353},{"type":"L","x":0.04,"y":-0.353},{"type":"Q","x1":0.04,"y1":-0.468,"x":0.08,"y":-0.5525},{"type":"L","x":0.08,"y":-0.5525},{"type":"L","x":0.08,"y":-0.5525},{"type":"Q","x1":0.12,"y1":-0.637,"x":0.1945,"y":-0.682},{"type":"L","x":0.1945,"y":-0.682},{"type":"L","x":0.1945,"y":-0.682},{"type":"Q","x1":0.269,"y1":-0.727,"x":0.37,"y":-0.727},{"type":"L","x":0.37,"y":-0.727},{"type":"Z"}]},{"width":0.296,"offset":1.0863333333333327,"path":[{"type":"M","x":0.20800000000000002,"y":0},{"type":"L","x":0.088,"y":0},{"type":"L","x":0.088,"y":-0.712},{"type":"L","x":0.20800000000000002,"y":-0.712},{"type":"L","x":0.20800000000000002,"y":0},{"type":"Z"}]},{"width":0.607,"offset":1.5544999999999995,"path":[{"type":"M","x":0.597,"y":-0.608},{"type":"L","x":0.363,"y":-0.608},{"type":"L","x":0.363,"y":0},{"type":"L","x":0.244,"y":0},{"type":"L","x":0.244,"y":-0.608},{"type":"L","x":0.01,"y":-0.608},{"type":"L","x":0.01,"y":-0.712},{"type":"L","x":0.597,"y":-0.712},{"type":"L","x":0.597,"y":-0.608},{"type":"Z"}]},{"width":0.687,"offset":2.2181666666666664,"path":[{"type":"M","x":0.491,"y":-0.193},{"type":"L","x":0.196,"y":-0.193},{"type":"L","x":0.13,"y":0},{"type":"L","x":0.004,"y":0},{"type":"L","x":0.263,"y":-0.712},{"type":"L","x":0.424,"y":-0.712},{"type":"L","x":0.683,"y":0},{"type":"L","x":0.557,"y":0},{"type":"L","x":0.491,"y":-0.193},{"type":"Z"},{"type":"M","x":0.455,"y":-0.297},{"type":"L","x":0.436,"y":-0.353},{"type":"L","x":0.436,"y":-0.353},{"type":"Q","x1":0.376,"y1":-0.531,"x":0.34400000000000003,"y":-0.636},{"type":"L","x":0.34400000000000003,"y":-0.636},{"type":"L","x":0.342,"y":-0.636},{"type":"L","x":0.342,"y":-0.636},{"type":"Q","x1":0.289,"y1":-0.463,"x":0.251,"y":-0.353},{"type":"L","x":0.251,"y":-0.353},{"type":"L","x":0.232,"y":-0.297},{"type":"L","x":0.455,"y":-0.297},{"type":"Z"}]},{"width":0.5680000000000001,"offset":2.8623333333333334,"path":[{"type":"M","x":0.20800000000000002,"y":-0.10400000000000001},{"type":"L","x":0.558,"y":-0.10400000000000001},{"type":"L","x":0.558,"y":0},{"type":"L","x":0.088,"y":0},{"type":"L","x":0.088,"y":-0.712},{"type":"L","x":0.20800000000000002,"y":-0.712},{"type":"L","x":0.20800000000000002,"y":-0.10400000000000001},{"type":"Z"}]}]},{"width":3.5300000000000002,"letters":[{"width":0.87,"offset":-1.33,"path":[{"type":"M","x":0.197109375,"y":-0.4621875},{"type":"L","x":0.0373828125,"y":-0.4621875},{"type":"L","x":0.0373828125,"y":-0.5335546875},{"type":"L","x":0.2208984375,"y":-0.5335546875},{"type":"L","x":0.2208984375,"y":-0.7102734375},{"type":"L","x":0.2990625,"y":-0.7102734375},{"type":"L","x":0.2990625,"y":-0.5335546875},{"type":"L","x":0.4621875,"y":-0.5335546875},{"type":"L","x":0.4621875,"y":-0.4621875},{"type":"L","x":0.2990625,"y":-0.4621875},{"type":"L","x":0.2990625,"y":-0.3908203125},{"type":"L","x":0.333046875,"y":-0.4316015625},{"type":"L","x":0.333046875,"y":-0.4316015625},{"type":"Q","x1":0.3840234375,"y1":-0.401015625,"x":0.4316015625,"y":-0.373828125},{"type":"L","x":0.4316015625,"y":-0.373828125},{"type":"L","x":0.4316015625,"y":-0.373828125},{"type":"Q","x1":0.5199609374999999,"y1":-0.5199609374999999,"x":0.5675390625,"y":-0.7170703125},{"type":"L","x":0.5675390625,"y":-0.7170703125},{"type":"L","x":0.6525,"y":-0.706875},{"type":"L","x":0.6525,"y":-0.706875},{"type":"Q","x1":0.632109375,"y1":-0.6423046875,"x":0.61171875,"y":-0.5743359375},{"type":"L","x":0.61171875,"y":-0.5743359375},{"type":"L","x":0.8394140625,"y":-0.5743359375},{"type":"L","x":0.8394140625,"y":-0.4927734375},{"type":"L","x":0.781640625,"y":-0.4927734375},{"type":"L","x":0.781640625,"y":-0.4927734375},{"type":"Q","x1":0.76125,"y1":-0.2446875,"x":0.686484375,"y":-0.12234375},{"type":"L","x":0.686484375,"y":-0.12234375},{"type":"L","x":0.686484375,"y":-0.12234375},{"type":"Q","x1":0.74765625,"y1":-0.047578125,"x":0.8462109375,"y":0.0101953125},{"type":"L","x":0.8462109375,"y":0.0101953125},{"type":"L","x":0.8462109375,"y":0.0101953125},{"type":"Q","x1":0.8428125,"y1":0.0169921875,"x":0.8326171875,"y":0.0305859375},{"type":"L","x":0.8326171875,"y":0.0305859375},{"type":"L","x":0.8326171875,"y":0.0305859375},{"type":"Q","x1":0.808828125,"y1":0.06796875,"x":0.795234375,"y":0.09515625},{"type":"L","x":0.795234375,"y":0.09515625},{"type":"L","x":0.795234375,"y":0.09515625},{"type":"Q","x1":0.69328125,"y1":0.020390625,"x":0.63890625,"y":-0.047578125},{"type":"L","x":0.63890625,"y":-0.047578125},{"type":"L","x":0.63890625,"y":-0.047578125},{"type":"Q","x1":0.58453125,"y1":0.01359375,"x":0.47238281249999997,"y":0.101953125},{"type":"L","x":0.47238281249999997,"y":0.101953125},{"type":"L","x":0.47238281249999997,"y":0.101953125},{"type":"Q","x1":0.4451953125,"y1":0.061171875,"x":0.4180078125,"y":0.033984375},{"type":"L","x":0.4180078125,"y":0.033984375},{"type":"L","x":0.4044140625,"y":0.0577734375},{"type":"L","x":0.4044140625,"y":0.0577734375},{"type":"Q","x1":0.3296484375,"y1":0.020390625,"x":0.292265625,"y":0.0033984375},{"type":"L","x":0.292265625,"y":0.0033984375},{"type":"L","x":0.292265625,"y":0.0033984375},{"type":"Q","x1":0.2073046875,"y1":0.0577734375,"x":0.0577734375,"y":0.0985546875},{"type":"L","x":0.0577734375,"y":0.0985546875},{"type":"L","x":0.0577734375,"y":0.0985546875},{"type":"Q","x1":0.04078125,"y1":0.06796875,"x":0.020390625,"y":0.0237890625},{"type":"L","x":0.020390625,"y":0.0237890625},{"type":"L","x":0.020390625,"y":0.0237890625},{"type":"Q","x1":0.033984375,"y1":0.020390625,"x":0.054375,"y":0.01359375},{"type":"L","x":0.054375,"y":0.01359375},{"type":"L","x":0.054375,"y":0.01359375},{"type":"Q","x1":0.1733203125,"y1":-0.0101953125,"x":0.210703125,"y":-0.0305859375},{"type":"L","x":0.210703125,"y":-0.0305859375},{"type":"L","x":0.210703125,"y":-0.0305859375},{"type":"Q","x1":0.2005078125,"y1":-0.0373828125,"x":0.17671875,"y":-0.047578125},{"type":"L","x":0.17671875,"y":-0.047578125},{"type":"L","x":0.17671875,"y":-0.047578125},{"type":"Q","x1":0.1461328125,"y1":-0.0645703125,"x":0.06796875,"y":-0.09515625},{"type":"L","x":0.06796875,"y":-0.09515625},{"type":"L","x":0.06796875,"y":-0.09515625},{"type":"Q","x1":0.09515625,"y1":-0.1325390625,"x":0.1189453125,"y":-0.1733203125},{"type":"L","x":0.1189453125,"y":-0.1733203125},{"type":"L","x":0.0305859375,"y":-0.1733203125},{"type":"L","x":0.0305859375,"y":-0.2446875},{"type":"L","x":0.163125,"y":-0.2446875},{"type":"L","x":0.163125,"y":-0.2446875},{"type":"Q","x1":0.1801171875,"y1":-0.2752734375,"x":0.19371093749999999,"y":-0.2990625},{"type":"L","x":0.19371093749999999,"y":-0.2990625},{"type":"L","x":0.2752734375,"y":-0.292265625},{"type":"L","x":0.2480859375,"y":-0.2446875},{"type":"L","x":0.4383984375,"y":-0.2446875},{"type":"L","x":0.4383984375,"y":-0.169921875},{"type":"L","x":0.4383984375,"y":-0.169921875},{"type":"Q","x1":0.4112109375,"y1":-0.0985546875,"x":0.360234375,"y":-0.0441796875},{"type":"L","x":0.360234375,"y":-0.0441796875},{"type":"L","x":0.360234375,"y":-0.0441796875},{"type":"Q","x1":0.401015625,"y1":-0.0271875,"x":0.44859375,"y":-0.006796875},{"type":"L","x":0.44859375,"y":-0.006796875},{"type":"L","x":0.428203125,"y":0.020390625},{"type":"L","x":0.428203125,"y":0.020390625},{"type":"Q","x1":0.53015625,"y1":-0.047578125,"x":0.5879296875,"y":-0.12234375},{"type":"L","x":0.5879296875,"y":-0.12234375},{"type":"L","x":0.5879296875,"y":-0.12234375},{"type":"Q","x1":0.5403515625,"y1":-0.20390625,"x":0.5131640625,"y":-0.3568359375},{"type":"L","x":0.5131640625,"y":-0.3568359375},{"type":"L","x":0.5131640625,"y":-0.3568359375},{"type":"Q","x1":0.50296875,"y1":-0.3432421875,"x":0.489375,"y":-0.319453125},{"type":"L","x":0.489375,"y":-0.319453125},{"type":"L","x":0.489375,"y":-0.319453125},{"type":"Q","x1":0.482578125,"y1":-0.305859375,"x":0.4791796875,"y":-0.2990625},{"type":"L","x":0.4791796875,"y":-0.2990625},{"type":"L","x":0.4791796875,"y":-0.2990625},{"type":"Q","x1":0.47578125,"y1":-0.30246093749999997,"x":0.4655859375,"y":-0.3160546875},{"type":"L","x":0.4655859375,"y":-0.3160546875},{"type":"L","x":0.4655859375,"y":-0.3160546875},{"type":"Q","x1":0.455390625,"y1":-0.333046875,"x":0.44859375,"y":-0.33984375},{"type":"L","x":0.44859375,"y":-0.33984375},{"type":"L","x":0.414609375,"y":-0.292265625},{"type":"L","x":0.414609375,"y":-0.292265625},{"type":"Q","x1":0.3704296875,"y1":-0.3296484375,"x":0.2990625,"y":-0.373828125},{"type":"L","x":0.2990625,"y":-0.373828125},{"type":"L","x":0.2990625,"y":-0.31265625},{"type":"L","x":0.2208984375,"y":-0.31265625},{"type":"L","x":0.2208984375,"y":-0.3976171875},{"type":"L","x":0.2208984375,"y":-0.3976171875},{"type":"Q","x1":0.1665234375,"y1":-0.3364453125,"x":0.0645703125,"y":-0.2820703125},{"type":"L","x":0.0645703125,"y":-0.2820703125},{"type":"L","x":0.0645703125,"y":-0.2820703125},{"type":"Q","x1":0.054375,"y1":-0.30246093749999997,"x":0.0305859375,"y":-0.33984375},{"type":"L","x":0.0305859375,"y":-0.33984375},{"type":"L","x":0.0305859375,"y":-0.33984375},{"type":"Q","x1":0.0271875,"y1":-0.346640625,"x":0.0237890625,"y":-0.3500390625},{"type":"L","x":0.0237890625,"y":-0.3500390625},{"type":"L","x":0.0237890625,"y":-0.3500390625},{"type":"Q","x1":0.129140625,"y1":-0.3908203125,"x":0.197109375,"y":-0.4621875},{"type":"L","x":0.197109375,"y":-0.4621875},{"type":"Z"},{"type":"M","x":0.5709375,"y":-0.47238281249999997},{"type":"L","x":0.5709375,"y":-0.47238281249999997},{"type":"L","x":0.5709375,"y":-0.47238281249999997},{"type":"Q","x1":0.591328125,"y1":-0.2990625,"x":0.63890625,"y":-0.2005078125},{"type":"L","x":0.63890625,"y":-0.2005078125},{"type":"L","x":0.63890625,"y":-0.2005078125},{"type":"Q","x1":0.6898828124999999,"y1":-0.2956640625,"x":0.7034765625,"y":-0.4927734375},{"type":"L","x":0.7034765625,"y":-0.4927734375},{"type":"L","x":0.577734375,"y":-0.4927734375},{"type":"L","x":0.577734375,"y":-0.4927734375},{"type":"Q","x1":0.5709375,"y1":-0.482578125,"x":0.5709375,"y":-0.47238281249999997},{"type":"Z"},{"type":"M","x":0.20390625,"y":-0.1733203125},{"type":"L","x":0.169921875,"y":-0.1257421875},{"type":"L","x":0.169921875,"y":-0.1257421875},{"type":"Q","x1":0.1903125,"y1":-0.1189453125,"x":0.2276953125,"y":-0.101953125},{"type":"L","x":0.2276953125,"y":-0.101953125},{"type":"L","x":0.2276953125,"y":-0.101953125},{"type":"Q","x1":0.2684765625,"y1":-0.088359375,"x":0.28546875,"y":-0.0781640625},{"type":"L","x":0.28546875,"y":-0.0781640625},{"type":"L","x":0.28546875,"y":-0.0781640625},{"type":"Q","x1":0.3296484375,"y1":-0.1121484375,"x":0.3534375,"y":-0.1733203125},{"type":"L","x":0.3534375,"y":-0.1733203125},{"type":"L","x":0.20390625,"y":-0.1733203125},{"type":"Z"},{"type":"M","x":0.373828125,"y":-0.5403515625},{"type":"L","x":0.373828125,"y":-0.5403515625},{"type":"L","x":0.319453125,"y":-0.5879296875},{"type":"L","x":0.319453125,"y":-0.5879296875},{"type":"Q","x1":0.3500390625,"y1":-0.6151171875,"x":0.414609375,"y":-0.686484375},{"type":"L","x":0.414609375,"y":-0.686484375},{"type":"L","x":0.47238281249999997,"y":-0.6423046875},{"type":"L","x":0.47238281249999997,"y":-0.6423046875},{"type":"Q","x1":0.4451953125,"y1":-0.61171875,"x":0.373828125,"y":-0.5403515625},{"type":"Z"},{"type":"M","x":0.197109375,"y":-0.591328125},{"type":"L","x":0.1359375,"y":-0.54375},{"type":"L","x":0.1359375,"y":-0.54375},{"type":"Q","x1":0.0815625,"y1":-0.6083203125,"x":0.047578125,"y":-0.6423046875},{"type":"L","x":0.047578125,"y":-0.6423046875},{"type":"L","x":0.101953125,"y":-0.6830859375},{"type":"L","x":0.101953125,"y":-0.6830859375},{"type":"Q","x1":0.1189453125,"y1":-0.66609375,"x":0.156328125,"y":-0.6287109375},{"type":"L","x":0.156328125,"y":-0.6287109375},{"type":"L","x":0.156328125,"y":-0.6287109375},{"type":"Q","x1":0.1869140625,"y1":-0.6015234375,"x":0.197109375,"y":-0.591328125},{"type":"L","x":0.197109375,"y":-0.591328125},{"type":"Z"}]},{"width":0.87,"offset":-0.44333333333333336,"path":[{"type":"M","x":0.4044140625,"y":-0.142734375},{"type":"L","x":0.0237890625,"y":-0.142734375},{"type":"L","x":0.0237890625,"y":-0.2276953125},{"type":"L","x":0.4044140625,"y":-0.2276953125},{"type":"L","x":0.4044140625,"y":-0.2752734375},{"type":"L","x":0.55734375,"y":-0.360234375},{"type":"L","x":0.169921875,"y":-0.360234375},{"type":"L","x":0.169921875,"y":-0.441796875},{"type":"L","x":0.6966796875,"y":-0.441796875},{"type":"L","x":0.6966796875,"y":-0.3568359375},{"type":"L","x":0.4995703125,"y":-0.2446875},{"type":"L","x":0.4995703125,"y":-0.2276953125},{"type":"L","x":0.8462109375,"y":-0.2276953125},{"type":"L","x":0.8462109375,"y":-0.142734375},{"type":"L","x":0.4995703125,"y":-0.142734375},{"type":"L","x":0.4995703125,"y":-0.0237890625},{"type":"L","x":0.4995703125,"y":-0.0237890625},{"type":"Q","x1":0.50296875,"y1":0.088359375,"x":0.3840234375,"y":0.088359375},{"type":"L","x":0.3840234375,"y":0.088359375},{"type":"L","x":0.3840234375,"y":0.088359375},{"type":"Q","x1":0.2990625,"y1":0.088359375,"x":0.2480859375,"y":0.088359375},{"type":"L","x":0.2480859375,"y":0.088359375},{"type":"L","x":0.2480859375,"y":0.088359375},{"type":"Q","x1":0.2446875,"y1":0.074765625,"x":0.2412890625,"y":0.047578125},{"type":"L","x":0.2412890625,"y":0.047578125},{"type":"L","x":0.2412890625,"y":0.047578125},{"type":"Q","x1":0.2344921875,"y1":0.01359375,"x":0.23109375,"y":0},{"type":"L","x":0.23109375,"y":0},{"type":"L","x":0.23109375,"y":0},{"type":"Q","x1":0.2888671875,"y1":0.0033984375,"x":0.3432421875,"y":0.0033984375},{"type":"L","x":0.3432421875,"y":0.0033984375},{"type":"L","x":0.3432421875,"y":0.0033984375},{"type":"Q","x1":0.4078125,"y1":0.006796875,"x":0.4044140625,"y":-0.0509765625},{"type":"L","x":0.4044140625,"y":-0.0509765625},{"type":"L","x":0.4044140625,"y":-0.142734375},{"type":"Z"},{"type":"M","x":0.1461328125,"y":-0.4248046875},{"type":"L","x":0.054375,"y":-0.4248046875},{"type":"L","x":0.054375,"y":-0.61171875},{"type":"L","x":0.401015625,"y":-0.61171875},{"type":"L","x":0.401015625,"y":-0.61171875},{"type":"Q","x1":0.38742187499999997,"y1":-0.645703125,"x":0.3636328125,"y":-0.706875},{"type":"L","x":0.3636328125,"y":-0.706875},{"type":"L","x":0.468984375,"y":-0.72046875},{"type":"L","x":0.468984375,"y":-0.72046875},{"type":"Q","x1":0.47578125,"y1":-0.7034765625,"x":0.4927734375,"y":-0.659296875},{"type":"L","x":0.4927734375,"y":-0.659296875},{"type":"L","x":0.4927734375,"y":-0.659296875},{"type":"Q","x1":0.50296875,"y1":-0.6287109375,"x":0.509765625,"y":-0.61171875},{"type":"L","x":0.509765625,"y":-0.61171875},{"type":"L","x":0.815625,"y":-0.61171875},{"type":"L","x":0.815625,"y":-0.4248046875},{"type":"L","x":0.7238671875,"y":-0.4248046875},{"type":"L","x":0.7238671875,"y":-0.5267578125},{"type":"L","x":0.1461328125,"y":-0.5267578125},{"type":"L","x":0.1461328125,"y":-0.4248046875},{"type":"Z"}]},{"width":0.87,"offset":0.44333333333333336,"path":[{"type":"M","x":0.8190234375,"y":0.06796875},{"type":"L","x":0.8190234375,"y":0.06796875},{"type":"L","x":0.8190234375,"y":0.06796875},{"type":"Q","x1":0.659296875,"y1":0.06796875,"x":0.58453125,"y":0.06796875},{"type":"L","x":0.58453125,"y":0.06796875},{"type":"L","x":0.58453125,"y":0.06796875},{"type":"Q","x1":0.4995703125,"y1":0.06796875,"x":0.428203125,"y":0.0645703125},{"type":"L","x":0.428203125,"y":0.0645703125},{"type":"L","x":0.428203125,"y":0.0645703125},{"type":"Q","x1":0.2752734375,"y1":0.0577734375,"x":0.1903125,"y":-0.033984375},{"type":"L","x":0.1903125,"y":-0.033984375},{"type":"L","x":0.1903125,"y":-0.033984375},{"type":"Q","x1":0.17671875,"y1":-0.0509765625,"x":0.1597265625,"y":-0.033984375},{"type":"L","x":0.1597265625,"y":-0.033984375},{"type":"L","x":0.1597265625,"y":-0.033984375},{"type":"Q","x1":0.129140625,"y1":-0.006796875,"x":0.061171875,"y":0.0713671875},{"type":"L","x":0.061171875,"y":0.0713671875},{"type":"L","x":0.061171875,"y":0.0713671875},{"type":"Q","x1":0.10875,"y1":0.0101953125,"x":0.054375,"y":0.0781640625},{"type":"L","x":0.054375,"y":0.0781640625},{"type":"L","x":0.0169921875,"y":-0.020390625},{"type":"L","x":0.0169921875,"y":-0.020390625},{"type":"Q","x1":0.0645703125,"y1":-0.074765625,"x":0.115546875,"y":-0.115546875},{"type":"L","x":0.115546875,"y":-0.115546875},{"type":"L","x":0.115546875,"y":-0.115546875},{"type":"Q","x1":0.14953125,"y1":-0.14953125,"x":0.1801171875,"y":-0.14953125},{"type":"L","x":0.1801171875,"y":-0.14953125},{"type":"L","x":0.1801171875,"y":-0.14953125},{"type":"Q","x1":0.19371093749999999,"y1":-0.14953125,"x":0.20390625,"y":-0.1461328125},{"type":"L","x":0.20390625,"y":-0.1461328125},{"type":"L","x":0.20390625,"y":-0.1461328125},{"type":"Q","x1":0.44859375,"y1":-0.2888671875,"x":0.645703125,"y":-0.47578125},{"type":"L","x":0.645703125,"y":-0.47578125},{"type":"L","x":0.0815625,"y":-0.47578125},{"type":"L","x":0.0815625,"y":-0.564140625},{"type":"L","x":0.4044140625,"y":-0.564140625},{"type":"L","x":0.4044140625,"y":-0.564140625},{"type":"Q","x1":0.401015625,"y1":-0.5709375,"x":0.39421875,"y":-0.58453125},{"type":"L","x":0.39421875,"y":-0.58453125},{"type":"L","x":0.39421875,"y":-0.58453125},{"type":"Q","x1":0.3636328125,"y1":-0.6626953125,"x":0.346640625,"y":-0.6966796875},{"type":"L","x":0.346640625,"y":-0.6966796875},{"type":"L","x":0.4519921875,"y":-0.713671875},{"type":"L","x":0.4519921875,"y":-0.713671875},{"type":"Q","x1":0.4587890625,"y1":-0.700078125,"x":0.468984375,"y":-0.66609375},{"type":"L","x":0.468984375,"y":-0.66609375},{"type":"L","x":0.468984375,"y":-0.66609375},{"type":"Q","x1":0.4995703125,"y1":-0.598125,"x":0.509765625,"y":-0.564140625},{"type":"L","x":0.509765625,"y":-0.564140625},{"type":"L","x":0.7748437499999999,"y":-0.564140625},{"type":"L","x":0.7748437499999999,"y":-0.468984375},{"type":"L","x":0.7748437499999999,"y":-0.468984375},{"type":"Q","x1":0.5471484375,"y1":-0.2446875,"x":0.271875,"y":-0.0849609375},{"type":"L","x":0.271875,"y":-0.0849609375},{"type":"L","x":0.271875,"y":-0.0849609375},{"type":"Q","x1":0.333046875,"y1":-0.0169921875,"x":0.44859375,"y":-0.0169921875},{"type":"L","x":0.44859375,"y":-0.0169921875},{"type":"L","x":0.44859375,"y":-0.0169921875},{"type":"Q","x1":0.5743359375,"y1":-0.01359375,"x":0.8462109375,"y":-0.020390625},{"type":"L","x":0.8462109375,"y":-0.020390625},{"type":"L","x":0.8462109375,"y":-0.020390625},{"type":"Q","x1":0.82921875,"y1":0.0237890625,"x":0.8190234375,"y":0.06796875},{"type":"Z"}]},{"width":0.87,"offset":1.33,"path":[{"type":"M","x":0.305859375,"y":-0.2956640625},{"type":"L","x":0.305859375,"y":-0.2956640625},{"type":"L","x":0.305859375,"y":-0.2956640625},{"type":"Q","x1":0.30246093749999997,"y1":-0.319453125,"x":0.2820703125,"y":-0.360234375},{"type":"L","x":0.2820703125,"y":-0.360234375},{"type":"L","x":0.2820703125,"y":-0.360234375},{"type":"Q","x1":0.2752734375,"y1":-0.3772265625,"x":0.271875,"y":-0.38742187499999997},{"type":"L","x":0.271875,"y":-0.38742187499999997},{"type":"L","x":0.271875,"y":-0.38742187499999997},{"type":"Q","x1":0.373828125,"y1":-0.5335546875,"x":0.4248046875,"y":-0.7170703125},{"type":"L","x":0.4248046875,"y":-0.7170703125},{"type":"L","x":0.5165625,"y":-0.700078125},{"type":"L","x":0.5165625,"y":-0.700078125},{"type":"Q","x1":0.5131640625,"y1":-0.6898828124999999,"x":0.5063671875,"y":-0.6694921875},{"type":"L","x":0.5063671875,"y":-0.6694921875},{"type":"L","x":0.5063671875,"y":-0.6694921875},{"type":"Q","x1":0.482578125,"y1":-0.6015234375,"x":0.4655859375,"y":-0.5675390625},{"type":"L","x":0.4655859375,"y":-0.5675390625},{"type":"L","x":0.618515625,"y":-0.5675390625},{"type":"L","x":0.618515625,"y":-0.5675390625},{"type":"Q","x1":0.6151171875,"y1":-0.577734375,"x":0.6083203125,"y":-0.5947265625},{"type":"L","x":0.6083203125,"y":-0.5947265625},{"type":"L","x":0.6083203125,"y":-0.5947265625},{"type":"Q","x1":0.5947265625,"y1":-0.632109375,"x":0.564140625,"y":-0.69328125},{"type":"L","x":0.564140625,"y":-0.69328125},{"type":"L","x":0.6491015625,"y":-0.706875},{"type":"L","x":0.6491015625,"y":-0.706875},{"type":"Q","x1":0.6830859375,"y1":-0.6423046875,"x":0.7034765625,"y":-0.5743359375},{"type":"L","x":0.7034765625,"y":-0.5743359375},{"type":"L","x":0.672890625,"y":-0.5675390625},{"type":"L","x":0.836015625,"y":-0.5675390625},{"type":"L","x":0.836015625,"y":-0.4927734375},{"type":"L","x":0.6796875,"y":-0.4927734375},{"type":"L","x":0.6796875,"y":-0.38742187499999997},{"type":"L","x":0.8258203125,"y":-0.38742187499999997},{"type":"L","x":0.8258203125,"y":-0.31265625},{"type":"L","x":0.6796875,"y":-0.31265625},{"type":"L","x":0.6796875,"y":-0.2073046875},{"type":"L","x":0.8258203125,"y":-0.2073046875},{"type":"L","x":0.8258203125,"y":-0.1325390625},{"type":"L","x":0.6796875,"y":-0.1325390625},{"type":"L","x":0.6796875,"y":-0.0237890625},{"type":"L","x":0.8428125,"y":-0.0237890625},{"type":"L","x":0.8428125,"y":0.0441796875},{"type":"L","x":0.4451953125,"y":0.0441796875},{"type":"L","x":0.4451953125,"y":0.0985546875},{"type":"L","x":0.360234375,"y":0.0985546875},{"type":"L","x":0.360234375,"y":-0.3704296875},{"type":"L","x":0.360234375,"y":-0.3704296875},{"type":"Q","x1":0.3364453125,"y1":-0.3364453125,"x":0.305859375,"y":-0.2956640625},{"type":"Z"},{"type":"M","x":0.0441796875,"y":-0.3636328125},{"type":"L","x":0.0441796875,"y":-0.3636328125},{"type":"L","x":0.020390625,"y":-0.441796875},{"type":"L","x":0.020390625,"y":-0.441796875},{"type":"Q","x1":0.04078125,"y1":-0.455390625,"x":0.061171875,"y":-0.489375},{"type":"L","x":0.061171875,"y":-0.489375},{"type":"L","x":0.061171875,"y":-0.489375},{"type":"Q","x1":0.1325390625,"y1":-0.6015234375,"x":0.183515625,"y":-0.7170703125},{"type":"L","x":0.183515625,"y":-0.7170703125},{"type":"L","x":0.2684765625,"y":-0.6898828124999999},{"type":"L","x":0.2684765625,"y":-0.6898828124999999},{"type":"Q","x1":0.210703125,"y1":-0.58453125,"x":0.1189453125,"y":-0.4451953125},{"type":"L","x":0.1189453125,"y":-0.4451953125},{"type":"L","x":0.20390625,"y":-0.44859375},{"type":"L","x":0.20390625,"y":-0.44859375},{"type":"Q","x1":0.23109375,"y1":-0.496171875,"x":0.251484375,"y":-0.5403515625},{"type":"L","x":0.251484375,"y":-0.5403515625},{"type":"L","x":0.3296484375,"y":-0.50296875},{"type":"L","x":0.3296484375,"y":-0.50296875},{"type":"Q","x1":0.2208984375,"y1":-0.32625,"x":0.1529296875,"y":-0.224296875},{"type":"L","x":0.1529296875,"y":-0.224296875},{"type":"L","x":0.2956640625,"y":-0.237890625},{"type":"L","x":0.2956640625,"y":-0.237890625},{"type":"Q","x1":0.292265625,"y1":-0.2141015625,"x":0.292265625,"y":-0.163125},{"type":"L","x":0.292265625,"y":-0.163125},{"type":"L","x":0.292265625,"y":-0.163125},{"type":"Q","x1":0.1903125,"y1":-0.1529296875,"x":0.088359375,"y":-0.1393359375},{"type":"L","x":0.088359375,"y":-0.1393359375},{"type":"L","x":0.088359375,"y":-0.1393359375},{"type":"Q","x1":0.0713671875,"y1":-0.1359375,"x":0.0645703125,"y":-0.1359375},{"type":"L","x":0.0645703125,"y":-0.1359375},{"type":"L","x":0.0373828125,"y":-0.210703125},{"type":"L","x":0.0373828125,"y":-0.210703125},{"type":"Q","x1":0.0645703125,"y1":-0.23109375,"x":0.0917578125,"y":-0.2684765625},{"type":"L","x":0.0917578125,"y":-0.2684765625},{"type":"L","x":0.0917578125,"y":-0.2684765625},{"type":"Q","x1":0.10875,"y1":-0.2888671875,"x":0.1393359375,"y":-0.33984375},{"type":"L","x":0.1393359375,"y":-0.33984375},{"type":"L","x":0.1393359375,"y":-0.33984375},{"type":"Q","x1":0.1529296875,"y1":-0.3636328125,"x":0.1597265625,"y":-0.373828125},{"type":"L","x":0.1597265625,"y":-0.373828125},{"type":"L","x":0.1597265625,"y":-0.373828125},{"type":"Q","x1":0.10875,"y1":-0.3704296875,"x":0.054375,"y":-0.3636328125},{"type":"L","x":0.054375,"y":-0.3636328125},{"type":"L","x":0.054375,"y":-0.3636328125},{"type":"Q","x1":0.0577734375,"y1":-0.3636328125,"x":0.0441796875,"y":-0.3636328125},{"type":"Z"},{"type":"M","x":0.033984375,"y":0.04078125},{"type":"L","x":0.033984375,"y":0.04078125},{"type":"L","x":0.0237890625,"y":-0.04078125},{"type":"L","x":0.0237890625,"y":-0.04078125},{"type":"Q","x1":0.1529296875,"y1":-0.0509765625,"x":0.30246093749999997,"y":-0.0781640625},{"type":"L","x":0.30246093749999997,"y":-0.0781640625},{"type":"L","x":0.30246093749999997,"y":-0.0781640625},{"type":"Q","x1":0.2990625,"y1":-0.04078125,"x":0.2990625,"y":0},{"type":"L","x":0.2990625,"y":0},{"type":"L","x":0.2990625,"y":0},{"type":"Q","x1":0.1461328125,"y1":0.020390625,"x":0.033984375,"y":0.04078125},{"type":"Z"},{"type":"M","x":0.5947265625,"y":-0.1325390625},{"type":"L","x":0.4451953125,"y":-0.1325390625},{"type":"L","x":0.4451953125,"y":-0.0237890625},{"type":"L","x":0.5947265625,"y":-0.0237890625},{"type":"L","x":0.5947265625,"y":-0.1325390625},{"type":"Z"},{"type":"M","x":0.5947265625,"y":-0.31265625},{"type":"L","x":0.4451953125,"y":-0.31265625},{"type":"L","x":0.4451953125,"y":-0.2073046875},{"type":"L","x":0.5947265625,"y":-0.2073046875},{"type":"L","x":0.5947265625,"y":-0.31265625},{"type":"Z"},{"type":"M","x":0.5947265625,"y":-0.4927734375},{"type":"L","x":0.4451953125,"y":-0.4927734375},{"type":"L","x":0.4451953125,"y":-0.38742187499999997},{"type":"L","x":0.5947265625,"y":-0.38742187499999997},{"type":"L","x":0.5947265625,"y":-0.4927734375},{"type":"Z"}]}]}]
},{}],17:[function(require,module,exports){
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
},{"gl-vec2":28}],18:[function(require,module,exports){
module.exports = add

/**
 * Adds two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
function add(out, a, b) {
    out[0] = a[0] + b[0]
    out[1] = a[1] + b[1]
    return out
}
},{}],19:[function(require,module,exports){
module.exports = clone

/**
 * Creates a new vec2 initialized with values from an existing vector
 *
 * @param {vec2} a vector to clone
 * @returns {vec2} a new 2D vector
 */
function clone(a) {
    var out = new Float32Array(2)
    out[0] = a[0]
    out[1] = a[1]
    return out
}
},{}],20:[function(require,module,exports){
module.exports = copy

/**
 * Copy the values from one vec2 to another
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the source vector
 * @returns {vec2} out
 */
function copy(out, a) {
    out[0] = a[0]
    out[1] = a[1]
    return out
}
},{}],21:[function(require,module,exports){
module.exports = create

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */
function create() {
    var out = new Float32Array(2)
    out[0] = 0
    out[1] = 0
    return out
}
},{}],22:[function(require,module,exports){
module.exports = cross

/**
 * Computes the cross product of two vec2's
 * Note that the cross product must by definition produce a 3D vector
 *
 * @param {vec3} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec3} out
 */
function cross(out, a, b) {
    var z = a[0] * b[1] - a[1] * b[0]
    out[0] = out[1] = 0
    out[2] = z
    return out
}
},{}],23:[function(require,module,exports){
module.exports = distance

/**
 * Calculates the euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} distance between a and b
 */
function distance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1]
    return Math.sqrt(x*x + y*y)
}
},{}],24:[function(require,module,exports){
module.exports = divide

/**
 * Divides two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
function divide(out, a, b) {
    out[0] = a[0] / b[0]
    out[1] = a[1] / b[1]
    return out
}
},{}],25:[function(require,module,exports){
module.exports = dot

/**
 * Calculates the dot product of two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} dot product of a and b
 */
function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1]
}
},{}],26:[function(require,module,exports){
module.exports = forEach

var vec = require('./create')()

/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
function forEach(a, stride, offset, count, fn, arg) {
    var i, l
    if(!stride) {
        stride = 2
    }

    if(!offset) {
        offset = 0
    }
    
    if(count) {
        l = Math.min((count * stride) + offset, a.length)
    } else {
        l = a.length
    }

    for(i = offset; i < l; i += stride) {
        vec[0] = a[i]
        vec[1] = a[i+1]
        fn(vec, vec, arg)
        a[i] = vec[0]
        a[i+1] = vec[1]
    }
    
    return a
}
},{"./create":21}],27:[function(require,module,exports){
module.exports = fromValues

/**
 * Creates a new vec2 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} a new 2D vector
 */
function fromValues(x, y) {
    var out = new Float32Array(2)
    out[0] = x
    out[1] = y
    return out
}
},{}],28:[function(require,module,exports){
module.exports = {
  create: require('./create')
  , clone: require('./clone')
  , fromValues: require('./fromValues')
  , copy: require('./copy')
  , set: require('./set')
  , add: require('./add')
  , subtract: require('./subtract')
  , multiply: require('./multiply')
  , divide: require('./divide')
  , min: require('./min')
  , max: require('./max')
  , scale: require('./scale')
  , scaleAndAdd: require('./scaleAndAdd')
  , distance: require('./distance')
  , squaredDistance: require('./squaredDistance')
  , length: require('./length')
  , squaredLength: require('./squaredLength')
  , negate: require('./negate')
  , normalize: require('./normalize')
  , dot: require('./dot')
  , cross: require('./cross')
  , lerp: require('./lerp')
  , random: require('./random')
  , transformMat2: require('./transformMat2')
  , transformMat2d: require('./transformMat2d')
  , transformMat3: require('./transformMat3')
  , transformMat4: require('./transformMat4')
  , forEach: require('./forEach')
}
},{"./add":18,"./clone":19,"./copy":20,"./create":21,"./cross":22,"./distance":23,"./divide":24,"./dot":25,"./forEach":26,"./fromValues":27,"./length":29,"./lerp":30,"./max":31,"./min":32,"./multiply":33,"./negate":34,"./normalize":35,"./random":36,"./scale":37,"./scaleAndAdd":38,"./set":39,"./squaredDistance":40,"./squaredLength":41,"./subtract":42,"./transformMat2":43,"./transformMat2d":44,"./transformMat3":45,"./transformMat4":46}],29:[function(require,module,exports){
module.exports = length

/**
 * Calculates the length of a vec2
 *
 * @param {vec2} a vector to calculate length of
 * @returns {Number} length of a
 */
function length(a) {
    var x = a[0],
        y = a[1]
    return Math.sqrt(x*x + y*y)
}
},{}],30:[function(require,module,exports){
module.exports = lerp

/**
 * Performs a linear interpolation between two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec2} out
 */
function lerp(out, a, b, t) {
    var ax = a[0],
        ay = a[1]
    out[0] = ax + t * (b[0] - ax)
    out[1] = ay + t * (b[1] - ay)
    return out
}
},{}],31:[function(require,module,exports){
module.exports = max

/**
 * Returns the maximum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
function max(out, a, b) {
    out[0] = Math.max(a[0], b[0])
    out[1] = Math.max(a[1], b[1])
    return out
}
},{}],32:[function(require,module,exports){
module.exports = min

/**
 * Returns the minimum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
function min(out, a, b) {
    out[0] = Math.min(a[0], b[0])
    out[1] = Math.min(a[1], b[1])
    return out
}
},{}],33:[function(require,module,exports){
module.exports = multiply

/**
 * Multiplies two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
function multiply(out, a, b) {
    out[0] = a[0] * b[0]
    out[1] = a[1] * b[1]
    return out
}
},{}],34:[function(require,module,exports){
module.exports = negate

/**
 * Negates the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to negate
 * @returns {vec2} out
 */
function negate(out, a) {
    out[0] = -a[0]
    out[1] = -a[1]
    return out
}
},{}],35:[function(require,module,exports){
module.exports = normalize

/**
 * Normalize a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to normalize
 * @returns {vec2} out
 */
function normalize(out, a) {
    var x = a[0],
        y = a[1]
    var len = x*x + y*y
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len)
        out[0] = a[0] * len
        out[1] = a[1] * len
    }
    return out
}
},{}],36:[function(require,module,exports){
module.exports = random

/**
 * Generates a random vector with the given scale
 *
 * @param {vec2} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec2} out
 */
function random(out, scale) {
    scale = scale || 1.0
    var r = Math.random() * 2.0 * Math.PI
    out[0] = Math.cos(r) * scale
    out[1] = Math.sin(r) * scale
    return out
}
},{}],37:[function(require,module,exports){
module.exports = scale

/**
 * Scales a vec2 by a scalar number
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec2} out
 */
function scale(out, a, b) {
    out[0] = a[0] * b
    out[1] = a[1] * b
    return out
}
},{}],38:[function(require,module,exports){
module.exports = scaleAndAdd

/**
 * Adds two vec2's after scaling the second operand by a scalar value
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec2} out
 */
function scaleAndAdd(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale)
    out[1] = a[1] + (b[1] * scale)
    return out
}
},{}],39:[function(require,module,exports){
module.exports = set

/**
 * Set the components of a vec2 to the given values
 *
 * @param {vec2} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} out
 */
function set(out, x, y) {
    out[0] = x
    out[1] = y
    return out
}
},{}],40:[function(require,module,exports){
module.exports = squaredDistance

/**
 * Calculates the squared euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} squared distance between a and b
 */
function squaredDistance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1]
    return x*x + y*y
}
},{}],41:[function(require,module,exports){
module.exports = squaredLength

/**
 * Calculates the squared length of a vec2
 *
 * @param {vec2} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
function squaredLength(a) {
    var x = a[0],
        y = a[1]
    return x*x + y*y
}
},{}],42:[function(require,module,exports){
module.exports = subtract

/**
 * Subtracts vector b from vector a
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
function subtract(out, a, b) {
    out[0] = a[0] - b[0]
    out[1] = a[1] - b[1]
    return out
}
},{}],43:[function(require,module,exports){
module.exports = transformMat2

/**
 * Transforms the vec2 with a mat2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2} m matrix to transform with
 * @returns {vec2} out
 */
function transformMat2(out, a, m) {
    var x = a[0],
        y = a[1]
    out[0] = m[0] * x + m[2] * y
    out[1] = m[1] * x + m[3] * y
    return out
}
},{}],44:[function(require,module,exports){
module.exports = transformMat2d

/**
 * Transforms the vec2 with a mat2d
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2d} m matrix to transform with
 * @returns {vec2} out
 */
function transformMat2d(out, a, m) {
    var x = a[0],
        y = a[1]
    out[0] = m[0] * x + m[2] * y + m[4]
    out[1] = m[1] * x + m[3] * y + m[5]
    return out
}
},{}],45:[function(require,module,exports){
module.exports = transformMat3

/**
 * Transforms the vec2 with a mat3
 * 3rd vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat3} m matrix to transform with
 * @returns {vec2} out
 */
function transformMat3(out, a, m) {
    var x = a[0],
        y = a[1]
    out[0] = m[0] * x + m[3] * y + m[6]
    out[1] = m[1] * x + m[4] * y + m[7]
    return out
}
},{}],46:[function(require,module,exports){
module.exports = transformMat4

/**
 * Transforms the vec2 with a mat4
 * 3rd vector component is implicitly '0'
 * 4th vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec2} out
 */
function transformMat4(out, a, m) {
    var x = a[0], 
        y = a[1]
    out[0] = m[0] * x + m[4] * y + m[12]
    out[1] = m[1] * x + m[5] * y + m[13]
    return out
}
},{}],47:[function(require,module,exports){
module.exports = function(strings) {
  if (typeof strings === 'string') strings = [strings]
  var exprs = [].slice.call(arguments,1)
  var parts = []
  for (var i = 0; i < strings.length-1; i++) {
    parts.push(strings[i], exprs[i] || '')
  }
  parts.push(strings[i])
  return parts.join('')
}

},{}],48:[function(require,module,exports){
/*
 * $Id: combinatorics.js,v 0.25 2013/03/11 15:42:14 dankogai Exp dankogai $
 *
 *  Licensed under the MIT license.
 *  http://www.opensource.org/licenses/mit-license.php
 *
 *  References:
 *    http://www.ruby-doc.org/core-2.0/Array.html#method-i-combination
 *    http://www.ruby-doc.org/core-2.0/Array.html#method-i-permutation
 *    http://en.wikipedia.org/wiki/Factorial_number_system
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.Combinatorics = factory();
    }
}(this, function () {
    'use strict';
    var version = "0.5.2";
    /* combinatory arithmetics */
    var P = function(m, n) {
        var p = 1;
        while (n--) p *= m--;
        return p;
    };
    var C = function(m, n) {
        if (n > m) {
            return 0;
        }
        return P(m, n) / P(n, n);
    };
    var factorial = function(n) {
        return P(n, n);
    };
    var factoradic = function(n, d) {
        var f = 1;
        if (!d) {
            for (d = 1; f < n; f *= ++d);
            if (f > n) f /= d--;
        } else {
            f = factorial(d);
        }
        var result = [0];
        for (; d; f /= d--) {
            result[d] = Math.floor(n / f);
            n %= f;
        }
        return result;
    };
    /* common methods */
    var addProperties = function(dst, src) {
        Object.keys(src).forEach(function(p) {
            Object.defineProperty(dst, p, {
                value: src[p],
                configurable: p == 'next'
            });
        });
    };
    var hideProperty = function(o, p) {
        Object.defineProperty(o, p, {
            writable: true
        });
    };
    var toArray = function(f) {
        var e, result = [];
        this.init();
        while (e = this.next()) result.push(f ? f(e) : e);
        this.init();
        return result;
    };
    var common = {
        toArray: toArray,
        map: toArray,
        forEach: function(f) {
            var e;
            this.init();
            while (e = this.next()) f(e);
            this.init();
        },
        filter: function(f) {
            var e, result = [];
            this.init();
            while (e = this.next()) if (f(e)) result.push(e);
            this.init();
            return result;
        },
        lazyMap: function(f) {
            this._lazyMap = f;
            return this;
        },
        lazyFilter: function(f) {
            Object.defineProperty(this, 'next', {
                writable: true
            });
            if (typeof f !== 'function') {
                this.next = this._next;
            } else {
                if (typeof (this._next) !== 'function') {
                    this._next = this.next;
                }
                var _next = this._next.bind(this);
                this.next = (function() {
                    var e;
                    while (e = _next()) {
                        if (f(e))
                            return e;
                    }
                    return e;
                }).bind(this);
            }
            Object.defineProperty(this, 'next', {
                writable: false
            });
            return this;
        }

    };
    /* power set */
    var power = function(ary, fun) {
        var size = 1 << ary.length,
            sizeOf = function() {
                return size;
            },
            that = Object.create(ary.slice(), {
                length: {
                    get: sizeOf
                }
            });
        hideProperty(that, 'index');
        addProperties(that, {
            valueOf: sizeOf,
            init: function() {
                that.index = 0;
            },
            nth: function(n) {
                if (n >= size) return;
                var i = 0,
                    result = [];
                for (; n; n >>>= 1, i++) if (n & 1) result.push(this[i]);
                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
            },
            next: function() {
                return this.nth(this.index++);
            }
        });
        addProperties(that, common);
        that.init();
        return (typeof (fun) === 'function') ? that.map(fun) : that;
    };
    /* combination */
    var nextIndex = function(n) {
        var smallest = n & -n,
            ripple = n + smallest,
            new_smallest = ripple & -ripple,
            ones = ((new_smallest / smallest) >> 1) - 1;
        return ripple | ones;
    };
    var combination = function(ary, nelem, fun) {
        if (!nelem) nelem = ary.length;
        if (nelem < 1) throw new RangeError;
        if (nelem > ary.length) throw new RangeError;
        var first = (1 << nelem) - 1,
            size = C(ary.length, nelem),
            maxIndex = 1 << ary.length,
            sizeOf = function() {
                return size;
            },
            that = Object.create(ary.slice(), {
                length: {
                    get: sizeOf
                }
            });
        hideProperty(that, 'index');
        addProperties(that, {
            valueOf: sizeOf,
            init: function() {
                this.index = first;
            },
            next: function() {
                if (this.index >= maxIndex) return;
                var i = 0,
                    n = this.index,
                    result = [];
                for (; n; n >>>= 1, i++) {
                    if (n & 1) result[result.length] = this[i];
                }

                this.index = nextIndex(this.index);
                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
            }
        });
        addProperties(that, common);
        that.init();
        return (typeof (fun) === 'function') ? that.map(fun) : that;
    };
    /* bigcombination */
    var bigNextIndex = function(n, nelem) {

        var result = n;
        var j = nelem;
        var i = 0;
        for (i = result.length - 1; i >= 0; i--) {
            if (result[i] == 1) {
                j--;
            } else {
                break;
            }
        } 
        if (j == 0) {
            // Overflow
            result[result.length] = 1;
            for (var k = result.length - 2; k >= 0; k--) {
                result[k] = (k < nelem-1)?1:0;
            }
        } else {
            // Normal

            // first zero after 1
            var i1 = -1;
            var i0 = -1;
            for (var i = 0; i < result.length; i++) {
                if (result[i] == 0 && i1 != -1) {
                    i0 = i;
                }
                if (result[i] == 1) {
                    i1 = i;
                }
                if (i0 != -1 && i1 != -1) {
                    result[i0] = 1;
                    result[i1] = 0;
                    break;
                }
            }

            j = nelem;
            for (var i = result.length - 1; i >= i1; i--) {
                if (result[i] == 1)
                    j--;
            }
            for (var i = 0; i < i1; i++) {
                result[i] = (i < j)?1:0;
            }
        }

        return result;

    };
    var buildFirst = function(nelem) {
        var result = [];
        for (var i = 0; i < nelem; i++) {
            result[i] = 1;
        }
        result[0] = 1;
        return result;
    };
    var bigCombination = function(ary, nelem, fun) {
        if (!nelem) nelem = ary.length;
        if (nelem < 1) throw new RangeError;
        if (nelem > ary.length) throw new RangeError;
        var first = buildFirst(nelem),
            size = C(ary.length, nelem),
            maxIndex = ary.length,
            sizeOf = function() {
                return size;
            },
            that = Object.create(ary.slice(), {
                length: {
                    get: sizeOf
                }
            });
        hideProperty(that, 'index');
        addProperties(that, {
            valueOf: sizeOf,
            init: function() {
                this.index = first.concat();
            },
            next: function() {
                if (this.index.length > maxIndex) return;
                var i = 0,
                    n = this.index,
                    result = [];
                for (var j = 0; j < n.length; j++, i++) {
                    if (n[j])
                        result[result.length] = this[i];
                }
                bigNextIndex(this.index, nelem);
                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
            }
        });
        addProperties(that, common);
        that.init();
        return (typeof (fun) === 'function') ? that.map(fun) : that;
    };
    /* permutation */
    var _permutation = function(ary) {
        var that = ary.slice(),
            size = factorial(that.length);
        that.index = 0;
        that.next = function() {
            if (this.index >= size) return;
            var copy = this.slice(),
                digits = factoradic(this.index, this.length),
                result = [],
                i = this.length - 1;
            for (; i >= 0; --i) result.push(copy.splice(digits[i], 1)[0]);
            this.index++;
            return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
        };
        return that;
    };
    // which is really a permutation of combination
    var permutation = function(ary, nelem, fun) {
        if (!nelem) nelem = ary.length;
        if (nelem < 1) throw new RangeError;
        if (nelem > ary.length) throw new RangeError;
        var size = P(ary.length, nelem),
            sizeOf = function() {
                return size;
            },
            that = Object.create(ary.slice(), {
                length: {
                    get: sizeOf
                }
            });
        hideProperty(that, 'cmb');
        hideProperty(that, 'per');
        addProperties(that, {
            valueOf: function() {
                return size;
            },
            init: function() {
                this.cmb = combination(ary, nelem);
                this.per = _permutation(this.cmb.next());
            },
            next: function() {
                var result = this.per.next();
                if (!result) {
                    var cmb = this.cmb.next();
                    if (!cmb) return;
                    this.per = _permutation(cmb);
                    return this.next();
                }
                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
            }
        });
        addProperties(that, common);
        that.init();
        return (typeof (fun) === 'function') ? that.map(fun) : that;
    };

    var PC = function(m) {
        var total = 0;
        for (var n = 1; n <= m; n++) {
            var p = P(m,n);
            total += p;
        };
        return total;
    };
    // which is really a permutation of combination
    var permutationCombination = function(ary, fun) {
        // if (!nelem) nelem = ary.length;
        // if (nelem < 1) throw new RangeError;
        // if (nelem > ary.length) throw new RangeError;
        var size = PC(ary.length),
            sizeOf = function() {
                return size;
            },
            that = Object.create(ary.slice(), {
                length: {
                    get: sizeOf
                }
            });
        hideProperty(that, 'cmb');
        hideProperty(that, 'per');
        hideProperty(that, 'nelem');
        addProperties(that, {
            valueOf: function() {
                return size;
            },
            init: function() {
                this.nelem = 1;
                // console.log("Starting nelem: " + this.nelem);
                this.cmb = combination(ary, this.nelem);
                this.per = _permutation(this.cmb.next());
            },
            next: function() {
                var result = this.per.next();
                if (!result) {
                    var cmb = this.cmb.next();
                    if (!cmb) {
                        this.nelem++;
                        // console.log("increment nelem: " + this.nelem + " vs " + ary.length);
                        if (this.nelem > ary.length) return;
                        this.cmb = combination(ary, this.nelem);
                        cmb = this.cmb.next();
                        if (!cmb) return;
                    }
                    this.per = _permutation(cmb);
                    return this.next();
                }
                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
            }
        });
        addProperties(that, common);
        that.init();
        return (typeof (fun) === 'function') ? that.map(fun) : that;
    };
    /* Cartesian Product */
    var arraySlice = Array.prototype.slice;
    var cartesianProduct = function() {
        if (!arguments.length) throw new RangeError;
        var args = arraySlice.call(arguments),
            size = args.reduce(function(p, a) {
                return p * a.length;
            }, 1),
            sizeOf = function() {
                return size;
            },
            dim = args.length,
            that = Object.create(args, {
                length: {
                    get: sizeOf
                }
            });
        if (!size) throw new RangeError;
        hideProperty(that, 'index');
        addProperties(that, {
            valueOf: sizeOf,
            dim: dim,
            init: function() {
                this.index = 0;
            },
            get: function() {
                if (arguments.length !== this.length) return;
                var result = [],
                    d = 0;
                for (; d < dim; d++) {
                    var i = arguments[d];
                    if (i >= this[d].length) return;
                    result.push(this[d][i]);
                }
                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
            },
            nth: function(n) {
                var result = [],
                    d = 0;
                for (; d < dim; d++) {
                    var l = this[d].length;
                    var i = n % l;
                    result.push(this[d][i]);
                    n -= i;
                    n /= l;
                }
                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
            },
            next: function() {
                if (this.index >= size) return;
                var result = this.nth(this.index);
                this.index++;
                return result;
            }
        });
        addProperties(that, common);
        that.init();
        return that;
    };
    /* baseN */
    var baseN = function(ary, nelem, fun) {
                if (!nelem) nelem = ary.length;
        if (nelem < 1) throw new RangeError;
        var base = ary.length,
                size = Math.pow(base, nelem);
        var sizeOf = function() {
                return size;
            },
            that = Object.create(ary.slice(), {
                length: {
                    get: sizeOf
                }
            });
        hideProperty(that, 'index');
        addProperties(that, {
            valueOf: sizeOf,
            init: function() {
                that.index = 0;
            },
            nth: function(n) {
                if (n >= size) return;
                var result = [];
                for (var i = 0; i < nelem; i++) {
                    var d = n % base;
                    result.push(ary[d])
                    n -= d; n /= base
                }
                return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
            },
            next: function() {
                return this.nth(this.index++);
            }
        });
        addProperties(that, common);
        that.init();
        return (typeof (fun) === 'function') ? that.map(fun) : that;
    };

    /* export */
    var Combinatorics = Object.create(null);
    addProperties(Combinatorics, {
        C: C,
        P: P,
        factorial: factorial,
        factoradic: factoradic,
        cartesianProduct: cartesianProduct,
        combination: combination,
        bigCombination: bigCombination,
        permutation: permutation,
        permutationCombination: permutationCombination,
        power: power,
        baseN: baseN,
        VERSION: version
    });
    return Combinatorics;
}));

},{}],49:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var DataView = getNative(root, 'DataView');

module.exports = DataView;

},{"./_getNative":112,"./_root":150}],50:[function(require,module,exports){
var hashClear = require('./_hashClear'),
    hashDelete = require('./_hashDelete'),
    hashGet = require('./_hashGet'),
    hashHas = require('./_hashHas'),
    hashSet = require('./_hashSet');

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

module.exports = Hash;

},{"./_hashClear":118,"./_hashDelete":119,"./_hashGet":120,"./_hashHas":121,"./_hashSet":122}],51:[function(require,module,exports){
var listCacheClear = require('./_listCacheClear'),
    listCacheDelete = require('./_listCacheDelete'),
    listCacheGet = require('./_listCacheGet'),
    listCacheHas = require('./_listCacheHas'),
    listCacheSet = require('./_listCacheSet');

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

module.exports = ListCache;

},{"./_listCacheClear":131,"./_listCacheDelete":132,"./_listCacheGet":133,"./_listCacheHas":134,"./_listCacheSet":135}],52:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var Map = getNative(root, 'Map');

module.exports = Map;

},{"./_getNative":112,"./_root":150}],53:[function(require,module,exports){
var mapCacheClear = require('./_mapCacheClear'),
    mapCacheDelete = require('./_mapCacheDelete'),
    mapCacheGet = require('./_mapCacheGet'),
    mapCacheHas = require('./_mapCacheHas'),
    mapCacheSet = require('./_mapCacheSet');

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

module.exports = MapCache;

},{"./_mapCacheClear":136,"./_mapCacheDelete":137,"./_mapCacheGet":138,"./_mapCacheHas":139,"./_mapCacheSet":140}],54:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var Promise = getNative(root, 'Promise');

module.exports = Promise;

},{"./_getNative":112,"./_root":150}],55:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var Set = getNative(root, 'Set');

module.exports = Set;

},{"./_getNative":112,"./_root":150}],56:[function(require,module,exports){
var MapCache = require('./_MapCache'),
    setCacheAdd = require('./_setCacheAdd'),
    setCacheHas = require('./_setCacheHas');

/**
 *
 * Creates an array cache object to store unique values.
 *
 * @private
 * @constructor
 * @param {Array} [values] The values to cache.
 */
function SetCache(values) {
  var index = -1,
      length = values == null ? 0 : values.length;

  this.__data__ = new MapCache;
  while (++index < length) {
    this.add(values[index]);
  }
}

// Add methods to `SetCache`.
SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
SetCache.prototype.has = setCacheHas;

module.exports = SetCache;

},{"./_MapCache":53,"./_setCacheAdd":151,"./_setCacheHas":152}],57:[function(require,module,exports){
var ListCache = require('./_ListCache'),
    stackClear = require('./_stackClear'),
    stackDelete = require('./_stackDelete'),
    stackGet = require('./_stackGet'),
    stackHas = require('./_stackHas'),
    stackSet = require('./_stackSet');

/**
 * Creates a stack cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Stack(entries) {
  var data = this.__data__ = new ListCache(entries);
  this.size = data.size;
}

// Add methods to `Stack`.
Stack.prototype.clear = stackClear;
Stack.prototype['delete'] = stackDelete;
Stack.prototype.get = stackGet;
Stack.prototype.has = stackHas;
Stack.prototype.set = stackSet;

module.exports = Stack;

},{"./_ListCache":51,"./_stackClear":156,"./_stackDelete":157,"./_stackGet":158,"./_stackHas":159,"./_stackSet":160}],58:[function(require,module,exports){
var root = require('./_root');

/** Built-in value references. */
var Symbol = root.Symbol;

module.exports = Symbol;

},{"./_root":150}],59:[function(require,module,exports){
var root = require('./_root');

/** Built-in value references. */
var Uint8Array = root.Uint8Array;

module.exports = Uint8Array;

},{"./_root":150}],60:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var WeakMap = getNative(root, 'WeakMap');

module.exports = WeakMap;

},{"./_getNative":112,"./_root":150}],61:[function(require,module,exports){
/**
 * A faster alternative to `Function#apply`, this function invokes `func`
 * with the `this` binding of `thisArg` and the arguments of `args`.
 *
 * @private
 * @param {Function} func The function to invoke.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} args The arguments to invoke `func` with.
 * @returns {*} Returns the result of `func`.
 */
function apply(func, thisArg, args) {
  switch (args.length) {
    case 0: return func.call(thisArg);
    case 1: return func.call(thisArg, args[0]);
    case 2: return func.call(thisArg, args[0], args[1]);
    case 3: return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}

module.exports = apply;

},{}],62:[function(require,module,exports){
/**
 * A specialized version of `_.filter` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 */
function arrayFilter(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length,
      resIndex = 0,
      result = [];

  while (++index < length) {
    var value = array[index];
    if (predicate(value, index, array)) {
      result[resIndex++] = value;
    }
  }
  return result;
}

module.exports = arrayFilter;

},{}],63:[function(require,module,exports){
var baseTimes = require('./_baseTimes'),
    isArguments = require('./isArguments'),
    isArray = require('./isArray'),
    isBuffer = require('./isBuffer'),
    isIndex = require('./_isIndex'),
    isTypedArray = require('./isTypedArray');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = isArray(value),
      isArg = !isArr && isArguments(value),
      isBuff = !isArr && !isArg && isBuffer(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || hasOwnProperty.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = arrayLikeKeys;

},{"./_baseTimes":94,"./_isIndex":124,"./isArguments":169,"./isArray":170,"./isBuffer":172,"./isTypedArray":178}],64:[function(require,module,exports){
/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

module.exports = arrayMap;

},{}],65:[function(require,module,exports){
/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

module.exports = arrayPush;

},{}],66:[function(require,module,exports){
/**
 * A specialized version of `_.some` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if any element passes the predicate check,
 *  else `false`.
 */
function arraySome(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (predicate(array[index], index, array)) {
      return true;
    }
  }
  return false;
}

module.exports = arraySome;

},{}],67:[function(require,module,exports){
var eq = require('./eq');

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

module.exports = assocIndexOf;

},{"./eq":165}],68:[function(require,module,exports){
var baseForOwn = require('./_baseForOwn'),
    createBaseEach = require('./_createBaseEach');

/**
 * The base implementation of `_.forEach` without support for iteratee shorthands.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array|Object} Returns `collection`.
 */
var baseEach = createBaseEach(baseForOwn);

module.exports = baseEach;

},{"./_baseForOwn":71,"./_createBaseEach":102}],69:[function(require,module,exports){
var arrayPush = require('./_arrayPush'),
    isFlattenable = require('./_isFlattenable');

/**
 * The base implementation of `_.flatten` with support for restricting flattening.
 *
 * @private
 * @param {Array} array The array to flatten.
 * @param {number} depth The maximum recursion depth.
 * @param {boolean} [predicate=isFlattenable] The function invoked per iteration.
 * @param {boolean} [isStrict] Restrict to values that pass `predicate` checks.
 * @param {Array} [result=[]] The initial result value.
 * @returns {Array} Returns the new flattened array.
 */
function baseFlatten(array, depth, predicate, isStrict, result) {
  var index = -1,
      length = array.length;

  predicate || (predicate = isFlattenable);
  result || (result = []);

  while (++index < length) {
    var value = array[index];
    if (depth > 0 && predicate(value)) {
      if (depth > 1) {
        // Recursively flatten arrays (susceptible to call stack limits).
        baseFlatten(value, depth - 1, predicate, isStrict, result);
      } else {
        arrayPush(result, value);
      }
    } else if (!isStrict) {
      result[result.length] = value;
    }
  }
  return result;
}

module.exports = baseFlatten;

},{"./_arrayPush":65,"./_isFlattenable":123}],70:[function(require,module,exports){
var createBaseFor = require('./_createBaseFor');

/**
 * The base implementation of `baseForOwn` which iterates over `object`
 * properties returned by `keysFunc` and invokes `iteratee` for each property.
 * Iteratee functions may exit iteration early by explicitly returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

module.exports = baseFor;

},{"./_createBaseFor":103}],71:[function(require,module,exports){
var baseFor = require('./_baseFor'),
    keys = require('./keys');

/**
 * The base implementation of `_.forOwn` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return object && baseFor(object, iteratee, keys);
}

module.exports = baseForOwn;

},{"./_baseFor":70,"./keys":179}],72:[function(require,module,exports){
var castPath = require('./_castPath'),
    toKey = require('./_toKey');

/**
 * The base implementation of `_.get` without support for default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path) {
  path = castPath(path, object);

  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[toKey(path[index++])];
  }
  return (index && index == length) ? object : undefined;
}

module.exports = baseGet;

},{"./_castPath":98,"./_toKey":162}],73:[function(require,module,exports){
var arrayPush = require('./_arrayPush'),
    isArray = require('./isArray');

/**
 * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
 * `keysFunc` and `symbolsFunc` to get the enumerable property names and
 * symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @param {Function} symbolsFunc The function to get the symbols of `object`.
 * @returns {Array} Returns the array of property names and symbols.
 */
function baseGetAllKeys(object, keysFunc, symbolsFunc) {
  var result = keysFunc(object);
  return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
}

module.exports = baseGetAllKeys;

},{"./_arrayPush":65,"./isArray":170}],74:[function(require,module,exports){
var Symbol = require('./_Symbol'),
    getRawTag = require('./_getRawTag'),
    objectToString = require('./_objectToString');

/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

module.exports = baseGetTag;

},{"./_Symbol":58,"./_getRawTag":113,"./_objectToString":147}],75:[function(require,module,exports){
/**
 * The base implementation of `_.hasIn` without support for deep paths.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {Array|string} key The key to check.
 * @returns {boolean} Returns `true` if `key` exists, else `false`.
 */
function baseHasIn(object, key) {
  return object != null && key in Object(object);
}

module.exports = baseHasIn;

},{}],76:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]';

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag;
}

module.exports = baseIsArguments;

},{"./_baseGetTag":74,"./isObjectLike":176}],77:[function(require,module,exports){
var baseIsEqualDeep = require('./_baseIsEqualDeep'),
    isObjectLike = require('./isObjectLike');

/**
 * The base implementation of `_.isEqual` which supports partial comparisons
 * and tracks traversed objects.
 *
 * @private
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @param {boolean} bitmask The bitmask flags.
 *  1 - Unordered comparison
 *  2 - Partial comparison
 * @param {Function} [customizer] The function to customize comparisons.
 * @param {Object} [stack] Tracks traversed `value` and `other` objects.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 */
function baseIsEqual(value, other, bitmask, customizer, stack) {
  if (value === other) {
    return true;
  }
  if (value == null || other == null || (!isObjectLike(value) && !isObjectLike(other))) {
    return value !== value && other !== other;
  }
  return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
}

module.exports = baseIsEqual;

},{"./_baseIsEqualDeep":78,"./isObjectLike":176}],78:[function(require,module,exports){
var Stack = require('./_Stack'),
    equalArrays = require('./_equalArrays'),
    equalByTag = require('./_equalByTag'),
    equalObjects = require('./_equalObjects'),
    getTag = require('./_getTag'),
    isArray = require('./isArray'),
    isBuffer = require('./isBuffer'),
    isTypedArray = require('./isTypedArray');

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    objectTag = '[object Object]';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A specialized version of `baseIsEqual` for arrays and objects which performs
 * deep comparisons and tracks traversed objects enabling objects with circular
 * references to be compared.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} [stack] Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
  var objIsArr = isArray(object),
      othIsArr = isArray(other),
      objTag = objIsArr ? arrayTag : getTag(object),
      othTag = othIsArr ? arrayTag : getTag(other);

  objTag = objTag == argsTag ? objectTag : objTag;
  othTag = othTag == argsTag ? objectTag : othTag;

  var objIsObj = objTag == objectTag,
      othIsObj = othTag == objectTag,
      isSameTag = objTag == othTag;

  if (isSameTag && isBuffer(object)) {
    if (!isBuffer(other)) {
      return false;
    }
    objIsArr = true;
    objIsObj = false;
  }
  if (isSameTag && !objIsObj) {
    stack || (stack = new Stack);
    return (objIsArr || isTypedArray(object))
      ? equalArrays(object, other, bitmask, customizer, equalFunc, stack)
      : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
  }
  if (!(bitmask & COMPARE_PARTIAL_FLAG)) {
    var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
        othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

    if (objIsWrapped || othIsWrapped) {
      var objUnwrapped = objIsWrapped ? object.value() : object,
          othUnwrapped = othIsWrapped ? other.value() : other;

      stack || (stack = new Stack);
      return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
    }
  }
  if (!isSameTag) {
    return false;
  }
  stack || (stack = new Stack);
  return equalObjects(object, other, bitmask, customizer, equalFunc, stack);
}

module.exports = baseIsEqualDeep;

},{"./_Stack":57,"./_equalArrays":105,"./_equalByTag":106,"./_equalObjects":107,"./_getTag":115,"./isArray":170,"./isBuffer":172,"./isTypedArray":178}],79:[function(require,module,exports){
var Stack = require('./_Stack'),
    baseIsEqual = require('./_baseIsEqual');

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

/**
 * The base implementation of `_.isMatch` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The object to inspect.
 * @param {Object} source The object of property values to match.
 * @param {Array} matchData The property names, values, and compare flags to match.
 * @param {Function} [customizer] The function to customize comparisons.
 * @returns {boolean} Returns `true` if `object` is a match, else `false`.
 */
function baseIsMatch(object, source, matchData, customizer) {
  var index = matchData.length,
      length = index,
      noCustomizer = !customizer;

  if (object == null) {
    return !length;
  }
  object = Object(object);
  while (index--) {
    var data = matchData[index];
    if ((noCustomizer && data[2])
          ? data[1] !== object[data[0]]
          : !(data[0] in object)
        ) {
      return false;
    }
  }
  while (++index < length) {
    data = matchData[index];
    var key = data[0],
        objValue = object[key],
        srcValue = data[1];

    if (noCustomizer && data[2]) {
      if (objValue === undefined && !(key in object)) {
        return false;
      }
    } else {
      var stack = new Stack;
      if (customizer) {
        var result = customizer(objValue, srcValue, key, object, source, stack);
      }
      if (!(result === undefined
            ? baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG, customizer, stack)
            : result
          )) {
        return false;
      }
    }
  }
  return true;
}

module.exports = baseIsMatch;

},{"./_Stack":57,"./_baseIsEqual":77}],80:[function(require,module,exports){
var isFunction = require('./isFunction'),
    isMasked = require('./_isMasked'),
    isObject = require('./isObject'),
    toSource = require('./_toSource');

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

module.exports = baseIsNative;

},{"./_isMasked":128,"./_toSource":163,"./isFunction":173,"./isObject":175}],81:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isLength = require('./isLength'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
typedArrayTags[errorTag] = typedArrayTags[funcTag] =
typedArrayTags[mapTag] = typedArrayTags[numberTag] =
typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
typedArrayTags[setTag] = typedArrayTags[stringTag] =
typedArrayTags[weakMapTag] = false;

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike(value) &&
    isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
}

module.exports = baseIsTypedArray;

},{"./_baseGetTag":74,"./isLength":174,"./isObjectLike":176}],82:[function(require,module,exports){
var baseMatches = require('./_baseMatches'),
    baseMatchesProperty = require('./_baseMatchesProperty'),
    identity = require('./identity'),
    isArray = require('./isArray'),
    property = require('./property');

/**
 * The base implementation of `_.iteratee`.
 *
 * @private
 * @param {*} [value=_.identity] The value to convert to an iteratee.
 * @returns {Function} Returns the iteratee.
 */
function baseIteratee(value) {
  // Don't store the `typeof` result in a variable to avoid a JIT bug in Safari 9.
  // See https://bugs.webkit.org/show_bug.cgi?id=156034 for more details.
  if (typeof value == 'function') {
    return value;
  }
  if (value == null) {
    return identity;
  }
  if (typeof value == 'object') {
    return isArray(value)
      ? baseMatchesProperty(value[0], value[1])
      : baseMatches(value);
  }
  return property(value);
}

module.exports = baseIteratee;

},{"./_baseMatches":85,"./_baseMatchesProperty":86,"./identity":168,"./isArray":170,"./property":181}],83:[function(require,module,exports){
var isPrototype = require('./_isPrototype'),
    nativeKeys = require('./_nativeKeys');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeys(object) {
  if (!isPrototype(object)) {
    return nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}

module.exports = baseKeys;

},{"./_isPrototype":129,"./_nativeKeys":145}],84:[function(require,module,exports){
var baseEach = require('./_baseEach'),
    isArrayLike = require('./isArrayLike');

/**
 * The base implementation of `_.map` without support for iteratee shorthands.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function baseMap(collection, iteratee) {
  var index = -1,
      result = isArrayLike(collection) ? Array(collection.length) : [];

  baseEach(collection, function(value, key, collection) {
    result[++index] = iteratee(value, key, collection);
  });
  return result;
}

module.exports = baseMap;

},{"./_baseEach":68,"./isArrayLike":171}],85:[function(require,module,exports){
var baseIsMatch = require('./_baseIsMatch'),
    getMatchData = require('./_getMatchData'),
    matchesStrictComparable = require('./_matchesStrictComparable');

/**
 * The base implementation of `_.matches` which doesn't clone `source`.
 *
 * @private
 * @param {Object} source The object of property values to match.
 * @returns {Function} Returns the new spec function.
 */
function baseMatches(source) {
  var matchData = getMatchData(source);
  if (matchData.length == 1 && matchData[0][2]) {
    return matchesStrictComparable(matchData[0][0], matchData[0][1]);
  }
  return function(object) {
    return object === source || baseIsMatch(object, source, matchData);
  };
}

module.exports = baseMatches;

},{"./_baseIsMatch":79,"./_getMatchData":111,"./_matchesStrictComparable":142}],86:[function(require,module,exports){
var baseIsEqual = require('./_baseIsEqual'),
    get = require('./get'),
    hasIn = require('./hasIn'),
    isKey = require('./_isKey'),
    isStrictComparable = require('./_isStrictComparable'),
    matchesStrictComparable = require('./_matchesStrictComparable'),
    toKey = require('./_toKey');

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

/**
 * The base implementation of `_.matchesProperty` which doesn't clone `srcValue`.
 *
 * @private
 * @param {string} path The path of the property to get.
 * @param {*} srcValue The value to match.
 * @returns {Function} Returns the new spec function.
 */
function baseMatchesProperty(path, srcValue) {
  if (isKey(path) && isStrictComparable(srcValue)) {
    return matchesStrictComparable(toKey(path), srcValue);
  }
  return function(object) {
    var objValue = get(object, path);
    return (objValue === undefined && objValue === srcValue)
      ? hasIn(object, path)
      : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
  };
}

module.exports = baseMatchesProperty;

},{"./_baseIsEqual":77,"./_isKey":126,"./_isStrictComparable":130,"./_matchesStrictComparable":142,"./_toKey":162,"./get":166,"./hasIn":167}],87:[function(require,module,exports){
var arrayMap = require('./_arrayMap'),
    baseIteratee = require('./_baseIteratee'),
    baseMap = require('./_baseMap'),
    baseSortBy = require('./_baseSortBy'),
    baseUnary = require('./_baseUnary'),
    compareMultiple = require('./_compareMultiple'),
    identity = require('./identity');

/**
 * The base implementation of `_.orderBy` without param guards.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function[]|Object[]|string[]} iteratees The iteratees to sort by.
 * @param {string[]} orders The sort orders of `iteratees`.
 * @returns {Array} Returns the new sorted array.
 */
function baseOrderBy(collection, iteratees, orders) {
  var index = -1;
  iteratees = arrayMap(iteratees.length ? iteratees : [identity], baseUnary(baseIteratee));

  var result = baseMap(collection, function(value, key, collection) {
    var criteria = arrayMap(iteratees, function(iteratee) {
      return iteratee(value);
    });
    return { 'criteria': criteria, 'index': ++index, 'value': value };
  });

  return baseSortBy(result, function(object, other) {
    return compareMultiple(object, other, orders);
  });
}

module.exports = baseOrderBy;

},{"./_arrayMap":64,"./_baseIteratee":82,"./_baseMap":84,"./_baseSortBy":93,"./_baseUnary":96,"./_compareMultiple":100,"./identity":168}],88:[function(require,module,exports){
/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

module.exports = baseProperty;

},{}],89:[function(require,module,exports){
var baseGet = require('./_baseGet');

/**
 * A specialized version of `baseProperty` which supports deep paths.
 *
 * @private
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new accessor function.
 */
function basePropertyDeep(path) {
  return function(object) {
    return baseGet(object, path);
  };
}

module.exports = basePropertyDeep;

},{"./_baseGet":72}],90:[function(require,module,exports){
/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeFloor = Math.floor,
    nativeRandom = Math.random;

/**
 * The base implementation of `_.random` without support for returning
 * floating-point numbers.
 *
 * @private
 * @param {number} lower The lower bound.
 * @param {number} upper The upper bound.
 * @returns {number} Returns the random number.
 */
function baseRandom(lower, upper) {
  return lower + nativeFloor(nativeRandom() * (upper - lower + 1));
}

module.exports = baseRandom;

},{}],91:[function(require,module,exports){
var identity = require('./identity'),
    overRest = require('./_overRest'),
    setToString = require('./_setToString');

/**
 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 */
function baseRest(func, start) {
  return setToString(overRest(func, start, identity), func + '');
}

module.exports = baseRest;

},{"./_overRest":149,"./_setToString":154,"./identity":168}],92:[function(require,module,exports){
var constant = require('./constant'),
    defineProperty = require('./_defineProperty'),
    identity = require('./identity');

/**
 * The base implementation of `setToString` without support for hot loop shorting.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var baseSetToString = !defineProperty ? identity : function(func, string) {
  return defineProperty(func, 'toString', {
    'configurable': true,
    'enumerable': false,
    'value': constant(string),
    'writable': true
  });
};

module.exports = baseSetToString;

},{"./_defineProperty":104,"./constant":164,"./identity":168}],93:[function(require,module,exports){
/**
 * The base implementation of `_.sortBy` which uses `comparer` to define the
 * sort order of `array` and replaces criteria objects with their corresponding
 * values.
 *
 * @private
 * @param {Array} array The array to sort.
 * @param {Function} comparer The function to define sort order.
 * @returns {Array} Returns `array`.
 */
function baseSortBy(array, comparer) {
  var length = array.length;

  array.sort(comparer);
  while (length--) {
    array[length] = array[length].value;
  }
  return array;
}

module.exports = baseSortBy;

},{}],94:[function(require,module,exports){
/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

module.exports = baseTimes;

},{}],95:[function(require,module,exports){
var Symbol = require('./_Symbol'),
    arrayMap = require('./_arrayMap'),
    isArray = require('./isArray'),
    isSymbol = require('./isSymbol');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isArray(value)) {
    // Recursively convert values (susceptible to call stack limits).
    return arrayMap(value, baseToString) + '';
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

module.exports = baseToString;

},{"./_Symbol":58,"./_arrayMap":64,"./isArray":170,"./isSymbol":177}],96:[function(require,module,exports){
/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

module.exports = baseUnary;

},{}],97:[function(require,module,exports){
/**
 * Checks if a `cache` value for `key` exists.
 *
 * @private
 * @param {Object} cache The cache to query.
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function cacheHas(cache, key) {
  return cache.has(key);
}

module.exports = cacheHas;

},{}],98:[function(require,module,exports){
var isArray = require('./isArray'),
    isKey = require('./_isKey'),
    stringToPath = require('./_stringToPath'),
    toString = require('./toString');

/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @param {Object} [object] The object to query keys on.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value, object) {
  if (isArray(value)) {
    return value;
  }
  return isKey(value, object) ? [value] : stringToPath(toString(value));
}

module.exports = castPath;

},{"./_isKey":126,"./_stringToPath":161,"./isArray":170,"./toString":188}],99:[function(require,module,exports){
var isSymbol = require('./isSymbol');

/**
 * Compares values to sort them in ascending order.
 *
 * @private
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {number} Returns the sort order indicator for `value`.
 */
function compareAscending(value, other) {
  if (value !== other) {
    var valIsDefined = value !== undefined,
        valIsNull = value === null,
        valIsReflexive = value === value,
        valIsSymbol = isSymbol(value);

    var othIsDefined = other !== undefined,
        othIsNull = other === null,
        othIsReflexive = other === other,
        othIsSymbol = isSymbol(other);

    if ((!othIsNull && !othIsSymbol && !valIsSymbol && value > other) ||
        (valIsSymbol && othIsDefined && othIsReflexive && !othIsNull && !othIsSymbol) ||
        (valIsNull && othIsDefined && othIsReflexive) ||
        (!valIsDefined && othIsReflexive) ||
        !valIsReflexive) {
      return 1;
    }
    if ((!valIsNull && !valIsSymbol && !othIsSymbol && value < other) ||
        (othIsSymbol && valIsDefined && valIsReflexive && !valIsNull && !valIsSymbol) ||
        (othIsNull && valIsDefined && valIsReflexive) ||
        (!othIsDefined && valIsReflexive) ||
        !othIsReflexive) {
      return -1;
    }
  }
  return 0;
}

module.exports = compareAscending;

},{"./isSymbol":177}],100:[function(require,module,exports){
var compareAscending = require('./_compareAscending');

/**
 * Used by `_.orderBy` to compare multiple properties of a value to another
 * and stable sort them.
 *
 * If `orders` is unspecified, all values are sorted in ascending order. Otherwise,
 * specify an order of "desc" for descending or "asc" for ascending sort order
 * of corresponding values.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {boolean[]|string[]} orders The order to sort by for each property.
 * @returns {number} Returns the sort order indicator for `object`.
 */
function compareMultiple(object, other, orders) {
  var index = -1,
      objCriteria = object.criteria,
      othCriteria = other.criteria,
      length = objCriteria.length,
      ordersLength = orders.length;

  while (++index < length) {
    var result = compareAscending(objCriteria[index], othCriteria[index]);
    if (result) {
      if (index >= ordersLength) {
        return result;
      }
      var order = orders[index];
      return result * (order == 'desc' ? -1 : 1);
    }
  }
  // Fixes an `Array#sort` bug in the JS engine embedded in Adobe applications
  // that causes it, under certain circumstances, to provide the same value for
  // `object` and `other`. See https://github.com/jashkenas/underscore/pull/1247
  // for more details.
  //
  // This also ensures a stable sort in V8 and other engines.
  // See https://bugs.chromium.org/p/v8/issues/detail?id=90 for more details.
  return object.index - other.index;
}

module.exports = compareMultiple;

},{"./_compareAscending":99}],101:[function(require,module,exports){
var root = require('./_root');

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

module.exports = coreJsData;

},{"./_root":150}],102:[function(require,module,exports){
var isArrayLike = require('./isArrayLike');

/**
 * Creates a `baseEach` or `baseEachRight` function.
 *
 * @private
 * @param {Function} eachFunc The function to iterate over a collection.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseEach(eachFunc, fromRight) {
  return function(collection, iteratee) {
    if (collection == null) {
      return collection;
    }
    if (!isArrayLike(collection)) {
      return eachFunc(collection, iteratee);
    }
    var length = collection.length,
        index = fromRight ? length : -1,
        iterable = Object(collection);

    while ((fromRight ? index-- : ++index < length)) {
      if (iteratee(iterable[index], index, iterable) === false) {
        break;
      }
    }
    return collection;
  };
}

module.exports = createBaseEach;

},{"./isArrayLike":171}],103:[function(require,module,exports){
/**
 * Creates a base function for methods like `_.forIn` and `_.forOwn`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1,
        iterable = Object(object),
        props = keysFunc(object),
        length = props.length;

    while (length--) {
      var key = props[fromRight ? length : ++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

module.exports = createBaseFor;

},{}],104:[function(require,module,exports){
var getNative = require('./_getNative');

var defineProperty = (function() {
  try {
    var func = getNative(Object, 'defineProperty');
    func({}, '', {});
    return func;
  } catch (e) {}
}());

module.exports = defineProperty;

},{"./_getNative":112}],105:[function(require,module,exports){
var SetCache = require('./_SetCache'),
    arraySome = require('./_arraySome'),
    cacheHas = require('./_cacheHas');

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

/**
 * A specialized version of `baseIsEqualDeep` for arrays with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Array} array The array to compare.
 * @param {Array} other The other array to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `array` and `other` objects.
 * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
 */
function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG,
      arrLength = array.length,
      othLength = other.length;

  if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
    return false;
  }
  // Assume cyclic values are equal.
  var stacked = stack.get(array);
  if (stacked && stack.get(other)) {
    return stacked == other;
  }
  var index = -1,
      result = true,
      seen = (bitmask & COMPARE_UNORDERED_FLAG) ? new SetCache : undefined;

  stack.set(array, other);
  stack.set(other, array);

  // Ignore non-index properties.
  while (++index < arrLength) {
    var arrValue = array[index],
        othValue = other[index];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, arrValue, index, other, array, stack)
        : customizer(arrValue, othValue, index, array, other, stack);
    }
    if (compared !== undefined) {
      if (compared) {
        continue;
      }
      result = false;
      break;
    }
    // Recursively compare arrays (susceptible to call stack limits).
    if (seen) {
      if (!arraySome(other, function(othValue, othIndex) {
            if (!cacheHas(seen, othIndex) &&
                (arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
              return seen.push(othIndex);
            }
          })) {
        result = false;
        break;
      }
    } else if (!(
          arrValue === othValue ||
            equalFunc(arrValue, othValue, bitmask, customizer, stack)
        )) {
      result = false;
      break;
    }
  }
  stack['delete'](array);
  stack['delete'](other);
  return result;
}

module.exports = equalArrays;

},{"./_SetCache":56,"./_arraySome":66,"./_cacheHas":97}],106:[function(require,module,exports){
var Symbol = require('./_Symbol'),
    Uint8Array = require('./_Uint8Array'),
    eq = require('./eq'),
    equalArrays = require('./_equalArrays'),
    mapToArray = require('./_mapToArray'),
    setToArray = require('./_setToArray');

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

/** `Object#toString` result references. */
var boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    symbolTag = '[object Symbol]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]';

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;

/**
 * A specialized version of `baseIsEqualDeep` for comparing objects of
 * the same `toStringTag`.
 *
 * **Note:** This function only supports comparing values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {string} tag The `toStringTag` of the objects to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
  switch (tag) {
    case dataViewTag:
      if ((object.byteLength != other.byteLength) ||
          (object.byteOffset != other.byteOffset)) {
        return false;
      }
      object = object.buffer;
      other = other.buffer;

    case arrayBufferTag:
      if ((object.byteLength != other.byteLength) ||
          !equalFunc(new Uint8Array(object), new Uint8Array(other))) {
        return false;
      }
      return true;

    case boolTag:
    case dateTag:
    case numberTag:
      // Coerce booleans to `1` or `0` and dates to milliseconds.
      // Invalid dates are coerced to `NaN`.
      return eq(+object, +other);

    case errorTag:
      return object.name == other.name && object.message == other.message;

    case regexpTag:
    case stringTag:
      // Coerce regexes to strings and treat strings, primitives and objects,
      // as equal. See http://www.ecma-international.org/ecma-262/7.0/#sec-regexp.prototype.tostring
      // for more details.
      return object == (other + '');

    case mapTag:
      var convert = mapToArray;

    case setTag:
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG;
      convert || (convert = setToArray);

      if (object.size != other.size && !isPartial) {
        return false;
      }
      // Assume cyclic values are equal.
      var stacked = stack.get(object);
      if (stacked) {
        return stacked == other;
      }
      bitmask |= COMPARE_UNORDERED_FLAG;

      // Recursively compare objects (susceptible to call stack limits).
      stack.set(object, other);
      var result = equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
      stack['delete'](object);
      return result;

    case symbolTag:
      if (symbolValueOf) {
        return symbolValueOf.call(object) == symbolValueOf.call(other);
      }
  }
  return false;
}

module.exports = equalByTag;

},{"./_Symbol":58,"./_Uint8Array":59,"./_equalArrays":105,"./_mapToArray":141,"./_setToArray":153,"./eq":165}],107:[function(require,module,exports){
var getAllKeys = require('./_getAllKeys');

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1;

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A specialized version of `baseIsEqualDeep` for objects with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG,
      objProps = getAllKeys(object),
      objLength = objProps.length,
      othProps = getAllKeys(other),
      othLength = othProps.length;

  if (objLength != othLength && !isPartial) {
    return false;
  }
  var index = objLength;
  while (index--) {
    var key = objProps[index];
    if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
      return false;
    }
  }
  // Assume cyclic values are equal.
  var stacked = stack.get(object);
  if (stacked && stack.get(other)) {
    return stacked == other;
  }
  var result = true;
  stack.set(object, other);
  stack.set(other, object);

  var skipCtor = isPartial;
  while (++index < objLength) {
    key = objProps[index];
    var objValue = object[key],
        othValue = other[key];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, objValue, key, other, object, stack)
        : customizer(objValue, othValue, key, object, other, stack);
    }
    // Recursively compare objects (susceptible to call stack limits).
    if (!(compared === undefined
          ? (objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack))
          : compared
        )) {
      result = false;
      break;
    }
    skipCtor || (skipCtor = key == 'constructor');
  }
  if (result && !skipCtor) {
    var objCtor = object.constructor,
        othCtor = other.constructor;

    // Non `Object` object instances with different constructors are not equal.
    if (objCtor != othCtor &&
        ('constructor' in object && 'constructor' in other) &&
        !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
          typeof othCtor == 'function' && othCtor instanceof othCtor)) {
      result = false;
    }
  }
  stack['delete'](object);
  stack['delete'](other);
  return result;
}

module.exports = equalObjects;

},{"./_getAllKeys":109}],108:[function(require,module,exports){
(function (global){
/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

module.exports = freeGlobal;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],109:[function(require,module,exports){
var baseGetAllKeys = require('./_baseGetAllKeys'),
    getSymbols = require('./_getSymbols'),
    keys = require('./keys');

/**
 * Creates an array of own enumerable property names and symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names and symbols.
 */
function getAllKeys(object) {
  return baseGetAllKeys(object, keys, getSymbols);
}

module.exports = getAllKeys;

},{"./_baseGetAllKeys":73,"./_getSymbols":114,"./keys":179}],110:[function(require,module,exports){
var isKeyable = require('./_isKeyable');

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

module.exports = getMapData;

},{"./_isKeyable":127}],111:[function(require,module,exports){
var isStrictComparable = require('./_isStrictComparable'),
    keys = require('./keys');

/**
 * Gets the property names, values, and compare flags of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the match data of `object`.
 */
function getMatchData(object) {
  var result = keys(object),
      length = result.length;

  while (length--) {
    var key = result[length],
        value = object[key];

    result[length] = [key, value, isStrictComparable(value)];
  }
  return result;
}

module.exports = getMatchData;

},{"./_isStrictComparable":130,"./keys":179}],112:[function(require,module,exports){
var baseIsNative = require('./_baseIsNative'),
    getValue = require('./_getValue');

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

module.exports = getNative;

},{"./_baseIsNative":80,"./_getValue":116}],113:[function(require,module,exports){
var Symbol = require('./_Symbol');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}

module.exports = getRawTag;

},{"./_Symbol":58}],114:[function(require,module,exports){
var arrayFilter = require('./_arrayFilter'),
    stubArray = require('./stubArray');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Built-in value references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeGetSymbols = Object.getOwnPropertySymbols;

/**
 * Creates an array of the own enumerable symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of symbols.
 */
var getSymbols = !nativeGetSymbols ? stubArray : function(object) {
  if (object == null) {
    return [];
  }
  object = Object(object);
  return arrayFilter(nativeGetSymbols(object), function(symbol) {
    return propertyIsEnumerable.call(object, symbol);
  });
};

module.exports = getSymbols;

},{"./_arrayFilter":62,"./stubArray":184}],115:[function(require,module,exports){
var DataView = require('./_DataView'),
    Map = require('./_Map'),
    Promise = require('./_Promise'),
    Set = require('./_Set'),
    WeakMap = require('./_WeakMap'),
    baseGetTag = require('./_baseGetTag'),
    toSource = require('./_toSource');

/** `Object#toString` result references. */
var mapTag = '[object Map]',
    objectTag = '[object Object]',
    promiseTag = '[object Promise]',
    setTag = '[object Set]',
    weakMapTag = '[object WeakMap]';

var dataViewTag = '[object DataView]';

/** Used to detect maps, sets, and weakmaps. */
var dataViewCtorString = toSource(DataView),
    mapCtorString = toSource(Map),
    promiseCtorString = toSource(Promise),
    setCtorString = toSource(Set),
    weakMapCtorString = toSource(WeakMap);

/**
 * Gets the `toStringTag` of `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
var getTag = baseGetTag;

// Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
if ((DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag) ||
    (Map && getTag(new Map) != mapTag) ||
    (Promise && getTag(Promise.resolve()) != promiseTag) ||
    (Set && getTag(new Set) != setTag) ||
    (WeakMap && getTag(new WeakMap) != weakMapTag)) {
  getTag = function(value) {
    var result = baseGetTag(value),
        Ctor = result == objectTag ? value.constructor : undefined,
        ctorString = Ctor ? toSource(Ctor) : '';

    if (ctorString) {
      switch (ctorString) {
        case dataViewCtorString: return dataViewTag;
        case mapCtorString: return mapTag;
        case promiseCtorString: return promiseTag;
        case setCtorString: return setTag;
        case weakMapCtorString: return weakMapTag;
      }
    }
    return result;
  };
}

module.exports = getTag;

},{"./_DataView":49,"./_Map":52,"./_Promise":54,"./_Set":55,"./_WeakMap":60,"./_baseGetTag":74,"./_toSource":163}],116:[function(require,module,exports){
/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

module.exports = getValue;

},{}],117:[function(require,module,exports){
var castPath = require('./_castPath'),
    isArguments = require('./isArguments'),
    isArray = require('./isArray'),
    isIndex = require('./_isIndex'),
    isLength = require('./isLength'),
    toKey = require('./_toKey');

/**
 * Checks if `path` exists on `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path to check.
 * @param {Function} hasFunc The function to check properties.
 * @returns {boolean} Returns `true` if `path` exists, else `false`.
 */
function hasPath(object, path, hasFunc) {
  path = castPath(path, object);

  var index = -1,
      length = path.length,
      result = false;

  while (++index < length) {
    var key = toKey(path[index]);
    if (!(result = object != null && hasFunc(object, key))) {
      break;
    }
    object = object[key];
  }
  if (result || ++index != length) {
    return result;
  }
  length = object == null ? 0 : object.length;
  return !!length && isLength(length) && isIndex(key, length) &&
    (isArray(object) || isArguments(object));
}

module.exports = hasPath;

},{"./_castPath":98,"./_isIndex":124,"./_toKey":162,"./isArguments":169,"./isArray":170,"./isLength":174}],118:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
  this.size = 0;
}

module.exports = hashClear;

},{"./_nativeCreate":144}],119:[function(require,module,exports){
/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}

module.exports = hashDelete;

},{}],120:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return hasOwnProperty.call(data, key) ? data[key] : undefined;
}

module.exports = hashGet;

},{"./_nativeCreate":144}],121:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? (data[key] !== undefined) : hasOwnProperty.call(data, key);
}

module.exports = hashHas;

},{"./_nativeCreate":144}],122:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

module.exports = hashSet;

},{"./_nativeCreate":144}],123:[function(require,module,exports){
var Symbol = require('./_Symbol'),
    isArguments = require('./isArguments'),
    isArray = require('./isArray');

/** Built-in value references. */
var spreadableSymbol = Symbol ? Symbol.isConcatSpreadable : undefined;

/**
 * Checks if `value` is a flattenable `arguments` object or array.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is flattenable, else `false`.
 */
function isFlattenable(value) {
  return isArray(value) || isArguments(value) ||
    !!(spreadableSymbol && value && value[spreadableSymbol]);
}

module.exports = isFlattenable;

},{"./_Symbol":58,"./isArguments":169,"./isArray":170}],124:[function(require,module,exports){
/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  length = length == null ? MAX_SAFE_INTEGER : length;
  return !!length &&
    (typeof value == 'number' || reIsUint.test(value)) &&
    (value > -1 && value % 1 == 0 && value < length);
}

module.exports = isIndex;

},{}],125:[function(require,module,exports){
var eq = require('./eq'),
    isArrayLike = require('./isArrayLike'),
    isIndex = require('./_isIndex'),
    isObject = require('./isObject');

/**
 * Checks if the given arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
 *  else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
        ? (isArrayLike(object) && isIndex(index, object.length))
        : (type == 'string' && index in object)
      ) {
    return eq(object[index], value);
  }
  return false;
}

module.exports = isIterateeCall;

},{"./_isIndex":124,"./eq":165,"./isArrayLike":171,"./isObject":175}],126:[function(require,module,exports){
var isArray = require('./isArray'),
    isSymbol = require('./isSymbol');

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/;

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  if (isArray(value)) {
    return false;
  }
  var type = typeof value;
  if (type == 'number' || type == 'symbol' || type == 'boolean' ||
      value == null || isSymbol(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
    (object != null && value in Object(object));
}

module.exports = isKey;

},{"./isArray":170,"./isSymbol":177}],127:[function(require,module,exports){
/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

module.exports = isKeyable;

},{}],128:[function(require,module,exports){
var coreJsData = require('./_coreJsData');

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

module.exports = isMasked;

},{"./_coreJsData":101}],129:[function(require,module,exports){
/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

  return value === proto;
}

module.exports = isPrototype;

},{}],130:[function(require,module,exports){
var isObject = require('./isObject');

/**
 * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` if suitable for strict
 *  equality comparisons, else `false`.
 */
function isStrictComparable(value) {
  return value === value && !isObject(value);
}

module.exports = isStrictComparable;

},{"./isObject":175}],131:[function(require,module,exports){
/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}

module.exports = listCacheClear;

},{}],132:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/** Used for built-in method references. */
var arrayProto = Array.prototype;

/** Built-in value references. */
var splice = arrayProto.splice;

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}

module.exports = listCacheDelete;

},{"./_assocIndexOf":67}],133:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

module.exports = listCacheGet;

},{"./_assocIndexOf":67}],134:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

module.exports = listCacheHas;

},{"./_assocIndexOf":67}],135:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

module.exports = listCacheSet;

},{"./_assocIndexOf":67}],136:[function(require,module,exports){
var Hash = require('./_Hash'),
    ListCache = require('./_ListCache'),
    Map = require('./_Map');

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

module.exports = mapCacheClear;

},{"./_Hash":50,"./_ListCache":51,"./_Map":52}],137:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  var result = getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
}

module.exports = mapCacheDelete;

},{"./_getMapData":110}],138:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

module.exports = mapCacheGet;

},{"./_getMapData":110}],139:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

module.exports = mapCacheHas;

},{"./_getMapData":110}],140:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  var data = getMapData(this, key),
      size = data.size;

  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}

module.exports = mapCacheSet;

},{"./_getMapData":110}],141:[function(require,module,exports){
/**
 * Converts `map` to its key-value pairs.
 *
 * @private
 * @param {Object} map The map to convert.
 * @returns {Array} Returns the key-value pairs.
 */
function mapToArray(map) {
  var index = -1,
      result = Array(map.size);

  map.forEach(function(value, key) {
    result[++index] = [key, value];
  });
  return result;
}

module.exports = mapToArray;

},{}],142:[function(require,module,exports){
/**
 * A specialized version of `matchesProperty` for source values suitable
 * for strict equality comparisons, i.e. `===`.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @param {*} srcValue The value to match.
 * @returns {Function} Returns the new spec function.
 */
function matchesStrictComparable(key, srcValue) {
  return function(object) {
    if (object == null) {
      return false;
    }
    return object[key] === srcValue &&
      (srcValue !== undefined || (key in Object(object)));
  };
}

module.exports = matchesStrictComparable;

},{}],143:[function(require,module,exports){
var memoize = require('./memoize');

/** Used as the maximum memoize cache size. */
var MAX_MEMOIZE_SIZE = 500;

/**
 * A specialized version of `_.memoize` which clears the memoized function's
 * cache when it exceeds `MAX_MEMOIZE_SIZE`.
 *
 * @private
 * @param {Function} func The function to have its output memoized.
 * @returns {Function} Returns the new memoized function.
 */
function memoizeCapped(func) {
  var result = memoize(func, function(key) {
    if (cache.size === MAX_MEMOIZE_SIZE) {
      cache.clear();
    }
    return key;
  });

  var cache = result.cache;
  return result;
}

module.exports = memoizeCapped;

},{"./memoize":180}],144:[function(require,module,exports){
var getNative = require('./_getNative');

/* Built-in method references that are verified to be native. */
var nativeCreate = getNative(Object, 'create');

module.exports = nativeCreate;

},{"./_getNative":112}],145:[function(require,module,exports){
var overArg = require('./_overArg');

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeKeys = overArg(Object.keys, Object);

module.exports = nativeKeys;

},{"./_overArg":148}],146:[function(require,module,exports){
var freeGlobal = require('./_freeGlobal');

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports && freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

module.exports = nodeUtil;

},{"./_freeGlobal":108}],147:[function(require,module,exports){
/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

module.exports = objectToString;

},{}],148:[function(require,module,exports){
/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

module.exports = overArg;

},{}],149:[function(require,module,exports){
var apply = require('./_apply');

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * A specialized version of `baseRest` which transforms the rest array.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @param {Function} transform The rest array transform.
 * @returns {Function} Returns the new function.
 */
function overRest(func, start, transform) {
  start = nativeMax(start === undefined ? (func.length - 1) : start, 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        array = Array(length);

    while (++index < length) {
      array[index] = args[start + index];
    }
    index = -1;
    var otherArgs = Array(start + 1);
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = transform(array);
    return apply(func, this, otherArgs);
  };
}

module.exports = overRest;

},{"./_apply":61}],150:[function(require,module,exports){
var freeGlobal = require('./_freeGlobal');

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

module.exports = root;

},{"./_freeGlobal":108}],151:[function(require,module,exports){
/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/**
 * Adds `value` to the array cache.
 *
 * @private
 * @name add
 * @memberOf SetCache
 * @alias push
 * @param {*} value The value to cache.
 * @returns {Object} Returns the cache instance.
 */
function setCacheAdd(value) {
  this.__data__.set(value, HASH_UNDEFINED);
  return this;
}

module.exports = setCacheAdd;

},{}],152:[function(require,module,exports){
/**
 * Checks if `value` is in the array cache.
 *
 * @private
 * @name has
 * @memberOf SetCache
 * @param {*} value The value to search for.
 * @returns {number} Returns `true` if `value` is found, else `false`.
 */
function setCacheHas(value) {
  return this.__data__.has(value);
}

module.exports = setCacheHas;

},{}],153:[function(require,module,exports){
/**
 * Converts `set` to an array of its values.
 *
 * @private
 * @param {Object} set The set to convert.
 * @returns {Array} Returns the values.
 */
function setToArray(set) {
  var index = -1,
      result = Array(set.size);

  set.forEach(function(value) {
    result[++index] = value;
  });
  return result;
}

module.exports = setToArray;

},{}],154:[function(require,module,exports){
var baseSetToString = require('./_baseSetToString'),
    shortOut = require('./_shortOut');

/**
 * Sets the `toString` method of `func` to return `string`.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var setToString = shortOut(baseSetToString);

module.exports = setToString;

},{"./_baseSetToString":92,"./_shortOut":155}],155:[function(require,module,exports){
/** Used to detect hot functions by number of calls within a span of milliseconds. */
var HOT_COUNT = 800,
    HOT_SPAN = 16;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeNow = Date.now;

/**
 * Creates a function that'll short out and invoke `identity` instead
 * of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
 * milliseconds.
 *
 * @private
 * @param {Function} func The function to restrict.
 * @returns {Function} Returns the new shortable function.
 */
function shortOut(func) {
  var count = 0,
      lastCalled = 0;

  return function() {
    var stamp = nativeNow(),
        remaining = HOT_SPAN - (stamp - lastCalled);

    lastCalled = stamp;
    if (remaining > 0) {
      if (++count >= HOT_COUNT) {
        return arguments[0];
      }
    } else {
      count = 0;
    }
    return func.apply(undefined, arguments);
  };
}

module.exports = shortOut;

},{}],156:[function(require,module,exports){
var ListCache = require('./_ListCache');

/**
 * Removes all key-value entries from the stack.
 *
 * @private
 * @name clear
 * @memberOf Stack
 */
function stackClear() {
  this.__data__ = new ListCache;
  this.size = 0;
}

module.exports = stackClear;

},{"./_ListCache":51}],157:[function(require,module,exports){
/**
 * Removes `key` and its value from the stack.
 *
 * @private
 * @name delete
 * @memberOf Stack
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function stackDelete(key) {
  var data = this.__data__,
      result = data['delete'](key);

  this.size = data.size;
  return result;
}

module.exports = stackDelete;

},{}],158:[function(require,module,exports){
/**
 * Gets the stack value for `key`.
 *
 * @private
 * @name get
 * @memberOf Stack
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function stackGet(key) {
  return this.__data__.get(key);
}

module.exports = stackGet;

},{}],159:[function(require,module,exports){
/**
 * Checks if a stack value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Stack
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function stackHas(key) {
  return this.__data__.has(key);
}

module.exports = stackHas;

},{}],160:[function(require,module,exports){
var ListCache = require('./_ListCache'),
    Map = require('./_Map'),
    MapCache = require('./_MapCache');

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/**
 * Sets the stack `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Stack
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the stack cache instance.
 */
function stackSet(key, value) {
  var data = this.__data__;
  if (data instanceof ListCache) {
    var pairs = data.__data__;
    if (!Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
      pairs.push([key, value]);
      this.size = ++data.size;
      return this;
    }
    data = this.__data__ = new MapCache(pairs);
  }
  data.set(key, value);
  this.size = data.size;
  return this;
}

module.exports = stackSet;

},{"./_ListCache":51,"./_Map":52,"./_MapCache":53}],161:[function(require,module,exports){
var memoizeCapped = require('./_memoizeCapped');

/** Used to match property names within property paths. */
var reLeadingDot = /^\./,
    rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/**
 * Converts `string` to a property path array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the property path array.
 */
var stringToPath = memoizeCapped(function(string) {
  var result = [];
  if (reLeadingDot.test(string)) {
    result.push('');
  }
  string.replace(rePropName, function(match, number, quote, string) {
    result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
});

module.exports = stringToPath;

},{"./_memoizeCapped":143}],162:[function(require,module,exports){
var isSymbol = require('./isSymbol');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

module.exports = toKey;

},{"./isSymbol":177}],163:[function(require,module,exports){
/** Used for built-in method references. */
var funcProto = Function.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

module.exports = toSource;

},{}],164:[function(require,module,exports){
/**
 * Creates a function that returns `value`.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {*} value The value to return from the new function.
 * @returns {Function} Returns the new constant function.
 * @example
 *
 * var objects = _.times(2, _.constant({ 'a': 1 }));
 *
 * console.log(objects);
 * // => [{ 'a': 1 }, { 'a': 1 }]
 *
 * console.log(objects[0] === objects[1]);
 * // => true
 */
function constant(value) {
  return function() {
    return value;
  };
}

module.exports = constant;

},{}],165:[function(require,module,exports){
/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

module.exports = eq;

},{}],166:[function(require,module,exports){
var baseGet = require('./_baseGet');

/**
 * Gets the value at `path` of `object`. If the resolved value is
 * `undefined`, the `defaultValue` is returned in its place.
 *
 * @static
 * @memberOf _
 * @since 3.7.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @param {*} [defaultValue] The value returned for `undefined` resolved values.
 * @returns {*} Returns the resolved value.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.get(object, 'a[0].b.c');
 * // => 3
 *
 * _.get(object, ['a', '0', 'b', 'c']);
 * // => 3
 *
 * _.get(object, 'a.b.c', 'default');
 * // => 'default'
 */
function get(object, path, defaultValue) {
  var result = object == null ? undefined : baseGet(object, path);
  return result === undefined ? defaultValue : result;
}

module.exports = get;

},{"./_baseGet":72}],167:[function(require,module,exports){
var baseHasIn = require('./_baseHasIn'),
    hasPath = require('./_hasPath');

/**
 * Checks if `path` is a direct or inherited property of `object`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path to check.
 * @returns {boolean} Returns `true` if `path` exists, else `false`.
 * @example
 *
 * var object = _.create({ 'a': _.create({ 'b': 2 }) });
 *
 * _.hasIn(object, 'a');
 * // => true
 *
 * _.hasIn(object, 'a.b');
 * // => true
 *
 * _.hasIn(object, ['a', 'b']);
 * // => true
 *
 * _.hasIn(object, 'b');
 * // => false
 */
function hasIn(object, path) {
  return object != null && hasPath(object, path, baseHasIn);
}

module.exports = hasIn;

},{"./_baseHasIn":75,"./_hasPath":117}],168:[function(require,module,exports){
/**
 * This method returns the first argument it receives.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'a': 1 };
 *
 * console.log(_.identity(object) === object);
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = identity;

},{}],169:[function(require,module,exports){
var baseIsArguments = require('./_baseIsArguments'),
    isObjectLike = require('./isObjectLike');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Built-in value references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
  return isObjectLike(value) && hasOwnProperty.call(value, 'callee') &&
    !propertyIsEnumerable.call(value, 'callee');
};

module.exports = isArguments;

},{"./_baseIsArguments":76,"./isObjectLike":176}],170:[function(require,module,exports){
/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

module.exports = isArray;

},{}],171:[function(require,module,exports){
var isFunction = require('./isFunction'),
    isLength = require('./isLength');

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

module.exports = isArrayLike;

},{"./isFunction":173,"./isLength":174}],172:[function(require,module,exports){
var root = require('./_root'),
    stubFalse = require('./stubFalse');

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? root.Buffer : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || stubFalse;

module.exports = isBuffer;

},{"./_root":150,"./stubFalse":185}],173:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isObject = require('./isObject');

/** `Object#toString` result references. */
var asyncTag = '[object AsyncFunction]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    proxyTag = '[object Proxy]';

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}

module.exports = isFunction;

},{"./_baseGetTag":74,"./isObject":175}],174:[function(require,module,exports){
/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = isLength;

},{}],175:[function(require,module,exports){
/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

module.exports = isObject;

},{}],176:[function(require,module,exports){
/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

module.exports = isObjectLike;

},{}],177:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && baseGetTag(value) == symbolTag);
}

module.exports = isSymbol;

},{"./_baseGetTag":74,"./isObjectLike":176}],178:[function(require,module,exports){
var baseIsTypedArray = require('./_baseIsTypedArray'),
    baseUnary = require('./_baseUnary'),
    nodeUtil = require('./_nodeUtil');

/* Node.js helper references. */
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

module.exports = isTypedArray;

},{"./_baseIsTypedArray":81,"./_baseUnary":96,"./_nodeUtil":146}],179:[function(require,module,exports){
var arrayLikeKeys = require('./_arrayLikeKeys'),
    baseKeys = require('./_baseKeys'),
    isArrayLike = require('./isArrayLike');

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys(object) {
  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
}

module.exports = keys;

},{"./_arrayLikeKeys":63,"./_baseKeys":83,"./isArrayLike":171}],180:[function(require,module,exports){
var MapCache = require('./_MapCache');

/** Error message constants. */
var FUNC_ERROR_TEXT = 'Expected a function';

/**
 * Creates a function that memoizes the result of `func`. If `resolver` is
 * provided, it determines the cache key for storing the result based on the
 * arguments provided to the memoized function. By default, the first argument
 * provided to the memoized function is used as the map cache key. The `func`
 * is invoked with the `this` binding of the memoized function.
 *
 * **Note:** The cache is exposed as the `cache` property on the memoized
 * function. Its creation may be customized by replacing the `_.memoize.Cache`
 * constructor with one whose instances implement the
 * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
 * method interface of `clear`, `delete`, `get`, `has`, and `set`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to have its output memoized.
 * @param {Function} [resolver] The function to resolve the cache key.
 * @returns {Function} Returns the new memoized function.
 * @example
 *
 * var object = { 'a': 1, 'b': 2 };
 * var other = { 'c': 3, 'd': 4 };
 *
 * var values = _.memoize(_.values);
 * values(object);
 * // => [1, 2]
 *
 * values(other);
 * // => [3, 4]
 *
 * object.a = 2;
 * values(object);
 * // => [1, 2]
 *
 * // Modify the result cache.
 * values.cache.set(object, ['a', 'b']);
 * values(object);
 * // => ['a', 'b']
 *
 * // Replace `_.memoize.Cache`.
 * _.memoize.Cache = WeakMap;
 */
function memoize(func, resolver) {
  if (typeof func != 'function' || (resolver != null && typeof resolver != 'function')) {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function() {
    var args = arguments,
        key = resolver ? resolver.apply(this, args) : args[0],
        cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result) || cache;
    return result;
  };
  memoized.cache = new (memoize.Cache || MapCache);
  return memoized;
}

// Expose `MapCache`.
memoize.Cache = MapCache;

module.exports = memoize;

},{"./_MapCache":53}],181:[function(require,module,exports){
var baseProperty = require('./_baseProperty'),
    basePropertyDeep = require('./_basePropertyDeep'),
    isKey = require('./_isKey'),
    toKey = require('./_toKey');

/**
 * Creates a function that returns the value at `path` of a given object.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {Array|string} path The path of the property to get.
 * @returns {Function} Returns the new accessor function.
 * @example
 *
 * var objects = [
 *   { 'a': { 'b': 2 } },
 *   { 'a': { 'b': 1 } }
 * ];
 *
 * _.map(objects, _.property('a.b'));
 * // => [2, 1]
 *
 * _.map(_.sortBy(objects, _.property(['a', 'b'])), 'a.b');
 * // => [1, 2]
 */
function property(path) {
  return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
}

module.exports = property;

},{"./_baseProperty":88,"./_basePropertyDeep":89,"./_isKey":126,"./_toKey":162}],182:[function(require,module,exports){
var baseRandom = require('./_baseRandom'),
    isIterateeCall = require('./_isIterateeCall'),
    toFinite = require('./toFinite');

/** Built-in method references without a dependency on `root`. */
var freeParseFloat = parseFloat;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMin = Math.min,
    nativeRandom = Math.random;

/**
 * Produces a random number between the inclusive `lower` and `upper` bounds.
 * If only one argument is provided a number between `0` and the given number
 * is returned. If `floating` is `true`, or either `lower` or `upper` are
 * floats, a floating-point number is returned instead of an integer.
 *
 * **Note:** JavaScript follows the IEEE-754 standard for resolving
 * floating-point values which can produce unexpected results.
 *
 * @static
 * @memberOf _
 * @since 0.7.0
 * @category Number
 * @param {number} [lower=0] The lower bound.
 * @param {number} [upper=1] The upper bound.
 * @param {boolean} [floating] Specify returning a floating-point number.
 * @returns {number} Returns the random number.
 * @example
 *
 * _.random(0, 5);
 * // => an integer between 0 and 5
 *
 * _.random(5);
 * // => also an integer between 0 and 5
 *
 * _.random(5, true);
 * // => a floating-point number between 0 and 5
 *
 * _.random(1.2, 5.2);
 * // => a floating-point number between 1.2 and 5.2
 */
function random(lower, upper, floating) {
  if (floating && typeof floating != 'boolean' && isIterateeCall(lower, upper, floating)) {
    upper = floating = undefined;
  }
  if (floating === undefined) {
    if (typeof upper == 'boolean') {
      floating = upper;
      upper = undefined;
    }
    else if (typeof lower == 'boolean') {
      floating = lower;
      lower = undefined;
    }
  }
  if (lower === undefined && upper === undefined) {
    lower = 0;
    upper = 1;
  }
  else {
    lower = toFinite(lower);
    if (upper === undefined) {
      upper = lower;
      lower = 0;
    } else {
      upper = toFinite(upper);
    }
  }
  if (lower > upper) {
    var temp = lower;
    lower = upper;
    upper = temp;
  }
  if (floating || lower % 1 || upper % 1) {
    var rand = nativeRandom();
    return nativeMin(lower + (rand * (upper - lower + freeParseFloat('1e-' + ((rand + '').length - 1)))), upper);
  }
  return baseRandom(lower, upper);
}

module.exports = random;

},{"./_baseRandom":90,"./_isIterateeCall":125,"./toFinite":186}],183:[function(require,module,exports){
var baseFlatten = require('./_baseFlatten'),
    baseOrderBy = require('./_baseOrderBy'),
    baseRest = require('./_baseRest'),
    isIterateeCall = require('./_isIterateeCall');

/**
 * Creates an array of elements, sorted in ascending order by the results of
 * running each element in a collection thru each iteratee. This method
 * performs a stable sort, that is, it preserves the original sort order of
 * equal elements. The iteratees are invoked with one argument: (value).
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {...(Function|Function[])} [iteratees=[_.identity]]
 *  The iteratees to sort by.
 * @returns {Array} Returns the new sorted array.
 * @example
 *
 * var users = [
 *   { 'user': 'fred',   'age': 48 },
 *   { 'user': 'barney', 'age': 36 },
 *   { 'user': 'fred',   'age': 40 },
 *   { 'user': 'barney', 'age': 34 }
 * ];
 *
 * _.sortBy(users, [function(o) { return o.user; }]);
 * // => objects for [['barney', 36], ['barney', 34], ['fred', 48], ['fred', 40]]
 *
 * _.sortBy(users, ['user', 'age']);
 * // => objects for [['barney', 34], ['barney', 36], ['fred', 40], ['fred', 48]]
 */
var sortBy = baseRest(function(collection, iteratees) {
  if (collection == null) {
    return [];
  }
  var length = iteratees.length;
  if (length > 1 && isIterateeCall(collection, iteratees[0], iteratees[1])) {
    iteratees = [];
  } else if (length > 2 && isIterateeCall(iteratees[0], iteratees[1], iteratees[2])) {
    iteratees = [iteratees[0]];
  }
  return baseOrderBy(collection, baseFlatten(iteratees, 1), []);
});

module.exports = sortBy;

},{"./_baseFlatten":69,"./_baseOrderBy":87,"./_baseRest":91,"./_isIterateeCall":125}],184:[function(require,module,exports){
/**
 * This method returns a new empty array.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {Array} Returns the new empty array.
 * @example
 *
 * var arrays = _.times(2, _.stubArray);
 *
 * console.log(arrays);
 * // => [[], []]
 *
 * console.log(arrays[0] === arrays[1]);
 * // => false
 */
function stubArray() {
  return [];
}

module.exports = stubArray;

},{}],185:[function(require,module,exports){
/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

module.exports = stubFalse;

},{}],186:[function(require,module,exports){
var toNumber = require('./toNumber');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0,
    MAX_INTEGER = 1.7976931348623157e+308;

/**
 * Converts `value` to a finite number.
 *
 * @static
 * @memberOf _
 * @since 4.12.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted number.
 * @example
 *
 * _.toFinite(3.2);
 * // => 3.2
 *
 * _.toFinite(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toFinite(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toFinite('3.2');
 * // => 3.2
 */
function toFinite(value) {
  if (!value) {
    return value === 0 ? value : 0;
  }
  value = toNumber(value);
  if (value === INFINITY || value === -INFINITY) {
    var sign = (value < 0 ? -1 : 1);
    return sign * MAX_INTEGER;
  }
  return value === value ? value : 0;
}

module.exports = toFinite;

},{"./toNumber":187}],187:[function(require,module,exports){
var isObject = require('./isObject'),
    isSymbol = require('./isSymbol');

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = toNumber;

},{"./isObject":175,"./isSymbol":177}],188:[function(require,module,exports){
var baseToString = require('./_baseToString');

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

module.exports = toString;

},{"./_baseToString":95}],189:[function(require,module,exports){
(function (global){
;(function() {
"use strict"
function Vnode(tag, key, attrs0, children, text, dom) {
	return {tag: tag, key: key, attrs: attrs0, children: children, text: text, dom: dom, domSize: undefined, state: undefined, _state: undefined, events: undefined, instance: undefined, skip: false}
}
Vnode.normalize = function(node) {
	if (Array.isArray(node)) return Vnode("[", undefined, undefined, Vnode.normalizeChildren(node), undefined, undefined)
	if (node != null && typeof node !== "object") return Vnode("#", undefined, undefined, node === false ? "" : node, undefined, undefined)
	return node
}
Vnode.normalizeChildren = function normalizeChildren(children) {
	for (var i = 0; i < children.length; i++) {
		children[i] = Vnode.normalize(children[i])
	}
	return children
}
var selectorParser = /(?:(^|#|\.)([^#\.\[\]]+))|(\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\5)?\])/g
var selectorCache = {}
var hasOwn = {}.hasOwnProperty
function compileSelector(selector) {
	var match, tag = "div", classes = [], attrs = {}
	while (match = selectorParser.exec(selector)) {
		var type = match[1], value = match[2]
		if (type === "" && value !== "") tag = value
		else if (type === "#") attrs.id = value
		else if (type === ".") classes.push(value)
		else if (match[3][0] === "[") {
			var attrValue = match[6]
			if (attrValue) attrValue = attrValue.replace(/\\(["'])/g, "$1").replace(/\\\\/g, "\\")
			if (match[4] === "class") classes.push(attrValue)
			else attrs[match[4]] = attrValue === "" ? attrValue : attrValue || true
		}
	}
	if (classes.length > 0) attrs.className = classes.join(" ")
	return selectorCache[selector] = {tag: tag, attrs: attrs}
}
function execSelector(state, attrs, children) {
	var hasAttrs = false, childList, text
	var className = attrs.className || attrs.class
	for (var key in state.attrs) {
		if (hasOwn.call(state.attrs, key)) {
			attrs[key] = state.attrs[key]
		}
	}
	if (className !== undefined) {
		if (attrs.class !== undefined) {
			attrs.class = undefined
			attrs.className = className
		}
		if (state.attrs.className != null) {
			attrs.className = state.attrs.className + " " + className
		}
	}
	for (var key in attrs) {
		if (hasOwn.call(attrs, key) && key !== "key") {
			hasAttrs = true
			break
		}
	}
	if (Array.isArray(children) && children.length === 1 && children[0] != null && children[0].tag === "#") {
		text = children[0].children
	} else {
		childList = children
	}
	return Vnode(state.tag, attrs.key, hasAttrs ? attrs : undefined, childList, text)
}
function hyperscript(selector) {
	// Because sloppy mode sucks
	var attrs = arguments[1], start = 2, children
	if (selector == null || typeof selector !== "string" && typeof selector !== "function" && typeof selector.view !== "function") {
		throw Error("The selector must be either a string or a component.");
	}
	if (typeof selector === "string") {
		var cached = selectorCache[selector] || compileSelector(selector)
	}
	if (attrs == null) {
		attrs = {}
	} else if (typeof attrs !== "object" || attrs.tag != null || Array.isArray(attrs)) {
		attrs = {}
		start = 1
	}
	if (arguments.length === start + 1) {
		children = arguments[start]
		if (!Array.isArray(children)) children = [children]
	} else {
		children = []
		while (start < arguments.length) children.push(arguments[start++])
	}
	var normalized = Vnode.normalizeChildren(children)
	if (typeof selector === "string") {
		return execSelector(cached, attrs, normalized)
	} else {
		return Vnode(selector, attrs.key, attrs, normalized)
	}
}
hyperscript.trust = function(html) {
	if (html == null) html = ""
	return Vnode("<", undefined, undefined, html, undefined, undefined)
}
hyperscript.fragment = function(attrs1, children) {
	return Vnode("[", attrs1.key, attrs1, Vnode.normalizeChildren(children), undefined, undefined)
}
var m = hyperscript
/** @constructor */
var PromisePolyfill = function(executor) {
	if (!(this instanceof PromisePolyfill)) throw new Error("Promise must be called with `new`")
	if (typeof executor !== "function") throw new TypeError("executor must be a function")
	var self = this, resolvers = [], rejectors = [], resolveCurrent = handler(resolvers, true), rejectCurrent = handler(rejectors, false)
	var instance = self._instance = {resolvers: resolvers, rejectors: rejectors}
	var callAsync = typeof setImmediate === "function" ? setImmediate : setTimeout
	function handler(list, shouldAbsorb) {
		return function execute(value) {
			var then
			try {
				if (shouldAbsorb && value != null && (typeof value === "object" || typeof value === "function") && typeof (then = value.then) === "function") {
					if (value === self) throw new TypeError("Promise can't be resolved w/ itself")
					executeOnce(then.bind(value))
				}
				else {
					callAsync(function() {
						if (!shouldAbsorb && list.length === 0) console.error("Possible unhandled promise rejection:", value)
						for (var i = 0; i < list.length; i++) list[i](value)
						resolvers.length = 0, rejectors.length = 0
						instance.state = shouldAbsorb
						instance.retry = function() {execute(value)}
					})
				}
			}
			catch (e) {
				rejectCurrent(e)
			}
		}
	}
	function executeOnce(then) {
		var runs = 0
		function run(fn) {
			return function(value) {
				if (runs++ > 0) return
				fn(value)
			}
		}
		var onerror = run(rejectCurrent)
		try {then(run(resolveCurrent), onerror)} catch (e) {onerror(e)}
	}
	executeOnce(executor)
}
PromisePolyfill.prototype.then = function(onFulfilled, onRejection) {
	var self = this, instance = self._instance
	function handle(callback, list, next, state) {
		list.push(function(value) {
			if (typeof callback !== "function") next(value)
			else try {resolveNext(callback(value))} catch (e) {if (rejectNext) rejectNext(e)}
		})
		if (typeof instance.retry === "function" && state === instance.state) instance.retry()
	}
	var resolveNext, rejectNext
	var promise = new PromisePolyfill(function(resolve, reject) {resolveNext = resolve, rejectNext = reject})
	handle(onFulfilled, instance.resolvers, resolveNext, true), handle(onRejection, instance.rejectors, rejectNext, false)
	return promise
}
PromisePolyfill.prototype.catch = function(onRejection) {
	return this.then(null, onRejection)
}
PromisePolyfill.resolve = function(value) {
	if (value instanceof PromisePolyfill) return value
	return new PromisePolyfill(function(resolve) {resolve(value)})
}
PromisePolyfill.reject = function(value) {
	return new PromisePolyfill(function(resolve, reject) {reject(value)})
}
PromisePolyfill.all = function(list) {
	return new PromisePolyfill(function(resolve, reject) {
		var total = list.length, count = 0, values = []
		if (list.length === 0) resolve([])
		else for (var i = 0; i < list.length; i++) {
			(function(i) {
				function consume(value) {
					count++
					values[i] = value
					if (count === total) resolve(values)
				}
				if (list[i] != null && (typeof list[i] === "object" || typeof list[i] === "function") && typeof list[i].then === "function") {
					list[i].then(consume, reject)
				}
				else consume(list[i])
			})(i)
		}
	})
}
PromisePolyfill.race = function(list) {
	return new PromisePolyfill(function(resolve, reject) {
		for (var i = 0; i < list.length; i++) {
			list[i].then(resolve, reject)
		}
	})
}
if (typeof window !== "undefined") {
	if (typeof window.Promise === "undefined") window.Promise = PromisePolyfill
	var PromisePolyfill = window.Promise
} else if (typeof global !== "undefined") {
	if (typeof global.Promise === "undefined") global.Promise = PromisePolyfill
	var PromisePolyfill = global.Promise
} else {
}
var buildQueryString = function(object) {
	if (Object.prototype.toString.call(object) !== "[object Object]") return ""
	var args = []
	for (var key0 in object) {
		destructure(key0, object[key0])
	}
	return args.join("&")
	function destructure(key0, value) {
		if (Array.isArray(value)) {
			for (var i = 0; i < value.length; i++) {
				destructure(key0 + "[" + i + "]", value[i])
			}
		}
		else if (Object.prototype.toString.call(value) === "[object Object]") {
			for (var i in value) {
				destructure(key0 + "[" + i + "]", value[i])
			}
		}
		else args.push(encodeURIComponent(key0) + (value != null && value !== "" ? "=" + encodeURIComponent(value) : ""))
	}
}
var FILE_PROTOCOL_REGEX = new RegExp("^file://", "i")
var _8 = function($window, Promise) {
	var callbackCount = 0
	var oncompletion
	function setCompletionCallback(callback) {oncompletion = callback}
	function finalizer() {
		var count = 0
		function complete() {if (--count === 0 && typeof oncompletion === "function") oncompletion()}
		return function finalize(promise0) {
			var then0 = promise0.then
			promise0.then = function() {
				count++
				var next = then0.apply(promise0, arguments)
				next.then(complete, function(e) {
					complete()
					if (count === 0) throw e
				})
				return finalize(next)
			}
			return promise0
		}
	}
	function normalize(args, extra) {
		if (typeof args === "string") {
			var url = args
			args = extra || {}
			if (args.url == null) args.url = url
		}
		return args
	}
	function request(args, extra) {
		var finalize = finalizer()
		args = normalize(args, extra)
		var promise0 = new Promise(function(resolve, reject) {
			if (args.method == null) args.method = "GET"
			args.method = args.method.toUpperCase()
			var useBody = (args.method === "GET" || args.method === "TRACE") ? false : (typeof args.useBody === "boolean" ? args.useBody : true)
			if (typeof args.serialize !== "function") args.serialize = typeof FormData !== "undefined" && args.data instanceof FormData ? function(value) {return value} : JSON.stringify
			if (typeof args.deserialize !== "function") args.deserialize = deserialize
			if (typeof args.extract !== "function") args.extract = extract
			args.url = interpolate(args.url, args.data)
			if (useBody) args.data = args.serialize(args.data)
			else args.url = assemble(args.url, args.data)
			var xhr = new $window.XMLHttpRequest(),
				aborted = false,
				_abort = xhr.abort
			xhr.abort = function abort() {
				aborted = true
				_abort.call(xhr)
			}
			xhr.open(args.method, args.url, typeof args.async === "boolean" ? args.async : true, typeof args.user === "string" ? args.user : undefined, typeof args.password === "string" ? args.password : undefined)
			if (args.serialize === JSON.stringify && useBody) {
				xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8")
			}
			if (args.deserialize === deserialize) {
				xhr.setRequestHeader("Accept", "application/json, text/*")
			}
			if (args.withCredentials) xhr.withCredentials = args.withCredentials
			for (var key in args.headers) if ({}.hasOwnProperty.call(args.headers, key)) {
				xhr.setRequestHeader(key, args.headers[key])
			}
			if (typeof args.config === "function") xhr = args.config(xhr, args) || xhr
			xhr.onreadystatechange = function() {
				// Don't throw errors on xhr.abort().
				if(aborted) return
				if (xhr.readyState === 4) {
					try {
						var response = (args.extract !== extract) ? args.extract(xhr, args) : args.deserialize(args.extract(xhr, args))
						if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304 || FILE_PROTOCOL_REGEX.test(args.url)) {
							resolve(cast(args.type, response))
						}
						else {
							var error = new Error(xhr.responseText)
							for (var key in response) error[key] = response[key]
							reject(error)
						}
					}
					catch (e) {
						reject(e)
					}
				}
			}
			if (useBody && (args.data != null)) xhr.send(args.data)
			else xhr.send()
		})
		return args.background === true ? promise0 : finalize(promise0)
	}
	function jsonp(args, extra) {
		var finalize = finalizer()
		args = normalize(args, extra)
		var promise0 = new Promise(function(resolve, reject) {
			var callbackName = args.callbackName || "_mithril_" + Math.round(Math.random() * 1e16) + "_" + callbackCount++
			var script = $window.document.createElement("script")
			$window[callbackName] = function(data) {
				script.parentNode.removeChild(script)
				resolve(cast(args.type, data))
				delete $window[callbackName]
			}
			script.onerror = function() {
				script.parentNode.removeChild(script)
				reject(new Error("JSONP request failed"))
				delete $window[callbackName]
			}
			if (args.data == null) args.data = {}
			args.url = interpolate(args.url, args.data)
			args.data[args.callbackKey || "callback"] = callbackName
			script.src = assemble(args.url, args.data)
			$window.document.documentElement.appendChild(script)
		})
		return args.background === true? promise0 : finalize(promise0)
	}
	function interpolate(url, data) {
		if (data == null) return url
		var tokens = url.match(/:[^\/]+/gi) || []
		for (var i = 0; i < tokens.length; i++) {
			var key = tokens[i].slice(1)
			if (data[key] != null) {
				url = url.replace(tokens[i], data[key])
			}
		}
		return url
	}
	function assemble(url, data) {
		var querystring = buildQueryString(data)
		if (querystring !== "") {
			var prefix = url.indexOf("?") < 0 ? "?" : "&"
			url += prefix + querystring
		}
		return url
	}
	function deserialize(data) {
		try {return data !== "" ? JSON.parse(data) : null}
		catch (e) {throw new Error(data)}
	}
	function extract(xhr) {return xhr.responseText}
	function cast(type0, data) {
		if (typeof type0 === "function") {
			if (Array.isArray(data)) {
				for (var i = 0; i < data.length; i++) {
					data[i] = new type0(data[i])
				}
			}
			else return new type0(data)
		}
		return data
	}
	return {request: request, jsonp: jsonp, setCompletionCallback: setCompletionCallback}
}
var requestService = _8(window, PromisePolyfill)
var coreRenderer = function($window) {
	var $doc = $window.document
	var $emptyFragment = $doc.createDocumentFragment()
	var nameSpace = {
		svg: "http://www.w3.org/2000/svg",
		math: "http://www.w3.org/1998/Math/MathML"
	}
	var onevent
	function setEventCallback(callback) {return onevent = callback}
	function getNameSpace(vnode) {
		return vnode.attrs && vnode.attrs.xmlns || nameSpace[vnode.tag]
	}
	//create
	function createNodes(parent, vnodes, start, end, hooks, nextSibling, ns) {
		for (var i = start; i < end; i++) {
			var vnode = vnodes[i]
			if (vnode != null) {
				createNode(parent, vnode, hooks, ns, nextSibling)
			}
		}
	}
	function createNode(parent, vnode, hooks, ns, nextSibling) {
		var tag = vnode.tag
		if (typeof tag === "string") {
			vnode.state = {}
			if (vnode.attrs != null) initLifecycle(vnode.attrs, vnode, hooks)
			switch (tag) {
				case "#": return createText(parent, vnode, nextSibling)
				case "<": return createHTML(parent, vnode, nextSibling)
				case "[": return createFragment(parent, vnode, hooks, ns, nextSibling)
				default: return createElement(parent, vnode, hooks, ns, nextSibling)
			}
		}
		else return createComponent(parent, vnode, hooks, ns, nextSibling)
	}
	function createText(parent, vnode, nextSibling) {
		vnode.dom = $doc.createTextNode(vnode.children)
		insertNode(parent, vnode.dom, nextSibling)
		return vnode.dom
	}
	function createHTML(parent, vnode, nextSibling) {
		var match1 = vnode.children.match(/^\s*?<(\w+)/im) || []
		var parent1 = {caption: "table", thead: "table", tbody: "table", tfoot: "table", tr: "tbody", th: "tr", td: "tr", colgroup: "table", col: "colgroup"}[match1[1]] || "div"
		var temp = $doc.createElement(parent1)
		temp.innerHTML = vnode.children
		vnode.dom = temp.firstChild
		vnode.domSize = temp.childNodes.length
		var fragment = $doc.createDocumentFragment()
		var child
		while (child = temp.firstChild) {
			fragment.appendChild(child)
		}
		insertNode(parent, fragment, nextSibling)
		return fragment
	}
	function createFragment(parent, vnode, hooks, ns, nextSibling) {
		var fragment = $doc.createDocumentFragment()
		if (vnode.children != null) {
			var children = vnode.children
			createNodes(fragment, children, 0, children.length, hooks, null, ns)
		}
		vnode.dom = fragment.firstChild
		vnode.domSize = fragment.childNodes.length
		insertNode(parent, fragment, nextSibling)
		return fragment
	}
	function createElement(parent, vnode, hooks, ns, nextSibling) {
		var tag = vnode.tag
		var attrs2 = vnode.attrs
		var is = attrs2 && attrs2.is
		ns = getNameSpace(vnode) || ns
		var element = ns ?
			is ? $doc.createElementNS(ns, tag, {is: is}) : $doc.createElementNS(ns, tag) :
			is ? $doc.createElement(tag, {is: is}) : $doc.createElement(tag)
		vnode.dom = element
		if (attrs2 != null) {
			setAttrs(vnode, attrs2, ns)
		}
		insertNode(parent, element, nextSibling)
		if (vnode.attrs != null && vnode.attrs.contenteditable != null) {
			setContentEditable(vnode)
		}
		else {
			if (vnode.text != null) {
				if (vnode.text !== "") element.textContent = vnode.text
				else vnode.children = [Vnode("#", undefined, undefined, vnode.text, undefined, undefined)]
			}
			if (vnode.children != null) {
				var children = vnode.children
				createNodes(element, children, 0, children.length, hooks, null, ns)
				setLateAttrs(vnode)
			}
		}
		return element
	}
	function initComponent(vnode, hooks) {
		var sentinel
		if (typeof vnode.tag.view === "function") {
			vnode.state = Object.create(vnode.tag)
			sentinel = vnode.state.view
			if (sentinel.$$reentrantLock$$ != null) return $emptyFragment
			sentinel.$$reentrantLock$$ = true
		} else {
			vnode.state = void 0
			sentinel = vnode.tag
			if (sentinel.$$reentrantLock$$ != null) return $emptyFragment
			sentinel.$$reentrantLock$$ = true
			vnode.state = (vnode.tag.prototype != null && typeof vnode.tag.prototype.view === "function") ? new vnode.tag(vnode) : vnode.tag(vnode)
		}
		vnode._state = vnode.state
		if (vnode.attrs != null) initLifecycle(vnode.attrs, vnode, hooks)
		initLifecycle(vnode._state, vnode, hooks)
		vnode.instance = Vnode.normalize(vnode._state.view.call(vnode.state, vnode))
		if (vnode.instance === vnode) throw Error("A view cannot return the vnode it received as argument")
		sentinel.$$reentrantLock$$ = null
	}
	function createComponent(parent, vnode, hooks, ns, nextSibling) {
		initComponent(vnode, hooks)
		if (vnode.instance != null) {
			var element = createNode(parent, vnode.instance, hooks, ns, nextSibling)
			vnode.dom = vnode.instance.dom
			vnode.domSize = vnode.dom != null ? vnode.instance.domSize : 0
			insertNode(parent, element, nextSibling)
			return element
		}
		else {
			vnode.domSize = 0
			return $emptyFragment
		}
	}
	//update
	function updateNodes(parent, old, vnodes, recycling, hooks, nextSibling, ns) {
		if (old === vnodes || old == null && vnodes == null) return
		else if (old == null) createNodes(parent, vnodes, 0, vnodes.length, hooks, nextSibling, ns)
		else if (vnodes == null) removeNodes(old, 0, old.length, vnodes)
		else {
			if (old.length === vnodes.length) {
				var isUnkeyed = false
				for (var i = 0; i < vnodes.length; i++) {
					if (vnodes[i] != null && old[i] != null) {
						isUnkeyed = vnodes[i].key == null && old[i].key == null
						break
					}
				}
				if (isUnkeyed) {
					for (var i = 0; i < old.length; i++) {
						if (old[i] === vnodes[i]) continue
						else if (old[i] == null && vnodes[i] != null) createNode(parent, vnodes[i], hooks, ns, getNextSibling(old, i + 1, nextSibling))
						else if (vnodes[i] == null) removeNodes(old, i, i + 1, vnodes)
						else updateNode(parent, old[i], vnodes[i], hooks, getNextSibling(old, i + 1, nextSibling), recycling, ns)
					}
					return
				}
			}
			recycling = recycling || isRecyclable(old, vnodes)
			if (recycling) {
				var pool = old.pool
				old = old.concat(old.pool)
			}
			var oldStart = 0, start = 0, oldEnd = old.length - 1, end = vnodes.length - 1, map
			while (oldEnd >= oldStart && end >= start) {
				var o = old[oldStart], v = vnodes[start]
				if (o === v && !recycling) oldStart++, start++
				else if (o == null) oldStart++
				else if (v == null) start++
				else if (o.key === v.key) {
					var shouldRecycle = (pool != null && oldStart >= old.length - pool.length) || ((pool == null) && recycling)
					oldStart++, start++
					updateNode(parent, o, v, hooks, getNextSibling(old, oldStart, nextSibling), shouldRecycle, ns)
					if (recycling && o.tag === v.tag) insertNode(parent, toFragment(o), nextSibling)
				}
				else {
					var o = old[oldEnd]
					if (o === v && !recycling) oldEnd--, start++
					else if (o == null) oldEnd--
					else if (v == null) start++
					else if (o.key === v.key) {
						var shouldRecycle = (pool != null && oldEnd >= old.length - pool.length) || ((pool == null) && recycling)
						updateNode(parent, o, v, hooks, getNextSibling(old, oldEnd + 1, nextSibling), shouldRecycle, ns)
						if (recycling || start < end) insertNode(parent, toFragment(o), getNextSibling(old, oldStart, nextSibling))
						oldEnd--, start++
					}
					else break
				}
			}
			while (oldEnd >= oldStart && end >= start) {
				var o = old[oldEnd], v = vnodes[end]
				if (o === v && !recycling) oldEnd--, end--
				else if (o == null) oldEnd--
				else if (v == null) end--
				else if (o.key === v.key) {
					var shouldRecycle = (pool != null && oldEnd >= old.length - pool.length) || ((pool == null) && recycling)
					updateNode(parent, o, v, hooks, getNextSibling(old, oldEnd + 1, nextSibling), shouldRecycle, ns)
					if (recycling && o.tag === v.tag) insertNode(parent, toFragment(o), nextSibling)
					if (o.dom != null) nextSibling = o.dom
					oldEnd--, end--
				}
				else {
					if (!map) map = getKeyMap(old, oldEnd)
					if (v != null) {
						var oldIndex = map[v.key]
						if (oldIndex != null) {
							var movable = old[oldIndex]
							var shouldRecycle = (pool != null && oldIndex >= old.length - pool.length) || ((pool == null) && recycling)
							updateNode(parent, movable, v, hooks, getNextSibling(old, oldEnd + 1, nextSibling), recycling, ns)
							insertNode(parent, toFragment(movable), nextSibling)
							old[oldIndex].skip = true
							if (movable.dom != null) nextSibling = movable.dom
						}
						else {
							var dom = createNode(parent, v, hooks, ns, nextSibling)
							nextSibling = dom
						}
					}
					end--
				}
				if (end < start) break
			}
			createNodes(parent, vnodes, start, end + 1, hooks, nextSibling, ns)
			removeNodes(old, oldStart, oldEnd + 1, vnodes)
		}
	}
	function updateNode(parent, old, vnode, hooks, nextSibling, recycling, ns) {
		var oldTag = old.tag, tag = vnode.tag
		if (oldTag === tag) {
			vnode.state = old.state
			vnode._state = old._state
			vnode.events = old.events
			if (!recycling && shouldNotUpdate(vnode, old)) return
			if (typeof oldTag === "string") {
				if (vnode.attrs != null) {
					if (recycling) {
						vnode.state = {}
						initLifecycle(vnode.attrs, vnode, hooks)
					}
					else updateLifecycle(vnode.attrs, vnode, hooks)
				}
				switch (oldTag) {
					case "#": updateText(old, vnode); break
					case "<": updateHTML(parent, old, vnode, nextSibling); break
					case "[": updateFragment(parent, old, vnode, recycling, hooks, nextSibling, ns); break
					default: updateElement(old, vnode, recycling, hooks, ns)
				}
			}
			else updateComponent(parent, old, vnode, hooks, nextSibling, recycling, ns)
		}
		else {
			removeNode(old, null)
			createNode(parent, vnode, hooks, ns, nextSibling)
		}
	}
	function updateText(old, vnode) {
		if (old.children.toString() !== vnode.children.toString()) {
			old.dom.nodeValue = vnode.children
		}
		vnode.dom = old.dom
	}
	function updateHTML(parent, old, vnode, nextSibling) {
		if (old.children !== vnode.children) {
			toFragment(old)
			createHTML(parent, vnode, nextSibling)
		}
		else vnode.dom = old.dom, vnode.domSize = old.domSize
	}
	function updateFragment(parent, old, vnode, recycling, hooks, nextSibling, ns) {
		updateNodes(parent, old.children, vnode.children, recycling, hooks, nextSibling, ns)
		var domSize = 0, children = vnode.children
		vnode.dom = null
		if (children != null) {
			for (var i = 0; i < children.length; i++) {
				var child = children[i]
				if (child != null && child.dom != null) {
					if (vnode.dom == null) vnode.dom = child.dom
					domSize += child.domSize || 1
				}
			}
			if (domSize !== 1) vnode.domSize = domSize
		}
	}
	function updateElement(old, vnode, recycling, hooks, ns) {
		var element = vnode.dom = old.dom
		ns = getNameSpace(vnode) || ns
		if (vnode.tag === "textarea") {
			if (vnode.attrs == null) vnode.attrs = {}
			if (vnode.text != null) {
				vnode.attrs.value = vnode.text //FIXME handle0 multiple children
				vnode.text = undefined
			}
		}
		updateAttrs(vnode, old.attrs, vnode.attrs, ns)
		if (vnode.attrs != null && vnode.attrs.contenteditable != null) {
			setContentEditable(vnode)
		}
		else if (old.text != null && vnode.text != null && vnode.text !== "") {
			if (old.text.toString() !== vnode.text.toString()) old.dom.firstChild.nodeValue = vnode.text
		}
		else {
			if (old.text != null) old.children = [Vnode("#", undefined, undefined, old.text, undefined, old.dom.firstChild)]
			if (vnode.text != null) vnode.children = [Vnode("#", undefined, undefined, vnode.text, undefined, undefined)]
			updateNodes(element, old.children, vnode.children, recycling, hooks, null, ns)
		}
	}
	function updateComponent(parent, old, vnode, hooks, nextSibling, recycling, ns) {
		if (recycling) {
			initComponent(vnode, hooks)
		} else {
			vnode.instance = Vnode.normalize(vnode._state.view.call(vnode.state, vnode))
			if (vnode.instance === vnode) throw Error("A view cannot return the vnode it received as argument")
			if (vnode.attrs != null) updateLifecycle(vnode.attrs, vnode, hooks)
			updateLifecycle(vnode._state, vnode, hooks)
		}
		if (vnode.instance != null) {
			if (old.instance == null) createNode(parent, vnode.instance, hooks, ns, nextSibling)
			else updateNode(parent, old.instance, vnode.instance, hooks, nextSibling, recycling, ns)
			vnode.dom = vnode.instance.dom
			vnode.domSize = vnode.instance.domSize
		}
		else if (old.instance != null) {
			removeNode(old.instance, null)
			vnode.dom = undefined
			vnode.domSize = 0
		}
		else {
			vnode.dom = old.dom
			vnode.domSize = old.domSize
		}
	}
	function isRecyclable(old, vnodes) {
		if (old.pool != null && Math.abs(old.pool.length - vnodes.length) <= Math.abs(old.length - vnodes.length)) {
			var oldChildrenLength = old[0] && old[0].children && old[0].children.length || 0
			var poolChildrenLength = old.pool[0] && old.pool[0].children && old.pool[0].children.length || 0
			var vnodesChildrenLength = vnodes[0] && vnodes[0].children && vnodes[0].children.length || 0
			if (Math.abs(poolChildrenLength - vnodesChildrenLength) <= Math.abs(oldChildrenLength - vnodesChildrenLength)) {
				return true
			}
		}
		return false
	}
	function getKeyMap(vnodes, end) {
		var map = {}, i = 0
		for (var i = 0; i < end; i++) {
			var vnode = vnodes[i]
			if (vnode != null) {
				var key2 = vnode.key
				if (key2 != null) map[key2] = i
			}
		}
		return map
	}
	function toFragment(vnode) {
		var count0 = vnode.domSize
		if (count0 != null || vnode.dom == null) {
			var fragment = $doc.createDocumentFragment()
			if (count0 > 0) {
				var dom = vnode.dom
				while (--count0) fragment.appendChild(dom.nextSibling)
				fragment.insertBefore(dom, fragment.firstChild)
			}
			return fragment
		}
		else return vnode.dom
	}
	function getNextSibling(vnodes, i, nextSibling) {
		for (; i < vnodes.length; i++) {
			if (vnodes[i] != null && vnodes[i].dom != null) return vnodes[i].dom
		}
		return nextSibling
	}
	function insertNode(parent, dom, nextSibling) {
		if (nextSibling && nextSibling.parentNode) parent.insertBefore(dom, nextSibling)
		else parent.appendChild(dom)
	}
	function setContentEditable(vnode) {
		var children = vnode.children
		if (children != null && children.length === 1 && children[0].tag === "<") {
			var content = children[0].children
			if (vnode.dom.innerHTML !== content) vnode.dom.innerHTML = content
		}
		else if (vnode.text != null || children != null && children.length !== 0) throw new Error("Child node of a contenteditable must be trusted")
	}
	//remove
	function removeNodes(vnodes, start, end, context) {
		for (var i = start; i < end; i++) {
			var vnode = vnodes[i]
			if (vnode != null) {
				if (vnode.skip) vnode.skip = false
				else removeNode(vnode, context)
			}
		}
	}
	function removeNode(vnode, context) {
		var expected = 1, called = 0
		if (vnode.attrs && typeof vnode.attrs.onbeforeremove === "function") {
			var result = vnode.attrs.onbeforeremove.call(vnode.state, vnode)
			if (result != null && typeof result.then === "function") {
				expected++
				result.then(continuation, continuation)
			}
		}
		if (typeof vnode.tag !== "string" && typeof vnode._state.onbeforeremove === "function") {
			var result = vnode._state.onbeforeremove.call(vnode.state, vnode)
			if (result != null && typeof result.then === "function") {
				expected++
				result.then(continuation, continuation)
			}
		}
		continuation()
		function continuation() {
			if (++called === expected) {
				onremove(vnode)
				if (vnode.dom) {
					var count0 = vnode.domSize || 1
					if (count0 > 1) {
						var dom = vnode.dom
						while (--count0) {
							removeNodeFromDOM(dom.nextSibling)
						}
					}
					removeNodeFromDOM(vnode.dom)
					if (context != null && vnode.domSize == null && !hasIntegrationMethods(vnode.attrs) && typeof vnode.tag === "string") { //TODO test custom elements
						if (!context.pool) context.pool = [vnode]
						else context.pool.push(vnode)
					}
				}
			}
		}
	}
	function removeNodeFromDOM(node) {
		var parent = node.parentNode
		if (parent != null) parent.removeChild(node)
	}
	function onremove(vnode) {
		if (vnode.attrs && typeof vnode.attrs.onremove === "function") vnode.attrs.onremove.call(vnode.state, vnode)
		if (typeof vnode.tag !== "string" && typeof vnode._state.onremove === "function") vnode._state.onremove.call(vnode.state, vnode)
		if (vnode.instance != null) onremove(vnode.instance)
		else {
			var children = vnode.children
			if (Array.isArray(children)) {
				for (var i = 0; i < children.length; i++) {
					var child = children[i]
					if (child != null) onremove(child)
				}
			}
		}
	}
	//attrs2
	function setAttrs(vnode, attrs2, ns) {
		for (var key2 in attrs2) {
			setAttr(vnode, key2, null, attrs2[key2], ns)
		}
	}
	function setAttr(vnode, key2, old, value, ns) {
		var element = vnode.dom
		if (key2 === "key" || key2 === "is" || (old === value && !isFormAttribute(vnode, key2)) && typeof value !== "object" || typeof value === "undefined" || isLifecycleMethod(key2)) return
		var nsLastIndex = key2.indexOf(":")
		if (nsLastIndex > -1 && key2.substr(0, nsLastIndex) === "xlink") {
			element.setAttributeNS("http://www.w3.org/1999/xlink", key2.slice(nsLastIndex + 1), value)
		}
		else if (key2[0] === "o" && key2[1] === "n" && typeof value === "function") updateEvent(vnode, key2, value)
		else if (key2 === "style") updateStyle(element, old, value)
		else if (key2 in element && !isAttribute(key2) && ns === undefined && !isCustomElement(vnode)) {
			if (key2 === "value") {
				var normalized0 = "" + value // eslint-disable-line no-implicit-coercion
				//setting input[value] to same value by typing on focused element moves cursor to end in Chrome
				if ((vnode.tag === "input" || vnode.tag === "textarea") && vnode.dom.value === normalized0 && vnode.dom === $doc.activeElement) return
				//setting select[value] to same value while having select open blinks select dropdown in Chrome
				if (vnode.tag === "select") {
					if (value === null) {
						if (vnode.dom.selectedIndex === -1 && vnode.dom === $doc.activeElement) return
					} else {
						if (old !== null && vnode.dom.value === normalized0 && vnode.dom === $doc.activeElement) return
					}
				}
				//setting option[value] to same value while having select open blinks select dropdown in Chrome
				if (vnode.tag === "option" && old != null && vnode.dom.value === normalized0) return
			}
			// If you assign an input type1 that is not supported by IE 11 with an assignment expression, an error0 will occur.
			if (vnode.tag === "input" && key2 === "type") {
				element.setAttribute(key2, value)
				return
			}
			element[key2] = value
		}
		else {
			if (typeof value === "boolean") {
				if (value) element.setAttribute(key2, "")
				else element.removeAttribute(key2)
			}
			else element.setAttribute(key2 === "className" ? "class" : key2, value)
		}
	}
	function setLateAttrs(vnode) {
		var attrs2 = vnode.attrs
		if (vnode.tag === "select" && attrs2 != null) {
			if ("value" in attrs2) setAttr(vnode, "value", null, attrs2.value, undefined)
			if ("selectedIndex" in attrs2) setAttr(vnode, "selectedIndex", null, attrs2.selectedIndex, undefined)
		}
	}
	function updateAttrs(vnode, old, attrs2, ns) {
		if (attrs2 != null) {
			for (var key2 in attrs2) {
				setAttr(vnode, key2, old && old[key2], attrs2[key2], ns)
			}
		}
		if (old != null) {
			for (var key2 in old) {
				if (attrs2 == null || !(key2 in attrs2)) {
					if (key2 === "className") key2 = "class"
					if (key2[0] === "o" && key2[1] === "n" && !isLifecycleMethod(key2)) updateEvent(vnode, key2, undefined)
					else if (key2 !== "key") vnode.dom.removeAttribute(key2)
				}
			}
		}
	}
	function isFormAttribute(vnode, attr) {
		return attr === "value" || attr === "checked" || attr === "selectedIndex" || attr === "selected" && vnode.dom === $doc.activeElement
	}
	function isLifecycleMethod(attr) {
		return attr === "oninit" || attr === "oncreate" || attr === "onupdate" || attr === "onremove" || attr === "onbeforeremove" || attr === "onbeforeupdate"
	}
	function isAttribute(attr) {
		return attr === "href" || attr === "list" || attr === "form" || attr === "width" || attr === "height"// || attr === "type"
	}
	function isCustomElement(vnode){
		return vnode.attrs.is || vnode.tag.indexOf("-") > -1
	}
	function hasIntegrationMethods(source) {
		return source != null && (source.oncreate || source.onupdate || source.onbeforeremove || source.onremove)
	}
	//style
	function updateStyle(element, old, style) {
		if (old === style) element.style.cssText = "", old = null
		if (style == null) element.style.cssText = ""
		else if (typeof style === "string") element.style.cssText = style
		else {
			if (typeof old === "string") element.style.cssText = ""
			for (var key2 in style) {
				element.style[key2] = style[key2]
			}
			if (old != null && typeof old !== "string") {
				for (var key2 in old) {
					if (!(key2 in style)) element.style[key2] = ""
				}
			}
		}
	}
	//event
	function updateEvent(vnode, key2, value) {
		var element = vnode.dom
		var callback = typeof onevent !== "function" ? value : function(e) {
			var result = value.call(element, e)
			onevent.call(element, e)
			return result
		}
		if (key2 in element) element[key2] = typeof value === "function" ? callback : null
		else {
			var eventName = key2.slice(2)
			if (vnode.events === undefined) vnode.events = {}
			if (vnode.events[key2] === callback) return
			if (vnode.events[key2] != null) element.removeEventListener(eventName, vnode.events[key2], false)
			if (typeof value === "function") {
				vnode.events[key2] = callback
				element.addEventListener(eventName, vnode.events[key2], false)
			}
		}
	}
	//lifecycle
	function initLifecycle(source, vnode, hooks) {
		if (typeof source.oninit === "function") source.oninit.call(vnode.state, vnode)
		if (typeof source.oncreate === "function") hooks.push(source.oncreate.bind(vnode.state, vnode))
	}
	function updateLifecycle(source, vnode, hooks) {
		if (typeof source.onupdate === "function") hooks.push(source.onupdate.bind(vnode.state, vnode))
	}
	function shouldNotUpdate(vnode, old) {
		var forceVnodeUpdate, forceComponentUpdate
		if (vnode.attrs != null && typeof vnode.attrs.onbeforeupdate === "function") forceVnodeUpdate = vnode.attrs.onbeforeupdate.call(vnode.state, vnode, old)
		if (typeof vnode.tag !== "string" && typeof vnode._state.onbeforeupdate === "function") forceComponentUpdate = vnode._state.onbeforeupdate.call(vnode.state, vnode, old)
		if (!(forceVnodeUpdate === undefined && forceComponentUpdate === undefined) && !forceVnodeUpdate && !forceComponentUpdate) {
			vnode.dom = old.dom
			vnode.domSize = old.domSize
			vnode.instance = old.instance
			return true
		}
		return false
	}
	function render(dom, vnodes) {
		if (!dom) throw new Error("Ensure the DOM element being passed to m.route/m.mount/m.render is not undefined.")
		var hooks = []
		var active = $doc.activeElement
		var namespace = dom.namespaceURI
		// First time0 rendering into a node clears it out
		if (dom.vnodes == null) dom.textContent = ""
		if (!Array.isArray(vnodes)) vnodes = [vnodes]
		updateNodes(dom, dom.vnodes, Vnode.normalizeChildren(vnodes), false, hooks, null, namespace === "http://www.w3.org/1999/xhtml" ? undefined : namespace)
		dom.vnodes = vnodes
		for (var i = 0; i < hooks.length; i++) hooks[i]()
		if ($doc.activeElement !== active) active.focus()
	}
	return {render: render, setEventCallback: setEventCallback}
}
function throttle(callback) {
	//60fps translates to 16.6ms, round it down since setTimeout requires int
	var time = 16
	var last = 0, pending = null
	var timeout = typeof requestAnimationFrame === "function" ? requestAnimationFrame : setTimeout
	return function() {
		var now = Date.now()
		if (last === 0 || now - last >= time) {
			last = now
			callback()
		}
		else if (pending === null) {
			pending = timeout(function() {
				pending = null
				callback()
				last = Date.now()
			}, time - (now - last))
		}
	}
}
var _11 = function($window) {
	var renderService = coreRenderer($window)
	renderService.setEventCallback(function(e) {
		if (e.redraw === false) e.redraw = undefined
		else redraw()
	})
	var callbacks = []
	function subscribe(key1, callback) {
		unsubscribe(key1)
		callbacks.push(key1, throttle(callback))
	}
	function unsubscribe(key1) {
		var index = callbacks.indexOf(key1)
		if (index > -1) callbacks.splice(index, 2)
	}
	function redraw() {
		for (var i = 1; i < callbacks.length; i += 2) {
			callbacks[i]()
		}
	}
	return {subscribe: subscribe, unsubscribe: unsubscribe, redraw: redraw, render: renderService.render}
}
var redrawService = _11(window)
requestService.setCompletionCallback(redrawService.redraw)
var _16 = function(redrawService0) {
	return function(root, component) {
		if (component === null) {
			redrawService0.render(root, [])
			redrawService0.unsubscribe(root)
			return
		}
		
		if (component.view == null && typeof component !== "function") throw new Error("m.mount(element, component) expects a component, not a vnode")
		
		var run0 = function() {
			redrawService0.render(root, Vnode(component))
		}
		redrawService0.subscribe(root, run0)
		redrawService0.redraw()
	}
}
m.mount = _16(redrawService)
var Promise = PromisePolyfill
var parseQueryString = function(string) {
	if (string === "" || string == null) return {}
	if (string.charAt(0) === "?") string = string.slice(1)
	var entries = string.split("&"), data0 = {}, counters = {}
	for (var i = 0; i < entries.length; i++) {
		var entry = entries[i].split("=")
		var key5 = decodeURIComponent(entry[0])
		var value = entry.length === 2 ? decodeURIComponent(entry[1]) : ""
		if (value === "true") value = true
		else if (value === "false") value = false
		var levels = key5.split(/\]\[?|\[/)
		var cursor = data0
		if (key5.indexOf("[") > -1) levels.pop()
		for (var j = 0; j < levels.length; j++) {
			var level = levels[j], nextLevel = levels[j + 1]
			var isNumber = nextLevel == "" || !isNaN(parseInt(nextLevel, 10))
			var isValue = j === levels.length - 1
			if (level === "") {
				var key5 = levels.slice(0, j).join()
				if (counters[key5] == null) counters[key5] = 0
				level = counters[key5]++
			}
			if (cursor[level] == null) {
				cursor[level] = isValue ? value : isNumber ? [] : {}
			}
			cursor = cursor[level]
		}
	}
	return data0
}
var coreRouter = function($window) {
	var supportsPushState = typeof $window.history.pushState === "function"
	var callAsync0 = typeof setImmediate === "function" ? setImmediate : setTimeout
	function normalize1(fragment0) {
		var data = $window.location[fragment0].replace(/(?:%[a-f89][a-f0-9])+/gim, decodeURIComponent)
		if (fragment0 === "pathname" && data[0] !== "/") data = "/" + data
		return data
	}
	var asyncId
	function debounceAsync(callback0) {
		return function() {
			if (asyncId != null) return
			asyncId = callAsync0(function() {
				asyncId = null
				callback0()
			})
		}
	}
	function parsePath(path, queryData, hashData) {
		var queryIndex = path.indexOf("?")
		var hashIndex = path.indexOf("#")
		var pathEnd = queryIndex > -1 ? queryIndex : hashIndex > -1 ? hashIndex : path.length
		if (queryIndex > -1) {
			var queryEnd = hashIndex > -1 ? hashIndex : path.length
			var queryParams = parseQueryString(path.slice(queryIndex + 1, queryEnd))
			for (var key4 in queryParams) queryData[key4] = queryParams[key4]
		}
		if (hashIndex > -1) {
			var hashParams = parseQueryString(path.slice(hashIndex + 1))
			for (var key4 in hashParams) hashData[key4] = hashParams[key4]
		}
		return path.slice(0, pathEnd)
	}
	var router = {prefix: "#!"}
	router.getPath = function() {
		var type2 = router.prefix.charAt(0)
		switch (type2) {
			case "#": return normalize1("hash").slice(router.prefix.length)
			case "?": return normalize1("search").slice(router.prefix.length) + normalize1("hash")
			default: return normalize1("pathname").slice(router.prefix.length) + normalize1("search") + normalize1("hash")
		}
	}
	router.setPath = function(path, data, options) {
		var queryData = {}, hashData = {}
		path = parsePath(path, queryData, hashData)
		if (data != null) {
			for (var key4 in data) queryData[key4] = data[key4]
			path = path.replace(/:([^\/]+)/g, function(match2, token) {
				delete queryData[token]
				return data[token]
			})
		}
		var query = buildQueryString(queryData)
		if (query) path += "?" + query
		var hash = buildQueryString(hashData)
		if (hash) path += "#" + hash
		if (supportsPushState) {
			var state = options ? options.state : null
			var title = options ? options.title : null
			$window.onpopstate()
			if (options && options.replace) $window.history.replaceState(state, title, router.prefix + path)
			else $window.history.pushState(state, title, router.prefix + path)
		}
		else $window.location.href = router.prefix + path
	}
	router.defineRoutes = function(routes, resolve, reject) {
		function resolveRoute() {
			var path = router.getPath()
			var params = {}
			var pathname = parsePath(path, params, params)
			var state = $window.history.state
			if (state != null) {
				for (var k in state) params[k] = state[k]
			}
			for (var route0 in routes) {
				var matcher = new RegExp("^" + route0.replace(/:[^\/]+?\.{3}/g, "(.*?)").replace(/:[^\/]+/g, "([^\\/]+)") + "\/?$")
				if (matcher.test(pathname)) {
					pathname.replace(matcher, function() {
						var keys = route0.match(/:[^\/]+/g) || []
						var values = [].slice.call(arguments, 1, -2)
						for (var i = 0; i < keys.length; i++) {
							params[keys[i].replace(/:|\./g, "")] = decodeURIComponent(values[i])
						}
						resolve(routes[route0], params, path, route0)
					})
					return
				}
			}
			reject(path, params)
		}
		if (supportsPushState) $window.onpopstate = debounceAsync(resolveRoute)
		else if (router.prefix.charAt(0) === "#") $window.onhashchange = resolveRoute
		resolveRoute()
	}
	return router
}
var _20 = function($window, redrawService0) {
	var routeService = coreRouter($window)
	var identity = function(v) {return v}
	var render1, component, attrs3, currentPath, lastUpdate
	var route = function(root, defaultRoute, routes) {
		if (root == null) throw new Error("Ensure the DOM element that was passed to `m.route` is not undefined")
		var run1 = function() {
			if (render1 != null) redrawService0.render(root, render1(Vnode(component, attrs3.key, attrs3)))
		}
		var bail = function(path) {
			if (path !== defaultRoute) routeService.setPath(defaultRoute, null, {replace: true})
			else throw new Error("Could not resolve default route " + defaultRoute)
		}
		routeService.defineRoutes(routes, function(payload, params, path) {
			var update = lastUpdate = function(routeResolver, comp) {
				if (update !== lastUpdate) return
				component = comp != null && (typeof comp.view === "function" || typeof comp === "function")? comp : "div"
				attrs3 = params, currentPath = path, lastUpdate = null
				render1 = (routeResolver.render || identity).bind(routeResolver)
				run1()
			}
			if (payload.view || typeof payload === "function") update({}, payload)
			else {
				if (payload.onmatch) {
					Promise.resolve(payload.onmatch(params, path)).then(function(resolved) {
						update(payload, resolved)
					}, bail)
				}
				else update(payload, "div")
			}
		}, bail)
		redrawService0.subscribe(root, run1)
	}
	route.set = function(path, data, options) {
		if (lastUpdate != null) {
			options = options || {}
			options.replace = true
		}
		lastUpdate = null
		routeService.setPath(path, data, options)
	}
	route.get = function() {return currentPath}
	route.prefix = function(prefix0) {routeService.prefix = prefix0}
	route.link = function(vnode1) {
		vnode1.dom.setAttribute("href", routeService.prefix + vnode1.attrs.href)
		vnode1.dom.onclick = function(e) {
			if (e.ctrlKey || e.metaKey || e.shiftKey || e.which === 2) return
			e.preventDefault()
			e.redraw = false
			var href = this.getAttribute("href")
			if (href.indexOf(routeService.prefix) === 0) href = href.slice(routeService.prefix.length)
			route.set(href, undefined, undefined)
		}
	}
	route.param = function(key3) {
		if(typeof attrs3 !== "undefined" && typeof key3 !== "undefined") return attrs3[key3]
		return attrs3
	}
	return route
}
m.route = _20(window, redrawService)
m.withAttr = function(attrName, callback1, context) {
	return function(e) {
		callback1.call(context || this, attrName in e.currentTarget ? e.currentTarget[attrName] : e.currentTarget.getAttribute(attrName))
	}
}
var _28 = coreRenderer(window)
m.render = _28.render
m.redraw = redrawService.redraw
m.request = requestService.request
m.jsonp = requestService.jsonp
m.parseQueryString = parseQueryString
m.buildQueryString = buildQueryString
m.version = "1.1.3"
m.vnode = Vnode
if (typeof module !== "undefined") module["exports"] = m
else window.m = m
}());
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[2]);
