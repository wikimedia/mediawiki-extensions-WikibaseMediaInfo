'use strict';

var FormatValueElement = require( 'wikibase.mediainfo.base' ).FormatValueElement,
	AbstractInputWidget = require( './AbstractInputWidget.js' ),
	EntityInputWidget;

/**
 * @param {Object} config Configuration options
 * @param {boolean} [config.isQualifier] True when used as qualifier value, false (default) for statement level
 * @param {string} [config.entityType] 'property' or 'item' (defaults to 'item')
 * @param {int} [config.maxSuggestions] The maximum number of suggestions to display in the auto-suggest
 * @param {Array} [config.filter] Array of objects each containing fields 'field' and 'value'.
 *      Suggestions will only displayed if suggestion.{field} === {value} ... e.g. if config.filter
 *      contains { 'field': 'type', 'value: 'property' } then only suggestions with 'type'
 *      equal to 'property' will be returned.
 *      Suffixing the value of 'field' with the character ! inverts the filter
 */
EntityInputWidget = function MediaInfoStatementsEntityInputWidget( config ) {
	config = config || {};

	this.apiUri =
		mw.config.get( 'wbmiExternalEntitySearchBaseUri' ) ||
		mw.config.get( 'wbmiRepoApiUrl' ) ||
		mw.config.get( 'wbRepoApiUrl' );

	this.entityType = config.entityType || 'item';
	this.maxSuggestions = config.maxSuggestions;
	this.filter = config.filter || [];

	EntityInputWidget.parent.call(
		this,
		$.extend( {}, {
			placeholder: !config.isQualifier ?
				mw.message( 'wikibasemediainfo-statements-item-input-placeholder' ).text() :
				undefined,
			icon: !config.isQualifier ? 'search' : undefined,
			label: !config.isQualifier ?
				mw.message( 'wikibasemediainfo-statements-item-input-label' ).text() :
				undefined
		}, config, {
			// classes should *always* be added, because some essential functionality
			// (e.g. CSS to turn red on invalid input) depends on these classes
			classes: [
				'wbmi-input-widget',
				'wbmi-input-widget__input',
				'wbmi-input-widget--single-line',
				'wbmi-input-widget--entity'
			].concat( config.classes || [] )
		} )
	);

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

	AbstractInputWidget.call( this, config );
	FormatValueElement.call( this, config );

	this.entityId = undefined;

	// mapLabelId will temporarily store entity label => id mappings of
	// entities that have been selected, so that if we somehow then alter
	// the text (add characters, remove some) and then adjust our typing to
	// form the originally selected item, it'll recognize it and know what
	// the id was, without us having to select it anew
	this.mapLabelId = {};
};
OO.inheritClass( EntityInputWidget, OO.ui.TextInputWidget );
OO.mixinClass( EntityInputWidget, OO.ui.mixin.FlaggedElement );
OO.mixinClass( EntityInputWidget, OO.ui.mixin.LookupElement );
OO.mixinClass( EntityInputWidget, AbstractInputWidget );
OO.mixinClass( EntityInputWidget, FormatValueElement );

/**
 * @inheritdoc
 */
EntityInputWidget.prototype.onLookupMenuChoose = function ( item ) {
	var data = item.getData();

	this.mapLabelId[ data.label || data.id ] = data.id;
	this.entityId = data.id;
	this.setValue( data.label || data.id );

	this.emit( 'add', this, data );
};

/**
 * @inheritdoc
 */
EntityInputWidget.prototype.getRawValue = function () {
	return this.entityId;
};

/**
 * @inheritdoc
 */
EntityInputWidget.prototype.getData = function () {
	return dataValues.newDataValue( 'wikibase-entityid', {
		id: this.entityId
	} );
};

/**
 * @inheritdoc
 */
EntityInputWidget.prototype.setData = function ( data ) {
	var self = this;

	if ( this.entityId !== undefined && this.getData().equals( data ) ) {
		return $.Deferred().resolve( this.$element ).promise();
	}

	// entities widget will need to be aware of the id that is associated
	// with the label
	return this.formatValue( data, 'text/plain' ).then( function ( plain ) {
		self.setValue( plain );

		self.entityId = data.toJSON().id;
		self.setFlags( { destructive: false } );
		self.emit( 'change', self );

		return self.$element;
	} );
};

