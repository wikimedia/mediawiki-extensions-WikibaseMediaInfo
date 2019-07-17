var pathToWidget = '../../../../resources/statements/QualifierAutocompleteWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'QualifierAutocompleteWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		var QualifierAutocompleteWidget = require( pathToWidget ),
			widget = new QualifierAutocompleteWidget(),
			property = { id: 'P1', label: 'Some Property' };

		widget.setData( property );
		assert.deepEqual( widget.getData(), property );
	} );

	QUnit.test( 'setData() sets input value if optional label argument is provided', function ( assert ) {
		var QualifierAutocompleteWidget = require( pathToWidget ),
			widget = new QualifierAutocompleteWidget(),
			property = { id: 'P1', label: 'Some Property' };

		widget.setData( property );
		assert.deepEqual( widget.getData(), property );
		assert.deepEqual( widget.value, property.label );
	} );
} );
