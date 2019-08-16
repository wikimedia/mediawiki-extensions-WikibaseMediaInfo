/* eslint-disable no-new */

var hooks = require( '../../support/hooks.js' ),
	pathToWidget = '../../../../resources/filepage/ProtectionMsgWidget.js',
	msg = '<p>This page is protected</p>',
	ProtectionMsgWidget,
	widget;

QUnit.module( 'ProtectionMsgWidget', hooks.mediainfo, function () {
	QUnit.test( 'constructor', function ( assert ) {
		ProtectionMsgWidget = require( pathToWidget );
		new ProtectionMsgWidget();
		assert.ok( true );
	} );

	QUnit.module( 'Page is not protected', {
		beforeEach: function () {
			global.mw.config.get.withArgs( 'protectionMsg' ).returns( null );
		}
	}, function () {
		QUnit.test( 'Protection message widget does not display', function ( assert ) {
			ProtectionMsgWidget = require( pathToWidget );
			widget = new ProtectionMsgWidget();

			assert.strictEqual( widget.shouldDisplay(), false );
		} );
	} );

	QUnit.module( 'Page is protected', {
		beforeEach: function () {
			global.mw.config.get.withArgs( 'protectionMsg' ).returns( msg );
		},
		afterEach: function () {
			global.mw.config.get.withArgs( 'protectionMsg' ).returns( null );
		}
	}, function () {
		QUnit.test( 'Protection message widget displays', function ( assert ) {
			ProtectionMsgWidget = require( pathToWidget );
			widget = new ProtectionMsgWidget();

			assert.strictEqual( widget.shouldDisplay(), true );
			assert.strictEqual( widget.message, msg );
		} );
	} );
} );
