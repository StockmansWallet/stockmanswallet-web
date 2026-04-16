// Reference data ported from iOS ReferenceData.swift
// Breeds, saleyards, categories, breed premiums, MLA mappings

// MARK: - Breeds

export const cattleBreeds = [
  "Angus", "Angus X", "Belted Galloway", "Black Angus", "Black Baldy",
  "Black Hereford", "Brahman", "Brangus", "Charbray", "Charolais",
  "Charolais X Angus", "Cross Breed", "Devon", "Droughtmaster",
  "European Cross", "Friesian", "Friesian Cross", "Gelbvieh",
  "Hereford", "Holstein", "Limousin", "Limousin X Friesian",
  "Lowline Angus", "Mixed Breed", "Murray Grey", "Murray Grey X Friesian",
  "Poll Hereford", "Red Angus", "Santa Gertrudis", "Senepol",
  "Shorthorn", "Simmental", "Speckle Park", "Square Meaters", "Wagyu",
] as const;

export const sheepBreeds = [
  "Merino", "Poll Merino", "Dohne Merino", "SAMM",
  "Border Leicester", "Poll Dorset", "White Suffolk", "Suffolk",
  "Dorper", "White Dorper", "Aussie White", "Damara",
  "Wiltipoll", "Texel", "Hampshire Down", "Southdown",
  "Corriedale", "East Friesian", "Perendale", "Romney",
  "Wiltshire Horn",
] as const;

export const pigBreeds = [
  "Landrace", "Large White", "Duroc", "Tamworth",
  "Wessex Saddleback", "Hampshire", "Berkshire",
  "Australian Miniature Pig", "Gloucestershire Old Spot",
] as const;

export const goatBreeds = [
  "Saanen", "Toggenburg", "British Alpine", "Anglo Nubian",
  "Australian Cashmere", "Australian Heritage Angora",
  "Australian Heritage Anglo-Nubian", "Australian Rangeland Goat",
  "Australian Miniature", "Boer", "Nigerian Dwarf",
] as const;

export function breedsForSpecies(species: string): readonly string[] {
  switch (species) {
    case "Cattle": return cattleBreeds;
    case "Sheep": return sheepBreeds;
    case "Pig": return pigBreeds;
    case "Goat": return goatBreeds;
    default: return [];
  }
}

// MARK: - Breed Premiums (%)

export const cattleBreedPremiums: Record<string, number> = {
  "Angus": 9, "Black Angus": 9, "Red Angus": 8, "Angus X": 6,
  "Wagyu": 14,
  "Charolais X Angus": 7, "Black Baldy": 6, "Black Hereford": 5,
  "Brangus": 3,
  "Charolais": 4, "Limousin": 4, "Simmental": 4,
  "Hereford": 3, "Poll Hereford": 3,
  "Murray Grey": 4, "Shorthorn": 2,
  "Limousin X Friesian": 4, "Murray Grey X Friesian": 5,
  "Speckle Park": 7, "Lowline Angus": 6,
  "Gelbvieh": 3, "Devon": 1, "Belted Galloway": 0, "Senepol": 2,
  "Square Meaters": 1,
  "Brahman": -2, "Droughtmaster": 1, "Santa Gertrudis": 2, "Charbray": 3,
  "Holstein": -4, "Friesian": -3, "Friesian Cross": -1,
  "Cross Breed": 0, "European Cross": 0, "Mixed Breed": 0,
};

export function breedPremium(breed: string): number | undefined {
  return cattleBreedPremiums[breed];
}

export function breedPremiumDescription(breed: string): string {
  const premium = breedPremium(breed);
  if (premium === undefined) {
    return `${breed} does not have a preset breed premium. You can set a custom adjustment below.`;
  }
  if (premium > 0) {
    return `${breed} carries a +${premium}% breed premium.\n(Based on national market data)`;
  } else if (premium < 0) {
    return `${breed} carries a ${premium}% breed discount.\n(Based on national market data)`;
  }
  return `${breed} has no breed premium applied. This is the market baseline.`;
}

