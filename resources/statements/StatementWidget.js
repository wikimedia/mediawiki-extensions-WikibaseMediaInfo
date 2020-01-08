'use strict';

var dataTypesMap = mw.config.get( 'wbDataTypes' ),
	ItemWidget = require( './ItemWidget.js' ),
	FormatValueElement = require( 'wikibase.mediainfo.base' ).FormatValueElement,
	ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	DOMLessGroupWidget = require( 'wikibase.mediainfo.base' ).DOMLessGroupWidget,
	StatementInputWidget = require( './StatementInputWidget.js' ),
	datamodel = require( 'wikibase.datamodel' ),
	serialization = require( 'wikibase.serialization' ),
	StatementWidget;

/**
 * @constructor
 * @param {Object} config Configuration options
 * @param {string} config.entityId Entity ID (e.g. M123 id of the file you just uploaded)
 * @param {string} config.propertyId Property ID (e.g. P123 id of `depicts` property)
 * @param {string} config.valueType Datavalue type (e.g. 'wikibase-entityid', 'string', ...)
 * @param {Object} [config.data] Initial data
 * @param {string} [config.title]
 * @param {string} [config.editing] True for edit mode, False for read mode
 * @param {bool} [config.isDefaultProperty] True if the widget is shown even if there are
 *  no values for the property
 * @param {Object} [config.helpUrls]  An object with property id as members and help urls for
 *  the property as values
 *  e.g. { P1: "https://commons.wikimedia.org/wiki/Special:MyLanguage/Commons:Depicts" }
 * @param {bool} [config.showControls] Whether or not to display editing controls
 * @param {string} [config.summary] Summary for edits
 * @param {string[]} [config.tags] Change tags to apply to edits
 */
StatementWidget = function ( config ) {
	var valueType = config.valueType;

	if ( !valueType && config.propertyType ) {
		// backward compatibility from before we were using value type...
		valueType = dataTypesMap[ config.propertyType ].dataValueType;
	}

	config.helpUrls = config.helpUrls || {};
	config.isDefaultProperty = !!config.isDefaultProperty;
	this.config = config;

	this.state = {
		entityId: config.entityId,
		propertyId: config.propertyId,
		valueType: valueType,
		initialData: new datamodel.StatementList(),
		title: config.title || ( mw.config.get( 'wbmiPropertyTitles' ) || {} )[ config.propertyId ] || '',
		editing: config.editing || false
	};

	this.input = new StatementInputWidget( {
		classes: [ 'wbmi-statement-input' ],
		propertyId: config.propertyId,
		valueType: valueType,
		disabled: this.disabled
	} );

	this.publishButton = new OO.ui.ButtonInputWidget( {
		type: 'submit',
		useInputTag: true,
		label: mw.message( 'wikibasemediainfo-filepage-publish' ).text(),
		flags: [ 'primary', 'progressive' ],
		disabled: true
	} );

	StatementWidget.parent.call( this, config );
	DOMLessGroupWidget.call( this );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/StatementWidget.mustache+dom'
	);

	this.input.connect( this, { add: 'addItemFromInput' } );
	this.publishButton.connect( this, { click: [ 'emit', 'publish' ] } );
	this.connect( this, { change: 'updatePublishButtonState' } );

	if ( config.data ) {
		this.resetData( config.data );
	}
};

OO.inheritClass( StatementWidget, OO.ui.Widget );
OO.mixinClass( StatementWidget, DOMLessGroupWidget );
OO.mixinClass( StatementWidget, ComponentWidget );
OO.mixinClass( StatementWidget, FormatValueElement );

/**
 * @inheritDoc
 */
