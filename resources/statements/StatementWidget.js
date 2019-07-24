'use strict';

var ItemInputWidget = require( './ItemInputWidget.js' ),
	FormatValueElement = require( './FormatValueElement.js' ),
	GetRepoElement = require( './GetRepoElement.js' ),
	DOMLessGroupWidget = require( 'wikibase.mediainfo.base' ).DOMLessGroupWidget,
	ItemWidget = require( './ItemWidget.js' ),
	StatementWidget;

/**
* @constructor
* @param {Object} config Configuration options
* @param {string} config.entityId Entity ID (e.g. M123 id of the file you just uploaded)
* @param {string} config.propertyId Property ID (e.g. P123 id of `depicts` property)
* @param {string} [config.properties] Properties map: { propertyId: datatype, ...}
* @param {Object} [config.qualifiers] Qualifiers map: { propertyId: datatype, ...}
* @param {string} [config.title]
* @param {bool} config.isDefaultProperty True if the widget is shown even if there are
*  no values for the property
* @param {Object} [config.helpUrls]  An object with property id as members and help urls for
*  the property as values
* @param {bool} [config.showControls] Whether or not to display editing controls
*  e.g. { P1: "https://commons.wikimedia.org/wiki/Special:MyLanguage/Commons:Depicts" }
*/
StatementWidget = function ( config ) {
	config = config || {};
	config.helpUrls = config.helpUrls || {};
	config.qualifiers = config.qualifiers ||
		mw.config.get( 'wbmiDepictsQualifierProperties' ) ||
		{};
	StatementWidget.parent.call( this, config );
	DOMLessGroupWidget.call( this );

	// TODO: remove unnecessary props after enabling wbmiEnableOtherStatements everywhere;
	// this includes `this.properties` and `this.qualifiers`
	this.config = config;
	this.entityId = config.entityId;
	this.properties = config.properties || mw.config.get( 'wbmiProperties' ) || {};
	this.propertyId = config.propertyId;
	this.qualifiers = config.qualifiers;
	this.title = config.title ||
		( mw.config.get( 'wbmiPropertyTitles' ) || [] )[ this.propertyId ];
	this.data = new wikibase.datamodel.StatementList();
	this.editing = config.editing || false;

	this.input = new ItemInputWidget( {
		classes: [ 'wbmi-statement-input' ],
		type: this.properties[ this.propertyId ] || 'string',
		disabled: this.disabled
	} );

	this.editButton = new OO.ui.ButtonWidget( {
		label: mw.message( 'wikibasemediainfo-filepage-edit' ).text(),
		framed: false,
		flags: 'progressive',
		title: mw.message( 'wikibasemediainfo-filepage-edit-depicts' ).text(),
		classes: [ 'wbmi-entityview-editButton' ]
	} );

	this.cancelButton = new OO.ui.ButtonWidget( {
		framed: false,
		flags: [ 'destructive' ],
		label: mw.message( 'wikibasemediainfo-filepage-cancel' ).text()
	} );

	this.publishButton = new OO.ui.ButtonInputWidget( {
		type: 'submit',
		useInputTag: true,
		label: mw.message( 'wikibasemediainfo-filepage-publish' ).text(),
		flags: [ 'primary', 'progressive' ]
	} );

	this.removeButton = new OO.ui.ButtonWidget( {
		label: mw.message( 'wikibasemediainfo-statements-remove' ).text(),
		classes: [ 'wbmi-statement-remove' ],
		flags: 'destructive',
		framed: false
	} );

	this.learnMoreLink = this.config.helpUrls[ this.propertyId ];
	this.learnMoreButton = new OO.ui.ButtonWidget( {
		label: mw.message( 'wikibasemediainfo-statements-learn-more' ).text(),
		classes: [ 'wbmi-statement-learn-more' ],
		flags: 'progressive',
		framed: false
	} );

	// event listeners
	this.input.connect( this, { choose: 'addItemFromInput' } );
	this.editButton.connect( this, { click: [ 'emit', 'edit' ] } );
	this.editButton.connect( this, { click: [ 'setEditing', true ] } );
	this.cancelButton.connect( this, { click: 'showCancelConfirmationDialog' } );
	this.publishButton.connect( this, { click: [ 'emit', 'publish' ] } );
	this.removeButton.connect( this, { click: 'showRemoveConfirmationDialog' } );
	this.learnMoreButton.connect( this, {
		click: window.open.bind( window, this.learnMoreLink, '_blank' )
	} );
	this.connect( this, { change: 'updateControls' } );

	this.updateControls();
	this.render();
};

