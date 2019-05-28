'use strict';

var ItemInputWidget = require( './ItemInputWidget.js' ),
	FormatValueElement = require( './FormatValueElement.js' ),
	ItemWidget = require( './ItemWidget.js' ),
	/**
	 * @constructor
	 * @param {Object} config Configuration options
	 * @param {string} config.entityId Entity ID (e.g. M123 id of the file you just uploaded)
	 * @param {string} config.propertyId Property ID (e.g. P123 id of `depicts` property)
	 * @param {string} [config.properties] Properties map: { propertyId: datatype, ...}
	 * @param {Object} [config.qualifiers] Qualifiers map: { propertyId: datatype, ...}
	 * @param {string} [config.title]
	 */
	StatementWidget = function MediaInfoStatementsStatementWidget( config ) {
		var
			properties = config.properties || mw.config.get( 'wbmiProperties' ) || {},
			propertyId = config.propertyId,
			qualifiers = config.qualifiers || mw.config.get( 'wbmiDepictsQualifierProperties' ) || {},
			dataValue = new wikibase.datamodel.EntityId( propertyId ),
			$label = $( '<h4>' )
				.addClass( 'wbmi-entity-label' )
				.text( '' ), // will be filled out later (after formatValue call)
			$link = $( '<a>' )
				.addClass( 'wbmi-entity-link ' ) // repo class will be added later (after formatValue call)
				.attr( 'href', '#' ) // will be filled out later (after formatValue call)
				.attr( 'target', '_blank' )
				.text( propertyId.replace( /^.+:/, '' ) ),
			titles = mw.config.get( 'wbmiPropertyTitles' ) || [],
			learnMoreLink = mw.config.get( 'wbmiDepictsHelpUrl' );

		config.propertyId = propertyId;
		config.properties = properties;
		config.qualifiers = qualifiers;

		StatementWidget.parent.call( this, config );
		OO.ui.mixin.GroupElement.call( this );

		this.config = config;
		this.entityId = config.entityId;
		this.propertyId = config.propertyId;
		this.properties = config.properties;
		this.qualifiers = config.qualifiers;
		this.title = config.title || titles[ this.propertyId ];
		this.data = new wikibase.datamodel.StatementList();
		this.editing = false;

		this.input = new ItemInputWidget( {
			classes: [ 'wbmi-statement-input' ],
			type: this.properties[ propertyId ] || 'string',
			disabled: this.disabled
		} );
		this.input.connect( this, { choose: 'addItemFromInput' } );

		this.$footer = $( '<div>' ).addClass( 'wbmi-statement-footer' );

		this.removeButton = new OO.ui.ButtonWidget( {
			label: mw.message( 'wikibasemediainfo-statements-remove' ).text(),
			classes: [ 'wbmi-statement-remove' ],
			flags: 'destructive',
			framed: false
		} );
		this.removeButton.connect( this, { click: 'clearItems' } );
		this.learnMoreButton = new OO.ui.ButtonWidget( {
			label: mw.message( 'wikibasemediainfo-statements-learn-more' ).text(),
			classes: [ 'wbmi-statement-learn-more' ],
			flags: 'progressive',
			framed: false
		} );
		this.learnMoreButton.connect( this, { click: window.open.bind( window, learnMoreLink, '_blank' ) } );
		this.connect( this, { change: 'renderFooter' } );

		this.$element.addClass( 'wbmi-statements-widget' ).append(
			$( '<div>' ).addClass( 'wbmi-statement-header' ).append(
				$( '<div>' ).addClass( 'wbmi-entity-data' ).append(
					$( '<div>' ).addClass( 'wbmi-entity-title' ).append(
						this.title ? $( '<h3>' ).addClass( 'wbmi-statements-title' ).text( this.title ) : '',
						$label
					),
					$link
				)
			),
			this.input.$element,
			this.$group.addClass( 'wbmi-content-items-group' ),
			this.$footer.append(
				$( '<div>' ).addClass( 'wbmi-statement-footer-buttons' ).append(
					this.removeButton.$element.hide().addClass( 'wmbi-hidden' ),
					learnMoreLink ? this.learnMoreButton.$element : ''
				).hide()
			)
		);

		// fetch property value & url
		$.when(
			this.formatValue( dataValue, 'text/plain' ),
			this.formatValue( dataValue, 'text/html' )
		).then( function ( plain, html ) {
			var repo = '';
			// if the url is not relative (= has a prototype), it links to a foreign
			// repository and we can extract the repo name from the title argument
			if ( /^[a-z0-9]+:\/\//.test( $( html ).attr( 'href' ) ) ) {
				repo = $( html ).attr( 'title' ).replace( /:.+$/, '' );
			}
			$label.text( plain );
			$link.attr( 'href', $( html ).attr( 'href' ) );
			// Classes used: wbmi-entity-link-foreign-repo-* and wbmi-entity-link-local-repo
			$link.addClass( 'wbmi-entity-link' + ( repo !== '' ? '-foreign-repo-' + repo : '-local-repo' ) );
		} );

		this.renderFooter();
	};