StatementWidget.prototype.getTemplateData = function () {
	var self = this,
		dataValue = new datamodel.EntityId( this.state.propertyId );

	// fetch property value & url
	return this.formatValue( dataValue, 'text/html' ).then( function ( html ) {
		var formatResponse, editButton, cancelButton, removeButton, learnMoreLink, learnMoreButton;

		formatResponse = function ( response ) {
			return $( '<div>' )
				.append( response )
				.find( 'a' )
				.attr( 'target', '_blank' )
				.end()
				.html();
		};

		editButton = new OO.ui.ButtonWidget( {
			label: mw.message( 'wikibasemediainfo-filepage-edit' ).text(),
			framed: false,
			flags: 'progressive',
			title: mw.message( 'wikibasemediainfo-filepage-edit-depicts' ).text(),
			classes: [ 'wbmi-entityview-editButton' ],
			disabled: self.isDisabled() || self.isEditing()
		} );

		cancelButton = new OO.ui.ButtonWidget( {
			label: mw.message( 'wikibasemediainfo-filepage-cancel' ).text(),
			framed: false
		} );

		removeButton = new OO.ui.ButtonWidget( {
			label: mw.message( 'wikibasemediainfo-statements-remove' ).text(),
			framed: false,
			flags: 'destructive',
			classes: [ 'wbmi-statement-remove' ]
		} );

		learnMoreLink = self.config.helpUrls[ self.state.propertyId ];
		learnMoreButton = new OO.ui.ButtonWidget( {
			label: mw.message( 'wikibasemediainfo-statements-learn-more' ).text(),
			framed: false,
			flags: 'progressive',
			classes: [ 'wbmi-statement-learn-more' ]
		} );

		editButton.connect( self, { click: [ 'emit', 'edit' ] } );
		editButton.connect( self, { click: [ 'setEditing', true ] } );
		cancelButton.connect( self, { click: 'showCancelConfirmationDialog' } );
		removeButton.connect( self, { click: 'showRemoveConfirmationDialog' } );
		learnMoreButton.connect( self, {
			click: window.open.bind( window, learnMoreLink, '_blank' )
		} );

		return {
			title: self.state.title,
			id: self.state.propertyId,
			label: formatResponse( html ),
			url: $( html ).attr( 'href' ),
			isDefaultProperty: self.config.isDefaultProperty,
			showControls: self.config.showControls,
			editing: self.isEditing(),
			items: self.getItems(),
			input: self.input,
			publishButton: self.publishButton,
			editButton: editButton,
			cancelButton: cancelButton,
			removeAll: removeButton,
			learnMoreLink: learnMoreLink,
			learnMoreButton: learnMoreButton
		};
	} );
};

/**
 * @return {boolean}
 */
StatementWidget.prototype.hasChanges = function () {
	var changes = this.getChanges(),
		removals = this.getRemovals();

	return changes.length > 0 || removals.length > 0;
};

/**
 * Receives a DataValue from the StatementInputWidget and uses it to create a
 * new ItemWidget, add it to the list, and set the widget into edit mode.
 * @param {datavalues.DataValue} item
 * @fires change
*/
StatementWidget.prototype.addItemFromInput = function ( item ) {
	var widget = this.createItem( item );
	this.addItems( [ widget ] );

	// we just added a new item - let's switch all of them into editing mode
	this.setEditing( true );

	// clear the autocomplete input field to select entities to add
	this.input.setData( undefined );
	this.emit( 'manual-add', widget );
	this.emit( 'change', widget );
};

/**
 * @param {dataValues.DataValue} dataValue
 * @return {ItemWidget}
 */
StatementWidget.prototype.createItem = function ( dataValue ) {
	var widget = new ItemWidget( {
		disabled: this.isDisabled(),
		editing: this.state.editing,
		entityId: this.state.entityId,
		propertyId: this.state.propertyId,
		rank: datamodel.Statement.RANK.NORMAL,
		dataValue: dataValue
	} );

	widget.connect( this, { delete: [ 'removeItems', [ widget ] ] } );
	widget.connect( this, { delete: [ 'emit', 'change' ] } );
	widget.connect( this, { change: [ 'setEditing', true ] } );
	widget.connect( this, { change: [ 'emit', 'change' ] } );

	return widget;
};

/**
 * @return {datamodel.StatementList}
 */
StatementWidget.prototype.getData = function () {
	return new datamodel.StatementList( this.getItems().map( function ( item ) {
		return item.getData();
	} ) );
};

