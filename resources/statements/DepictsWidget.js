( function ( statements ) {

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
	 * @param {Object} value
	 * @param {string} [label]
	 * @param {string} [url]
	 * @param {string} [rank]
	 * @return {mw.mediaInfo.statements.ItemWidget}
	 */
	statements.DepictsWidget.prototype.addItem = function ( value, label, url, rank ) {
		var widget = new statements.ItemWidget( {
			editing: this.editing,
			entityId: this.entityId,
			propertyId: mw.config.get( 'wbmiProperties' ).depicts.id,
			value: value,
			label: label,
			url: url,
			rank: rank
		} );

		this.addItems( [ widget ] );

		widget.connect( this, { delete: [ 'removeItems', [ widget ] ] } );

		// clear the autocomplete input field to select entities to add
		this.input.setData( {} );

		return widget;
	};

	/**
	 * @return {Array}
	 */
	statements.DepictsWidget.prototype.getData = function () {
		return this.getItems().map( function ( item ) {
			return item.getData();
		} );
	};

	/**
	 * @param {Array} data
	 */
	statements.DepictsWidget.prototype.setData = function ( data ) {
		var self = this;

		this.data = data;

		// remove existing items, then add new ones based on data passed in
		this.input.setData( {} );
		this.clearItems();

		this.data.forEach( function ( data ) {
			var widget = self.addItem( data.mainsnak.datavalue );
			widget.setData( data );
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
			promise = $.Deferred().resolve( { pageinfo: { lastrevid: baseRevId } } ).promise();

		this.getItems().forEach( function ( item ) {
			promise = promise.then( function ( item, prevResponse ) {
				item.setEditing( false );
				return api.postWithEditToken( {
					action: 'wbsetclaim',
					format: 'json',
					claim: JSON.stringify( item.getData() ),
					// fetch the previous response's rev id and feed it to the next
					baserevid: prevResponse.pageinfo ? prevResponse.pageinfo.lastrevid : undefined,
					bot: 1,
					assertuser: !mw.user.isAnon() ? mw.user.getName() : undefined
				} );
			}.bind( null, item ) );
		} );

		// store data after we've successfully submitted all changes, so that we'll
		// reset to the actual most recent correct state
		promise.then( function () {
			self.data = self.getData();
		} );

		return promise;
	};

}( mw.mediaInfo.statements ) );
