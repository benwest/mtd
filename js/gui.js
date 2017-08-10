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