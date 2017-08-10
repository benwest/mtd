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