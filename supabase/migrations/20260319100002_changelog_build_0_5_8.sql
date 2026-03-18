-- Changelog entries for Build 0.5 (8) — 19 March 2026

INSERT INTO dev_updates (platform, date, build_label, title, summary, detail, sort_order) VALUES
('ios', '2026-03-19', 'Build 0.5 (8)', 'StockmanIQ insight cards — MLA category fix (Critical)',
 E'All StockmanIQ insight templates (T01 Historical Sale Month, T02 Weight Category Shift, T05 Sell vs Hold, T07 Portfolio Peak Month) were passing master category to price lookups instead of resolved MLA category.\nEvery lookup missed the cache, cascaded through all fallback layers, and landed on $3.30 hardcoded default.\nAll getMarketPrice and historicalPricing.monthlyAverages calls now receive resolved MLA categories.',
 'Files: StockmanIQTemplateEngine+Historical.swift (T01, T02, T07), StockmanIQTemplateEngine+Freight.swift (T08, T09)',
 5),

('ios', '2026-03-19', 'Build 0.5 (8)', 'Bug fixes',
 E'Fixed Apple Sign In failure: display_name NOT NULL constraint blocked users who signed in with Apple.\nFixed Brangus freight template passing master category instead of resolved MLA category.\nFixed defaultFallbackPrice in HerdDynamics receiving master category instead of MLA category.\nFixed Swift 6 concurrency warning: resolveMLACategory hoisted out of group.addTask in freight templates.\nBrangus now speaks welcome greeting when voice is unmuted on a new chat.',
 'Files: Various — see Build 0.5 (8) build doc for full list',
 6),

('supabase', '2026-03-19', NULL, 'Expanded saleyard coverage — 43 saleyards loaded',
 E'Full MLA weekly transaction history loaded for 43 saleyards across all states (up from 12).\nData spans January 2022 to March 2026 (~380,000 transaction rows).\nNow includes Toowoomba, Roma, Wagga, Shepparton, Wodonga, Tamworth, and 30+ others.\nPrevious data cleared and clean re-import completed.',
 E'NSW: Armidale, Casino, Dubbo, Forbes, Griffith, Gunnedah, Singleton, Inverell, Carcoar, Yass, Scone, Tamworth, Moss Vale, Lismore, Wagga\nQLD: Dalby, Gracemere, Charters Towers, Emerald, Blackall, Roma, Oakey, Toowoomba, Warwick\nVIC: Bairnsdale, Ballarat, Echuca, Leongatha, Mortlake, Pakenham, Shepparton, Swan Hill, Warrnambool, Wodonga, Camperdown\nSA: Mount Gambier, Naracoorte, Mount Compass, SA Livestock Exchange\nWA: Muchea, Mount Barker\nTAS: Powranna, Northern Tasmania Saleyards',
 7);