OO.inheritClass( StatementWidget, OO.ui.Widget );
OO.mixinClass( StatementWidget, OO.ui.mixin.GroupElement );
OO.mixinClass( StatementWidget, FormatValueElement );

StatementWidget.prototype.renderFooter = function () {
	var showRemove = this.getItems().length > 0 && this.editing;
	this.removeButton.$element.toggle( showRemove );
	this.$footer.find( '.wbmi-statement-footer-buttons' ).toggle( this.editing );
};

/**
 * @param {ItemInputWidget} item
 * @param {Object} data
 */
StatementWidget.prototype.addItemFromInput = function ( item, data ) {
	var widget = this.createItem( item.getData(), data.label, data.url, data.repository );
	widget.connect( this, { delete: [ 'removeItems', [ widget ] ] } );
	widget.connect( this, { delete: [ 'emit', 'change' ] } );
	widget.connect( this, { change: [ 'setEditing', true ] } );
	widget.connect( this, { change: [ 'emit', 'change' ] } );

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
 * @param {string} [label]
 * @param {string} [url]
 * @param {string} [repo]
 * @return {ItemWidget}
 */
StatementWidget.prototype.createItem = function ( dataValue, label, url, repo ) {
	var guidGenerator = new wikibase.utilities.ClaimGuidGenerator( this.entityId ),
		mainSnak = new wikibase.datamodel.PropertyValueSnak( this.propertyId, dataValue, null ),
		qualifiers = null,
		claim = new wikibase.datamodel.Claim( mainSnak, qualifiers, guidGenerator.newGuid() ),
		references = null,
		rank = wikibase.datamodel.Statement.RANK.NORMAL,
		statement = new wikibase.datamodel.Statement( claim, references, rank );

	return new ItemWidget( {
		disabled: this.disabled,
		qualifiers: this.qualifiers,
		data: statement,
		editing: this.editing,
		label: label,
		url: url,
		repo: repo
	} );
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

	self = this;
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

		// we've potentially received more info that we had when constructing this
		// object: extract the id & data type of this statement & adjust the
		// input type accordingly
		self.properties[ mainSnak.getPropertyId() ] = mainSnak.getValue().getType();
		self.input.setInputType( mainSnak.getValue().getType() );

		if ( widget ) {
			self.moveItem( widget, i );
		} else {
			widget = self.createItem( mainSnak.getValue() );
			widget.setData( statement );
			widget.connect( self, { delete: [ 'removeItems', [ widget ] ] } );
			widget.connect( self, { delete: [ 'emit', 'change' ] } );
			widget.connect( self, { change: [ 'setEditing', true ] } );
			widget.connect( self, { change: [ 'emit', 'change' ] } );

			self.insertItem( widget, i );
		}
	} );

	this.data = data;
};

/**
 * @param {boolean} editing
 */
StatementWidget.prototype.setEditing = function ( editing ) {
	var self = this;

	this.editing = editing;

	this.getItems().forEach( function ( item ) {
		try {
			item.setEditing( editing );
		} catch ( e ) {
			// when switching modes, make sure to remove invalid (incomplete) items
			self.removeItems( [ item ] );
		}
	} );

	this.renderFooter();
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
		api = wikibase.api.getLocationAgnosticMwApi( mw.config.get( 'wbmiRepoApiUrl', mw.config.get( 'wbRepoApiUrl' ) ) ),
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

module.exports = StatementWidget;
