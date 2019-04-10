const Page = require( 'wdio-mediawiki/Page' );

class VersionPage extends Page {
	get extension() {
		return browser.element( '#mw-version-ext-wikibase-WikibaseMediaInfo' );
	}

	open() {
		super.openTitle( 'Special:Version' );
	}
}

module.exports = new VersionPage();
