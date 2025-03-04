'use strict';

/* eslint-disable no-new */

const hooks = require( '../../support/hooks.js' ),
	pathToWidget = '../../../../resources/filepage/ProtectionMsgWidget.js',
	msg = '<p>This page is protected</p>';
let ProtectionMsgWidget,
	widget;

QUnit.module( 'ProtectionMsgWidget', hooks.mediainfo, () => {
	QUnit.test( 'constructor', ( assert ) => {
		ProtectionMsgWidget = require( pathToWidget );
		new ProtectionMsgWidget();
		assert.ok( true );
	} );

	QUnit.module( 'Page is not protected', {
		beforeEach: function () {
			global.mw.config.get.withArgs( 'wbmiProtectionMsg' ).returns( null );
		}
	}, () => {
		QUnit.test( 'Protection message widget does not display', ( assert ) => {
			ProtectionMsgWidget = require( pathToWidget );
			widget = new ProtectionMsgWidget();

			assert.strictEqual( widget.shouldDisplay(), false );
		} );
	} );

	QUnit.module( 'Page is protected', {
		beforeEach: function () {
			global.mw.config.get.withArgs( 'wbmiProtectionMsg' ).returns( msg );
		},
		afterEach: function () {
			global.mw.config.get.withArgs( 'wbmiProtectionMsg' ).returns( null );
		}
	}, () => {
		QUnit.test( 'Protection message widget displays', ( assert ) => {
			ProtectionMsgWidget = require( pathToWidget );
			widget = new ProtectionMsgWidget();

			assert.strictEqual( widget.shouldDisplay(), true );
			assert.strictEqual( widget.message, msg );
		} );
	} );
} );
