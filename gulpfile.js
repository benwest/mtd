var DIRS = ['.'];
var PRODUCTION = false;

var fs = require('fs');
var path = require('path');

var gulp = require('gulp');
var gutil = require('gulp-util');

var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');

var browserify = require('browserify');
var watchify = require('watchify');
var uglify = require('gulp-uglify');
var streamify = require('gulp-streamify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
// var glslify = require('glslify');

var DEFAULT_INDEX = fs.readFileSync( path.join( '_base', 'index.html' ), 'utf8' );

function scssTask ( dir ) {
    
    return function () {
    
        gulp.src( path.join( dir, 'scss', 'style.scss' ) )
            .pipe( sass().on('error', sass.logError ) )
            .pipe( autoprefixer({
                browsers: ['>1%']
            }))
            .pipe( gulp.dest( dir ) );
            
        console.log( 'Compiled', path.join( dir, 'style.css' ) );
            
    }
    
}

function watchScss ( dir ) {
    
    var task = scssTask( dir );
    var watchPath = path.join( dir, 'scss', '**', '*' );
    gulp.watch( watchPath, task );
    task();
    
}

function bundler ( b, dir ) {
    
    return function () {
        
        var stream = b.bundle()
            .on( 'error', gutil.log.bind(gutil, 'Browserify Error:') )
            .pipe( source( path.join( dir, 'bundle.js' ) ) )
            .pipe( buffer() );
            
        if ( PRODUCTION ) stream.pipe( streamify( uglify() ) )
        
        stream.pipe( gulp.dest( '.' ) );
        
        console.log( 'Compiled', path.join( dir, 'bundle.js' ) );
        
    }
    
}

function watchJs ( dir ) {
    
    var args = Object.assign({
        entries: [ path.join( dir, 'js', 'main.js' ) ]
    }, watchify.args );
    
    var b = watchify( browserify( args ) );
    
    b.transform( 'glslify' );
    
    if ( PRODUCTION ) b.transform( 'babelify', { presets: ['es2015'] } )
    
    var bundle = bundler( b, dir );
    
    b.on( 'update', bundle );
    //b.on( 'log', gutil.log );
    
    bundle();
    
}

function createIfAbsent ( file, contents ) {
    
    if ( fs.existsSync( file ) ) return;
    
    if ( file.indexOf( '.' ) === -1 ) {
        
        fs.mkdirSync( file );
        
    } else {
        
        fs.writeFileSync( file, contents || '' );
        
    }
    
    console.log( 'Created', file );
    
}

function createProject ( dir ) {
    
    createIfAbsent( dir );
    
    createIfAbsent( path.join( dir, 'scss' ) );
    createIfAbsent( path.join( dir, 'scss', 'style.scss' ) );
    
    createIfAbsent( path.join( dir, 'js' ) );
    createIfAbsent( path.join( dir, 'js', 'main.js' ) );
    
    createIfAbsent( path.join( dir, 'index.html' ), DEFAULT_INDEX );
    
}

gulp.task( 'default', function(){
    
    DIRS.forEach( dir => {
        
        createProject( dir );
        
        watchScss( dir );
        
        watchJs( dir );
        
    });
    
});