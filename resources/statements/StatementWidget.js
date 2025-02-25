'use strict';

const dataTypesMap = mw.config.get( 'wbDataTypes' ),
	ItemWidget = require( './ItemWidget.js' ),
	inputs = require( './inputs/index.js' ),
	FormatValueElement = require( 'wikibase.mediainfo.base' ).FormatValueElement,
	ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	DOMLessGroupWidget = require( 'wikibase.mediainfo.base' ).DOMLessGroupWidget,
	datamodel = require( 'wikibase.datamodel' ),
	serialization = require( 'wikibase.serialization' );

/**
 * @constructor
 * @param {Object} config Configuration options
 * @param {string} config.entityId Entity ID (e.g. M123 id of the file you just uploaded)
 * @param {string} config.propertyId Property ID (e.g. P123 id of `depicts` property)
 * @param {string} config.valueType Datavalue type (e.g. 'wikibase-entityid', 'string', ...)
 * @param {Object} [config.data] Initial data
 * @param {string} [config.title]
 * @param {string} [config.editing] True for edit mode, False for read mode
 * @param {boolean} [config.isDefaultProperty] True if the widget is shown even if there are
 *  no values for the property
 * @param {Object} [config.helpUrls] An object with property id as members and help urls for
 *  the property as values
 *  e.g. { P1: "https://commons.wikimedia.org/wiki/Special:MyLanguage/Commons:Depicts" }
 * @param {boolean} [config.showControls] Whether or not to display editing controls (default to false)
 * @param {string} [config.summary] Summary for edits
 * @param {string[]} [config.tags] Change tags to apply to edits
 */
