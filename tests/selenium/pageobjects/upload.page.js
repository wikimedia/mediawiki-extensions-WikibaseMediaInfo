const Page = require( 'wdio-mediawiki/Page' );

class UploadPage extends Page {
	get uploadButton() {
		return browser.element( '#wpUploadFile' );
	}

	get submitButton() {
		return browser.element( 'input[name="wpUpload"]' );
	}

	get filename() {
		return browser.element( '#wpDestFile' );
	}

	get summary() {
		return browser.element( '#wpUploadDescription' );
	}

	get licensing() {
		return browser.element( '#wpLicense' );
	}

	get heading() {
		return browser.element( '#firstHeading' );
	}

	open() {
		super.openTitle( 'Special:Upload' );
	}

	upload( file, destinationName, summaryText ) {
		browser.chooseFile( '#wpUploadFile', file );
		this.filename.setValue( destinationName );
		this.summary.setValue( summaryText );
		this.submitButton.click();
	}
}

module.exports = new UploadPage();
