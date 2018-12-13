( function ( sd ) {

	'use strict';

	/**
	 * Widget containing an element that makes a CaptionPanel editable when clicked
	 *
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {Object} headerClass CSS class of captions header element
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
				captionsPanel.refreshAndMakeEditable();
			} )
			.$element;

		this.initialize = function () {
			// Only allow editing if we're NOT on a diff page or viewing an older revision
			if ( $( '.diff' ).length === 0 && $( '.mw-revision' ).length === 0 ) {
				$( '.' + config.headerClass ).append( $element );
			}
		};

		this.show = function () {
			$element.show();
		};

		this.hide = function () {
			$element.hide();
		};
	};

}( mw.mediaInfo.structuredData ) );
