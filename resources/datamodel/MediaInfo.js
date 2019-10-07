( function ( wb, util ) {
	'use strict';

	/* eslint-disable no-underscore-dangle */

	var PARENT = wb.datamodel.Entity,

		/**
		 * @class wikibase.datamodel.MediaInfo
		 * @extends wikibase.datamodel.Entity
		 * @license GPL-2.0-or-later
		 * @author Adrian Heine <adrian.heine@wikimedia.de>
		 *
		 * @constructor
		 *
		 * @param {string} mediaInfoId
		 * @param {wikibase.datamodel.TermMap|null} [labels=new wikibase.datamodel.TermMap()]
		 * @param {wikibase.datamodel.TermMap|null} [descriptions=new wikibase.datamodel.TermMap()]
		 * @param {wikibase.datamodel.StatementGroupSet|null}
		 *   [statementGroupSet=new wikibase.datamodel.StatementGroupSet()]
		 *
		 * @throws {Error} if a required parameter is not specified properly.
		 */
		SELF = util.inherit(
			'WbDataModelMediaInfo',
			PARENT,
			function ( mediaInfoId, labels, descriptions, statementGroupSet ) {
				labels = labels || new wb.datamodel.TermMap();
				descriptions = descriptions || new wb.datamodel.TermMap();
				statementGroupSet = statementGroupSet || new wb.datamodel.StatementGroupSet();

				if (
					typeof mediaInfoId !== 'string' ||
					!( labels instanceof wb.datamodel.TermMap ) ||
					!( descriptions instanceof wb.datamodel.TermMap ) ||
					!( statementGroupSet instanceof wb.datamodel.StatementGroupSet )
				) {
					throw new Error( 'Required parameter(s) missing or not defined properly' );
				}

				this._id = mediaInfoId;
				this._statementGroupSet = statementGroupSet;
				this._fingerprint = new wb.datamodel.Fingerprint( labels, descriptions );
			},
			{

				/**
				 * @property {wikibase.datamodel.StatementGroupSet}
				 * @private
				 */
				_statementGroupSet: null,

				/**
				 * @return {wikibase.datamodel.StatementGroupSet}
				 */
				getStatements: function () {
					return this._statementGroupSet;
				},

				/**
				 * @return {boolean}
				 */
				isEmpty: function () {
					return this._statementGroupSet.isEmpty() && this._fingerprint.isEmpty();
				},

				/**
				 * @param {*} mediaInfo
				 * @return {boolean}
				 */
				equals: function ( mediaInfo ) {
					return mediaInfo === this ||
					( mediaInfo instanceof SELF &&
						this._id === mediaInfo.getId() &&
						this._statementGroupSet.equals( mediaInfo.getStatements() ) &&
						this._fingerprint.equals( mediaInfo.getFingerprint() )
					);
				}
			} );

	/**
	 * @inheritdoc
	 * @property {string} [TYPE='mediainfo']
	 * @static
	 */
	SELF.TYPE = 'mediainfo';

	module.exports = SELF;

}( wikibase, util ) );
