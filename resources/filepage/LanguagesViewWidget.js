( function ( sd ) {

	'use strict';

	/**
	 * Widget that shows/hides languages on click
	 *
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {Object} table jquery table element containing the existing data
	 */
	sd.LanguagesViewWidget = function LanguagesViewWidget( config ) {
		var self = this,
			tableSelector = '.' + config.tableClass;

		var viewMoreButton = new OO.ui.ButtonWidget( {
			icon: 'expand',
			flags: 'progressive',
			label: mw.message(
				'wikibasemediainfo-filepage-more-languages',
				$( tableSelector ).find( 'tr' ).length - 1
			).text(),
			framed: false
		} )
			.on(
				'click',
				function () {
					self.expand();
				}
			);

		var $viewMoreRow = $( '<tr>' )
			.addClass( 'viewMore' )
			.append(
				$( '<td>' )
					.attr( 'colspan', 2 )
					.append(
						viewMoreButton.$element
					)
			);

		var $viewLessRow = $( '<tr>' )
			.addClass( 'viewLess' )
			.append(
				$( '<td>' )
					.attr( 'colspan', 2 )
					.append(
						new OO.ui.ButtonWidget( {
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
							)
							.$element
					)
			);

		this.refreshLabel = function () {
			var hideableRowCount = $( tableSelector )
				.find( 'tr.entity-terms:not(.showLabel)' ).length;
			viewMoreButton.setLabel(
				mw.message(
					'wikibasemediainfo-filepage-more-languages',
					hideableRowCount
				).text()
			);
		};

		this.expand = function () {
			var $captionsTable = $( tableSelector );
			$viewMoreRow.detach();
			$captionsTable.find( 'tr' ).show();
			if ( $captionsTable.find( 'tr.entity-terms:not(.showLabel)' ).length > 0 ) {
				$captionsTable.append( $viewLessRow );
			}
		};

		this.collapse = function () {
			var $captionsTable = $( tableSelector ),
				$rows = $captionsTable.find( 'tr.entity-terms:not(.showLabel)' );
			var rowCount = $rows.length;
			if ( rowCount < 1 ) {
				return;
			}
			$viewLessRow.detach();
			$rows.hide();
			$captionsTable.append( $viewMoreRow );
		};

		this.hide = function () {
			$( tableSelector ).find( 'tr' ).show();
			$viewLessRow.detach();
			$viewMoreRow.detach();
		};
	};

}( mw.mediaInfo.structuredData ) );
