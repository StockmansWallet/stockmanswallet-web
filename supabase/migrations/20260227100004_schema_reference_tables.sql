-- ============================================================================
-- 004: Reference / Lookup Tables
-- Phase 2: Proper lookup tables seeded from ReferenceData.swift.
-- Additive only - these tables exist alongside current text columns.
-- Nothing in the app references them yet. Safe to run at any time.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. ref_species - 4 livestock species
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ref_species (
    id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO ref_species (name) VALUES
    ('Cattle'), ('Sheep'), ('Pigs'), ('Goats')
ON CONFLICT (name) DO NOTHING;

-- --------------------------------------------------------------------------
-- 2. ref_states - 8 Australian states/territories
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ref_states (
    id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO ref_states (code, name) VALUES
    ('NSW', 'New South Wales'),
    ('VIC', 'Victoria'),
    ('QLD', 'Queensland'),
    ('SA',  'South Australia'),
    ('WA',  'Western Australia'),
    ('TAS', 'Tasmania'),
    ('NT',  'Northern Territory'),
    ('ACT', 'Australian Capital Territory')
ON CONFLICT (code) DO NOTHING;

-- --------------------------------------------------------------------------
-- 3. ref_saleyards - 49 physical saleyards + "National" virtual
-- All data sourced from ReferenceData.swift (coordinates, addresses, localities)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ref_saleyards (
    id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL UNIQUE,
    state_code TEXT NOT NULL REFERENCES ref_states(code),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    street_address TEXT,
    locality TEXT,
    is_virtual BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- "National" pseudo-saleyard (used as virtual aggregate in queries)
INSERT INTO ref_saleyards (name, state_code, is_virtual) VALUES
    ('National', 'QLD', true)
ON CONFLICT (name) DO NOTHING;

-- NSW (17 saleyards)
INSERT INTO ref_saleyards (name, state_code, latitude, longitude, street_address, locality) VALUES
    ('Armidale Livestock Selling Centre', 'NSW', -30.5212, 151.6814, 'Grafton Road, Armidale NSW 2350', 'Armidale, NSW'),
    ('Carcoar Central Tablelands Livestock Exchange', 'NSW', -33.6153, 149.1400, '4860 Mid Western Highway, Carcoar NSW 2791', 'Carcoar, NSW'),
    ('Casino Livestock Exchange', 'NSW', -28.8179, 153.0335, 'Reynolds Road, Casino NSW 2470', 'Casino, NSW'),
    ('Coonamble Saleyards', 'NSW', -30.9500, 148.3800, 'Saleyards Road, Coonamble NSW 2829', 'Coonamble, NSW'),
    ('Dubbo Regional Livestock Market', 'NSW', -32.1944, 148.6843, '6R Boothenba Road, Dubbo NSW 2830', 'Dubbo, NSW'),
    ('Forbes Central West Livestock Exchange', 'NSW', -33.3262, 148.0982, 'Back Yamma Road, Forbes NSW 2871', 'Forbes, NSW'),
    ('Goulburn Regional Saleyards', 'NSW', -34.7632, 149.7164, 'Braidwood Road, Goulburn NSW 2580', 'Goulburn, NSW'),
    ('Griffith Regional Saleyards', 'NSW', -34.2892, 146.0504, 'Jondaryan Avenue, Griffith NSW 2680', 'Griffith, NSW'),
    ('Gunnedah Saleyards', 'NSW', -30.8539, 150.1465, 'Kamilaroi Highway, Gunnedah NSW 2380', 'Gunnedah, NSW'),
    ('Inverell Regional Livestock Exchange', 'NSW', -29.7570, 151.1045, '375 Yetman Road, Inverell NSW 2360', 'Inverell, NSW'),
    ('Lismore Saleyards', 'NSW', NULL, NULL, NULL, 'Lismore, NSW'),
    ('Moss Vale Saleyards', 'NSW', -34.5200, 150.3502, 'Berrima Road, Moss Vale NSW 2577', 'Moss Vale, NSW'),
    ('Scone Saleyards', 'NSW', -32.0400, 150.8700, 'Muffet Street, Scone NSW 2337', 'Scone, NSW'),
    ('Singleton Hunter Regional Livestock Exchange', 'NSW', -32.5466, 151.2275, '56 Gresford Road, Clydesdale NSW 2330', 'Clydesdale, NSW'),
    ('Tamworth Regional Livestock Exchange', 'NSW', -31.0733, 150.8576, '7 Phoenix Street, Westdale NSW 2340', 'Westdale, NSW'),
    ('Wagga Wagga Livestock Marketing Centre', 'NSW', -35.0675, 147.4116, 'Webb Street, Bomen NSW 2650', 'Bomen, NSW'),
    ('Yass South Eastern Livestock Exchange', 'NSW', -34.8125, 148.8840, '1628 Bellevale Road, Yass NSW 2582', 'Yass, NSW')
ON CONFLICT (name) DO NOTHING;

-- QLD (9 saleyards)
INSERT INTO ref_saleyards (name, state_code, latitude, longitude, street_address, locality) VALUES
    ('Blackall Saleyards', 'QLD', -24.4051, 145.4785, '164 Evora Road, Blackall QLD 4472', 'Blackall, QLD'),
    ('Charters Towers Dalrymple Saleyards', 'QLD', -20.1028, 146.2496, '10 Depot Road, Black Jack QLD 4820', 'Black Jack, QLD'),
    ('Dalby Regional Saleyards', 'QLD', -27.1805, 151.2350, 'Yumborra Road, Dalby QLD 4405', 'Dalby, QLD'),
    ('Emerald Saleyards', 'QLD', -23.5232, 148.1468, 'Batts Street, Emerald QLD 4720', 'Emerald, QLD'),
    ('Gracemere Central Queensland Livestock Exchange', 'QLD', -23.4448, 150.4372, '16 Saleyards Road, Gracemere QLD 4702', 'Gracemere, QLD'),
    ('Oakey Saleyards', 'QLD', -27.4279, 151.7127, 'Bridge Street, Oakey QLD 4401', 'Oakey, QLD'),
    ('Roma Saleyards', 'QLD', -26.5741, 148.8174, '44589 Warrego Highway, Roma QLD 4455', 'Roma, QLD'),
    ('Toowoomba Saleyards', 'QLD', -27.5600, 151.9500, 'Mort Street, Drayton QLD 4350', 'Drayton, QLD'),
    ('Warwick Saleyards', 'QLD', -28.2171, 152.0387, 'Grafton Street, Warwick QLD 4370', 'Warwick, QLD')
ON CONFLICT (name) DO NOTHING;

-- VIC (15 saleyards)
INSERT INTO ref_saleyards (name, state_code, latitude, longitude, street_address, locality) VALUES
    ('Bairnsdale Saleyards', 'VIC', -37.8326, 147.6229, '11 Saleyard Road, Bairnsdale VIC 3875', 'Bairnsdale, VIC'),
    ('Ballarat Central Victoria Livestock Exchange', 'VIC', -37.4676, 143.7640, '129-139 Sunraysia Highway, Miners Rest VIC 3352', 'Miners Rest, VIC'),
    ('Bendigo Livestock Exchange', 'VIC', -36.6421, 144.3091, 'Wallenjoe Road, Huntly VIC 3551', 'Huntly, VIC'),
    ('Camperdown Saleyards', 'VIC', -38.6600, 143.1500, 'Saleyards Road, Camperdown VIC 3260', 'Camperdown, VIC'),
    ('Colac Saleyards', 'VIC', -38.3201, 143.6281, '55 Colac-Ballarat Road, Colac East VIC 3250', 'Colac East, VIC'),
    ('Echuca Saleyards', 'VIC', -36.1936, 144.7738, '510 McKenzie Road, Echuca VIC 3564', 'Echuca, VIC'),
    ('Leongatha Saleyards', 'VIC', -38.5359, 145.9499, '670 South Gippsland Highway, Koonwarra VIC 3954', 'Koonwarra, VIC'),
    ('Mortlake Western Victorian Livestock Exchange', 'VIC', -38.0749, 142.7756, 'Connewarren Lane, Mortlake VIC 3272', 'Mortlake, VIC'),
    ('Pakenham Victorian Livestock Exchange', 'VIC', -38.0955, 145.4928, '3A Exchange Drive, Pakenham VIC 3810', 'Pakenham, VIC'),
    ('Sale Gippsland Regional Livestock Exchange', 'VIC', -38.0954, 147.0591, 'Saleyards Road, Sale VIC 3850', 'Sale, VIC'),
    ('Shepparton Regional Saleyards', 'VIC', -36.3688, 145.4195, '4 Wheeler Street, Shepparton VIC 3630', 'Shepparton, VIC'),
    ('Swan Hill Saleyards', 'VIC', -35.3238, 143.5489, 'Saleyards Road, Swan Hill VIC 3585', 'Swan Hill, VIC'),
    ('Warrnambool Livestock Exchange', 'VIC', -38.3577, 142.4608, 'Caramut Road, Warrnambool VIC 3280', 'Warrnambool, VIC'),
    ('Wodonga (Barnawartha) Northern Victoria Livestock Exchange', 'VIC', -36.0608, 146.7133, '1934 Murray Valley Highway, Barnawartha North VIC 3691', 'Barnawartha North, VIC'),
    ('Yea Saleyards', 'VIC', -37.2100, 145.4300, 'Saleyard Road, Yea VIC 3717', 'Yea, VIC')
ON CONFLICT (name) DO NOTHING;

-- SA (4 saleyards)
INSERT INTO ref_saleyards (name, state_code, latitude, longitude, street_address, locality) VALUES
    ('Dublin South Australian Livestock Exchange', 'SA', -34.4743, 138.4272, '219 Carslake Road, Dublin SA 5501', 'Dublin, SA'),
    ('Mount Compass Southern Livestock Exchange', 'SA', -35.3500, 138.6200, '43 Saleyard Road, Mount Compass SA 5210', 'Mount Compass, SA'),
    ('Mount Gambier Saleyards', 'SA', -37.8351, 140.8857, '21 Fairbanks Road, Glenburnie SA 5291', 'Glenburnie, SA'),
    ('Naracoorte Saleyards', 'SA', -36.9524, 140.7583, 'Wimmera Highway, Naracoorte SA 5271', 'Naracoorte, SA')
ON CONFLICT (name) DO NOTHING;

-- WA (3 saleyards)
INSERT INTO ref_saleyards (name, state_code, latitude, longitude, street_address, locality) VALUES
    ('Boyanup Saleyards', 'WA', -33.4771, 115.7358, 'Boyanup-Picton Road, Boyanup WA 6237', 'Boyanup, WA'),
    ('Mount Barker Great Southern Regional Cattle Saleyards', 'WA', -34.6360, 117.6677, '32416 Albany Highway, Mount Barker WA 6324', 'Mount Barker, WA'),
    ('Muchea Livestock Centre', 'WA', -31.5767, 115.9968, 'Lot 5 Muchea East Road, Muchea WA 6501', 'Muchea, WA')
ON CONFLICT (name) DO NOTHING;

-- TAS (3 saleyards)
INSERT INTO ref_saleyards (name, state_code, latitude, longitude, street_address, locality) VALUES
    ('Killafaddy Saleyards', 'TAS', -41.4369, 147.1729, 'Killafaddy Road, Killafaddy TAS 7249', 'Killafaddy, TAS'),
    ('Powranna Saleyards', 'TAS', -41.6596, 147.2464, 'Midland Highway, Powranna TAS 7306', 'Powranna, TAS'),
    ('Quoiba Saleyards', 'TAS', -41.1794, 146.3447, 'Steele Street, Devonport TAS 7310', 'Devonport, TAS')
ON CONFLICT (name) DO NOTHING;

-- --------------------------------------------------------------------------
-- 4. ref_saleyard_aliases - MLA CSV short name mappings
-- Maps short names used in MLA CSV files to full saleyard names.
-- Source: ReferenceData.mlaSaleyardNameMapping
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ref_saleyard_aliases (
    id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    saleyard_id SMALLINT NOT NULL REFERENCES ref_saleyards(id),
    alias TEXT NOT NULL UNIQUE,
    source TEXT DEFAULT 'MLA CSV',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper: insert alias by looking up saleyard name
-- We use a DO block with a helper function to make inserts cleaner
DO $$
DECLARE
    v_id SMALLINT;
BEGIN
    -- NSW aliases
    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Wagga Wagga Livestock Marketing Centre';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Wagga Wagga') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'WLMC Wagga Wagga') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Wagga') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Dubbo Regional Livestock Market';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Dubbo') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Forbes Central West Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Forbes') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'CWLE Forbes') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Tamworth Regional Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Tamworth') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'TRLE Tamworth') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'TRLX Tamworth') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Carcoar Central Tablelands Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Carcoar') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'CTLX Carcoar') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Yass South Eastern Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Yass') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'SELX Yass') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Inverell Regional Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Inverell') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'IRLX Inverell') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Casino Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Casino') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Armidale Livestock Selling Centre';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Armidale') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Goulburn Regional Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Goulburn') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Griffith Regional Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Griffith') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Singleton Hunter Regional Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Singleton') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'HRLX Singleton') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Coonamble Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Coonamble') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Gunnedah Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Gunnedah') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Moss Vale Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Moss Vale') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Scone Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Scone') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Lismore Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Lismore') ON CONFLICT (alias) DO NOTHING;

    -- QLD aliases
    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Roma Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Roma') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Roma Store') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Dalby Regional Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Dalby') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Gracemere Central Queensland Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Gracemere') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'CQLX Gracemere') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Charters Towers Dalrymple Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Charters Towers') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Emerald Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Emerald') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Blackall Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Blackall') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Warwick Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Warwick') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Oakey Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Oakey') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Toowoomba Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Toowoomba') ON CONFLICT (alias) DO NOTHING;

    -- VIC aliases
    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Wodonga (Barnawartha) Northern Victoria Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Wodonga') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'NVLX Wodonga') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Leongatha Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Leongatha') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Pakenham Victorian Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Pakenham') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'PVLE Pakenham') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Mortlake Western Victorian Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Mortlake') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Ballarat Central Victoria Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Ballarat') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'CVLX Ballarat') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Shepparton Regional Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Shepparton') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Warrnambool Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Warrnambool') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Bendigo Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Bendigo') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Yea Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Yea') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Bairnsdale Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Bairnsdale') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Camperdown Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Camperdown') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Colac Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Colac') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Echuca Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Echuca') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Sale Gippsland Regional Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Sale') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'GRLE Sale') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Swan Hill Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Swan Hill') ON CONFLICT (alias) DO NOTHING;

    -- SA aliases
    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Mount Gambier Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Mount Gambier') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Naracoorte Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Naracoorte') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Mount Compass Southern Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Mount Compass') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Mt Compass') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Dublin South Australian Livestock Exchange';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Dublin') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'SALE Dublin') ON CONFLICT (alias) DO NOTHING;
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'SA Livestock Exchange') ON CONFLICT (alias) DO NOTHING;

    -- WA aliases
    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Muchea Livestock Centre';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Muchea') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Boyanup Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Boyanup') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Mount Barker Great Southern Regional Cattle Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Mount Barker') ON CONFLICT (alias) DO NOTHING;

    -- TAS aliases
    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Powranna Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Powranna') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Quoiba Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Quoiba') ON CONFLICT (alias) DO NOTHING;

    SELECT id INTO v_id FROM ref_saleyards WHERE name = 'Killafaddy Saleyards';
    INSERT INTO ref_saleyard_aliases (saleyard_id, alias) VALUES (v_id, 'Killafaddy') ON CONFLICT (alias) DO NOTHING;
