( function ( mw, sd ) {

	'use strict';

	/**
	 * Widget containing an element that makes a CaptionPanel editable when clicked
	 *
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {Object} header jquery element containing the panel header
	 * @param {object} captionsPanel CaptionsPanel object
	 */
	sd.EditToggle = function EditToggle( config, captionsPanel ) {

		var $element = new OO.ui.ButtonWidget( {
			icon: 'edit',
			framed: false,
			title: mw.message( 'wikibasemediainfo-filepage-edit-captions' ).text(),
			classes: [ 'editButton' ]
		} )
		.on( 'click', function () {
			captionsPanel.makeEditable();
		} )
		.$element;

		config.header.append( $element );

		this.show = function () {
			$element.show();
		};

		this.hide = function () {
			$element.hide();
		};
	};

}( mediaWiki, mediaWiki.mediaInfo.structuredData ) );
