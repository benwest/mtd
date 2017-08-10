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