END $$;

-- --------------------------------------------------------------------------
-- 5. ref_breeds - All breeds with species FK and default premium
-- Source: ReferenceData.cattleBreeds/sheepBreeds/pigBreeds/goatBreeds
--         + ReferenceData.cattleBreedPremiums for cattle
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ref_breeds (
    id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    species_id SMALLINT NOT NULL REFERENCES ref_species(id),
    default_premium_pct DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, species_id)
);

-- Cattle breeds (35) with premiums from ReferenceData.cattleBreedPremiums
DO $$
DECLARE
    v_species_id SMALLINT;
BEGIN
    SELECT id INTO v_species_id FROM ref_species WHERE name = 'Cattle';

    INSERT INTO ref_breeds (name, species_id, default_premium_pct) VALUES
        ('Angus',                v_species_id, 10),
        ('Angus X',              v_species_id, 7),
        ('Belted Galloway',      v_species_id, 3),
        ('Black Angus',          v_species_id, 10),
        ('Black Baldy',          v_species_id, 7),
        ('Black Hereford',       v_species_id, 7),
        ('Brahman',              v_species_id, 1),
        ('Brangus',              v_species_id, 6),
        ('Charbray',             v_species_id, 4),
        ('Charolais',            v_species_id, 5),
        ('Charolais X Angus',    v_species_id, 9),
        ('Cross Breed',          v_species_id, 0),
        ('Devon',                v_species_id, 3),
        ('Droughtmaster',        v_species_id, 4),
        ('European Cross',       v_species_id, 0),
        ('Friesian',             v_species_id, -1),
        ('Friesian Cross',       v_species_id, 1),
        ('Gelbvieh',             v_species_id, 5),
        ('Hereford',             v_species_id, 4),
        ('Holstein',             v_species_id, -2),
        ('Limousin',             v_species_id, 4),
        ('Limousin X Friesian',  v_species_id, 5),
        ('Lowline Angus',        v_species_id, 8),
        ('Mixed Breed',          v_species_id, 0),
        ('Murray Grey',          v_species_id, 5),
        ('Murray Grey X Friesian', v_species_id, 6),
        ('Poll Hereford',        v_species_id, 4),
        ('Red Angus',            v_species_id, 9),
        ('Santa Gertrudis',      v_species_id, 3),
        ('Senepol',              v_species_id, 3),
        ('Shorthorn',            v_species_id, 2),
        ('Simmental',            v_species_id, 5),
        ('Speckle Park',         v_species_id, 8),
        ('Square Meaters',       v_species_id, 4),
        ('Wagyu',                v_species_id, 18)
    ON CONFLICT (name, species_id) DO UPDATE SET default_premium_pct = EXCLUDED.default_premium_pct;