// MARK: - Saleyards

export const saleyards = [
  "Armidale Livestock Selling Centre",
  "Bairnsdale Saleyards",
  "Ballarat Central Victoria Livestock Exchange",
  "Bendigo Livestock Exchange",
  "Blackall Saleyards",
  "Boyanup Saleyards",
  "Camperdown Saleyards",
  "Carcoar Central Tablelands Livestock Exchange",
  "Casino Livestock Exchange",
  "Charters Towers Dalrymple Saleyards",
  "Colac Saleyards",
  "Coonamble Saleyards",
  "Dalby Regional Saleyards",
  "Dubbo Regional Livestock Market",
  "Dublin South Australian Livestock Exchange",
  "Echuca Saleyards",
  "Emerald Saleyards",
  "Forbes Central West Livestock Exchange",
  "Goulburn Regional Saleyards",
  "Gracemere Central Queensland Livestock Exchange",
  "Griffith Regional Saleyards",
  "Gunnedah Saleyards",
  "Inverell Regional Livestock Exchange",
  "Killafaddy Saleyards",
  "Leongatha Saleyards",
  "Mortlake Western Victorian Livestock Exchange",
  "Moss Vale Saleyards",
  "Mount Barker Great Southern Regional Cattle Saleyards",
  "Mount Compass Southern Livestock Exchange",
  "Mount Gambier Saleyards",
  "Muchea Livestock Centre",
  "Naracoorte Saleyards",
  "Oakey Saleyards",
  "Pakenham Victorian Livestock Exchange",
  "Powranna Saleyards",
  "Quoiba Saleyards",
  "Roma Saleyards",
  "Sale Gippsland Regional Livestock Exchange",
  "Scone Saleyards",
  "Shepparton Regional Saleyards",
  "Singleton Hunter Regional Livestock Exchange",
  "Swan Hill Saleyards",
  "Tamworth Regional Livestock Exchange",
  "Toowoomba Saleyards",
  "Wagga Wagga Livestock Marketing Centre",
  "Warrnambool Livestock Exchange",
  "Warwick Saleyards",
  "Wodonga (Barnawartha) Northern Victoria Livestock Exchange",
  "Yass South Eastern Livestock Exchange",
  "Yea Saleyards",
] as const;

// MARK: - MLA CSV Saleyard Name Mapping

