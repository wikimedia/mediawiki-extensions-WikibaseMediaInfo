( function ( search ) {

	'use strict';

	search.CapsuleItemWidget = function MediaInfoSearchCapsuleItemWidget( config ) {
		search.CapsuleItemWidget.parent.call( this, $.extend( { classes: [ 'wbmi-search-capsule' ] }, config ) );
		OO.ui.mixin.PopupElement.call( this, $.extend( { popup: { autoClose: false } }, config ) );

		this.property = config.property;
		this.qualifiers = config.qualifiers;
		this.item = config.data;

		this.qualifiersWidget = new search.QualifiersPopoverWidget( {
			properties: this.qualifiers,
			terms: {
				'': {
					'': 'haswbstatement:' + this.property + '=' + this.item
				},
				'wikibase-entityid': {
					'': 'haswbstatement:' + this.property + '=' + this.item,
					is: 'haswbstatement:' + this.property + '=' + this.item + '[${property}=${value}]',
					isnot: 'haswbstatement:' + this.property + '=' + this.item + ' !haswbstatement:' + this.property + '=' + this.item + '[${property}=${value}]',
					isempty: 'haswbstatement:' + this.property + '=' + this.item + ' -haswbstatement:' + this.property + '=' + this.item + '[${property}=*'
				},
				quantity: {
					'': 'haswbstatement:' + this.property + '=' + this.item,
					is: 'wbstatementquantity:' + this.property + '=' + this.item + '=${value}',
					isnot: 'wbstatementquantity:' + this.property + '=' + this.item + '>${value}|' + this.property + '=' + this.item + '<${value}',
					isempty: 'haswbstatement:' + this.property + '=' + this.item + ' -haswbstatement:' + this.property + '=' + this.item + '[${property}=*',
					isgreaterthan: 'wbstatementquantity:' + this.property + '=' + this.item + '>${value}',
					islessthan: 'wbstatementquantity:' + this.property + '=' + this.item + '<${value}'
				},
				string: {
					'': 'haswbstatement:' + this.property + '=' + this.item
					// searching string not yet possible...
				}
			},
			messages: {
				title: mw.message( 'wikibasemediainfo-search-qualifiers-title' ).text(),
				help: mw.message( 'wikibasemediainfo-search-qualifiers-help' ).text(),
				intro: mw.message( 'wikibasemediainfo-search-qualifiers-intro' ).text(),
				add: mw.message( 'wikibasemediainfo-search-qualifiers-add' ).text(),
				cancel: mw.message( 'wikibasemediainfo-search-qualifiers-cancel' ).text(),
				save: mw.message( 'wikibasemediainfo-search-qualifiers-save' ).text()
			}
		} );
		this.qualifiersWidget.connect( this, {
			save: 'onSave',
			cancel: 'onCancel'
		} );

		this.originalLabel = config.label;
		this.originalTerm = this.getTerm();

		this.popup.$body.append( this.qualifiersWidget.$element );
		this.popup.setSize( 700 );

		this.$overlay = (
			config.$overlay === true ?
				OO.ui.getDefaultOverlay() :
				config.$overlay
		) || this.$element;
		this.$overlay.append( this.popup.$element.addClass( 'wbmi-search-popover' ) );

		// to make it somewhat obvious that the capsule items can "expand" to further configure
		// the statement details, we're going to automatically open the popup the first couple
		// of times
		var addedCapsulesAmount = parseInt( mw.cookie.get( 'mediainfo-capsule', undefined, '0' ) );
		mw.cookie.set( 'mediainfo-capsule', addedCapsulesAmount + 1, { expires: 50 * 365 * 24 * 60 * 60 } );
		if ( addedCapsulesAmount < 2 ) {
			// wrapped inside a timer to make sure the relevant DOM elements exist before the popup
			// tries to figure out the position to attach
			setTimeout( this.select.bind( this ), 100 );
		}
	};
	OO.inheritClass( search.CapsuleItemWidget, OO.ui.TagItemWidget );
	OO.mixinClass( search.CapsuleItemWidget, OO.ui.mixin.PopupElement );

	/**
	 * @inheritdoc
	 */
	search.CapsuleItemWidget.prototype.getTerm = function () {
		return this.qualifiersWidget.getTerm().replace( /\$\{item\}/g, this.item );
	};

	/**
	 * Remove the toggle if we decide to remove this capsule.
	 *
	 * @inheritdoc
	 */
	search.CapsuleItemWidget.prototype.remove = function () {
		search.CapsuleItemWidget.parent.prototype.remove.call( this );

		this.popup.toggle( false );
	};

	/**
	 * Instead of removing the capsule and making its contents editable again, we're
	 * just going to open a popover that'll let you refine the capsule's details.
	 *
	 * @inheritdoc
	 */
	search.CapsuleItemWidget.prototype.select = function () {
		if ( Object.keys( this.qualifiers ).length > 0 ) {
			this.popup.toggle( true );
		}
	};

	search.CapsuleItemWidget.prototype.onCancel = function () {
		this.popup.toggle( false );
	};

	search.CapsuleItemWidget.prototype.onSave = function () {
		this.popup.toggle( false );

		if ( this.getTerm() !== this.originalTerm ) {
			this.setLabel( this.originalLabel + ' *' );
		} else {
			this.setLabel( this.originalLabel );
		}
	};

}( mw.mediaInfo.search ) );
