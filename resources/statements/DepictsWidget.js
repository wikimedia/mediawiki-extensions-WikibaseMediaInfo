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
		var widget = this.addItem( item.getData(), data.label, data.url );
		this.emit( 'manual-add', widget );
		// we just added a new item - let's switch all of them into editing mode
		this.setEditing( true );
	};

	/**
	 * @param {dataValues.DataValue} dataValue
	 * @param {string} [label]
	 * @param {string} [url]
	 * @return {mw.mediaInfo.statements.ItemWidget}
	 */
	statements.DepictsWidget.prototype.addItem = function ( dataValue, label, url ) {
		var propertyId = mw.config.get( 'wbmiProperties' ).depicts.id,
			guidGenerator = new wb.utilities.ClaimGuidGenerator( this.entityId ),
			mainSnak = new wb.datamodel.PropertyValueSnak( propertyId, dataValue, null ),
			qualifiers = null,
			claim = new wb.datamodel.Claim( mainSnak, qualifiers, guidGenerator.newGuid() ),
			references = null,
			rank = wb.datamodel.Statement.RANK.NORMAL,
			statement = new wb.datamodel.Statement( claim, references, rank ),
			widget = new statements.ItemWidget( {
				data: statement,
				editing: this.editing,
				label: label,
				url: url
			} );

		this.addItems( [ widget ] );

		widget.connect( this, { delete: [ 'removeItems', [ widget ] ] } );

		// clear the autocomplete input field to select entities to add
		this.input.setData( undefined );

		return widget;
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

			widget = self.addItem( dataValue );
			widget.setData( statement );
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
		this.getItems().forEach( function ( item ) {
			item.setEditing( false );
		} );

		this.setData( this.data );

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
			} );

		this.setEditing( false );

		changedStatements.forEach( function ( data ) {
			promise = promise.then( function ( data, prevResponse ) {
				return api.postWithEditToken( {
					action: 'wbsetclaim',
					format: 'json',
					claim: JSON.stringify( serializer.serialize( data ) ),
					// fetch the previous response's rev id and feed it to the next
					baserevid: prevResponse.pageinfo ? prevResponse.pageinfo.lastrevid : undefined,
					bot: 1,
					assertuser: !mw.user.isAnon() ? mw.user.getName() : undefined
				} );
			}.bind( null, data ) );
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
				} );
			} );
		}

		// store data after we've successfully submitted all changes, so that we'll
		// reset to the actual most recent correct state
		promise.then( function () {
			// reset data to what we've just submitted to the API
			self.setData( data );
		} );

		return promise;
	};

}( mw.mediaInfo.statements, wikibase ) );
