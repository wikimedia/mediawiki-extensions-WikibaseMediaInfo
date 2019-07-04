'use strict';

/**
 * @constructor
 * @param {Object} [config]
 * @cfg {int} minLookupCharacters Minimum number of characters that must exist
 *      before querying the api for matches
 * @cfg {string} externalEntitySearchApiUri Uri for search api
 * @cfg {string} entityType 'property' or 'item'
 * @cfg {int} maxSuggestions The maximum number of suggestions to display in the auto-suggest
 * @cfg {array} filter Array of objects each containing fields 'field' and 'value'.
 *      Suggestions will only displayed if suggestion.{field} === {value} ... e.g. if config.filter
 *      contains { 'field': 'type', 'value: 'property' } then only suggestions with 'type'
 *      equal to 'property' will be returned.
 *      Suffixing the value of 'field' with the character ! inverts the filter
 */
var EntityLookupElement = function MediaInfoStatementsEntityLookupElement( config ) {
	this.config = $.extend( this.config, {
		minLookupCharacters: 1,
		externalEntitySearchApiUri: mw.config.get( 'wbmiExternalEntitySearchBaseUri', '' ),
		entityType: 'item'
	}, config );

	OO.ui.mixin.LookupElement.call( this, $.extend( {}, this.config, {
		allowSuggestionsWhenEmpty: false,
		highlightFirst: false
	} ) );

	this.type = this.config.entityType;
	this.maxSuggestions = this.config.maxSuggestions;
	this.setFilter( this.config.filter || [] );
};
OO.mixinClass( EntityLookupElement, OO.ui.mixin.LookupElement );

/**
 * @inheritdoc
 */
EntityLookupElement.prototype.onLookupMenuItemChoose = function ( item ) {
	var data = item.getData();
	this.setValue( data.label );
	this.emit( 'choose', item );
};

/**
 * Fetch autocomplete results.
 *
 * @inheritdoc
 */
EntityLookupElement.prototype.getLookupRequest = function () {
	var
		value = this.getValue(),
		deferred = $.Deferred(),
		api = wikibase.api.getLocationAgnosticMwApi(
			this.config.externalEntitySearchApiUri || mw.config.get( 'wbmiRepoApiUrl', mw.config.get( 'wbRepoApiUrl' ) )
		),
		requestParams = {
			action: 'wbsearchentities',
			search: value,
			format: 'json',
			language: mw.config.get( 'wgUserLanguage' ),
			uselang: mw.config.get( 'wgUserLanguage' ),
			type: this.type
		};

	if ( value.length < this.config.minLookupCharacters ) {
		return deferred.resolve( [] ).promise( { abort: function () {} } );
	}

	if ( this.filter.length > 0 ) {
		requestParams.limit = 'max';
	}

	return api.get( requestParams );
};

/**
 * Transform API response.
 *
 * @inheritdoc
 */
EntityLookupElement.prototype.getLookupCacheDataFromResponse =
	function ( response ) {
		return response.search;
	};

/**
 * Construct menu options from transformed API data.
 *
 * @inheritdoc
 */
EntityLookupElement.prototype.getLookupMenuOptionsFromData = function ( data ) {
	var i, $label,
		items = [];

	data = this.filterData( data );
	if ( this.maxSuggestions !== undefined ) {
		data = data.slice( 0, this.maxSuggestions - 1 );
	}

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
 * @param {Array} filter
 */
EntityLookupElement.prototype.setFilter = function ( filter ) {
	this.filter = filter;
};

EntityLookupElement.prototype.filterData = function ( data ) {
	var filters = this.filter;

	if ( filters === undefined ) {
		return data;
	}

	// If there's just a single filter make it into an array
	if ( filters.field !== undefined ) {
		filters = [ filters ];
	}

	filters.forEach( function ( filter ) {
		var values,
			field = filter.field,
			filterType = 'includeOnMatch';
		if ( field.indexOf( '!' ) === 0 ) {
			filterType = 'excludeOnMatch';
			field = filter.field.substr( 1 );
		}
		values = filter.value.split( '|' );
		data = data.filter( function ( datum ) {
			if ( filterType === 'includeOnMatch' ) {
				return values.indexOf( datum[ field ] ) !== -1;
			} else {
				return values.indexOf( datum[ field ] ) === -1;
			}
		} );
	} );

	return data;
};

/**
 * @param {Object} entityStub
 * @return {jQuery}
 */
EntityLookupElement.prototype.createLabelFromSuggestion = function ( entityStub ) {
	var data = {},
		template;

	template = mw.template.get(
		'wikibase.mediainfo.statements',
		'templates/statements/EntityLabel.mustache+dom'
	);

	data.label = entityStub.label || entityStub.id;
	data.description = entityStub.description;

	if ( entityStub.aliases ) {
		data.aliases =
			mw.message( 'word-separator' ).text() +
			mw.message( 'parentheses', mw.language.listToText( entityStub.aliases ) ).text();
	}

	return template.render( data );
};

module.exports = EntityLookupElement;