END $$;

-- Sheep breeds (21) - no premiums defined yet (default 0)
DO $$
DECLARE
    v_species_id SMALLINT;
BEGIN
    SELECT id INTO v_species_id FROM ref_species WHERE name = 'Sheep';

    INSERT INTO ref_breeds (name, species_id, default_premium_pct) VALUES
        ('Merino',           v_species_id, 0),
        ('Poll Merino',      v_species_id, 0),
        ('Dohne Merino',     v_species_id, 0),
        ('SAMM',             v_species_id, 0),
        ('Border Leicester', v_species_id, 0),
        ('Poll Dorset',      v_species_id, 0),
        ('White Suffolk',    v_species_id, 0),
        ('Suffolk',          v_species_id, 0),
        ('Dorper',           v_species_id, 0),
        ('White Dorper',     v_species_id, 0),
        ('Aussie White',     v_species_id, 0),
        ('Damara',           v_species_id, 0),
        ('Wiltipoll',        v_species_id, 0),
        ('Texel',            v_species_id, 0),
        ('Hampshire Down',   v_species_id, 0),
        ('Southdown',        v_species_id, 0),
        ('Corriedale',       v_species_id, 0),
        ('East Friesian',    v_species_id, 0),
        ('Perendale',        v_species_id, 0),
        ('Romney',           v_species_id, 0),
        ('Wiltshire Horn',   v_species_id, 0)
    ON CONFLICT (name, species_id) DO NOTHING;
