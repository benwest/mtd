var m = require('mithril');
var state = require('./state/state');

var recorder = {
    
    recording: false,
    
    state: {},
    
    startTime: 0,
    
    record: () => {
        
        recorder.state = {
            
            config: Object.assign( {}, state.config ),
            
            blobs: state.blobs.map( ({position, direction, color, size}) => {
                
                return { position, direction, color, size }
                
            }),
            
            words: state.words.map(({position}) => {
                
                return { position };
                
            })
            
        }
        
        recorder.recording = true;
        recorder.startTime = Date.now() / 1000;
        
    },
    
    cancel: () => {
        
        recorder.recording = false;
        
    },
    
    done: () => {
        
        var duration = ( Date.now() / 1000 ) - recorder.startTime;
        
        m.request({
            method: 'POST',
            url: 'http://95.85.2.199:8080/render',
            data: { state: recorder.state, duration }
        })
        
        recorder.recording = false;
        
    }
    
}

var UI = {
    
    oninit: vnode => {
        
        vnode.state.status = null;
        
        var update = () => {
            
            m.request({
                method: 'GET',
                url: 'http://95.85.2.199:8080/status'
            }).then( r => {
                vnode.state.status = r;
                setTimeout( update, 500 );
            })
            
        }
        
        update();
        
    },
    
    view: vnode => {
        
        return [
            m('.buttons',
                m('button', {
                    disabled: recorder.recording,
                    onclick: recorder.record
                }, 'Record'),
                m('button', {
                    disabled: !recorder.recording,
                    onclick: recorder.done
                }, 'Done'),
                m('button', {
                    disabled: !recorder.recording,
                    onclick: recorder.cancel
                }, 'Cancel')
            ),
            
            vnode.state.status === null ?
                'Renderer busy, waiting...'
            :
                m('ul', vnode.state.status.map( item => {
                    
                    if ( item.done ) {
                        
                        return m('li', m('a', {
                            href: 'http://95.85.2.199:8080/' + item.url,
                            target: '_blank'
                        }, item.url ) )
                        
                    } else {
                        
                        return m('li', `rendered ${item.progress} frames` );
                        
                    }
                    
                }))
        ]

        
    }
    
}

var container = document.createElement('div');
container.classList.add('recorder');
document.body.appendChild( container );

m.mount( container, UI );

module.exports = recorder;