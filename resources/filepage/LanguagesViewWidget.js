( function ( mw, sd, $ ) {

	'use strict';

	/**
	 * Widget that shows/hides languages on click
	 *
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {Object} table jquery table element containing the existing data
	 */
	sd.LanguagesViewWidget = function LanguagesViewWidget( config ) {
		var self = this;

		var viewMoreButton = new OO.ui.ButtonWidget( {
			icon: 'expand',
			flags: 'progressive',
			label: mw.message(
				'wikibasemediainfo-filepage-more-languages',
				config.table.find( 'tr' ).length - 1
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
			viewMoreButton.setLabel(
				mw.message(
					'wikibasemediainfo-filepage-more-languages',
					config.table.find( 'tr.entity-terms' ).length - 1
				).text()
			);
		};

		this.expand = function () {
			$viewMoreRow.detach();
			config.table.find( 'tr' ).show();
			if ( config.table.find( 'tr' ).length > 1 ) {
				config.table.append( $viewLessRow );
			}
		};

		this.collapse = function () {
			var rowCount = config.table.find( 'tr' ).length;
			if ( rowCount <= 1 ) {
				return;
			}
			$viewLessRow.detach();
			if ( rowCount > 1 ) {
				config.table.find( 'tr:not(:first)' ).hide();
				config.table.append( $viewMoreRow );
			}
		};

		this.hide = function () {
			config.table.find( 'tr' ).show();
			$viewLessRow.detach();
			$viewMoreRow.detach();
		};
	};

}( mediaWiki, mediaWiki.mediaInfo.structuredData, jQuery ) );