export const mlaSaleyardNameMapping: Record<string, string> = {
  // NSW
  "Wagga Wagga": "Wagga Wagga Livestock Marketing Centre",
  "WLMC Wagga Wagga": "Wagga Wagga Livestock Marketing Centre",
  "Dubbo": "Dubbo Regional Livestock Market",
  "Forbes": "Forbes Central West Livestock Exchange",
  "CWLE Forbes": "Forbes Central West Livestock Exchange",
  "Tamworth": "Tamworth Regional Livestock Exchange",
  "TRLE Tamworth": "Tamworth Regional Livestock Exchange",
  "TRLX Tamworth": "Tamworth Regional Livestock Exchange",
  "Carcoar": "Carcoar Central Tablelands Livestock Exchange",
  "CTLX Carcoar": "Carcoar Central Tablelands Livestock Exchange",
  "Yass": "Yass South Eastern Livestock Exchange",
  "SELX Yass": "Yass South Eastern Livestock Exchange",
  "Inverell": "Inverell Regional Livestock Exchange",
  "IRLX Inverell": "Inverell Regional Livestock Exchange",
  "Casino": "Casino Livestock Exchange",
  "Armidale": "Armidale Livestock Selling Centre",
  "Goulburn": "Goulburn Regional Saleyards",
  "Griffith": "Griffith Regional Saleyards",
  "Singleton": "Singleton Hunter Regional Livestock Exchange",
  "HRLX Singleton": "Singleton Hunter Regional Livestock Exchange",
  "Coonamble": "Coonamble Saleyards",
  "Gunnedah": "Gunnedah Saleyards",
  "Moss Vale": "Moss Vale Saleyards",
  "Scone": "Scone Saleyards",
  "Lismore": "Lismore Saleyards",
  // QLD
  "Roma": "Roma Saleyards",
  "Roma Store": "Roma Saleyards",
  "Dalby": "Dalby Regional Saleyards",
  "Gracemere": "Gracemere Central Queensland Livestock Exchange",
  "CQLX Gracemere": "Gracemere Central Queensland Livestock Exchange",
  "Charters Towers": "Charters Towers Dalrymple Saleyards",
  "Emerald": "Emerald Saleyards",
  "Blackall": "Blackall Saleyards",
  "Warwick": "Warwick Saleyards",
  "Oakey": "Oakey Saleyards",
  "Toowoomba": "Toowoomba Saleyards",
  // VIC
  "Wodonga": "Wodonga (Barnawartha) Northern Victoria Livestock Exchange",
  "NVLX Wodonga": "Wodonga (Barnawartha) Northern Victoria Livestock Exchange",
  "Leongatha": "Leongatha Saleyards",
  "Pakenham": "Pakenham Victorian Livestock Exchange",
  "PVLE Pakenham": "Pakenham Victorian Livestock Exchange",
  "Mortlake": "Mortlake Western Victorian Livestock Exchange",
  "Ballarat": "Ballarat Central Victoria Livestock Exchange",
  "CVLX Ballarat": "Ballarat Central Victoria Livestock Exchange",
  "Shepparton": "Shepparton Regional Saleyards",
  "Warrnambool": "Warrnambool Livestock Exchange",
  "Bendigo": "Bendigo Livestock Exchange",
  "Yea": "Yea Saleyards",
  "Bairnsdale": "Bairnsdale Saleyards",
  "Camperdown": "Camperdown Saleyards",
  "Colac": "Colac Saleyards",
  "Echuca": "Echuca Saleyards",
  "Sale": "Sale Gippsland Regional Livestock Exchange",
  "GRLE Sale": "Sale Gippsland Regional Livestock Exchange",
  "Swan Hill": "Swan Hill Saleyards",
  // SA
  "Mount Gambier": "Mount Gambier Saleyards",
  "Naracoorte": "Naracoorte Saleyards",
  "Mount Compass": "Mount Compass Southern Livestock Exchange",
  "Mt Compass": "Mount Compass Southern Livestock Exchange",
  "Dublin": "Dublin South Australian Livestock Exchange",
  "SALE Dublin": "Dublin South Australian Livestock Exchange",
  "SA Livestock Exchange": "Dublin South Australian Livestock Exchange",
  // WA
  "Muchea": "Muchea Livestock Centre",
  "Boyanup": "Boyanup Saleyards",
  "Mount Barker": "Mount Barker Great Southern Regional Cattle Saleyards",
  "Wagga": "Wagga Wagga Livestock Marketing Centre",
  // TAS
  "Powranna": "Powranna Saleyards",
  "Quoiba": "Quoiba Saleyards",
  "Killafaddy": "Killafaddy Saleyards",
};

// MARK: - Saleyard Coordinates

