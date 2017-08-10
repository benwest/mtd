var opentype = require('opentype.js');
var fs = require('fs');

var data = [{
    text: 'MINDING',
    font: 'fonts/HaasUnica.ttf',
    scale: 1,
    tracking: 0
},{
    text: 'THE DIGITAL',
    font: 'fonts/HaasUnica.ttf',
    scale: 1,
    tracking: 0
},{
    text: '数字之维',
    font: 'fonts/FZLTZHK--GBK1-0.ttf',
    scale: .87,
    tracking: 2/60
}].map( config => {
    
    var font = opentype.loadSync( config.font );
    
    var offset = 0;
    
    var letters = config.text.split('').map( letter => {
        
        var width = font.getAdvanceWidth( letter, config.scale );
        
        var l = {
            width: width,
            offset: offset + width / 2,
            path: font.getPath( letter, 0, 0, config.scale ).commands
        };
        
        offset += width + config.tracking;
        
        return l;
        
    });
    
    var width = offset - config.tracking;
    
    letters.forEach( l => l.offset -= width / 2 );
    
    return { width: width, letters: letters };
    
});

fs.writeFileSync( 'js/text.json', JSON.stringify( data ) );