/**
 * Update DOM with latest data, sorted by prominence
 * @param {datamodel.StatementList} data
 * @return {jQuery.Promise}
 */
StatementWidget.prototype.setData = function ( data ) {
	var self = this,
		existing = [],
		promises = [],
		sortedData;

	// Bail early and discard existing data if data argument is not a statement list
	if ( !( data instanceof datamodel.StatementList ) ) {
		throw new Error( 'Invalid statement list' );
	}

	// clear out input field
	this.input.setData( undefined );

	sortedData = data.toArray().sort( function ( statement1, statement2 ) {
		return statement2.getRank() - statement1.getRank();
	} );

	// get rid of existing widgets that are no longer present in the
	// new set of data we've been fed
	this.removeItems( this.getItems().filter( function ( item ) {
		return !data.hasItem( item.getData() );
	} ) );

	// figure out which items have an existing widget already
	// we're doing this outside of the creation below, because
	// setData is async, and new objects may not immediately
	// have their data set
	sortedData.forEach( function ( statement, i ) {
		existing[ i ] = self.findItemFromData( statement );
	} );

	sortedData.forEach( function ( statement, i ) {
		var mainSnak = statement.getClaim().getMainSnak(),
			widget = existing[ i ];

		if ( mainSnak.getPropertyId() !== self.state.propertyId ) {
			throw new Error( 'Invalid statement: property ID mismatch' );
		}

		if ( !( mainSnak instanceof datamodel.PropertyValueSnak ) ) {
			// ignore value-less snak
			data.removeItem( statement );
			return;
		}

		if ( mainSnak.getValue().getType() !== self.state.valueType ) {
			throw new Error( 'Invalid statement: value type mismatch' );
		}

		if ( widget !== null ) {
			self.moveItem( widget, i );
		} else {
			widget = self.createItem( mainSnak.getValue() );
			self.insertItem( widget, i );
		}

		promises.push( widget.setData( statement ) );
	} );

	return $.when.apply( $, promises ).then( function () {
		return self.$element;
	} );
};

/**
 * @return {jQuery.Deferred}
 */
StatementWidget.prototype.updatePublishButtonState = function () {
	if ( this.publishButton && this.items ) {
		this.publishButton.setDisabled( this.isDisabled() || !this.hasChanges() );
	}

	return $.Deferred().resolve( this.$element ).promise();
};

/**
 * @param {boolean} editing
 * @return {jQuery.Deferred}
 */
StatementWidget.prototype.setEditing = function ( editing ) {
	var self = this,
		promises = [];

	this.getItems().forEach( function ( item ) {
		try {
			promises.push( item.setEditing( editing ) );
		} catch ( e ) {
			// when switching modes, make sure to remove invalid (incomplete) items
			self.removeItems( [ item ] );
		}
	} );

	return $.when( promises )
		.then( this.setState.bind( this, { editing: editing } ) )
		.then( this.updatePublishButtonState.bind( this ) );
};

/**
 * @return {boolean}
 */
StatementWidget.prototype.isEditing = function () {
	return this.state.editing;
};

/**
 * @inheritDoc
 */
StatementWidget.prototype.setDisabled = function ( disabled ) {
	ComponentWidget.prototype.setDisabled.call( this, disabled );

	// update disabled state for the relevant child objects, if they
	// exist (they might not yet, since this method also gets called
	// while we're still constructing `this` object)
	if ( this.input ) {
		this.input.setDisabled( disabled );
	}

	this.updatePublishButtonState();
	return this;
};

/**
 * @return {datamodel.Statement[]}
 */
StatementWidget.prototype.getChanges = function () {
	var currentStatements = this.getData().toArray(),
		previousStatements = this.state.initialData.toArray().reduce( function ( result, statement ) {
			result[ statement.getClaim().getGuid() ] = statement;
			return result;
		}, {} );

	return currentStatements.filter( function ( statement ) {
		return !( statement.getClaim().getGuid() in previousStatements ) ||
			!statement.equals( previousStatements[ statement.getClaim().getGuid() ] );
	} );
};

