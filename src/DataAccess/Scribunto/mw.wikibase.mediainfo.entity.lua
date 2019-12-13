local util = require 'libraryUtil'
local wikibaseEntity = require 'mw.wikibase.entity'
local wikibaseMediaInfoEntity = {}
local methodtable = {}

-- copy all original mw.wikibase.entity methods to mw.wikibase.mediainfo.entity
for key, func in pairs( wikibaseEntity ) do
	wikibaseMediaInfoEntity[key] = func
end

wikibaseMediaInfoEntity.create = function( data )
	-- parent wikibase Lua code uses `claims` internally, instead of `statements`
	data.claims = data.statements

	local entity = wikibaseEntity.create( data )

	-- copy original methods
	local originalmethods = getmetatable( entity ).__index
	local methods = {}
	if type( originalmethods ) ~= 'nil' then
		for key, func in pairs( originalmethods ) do
			methods[key] = func
		end
	end

	-- copy new methods
	for key, func in pairs( methodtable ) do
		methods[key] = func
	end

	local metatable = {}
	metatable.__index = methods
	setmetatable( entity, metatable )
	return entity
end

-- @param {string|number} [langCode]
methodtable.getCaption = function ( entity, langCode )
	util.checkTypeMulti( 'getCaption', 1, langCode, { 'string', 'number', 'nil' } )

	return entity:getLabel( langCode )
end

-- @param {string|number} [langCode]
methodtable.getCaptionWithLang = function ( entity, langCode )
	util.checkTypeMulti( 'getCaptionWithLang', 1, langCode, { 'string', 'number', 'nil' } )

	return entity:getLabelWithLang( langCode )
end

-- Override getSitelink, effectively turning it into a noop
-- sitelinks don't exist for MediaInfo, but we're not going to remove
-- the method entirely for maximum compatibility with mw.wikibase.entity
--
-- @see https://phabricator.wikimedia.org/T240563
--
-- @param {string|number} [globalSiteId]
methodtable.getSitelink = function ( entity, globalSiteId )
	return nil
end

package.loaded['mw.wikibase.mediainfo.entity'] = wikibaseMediaInfoEntity
return wikibaseMediaInfoEntity
