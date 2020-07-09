'use strict';

/**
 * Page protection message to indicate user's ability to edit media info.
 */
var ProtectionMsgWidget = function () {
	this.message = mw.config.get( 'wbmiProtectionMsg' );
	this.widget = new OO.ui.Widget( $.extend( {
		$content: this.message,
		classes: [ 'wbmi-protection-message' ]
	} ) );

	this.render();
};

ProtectionMsgWidget.prototype.render = function () {
	var data,
		template;

	data = {
		shouldDisplay: this.shouldDisplay(),
		widget: this.widget
	};

	template = mw.template.get(
		'wikibase.mediainfo.filePageDisplay',
		'templates/filepage/ProtectionMsgWidget.mustache+dom'
	);

	this.$element = template.render( data );
};

/**
 * Returns whether or not the widget should be displayed, based on the presence
 * of a page protection message.
 *
 * @return {boolean}
 */
ProtectionMsgWidget.prototype.shouldDisplay = function () {
	return !!this.message;
};

module.exports = ProtectionMsgWidget;