OO.inheritClass( StatementWidget, OO.ui.Widget );
OO.mixinClass( StatementWidget, DOMLessGroupWidget );
OO.mixinClass( StatementWidget, FormatValueElement );
OO.mixinClass( StatementWidget, GetRepoElement );

StatementWidget.prototype.render = function () {
	var self = this,
		dataValue = new wikibase.datamodel.EntityId( this.propertyId );

	// fetch property value & url
	return $.when(
		this.formatValue( dataValue, 'text/plain' ),
		this.formatValue( dataValue, 'text/html' )
	).then( function ( plain, html ) {
		var formatResponse = function ( response ) {
			return $( '<div>' )
				.append( response )
				.find( 'a' )
				.attr( 'target', '_blank' )
				.end()
				.html();
		};

		self.url = $( html ).attr( 'href' );
		self.label = formatResponse( html );
		self.getRepoFromUrl( self.url ).then( function ( repo ) {
			// @todo remove repo after enabling wbmiEnableOtherStatements everywhere
			self.repo = repo;
			self.renderInternal();
		} );
	} );
};

StatementWidget.prototype.renderInternal = function () {
	var template,
		data,
		$container;

	// Get the template
	template = mw.template.get(
		'wikibase.mediainfo.statements',
		'templates/statements/StatementWidget.mustache+dom'
	);

	// prepare the data
	data = {
		label: this.label,
		title: this.title,
		id: this.propertyId,
		url: this.url,
		repo: this.repo, // @todo remove repo after enabling wbmiEnableOtherStatements everywhere
		showControls: this.config.showControls,
		editing: this.isEditing(),
		items: this.getItems(),
		isDefaultProperty: this.config.isDefaultProperty,
		input: this.input,
		cancelButton: this.cancelButton,
		editButton: this.editButton,
		publishButton: this.publishButton,
		removeAll: this.removeButton,
		learnMoreLink: this.learnMoreLink,
		learnMoreButton: this.learnMoreButton,
		otherStatementsEnabled: mw.config.get( 'wbmiEnableOtherStatements', false )
	};

	// render the template with the data
	this.$element.children().detach();
	$container = template.render( data );
	this.$element.html( $container );
};

