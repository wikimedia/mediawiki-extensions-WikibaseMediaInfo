( function ( search, statements ) {

	'use strict';

	search.KeywordsInputWidget = function MediaInfoSearchKeywordsInputWidget( config ) {
		search.KeywordsInputWidget.parent.call( this, config );

		statements.EntityLookupElement.call( this, $.extend( {}, config, {
			allowSuggestionsWhenEmpty: false,
			highlightFirst: false,
			type: 'item'
		} ) );

		this.$input.on( 'focus', this.emit.bind( this, 'focus' ) );
		this.$input.on( 'blur', this.emit.bind( this, 'blur' ) );
	};
	OO.inheritClass( search.KeywordsInputWidget, OO.ui.TextInputWidget );
	OO.mixinClass( search.KeywordsInputWidget, statements.EntityLookupElement );

	/**
	 * @inheritdoc
	 */
	search.KeywordsInputWidget.prototype.getTerm = function () {
		return this.getValue();
	};

}( mw.mediaInfo.search, mw.mediaInfo.statements ) );