export const saleyardCoordinates: Record<string, { lat: number; lon: number }> = {
  // NSW
  "Armidale Livestock Selling Centre": { lat: -30.5212, lon: 151.6814 },
  "Carcoar Central Tablelands Livestock Exchange": { lat: -33.6153, lon: 149.1400 },
  "Casino Livestock Exchange": { lat: -28.8179, lon: 153.0335 },
  "Coonamble Saleyards": { lat: -30.9500, lon: 148.3800 },
  "Dubbo Regional Livestock Market": { lat: -32.1944, lon: 148.6843 },
  "Forbes Central West Livestock Exchange": { lat: -33.3262, lon: 148.0982 },
  "Goulburn Regional Saleyards": { lat: -34.7632, lon: 149.7164 },
  "Griffith Regional Saleyards": { lat: -34.2892, lon: 146.0504 },
  "Gunnedah Saleyards": { lat: -30.8539, lon: 150.1465 },
  "Inverell Regional Livestock Exchange": { lat: -29.7570, lon: 151.1045 },
  "Moss Vale Saleyards": { lat: -34.5200, lon: 150.3502 },
  "Scone Saleyards": { lat: -32.0400, lon: 150.8700 },
  "Singleton Hunter Regional Livestock Exchange": { lat: -32.5466, lon: 151.2275 },
  "Tamworth Regional Livestock Exchange": { lat: -31.0733, lon: 150.8576 },
  "Wagga Wagga Livestock Marketing Centre": { lat: -35.0675, lon: 147.4116 },
  "Yass South Eastern Livestock Exchange": { lat: -34.8125, lon: 148.8840 },
  // QLD
  "Blackall Saleyards": { lat: -24.4051, lon: 145.4785 },
  "Charters Towers Dalrymple Saleyards": { lat: -20.1028, lon: 146.2496 },
  "Dalby Regional Saleyards": { lat: -27.1805, lon: 151.2350 },
  "Emerald Saleyards": { lat: -23.5232, lon: 148.1468 },
  "Gracemere Central Queensland Livestock Exchange": { lat: -23.4448, lon: 150.4372 },
  "Oakey Saleyards": { lat: -27.4279, lon: 151.7127 },
  "Roma Saleyards": { lat: -26.5741, lon: 148.8174 },
  "Toowoomba Saleyards": { lat: -27.5600, lon: 151.9500 },
  "Warwick Saleyards": { lat: -28.2171, lon: 152.0387 },
  // VIC
  "Bairnsdale Saleyards": { lat: -37.8326, lon: 147.6229 },
  "Ballarat Central Victoria Livestock Exchange": { lat: -37.4676, lon: 143.7640 },
  "Bendigo Livestock Exchange": { lat: -36.6421, lon: 144.3091 },
  "Camperdown Saleyards": { lat: -38.6600, lon: 143.1500 },
  "Colac Saleyards": { lat: -38.3201, lon: 143.6281 },
  "Echuca Saleyards": { lat: -36.1936, lon: 144.7738 },
  "Leongatha Saleyards": { lat: -38.5359, lon: 145.9499 },
  "Mortlake Western Victorian Livestock Exchange": { lat: -38.0749, lon: 142.7756 },
  "Pakenham Victorian Livestock Exchange": { lat: -38.0955, lon: 145.4928 },
  "Sale Gippsland Regional Livestock Exchange": { lat: -38.0954, lon: 147.0591 },
  "Shepparton Regional Saleyards": { lat: -36.3688, lon: 145.4195 },
  "Swan Hill Saleyards": { lat: -35.3238, lon: 143.5489 },
  "Warrnambool Livestock Exchange": { lat: -38.3577, lon: 142.4608 },
  "Wodonga (Barnawartha) Northern Victoria Livestock Exchange": { lat: -36.0608, lon: 146.7133 },
  "Yea Saleyards": { lat: -37.2100, lon: 145.4300 },
  // SA
  "Dublin South Australian Livestock Exchange": { lat: -34.4743, lon: 138.4272 },
  "Mount Compass Southern Livestock Exchange": { lat: -35.3500, lon: 138.6200 },
  "Mount Gambier Saleyards": { lat: -37.8351, lon: 140.8857 },
  "Naracoorte Saleyards": { lat: -36.9524, lon: 140.7583 },
  // WA
  "Boyanup Saleyards": { lat: -33.4771, lon: 115.7358 },
  "Mount Barker Great Southern Regional Cattle Saleyards": { lat: -34.6360, lon: 117.6677 },
  "Muchea Livestock Centre": { lat: -31.5767, lon: 115.9968 },
  // TAS
  "Killafaddy Saleyards": { lat: -41.4369, lon: 147.1729 },
  "Powranna Saleyards": { lat: -41.6596, lon: 147.2464 },
  "Quoiba Saleyards": { lat: -41.1794, lon: 146.3447 },
};

