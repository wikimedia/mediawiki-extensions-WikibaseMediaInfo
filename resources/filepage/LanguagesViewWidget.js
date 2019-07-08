'use strict';

var LanguagesViewWidget;

/**
 * Widget that shows/hides languages on click
 *
 * @constructor
 * @param {Object} [config]
 * @cfg {Object} classes CSS classes of DOM elements (content and entityTerm)
 */
LanguagesViewWidget = function ( config ) {
	var self = this,
		contentSelector = '.' + config.classes.content,
		entityTermSelector = '.' + config.classes.entityTerm,
		viewMoreButton = new OO.ui.ButtonWidget( {
			icon: 'expand',
			flags: 'progressive',
			label: mw.message(
				'wikibasemediainfo-filepage-more-languages',
				$( contentSelector ).find( entityTermSelector ).length - 1
			).text(),
			framed: false
		} )
			.on(
				'click',
				function () {
					self.expand();
				}
			),
		viewMore = new OO.ui.Element( {
			content: [ viewMoreButton ],
			classes: [ 'wbmi-entityview-viewMoreButton' ]
		} ),
		viewLessButton = new OO.ui.ButtonWidget( {
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
			),
		viewLess = new OO.ui.Element( {
			content: [ viewLessButton ],
			classes: [ 'wbmi-entityview-viewLessButton' ]
		} );

	this.refreshLabel = function () {
		var hideableRowCount = $( contentSelector )
			.find( entityTermSelector + ':not(.wbmi-entityview-showLabel)' ).length;

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
		$captionsContent.find( entityTermSelector ).show();
		if ( $captionsContent.find( entityTermSelector + ':not(.wbmi-entityview-showLabel)' ).length > 0 ) {
			$captionsContent.append( viewLess.$element );
		}
	};

	this.collapse = function () {
		var $captionsContent = $( contentSelector ),
			$rows = $captionsContent.find( entityTermSelector + ':not(.wbmi-entityview-showLabel)' ),
			rowCount = $rows.length;

		if ( rowCount < 1 ) {
			return;
		}
		viewLess.$element.detach();
		$rows.hide();
		$captionsContent.append( viewMore.$element );
	};

	this.hide = function () {
		$( contentSelector ).find( entityTermSelector ).show();
		viewLess.$element.detach();
		viewMore.$element.detach();
	};
};

module.exports = LanguagesViewWidget;
