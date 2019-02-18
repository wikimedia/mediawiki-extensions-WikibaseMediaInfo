( function ( statements, wb ) {

	'use strict';

	/**
	 * @constructor
	 * @param {Object} [config] Configuration options
	 * @param {string} [config.entityId] Entity ID (e.g. M123 id of the file you just uploaded)
	 */
	statements.DepictsWidget = function MediaInfoStatementsDepictsWidget( config ) {
		statements.DepictsWidget.parent.call( this, config );
		OO.ui.mixin.GroupElement.call( this );

		this.entityId = config.entityId;
		this.data = new wb.datamodel.StatementList();

		this.input = new statements.ItemInputWidget( { classes: [ 'wbmi-depicts-input' ] } );
		this.input.connect( this, { choose: 'addItemFromInput' } );

		this.$element.append(
			this.input.$element,
			this.$group.addClass( 'wbmi-content-items-group' )
		);
	};
	OO.inheritClass( statements.DepictsWidget, OO.ui.Widget );
	OO.mixinClass( statements.DepictsWidget, OO.ui.mixin.GroupElement );

	/**
	 * @param {mw.mediaInfo.statements.ItemInputWidget} item
	 * @param {object} data
	 */
	statements.DepictsWidget.prototype.addItemFromInput = function ( item, data ) {
		var widget = this.createItem( item.getData(), data.label, data.url );
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
	 * @return {mw.mediaInfo.statements.ItemWidget}
	 */
	statements.DepictsWidget.prototype.createItem = function ( dataValue, label, url ) {
		var propertyId = mw.config.get( 'wbmiProperties' ).depicts.id,
			guidGenerator = new wb.utilities.ClaimGuidGenerator( this.entityId ),
			mainSnak = new wb.datamodel.PropertyValueSnak( propertyId, dataValue, null ),
			qualifiers = null,
			claim = new wb.datamodel.Claim( mainSnak, qualifiers, guidGenerator.newGuid() ),
			references = null,
			rank = wb.datamodel.Statement.RANK.NORMAL,
			statement = new wb.datamodel.Statement( claim, references, rank );

		return new statements.ItemWidget( {
			data: statement,
			editing: this.editing,
			label: label,
			url: url
		} );
	};

	/**
	 * @return {wikibase.datamodel.StatementList}
	 */
	statements.DepictsWidget.prototype.getData = function () {
		return new wb.datamodel.StatementList( this.getItems().map( function ( item ) {
			return item.getData();
		} ) );
	};

	/**
	 * @param {wikibase.datamodel.StatementList} data
	 */
	statements.DepictsWidget.prototype.setData = function ( data ) {
		var self = this;

		this.data = data;

		// remove existing items, then add new ones based on data passed in
		this.input.setData( undefined );
		this.clearItems();

		this.data.each( function ( i, statement ) {
			var dataValue = statement.getClaim().getMainSnak().getValue(),
				widget;

			if ( dataValue.getType() === 'string' && dataValue.getValue() === 'EMPTY_DEFAULT_PROPERTY_PLACEHOLDER' ) {
				// ignore invalid placeholder text
				return;
			}

			widget = self.createItem( dataValue );
			widget.setData( statement );
			widget.connect( self, { delete: [ 'removeItems', [ widget ] ] } );
			widget.connect( self, { delete: [ 'emit', 'change' ] } );
			widget.connect( self, { change: [ 'setEditing', true ] } );
			widget.connect( self, { change: [ 'emit', 'change' ] } );

			self.addItems( [ widget ] );
		} );
	};

	/**
	 * @param {boolean} editing
	 */
	statements.DepictsWidget.prototype.setEditing = function ( editing ) {
		var self = this;

		this.getItems().forEach( function ( item ) {
			try {
				item.setEditing( editing );
			} catch ( e ) {
				// when switching modes, make sure to remove invalid (incomplete) items
				self.removeItems( [ item ] );
			}
		} );
	};

	/**
	 * Undo any changes that have been made in any of the items.
	 *
	 * @return {jQuery.Promise}
	 */
	statements.DepictsWidget.prototype.reset = function () {
		this.setData( this.data );
		this.setEditing( false );
		this.$element.find( '.wbmi-statement-publish-error-msg' ).remove();

		return $.Deferred().resolve().promise();
	};

	/**
	 * @return {number} [baseRevId]
	 * @return {jQuery.Promise}
	 */
	statements.DepictsWidget.prototype.submit = function ( baseRevId ) {
		var self = this,
			api = new mw.Api(),
			data = this.getData(),
			serializer = new wb.serialization.StatementSerializer(),
			promise = $.Deferred().resolve( { pageinfo: { lastrevid: baseRevId } } ).promise(),
			previousStatements = this.data.toArray().reduce( function ( result, statement ) {
				result[ statement.getClaim().getGuid() ] = statement;
				return result;
			}, {} ),
			currentStatements = data.toArray().reduce( function ( result, statement ) {
				result[ statement.getClaim().getGuid() ] = statement;
				return result;
			}, {} ),
			changedStatements = data.toArray().filter( function ( statement ) {
				return !( statement.getClaim().getGuid() in previousStatements ) ||
					!statement.equals( previousStatements[ statement.getClaim().getGuid() ] );
			} ),
			removedStatements = this.data.toArray().filter( function ( statement ) {
				return !( statement.getClaim().getGuid() in currentStatements );
			} ),
			hasFailures = false;

		this.setEditing( false );

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
						var apiError = wb.api.RepoApiError.newFromApiResponse( error, 'save' ),
							guid = statement.getClaim().getGuid(),
							item = self.getItems().filter( function ( item ) {
								return item.getData().getClaim().getGuid() === guid;
							} )[ 0 ];

						item.$element.after( $( '<div>' )
							.addClass( 'wbmi-statement-publish-error-msg' )
							.text( apiError.detailedMessage )
						);

						// replace statement with what we previously had, since we failed
						// to submit the changes...
						data.removeItem( statement );
						data.addItem( previousStatements[ guid ] );

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
					var apiError = wb.api.RepoApiError.newFromApiResponse( error, 'save' );

					self.$element.append( $( '<div>' )
						.addClass( 'wbmi-statement-publish-error-msg' )
						.text( apiError.detailedMessage )
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
			// reset data to what we've just submitted to the API (items that failed
			// to submit have been reset to their previous state in `data`)
			var serializer = new wb.serialization.StatementListSerializer(),
				deserializer = new wb.serialization.StatementListDeserializer();

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

}( mw.mediaInfo.statements, wikibase ) );