END $$;

-- Pig breeds (9) - no premiums defined yet
DO $$
DECLARE
    v_species_id SMALLINT;
BEGIN
    SELECT id INTO v_species_id FROM ref_species WHERE name = 'Pigs';

    INSERT INTO ref_breeds (name, species_id, default_premium_pct) VALUES
        ('Landrace',                   v_species_id, 0),
        ('Large White',                v_species_id, 0),
        ('Duroc',                      v_species_id, 0),
        ('Tamworth',                   v_species_id, 0),
        ('Wessex Saddleback',          v_species_id, 0),
        ('Hampshire',                  v_species_id, 0),
        ('Berkshire',                  v_species_id, 0),
        ('Australian Miniature Pig',   v_species_id, 0),
        ('Gloucestershire Old Spot',   v_species_id, 0)
    ON CONFLICT (name, species_id) DO NOTHING;
END $$;

-- Goat breeds (11) - no premiums defined yet
DO $$
DECLARE
    v_species_id SMALLINT;
BEGIN
    SELECT id INTO v_species_id FROM ref_species WHERE name = 'Goats';

    INSERT INTO ref_breeds (name, species_id, default_premium_pct) VALUES
        ('Saanen',                          v_species_id, 0),
        ('Toggenburg',                      v_species_id, 0),
        ('British Alpine',                  v_species_id, 0),
        ('Anglo Nubian',                    v_species_id, 0),
        ('Australian Cashmere',             v_species_id, 0),
        ('Australian Heritage Angora',      v_species_id, 0),
        ('Australian Heritage Anglo-Nubian', v_species_id, 0),
        ('Australian Rangeland Goat',       v_species_id, 0),
        ('Australian Miniature',            v_species_id, 0),
        ('Boer',                            v_species_id, 0),
        ('Nigerian Dwarf',                  v_species_id, 0)
    ON CONFLICT (name, species_id) DO NOTHING;
