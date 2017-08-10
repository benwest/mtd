precision highp float;

uniform vec2 resolution;
uniform vec3 background;
uniform float radius;
uniform float blur;
uniform float threshold;
uniform float margin;

uniform vec2 positions[ 3 ];
uniform vec2 sizes[ 3 ];
uniform vec3 colors[ 3 ];
uniform float blurs[ 3 ];

float maxComponent ( vec3 v ) {
    
    return max( max( v.x, v.y ), v.z );
    
}

float box ( vec2 p, vec2 position, vec2 size ) {
    
    vec2 d = abs( p - position ) - size * .5;
    
    return min( max( d.x, d.y ), 0. ) + length( max( d, 0. ) );
    
}

float roundedBox( vec2 p, vec2 position, vec2 size, float radius ) {
    
    return box( p, position, size - vec2( radius * 2. ) ) - radius;
    
}

void main () {
    
    vec2 p = gl_FragCoord.xy;
    
    vec3 color = vec3( 0.0 );
    
    // float mask = 0.0;
    
    // float prev = 0.0;
    
    for ( int i = 0; i < 3; i++ ) {
        
        float blob = smoothstep( blur, 0., roundedBox( p, positions[ i ], sizes[ i ], radius ) );
        
        color += blob * colors[ i ];
        
        // mask = max( mask, length( vec2( blob, prev ) ) );
        
        // prev = blob;
        
    //     float blob = roundedBox( p, positions[ i ], sizes[ i ], radius );
        
    //     float blurredBlob = clamp( ( blob + blur ) / blur, 0., 1. );
        
    //     color += blurredBlob * colors[ i ] * blurs[ i ];
        
    }
    
    float frameStart = margin - blur * .5;
    float frameEnd = margin + blur * .5;
    
    float frame = 
        smoothstep( frameStart, frameEnd, p.x ) * 
        smoothstep( resolution.x - frameStart, resolution.x - frameEnd, p.x ) * 
        smoothstep( frameStart, frameEnd, p.y ) * 
        smoothstep( resolution.y - frameStart, resolution.y - frameEnd, p.y );
    
    
    // float mask = length( vec4( color, frame ) ) / length( vec2( 1. ) );
    
    // gl_FragColor = vec4( vec3( mask ), 1. );
    
    // gl_FragColor = vec4( mix( background, color, step( 1., mask ) ), 1. );
    
    
    
    // gl_FragColor = vec4( vec3( color.r + color.g + color.b ), 1. );
    
    // frame = 1.;
    
    float mask = step( 1., length( color ) );
    
    gl_FragColor = vec4( mix( background, color, mask ), 1. );
    
}