const StatementWidget = function ( config ) {
	let valueType = config.valueType;

	if ( !valueType && config.propertyType && config.propertyType in dataTypesMap ) {
		// backward compatibility from before we were using value type...
		valueType = dataTypesMap[ config.propertyType ].dataValueType;
	}

	config.showControls = !!config.showControls;
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

	this.input = new inputs.MultiTypeInputWrapperWidget( {
		isQualifier: false,
		type: valueType,
		classes: [ 'wbmi-statement-input' ],
		disabled: this.disabled
	} );

	this.publishButton = new OO.ui.ButtonInputWidget( {
		type: 'submit',
		useInputTag: true,
		label: mw.msg( 'wikibasemediainfo-filepage-publish' ),
		flags: [ 'primary', 'progressive' ],
		disabled: true
	} );

	StatementWidget.super.call( this, config );
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
	const self = this,
		dataValue = new datamodel.EntityId( this.state.propertyId ),
		errors = this.getErrors(),
		errorMessages = ( errors.length > 0 ) ?
			errors.map( ( error ) => new OO.ui.MessageWidget( {
				type: 'error',
				label: error,
				classes: [ 'wbmi-statement-error-msg' ]
			} ) ) : null;

	// fetch property value & url
	return this.formatValue( dataValue, 'text/html' ).then( ( html ) => {
		const formatResponse = function ( response ) {
			return $( '<div>' )
				.append( response )
				.find( 'a' )
				.attr( 'target', '_blank' )
				.end()
				.html();
		};

		const editButton = new OO.ui.ButtonWidget( {
			label: mw.msg( 'wikibasemediainfo-filepage-edit' ),
			framed: false,
			flags: 'progressive',
			title: mw.msg( 'wikibasemediainfo-filepage-edit-depicts' ),
			classes: [ 'wbmi-entityview-editButton' ],
			disabled: self.isDisabled() || self.isEditing()
		} );

		const cancelButton = new OO.ui.ButtonWidget( {
			label: mw.msg( 'wikibasemediainfo-filepage-cancel' ),
			framed: false
		} );

		const removeButton = new OO.ui.ButtonWidget( {
			label: mw.msg( 'wikibasemediainfo-statements-remove' ),
			framed: false,
			flags: 'destructive',
			classes: [ 'wbmi-statement-remove' ]
		} );

		const learnMoreLink = self.config.helpUrls[ self.state.propertyId ];
		const learnMoreButton = new OO.ui.ButtonWidget( {
			label: mw.msg( 'wikibasemediainfo-statements-learn-more' ),
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
			isDefaultProperty: self.config.isDefaultProperty,
			showControls: self.config.showControls,
			disabled: self.isDisabled(),
			editing: self.isEditing(),
			items: self.getItems(),
			input: self.input,
			publishButton: self.publishButton,
			editButton: editButton,
			cancelButton: cancelButton,
			removeAll: removeButton,
			learnMoreLink: learnMoreLink,
			learnMoreButton: learnMoreButton,
			errors: errorMessages
		};
	} );
};

/**
 * @return {boolean}
 */
StatementWidget.prototype.hasChanges = function () {
	const changes = this.getChanges(),
		removals = this.getRemovals();

	return changes.length > 0 || removals.length > 0;
};

/**
 * Receives a DataValue from the input widget and uses it to create a
 * new ItemWidget, add it to the list, and set the widget into edit mode.
 *
 * @fires change
 */
StatementWidget.prototype.addItemFromInput = function () {
	const self = this;

	this.input.parseValue( this.state.propertyId ).then(
		() => {
			const dataValue = self.input.getData(),
				widget = self.createItem( self.input.getSnakType(), dataValue );

			self.addItems( [ widget ] );

			// we just added a new item - let's switch all of them into editing mode
			self.setEditing( true );

			// clear the autocomplete input field to select entities to add
			self.emit( 'manual-add', widget );
			self.emit( 'change', widget );

			self.input.clear();
			self.input.setErrors( [] );
		},
		( errorCode, error ) => {
			const apiError = wikibase.api.RepoApiError.newFromApiResponse( error, 'save' ),
				errorMessage = new OO.ui.HtmlSnippet( apiError.detailedMessage );
			self.input.setErrors( [ errorMessage ] );
		}
	);
};

/**
 * @param {string} snakType value, somevalue, or novalue
 * @param {dataValues.DataValue} dataValue
 * @return {ItemWidget}
 */
StatementWidget.prototype.createItem = function ( snakType, dataValue ) {
	const widget = new ItemWidget( {
		disabled: this.isDisabled(),
		editing: this.state.editing,
		entityId: this.state.entityId,
		propertyId: this.state.propertyId,
		rank: datamodel.Statement.RANK.NORMAL,
		snakType: snakType,
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
	return new datamodel.StatementList( this.getItems().map( ( item ) => item.getData() ) );
};

/**
 * Update DOM with latest data, sorted by prominence
 *
 * @param {datamodel.StatementList} data
 * @return {jQuery.Promise}
 */
StatementWidget.prototype.setData = function ( data ) {
	const self = this;
	const existing = [];
	const promises = [];

	// Bail early and discard existing data if data argument is not a statement list
	if ( !( data instanceof datamodel.StatementList ) ) {
		throw new Error( 'Invalid statement list' );
	}

	// clear out input field
	this.input.clear();

	const sortedData = data.toArray().sort( ( statement1, statement2 ) => statement2.getRank() - statement1.getRank() );

	// get rid of existing widgets that are no longer present in the
	// new set of data we've been fed
	this.removeItems( this.getItems().filter(
		// we could pretty much just do `!data.hasItem( item.getData() )`,
		// but that one does not compare GUIDs, so if there are multiple
		// similar claims, but with a similar GUID, it'll consider them
		// all the same
		( item ) => !data.toArray().some(
			( statement ) => statement.equals( item.getData() ) && statement.getClaim().getGuid() === item.getData().getClaim().getGuid()
		)
	) );

	// figure out which items have an existing widget already
	// we're doing this outside of the creation below, because
	// setData is async, and new objects may not immediately
	// have their data set
	sortedData.forEach( ( statement, i ) => {
		existing[ i ] = self.findItemFromData( statement );
	} );

	sortedData.forEach( ( statement, i ) => {
		const mainSnak = statement.getClaim().getMainSnak();
		let widget = existing[ i ];
		const type = mainSnak.getType();

		if ( mainSnak.getPropertyId() !== self.state.propertyId ) {
			throw new Error( 'Invalid statement: property ID mismatch' );
		}

		if ( !( mainSnak instanceof datamodel.Snak ) ) {
			// ignore value-less snak
			data.removeItem( statement );
			return;
		}

		const value = type === 'value' ? mainSnak.getValue() : null;

		if ( self.state.valueType && value && value.getType() !== self.state.valueType ) {
			throw new Error( 'Invalid statement: value type mismatch' );
		}

		if ( widget !== null ) {
			self.moveItem( widget, i );
		} else {
			widget = self.createItem( type, value );
			self.insertItem( widget, i );
		}

		promises.push( widget.setData( statement ) );
	} );

	return $.when.apply( $, promises ).then( () => self.$element );
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
	const self = this,
		promises = [];

	this.getItems().forEach( ( item ) => {
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
	const currentStatements = this.getData().toArray(),
		previousStatements = this.state.initialData.toArray().reduce( ( result, statement ) => {
			result[ statement.getClaim().getGuid() ] = statement;
			return result;
		}, {} );

	return currentStatements.filter( ( statement ) => !( statement.getClaim().getGuid() in previousStatements ) ||
			!statement.equals( previousStatements[ statement.getClaim().getGuid() ] ) );
};

/**
 * @return {datamodel.Statement[]}
 */
StatementWidget.prototype.getRemovals = function () {
	const data = this.getData(),
		currentStatements = data.toArray().reduce( ( result, statement ) => {
			result[ statement.getClaim().getGuid() ] = statement;
			return result;
		}, {} );

	return this.state.initialData.toArray().filter( ( statement ) => !( statement.getClaim().getGuid() in currentStatements ) );
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
	const self = this;

	data = this.cloneData( data === undefined ? this.state.initialData : data );

	return this.setData( data )
		// use the `.getData()` result instead of `data` because that'll
		// already include valid GUIDs, whereas `data` might not
		.then( () => self.setState( { initialData: self.getData() } ) )
		.then( this.setEditing.bind( this, false ) );
};

/**
 * @param {number} [baseRevId]
 * @return {jQuery.Promise}
 */
StatementWidget.prototype.submit = function ( baseRevId ) {
	const self = this;
	const api = wikibase.api.getLocationAgnosticMwApi(
		mw.config.get( 'wbmiRepoApiUrl', mw.config.get( 'wbRepoApiUrl' ) )
	);
	const data = this.getData();
	const statementsByGuid = {};
	const serializer = new serialization.StatementSerializer();
	let promise = $.Deferred().resolve( { pageinfo: { lastrevid: baseRevId } } ).promise();
	const changedStatements = this.getChanges();
	const removedStatements = this.getRemovals();
	let hasFailures = false;
	const errors = [];
	const disabled = this.isDisabled();
	const tempuser = {};

	this.setEditing( false )
		.then( self.setErrors.bind( self, [] ) );
	this.setDisabled( true );

	data.toArray().forEach( ( statement ) => {
		statementsByGuid[ statement.getClaim().getGuid() ] = statement;
	} );

	changedStatements.forEach( ( statement ) => {
		promise = promise.then( ( ( innerStatement, prevResponse ) => api.postWithEditToken( {
			action: 'wbsetclaim',
			format: 'json',
			claim: JSON.stringify( serializer.serialize( innerStatement ) ),
			// fetch the previous response's rev id and feed it to the next
			baserevid: prevResponse.pageinfo ? ( prevResponse.pageinfo.lastrevid || undefined ) : undefined,
			bot: 1,
			summary: self.config.summary || undefined,
			tags: self.config.tags || undefined,
			assertuser: mw.user.isNamed() ? mw.user.getName() : undefined,
			errorformat: 'html',
			errorlang: mw.config.get( 'wgUserLanguage' ),
			errorsuselocal: true,
			returnto: mw.config.get( 'wgPageName' ),
			returntoanchor: '#' + statement.getClaim().getMainSnak().getPropertyId()
		} ).then(
			( response ) => {
				const guid = response.claim.id;
				const originalStatement = statementsByGuid[ guid ];
				const deserializer = new serialization.StatementDeserializer();
				let responseStatement;
				if ( response.claim.qualifiers !== undefined ) {
					// Capture hashes for new qualifiers by replacing the original
					// statement with a new statement created from the response
					responseStatement = deserializer.deserialize( response.claim );
					if ( data.hasItem( originalStatement ) ) {
						data.removeItem( originalStatement );
						// also remove the item from the StatementWidget itself,
						// or the data will be recreated in this.resetData()
						self.removeItems( [ self.findItemFromData( originalStatement ) ] );
					}
					data.addItem( responseStatement );
				}

				// extract tempuser properties from response, if present
				// (this will only be present the first request)
				for ( const property in response ) {
					if ( property.match( /^tempuser/ ) ) {
						tempuser[ property ] = response[ property ];
					}
				}
				// make sure to attach known tempuser data to any follow-up
				// response, so it ends up propagating until the last response,
				// and can be handled once all changes have been submitted
				if ( Object.keys( tempuser ).length > 0 ) {
					Object.assign( response, tempuser );
				}

				return response;
			}
		).catch(
			( errorCode, error ) => {
				const apiError = wikibase.api.RepoApiError.newFromApiResponse( error, 'save' ),
					errorMessage = new OO.ui.HtmlSnippet( apiError.detailedMessage ),
					guid = statement.getClaim().getGuid(),
					initialStatement = self.state.initialData.toArray().filter( ( filterStatement ) => filterStatement.getClaim().getGuid() === guid )[ 0 ];

				// TODO: show item-specific errors within item UI by using
				// the item's setErrors method.
				// TODO: flag the offending input so we can make it clear to
				// the user which top-level statement or qualifier needs to
				// be fixed.
				hasFailures = true;
				errors.push( errorMessage );

				// replace statement with what we previously had, since we failed
				// to submit the changes...
				data.removeItem( statement );
				if ( initialStatement ) {
					data.addItem( initialStatement );
				}

				return prevResponse;
			}
		) ).bind( null, statement ) );
	} );

	// Delete removed items
	if ( removedStatements.length > 0 ) {
		promise = promise.then( ( prevResponse ) => api.postWithEditToken( {
			action: 'wbremoveclaims',
			format: 'json',
			claim: removedStatements.map( ( statement ) => statement.getClaim().getGuid() ).join( '|' ),
			// fetch the previous response's rev id and feed it to the next
			baserevid: prevResponse.pageinfo ? ( prevResponse.pageinfo.lastrevid || undefined ) : undefined,
			bot: 1,
			summary: self.config.summary || undefined,
			tags: self.config.tags || undefined,
			assertuser: mw.user.isNamed() ? mw.user.getName() : undefined,
			returnto: mw.config.get( 'wgPageName' ),
			returntoanchor: '#' + removedStatements[ 0 ].getClaim().getMainSnak().getPropertyId()
		} ).then( ( response ) => {
			// extract tempuser properties from response, if present
			// (this will only be present the first request)
			for ( const property in response ) {
				if ( property.match( /^tempuser/ ) ) {
					tempuser[ property ] = response[ property ];
				}
			}
			// make sure to attach known tempuser data to any follow-up
			// response, so it ends up propagating until the last response,
			// and can be handled once all changes have been submitted
			if ( Object.keys( tempuser ).length > 0 ) {
				Object.assign( response, tempuser );
			}

			return response;
		} ).catch( ( errorCode, error ) => {
			const apiError = wikibase.api.RepoApiError.newFromApiResponse( error, 'save' );

			hasFailures = true;
			errors.push( apiError.detailedMessage );

			// restore statements that failed to delete
			const promises = removedStatements.map( ( statement ) => {
				const mainSnak = statement.getClaim().getMainSnak(),
					snakType = mainSnak.getType(),
					value = snakType === 'value' ? mainSnak.getValue() : null,
					item = self.createItem( snakType, value );

				self.addItems( [ item ] );

				data.addItem( statement );
				return item.setData( statement );
			} );

			// keep the update chain moving...
			return $.when.apply( $, promises ).then( () => prevResponse );
		} ) );
	}

	// store data after we've submitted all changes, so that we'll reset to the
	// actual most recent correct state
	promise = promise.then( ( response ) => {
		const deferred = $.Deferred();

		// reset to original, pre-submit, disabled state
		self.setDisabled( disabled );

		if ( hasFailures ) {
			// if we've had failures, put the widget back in edit mode, show
			// error(s), and reject this promise, so callers will know something
			// went wrong.
			self.setEditing( true )
				.then( self.setState.bind( self, { initialData: data } ) )
				.then( self.setErrors.bind( self, errors ) )
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
 * @private
 * @param {datamodel.StatementList} data
 * @return {datamodel.StatementList}
 */
StatementWidget.prototype.cloneData = function ( data ) {
	const serializer = new serialization.StatementListSerializer(),
		deserializer = new serialization.StatementListDeserializer();

	return deserializer.deserialize( serializer.serialize( data ) );
};

/**
 * Display the confirmation dialog to the user when they click the "Cancel"
 * button for a given block of statements.
 */
StatementWidget.prototype.showCancelConfirmationDialog = function () {
	const self = this;

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
		).then( ( confirmed ) => {
			if ( confirmed ) {
				self.setErrors( [] )
					.then( self.emit.bind( self, 'cancel' ) );
			}
		} );
	} else {
		self.setErrors( [] )
			.then( self.emit.bind( self, 'cancel' ) );
	}
};

/**
 * Display the confirmation dialog to the user when they click the "Remove
 * All" button for a given block of statements.
 */
StatementWidget.prototype.showRemoveConfirmationDialog = function () {
	const self = this;

	OO.ui.confirm(
		mw.msg( 'wikibasemediainfo-remove-all-statements-confirm' ),
		{
			title: mw.msg( 'wikibasemediainfo-remove-all-statements-confirm-title' ),
			actions: [ {
				action: 'accept',
				label: mw.msg( 'wikibasemediainfo-remove-all-statements-confirm-accept' ),
				flags: [ 'primary', 'destructive' ]
			}, {
				action: 'reject',
				label: mw.msg( 'ooui-dialog-message-reject' ),
				flags: 'safe'
			} ]
		}
	).done( ( confirmed ) => {
		if ( confirmed ) {
			self.clearItems();
			self.submit().then( () => {
				self.emit( 'widgetRemoved', self.state.propertyId );
			} );
		}
	} );
};

/**
 * Handle the part of the response from a wbcheckconstraints api call that is relevant to this
 * StatementWidget's property id
 *
 * @param {Object} responseForPropertyId
 */
StatementWidget.prototype.handleConstraintsResponse = function ( responseForPropertyId ) {
	if ( responseForPropertyId === null ) {
		return;
	}
	this.getItems().forEach( ( itemWidget ) => {
		let guid, result;

		try {
			// find the constraint report for this GUID
			guid = itemWidget.getData().getClaim().getGuid();
			result = responseForPropertyId.filter( ( responseForStatement ) => responseForStatement.id === guid )[ 0 ] || null;
			itemWidget.setConstraintsReport( result );
		} catch ( e ) {
			itemWidget.setConstraintsReport( null );
		}
	} );
};

module.exports = StatementWidget;
