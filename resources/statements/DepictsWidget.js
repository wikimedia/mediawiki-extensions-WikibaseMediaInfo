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

		this.input = new statements.ItemInputWidget();
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
		this.addItem( item.getData(), data.label, data.url );
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
			entityId: this.entityId,
			propertyId: mw.config.get( 'wbmiProperties' ).depicts.id,
			value: value,
			label: label,
			url: url,
			rank: rank || 'normal'
		} );

		this.insertItem( widget );
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

		// remove existing items, then add new ones based on data passed in
		this.input.setData( {} );
		this.clearItems();

		data.forEach( function ( data ) {
			var widget = self.addItem( data.mainsnak.datavalue );
			widget.setData( data );
		} );
	};

	/**
	 * @return {number} [baseRevId]
	 * @return {jQuery.Promise}
	 */
	statements.DepictsWidget.prototype.submit = function ( baseRevId ) {
		var api = new mw.Api(),
			promise = $.Deferred().resolve( { pageinfo: { lastrevid: baseRevId } } ).promise(),
			callable = function ( statement, baseRevId ) {
				return api.postWithEditToken( {
					action: 'wbsetclaim',
					format: 'json',
					claim: JSON.stringify( statement ),
					baserevid: baseRevId,
					bot: 1,
					assertuser: !mw.user.isAnon() ? mw.user.getName() : undefined
				} );
			};

		this.getData().forEach( function ( statement ) {
			promise = promise
				// fetch the previous response's rev id and feed it to the next
				.then( function ( response ) {
					return response.pageinfo ? response.pageinfo.lastrevid : undefined;
				} )
				.then( callable.bind( null, statement ) );
		} );

		return promise;
	};

}( mw.mediaInfo.statements ) );
