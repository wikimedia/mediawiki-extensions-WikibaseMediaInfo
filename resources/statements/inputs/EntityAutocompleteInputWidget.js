'use strict';

var FormatValueElement = require( 'wikibase.mediainfo.base' ).FormatValueElement,
	datamodel = require( 'wikibase.datamodel' ),
	EntityAutocompleteInputWidget;

/**
 * @param {Object} config Configuration options
 * @param {string} [config.entityType] 'property' or 'item' (defaults to 'item')
 * @param {number} [config.maxSuggestions] The maximum number of suggestions to display in the auto-suggest
 * @param {Array} [config.filter] Array of objects each containing fields 'field' and 'value'.
 *      Suggestions will only displayed if suggestion.{field} === {value} ... e.g. if config.filter
 *      contains { 'field': 'type', 'value: 'property' } then only suggestions with 'type'
 *      equal to 'property' will be returned.
 *      Suffixing the value of 'field' with the character ! inverts the filter
 */
EntityAutocompleteInputWidget = function MediaInfoStatementsEntityAutocompleteInputWidget( config ) {
	config = config || {};

	this.apiUri =
		mw.config.get( 'wbmiExternalEntitySearchBaseUri' ) ||
		mw.config.get( 'wbmiRepoApiUrl' ) ||
		mw.config.get( 'wbRepoApiUrl' );

	this.entityType = config.entityType || 'item';
	this.maxSuggestions = config.maxSuggestions;
	this.filter = config.filter || [];
	this.entityId = undefined;

	// dataCache will temporarily store entity id => entity data mappings of
	// entities, so that if we somehow then alter the text (add characters,
	// remove some) and then adjust our typing to form a known item,
	// it'll recognize it and know what the id was, without us having to
	// select it anew
	this.dataCache = {};

	// eslint-disable-next-line mediawiki/class-doc
	EntityAutocompleteInputWidget.parent.call( this, $.extend( {}, config, {
		// classes should *always* be added, because some essential functionality
		// (e.g. CSS to turn red on invalid input) depends on these classes
		classes: [
			'wbmi-input-widget__autocomplete',
			'wbmi-input-widget__input'
		].concat( config.classes || [] )
	} ) );

	OO.ui.mixin.FlaggedElement.call(
		this,
		$.extend( {}, {
			$flagged: this.$element
		}, config )
	);

	OO.ui.mixin.LookupElement.call(
		this,
		$.extend( {}, {
			allowSuggestionsWhenEmpty: false,
			highlightFirst: false
		}, config )
	);

	FormatValueElement.call( this, config );
};
OO.inheritClass( EntityAutocompleteInputWidget, OO.ui.TextInputWidget );
OO.mixinClass( EntityAutocompleteInputWidget, OO.ui.mixin.FlaggedElement );
OO.mixinClass( EntityAutocompleteInputWidget, OO.ui.mixin.LookupElement );
OO.mixinClass( EntityAutocompleteInputWidget, FormatValueElement );

/**
 * @inheritdoc
 */
EntityAutocompleteInputWidget.prototype.onLookupMenuChoose = function ( item ) {
	var data = item.getData();
	this.setData( data.id );
	this.emit( 'add', data );
};

/**
 * @param {string} entityId
 * @return {jQuery.Promise}
 */
EntityAutocompleteInputWidget.prototype.setData = function ( entityId ) {
	var self = this;

	if ( entityId === this.entityId ) {
		return $.Deferred().resolve( this.$element ).promise();
	}

	if ( entityId === undefined ) {
		this.setValue( '' );
		this.setFlags( { destructive: false } );
		this.entityId = undefined;
		return $.Deferred().resolve( this.$element ).promise();
	}

	if ( entityId && entityId in this.dataCache ) {
		// input (label) is one we've already selected, we still know the id
		this.setValue( this.dataCache[ entityId ].label || this.dataCache[ entityId ].id );
		this.setFlags( { destructive: false } );
		// `self.setValue` might have set an invalid entity id if there are
		// multiple entities with the exact same label, so let's make sure
		// to overrule it with the correct entity id
		this.entityId = entityId;
		return $.Deferred().resolve( this.$element ).promise();
	}

	this.entityId = entityId;
	return this.formatValue( new datamodel.EntityId( entityId ), 'text/plain' )
		.then( function ( plain ) {
			// update textual representation (= label) in the input field
			self.setValue( plain );
			self.setFlags( { destructive: false } );
			// `self.setValue` might have reset this for lack of known data,
			// so let's make sure to overrule it and restore the entity id
			self.entityId = entityId;
		} )
		.catch( function () {
			// failed to format this id - invalidate it
			self.entityId = undefined;
			self.setFlags( { destructive: true } );
		} )
		.always( function () {
			return self.$element;
		} );
};

