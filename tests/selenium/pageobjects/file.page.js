'use strict';

const Page = require( 'wdio-mediawiki/Page' );

class FilePage extends Page {
	get captionsPanel() {
		return $( '.wbmi-entityview-captionsPanel' );
	}

	get captionsEditButton() {
		return $( '.wbmi-entityview-editButton .oo-ui-buttonElement-button' );
	}

	get captionsInput() {
		return $( '.wbmi-caption-textInput input' );
	}

	get publishButton() {
		return $(
			'.wbmi-entityview-cancelAndPublishButtons .oo-ui-flaggedElement-primary'
		);
	}

	get statementsPanel() {
		return $( '.wbmi-entityview-statementsGroup' );
	}

	get tabsSelector() {
		return '.wbmi-tabs-container .oo-ui-tabOptionWidget';
	}

	open() {
		super.openTitle( 'Special:Random/File' );
	}

	/**
	 * TODO: Is there a better way to programatically select a given tab
	 * (Captions vs Structured Data vs whatever else may be added in the future)?
	 * These elements do not have unique IDs and I do not want to rely on the
	 * label text. This solution relies on order in the DOM, which also seems
	 * subject to change.
	 */
	clickStatementsTab() {
		browser.click( `${this.tabsSelector}:nth-of-type(2)` );
	}

	/**
	 * TODO: same problem here as above
	 */
	clickCaptionsTab() {
		browser.click( `${this.tabsSelector}:nth-of-type(1)` );
	}

	editCaption( captionText ) {
		this.captionsEditButton.click();
		browser.pause( 3000 );
		this.captionsInput.setValue( captionText );
		this.publishButton.click();
	}
}

module.exports = new FilePage();
