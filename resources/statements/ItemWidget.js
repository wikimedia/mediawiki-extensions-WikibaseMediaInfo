( function ( statements, wikibase ) {

	'use strict';

	/**
	 * @constructor
	 * @param {Object} config Configuration options
	 * @param {string} config.entityId Entity ID (e.g. M123 id of the file you just uploaded)
	 * @param {string} config.propertyId Property ID (e.g. P737 depicts id)
	 * @param {Object} config.value Value (e.g. {"value":{"id":"Q1"},"type":"wikibase-entityid"})
	 * @param {string} [config.label] Label for this item (e.g. 'cat')
	 * @param {string} [config.url] URL to this item (e.g. /wiki/Item:Q1)
	 * @param {string} [config.rank] Rank (e.g. 'normal' (default) or 'preferred')
	 * @param {string} [config.editing] True for edit mode, False for read mode
	 */
	statements.ItemWidget = function MediaInfoStatementsItemWidget( config ) {
		statements.ItemWidget.parent.call( this, $.extend( { classes: [ 'wbmi-item' ] }, config ) );
		OO.ui.mixin.GroupElement.call( this, $.extend( {}, config ) );
		statements.FormatValueElement.call( this, $.extend( {}, config ) );

		var guidGenerator = new wikibase.utilities.ClaimGuidGenerator( config.entityId );

		this.editing = !!config.editing;

		this.propertyId = config.propertyId;
		this.value = config.value;
		this.label = config.label;
		this.url = config.url;
		this.rank = config.rank || 'normal';
		this.guid = guidGenerator.newGuid();

		this.removeButton = new OO.ui.ButtonWidget( {
			classes: [ 'wbmi-item-remove' ],
			title: mw.message( 'wikibasemediainfo-statements-item-remove' ).text(),
			flags: 'destructive',
			icon: 'trash',
			framed: false
		} );
		this.removeButton.connect( this, { click: [ 'emit', 'delete' ] } );

		this.showQualifiers = mw.config.get( 'wbmiShowQualifiers' );
		if ( this.showQualifiers ) {
			this.addQualifierButton = new OO.ui.ButtonWidget( {
				classes: [ 'wbmi-item-qualifier-add' ],
				label: mw.message( 'wikibasemediainfo-statements-item-add-qualifier' ).text(),
				flags: 'progressive',
				framed: false
			} );
			this.addQualifierButton.connect( this, { click: [ 'addQualifier' ] } );
		}

		this.render();
	};
	OO.inheritClass( statements.ItemWidget, OO.ui.Widget );
	OO.mixinClass( statements.ItemWidget, OO.ui.mixin.GroupElement );
	OO.mixinClass( statements.ItemWidget, statements.FormatValueElement );

	statements.ItemWidget.prototype.render = function () {
		var self = this,
			promise = $.Deferred().resolve().promise();

		if ( this.label === undefined || this.url === undefined ) {
			promise = $.when(
				this.formatValue( this.value, 'text/plain' ),
				this.formatValue( this.value, 'text/html' )
			).then(
				function ( plain, html ) {
					self.label = plain;
					self.url = $( html ).attr( 'href' );
				}
			);
		}

		promise.then( this.renderInternal.bind( this ) );
	};

	statements.ItemWidget.prototype.renderInternal = function () {
		var self = this,
			id = this.value.value.id || '',
			repo = id.indexOf( ':' ) >= 0 ? id.replace( /:.+$/, '' ) : '',
			$label = $( '<h4>' )
				.addClass( 'wbmi-entity-label' )
				.text( this.label ),
			$link = $( '<a>' )
				.addClass(
					'wbmi-entity-link ' +
					'wbmi-entity-link' + ( repo !== '' ? '-foreign-repo-' + repo : '-local-repo' )
				)
				.attr( 'href', this.url )
				.text( id.replace( /^.+:/, '' ) ),
			icon = new OO.ui.IconWidget( { icon: 'check' } ),
			$makePrimary = $( '<a>' )
				.addClass(
					'wbmi-entity-primary ' +
					'wbmi-entity' + ( this.rank === 'preferred' ? '-is-primary' : '-make-primary' )
				)
				.attr( 'href', '#' )
				.text(
					this.rank === 'preferred' ?
						mw.message( 'wikibasemediainfo-statements-item-is-primary' ).text() :
						mw.message( 'wikibasemediainfo-statements-item-make-primary' ).text()
				)
				.prepend( this.rank === 'preferred' ? icon.$element : '' )
				.on( 'click', function ( e ) {
					e.preventDefault();
					self.rank = self.rank === 'preferred' ? 'normal' : 'preferred';
					self.render();
				} ),
			itemContainer = $( '<div>' ).addClass( 'wbmi-item-container' );

		this.$element.toggleClass( 'wbmi-item-edit', this.editing );
		this.$element.toggleClass( 'wbmi-item-read', !this.editing );

		// before we wipe out & re-build this entire thing, detach a few nodes that
		// we'll be re-using...
		this.$group.detach();
		this.removeButton.$element.detach();
		this.$element.empty();

		itemContainer.append(
			$( '<div>' ).addClass( 'wbmi-entity-title' ).append(
				$label,
				$( '<div>' )
					.addClass( 'wbmi-entity-label-extra' )
					.html( '&bull;' )
					.prepend( $link )
					.append( $makePrimary )
			)
		);

		if ( this.showQualifiers ) {
			this.addQualifierButton.$element.detach();
			itemContainer.append(
				$( '<div>' ).addClass( 'wbmi-item-content' ).append(
					this.$group,
					this.editing ? this.addQualifierButton.$element : undefined
				)
			);
		}

		this.$element.append(
			itemContainer,
			this.editing ? this.removeButton.$element : undefined
		);
	};

	/**
	 * @param {Object} data
	 */
	statements.ItemWidget.prototype.addQualifier = function ( data ) {
		var properties = mw.config.get( 'wbmiDepictsQualifierProperties' ),
			widget = new statements.QualifierWidget( {
				editing: this.editing,
				properties: properties
			} );

		if ( data ) {
			widget.setData( data );
		}

		this.addItems( [ widget ] );
		widget.connect( this, { delete: [ 'removeItems', [ widget ] ] } );
	};

	/**
	 * @param {boolean} editing
	 */
	statements.ItemWidget.prototype.setEditing = function ( editing ) {
		if ( this.editing !== editing ) {
			this.editing = editing;
			this.render();
		}
	};

	/**
	 * @return {Object}
	 */
	statements.ItemWidget.prototype.getData = function () {
		var qualifiers = this.getItems()
			.map( function ( item ) {
				// try to fetch data - if it fails (likely because of incomplete input),
				// we'll just ignore that qualifier
				try {
					return item.getData();
				} catch ( e ) {
					return null;
				}
			} )
			.reduce( function ( result, data ) {
				if ( data !== null ) {
					result[ data.property ] = result[ data.property ] || [];
					result[ data.property ].push( data );
				}
				return result;
			}, {} );

		return {
			type: 'statement',
			mainsnak: {
				snaktype: 'value',
				property: this.propertyId,
				datavalue: this.value
			},
			id: this.guid,
			qualifiers: qualifiers,
			'qualifiers-order': Object.keys( qualifiers ),
			rank: this.rank
		};
	};

	/**
	 * @param {Object} data
	 */
	statements.ItemWidget.prototype.setData = function ( data ) {
		var self = this;

		this.propertyId = data.mainsnak.property;
		this.guid = data.id;
		this.rank = data.rank;

		// save & re-render title
		if ( this.value !== data.mainsnak.datavalue ) {
			this.value = data.mainsnak.datavalue;

			// property has changed: invalidate the label & url
			this.label = undefined;
			this.url = undefined;

			this.render();
		}

		// remove existing qualifiers, then add new ones based on data passed in
		this.clearItems();
		Object.keys( data.qualifiers || {} )
			// this is a workaround for Object.values not being supported in all browsers...
			.map( function ( key ) {
				return data.qualifiers[ key ];
			} )
			.forEach( function ( qualifiers ) {
				qualifiers.forEach( function ( qualifier ) {
					self.addQualifier( qualifier );
				} );
			} );
	};

}( mw.mediaInfo.statements, wikibase ) );