/**
 * @return {string|undefined}
 */
EntityAutocompleteInputWidget.prototype.getData = function () {
	return this.entityId;
};

/**
 * @inheritdoc
 */
EntityAutocompleteInputWidget.prototype.setValue = function ( value ) {
	var self = this,
		labels = Object.keys( this.dataCache ).map( function ( entityId ) {
			return self.dataCache[ entityId ].label || self.dataCache[ entityId ].id;
		} ),
		index = labels.indexOf( this.cleanUpValue( value ) );

	this.entityId = index >= 0 ? Object.keys( this.dataCache )[ index ] : undefined;

	EntityAutocompleteInputWidget.parent.prototype.setValue.call( this, value );

	return this;
};

/**
 * @inheritdoc
 */
EntityAutocompleteInputWidget.prototype.onBlur = function () {
	EntityAutocompleteInputWidget.parent.prototype.onBlur.call( this );

	// verify that this.data (which should contain the entity id) is set
	// if not, mark the input as destructive to indicate the value is invalid
	if ( this.entityId === undefined && this.getValue() !== '' ) {
		this.setFlags( { destructive: true } );
	} else {
		this.setFlags( { destructive: false } );
	}
};

/**
 * Fetch autocomplete results.
 *
 * @inheritdoc
 */
EntityAutocompleteInputWidget.prototype.getLookupRequest = function () {
	var value = this.getValue(),
		deferred = $.Deferred(),
		api = wikibase.api.getLocationAgnosticMwApi( this.apiUri, { anonymous: true } ),
		requestParams = {
			action: 'wbsearchentities',
			search: value,
			format: 'json',
			language: mw.config.get( 'wgUserLanguage' ),
			uselang: mw.config.get( 'wgUserLanguage' ),
			type: this.entityType,
			limit: this.filter.length > 0 ? 'max' : undefined
		};

	if ( value.length === 0 ) {
		return deferred.resolve( [] ).promise( { abort: function () {} } );
	}

	return api.get( requestParams );
};

/**
 * Transform API response.
 *
 * @inheritdoc
 */
EntityAutocompleteInputWidget.prototype.getLookupCacheDataFromResponse = function ( response ) {
	return response.search;
};

/**
 * If a user middle-clicks a menu option, go to that Wikidata item. This
 * replicates behavior from the Wikidata UI.
 *
 * @param {Object} e Event
 */
EntityAutocompleteInputWidget.prototype.onMousedown = function ( e ) {
	if ( e.which === OO.ui.MouseButtons.MIDDLE ) {
		// This is less than ideal, but is probably a decent use case for
		// window.open. This is a response to a mousedown event so it shouldn't
		// trigger any popup blockers in modern browsers. For browsers set to
		// prefer new tabs over new windows, this will open in a new tab.
		window.open( e.currentTarget.dataset.url, '_blank' );
	}
};

/**
 * Construct menu options from transformed API data.
 *
 * @inheritdoc
 */
EntityAutocompleteInputWidget.prototype.getLookupMenuOptionsFromData = function ( data ) {
	var i,
		item,
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
				label: mw.msg( 'wikibasemediainfo-filepage-statement-no-results' )
			} )
		];
	}

	for ( i = 0; i < data.length; i++ ) {
		this.dataCache[ data[ i ].id ] = data[ i ];

		item = new OO.ui.MenuOptionWidget( {
			// this data will be passed to onLookupMenuChoose when item is selected
			data: data[ i ],
			label: this.createLabelFromSuggestion( data[ i ] )
		} );
		item.$element.find( '.wbmi-autocomplete-option' ).on( 'mousedown', this.onMousedown.bind( this ) );
		items.push( item );
	}

	return items;
};

EntityAutocompleteInputWidget.prototype.filterData = function ( data ) {
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
EntityAutocompleteInputWidget.prototype.createLabelFromSuggestion = function ( entityStub ) {
	var data = {},
		template;

	template = mw.template.get(
		'wikibase.mediainfo.statements',
		'templates/statements/inputs/EntityAutocompleteInputWidgetLabel.mustache+dom'
	);

	data.label = entityStub.label || entityStub.id;
	data.description = entityStub.description;
	data.url = entityStub.url;

	if ( entityStub.aliases ) {
		data.aliases =
			mw.msg( 'word-separator' ) +
			mw.msg( 'parentheses', mw.language.listToText( entityStub.aliases ) );
	}

	return template.render( data );
};

module.exports = EntityAutocompleteInputWidget;
