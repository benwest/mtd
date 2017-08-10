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