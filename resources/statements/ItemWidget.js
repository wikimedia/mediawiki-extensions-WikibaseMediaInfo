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
	 */
	statements.ItemWidget = function MediaInfoStatementsItemWidget( config ) {
		statements.ItemWidget.parent.call( this, $.extend( { classes: [ 'wbmi-item' ] }, config ) );
		OO.ui.mixin.GroupElement.call( this, $.extend( {}, config ) );
		statements.FormatValueElement.call( this, $.extend( {}, config ) );

		var guidGenerator = new wikibase.utilities.ClaimGuidGenerator( config.entityId );

		this.propertyId = config.propertyId;
		this.value = config.value;
		this.label = config.label;
		this.url = config.url;
		this.rank = config.rank || 'normal';
		this.guid = guidGenerator.newGuid();

		this.$label = $( '<div>' );
		this.renderTitle();

		this.removeButton = new OO.ui.ButtonWidget( {
			classes: [ 'wbmi-item-remove' ],
			title: mw.message( 'wikibasemediainfo-statements-item-remove' ).text(),
			flags: 'destructive',
			icon: 'trash',
			framed: false
		} );
		this.removeButton.connect( this, { click: [ 'emit', 'delete' ] } );

		this.addQualifierButton = new OO.ui.ButtonWidget( {
			classes: [ 'wbmi-item-qualifier-add' ],
			label: mw.message( 'wikibasemediainfo-statements-item-add-qualifier' ).text(),
			flags: 'progressive',
			framed: false
		} );
		this.addQualifierButton.connect( this, { click: [ 'addQualifier' ] } );

		this.$element.append(
			$( '<div>' ).addClass( 'wbmi-item-container' ).append(
				this.$label,
				$( '<div>' ).addClass( 'wbmi-item-content' ).append(
					this.$group,
					this.addQualifierButton.$element
				)
			),
			this.removeButton.$element
		);
	};
	OO.inheritClass( statements.ItemWidget, OO.ui.Widget );
	OO.mixinClass( statements.ItemWidget, OO.ui.mixin.GroupElement );
	OO.mixinClass( statements.ItemWidget, statements.FormatValueElement );

	/**
	 * @param {Object} data
	 */
	statements.ItemWidget.prototype.getLabelAndUrlFromData = function ( data ) {
		var self = this;

		$.when(
			this.formatValue( data, 'text/plain' ),
			this.formatValue( data, 'text/html' )
		).then( function ( plain, html ) {
			self.label = plain[ 0 ].result;
			self.url = $( html[ 0 ].result ).attr( 'href' );
		} );
	};

	statements.ItemWidget.prototype.renderTitle = function () {
		var self = this,
			promise = $.Deferred().resolve().promise();

		if ( this.label === undefined || this.url === undefined ) {
			promise = $.when( this.formatValue( this.value, 'text/plain' ), this.formatValue( this.value, 'text/html' ) ).then(
				function ( plain, html ) {
					self.label = plain[ 0 ].result;
					self.url = $( html[ 0 ].result ).attr( 'href' );
				}
			);
		}
		promise.then( function () {
			var $title = self.buildTitle( self.value.value.id, self.label, self.url, self.rank );
			self.$label.empty().append( $title );
		} );
	};

	/**
	 * @param {string} id
	 * @param {string} label
	 * @param {string} url
	 * @param {string} rank
	 * @return {jQuery}
	 */
	statements.ItemWidget.prototype.buildTitle = function ( id, label, url, rank ) {
		var self = this,
			repo = id.indexOf( ':' ) >= 0 ? id.replace( /:.+$/, '' ) : '',
			$label = $( '<h4>' )
				.addClass( 'wbmi-entity-label' )
				.text( label ),
			$link = $( '<a>' )
				.addClass(
					'wbmi-entity-link ' +
					'wbmi-entity-link' + ( repo !== '' ? '-foreign-repo-' + repo : '-local-repo' )
				)
				.attr( 'href', url )
				.text( id.replace( /^.+:/, '' ) ),
			icon = new OO.ui.IconWidget( { icon: 'check' } ),
			$makePrimary = $( '<a>' )
				.addClass(
					'wbmi-entity-primary ' +
					'wbmi-entity' + ( rank === 'preferred' ? '-is-primary' : '-make-primary' )
				)
				.attr( 'href', '#' )
				.text(
					rank === 'preferred' ?
						mw.message( 'wikibasemediainfo-statements-item-is-primary' ).text() :
						mw.message( 'wikibasemediainfo-statements-item-make-primary' ).text()
				)
				.prepend( rank === 'preferred' ? icon.$element : '' )
				.on( 'click', function ( e ) {
					e.preventDefault();
					self.rank = self.rank === 'preferred' ? 'normal' : 'preferred';
					self.renderTitle();
				} );

		return $( '<div>' )
			.addClass( 'wbmi-entity-title' )
			.append(
				$label,
				$( '<div>' )
					.addClass( 'wbmi-entity-label-extra' )
					.html( '&bull;' )
					.prepend( $link )
					.append( $makePrimary )
			);
	};

	/**
	 * @param {Object} data
	 */
	statements.ItemWidget.prototype.addQualifier = function ( data ) {
		var properties = mw.config.get( 'wbmiDepictsQualifierProperties' ),
			widget = new statements.QualifierWidget( { properties: properties } );

		if ( data ) {
			widget.setData( data );
		}

		this.insertItem( widget );
		widget.connect( this, { delete: [ 'removeItems', [ widget ] ] } );
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

			this.renderTitle();
		}

		// remove existing qualifiers, then add new ones based on data passed in
		this.clearItems();
		if ( data.qualifiers !== undefined ) {
			Object.keys( data.qualifiers )
			// this is a workaround for Object.values not being supported in all browsers...
				.map( function ( key ) {
					return data.qualifiers[ key ];
				} )
				.forEach(
					function ( qualifiers ) {
						qualifiers.forEach( function ( qualifier ) {
							self.addQualifier( qualifier );
						} );
					}
				);
		}
	};

}( mw.mediaInfo.statements, wikibase ) );
