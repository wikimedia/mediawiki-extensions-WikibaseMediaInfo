'use strict';

// note: this file (and these properties) will go away,
// and you'll need to require the relevant classes you
// intend to use instead of pulling them out of
// mw.mediaInfo.statements

mw.mediaInfo = mw.mediaInfo || {};
mw.mediaInfo.statements = mw.mediaInfo.statements || {
	EntityInputWidget: require( './EntityInputWidget.js' ),
	EntityLookupElement: require( './EntityLookupElement.js' ),
	FormatValueElement: require( './FormatValueElement.js' ),
	ItemInputWidget: require( './ItemInputWidget.js' ),
	ItemWidget: require( './ItemWidget.js' ),
	QualifierValueInputWidget: require( './QualifierValueInputWidget.js' ),
	QualifierWidget: require( './QualifierWidget.js' ),
	StatementWidget: require( './StatementWidget.js' ),
	// backward compatibility: this class used to be named differently
	DepictsWidget: require( './StatementWidget.js' )
};
