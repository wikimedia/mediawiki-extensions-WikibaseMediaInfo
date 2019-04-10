var assert = require( 'assert' ),
	path = require( 'path' ),
	fs = require( 'fs' ),
	tmp = require( 'tmp' ),
	imageGenerator = require( '../support/js-image-generator.js' ),
	UploadPage = require( '../pageobjects/upload.page' ),
	FilePage = require( '../pageobjects/file.page' ),
	LoginPage = require( '../pageobjects/login.page.js' );

describe( 'Upload tasks - logged in user', function () {
	var destinationName;

	beforeEach( function () {
		destinationName = 'RandomImage ' + Math.random().toString().substring( 2 ) + '.jpg';
		browser.deleteCookie();
	} );

	it( 'Logged-in user can upload a file', function () {
		var filename = 'random.jpg',
			tmpDir = tmp.dirSync(),
			filePath = path.join( tmpDir.name, filename ),
			summaryText = 'This is a test image',
			originalSource = 'Randomly generated image',
			license = 'self|Cc-zero';

		// Generate a random unique image to upload
		imageGenerator.generateImage( 800, 600, 80, function ( err, image ) {
			fs.writeFileSync( filePath, image.data );

			LoginPage.loginUser();
			browser.pause( 2000 );
			UploadPage.open();
			browser.pause( 2000 ); // wait for upload form to completely load

			UploadPage.upload(
				filePath,
				destinationName,
				summaryText,
				originalSource,
				license
			);

			// Wait for redirect to File page of newly uploaded image
			browser.waitUntil( function () {
				return UploadPage.heading.getText() === 'File:' + destinationName;
			}, 5000, 'Expected file to be saved.' );

			assert( FilePage.captionsPanel.waitForVisible() );
		} );
	} );
} );