END $$;

-- --------------------------------------------------------------------------
-- 6. ref_categories - All livestock categories with species FK and MLA mapping
-- Source: ReferenceData.cattleCategoryGroups/sheepCategories/pigCategories/goatCategories
--         + ReferenceData.mapCategoryToMLACategory() for MLA name mapping
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ref_categories (
    id SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    species_id SMALLINT NOT NULL REFERENCES ref_species(id),
    mla_category TEXT,
    group_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, species_id)
);

-- Cattle categories (16) with group names and MLA mappings
DO $$
DECLARE
    v_species_id SMALLINT;
BEGIN
    SELECT id INTO v_species_id FROM ref_species WHERE name = 'Cattle';

    -- Cows group
    INSERT INTO ref_categories (name, species_id, mla_category, group_name) VALUES
        ('Breeder Cow',             v_species_id, 'Breeding Cow',    'Cows'),
        ('Breeder Heifer',          v_species_id, 'Breeding Cow',    'Cows'),
        ('Wet Cow',                 v_species_id, 'Wet Cow',         'Cows'),
        ('Cull Cow',                v_species_id, 'Wet Cow',         'Cows'),
    -- Heifers group
        ('Weaner Heifer',           v_species_id, 'Heifer',          'Heifers'),
        ('Yearling Heifer',         v_species_id, 'Heifer',          'Heifers'),
        ('Feeder Heifer',           v_species_id, 'Heifer',          'Heifers'),
        ('Grown Heifer (Un-Joined)', v_species_id, 'Heifer',         'Heifers'),
    -- Bulls group
        ('Weaner Bull',             v_species_id, 'Weaner Bull',     'Bulls'),
        ('Yearling Bull',           v_species_id, 'Yearling Bull',   'Bulls'),
        ('Grown Bull',              v_species_id, 'Grown Bull',      'Bulls'),
        ('Cull Bull',               v_species_id, 'Grown Bull',      'Bulls'),
    -- Steers group
        ('Weaner Steer',            v_species_id, 'Weaner Steer',    'Steers'),
        ('Yearling Steer',          v_species_id, 'Yearling Steer',  'Steers'),
        ('Feeder Steer',            v_species_id, 'Yearling Steer',  'Steers'),
        ('Grown Steer',             v_species_id, 'Grown Steer',     'Steers')
    ON CONFLICT (name, species_id) DO UPDATE SET
        mla_category = EXCLUDED.mla_category,
        group_name = EXCLUDED.group_name;
