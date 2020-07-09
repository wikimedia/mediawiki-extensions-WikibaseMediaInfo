'use strict';

const sinon = require( 'sinon' ),
	hooks = require( '../../support/hooks.js' );
let DOMLessGroupWidget,
	GroupWidget,
	ItemWidget,
	sandbox;

QUnit.module( 'DOMLessGroupWidget', Object.assign( {}, hooks.mediainfo, {
	beforeEach: function () {
		hooks.mediainfo.beforeEach();

		sandbox = sinon.createSandbox();

		// construct an element that mixes in DOMLessGroupWidget, and
		// an ItemWidget to insert to the group
		DOMLessGroupWidget = require( '../../../../resources/base/DOMLessGroupWidget.js' );
		GroupWidget = function ( config ) {
			GroupWidget.parent.call( this, config );
			DOMLessGroupWidget.call( this, config );
		};
		OO.inheritClass( GroupWidget, OO.ui.Widget );
		OO.mixinClass( GroupWidget, DOMLessGroupWidget );

		ItemWidget = function ( config ) {
			ItemWidget.parent.call( this, config );
			OO.ui.mixin.ItemWidget.call( this, config );
		};
		OO.inheritClass( ItemWidget, OO.ui.Widget );
		OO.mixinClass( ItemWidget, OO.ui.mixin.ItemWidget );
	},
	afterEach: function () {
		sandbox.restore();
		hooks.mediainfo.afterEach();
	}
} ), function () {

	QUnit.test( 'Test item is added to group', function ( assert ) {
		const widget = new GroupWidget(),
			item = new ItemWidget();

		assert.strictEqual( widget.getItems().length, 0 );
		widget.insertItem( item );
		assert.strictEqual( widget.getItems().length, 1 );
	} );

	QUnit.test( 'Test item DOM is not changed after inserting into group', function ( assert ) {
		const widget = new GroupWidget(),
			item = new ItemWidget(),
			$other = $( '<div>' ).append( item.$element );

		// first make sure that the item's node has been attached to
		// the other container, and that the GroupWidget is empty
		assert.strictEqual( $other.children().length, 1 );
		assert.strictEqual( widget.$group.children().length, 0 );

		// then insert the item into a GroupWidget
		widget.insertItem( item );

		// and now verify that the other container still contains
		// the node and the GroupWidget's DOM is still empty
		// (i.e. it didn't steal the item's node from the other)
		assert.strictEqual( $other.children().length, 1 );
		assert.strictEqual( widget.$group.children().length, 0 );
	} );
} );
