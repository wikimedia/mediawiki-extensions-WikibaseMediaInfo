( function ( statements ) {

	'use strict';

	statements.EntityLookupElement = function MediaInfoStatementsEntityLookupElement( config ) {
		config = $.extend( {
			minLookupCharacters: 1
		}, config );

		OO.ui.mixin.LookupElement.call( this, $.extend( {}, config, {
			allowSuggestionsWhenEmpty: false,
			highlightFirst: false
		} ) );

		this.minLookupCharacters = config.minLookupCharacters;
		this.type = config.type || 'item';
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
			api = new mw.Api();

		if ( value.length < this.minLookupCharacters ) {
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
	statements.EntityLookupElement.prototype.getLookupCacheDataFromResponse = function ( response ) {
		return response.search;
	};

	/**
	 * Construct menu options from transformed API data.
	 *
	 * @inheritdoc
	 */
	statements.EntityLookupElement.prototype.getLookupMenuOptionsFromData = function ( data ) {
		var
			items = [],
			i, $label;

		if ( !data ) {
			return [];
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
					.text( mw.message( 'parentheses', mw.language.listToText( entityStub.aliases ) ).text() )
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
