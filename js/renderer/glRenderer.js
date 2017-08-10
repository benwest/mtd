var fragmentShaderSource = require('glslify').file('./shader.glsl');

module.exports = ( gl, setSize ) => {

    var vs = gl.createShader( gl.VERTEX_SHADER );
    
    gl.shaderSource( vs, `
                
        precision highp float;
        attribute vec3 position;
        
        void main () {
            gl_Position = vec4( position, 1. );
        }
            
    `);
    
    gl.compileShader( vs );
    
    var fs = gl.createShader( gl.FRAGMENT_SHADER );
    
    gl.shaderSource( fs, fragmentShaderSource );
    
    gl.compileShader( fs );
    
    var shader = gl.createProgram();
    
    gl.attachShader( shader, vs );
    gl.attachShader( shader, fs );
    gl.linkProgram( shader );
    gl.useProgram( shader );
    
    var triangle = new Float32Array([
        -1, -1, 0,
        -1, 3, 0,
        3, -1, 0
    ])
    
    gl.bindBuffer( gl.ARRAY_BUFFER, gl.createBuffer() );
    gl.bufferData( gl.ARRAY_BUFFER, triangle, gl.STATIC_DRAW );
    
    var aPosition = gl.getAttribLocation( shader, "position" );
    
    gl.enableVertexAttribArray( aPosition );
    gl.vertexAttribPointer( aPosition, 3, gl.FLOAT, false, 0, 0 );
    
    var uResolution = gl.getUniformLocation( shader, "resolution" );
    var uBackground = gl.getUniformLocation( shader, "background" );
    
    var uRadius = gl.getUniformLocation( shader, "radius" );
    var uBlur = gl.getUniformLocation( shader, "blur" );
    var uMargin = gl.getUniformLocation( shader, "margin" );
    
    var uPostions = gl.getUniformLocation( shader, "positions[0]" );
    var uSizes = gl.getUniformLocation( shader, "sizes[0]" );
    var uColors = gl.getUniformLocation( shader, "colors[0]" );

    var positions = new Float32Array( 6 );
    var sizes = new Float32Array( 6 );
    var colors = new Float32Array( 9 );

    return vm => {
        
        setSize( vm.size[ 0 ], vm.size[ 1 ] );
        
        gl.viewport( 0, 0, vm.size[ 0 ], vm.size[ 1 ] );
            
        gl.uniform2fv( uResolution, new Float32Array( vm.size ) );
        
        gl.uniform3fv( uBackground, new Float32Array( vm.backgroundColor ) );
        gl.uniform1f( uRadius, vm.cornerRadius );
        gl.uniform1f( uBlur, vm.blur );
        gl.uniform1f( uMargin, vm.margin );
    
        vm.blobs.forEach( ( { color, position, size, blur }, i ) => {
            
            positions[ i * 2 + 0 ] = position[ 0 ];
            positions[ i * 2 + 1 ] = vm.size[ 1 ] - position[ 1 ];
            
            sizes[ i * 2 + 0 ] = size[ 0 ];
            sizes[ i * 2 + 1 ] = size[ 1 ];
            
            colors[ i * 3 + 0 ] = color[ 0 ];
            colors[ i * 3 + 1 ] = color[ 1 ];
            colors[ i * 3 + 2 ] = color[ 2 ];
    
        })
        
        gl.uniform2fv( uPostions, positions );
        gl.uniform2fv( uSizes, sizes );
        gl.uniform3fv( uColors, colors );

        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT );
        
        gl.drawArrays( gl.TRIANGLES, 0, 3 );
        
    }
    
}