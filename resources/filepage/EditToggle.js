( function ( sd ) {

	'use strict';

	/**
	 * Widget containing an element that makes an SDC panel editable when clicked
	 *
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {string} prependToSelector Selector for element to append this to
	 * @cfg {string} titleKey i18n key for title text for the link
	 * @param {object} sdcPanel Structured Data Panel object (with makeEditable() method)
	 */
	sd.EditToggle = function EditToggle( config, sdcPanel ) {

		this.$element = new OO.ui.ButtonWidget( {
			icon: 'edit',
			framed: false,
			title: mw.message( config.titleKey ).text(),
			classes: [ 'wbmi-entityview-editButton' ]
		} )
			.on( 'click', function () {
				sdcPanel.makeEditable();
			} )
			.$element;

		this.show = function () {
			this.$element.show();
		};

		this.hide = function () {
			this.$element.hide();
		};
	};

}( mw.mediaInfo.structuredData ) );
