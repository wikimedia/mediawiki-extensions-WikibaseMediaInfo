'use strict';

var ConstraintsReportHandlerElement = function MediaInfoStatementsConstraintsReportHandlerElement() {};
OO.initClass( ConstraintsReportHandlerElement );

/**
 * Create a popup from an array of constraint check results
 *
 * @param {Array} resultArray An array of constraint check results.
 * @return {OO.ui.PopupButtonWidget|null}
 * @see WikibaseQualityConstraints/modules/gadget.js::__addResultsToSnak()
 */
ConstraintsReportHandlerElement.prototype.popupFromResults = function ( resultArray ) {
	var reports = resultArray.map( this.buildReport.bind( this ) ),
		list = this.buildReportList( reports ),
		icon,
		titleMessageKey;

	if ( list !== null ) {
		switch ( list.items[ 0 ].status ) {
			case 'violation':
				icon = 'mandatory-constraint-violation';
				titleMessageKey = 'wbqc-issues-long';
				break;
			case 'warning':
				icon = 'non-mandatory-constraint-violation';
				titleMessageKey = 'wbqc-potentialissues-long';
				break;
			case 'suggestion':
				icon = 'suggestion-constraint-violation';
				titleMessageKey = 'wbqc-suggestions-long';
				break;
			default:
				throw new Error( 'unexpected status ' + list.items[ 0 ].status );
		}

		return this.createPopupWidget(
			list.$element,
			icon,
			titleMessageKey,
			[ 'wbqc-constraint-warning' ]
		);
	} else {
		return null;
	}
};

/**
 * Build a ConstraintReportPanel for a single constraint parameter check result.
 *
 * @param {Object} result The constraint parameter check result.
 * @return {wikibase.quality.constraints.ui.ConstraintReportPanel}
 * @see WikibaseQualityConstraints/modules/gadget.js::_buildReport()
 */
ConstraintsReportHandlerElement.prototype.buildReport = function ( result ) {
	var config = {
		status: result.status,
		constraint: result.constraint,
		message: result[ 'message-html' ]
	};
	return new wikibase.quality.constraints.ui.ConstraintReportPanel( config );
};

/**
 * Build a ConstraintReportList from an array of ConstraintReportPanels
 * but return it only if the list is nonempty and contains uncollapsed items.
 *
 * @param {wikibase.quality.constraints.ui.ConstraintReportPanel[]} reports
 * @return {wikibase.quality.constraints.ui.ConstraintReportList|null}
 * @see WikibaseQualityConstraints/modules/gadget.js::_buildReportList()
 */
ConstraintsReportHandlerElement.prototype.buildReportList = function ( reports ) {
	var list = wikibase.quality.constraints.ui.ConstraintReportList.static.fromPanels(
		reports,
		{
			statuses: [
				{
					status: 'violation',
					label: mw.msg( 'wbqc-issues-short' )
				},
				{
					status: 'warning',
					label: mw.msg( 'wbqc-potentialissues-short' )
				},
				{
					status: 'suggestion',
					label: mw.msg( 'wbqc-suggestions-short' )
				},
				{
					status: 'bad-parameters',
					label: mw.msg( 'wbqc-parameterissues-short' ),
					subheading: mw.msg( 'wbqc-parameterissues-long' ),
					collapsed: true
				}
			],
			expanded: false // expanded: true does not work within a popup
		}
	);
	if (
		// list isn't empty...
		list.items.length > 0 &&
		// ...and doesn't only contain collapsed items either
		list.items[ 0 ].status !== 'bad-parameters'
	) {
		return list;
	} else {
		return null;
	}
};

/**
 * Create a popup button
 *
 * @param {jQuery} $content Content to be shown in the popup.
 * @param {string} icon Identifier for an icon as provided by OOUI.
 * @param {string} titleMessageKey The message key of the title attribute of the button.
 * @param {string[]} [classes] Optional list of classes added to the button element
 * @return {OO.ui.PopupButtonWidget}
 * @see WikibaseQualityConstraints/modules/gadget.js::_createPopupWidget()
 */
ConstraintsReportHandlerElement.prototype.createPopupWidget = function ( $content, icon, titleMessageKey, classes ) {
	// eslint-disable-next-line mediawiki/class-doc
	var widget = new OO.ui.PopupButtonWidget( {
		icon: icon,
		// eslint-disable-next-line mediawiki/msg-doc
		title: mw.msg( titleMessageKey ),
		flags: '',
		framed: false,
		classes: [ 'wbqc-reports-button', 'wikibase-snakview-indicator' ].concat( classes || [] ),
		popup: {
			$content: $content,
			width: 400,
			padded: true,
			head: true,
			label: $content.find( '.wbqc-reports:first-child > .oo-ui-labelElement-label *' ).detach()
		},
		$overlay: true
	} );
	widget.popup.$element.css( 'z-index', 2 );

	return widget;
};

module.exports = ConstraintsReportHandlerElement;