END $$;

-- Sheep categories (12)
DO $$
DECLARE
    v_species_id SMALLINT;
BEGIN
    SELECT id INTO v_species_id FROM ref_species WHERE name = 'Sheep';

    INSERT INTO ref_categories (name, species_id, mla_category, group_name) VALUES
        ('Breeder',               v_species_id, 'Breeder',               NULL),
        ('Maiden Ewe (Joined)',   v_species_id, 'Maiden Ewe (Joined)',   NULL),
        ('Maiden Ewe (Unjoined)', v_species_id, 'Maiden Ewe (Unjoined)', NULL),
        ('Dry Ewe',               v_species_id, 'Dry Ewe',               NULL),
        ('Cull Ewe',              v_species_id, 'Cull Ewe',              NULL),
        ('Weaner Ewe',            v_species_id, 'Weaner Ewe',            NULL),
        ('Feeder Ewe',            v_species_id, 'Feeder Ewe',            NULL),
        ('Slaughter Ewe',         v_species_id, 'Slaughter Ewe',         NULL),
        ('Lambs',                 v_species_id, 'Lambs',                 NULL),
        ('Weaner Lamb',           v_species_id, 'Weaner Lamb',           NULL),
        ('Feeder Lamb',           v_species_id, 'Feeder Lamb',           NULL),
        ('Slaughter Lamb',        v_species_id, 'Slaughter Lamb',        NULL)
    ON CONFLICT (name, species_id) DO NOTHING;
