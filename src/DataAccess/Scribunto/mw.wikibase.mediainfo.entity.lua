local util = require 'libraryUtil'
local wikibaseEntity = require 'mw.wikibase.entity'
local wikibaseMediaInfoEntity = {}
local methodtable = {}
local metatable = {}

-- copy all original mw.wikibase.entity methods to mw.wikibase.mediainfo.entity
for key, func in pairs( wikibaseEntity ) do
	wikibaseMediaInfoEntity[key] = func
end

wikibaseMediaInfoEntity.create = function( data )
	-- parent wikibase Lua code uses `claims` internally, instead of `statements`
	data.claims = data.statements

	local entity = wikibaseEntity.create( data )

	-- preserve original methods
	local originalmethods = getmetatable( entity ).__index
	if type( originalmethods ) == 'nil' then
		originalmethods = {}
	end

	-- remove parent methods that don't make sense for mediainfo entities
	originalmethods.getSitelink = nil

	-- build metatable where own methods override parent methods
	metatable.__index = function( table, key )
		return methodtable[key] or originalmethods[key]
	end

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

package.loaded['mw.wikibase.mediainfo.entity'] = wikibaseMediaInfoEntity
return wikibaseMediaInfoEntity