// MARK: - Saleyard to State Mapping

export const saleyardToState: Record<string, string> = {
  // NSW
  "Wagga Wagga Livestock Marketing Centre": "NSW",
  "Dubbo Regional Livestock Market": "NSW",
  "Forbes Central West Livestock Exchange": "NSW",
  "Tamworth Regional Livestock Exchange": "NSW",
  "Carcoar Central Tablelands Livestock Exchange": "NSW",
  "Yass South Eastern Livestock Exchange": "NSW",
  "Inverell Regional Livestock Exchange": "NSW",
  "Casino Livestock Exchange": "NSW",
  "Armidale Livestock Selling Centre": "NSW",
  "Goulburn Regional Saleyards": "NSW",
  "Griffith Regional Saleyards": "NSW",
  "Singleton Hunter Regional Livestock Exchange": "NSW",
  "Coonamble Saleyards": "NSW",
  "Gunnedah Saleyards": "NSW",
  "Moss Vale Saleyards": "NSW",
  "Scone Saleyards": "NSW",
  "Lismore Saleyards": "NSW",
  // QLD
  "Roma Saleyards": "QLD",
  "Dalby Regional Saleyards": "QLD",
  "Gracemere Central Queensland Livestock Exchange": "QLD",
  "Charters Towers Dalrymple Saleyards": "QLD",
  "Emerald Saleyards": "QLD",
  "Blackall Saleyards": "QLD",
  "Warwick Saleyards": "QLD",
  "Oakey Saleyards": "QLD",
  "Toowoomba Saleyards": "QLD",
  // VIC
  "Wodonga (Barnawartha) Northern Victoria Livestock Exchange": "VIC",
  "Leongatha Saleyards": "VIC",
  "Pakenham Victorian Livestock Exchange": "VIC",
  "Mortlake Western Victorian Livestock Exchange": "VIC",
  "Ballarat Central Victoria Livestock Exchange": "VIC",
  "Shepparton Regional Saleyards": "VIC",
  "Warrnambool Livestock Exchange": "VIC",
  "Bendigo Livestock Exchange": "VIC",
  "Yea Saleyards": "VIC",
  "Bairnsdale Saleyards": "VIC",
  "Camperdown Saleyards": "VIC",
  "Colac Saleyards": "VIC",
  "Echuca Saleyards": "VIC",
  "Sale Gippsland Regional Livestock Exchange": "VIC",
  "Swan Hill Saleyards": "VIC",
  // SA
  "Mount Gambier Saleyards": "SA",
  "Naracoorte Saleyards": "SA",
  "Mount Compass Southern Livestock Exchange": "SA",
  "Dublin South Australian Livestock Exchange": "SA",
  // WA
  "Muchea Livestock Centre": "WA",
  "Boyanup Saleyards": "WA",
  "Mount Barker Great Southern Regional Cattle Saleyards": "WA",
  // TAS
  "Powranna Saleyards": "TAS",
  "Quoiba Saleyards": "TAS",
  "Killafaddy Saleyards": "TAS",
};

// MARK: - Saleyard Addresses

