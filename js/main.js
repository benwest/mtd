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