END $$;

-- Pig categories (11)
DO $$
DECLARE
    v_species_id SMALLINT;
BEGIN
    SELECT id INTO v_species_id FROM ref_species WHERE name = 'Pigs';

    INSERT INTO ref_categories (name, species_id, mla_category, group_name) VALUES
        ('Grower Pig',      v_species_id, 'Grower Pig',      NULL),
        ('Finisher Pig',    v_species_id, 'Finisher Pig',    NULL),
        ('Breeder',         v_species_id, 'Breeder',         NULL),
        ('Dry Sow',         v_species_id, 'Dry Sow',         NULL),
        ('Cull Sow',        v_species_id, 'Cull Sow',        NULL),
        ('Weaner Pig',      v_species_id, 'Weaner Pig',      NULL),
        ('Feeder Pig',      v_species_id, 'Feeder Pig',      NULL),
        ('Porker',          v_species_id, 'Porker',          NULL),
        ('Baconer',         v_species_id, 'Baconer',         NULL),
        ('Grower Barrow',   v_species_id, 'Grower Barrow',   NULL),
        ('Finisher Barrow', v_species_id, 'Finisher Barrow', NULL)
    ON CONFLICT (name, species_id) DO NOTHING;
END $$;

-- Goat categories (9)
DO $$
DECLARE
    v_species_id SMALLINT;
BEGIN
    SELECT id INTO v_species_id FROM ref_species WHERE name = 'Goats';

    INSERT INTO ref_categories (name, species_id, mla_category, group_name) VALUES
        ('Breeder Doe',     v_species_id, 'Breeder Doe',     NULL),
        ('Dry Doe',         v_species_id, 'Dry Doe',         NULL),
        ('Cull Doe',        v_species_id, 'Cull Doe',        NULL),
        ('Breeder Buck',    v_species_id, 'Breeder Buck',    NULL),
        ('Sale Buck',       v_species_id, 'Sale Buck',       NULL),
        ('Mature Wether',   v_species_id, 'Mature Wether',   NULL),
        ('Rangeland Goat',  v_species_id, 'Rangeland Goat',  NULL),
        ('Capretto',        v_species_id, 'Capretto',        NULL),
        ('Chevon',          v_species_id, 'Chevon',          NULL)
    ON CONFLICT (name, species_id) DO NOTHING;
END $$;

-- --------------------------------------------------------------------------
-- 7. Row Level Security - Public read access on all reference tables
-- --------------------------------------------------------------------------
ALTER TABLE ref_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_saleyards ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_saleyard_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Public read ref_species" ON ref_species;
DROP POLICY IF EXISTS "Public read ref_states" ON ref_states;
DROP POLICY IF EXISTS "Public read ref_saleyards" ON ref_saleyards;
DROP POLICY IF EXISTS "Public read ref_saleyard_aliases" ON ref_saleyard_aliases;
DROP POLICY IF EXISTS "Public read ref_breeds" ON ref_breeds;
DROP POLICY IF EXISTS "Public read ref_categories" ON ref_categories;

CREATE POLICY "Public read ref_species" ON ref_species FOR SELECT USING (true);
CREATE POLICY "Public read ref_states" ON ref_states FOR SELECT USING (true);
CREATE POLICY "Public read ref_saleyards" ON ref_saleyards FOR SELECT USING (true);
CREATE POLICY "Public read ref_saleyard_aliases" ON ref_saleyard_aliases FOR SELECT USING (true);
CREATE POLICY "Public read ref_breeds" ON ref_breeds FOR SELECT USING (true);
CREATE POLICY "Public read ref_categories" ON ref_categories FOR SELECT USING (true);

-- --------------------------------------------------------------------------
-- 8. Indexes on reference tables
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ref_saleyards_state ON ref_saleyards(state_code);
CREATE INDEX IF NOT EXISTS idx_ref_breeds_species ON ref_breeds(species_id);
CREATE INDEX IF NOT EXISTS idx_ref_categories_species ON ref_categories(species_id);
CREATE INDEX IF NOT EXISTS idx_ref_saleyard_aliases_saleyard ON ref_saleyard_aliases(saleyard_id);
