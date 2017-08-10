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