StatementWidget.prototype.updateControls = function () {
	if ( this.publishButton ) {
		this.publishButton.setDisabled( this.isDisabled() || !this.hasChanges() );
	}
	if ( this.editButton ) {
		this.editButton.setDisabled( this.isDisabled() || this.isEditing() );
	}
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
 * @param {ItemInputWidget} item
 */
StatementWidget.prototype.addItemFromInput = function ( item ) {
	var widget = this.createItem( item.getData() );

	this.addItems( [ widget ] );

	// we just added a new item - let's switch all of them into editing mode
	this.setEditing( true );

	// clear the autocomplete input field to select entities to add
	this.input.setData( undefined );

	this.emit( 'manual-add', widget );
	this.emit( 'change', widget );
	this.render();
};

/**
 * @param {dataValues.DataValue} dataValue
 * @return {ItemWidget}
 */
StatementWidget.prototype.createItem = function ( dataValue ) {
	var guidGenerator = new wikibase.utilities.ClaimGuidGenerator( this.entityId ),
		widget = new ItemWidget( {
			disabled: this.disabled,
			qualifiers: this.qualifiers,
			editing: this.editing,
			propertyId: this.propertyId,
			guid: guidGenerator.newGuid(),
			rank: wikibase.datamodel.Statement.RANK.NORMAL,
			dataValue: dataValue
		} );

	widget.connect( this, { delete: [ 'removeItems', [ widget ] ] } );
	widget.connect( this, { delete: [ 'emit', 'change' ] } );
	widget.connect( this, { delete: 'render' } );
	widget.connect( this, { change: [ 'setEditing', true ] } );
	widget.connect( this, { change: [ 'emit', 'change' ] } );

	return widget;
};

/**
 * @return {wikibase.datamodel.StatementList}
 */
StatementWidget.prototype.getData = function () {
	return new wikibase.datamodel.StatementList( this.getItems().map( function ( item ) {
		return item.getData();
	} ) );
};

/**
 * Update DOM with latest data, sorted by prominence
 * @param {wikibase.datamodel.StatementList} data
 */
StatementWidget.prototype.setData = function ( data ) {
	var self = this,
		existingItems = this.getItems(),
		sortedData;

	if ( !data ) {
		// data should always be a StatementList, even if an empty one;
		// if data is falsy, it's just invalid input...
		return;
	}

	sortedData = data.toArray().sort( function ( statement1, statement2 ) {
		return statement2.getRank() - statement1.getRank();
	} );

	// clear out input field
	this.input.setData( undefined );

	// get rid of existing widgets that are no longer present in the
	// new set of data we've been fed
	this.removeItems( existingItems.filter( function ( item ) {
		return !data.hasItem( item.getData() );
	} ) );

	sortedData.forEach( function ( statement, i ) {
		var mainSnak = statement.getClaim().getMainSnak(),
			widget = self.findItemFromData( statement );

		if ( statement.getClaim().getMainSnak().getPropertyId() !== self.propertyId ) {
			throw new Error( 'Invalid statement' );
		}

		if ( !( mainSnak instanceof wikibase.datamodel.PropertyValueSnak ) ) {
			// ignore value-less snak
			data.removeItem( statement );
			return;
		}

		// we've potentially received more info than we had when constructing this
		// object: extract the id & data type of this statement & adjust the
		// input type accordingly
		self.properties[ mainSnak.getPropertyId() ] = mainSnak.getValue().getType();
		self.input.setInputType( mainSnak.getValue().getType() );

		if ( widget ) {
			self.moveItem( widget, i );
		} else {
			widget = self.createItem( mainSnak.getValue() );
			self.insertItem( widget, i );
		}

		widget.setData( statement );
	} );

	this.data = data;
	this.render();
};

/**
 * @param {boolean} editing
 */
StatementWidget.prototype.setEditing = function ( editing ) {
	var self = this;

	if ( this.editing === editing ) {
		return;
	}

	this.editing = editing;

	this.getItems().forEach( function ( item ) {
		try {
			item.setEditing( editing );
		} catch ( e ) {
			// when switching modes, make sure to remove invalid (incomplete) items
			self.removeItems( [ item ] );
		}
	} );

	this.updateControls();
	this.render();
};

/**
 * @return {boolean}
 */
StatementWidget.prototype.isEditing = function () {
	return this.editing;
};

/**
 * @inheritDoc
 */
StatementWidget.prototype.setDisabled = function ( disabled ) {
	StatementWidget.parent.prototype.setDisabled.call( this, disabled );

	// update disabled state for the relevant child objects, if they
	// exist (they might not yet, since this method also gets called
	// while we're still constructing `this` object)
	if ( this.input ) {
		this.input.setDisabled( disabled );
	}
	if ( this.items && this.items.length > 0 ) {
		this.getItems().forEach( function ( item ) {
			item.setDisabled( disabled );
		} );
	}

	this.updateControls();

	return this;
};

/**
 * @return {wikibase.datamodel.Statement[]}
 */
StatementWidget.prototype.getChanges = function () {
	var currentStatements = this.getData().toArray(),
		previousStatements = this.data.toArray().reduce( function ( result, statement ) {
			result[ statement.getClaim().getGuid() ] = statement;
			return result;
		}, {} );

	return currentStatements.filter( function ( statement ) {
		return !( statement.getClaim().getGuid() in previousStatements ) ||
			!statement.equals( previousStatements[ statement.getClaim().getGuid() ] );
	} );
};

/**
 * @return {wikibase.datamodel.Statement[]}
 */
StatementWidget.prototype.getRemovals = function () {
	var data = this.getData(),
		currentStatements = data.toArray().reduce( function ( result, statement ) {
			result[ statement.getClaim().getGuid() ] = statement;
			return result;
		}, {} );

	return this.data.toArray().filter( function ( statement ) {
		return !( statement.getClaim().getGuid() in currentStatements );
	} );
};

/**
 * Undo any changes that have been made in any of the items.
 *
 * @return {jQuery.Promise}
 */
StatementWidget.prototype.reset = function () {
	this.setData( this.data );
	this.setEditing( false );
	this.$element.find( '.wbmi-statement-publish-error-msg' ).remove();

	return $.Deferred().resolve().promise();
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
		serializer = new wikibase.serialization.StatementSerializer(),
		promise = $.Deferred().resolve( { pageinfo: { lastrevid: baseRevId } } ).promise(),
		changedStatements = this.getChanges(),
		removedStatements = this.getRemovals(),
		hasFailures = false,
		disabled = this.disabled;

	this.setEditing( false );
	this.setDisabled( true );

	this.$element.find( '.wbmi-statement-publish-error-msg' ).remove();

	changedStatements.forEach( function ( statement ) {
		promise = promise.then( function ( statement, prevResponse ) {
			return api.postWithEditToken( {
				action: 'wbsetclaim',
				format: 'json',
				claim: JSON.stringify( serializer.serialize( statement ) ),
				// fetch the previous response's rev id and feed it to the next
				baserevid: prevResponse.pageinfo ? prevResponse.pageinfo.lastrevid : undefined,
				bot: 1,
				assertuser: !mw.user.isAnon() ? mw.user.getName() : undefined
			} ).catch(
				function ( errorCode, error ) {
					var apiError = wikibase.api.RepoApiError.newFromApiResponse( error, 'save' ),
						guid = statement.getClaim().getGuid(),
						item = self.getItems().filter( function ( item ) {
							return item.getData().getClaim().getGuid() === guid;
						} )[ 0 ];

					item.$element.after( $( '<div>' )
						.addClass( 'wbmi-statement-publish-error-msg' )
						.html( apiError.detailedMessage )
					);

					// replace statement with what we previously had, since we failed
					// to submit the changes...
					data.removeItem( statement );
					data.addItem( self.data.toArray().filter( function ( statement ) {
						return statement.getClaim().getGuid() === guid;
					} )[ 0 ] );

					hasFailures = true;

					// keep the update chain moving...
					return $.Deferred().resolve( prevResponse ).promise();
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
				assertuser: !mw.user.isAnon() ? mw.user.getName() : undefined
			} ).catch( function ( errorCode, error ) {
				var apiError = wikibase.api.RepoApiError.newFromApiResponse( error, 'save' );

				self.$element.append( $( '<div>' )
					.addClass( 'wbmi-statement-publish-error-msg' )
					.html( apiError.detailedMessage )
				);

				// restore statements that failed to delete
				removedStatements.forEach( function ( statement ) {
					data.addItem( statement );
				} );

				hasFailures = true;

				// keep the update chain moving...
				return $.Deferred().resolve( prevResponse ).promise();
			} );
		} );
	}

	// store data after we've submitted all changes, so that we'll reset to the
	// actual most recent correct state
	promise = promise.then( function ( response ) {
		var serializer, deserializer;

		// reset to original, pre-submit, disabled state
		self.setDisabled( disabled );

		// reset data to what we've just submitted to the API (items that failed
		// to submit have been reset to their previous state in `data`)
		serializer = new wikibase.serialization.StatementListSerializer();
		deserializer = new wikibase.serialization.StatementListDeserializer();

		self.data = deserializer.deserialize( serializer.serialize( data ) );

		// if we've had failures, put the widget back in edit mode, and reject
		// this promise, so callers will know something went wrong
		if ( hasFailures ) {
			self.setEditing( true );
			return $.Deferred().reject().promise();
		}

		return response;
	} );

	return promise;
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
				self.render();
				self.emit( 'widgetRemoved', self.propertyId );
			} );
		}
	} );
};

module.exports = StatementWidget;
