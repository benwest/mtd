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