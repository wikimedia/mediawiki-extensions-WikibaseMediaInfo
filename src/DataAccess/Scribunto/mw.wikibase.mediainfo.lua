local wikibaseMediaInfo = {}

wikibaseMediaInfo.setupInterface = function ()
	local php = mw_interface
	mw_interface = nil
	local util = require 'libraryUtil'
	local wikibase = require 'mw.wikibase'

	-- copy all original mw.wikibase methods to mw.wikibase.mediainfo
	for key, func in pairs( wikibase ) do
		wikibaseMediaInfo[key] = func
	end

	-- Override parent getEntityIdForTitle - there is no support for a 2nd (globalSiteId) argument.
	--
	-- @param {string} pageTitle
	-- @param {string} [globalSiteId]
	wikibaseMediaInfo.getEntityIdForTitle = function ( pageTitle, globalSiteId )
		php.incrementStatsKey( 'wikibase.client.scribunto.wikibase.mediainfo.getEntityIdForTitle.call' )

		util.checkType( 'getEntityIdForTitle', 1, pageTitle, 'string' )
		-- Keeping around the 2nd argument to remain compatible with internal calls to this
		-- method, but if it's anything but `nil`, it should fail, since that's not supported
		util.checkType( 'getEntityIdForTitle', 2, globalSiteId, 'nil' )

		return php.getMediaInfoId( pageTitle )
	end

	-- @param {string} [id]
	wikibaseMediaInfo.getCaptionWithLang = function ( id )
		php.incrementStatsKey( 'wikibase.client.scribunto.wikibase.mediainfo.getCaptionWithLang.call' )

		util.checkTypeMulti( 'getCaptionWithLang', 1, id, { 'string', 'nil' } )

		return wikibaseMediaInfo.getLabelWithLang( id )
	end

	-- @param {string} [id]
	wikibaseMediaInfo.getCaption = function ( id )
		php.incrementStatsKey( 'wikibase.client.scribunto.wikibase.mediainfo.getCaption.call' )

		util.checkTypeMulti( 'getCaption', 1, id, { 'string', 'nil' } )

		return wikibaseMediaInfo.getLabel( id )
	end

	-- @param {string} id
	-- @param {string} languageCode
	wikibaseMediaInfo.getCaptionByLang = function ( id, languageCode )
		php.incrementStatsKey( 'wikibase.client.scribunto.wikibase.mediainfo.getCaptionByLang.call' )

		util.checkType( 'getCaptionByLang', 1, id, 'string' )
		util.checkType( 'getCaptionByLang', 2, languageCode, 'string' )

		return wikibaseMediaInfo.getLabelByLang( id, languageCode )
	end

	mw.wikibase.mediainfo = wikibaseMediaInfo
	package.loaded['mw.wikibase.mediainfo'] = wikibaseMediaInfo
	wikibaseMediaInfo.setupInterface = nil
end

return wikibaseMediaInfo