/**
 * @return {datamodel.Statement[]}
 */
StatementWidget.prototype.getRemovals = function () {
	var data = this.getData(),
		currentStatements = data.toArray().reduce( function ( result, statement ) {
			result[ statement.getClaim().getGuid() ] = statement;
			return result;
		}, {} );

	return this.state.initialData.toArray().filter( function ( statement ) {
		return !( statement.getClaim().getGuid() in currentStatements );
	} );
};

/**
 * Set data to a specific state (or reset it to last state, if data argument
 * is not provided)
 *
 * This is different from `setData` in that this one will also modify the
 * known state, which is then used to compare for changes.
 * The data that is set via `resetData` is the default state; data set via
 * `setData` is working state, and any changes between that state and the
 * default state, can then be submitted via `submit`.
 *
 * @param {datamodel.StatementList} [data]
 * @return {jQuery.Promise}
 */
StatementWidget.prototype.resetData = function ( data ) {
	var self = this;

	data = this.cloneData( data === undefined ? this.state.initialData : data );

	return this.setData( data )
		.then( function () {
			// use the `.getData()` result instead of `data` because that'll
			// already include valid GUIDs, whereas `data` might not
			return self.setState( { initialData: self.getData() } );
		} )
		.then( this.setEditing.bind( this, false ) );
};

/**
 * @param {number} [baseRevId]
 * @return {jQuery.Promise}
 */
StatementWidget.prototype.submit = function ( baseRevId ) {
	var self = this,
		api = wikibase.api.getLocationAgnosticMwApi(
			mw.config.get( 'wbmiRepoApiUrl', mw.config.get( 'wbRepoApiUrl' ) )
		),
		data = this.getData(),
		serializer = new serialization.StatementSerializer(),
		promise = $.Deferred().resolve( { pageinfo: { lastrevid: baseRevId } } ).promise(),
		changedStatements = this.getChanges(),
		removedStatements = this.getRemovals(),
		hasFailures = false,
		disabled = this.isDisabled();

	this.setEditing( false );
	this.setDisabled( true );

	self.getItems().forEach( function ( widget ) {
		widget.setError( '' );
	} );

	changedStatements.forEach( function ( statement ) {
		promise = promise.then( function ( statement, prevResponse ) {
			return api.postWithEditToken( {
				action: 'wbsetclaim',
				format: 'json',
				claim: JSON.stringify( serializer.serialize( statement ) ),
				// fetch the previous response's rev id and feed it to the next
				baserevid: prevResponse.pageinfo ? prevResponse.pageinfo.lastrevid : undefined,
				bot: 1,
				summary: self.config.summary || undefined,
				tags: self.config.tags || undefined,
				assertuser: !mw.user.isAnon() ? mw.user.getName() : undefined
			} ).catch(
				function ( errorCode, error ) {
					var apiError = wikibase.api.RepoApiError.newFromApiResponse( error, 'save' ),
						guid = statement.getClaim().getGuid(),
						item = self.getItems().filter( function ( item ) {
							return item.getData().getClaim().getGuid() === guid;
						} )[ 0 ],
						initialStatement = self.state.initialData.toArray().filter( function ( statement ) {
							return statement.getClaim().getGuid() === guid;
						} )[ 0 ];

					hasFailures = true;

					// replace statement with what we previously had, since we failed
					// to submit the changes...
					data.removeItem( statement );
					if ( initialStatement ) {
						data.addItem( initialStatement );
					}

					return item.setError( apiError.detailedMessage ).then( function () {
						// keep the update chain moving...
						return prevResponse;
					} );
				}
			);
		}.bind( null, statement ) );
	} );

	// Delete removed items
	if ( removedStatements.length > 0 ) {
		promise = promise.then( function ( prevResponse ) {
			return api.postWithEditToken( {
				action: 'wbremoveclaims',
				format: 'json',
				claim: removedStatements.map( function ( statement ) {
					return statement.getClaim().getGuid();
				} ).join( '|' ),
				// fetch the previous response's rev id and feed it to the next
				baserevid: prevResponse.pageinfo ? prevResponse.pageinfo.lastrevid : undefined,
				bot: 1,
				summary: self.config.summary || undefined,
				tags: self.config.tags || undefined,
				assertuser: !mw.user.isAnon() ? mw.user.getName() : undefined
			} ).catch( function ( errorCode, error ) {
				var apiError = wikibase.api.RepoApiError.newFromApiResponse( error, 'save' ),
					promises;

				hasFailures = true;

				// restore statements that failed to delete
				promises = removedStatements.map( function ( statement ) {
					var item = self.createItem( statement.getClaim().getMainSnak().getValue() );
					self.addItems( [ item ] );

					data.addItem( statement );

					return item.setData( statement )
						.then( item.setError.bind( item, apiError.detailedMessage ) );
				} );

				return $.when.apply( $, promises ).then( function () {
					// keep the update chain moving...
					return prevResponse;
				} );
			} );
		} );
	}

	// store data after we've submitted all changes, so that we'll reset to the
	// actual most recent correct state
	promise = promise.then( function ( response ) {
		var deferred = $.Deferred();

		// reset to original, pre-submit, disabled state
		self.setDisabled( disabled );

		if ( hasFailures ) {
			// if we've had failures, put the widget back in edit mode, and reject
			// this promise, so callers will know something went wrong
			self.setState( { initialData: data } )
				.then( self.setEditing.bind( self, true ) )
				.then( deferred.reject );
		} else {
			// reset data to what we've just submitted to the API (items that failed
			// to submit have been reset to their previous state in `data`)
			self.resetData( data )
				.then( deferred.resolve.bind( deferred, response ) );
		}

		return deferred.promise();
	} );

	return promise;
};

