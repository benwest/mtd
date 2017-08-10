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