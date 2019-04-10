// Adapted from: https://github.com/ashupp/js-image-generator/blob/master/index.js

var Buffer = require( 'buffer' ).Buffer;
var jpeg = require( 'jpeg-js' );

/**
 * Generates an random colored image with specified width, height and quality
 * @param {number} width width of the image
 * @param {number} height height of the image
 * @param {number} quality quality of the image
 * @param {Function} callback callback
 */
exports.generateImage = function ( width, height, quality, callback ) {
	var frameData = Buffer.alloc( width * height * 4 );
	var i = 0;
	while ( i < frameData.length ) {
		frameData[ i++ ] = Math.floor( Math.random() * 256 );
	}
	var rawImageData = {
		data: frameData,
		width: width,
		height: height
	};
	var jpegImageData = jpeg.encode( rawImageData, quality );
	if ( jpegImageData ) {
		callback( null, jpegImageData );
	}
};