/**
 * @internal
 * @param {datamodel.StatementList} data
 * @return {datamodel.StatementList}
 */
StatementWidget.prototype.cloneData = function ( data ) {
	var serializer = new serialization.StatementListSerializer(),
		deserializer = new serialization.StatementListDeserializer();

	return deserializer.deserialize( serializer.serialize( data ) );
};

/**
 * Display the confirmation dialog to the user when they click the "Cancel"
 * button for a given block of statements.
 */
StatementWidget.prototype.showCancelConfirmationDialog = function () {
	var self = this;

	if ( this.hasChanges() ) {
		OO.ui.confirm(
			mw.msg( 'wikibasemediainfo-filepage-cancel-confirm' ),
			{
				title: mw.msg( 'wikibasemediainfo-filepage-cancel-confirm-title' ),
				actions: [
					{
						action: 'accept',
						label: mw.msg( 'wikibasemediainfo-filepage-cancel-confirm-accept' ),
						flags: [ 'primary', 'destructive' ]
					},
					{
						action: 'reject',
						label: mw.msg( 'ooui-dialog-message-reject' ),
						flags: 'safe'
					}
				]
			}
		).then( function ( confirmed ) {
			if ( confirmed ) {
				self.emit( 'cancel' );
			}
		} );
	} else {
		this.emit( 'cancel' );
	}
};

/**
 * Display the confirmation dialog to the user when they click the "Remove
 * All" button for a given block of statements.
 */
StatementWidget.prototype.showRemoveConfirmationDialog = function () {
	var self = this;

	OO.ui.confirm(
		mw.message( 'wikibasemediainfo-remove-all-statements-confirm' ).text(),
		{
			title: mw.msg( 'wikibasemediainfo-remove-all-statements-confirm-title' ),
			actions: [ {
				action: 'accept',
				label: mw.message( 'wikibasemediainfo-remove-all-statements-confirm-accept' ).text(),
				flags: [ 'primary', 'destructive' ]
			}, {
				action: 'reject',
				label: mw.message( 'ooui-dialog-message-reject' ).text(),
				flags: 'safe'
			} ]
		}
	).done( function ( confirmed ) {
		if ( confirmed ) {
			self.clearItems();
			self.submit().then( function () {
				self.emit( 'widgetRemoved', self.state.propertyId );
			} );
		}
	} );
};

module.exports = StatementWidget;
