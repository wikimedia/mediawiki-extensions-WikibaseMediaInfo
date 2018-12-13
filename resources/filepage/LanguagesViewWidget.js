( function ( sd ) {

	'use strict';

	/**
	 * Widget that shows/hides languages on click
	 *
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {Object} contentClass CSS class of captions container
	 */
	sd.LanguagesViewWidget = function LanguagesViewWidget( config ) {
		var self = this,
			contentSelector = '.' + config.contentClass;

		var viewMoreButton = new OO.ui.ButtonWidget( {
			icon: 'expand',
			flags: 'progressive',
			label: mw.message(
				'wikibasemediainfo-filepage-more-languages',
				$( contentSelector ).find( '.entity-term' ).length - 1
			).text(),
			framed: false
		} )
			.on(
				'click',
				function () {
					self.expand();
				}
			);

		var viewMore = new OO.ui.Element( {
			content: [ viewMoreButton ],
			classes: [ 'viewMore' ]
		} );

		var viewLessButton = new OO.ui.ButtonWidget( {
			icon: 'collapse',
			flags: 'progressive',
			label: mw.message(
				'wikibasemediainfo-filepage-fewer-languages'
			).text(),
			framed: false
		} )
			.on(
				'click',
				function () {
					self.collapse();
				}
			);

		var viewLess = new OO.ui.Element( {
			content: [ viewLessButton ],
			classes: [ 'viewLess' ]
		} );

		this.refreshLabel = function () {
			var hideableRowCount = $( contentSelector )
				.find( '.entity-term:not(.showLabel)' ).length;
			viewMoreButton.setLabel(
				mw.message(
					'wikibasemediainfo-filepage-more-languages',
					hideableRowCount
				).text()
			);
		};

		this.expand = function () {
			var $captionsContent = $( contentSelector );
			viewMore.$element.detach();
			$captionsContent.find( '.entity-term' ).show();
			if ( $captionsContent.find( '.entity-term:not(.showLabel)' ).length > 0 ) {
				$captionsContent.append( viewLess.$element );
			}
		};

		this.collapse = function () {
			var $captionsContent = $( contentSelector ),
				$rows = $captionsContent.find( '.entity-term:not(.showLabel)' );
			var rowCount = $rows.length;
			if ( rowCount < 1 ) {
				return;
			}
			viewLess.$element.detach();
			$rows.hide();
			$captionsContent.append( viewMore.$element );
		};

		this.hide = function () {
			$( contentSelector ).find( '.entity-term' ).show();
			viewLess.$element.detach();
			viewMore.$element.detach();
		};
	};

}( mw.mediaInfo.structuredData ) );
