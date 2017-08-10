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