export const saleyardAddress: Record<string, string> = {
  // NSW
  "Armidale Livestock Selling Centre": "Grafton Road, Armidale NSW 2350",
  "Carcoar Central Tablelands Livestock Exchange": "4860 Mid Western Highway, Carcoar NSW 2791",
  "Casino Livestock Exchange": "Reynolds Road, Casino NSW 2470",
  "Coonamble Saleyards": "Saleyards Road, Coonamble NSW 2829",
  "Dubbo Regional Livestock Market": "6R Boothenba Road, Dubbo NSW 2830",
  "Forbes Central West Livestock Exchange": "Back Yamma Road, Forbes NSW 2871",
  "Goulburn Regional Saleyards": "Braidwood Road, Goulburn NSW 2580",
  "Griffith Regional Saleyards": "Jondaryan Avenue, Griffith NSW 2680",
  "Gunnedah Saleyards": "Kamilaroi Highway, Gunnedah NSW 2380",
  "Inverell Regional Livestock Exchange": "375 Yetman Road, Inverell NSW 2360",
  "Moss Vale Saleyards": "Berrima Road, Moss Vale NSW 2577",
  "Scone Saleyards": "Muffet Street, Scone NSW 2337",
  "Singleton Hunter Regional Livestock Exchange": "56 Gresford Road, Clydesdale NSW 2330",
  "Tamworth Regional Livestock Exchange": "7 Phoenix Street, Westdale NSW 2340",
  "Wagga Wagga Livestock Marketing Centre": "Webb Street, Bomen NSW 2650",
  "Yass South Eastern Livestock Exchange": "1628 Bellevale Road, Yass NSW 2582",
  // QLD
  "Blackall Saleyards": "164 Evora Road, Blackall QLD 4472",
  "Charters Towers Dalrymple Saleyards": "10 Depot Road, Black Jack QLD 4820",
  "Dalby Regional Saleyards": "Yumborra Road, Dalby QLD 4405",
  "Emerald Saleyards": "Batts Street, Emerald QLD 4720",
  "Gracemere Central Queensland Livestock Exchange": "16 Saleyards Road, Gracemere QLD 4702",
  "Oakey Saleyards": "Bridge Street, Oakey QLD 4401",
  "Roma Saleyards": "44589 Warrego Highway, Roma QLD 4455",
  "Toowoomba Saleyards": "Mort Street, Drayton QLD 4350",
  "Warwick Saleyards": "Grafton Street, Warwick QLD 4370",
  // VIC
  "Bairnsdale Saleyards": "11 Saleyard Road, Bairnsdale VIC 3875",
  "Ballarat Central Victoria Livestock Exchange": "129-139 Sunraysia Highway, Miners Rest VIC 3352",
  "Bendigo Livestock Exchange": "Wallenjoe Road, Huntly VIC 3551",
  "Camperdown Saleyards": "Saleyards Road, Camperdown VIC 3260",
  "Colac Saleyards": "55 Colac-Ballarat Road, Colac East VIC 3250",
  "Echuca Saleyards": "510 McKenzie Road, Echuca VIC 3564",
  "Leongatha Saleyards": "670 South Gippsland Highway, Koonwarra VIC 3954",
  "Mortlake Western Victorian Livestock Exchange": "Connewarren Lane, Mortlake VIC 3272",
  "Pakenham Victorian Livestock Exchange": "3A Exchange Drive, Pakenham VIC 3810",
  "Sale Gippsland Regional Livestock Exchange": "Saleyards Road, Sale VIC 3850",
  "Shepparton Regional Saleyards": "4 Wheeler Street, Shepparton VIC 3630",
  "Swan Hill Saleyards": "Saleyards Road, Swan Hill VIC 3585",
  "Warrnambool Livestock Exchange": "Caramut Road, Warrnambool VIC 3280",
  "Wodonga (Barnawartha) Northern Victoria Livestock Exchange": "1934 Murray Valley Highway, Barnawartha North VIC 3691",
  "Yea Saleyards": "Saleyard Road, Yea VIC 3717",
  // SA
  "Dublin South Australian Livestock Exchange": "219 Carslake Road, Dublin SA 5501",
  "Mount Compass Southern Livestock Exchange": "43 Saleyard Road, Mount Compass SA 5210",
  "Mount Gambier Saleyards": "21 Fairbanks Road, Glenburnie SA 5291",
  "Naracoorte Saleyards": "Wimmera Highway, Naracoorte SA 5271",
  // WA
  "Boyanup Saleyards": "Boyanup-Picton Road, Boyanup WA 6237",
  "Mount Barker Great Southern Regional Cattle Saleyards": "32416 Albany Highway, Mount Barker WA 6324",
  "Muchea Livestock Centre": "Lot 5 Muchea East Road, Muchea WA 6501",
  // TAS
  "Killafaddy Saleyards": "Killafaddy Road, Killafaddy TAS 7249",
  "Powranna Saleyards": "Midland Highway, Powranna TAS 7306",
  "Quoiba Saleyards": "Steele Street, Devonport TAS 7310",
};

