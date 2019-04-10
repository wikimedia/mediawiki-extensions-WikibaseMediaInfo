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
		return browser.element( '#wpDescText1' );
	}

	get author() {
		return browser.element( '#wpAuthor' );
	}

	get originalSource() {
		return browser.element( '#wpSource' );
	}

	get heading() {
		return browser.element( '#firstHeading' );
	}

	open() {
		super.openTitle( 'Special:Upload' );
	}

	upload( file, destinationName, summaryText, originalSource, license ) {
		// Choose file to upload
		browser.chooseFile( '#wpUploadFile', file );

		// Input all attributes required by Commons
		this.filename.setValue( destinationName );
		this.author.setValue( 'Automated test' );
		this.summary.setValue( summaryText );
		this.originalSource.setValue( originalSource );
		browser.selectByValue( '#wpLicense', license );

		// Submit the form
		this.submitButton.click();
	}
}

module.exports = new UploadPage();
