const Page = require( 'wdio-mediawiki/Page' );

class UploadPage extends Page {
	get uploadButton() {
		return $( '#wpUploadFile' );
	}

	get submitButton() {
		return $( 'input[name="wpUpload"]' );
	}

	get filename() {
		return $( '#wpDestFile' );
	}

	get summary() {
		return $( '#wpUploadDescription' );
	}

	get heading() {
		return $( '#firstHeading' );
	}

	open() {
		super.openTitle( 'Special:Upload' );
	}

	upload( file, destinationName, summaryText, license ) {
		// Choose file to upload
		browser.chooseFile( '#wpUploadFile', file );

		// Input all attributes required by Commons
		this.filename.setValue( destinationName );
		this.summary.setValue( summaryText );
		browser.selectByValue( '#wpLicense', license );

		// Submit the form
		this.submitButton.click();
	}
}

module.exports = new UploadPage();
