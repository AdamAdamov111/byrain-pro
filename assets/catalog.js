/* Каталог BYRAIN PRO. Цены, картинки и id продуктов взяты с byrain.ru
   (Medusa Store API, публичный ключ). Строки карточек, описания и INCI
   утверждены владельцем бренда. Файл сгенерирован из src/db/catalog-snapshot.ts. */
/* Фотографии скачаны с byrain.ru и лежат рядом со страницей:
   внешние изображения блокируются в Claude Artifacts. */
const IMG = "assets/img/";

const CATALOG = [
  {
    sku: "A190525-1",
    slug: "absolute-youth-face-cream",
    medusaHandle: "absolute-youth-face-cream",
    name: "Крем для лица",
    collection: "Абсолютная молодость",
    activesLine: "8 пептидов + фитоэстрогены + пептидные факторы роста",
    effectLine:
      "Комплексное омоложение в период предменопаузы, менопаузы: морщины и заломы, дряблость, нечёткий овал, пигментация, тусклый тон",
    description:
      "Мультипептидный антивозрастной крем с фитоэстрогенами и пептидными факторами роста для кожи в период пре-, пери- и постменопаузы. Повышает плотность и упругость, разглаживает морщины и заломы, поддерживает чёткость овала, выравнивает тон.",
    volume: "50 мл",
    rrp: 27000,
    images: [`${IMG}absolute-youth-face-cream.jpg`],
    inci:
      "Aqua (Water), Glycerin, Pentylene Glycol, Copper Tripeptide-1, Palmitoyl Tetrapeptide-7, Palmitoyl Tripeptide-1, Oligopeptide-68, Hexapeptide-11, Oligopeptide-1, Oligopeptide-2, Oligopeptide-3, Trifolium Pratense (Clover) Flower Extract, Chenopodium Quinoa Seed Extract, Salvia Sclarea (Clary) Extract, Albizia Julibrissin Bark Extract, Undaria Pinnatifida Extract, Bacillus/Soybean Ferment Extract, Sigesbeckia Orientalis Extract, Glyceryl Stearate, Simmondsia Chinensis (Jojoba) Seed Oil, Butyrospermum Parkii (Shea) Butter, Olus Oil (Vegetable Oil), Jojoba Esters, Coco-Caprylate/Caprate, Cetearyl Alcohol, Microcrystalline Cellulose, Butylene Glycol, Helianthus Annuus (Sunflower) Seed Wax, Polyglyceryl-6 Laurate, Polyglyceryl-10 Oleate, Dimethicone, Hydrogenated Vegetable Oil, Sodium Stearoyl Glutamate, Cellulose Gum, Soy Isoflavones, Glycosphingolipids, Acetyl Glutamine, Acetyl Cysteine, Lecithin, Hydrogenated Lecithin, Tocopherol, Glycine Soja (Soybean) Oil, Acacia Decurrens Flower Wax, Candelilla Cera, Sorbitan Palmitate, Steareth-20, Polyglycerin-3, Xanthan Gum, Sodium Phytate, Citric Acid, Sodium Citrate, Sodium Hyaluronate, Folic Acid, Chrysin, Biotin, Caprylyl Glycol, Phenoxyethanol, Chlorphenesin, Ethylhexylglycerin, Parfum (Fragrance), o-Cymen-5-ol, 1,2-Hexanediol, N-Hydroxysuccinimide, Chlorhexidine Digluconate, Sodium Benzoate, Potassium Sorbate, Sodium Oleate, Disodium EDTA",
    sortOrder: 1,
  },
  {
    sku: "A190525-2",
    slug: "absolute-youth-eye-cream",
    medusaHandle: "absolute-youth-eye-cream",
    name: "Крем для век",
    collection: "Абсолютная молодость",
    activesLine: "8 пептидов + фитоэстрогены + пептидные факторы роста",
    effectLine:
      "Комплексное омоложение век в период менопаузы: морщины, гусиные лапки, отёки, тёмные круги, нависание века, пигментация",
    description:
      "Мультипептидный антивозрастной крем для век с фитоэстрогенами и пептидными факторами роста для коррекции возрастных изменений кожи вокруг глаз в пери- и постменопаузе. Повышает плотность и тонус, смягчает морщины, уменьшает отёчность и тёмные круги.",
    volume: "15 мл",
    rrp: 20000,
    images: [`${IMG}absolute-youth-eye-cream.jpg`],
    inci:
      "Aqua (Water), Glycerin, Butylene Glycol, Trifolium Pratense (Clover) Flower Extract, Copper Tripeptide-1, Dipeptide-2, Oligopeptide-68, Palmitoyl Tetrapeptide-7, Hexapeptide-11, Oligopeptide-1, Oligopeptide-2, Oligopeptide-3, Sodium Hyaluronate, Chenopodium Quinoa Seed Extract, Undaria Pinnatifida Extract, Bacillus/Soybean Ferment Extract, Hesperidin Methyl Chalcone, Acetyl Glutamine, Folic Acid, Biotin, Cetearyl Alcohol, Glyceryl Stearate, Jojoba Esters, Coco-Caprylate/Caprate, Simmondsia Chinensis (Jojoba) Seed Oil, Olus Oil (Vegetable Oil), Butyrospermum Parkii (Shea) Butter, Microcrystalline Cellulose, Helianthus Annuus (Sunflower) Seed Wax, Sodium Stearoyl Glutamate, Dimethicone, Xanthan Gum, Cellulose Gum, Hydrogenated Vegetable Oil, Lecithin, Candelilla Cera, Acacia Decurrens Flower Wax, Hydrogenated Lecithin, Glycine Soja (Soybean) Oil, Tocopherol, Citric Acid, Sodium Citrate, Sodium Phytate, Steareth-20, Polyglycerin-3, Chlorphenesin, o-Cymen-5-ol, Phenoxyethanol, Chlorhexidine Digluconate, 1,2-Hexanediol, Caprylyl Glycol, Potassium Sorbate, Sodium Oleate, Disodium EDTA, CI 19140",
    sortOrder: 2,
  },
  {
    sku: "A190525-10",
    slug: "radiance-filler-mask",
    medusaHandle: "radiance-filler-mask",
    name: "Пептидная филлер-маска для лица",
    collection: "Абсолютная молодость",
    activesLine: "Пептид-миорелаксант SYN-AKE + Matrixyl 3000 + кофеин + женьшень + AHA-кислоты",
    effectLine: "Мгновенное преображение: сияние, разглаживание мимических морщин, отёчность, цвет лица, упругость",
    description:
      "Мультипептидная несмываемая крем-маска мгновенного преображения. Сглаживает мимические и глубокие морщины, повышает плотность и эластичность, подтягивает контуры, выравнивает рельеф и тон. Используется в кабинетных протоколах под альгинатной маской и с микротоками.",
    volume: "50 мл",
    rrp: 28000,
    images: [`${IMG}radiance-filler-mask.jpg`],
    inci:
      "Aqua (Water), Glycerin, Pentylene Glycol, Caffeine, Dipeptide Diaminobutyroyl Benzylamide Diacetate, Palmitoyl Tripeptide-5, Palmitoyl Tripeptide-1, Palmitoyl Tetrapeptide-7, Panax Ginseng Root Extract, Urea, Sodium Lactate, Glycolic Acid, Malic Acid, Tartaric Acid, N-Hydroxysuccinimide, Chrysin, Biotin, Simmondsia Chinensis (Jojoba) Seed Oil, Butyrospermum Parkii (Shea) Butter, Olus Oil (Vegetable Oil), Jojoba Esters, Boron Nitride, Coco-Caprylate/Caprate, Cetearyl Alcohol, Glyceryl Stearate, Microcrystalline Cellulose, Helianthus Annuus (Sunflower) Seed Wax, Hydrogenated Vegetable Oil, Dimethicone, Propanediol, Cellulose Gum, Xanthan Gum, Sodium Stearoyl Glutamate, Lecithin, Candelilla Cera, Acacia Decurrens Flower Wax, Glycine Soja (Soybean) Oil, Tocopherol, Sucrose, Menthyl Lactate, Citric Acid, Sodium Citrate, Sodium Phytate, Steareth-20, Polyglycerin-3, Chlorphenesin, o-Cymen-5-ol, Chlorhexidine Digluconate, Potassium Sorbate, Sodium Benzoate, CI 77891 (Titanium Dioxide), Parfum (Fragrance), Alcohol",
    sortOrder: 3,
  },
  {
    sku: "A190525-12",
    slug: "transformation-face-cream",
    medusaHandle: "transformation-face-cream",
    name: "Пептидный крем для лица",
    collection: "Трансформация №1",
    activesLine: "Пептид-миорелаксант SYN-AKE + Matrixyl 3000 + Palmitoyl Tripeptide-5 + экстракт женьшеня + церамидный комплекс",
    effectLine: "Коррекция мимических морщин: лоб, межбровье, носогубные складки, заломы, потеря плотности и объёма",
    description:
      "Мультипептидный крем для коррекции мимических морщин с эффектом ботокса, восстановления плотности и упругости кожи. Разглаживает мимические морщины и глубокие заломы, повышает тургор, восстанавливает объём и чёткость овала, укрепляет липидный барьер.",
    volume: "50 мл",
    rrp: 25000,
    images: [`${IMG}transformation-face-cream.jpg`],
    inci:
      "Aqua (Water), Glycerin, Pentylene Glycol, Dipeptide Diaminobutyroyl Benzylamide Diacetate, Palmitoyl Tripeptide-5, Palmitoyl Tripeptide-1, Palmitoyl Tetrapeptide-7, Ceramide NP, Ceramide AP, Ceramide EOP, Phytosphingosine, Cholesterol, Panax Ginseng Root Extract, Squalane, Squalene, Simmondsia Chinensis (Jojoba) Seed Oil, Butyrospermum Parkii (Shea) Butter, Olus Oil (Vegetable Oil), Jojoba Esters, Helianthus Annuus (Sunflower) Seed Wax, Glycine Soja (Soybean) Oil, Hydrogenated Vegetable Oil, Beta-Sitosterol, Tocopherol, Biotin, N-Hydroxysuccinimide, Chrysin, Microcrystalline Cellulose, Glyceryl Stearate, Cetearyl Alcohol, Dimethicone, Sodium Stearoyl Glutamate, Cellulose Gum, Polyglyceryl-10 Stearate, Xanthan Gum, Candelilla Cera, Acacia Decurrens Flower Wax, Polyglyceryl-6 Behenate, Behenic Acid, Lecithin, Polyglycerin-3, Steareth-20, Citric Acid, Sodium Citrate, Sodium Phytate, Triethyl Citrate, Sodium Cetearyl Sulfate, Sodium Levulinate, Chlorphenesin, o-Cymen-5-ol, Chlorhexidine Digluconate, Potassium Sorbate, Sodium Benzoate, CI 77891 (Titanium Dioxide), Parfum (Fragrance)",
    sortOrder: 4,
  },
  {
    sku: "A190525-7",
    slug: "transformation-eye-cream",
    medusaHandle: "transformation-eye-cream",
    name: "Пептидный крем для век",
    collection: "Трансформация №1",
    activesLine: "Пептид-миорелаксант SYN-AKE + Matrixyl 3000 + Dipeptide-2 + церамидный комплекс",
    effectLine: "Комплексное омоложение век: мимические морщины, отёки, мешки, тёмные круги",
    description:
      "Мультипептидный крем для век с ботокс-подобным действием. Разглаживает мимические морщины и гусиные лапки, повышает плотность и тонус кожи век, уменьшает отёчность и тёмные круги, восстанавливает липидный барьер.",
    volume: "15 мл",
    rrp: 18000,
    images: [`${IMG}transformation-eye-cream.jpg`],
    inci:
      "Aqua (Water), Glycerin, Pentylene Glycol, Dipeptide Diaminobutyroyl Benzylamide Diacetate, Dipeptide-2, Palmitoyl Tripeptide-5, Palmitoyl Tetrapeptide-7, Palmitoyl Tripeptide-1, Ceramide NP, Ceramide AP, Ceramide EOP, Phytosphingosine, Cholesterol, Sodium Hyaluronate, Biotin, Hesperidin Methyl Chalcone, Albizia Julibrissin Bark Extract, Sigesbeckia Orientalis Extract, Dunaliella Salina Extract, Chrysin, Panthenol, Pantolactone, Glyceryl Stearate, Cetearyl Alcohol, Simmondsia Chinensis (Jojoba) Seed Oil, Butyrospermum Parkii (Shea) Butter, Olus Oil (Vegetable Oil), Jojoba Esters, Coco-Caprylate/Caprate, Dimethicone, Microcrystalline Cellulose, Helianthus Annuus (Sunflower) Seed Wax, Glycine Soja (Soybean) Oil Unsaponifiables, Glycine Soja (Soybean) Oil, Hydrogenated Vegetable Oil, Sodium Stearoyl Glutamate, Cellulose Gum, Polyglyceryl-10 Stearate, Xanthan Gum, Steareth-20, Candelilla Cera, Acacia Decurrens Flower Wax, Polyglyceryl-6 Behenate, Polyglycerin-3, Behenic Acid, Citric Acid, Sodium Citrate, Sodium Phytate, Triethyl Citrate, Sodium Cetearyl Sulfate, N-Hydroxysuccinimide, Ethylhexylglycerin, Sodium Levulinate, Chlorhexidine Digluconate, Chlorphenesin, Phenoxyethanol, Potassium Sorbate, Sodium Benzoate, o-Cymen-5-ol, CI 19140",
    sortOrder: 5,
  },
  {
    sku: "A190525-3",
    slug: "retinol-cream",
    medusaHandle: "retinol-cream",
    name: "Крем с ретинолом 1%",
    collection: "Сияние и обновление",
    activesLine: "Retinol CB 50 + церамидный комплекс + аллантоин + витамин E",
    effectLine: "Золотой стандарт омоложения, сияние, фарфоровая кожа: глубокие морщины, дряблость, поры, пигментация, текстура",
    description:
      "Концентрированный крем с липосомальным ретинолом 1%. Смягчает глубокие и возрастные морщины, улучшает плотность и тонус, выравнивает текстуру и рельеф, осветляет пигментацию. Церамидный комплекс и аллантоин снимают раздражение.",
    volume: "50 мл",
    rrp: 18000,
    images: [`${IMG}retinol-cream.jpg`],
    inci:
      "Aqua (Water), Glycerin, Glyceryl Stearate, Retinol, Ceramide NP, Ceramide AP, Ceramide EOP, Cholesterol, Phytosphingosine, Chenopodium Quinoa Seed Extract, Allantoin, Tocopherol, Simmondsia Chinensis (Jojoba) Seed Oil, Butyrospermum Parkii (Shea) Butter, Panthenol, Pentylene Glycol, Olus Oil (Vegetable Oil), Jojoba Esters, Glycine Soja (Soybean) Oil, Coco-Caprylate/Caprate, Cetearyl Alcohol, Microcrystalline Cellulose, Helianthus Annuus (Sunflower) Seed Wax, Dimethicone, Hydrogenated Vegetable Oil, Sodium Stearoyl Glutamate, Undecane, Cellulose Gum, Beta-Sitosterol, Chlorphenesin, Polyglyceryl-10 Stearate, Parfum (Fragrance), Xanthan Gum, Tridecane, Candelilla Cera, Squalene, Sodium Phytate, Triethyl Citrate, o-Cymen-5-ol, Polyglycerin-3, Polyglyceryl-6 Behenate, Acacia Decurrens Flower Wax, Behenic Acid, Sodium Levulinate, Potassium Sorbate, Sodium Cetearyl Sulfate, CI 19140, Citric Acid",
    sortOrder: 6,
  },
  {
    sku: "A190525-5",
    slug: "vitamin-c-cream",
    medusaHandle: "vitamin-c-cream",
    name: "Крем с витамином C 10%",
    collection: "Сияние и обновление",
    activesLine: "Витамин C 10% в двух стабильных формах + изофлавоны сои + сквален + церамидный комплекс",
    effectLine: "Осветление, сияние, фарфоровая кожа: пигментация, постакне, тусклый тон, упругость, фотостарение",
    description:
      "Крем с витамином C 10% в стабильных формах для осветления пигментации, выравнивания тона, повышения плотности и упругости. Разглаживает морщины и микрорельеф, возвращает коже сияние и ровный тон.",
    volume: "50 мл",
    rrp: 18000,
    images: [`${IMG}vitamin-c-cream.jpg`],
    inci:
      "Aqua (Water), Glycerin, Sodium Ascorbyl Phosphate, Ascorbyl Glucoside, Copper Tripeptide-1, Ceramide NP, Ceramide AP, Ceramide EOP, Squalane, Squalene, Macadamia Integrifolia Seed Oil, Soy Isoflavones, Bisabolol, Lepidium Sativum Sprout Extract, Beta-Sitosterol, Phytosphingosine, Cholesterol, Behenic Acid, Glycine Soja (Soybean) Oil, Tocopherol, Dimethicone, Olus Oil (Vegetable Oil), Cera Alba (Beeswax), Glyceryl Stearate SE, Microcrystalline Cellulose, Cellulose Gum, Polyglyceryl-10 Stearate, Polyglyceryl-6 Behenate, Pentylene Glycol, Xanthan Gum, Polysorbate 80, Lecithin, Sodium Phytate, Triethyl Citrate, Cetearyl Alcohol, Glyceryl Stearate, Citric Acid, Sodium Levulinate, Potassium Sorbate, Caprylyl Glycol, Ethylhexylglycerin, Chlorphenesin, Phenoxyethanol, o-Cymen-5-ol, Alcohol, Sodium Cetearyl Sulfate, Parfum (Fragrance)",
    sortOrder: 7,
  },
  {
    sku: "A190525-6",
    slug: "multi-acid-serum",
    medusaHandle: "multi-acid-serum",
    name: "Мультикислотная сыворотка 10%",
    collection: "Сияние и обновление",
    activesLine: "Молочная + миндальная + янтарная + фитиновая кислоты + гиалуронат натрия",
    effectLine: "Мягкое обновление, сияние, фарфоровая кожа: тусклый тон, пигментация, постакне, расширенные поры, неровная текстура",
    description:
      "Профессиональная сыворотка с комплексом кислот 10% для выравнивания рельефа и тона, коррекции пигментации, сужения пор и возвращения сияния. Основа протокола «Фарфоровая кожа» в паре с кремом с витамином C.",
    volume: "30 мл",
    rrp: 12000,
    images: [`${IMG}multi-acid-serum.jpg`],
    inci:
      "Aqua (Water), Panthenol, Lactic Acid, Mandelic Acid, Succinic Acid, Phytic Acid, Sodium Hyaluronate, Tasmannia Lanceolata Leaf Extract, Glycerin, Biosaccharide Gum-1, Acacia Senegal Gum, Sodium Phytate, Xanthan Gum, Sodium Hydroxide, Phenoxyethanol, Chlorphenesin",
    sortOrder: 8,
  },
];

