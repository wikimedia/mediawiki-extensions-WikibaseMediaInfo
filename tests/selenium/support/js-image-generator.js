// Adapted from: https://github.com/ashupp/js-image-generator/blob/master/index.js

'use strict';

const Buffer = require( 'buffer' ).Buffer;
const jpeg = require( 'jpeg-js' );

/**
 * Generates an random colored image with specified width, height and quality
 *
 * @param {number} width width of the image
 * @param {number} height height of the image
 * @param {number} quality quality of the image
 * @param {Function} callback callback
 */
exports.generateImage = function ( width, height, quality, callback ) {
	const frameData = Buffer.alloc( width * height * 4 );
	let i = 0;
	while ( i < frameData.length ) {
		frameData[ i++ ] = Math.floor( Math.random() * 256 );
	}
	const rawImageData = {
		data: frameData,
		width: width,
		height: height
	};
	const jpegImageData = jpeg.encode( rawImageData, quality );
	if ( jpegImageData ) {
		callback( null, jpegImageData );
	}
};
