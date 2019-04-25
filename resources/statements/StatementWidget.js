( function ( statements, wb ) {

	'use strict';

	/**
	 * @constructor
	 * @param {Object} [config] Configuration options
	 * @param {string} config.entityId Entity ID (e.g. M123 id of the file you just uploaded)
	 * @param {string} config.propertyId Property ID (e.g. P123 id of `depicts` property)
	 * @param {string} config.properties Properties map: { propertyId: datatype, ...}
	 * @param {Object} [config.qualifiers] Qualifiers map: { propertyId: datatype, ...}
	 * @param {string} [config.title]
	 */
	statements.StatementWidget = function MediaInfoStatementsStatementWidget( config ) {
		var
			properties = config.properties || mw.config.get( 'wbmiProperties' ) || {},
			// wbmiProperties-based fallbacks are for backward compatibility, back
			// when this was for depicts only, and propertyId wasn't required
			propertyId = config.propertyId || Object.keys( properties )[ 0 ] || properties.depicts,
			qualifiers = config.qualifiers || mw.config.get( 'wbmiDepictsQualifierProperties' ) || {},
			dataValue = new wb.datamodel.EntityId( propertyId ),
			$label = $( '<h4>' )
				.addClass( 'wbmi-entity-label' )
				.text( '' ), // will be filled out later (after formatValue call)
			$link = $( '<a>' )
				.addClass( 'wbmi-entity-link ' ) // repo class will be added later (after formatValue call)
				.attr( 'href', '#' ) // will be filled out later (after formatValue call)
				.attr( 'target', '_blank' )
				.text( propertyId.replace( /^.+:/, '' ) );

		config.propertyId = propertyId;
		config.properties = properties;
		config.qualifiers = qualifiers;

		statements.StatementWidget.parent.call( this, config );
		OO.ui.mixin.GroupElement.call( this );

		this.config = config;
		this.entityId = config.entityId;
		this.propertyId = config.propertyId;
		this.properties = config.properties;
		this.qualifiers = config.qualifiers;
		this.title = config.title || mw.config.get( 'wbmiPropertyTitles' )[ this.propertyId ];
		this.data = new wb.datamodel.StatementList();
		this.editing = false;

		this.input = new statements.ItemInputWidget( {
			classes: [ 'wbmi-statement-input' ],
			type: this.properties[ propertyId ] || 'string'
		} );
		this.input.connect( this, { choose: 'addItemFromInput' } );

		this.$footer = $( '<div>' ).addClass( 'wbmi-statement-footer' );
		this.$removeLink = $( '<a>' )
			.addClass( 'wbmi-statement-remove' )
			.text( mw.message( 'wikibasemediainfo-statements-remove' ).text() );
		this.$learnMoreLink = $( '<a>' )
			.addClass( 'wbmi-statement-learn-more' )
			.html( mw.message( 'wikibasemediainfo-statements-learn-more' ).parse() )
			.attr( 'href', mw.config.get( 'wbmiDepictsHelpUrl' ) )
			.attr( 'target', '_blank' );

		this.$removeLink.on( 'click', this.clearItems.bind( this ) );
		this.connect( this, { change: 'renderFooter' } );

		this.$element.addClass( 'wbmi-statements-widget' ).append(
			this.title ? $( '<h3>' ).addClass( 'wbmi-statements-title' ).text( this.title ) : '',
			$( '<div>' ).addClass( 'wbmi-statements-header wbmi-entity-title' ).append(
				$label,
				$( '<div>' ).addClass( 'wbmi-entity-label-extra' ).append( $link )
			),
			this.input.$element,
			this.$group.addClass( 'wbmi-content-items-group' ),
			this.$footer.append(
				this.$removeLink.hide().addClass( 'wmbi-hidden' ),
				this.$learnMoreLink.attr( 'href' ) !== '' ? this.$learnMoreLink : ''
			).hide()
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
	OO.inheritClass( statements.StatementWidget, OO.ui.Widget );
	OO.mixinClass( statements.StatementWidget, OO.ui.mixin.GroupElement );
	OO.mixinClass( statements.StatementWidget, statements.FormatValueElement );

	statements.StatementWidget.prototype.renderFooter = function () {
		var showRemove = this.getItems().length > 0 && this.editing;
		this.$removeLink.toggle( showRemove ).toggleClass( 'wbmi-hidden', !showRemove );
		this.$footer.toggle( this.editing );
	};

	/**
	 * @param {mw.mediaInfo.statements.ItemInputWidget} item
	 * @param {Object} data
	 */
	statements.StatementWidget.prototype.addItemFromInput = function ( item, data ) {
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
	 * @return {mw.mediaInfo.statements.ItemWidget}
	 */
	statements.StatementWidget.prototype.createItem = function ( dataValue, label, url, repo ) {
		var guidGenerator = new wb.utilities.ClaimGuidGenerator( this.entityId ),
			mainSnak = new wb.datamodel.PropertyValueSnak( this.propertyId, dataValue, null ),
			qualifiers = null,
			claim = new wb.datamodel.Claim( mainSnak, qualifiers, guidGenerator.newGuid() ),
			references = null,
			rank = wb.datamodel.Statement.RANK.NORMAL,
			statement = new wb.datamodel.Statement( claim, references, rank );

		return new statements.ItemWidget( {
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
	statements.StatementWidget.prototype.getData = function () {
		return new wb.datamodel.StatementList( this.getItems().map( function ( item ) {
			return item.getData();
		} ) );
	};

	/**
	 * Update DOM with latest data, sorted by prominence
	 * @param {wikibase.datamodel.StatementList} data
	 */
	statements.StatementWidget.prototype.setData = function ( data ) {
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

			if ( !( mainSnak instanceof wb.datamodel.PropertyValueSnak ) ) {
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
	statements.StatementWidget.prototype.setEditing = function ( editing ) {
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
	 * @return {wikibase.datamodel.Statement[]}
	 */
	statements.StatementWidget.prototype.getChanges = function () {
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
	statements.StatementWidget.prototype.getRemovals = function () {
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
	statements.StatementWidget.prototype.reset = function () {
		this.setData( this.data );
		this.setEditing( false );
		this.$element.find( '.wbmi-statement-publish-error-msg' ).remove();

		return $.Deferred().resolve().promise();
	};

	/**
	 * @param {number} [baseRevId]
	 * @return {jQuery.Promise}
	 */
	statements.StatementWidget.prototype.submit = function ( baseRevId ) {
		var self = this,
			api = wikibase.api.getLocationAgnosticMwApi( mw.config.get( 'wbmiRepoApiUrl', mw.config.get( 'wbRepoApiUrl' ) ) ),
			data = this.getData(),
			serializer = new wb.serialization.StatementSerializer(),
			promise = $.Deferred().resolve( { pageinfo: { lastrevid: baseRevId } } ).promise(),
			changedStatements = this.getChanges(),
			removedStatements = this.getRemovals(),
			hasFailures = false;

		this.setEditing( false );
		this.input.setDisabled( true );

		// disable 'make prominent' links
		this.getItems().forEach( function ( item ) {
			item.setDisabled( true );
		} );

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
					var apiError = wb.api.RepoApiError.newFromApiResponse( error, 'save' );

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

			// re-enable 'make prominent' links
			self.getItems().forEach( function ( item ) {
				item.setDisabled( false );
			} );

			// reset data to what we've just submitted to the API (items that failed
			// to submit have been reset to their previous state in `data`)
			serializer = new wb.serialization.StatementListSerializer();
			deserializer = new wb.serialization.StatementListDeserializer();

			self.data = deserializer.deserialize( serializer.serialize( data ) );

			// re-enable statements input
			self.input.setDisabled( false );

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

	// backward compatibility: this class used to be named differently
	statements.DepictsWidget = statements.StatementWidget;

}( mw.mediaInfo.statements, wikibase ) );