// MARK: - Saleyard Locality

export const saleyardLocality: Record<string, string> = {
  // NSW
  "Armidale Livestock Selling Centre": "Armidale, NSW",
  "Carcoar Central Tablelands Livestock Exchange": "Carcoar, NSW",
  "Casino Livestock Exchange": "Casino, NSW",
  "Coonamble Saleyards": "Coonamble, NSW",
  "Dubbo Regional Livestock Market": "Dubbo, NSW",
  "Forbes Central West Livestock Exchange": "Forbes, NSW",
  "Goulburn Regional Saleyards": "Goulburn, NSW",
  "Griffith Regional Saleyards": "Griffith, NSW",
  "Gunnedah Saleyards": "Gunnedah, NSW",
  "Inverell Regional Livestock Exchange": "Inverell, NSW",
  "Moss Vale Saleyards": "Moss Vale, NSW",
  "Scone Saleyards": "Scone, NSW",
  "Singleton Hunter Regional Livestock Exchange": "Clydesdale, NSW",
  "Tamworth Regional Livestock Exchange": "Westdale, NSW",
  "Wagga Wagga Livestock Marketing Centre": "Bomen, NSW",
  "Yass South Eastern Livestock Exchange": "Yass, NSW",
  // QLD
  "Blackall Saleyards": "Blackall, QLD",
  "Charters Towers Dalrymple Saleyards": "Black Jack, QLD",
  "Dalby Regional Saleyards": "Dalby, QLD",
  "Emerald Saleyards": "Emerald, QLD",
  "Gracemere Central Queensland Livestock Exchange": "Gracemere, QLD",
  "Oakey Saleyards": "Oakey, QLD",
  "Roma Saleyards": "Roma, QLD",
  "Toowoomba Saleyards": "Drayton, QLD",
  "Warwick Saleyards": "Warwick, QLD",
  // VIC
  "Bairnsdale Saleyards": "Bairnsdale, VIC",
  "Ballarat Central Victoria Livestock Exchange": "Miners Rest, VIC",
  "Bendigo Livestock Exchange": "Huntly, VIC",
  "Camperdown Saleyards": "Camperdown, VIC",
  "Colac Saleyards": "Colac East, VIC",
  "Echuca Saleyards": "Echuca, VIC",
  "Leongatha Saleyards": "Koonwarra, VIC",
  "Mortlake Western Victorian Livestock Exchange": "Mortlake, VIC",
  "Pakenham Victorian Livestock Exchange": "Pakenham, VIC",
  "Sale Gippsland Regional Livestock Exchange": "Sale, VIC",
  "Shepparton Regional Saleyards": "Shepparton, VIC",
  "Swan Hill Saleyards": "Swan Hill, VIC",
  "Warrnambool Livestock Exchange": "Warrnambool, VIC",
  "Wodonga (Barnawartha) Northern Victoria Livestock Exchange": "Barnawartha North, VIC",
  "Yea Saleyards": "Yea, VIC",
  // SA
  "Dublin South Australian Livestock Exchange": "Dublin, SA",
  "Mount Compass Southern Livestock Exchange": "Mount Compass, SA",
  "Mount Gambier Saleyards": "Glenburnie, SA",
  "Naracoorte Saleyards": "Naracoorte, SA",
  // WA
  "Boyanup Saleyards": "Boyanup, WA",
  "Mount Barker Great Southern Regional Cattle Saleyards": "Mount Barker, WA",
  "Muchea Livestock Centre": "Muchea, WA",
  // TAS
  "Killafaddy Saleyards": "Killafaddy, TAS",
  "Powranna Saleyards": "Powranna, TAS",
  "Quoiba Saleyards": "Devonport, TAS",
};