/**
 * @inheritdoc
 */
EntityInputWidget.prototype.clear = function () {
	this.setValue( '' );
	this.entityId = undefined;
	this.setFlags( { destructive: false } );

	return $.Deferred().resolve( this.$element ).promise();
};

/**
 * Manual textarea input.
 *
 * @inheritdoc
 */
EntityInputWidget.prototype.setValue = function ( value ) {
	value = this.cleanUpValue( value );

	if ( value && value in this.mapLabelId ) {
		// input (label) is one we've already selected, we still know the id
		if ( this.entityId !== this.mapLabelId[ value ] ) {
			this.entityId = this.mapLabelId[ value ];
		}
	} else {
		// unknown input - mark as invalid input, until something gets selected
		this.entityId = undefined;
		// don't set destructive flag just yet, we may still be entering a search
		// term and don't want it to turn destructive until we've had a chance to
		// select the value - we'll update set the state on blur
	}

	EntityInputWidget.parent.prototype.setValue.call( this, value );

	return this;
};

/**
 * @inheritdoc
 */
EntityInputWidget.prototype.onBlur = function () {
	EntityInputWidget.parent.prototype.onBlur.call( this );

	// verify that this.data (which should contain the entity id) is set
	// if not, mark the input as destructive to indicate the value is invalid
	if ( this.entityId === undefined ) {
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
EntityInputWidget.prototype.getLookupRequest = function () {
	var value = this.getValue(),
		deferred = $.Deferred(),
		api = wikibase.api.getLocationAgnosticMwApi( this.apiUri ),
		requestParams = {
			action: 'wbsearchentities',
			search: value,
			format: 'json',
			language: mw.config.get( 'wgUserLanguage' ),
			uselang: mw.config.get( 'wgUserLanguage' ),
			type: this.entityType
		};

	if ( value.length === 0 ) {
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
EntityInputWidget.prototype.getLookupCacheDataFromResponse = function ( response ) {
	return response.search;
};

/**
 * Lookup menu options are actually links to their respective items (see
 * EntityInputWidgetLabel.mustache+dom). To mimic Wikidata behavior, when an option is
 * middle-clicked, the link should be followed. Otherwise, it should be ignored
 * so onLookupMenuChoose can run.
 *
 * This works by default on most devices, but on Android we must explicitly
 * prevent default link behavior.
 *
 * @param {Object} e Event
 */
EntityInputWidget.prototype.onMousedown = function ( e ) {
	if ( e.which !== OO.ui.MouseButtons.MIDDLE ) {
		e.preventDefault();
	}
};

/**
 * Construct menu options from transformed API data.
 *
 * @inheritdoc
 */
EntityInputWidget.prototype.getLookupMenuOptionsFromData = function ( data ) {
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
				label: mw.message( 'wikibasemediainfo-filepage-statement-no-results' ).text()
			} )
		];
	}

	for ( i = 0; i < data.length; i++ ) {
		item = new OO.ui.MenuOptionWidget( {
			// this data will be passed to onLookupMenuChoose when item is selected
			data: data[ i ],
			label: this.createLabelFromSuggestion( data[ i ] )
		} );
		item.$element.on( 'mousedown', this.onMousedown.bind( this ) );
		items.push( item );
	}

	return items;
};

EntityInputWidget.prototype.filterData = function ( data ) {
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
EntityInputWidget.prototype.createLabelFromSuggestion = function ( entityStub ) {
	var data = {},
		template;

	template = mw.template.get(
		'wikibase.mediainfo.statements',
		'templates/statements/inputs/EntityInputWidgetLabel.mustache+dom'
	);

	data.label = entityStub.label || entityStub.id;
	data.description = entityStub.description;
	data.url = entityStub.url;

	if ( entityStub.aliases ) {
		data.aliases =
			mw.message( 'word-separator' ).text() +
			mw.message( 'parentheses', mw.language.listToText( entityStub.aliases ) ).text();
	}

	return template.render( data );
};

module.exports = EntityInputWidget;
