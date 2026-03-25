const { SerialPort } = require( 'serialport' );
const { ReadlineParser } = require( '@serialport/parser-readline' );
let port, parser
let connected = false;
let scanInterval;

module.exports = {
    //TODO add a listener for key presses
    scan,
    connect,
    stopScan,
    send,
    invoke,
    on,
    onClose: setOnClose,
    disconnect
}

let onNextJson;
let onMsg = {};
let onClose;

function normalizeMessage( msg ) {
    return String( msg || "" ).trim().replace( /^-\s*/, '' );
}

function onMessage( msg ) {
    const normalized = normalizeMessage( msg );

    if ( onNextJson && ( normalized[0] === "{" || normalized[0] === "[" ) ) {
        onNextJson( JSON.parse( normalized ) );
        onNextJson = "";
    } else if ( normalized.startsWith( 'module ' ) && typeof onMsg.module === 'function' ) {
        onMsg.module( normalized );
    } else if ( normalized.startsWith( 'status ' ) && typeof onMsg.status === 'function' ) {
        onMsg.status( normalized );
    } else if ( Object.keys( onMsg ).includes( normalized.match( /^\w*/ )[0] ) ) {
        onMsg[normalized.match( /^\w*/ )[0]]( normalized );
    } else {
        console.log( "Unknown command from serial:\t", normalized );
    }
}

function on( command, callback ) {
    onMsg[command] = callback;
}

function setOnClose( callback ) {
    onClose = callback
}


function scan( callback ) {
    scanInterval = setInterval( async () => {
        callback( await SerialPort.list() );
    }, 2000 );
}

function stopScan() {
    clearInterval( scanInterval );
    scanInterval = null;
}

function connect( path ) {
    return new Promise( ( resolve ) => {
        stopScan();
        port = new SerialPort( { path: path, baudRate: 14400, autoOpen: false, } );
        port.on( 'open', function () {
            connected = true;
            resolve();
        } );
        port.open( function ( err ) {
            if ( err ) {
                console.error( 'Error opening port: ', err.message );
                return false;
            }
        } )
        parser = port.pipe( new ReadlineParser( { delimiter: '\r\n' } ) );
        parser.on( 'data', onMessage );
        port.on( 'close', () => {
            port = null;
            parser = null;
            if ( typeof onClose === "function" ) {
                onClose();
            }
        } )
    } )
}

function send( msg ) {
    //TODO check to see if initialized

    try {
        //console.log( "sending: ", msg );
        port.write( msg );
        port.write( '\r\n' );
    } catch ( e ) {
        console.error( "error sending serial port data", e );
        return false;
    }
    return true;
}

function invoke( msg ) {
    return new Promise( ( resolve ) => {
        send( msg );
        onNextJson = list => {
            resolve( list );
        };
    } );
}

function disconnect(){
    port.close();
}
