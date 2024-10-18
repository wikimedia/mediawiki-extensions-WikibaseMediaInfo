local testframework = require 'Module:TestFramework'
local wikibaseMediaInfoEntity = require 'mw.wikibase.mediainfo.entity'

-- function instead of an object, so that every time we use it, it's a fresh
-- copy, not an existing variable that might already have been altered
local getTestData = function ()
	return {
		type = "mediainfo",
		id = "M18",
		labels = {
			en = {
				language = "en",
				value = "This is a test"
			},
			nl = {
				language = "nl",
				value = "Dit is een test"
			}
		},
		statements = {
			P1 = {
				["1"] = {
					mainsnak = {
						snaktype = "value",
						property = "P1",
						datavalue = {
							value = {
								["entity-type"] = "item",
								["numeric-id"] = 1,
								id = "Q1"
							},
							type = "wikibase-entityid"
						}
					},
					type = "statement",
					qualifiers = {
						P8 = {
							["1"] = {
								snaktype = "value",
								property = "P8",
								hash = "8fee0d2e901bfac12135b9a0f8c9f2cc12d2ce20",
								datavalue = {
									value = "http://www.example.org",
									type = "string"
								}
							}
						}
					},
					["qualifiers-order"] = {
						["1"] = "P8"
					},
					id = "M18$6335d2fe-4a74-0f46-9621-2d331c5e48f3",
					rank = "normal"
				},
				["2"] = {
					mainsnak = {
						snaktype = "value",
						property = "P1",
						datavalue = {
							value = {
								["entity-type"] = "item",
								["numeric-id"] = 2,
								id = "Q2"
							},
							type = "wikibase-entityid"
						}
					},
					type = "statement",
					id = "M18$a0ca9cd2-44f9-d468-ec9c-3ffa409479e2",
					rank = "normal"
				}
			}
		},
		schemaVersion = 2
	}
end

local function getTestDataWithSitelink()
	local data = getTestData()
	-- populate with sitelinks data to make sure it's not getting used
	data.sitelinks = {
		enwiki = {
			title = 'Test'
		}
	}
	return data
end

local function invoke( method, args )
	local entity = wikibaseMediaInfoEntity.create( getTestData() )
	return entity[ method ]( entity, unpack( args or {} ) )
end

local function testExists()
	return type( wikibaseMediaInfoEntity )
end

local function testGetSitelink()
	local entity = wikibaseMediaInfoEntity.create( getTestDataWithSitelink() )
	return entity:getSitelink( 'enwiki' )
end

local function testWikibaseGetSitelink()
	local entity = mw.wikibase.entity.create( getTestDataWithSitelink() )

	-- construct a MediaInfo entity as well, just to make sure doing so doesn't in any way interfere
	wikibaseMediaInfoEntity.create( getTestDataWithSitelink() )

	return entity:getSitelink( 'enwiki' )
end

local tests = {
	{ name = 'MediaInfo entity exists',
	  func = testExists,
	  type = 'ToString',
	  expect = { 'table' }
	},
	{ name = 'MediaInfo entity .getSitelink is a noop',
	  func = testGetSitelink,
	  expect = { nil }
	},
	-- https://phabricator.wikimedia.org/T240563
	{ name = 'mw.wikibase.entity.getSitelink still works fine',
	  func = testWikibaseGetSitelink,
	  expect = { 'Test' }
	},
	{ name = 'getCaption returns label',
	  func = invoke,
	  args = { 'getCaption', { 'en' } },
	  expect = { 'This is a test' }
	},
	{ name = 'getCaptionWithLang returns label',
	  func = invoke,
	  args = { 'getCaptionWithLang', { 'en' } },
	  expect = { 'This is a test', 'en' }
	}
}

return testframework.getTestProvider( tests )
