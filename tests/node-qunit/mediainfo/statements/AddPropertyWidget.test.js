'use strict';

const pathToWidget = '../../../../resources/statements/AddPropertyWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'AddPropertyWidget', hooks.mediainfo, () => {
	QUnit.test( 'Adding property ids changes the filters', ( assert ) => {
		const done = assert.async(),
			AddPropertyWidget = require( pathToWidget ),
			widget = new AddPropertyWidget();

		assert.strictEqual( widget.getFilters()[ 1 ].value, '' );

		widget.addPropertyId( 'Q1' )
			.then( () => {
				assert.ok( widget.getFilters() );
				assert.strictEqual( widget.getFilters()[ 1 ].value, 'Q1' );
			} )
			.then( widget.addPropertyId.bind( widget, 'Q2' ) )
			.then( () => {
				assert.ok( widget.getFilters() );
				assert.strictEqual( widget.getFilters()[ 1 ].value, 'Q1|Q2' );
				done();
			} );
	} );

	QUnit.test( 'Property input widget & remove are only visible in edit mode', ( assert ) => {
		const done = assert.async(),
			AddPropertyWidget = require( pathToWidget ),
			widget = new AddPropertyWidget();

		// wait for initial render to complete
		widget.render()
			.then( ( $element ) => {
				assert.strictEqual( $element.find( '.wbmi-entityview-add-statement-property' ).length, 0 );
				assert.strictEqual( $element.find( '.wbmi-item-remove' ).length, 0 );

				// 'add property' button is there right away
				assert.strictEqual( $element.find( '.wbmi-entityview-add-statement-property-button' ).length, 1 );
			} )
			.then( widget.setEditing.bind( widget, true ) )
			.then( ( $element ) => {
				// statement input & remove buttons have appeared
				assert.strictEqual( $element.find( '.wbmi-entityview-add-statement-property-input' ).length, 1 );
				assert.strictEqual( $element.find( '.wbmi-item-remove' ).length, 1 );

				// 'add property' button is still there
				assert.strictEqual( $element.find( '.wbmi-entityview-add-statement-property-button' ).length, 1 );
			} )
			.then( widget.setEditing.bind( widget, false ) )
			.then( ( $element ) => {
				// statement input & remove buttons are gone
				assert.strictEqual( $element.find( '.wbmi-entityview-add-statement-property' ).length, 0 );
				assert.strictEqual( $element.find( '.wbmi-item-remove' ).length, 0 );

				// 'add property' button is still there
				assert.strictEqual( $element.find( '.wbmi-entityview-add-statement-property-button' ).length, 1 );

				done();
			} );
	} );
} );
