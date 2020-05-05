'use strict';

/**
 * This is a widget that looks like a TabOptionWidget (it can be added
 * to a tabSelectWidget), but behaves like a dropdown. This allows
 * mixing tabs & dropdowns/filters in the same menu.
 *
 * @class
 * @extends OO.ui.TabOptionWidget
 *
 * @constructor
 * @param {Object} [config] Configuration options (same as TabOptionWidget)
 * @param {Object} [config.menu] Menu configuration options
 * @param {Object} [config.popup] Popup configuration options
 */
var TabFilterWidget = function MediaInfoMediaSearchTabFilterWidget( config ) {
	var self = this,
		itemsWidth;

	TabFilterWidget.parent.call(
		this,
		$.extend( {}, config, { classes: [ 'wbmi-tab-filter-widget' ].concat( config.classes || [] ) } )
	);
	OO.ui.mixin.GroupWidget.call( this );

	this.addItems( config.menu.items );

	// determine width for popup based on the width of the menu items that should pop out
	itemsWidth = this.getItems().reduce( function ( maxWidth, option ) {
		var $clone = option.$element.clone().hide(),
			width;
		OO.ui.getDefaultOverlay().append( $clone );
		width = $clone.outerWidth();
		$clone.remove();
		return Math.max( maxWidth, width );
	}, 0 );

	OO.ui.mixin.PopupElement.call( this, $.extend( { popup: {
		$content: this.$group,
		padded: false,
		head: false,
		hideWhenOutOfView: false,
		width: Math.max( itemsWidth, 100 )
	} }, config.popup ) );
	OO.ui.getDefaultOverlay().append( this.popup.$element );

	this.$element.on( 'click', this.onClick.bind( this ) );
	this.getItems().forEach( function ( option ) {
		option.$element.on( 'click', self.onSelect.bind( self, option ) );
	} );
};
OO.inheritClass( TabFilterWidget, OO.ui.TabOptionWidget );
OO.mixinClass( TabFilterWidget, OO.ui.mixin.GroupWidget );
OO.mixinClass( TabFilterWidget, OO.ui.mixin.PopupElement );

/**
 * @static
 * @inheritdoc
 */
TabFilterWidget.static.selectable = false;

TabFilterWidget.prototype.onClick = function () {
	// only open popup/menu when not disabled
	this.popup.toggle( !this.isDisabled() );
};

TabFilterWidget.prototype.onSelect = function ( option ) {
	this.getItems().forEach( function ( option ) {
		option.setSelected( false );
	} );
	option.setSelected( true );

	this.popup.toggle( false );

	this.emit( 'select', option );
};

module.exports = TabFilterWidget;