// MARK: - MLA Category Mapping
// Old mapCategoryToMLACategory() DELETED - replaced by
// resolveMLACategory() in lib/data/weight-mapping.ts
// which uses weight-first lookup with master categories.

// MARK: - Resolve MLA CSV Saleyard Name

export function resolveMLASaleyardName(mlaCsvName: string): string {
  const fullName = mlaSaleyardNameMapping[mlaCsvName];
  if (fullName) return fullName;
  if ((saleyards as readonly string[]).includes(mlaCsvName)) return mlaCsvName;
  const lowered = mlaCsvName.toLowerCase();
  const match = Object.entries(mlaSaleyardNameMapping).find(
    ([key]) => key.toLowerCase() === lowered
  );
  if (match) return match[1];
  return mlaCsvName;
}

// MARK: - Reverse Saleyard Name Lookup

export function resolveShortSaleyardName(fullName: string): string | undefined {
  let shortest: string | undefined;
  for (const [key, value] of Object.entries(mlaSaleyardNameMapping)) {
    if (value === fullName) {
      if (!shortest || key.length < shortest.length) {
        shortest = key;
      }
    }
  }
  return shortest;
}

// MARK: - Physical Saleyard Short Names

export function getPhysicalSaleyardShortNames(): string[] {
  const shortNames: Record<string, string> = {};
  for (const [key, fullName] of Object.entries(mlaSaleyardNameMapping)) {
    if (!shortNames[fullName] || key.length < shortNames[fullName].length) {
      shortNames[fullName] = key;
    }
  }
  return saleyards
    .map((s) => shortNames[s])
    .filter((s): s is string => !!s)
    .sort();
}

// MARK: - Short Display Name for Saleyards

/** Strips suffixes and regional descriptors to get just the place name (e.g. "Mortlake Western Victorian Livestock Exchange" -> "Mortlake") */
export function shortSaleyardName(name: string): string {
  return name
    // Strip facility type suffixes first
    .replace(/ Livestock (Marketing Centre|Selling Centre|Exchange|Centre)$/i, "")
    .replace(/ Regional Livestock (Exchange|Market)$/i, "")
    .replace(/ Central [\w ]+ Livestock Exchange$/i, "")
    .replace(/ Livestock Exchange$/i, "")
    .replace(/ Saleyards?$/i, "")
    // Strip regional/directional descriptors that follow the place name
    .replace(/ (Western Victorian|Northern Victoria|South Eastern|South Australian|Great Southern|Gippsland|Victorian|Southern|Regional|Central|Tablelands|Dalrymple).*$/i, "")
    .trim();
}

// MARK: - MLA CSV Category Mapping
// Old mlaCsvCategoryMapping and resolveMLACsvCategory() DELETED - replaced by
// simplified version in lib/data/weight-mapping.ts (no longer uses sale prefix keying)

// MARK: - States

export const states = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;

// MARK: - Livestock Categories
// Old 16-category cattleCategoryGroups/cattleCategories DELETED.
// Replaced by cattleMasterCategories in lib/data/weight-mapping.ts.
// Sheep/pig/goat categories DELETED - not in the app currently.

export { cattleMasterCategories, categoriesForSpecies } from "./weight-mapping";

// MARK: - Price Sources

export const priceSources = [
  "Private Sales", "Saleyard", "Feedlot", "Processor", "Restocker",
];
