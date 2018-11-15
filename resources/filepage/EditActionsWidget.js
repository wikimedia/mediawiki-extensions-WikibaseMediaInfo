( function ( sd ) {

	'use strict';

	/**
	 * Widget containing other widgets to add a row, cancel, and save multi-lingual caption data
	 *
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {Object} table jquery table element containing the existing data
	 * @param {object} captionsPanel CaptionsPanel object
	 */
	sd.EditActionsWidget = function EditActionsWidget( config, captionsPanel ) {

		var addCaptionButton = new OO.ui.ButtonWidget( {
			icon: 'add',
			label: mw.message( 'wikibasemediainfo-filepage-add-caption' ).text(),
			flags: 'progressive',
			classes: [ 'addMore' ],
			framed: false
		} )
			.on( 'click', function () {
				captionsPanel.addNewEditableLanguageRow();
			} );

		var cancelButton = new OO.ui.ButtonWidget( {
			framed: false,
			flags: [
				'destructive'
			],
			label: mw.message( 'wikibasemediainfo-filepage-cancel' ).text()
		} )
			.on( 'click', function () {
				captionsPanel.makeReadOnly();
			} );

		var publishButton = new OO.ui.ButtonInputWidget( {
			type: 'submit',
			useInputTag: true,
			label: mw.message( 'wikibasemediainfo-filepage-publish' ).text(),
			flags: [
				'primary',
				'progressive'
			]
		} )
			.on( 'click', function () {
				captionsPanel.sendData();
			} );

		var $element = $( '<tr>' )
			.addClass( 'editActions' )
			.append(
				$( '<td>' )
					.attr( 'colspan', 2 )
					.append(
						addCaptionButton.$element,
						$( '<div>' )
							.addClass( 'cancelAndPublish' )
							.append( cancelButton.$element, publishButton.$element )
					)
			);

		this.hide = function () {
			$element.detach();
		};

		this.show = function () {
			$( '.' + config.tableClass ).append( $element );
		};

		this.disablePublish = function () {
			publishButton.setDisabled( true );
		};

		this.enablePublish = function () {
			publishButton.setDisabled( false );
		};

		this.setStateSending = function () {
			publishButton.setDisabled( true );
			cancelButton.$element.hide();
			addCaptionButton.$element.hide();
		};

		this.setStateReady = function () {
			publishButton.setDisabled( false );
			cancelButton.$element.show();
			addCaptionButton.$element.show();
		};
	};

}( mw.mediaInfo.structuredData ) );
