( function ( statements, wb ) {

	'use strict';

	/**
	 * @constructor
	 * @param {Object} config Configuration options
	 * @param {wikibase.datamodel.Statement} config.data
	 * @param {Object} config.qualifiers Qualifiers map: { propertyId: datatype, ...}
	 * @param {string} config.entityId Entity ID (e.g. 'M123' id of the file you just uploaded)
	 * @param {string} [config.label] Label for this item (e.g. 'cat')
	 * @param {string} [config.url] URL to this item (e.g. '/wiki/Item:Q1')
	 * @param {string} [config.repo] Repository name of this item (e.g. 'wikidata')
	 * @param {string} [config.editing] True for edit mode, False for read mode
	 */
	statements.ItemWidget = function MediaInfoStatementsItemWidget( config ) {
		statements.ItemWidget.parent.call( this, $.extend( { classes: [ 'wbmi-item' ] }, config ) );
		OO.ui.mixin.GroupElement.call( this, $.extend( {}, config ) );
		statements.FormatValueElement.call( this, $.extend( {}, config ) );

		this.editing = !!config.editing;

		this.qualifiers = config.qualifiers;
		this.data = config.data;
		this.label = config.label;
		this.url = config.url;
		this.repo = config.repo;
		this.config = config;

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

		this.render();
	};
	OO.inheritClass( statements.ItemWidget, OO.ui.Widget );
	OO.mixinClass( statements.ItemWidget, OO.ui.mixin.GroupElement );
	OO.mixinClass( statements.ItemWidget, statements.FormatValueElement );

	statements.ItemWidget.prototype.render = function () {
		var self = this,
			dataValue = this.data.getClaim().getMainSnak().getValue(),
			promise = $.when(
				this.formatValue( dataValue, 'text/plain' ),
				this.formatValue( dataValue, 'text/html' )
			);

		if ( this.label === undefined || this.url === undefined ) {
			promise.then(
				function ( plain, html ) {
					self.label = plain;
					self.url = $( html ).attr( 'href' );

					// if the url is not relative (= has a prototype), it links to a foreign
					// repository and we can extract the repo name from the title argument
					self.repo = '';
					if ( /^[a-z0-9]+:\/\//.test( self.url ) ) {
						self.repo = $( html ).attr( 'title' ).replace( /:.+$/, '' );
					}
				}
			);
		} else {
			// if this.label & this.url have been passed in, we don't
			// really need to format these values, so we can just go
			// ahead and render
			// we are still doing the formatValue calls, however,
			// because even if we don't use them yet, we will need to
			// do them later on (after submitting to API and rerendering)
			// and we might as well fetch & cache them now to speed
			// things up later...
			promise = $.Deferred().resolve().promise();
		}

		promise.then( this.renderInternal.bind( this ) );
	};

	statements.ItemWidget.prototype.toggleItemProminence = function ( e ) {
		e.preventDefault();
		var self = this,
			isNowProminent = self.data.getRank() === wb.datamodel.Statement.RANK.NORMAL;

		if ( self.disabled ) {
			return;
		}

		self.data.setRank(
			isNowProminent ?
				wb.datamodel.Statement.RANK.PREFERRED :
				wb.datamodel.Statement.RANK.NORMAL
		);

		self.render();
		self.emit( 'change', self );
	};

	statements.ItemWidget.prototype.renderInternal = function () {
		var self = this,
			id = this.data.getClaim().getMainSnak().getValue().toJSON().id || '',
			$label = $( '<h4>' )
				.addClass( 'wbmi-entity-label' )
				.text( this.label ),
			$link = $( '<a>' )
				.addClass(
					'wbmi-entity-link ' +
					// Classes used: wbmi-entity-link-foreign-repo-* and wbmi-entity-link-local-repo
					'wbmi-entity-link' + ( this.repo !== '' ? '-foreign-repo-' + this.repo : '-local-repo' )
				)
				.attr( 'href', this.url )
				.attr( 'target', '_blank' )
				.text( id.replace( /^.+:/, '' ) ),
			icon = new OO.ui.IconWidget( { icon: 'check' } ),
			$makePrimary = $( '<a>' )
				.addClass(
					'wbmi-entity-primary ' +
					'wbmi-entity' + ( this.data.getRank() === wb.datamodel.Statement.RANK.NORMAL ? '-mark-as-prominent' : '-is-prominent' )
				)
				.attr( 'href', '#' )
				.text(
					this.data.getRank() === wb.datamodel.Statement.RANK.NORMAL ?
						mw.message( 'wikibasemediainfo-statements-item-mark-as-prominent' ).text() :
						mw.message( 'wikibasemediainfo-statements-item-is-prominent' ).text()
				)
				.prepend( this.data.getRank() === wb.datamodel.Statement.RANK.NORMAL ? '' : icon.$element )
				.on( 'click', self.toggleItemProminence.bind( self ) ),
			itemContainer = $( '<div>' ).addClass( 'wbmi-item-container' );

		this.$element.toggleClass( 'wbmi-item-edit', this.editing );
		this.$element.toggleClass( 'wbmi-item-read', !this.editing );

		// before we wipe out & re-build this entire thing, detach a few nodes that
		// we'll be re-using...
		this.$group.detach();
		this.removeButton.$element.detach();
		this.addQualifierButton.$element.detach();
		this.$element.empty();

		itemContainer.append(
			$( '<div>' ).addClass( 'wbmi-entity-title' ).append(
				$label,
				$( '<div>' )
					.addClass( 'wbmi-entity-label-extra' )
					.append( $link, $makePrimary )
			)
		);

		if ( Object.keys( this.qualifiers ).length > 0 ) {
			itemContainer.append(
				$( '<div>' ).addClass( 'wbmi-item-content' ).append(
					this.$group.addClass( 'wbmi-item-content-group' ),
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
	 * @param {wikibase.datamodel.Snak|undefined} data
	 */
	statements.ItemWidget.prototype.addQualifier = function ( data ) {
		var widget = new statements.QualifierWidget( {
			editing: this.editing,
			qualifiers: this.qualifiers
		} );

		if ( data ) {
			widget.setData( data );
		}

		this.addItems( [ widget ] );
		this.onQualifierChange( widget );
		widget.connect( this, { delete: [ 'removeItems', [ widget ] ] } );
		widget.connect( this, { delete: [ 'onQualifierChange', widget ] } );
		widget.connect( this, { change: [ 'onQualifierChange', widget ] } );
	};

	statements.ItemWidget.prototype.onQualifierChange = function () {
		// it's easier just to generate a new set of qualifiers instead of fetching the
		// existing one, keeping track of which is/was where, and making updates...
		var qualifiers = new wb.datamodel.SnakList( this.getItems()
			.map( function ( item ) {
				// try to fetch data - if it fails (likely because of incomplete input),
				// we'll just ignore that qualifier
				try {
					return item.getData();
				} catch ( e ) {
					return undefined;
				}
			} )
			.filter( function ( data ) {
				return data instanceof wb.datamodel.Snak;
			} ) );

		this.data.getClaim().setQualifiers( qualifiers );

		this.emit( 'change', this );
	};

	/**
	 * @inheritdoc
	 */
	statements.ItemWidget.prototype.setDisabled = function ( disabled ) {
		if ( this.disabled !== disabled ) {
			statements.ItemWidget.parent.prototype.setDisabled.call( this, disabled );
			this.render();
		}

		return this;
	};

	/**
	 * @param {boolean} editing
	 * @chainable
	 * @return {OO.ui.Widget} The widget, for chaining
	 */
	statements.ItemWidget.prototype.setEditing = function ( editing ) {
		if ( this.editing !== editing ) {
			this.editing = editing;
			this.render();
		}

		return this;
	};

	/**
	 * @return {wikibase.datamodel.Statement}
	 */
	statements.ItemWidget.prototype.getData = function () {
		return this.data;
	};

	/**
	 * @param {wikibase.datamodel.Statement} data
	 */
	statements.ItemWidget.prototype.setData = function ( data ) {
		var self = this,
			serializer = new wb.serialization.StatementSerializer(),
			deserializer = new wb.serialization.StatementDeserializer();

		// store a clone of the data we've been handled: if qualifiers
		// or rank change, we'll be updating this data in here, but the source
		// object should remain unaltered
		this.data = deserializer.deserialize( serializer.serialize( data ) );

		// save & re-render title
		if ( !this.data.equals( data ) ) {
			// property has changed: invalidate the label & url
			this.label = undefined;
			this.url = undefined;

			this.render();
		}

		// remove existing qualifiers, then add new ones based on data passed in
		this.clearItems();
		data.getClaim().getQualifiers().each( function ( i, qualifier ) {
			self.addQualifier( qualifier );
		} );
	};

}( mw.mediaInfo.statements, wikibase ) );
