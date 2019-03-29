( function ( statements ) {

	'use strict';

	statements.EntityLookupElement = function MediaInfoStatementsEntityLookupElement( config ) {
		this.config = $.extend( {
			minLookupCharacters: 1,
			externalEntitySearchApiUri: mw.config.get( 'wbmiExternalEntitySearchBaseUri', '' )
		}, config );

		OO.ui.mixin.LookupElement.call( this, $.extend( {}, this.config, {
			allowSuggestionsWhenEmpty: false,
			highlightFirst: false
		} ) );

		this.type = this.config.type || 'item';
	};
	OO.mixinClass( statements.EntityLookupElement, OO.ui.mixin.LookupElement );

	/**
	 * @inheritdoc
	 */
	statements.EntityLookupElement.prototype.onLookupMenuItemChoose = function ( item ) {
		var data = item.getData();
		this.setValue( data.label );
		this.emit( 'choose', item );
	};

	/**
	 * Fetch autocomplete results.
	 *
	 * @inheritdoc
	 */
	statements.EntityLookupElement.prototype.getLookupRequest = function () {
		var
			value = this.getValue(),
			deferred = $.Deferred(),
			api = wikibase.api.getLocationAgnosticMwApi(
				this.config.externalEntitySearchApiUri || mw.config.get( 'wbmiRepoApiUrl' )
			);

		if ( value.length < this.config.minLookupCharacters ) {
			return deferred.resolve( [] ).promise( { abort: function () {} } );
		}

		return api.get( {
			action: 'wbsearchentities',
			search: value,
			format: 'json',
			language: mw.config.get( 'wgUserLanguage' ),
			uselang: mw.config.get( 'wgUserLanguage' ),
			type: this.type
		} );
	};

	/**
	 * Transform API response.
	 *
	 * @inheritdoc
	 */
	statements.EntityLookupElement.prototype.getLookupCacheDataFromResponse =
		function ( response ) {
			return response.search;
		};

	/**
	 * Construct menu options from transformed API data.
	 *
	 * @inheritdoc
	 */
	statements.EntityLookupElement.prototype.getLookupMenuOptionsFromData = function ( data ) {
		var i,
			$label,
			items = [];

		if ( !data ) {
			return [];
		} else if ( data.length === 0 ) {
			// Generate a disabled option with a helpful message in case no results are found.
			return [
				new OO.ui.MenuOptionWidget( {
					disabled: true,
					label: mw.message( 'wikibasemediainfo-filepage-statement-no-results' ).text()
				} )
			];
		}

		for ( i = 0; i < data.length; i++ ) {
			$label = this.createLabelFromSuggestion( data[ i ] );
			items.push( new OO.ui.MenuOptionWidget( {
				// this data will be passed to onLookupMenuItemChoose when item is selected
				data: data[ i ],
				label: $label
			} ) );
		}

		return items;
	};

	/**
	 * @param {Object} entityStub
	 * @return {jQuery}
	 */
	statements.EntityLookupElement.prototype.createLabelFromSuggestion = function ( entityStub ) {
		var $suggestion = $( '<span>' ).addClass( 'wbmi-entityselector-itemcontent' ),
			$label = $( '<span>' )
				.addClass( 'wbmi-entityselector-label' )
				.text( entityStub.label || entityStub.id );

		if ( entityStub.aliases ) {
			$label.append(
				$( '<span>' )
					.addClass( 'wbmi-entityselector-aliases' )
					.text(
						mw.message( 'word-separator' ).text() +
						mw.message( 'parentheses', mw.language.listToText( entityStub.aliases ) ).text()
					)
			);
		}

		$suggestion.append( $label );

		if ( entityStub.description ) {
			$suggestion.append(
				$( '<span>' )
					.addClass( 'wbmi-entityselector-description' )
					.text( entityStub.description )
			);
		}

		return $suggestion;
	};

}( mw.mediaInfo.statements ) );
