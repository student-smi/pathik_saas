-- ============================================================
-- Pathik SCO - Complete Database Reset & Seed Script
-- For Supabase PostgreSQL
-- July-August 2026 Bill Data from PDF
-- ============================================================
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → Paste & Run
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- STEP 1: DELETE everything EXCEPT admin user
-- ─────────────────────────────────────────────────────────────

DELETE FROM bill_entries;
DELETE FROM monthly_bills;
DELETE FROM calc_configs;
DELETE FROM residents;
DELETE FROM houses;
DELETE FROM societies;
DELETE FROM users WHERE role != 'ADMIN';


-- ─────────────────────────────────────────────────────────────
-- STEP 2: Create Society
-- ─────────────────────────────────────────────────────────────

INSERT INTO societies (id, name, address, city, "adminId", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'Pathik Society',
  'Sector 1',
  'Ahmedabad',
  id,
  true,
  NOW(),
  NOW()
FROM users
WHERE role = 'ADMIN'
LIMIT 1;


-- ─────────────────────────────────────────────────────────────
-- STEP 3: Create Houses (9 to 94 + 67/1, 68/2, 69/3)
-- ─────────────────────────────────────────────────────────────

INSERT INTO houses (id, "societyId", "houseNo", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  (SELECT id FROM societies WHERE name = 'Pathik Society' LIMIT 1),
  h."houseNo",
  true,
  NOW(),
  NOW()
FROM (VALUES
  ('9'),('10'),('11'),('12'),('13'),('14'),('15'),('16'),('17'),('18'),
  ('19'),('20'),('21'),('22'),('23'),('24'),('25'),('26'),('27'),('28'),
  ('29'),('30'),('31'),('32'),('33'),('34'),('35'),('36'),('37'),('38'),
  ('39'),('40'),('41'),('42'),('43'),('44'),('45'),('46'),('47'),('48'),
  ('49'),('50'),('51'),('52'),('53'),('54'),('55'),('56'),('57'),('58'),
  ('59'),('60'),('61'),('62'),('63'),('64'),('65'),('66'),('67'),('68'),
  ('69'),('70'),('71'),('72'),('73'),('74'),('75'),('76'),('77'),('78'),
  ('79'),('80'),('81'),('82'),('83'),('84'),('85'),('86'),('87'),('88'),
  ('89'),('90'),('91'),('92'),('93'),('94'),
  ('67/1'),('68/2'),('69/3')
) AS h("houseNo");


-- ─────────────────────────────────────────────────────────────
-- STEP 4: Create Resident Users
-- Email    = house{No}@pathiksco.com
-- Password = Resident@123
-- ─────────────────────────────────────────────────────────────

INSERT INTO users (id, email, "passwordHash", role, "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'house' || "houseNo" || '@pathiksco.com',
  '$2b$12$btk8oUNRR6VgKTVCOfQUfebzrhM0lg70pIZ4aJX2mhacddKRcQ4u2',
  'RESIDENT',
  true,
  NOW(),
  NOW()
FROM houses
WHERE "societyId" = (SELECT id FROM societies WHERE name = 'Pathik Society' LIMIT 1);


-- ─────────────────────────────────────────────────────────────
-- STEP 5: Create Residents (link users to houses)
-- ─────────────────────────────────────────────────────────────

INSERT INTO residents (id, name, phone, "houseId", "userId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'Resident House ' || h."houseNo",
  NULL,
  h.id,
  u.id,
  NOW(),
  NOW()
FROM houses h
JOIN users u ON u.email = 'house' || h."houseNo" || '@pathiksco.com'
WHERE h."societyId" = (SELECT id FROM societies WHERE name = 'Pathik Society' LIMIT 1);


-- ─────────────────────────────────────────────────────────────
-- STEP 6: Create Monthly Bill - July-August 2026
-- ─────────────────────────────────────────────────────────────

INSERT INTO monthly_bills (id, "societyId", year, month, status, notes, "publishedAt", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  (SELECT id FROM societies WHERE name = 'Pathik Society' LIMIT 1),
  2026,
  8,
  'PUBLISHED',
  'July - August 2026 Water Bill',
  NOW(),
  NOW(),
  NOW()
);


-- ─────────────────────────────────────────────────────────────
-- STEP 7: Insert All 66 Bill Entries (exact values from PDF)
-- ─────────────────────────────────────────────────────────────

WITH bill_data("houseNo", hv, av, unit, v, falo, total) AS (
  VALUES
  ('9',    2780::float,  1390::float, -1390::float, 600::float, -6950::float, -6350::float),
  ('10',    768::float,   666::float,   102::float, 600::float,   510::float,  1110::float),
  ('11',   4375::float,  4267::float,   108::float, 600::float,   540::float,  1140::float),
  ('12',   3973::float,  3879::float,    94::float, 600::float,   470::float,  1070::float),
  ('13',   1884::float,  1839::float,    45::float, 600::float,   225::float,   825::float),
  ('14',   4373::float,  4295::float,    78::float, 600::float,   390::float,   990::float),
  ('15',   2732::float,  2665::float,    67::float, 600::float,   335::float,   935::float),
  ('16',   5829::float,  5758::float,    71::float, 600::float,   355::float,   955::float),
  ('17',   1246::float,  1209::float,    37::float, 600::float,   185::float,   785::float),
  ('18',   1148::float,  1082::float,    66::float, 600::float,   330::float,   930::float),
  ('19',   4400::float,  4275::float,   125::float, 600::float,   625::float,  1225::float),
  ('20',    776::float,   686::float,    90::float, 600::float,   450::float,  1050::float),
  ('21',   2944::float,  2863::float,    81::float, 600::float,   405::float,  1005::float),
  ('22',   4205::float,  4076::float,   129::float, 600::float,   645::float,  1245::float),
  ('23',     83::float,    67::float,    16::float, 600::float,    80::float,   680::float),
  ('24',     73::float,    29::float,    44::float, 600::float,   220::float,   820::float),
  ('25',   2663::float,  2704::float,   -41::float, 600::float,  -205::float,   395::float),
  ('26',   2501::float,  2444::float,    57::float, 600::float,   285::float,   885::float),
  ('27',   1878::float,  1837::float,    41::float, 600::float,   205::float,   805::float),
  ('28',   1339::float,  1295::float,    44::float, 600::float,   220::float,   820::float),
  ('29',   1110::float,  1060::float,    50::float, 600::float,   250::float,   850::float),
  ('30',   4261::float,  4199::float,    62::float, 600::float,   310::float,   910::float),
  ('31',   3801::float,  3710::float,    91::float, 600::float,   455::float,  1055::float),
  ('32',   2446::float,  2437::float,     9::float, 600::float,    45::float,   645::float),
  ('33',   4022::float,  3936::float,    86::float, 600::float,   430::float,  1030::float),
  ('34',   4551::float,  4446::float,   105::float, 600::float,   525::float,  1125::float),
  ('35',    804::float,   774::float,    30::float, 600::float,   150::float,   750::float),
  ('36',   3094::float,  3094::float,     0::float, 600::float,     0::float,   600::float),
  ('37',   1562::float,  1480::float,    82::float, 600::float,   410::float,  1010::float),
  ('38',    248::float,   240::float,     8::float, 600::float,    40::float,   640::float),
  ('39',    257::float,   210::float,    47::float, 600::float,   235::float,   835::float),
  ('40',    667::float,   648::float,    19::float, 600::float,    95::float,   695::float),
  ('41',   1178::float,  1170::float,     8::float, 600::float,    40::float,   640::float),
  ('42',   2260::float,  2236::float,    24::float, 600::float,   120::float,   720::float),
  ('43',   2558::float,  2526::float,    32::float, 600::float,   160::float,   760::float),
  ('44',    850::float,   788::float,    62::float, 600::float,   310::float,   910::float),
  ('45',   2994::float,  2961::float,    33::float, 600::float,   165::float,   765::float),
  ('46',   5177::float,  5108::float,    69::float, 600::float,   345::float,   945::float),
  ('47',   1003::float,   953::float,    50::float, 600::float,   250::float,   850::float),
  ('48',    168::float,   126::float,    42::float, 600::float,   210::float,   810::float),
  ('49',   4291::float,  4151::float,   140::float, 600::float,   700::float,  1300::float),
  ('50',   1288::float,  1260::float,    28::float, 600::float,   140::float,   740::float),
  ('51',    523::float,   460::float,    63::float, 600::float,   315::float,   915::float),
  ('52',   4761::float,  4653::float,   108::float, 600::float,   540::float,  1140::float),
  ('53',   1190::float,  1093::float,    97::float, 600::float,   485::float,  1085::float),
  ('54',   2060::float,  2018::float,    42::float, 600::float,   210::float,   810::float),
  ('55',   2707::float,  2661::float,    46::float, 600::float,   230::float,   830::float),
  ('56',   4419::float,  4345::float,    74::float, 600::float,   370::float,   970::float),
  ('57',    636::float,   508::float,   128::float, 600::float,   640::float,  1240::float),
  ('58',    233::float,   144::float,    89::float, 600::float,   445::float,  1045::float),
  ('59',   4353::float,  4280::float,    73::float, 600::float,   365::float,   965::float),
  ('60',   5814::float,  5719::float,    95::float, 600::float,   475::float,  1075::float),
  ('61',   5793::float,  5720::float,    73::float, 600::float,   365::float,   965::float),
  ('62',   6197::float,  6294::float,   -97::float, 600::float,  -485::float,   115::float),
  ('63',   6675::float,  6587::float,    88::float, 600::float,   440::float,  1040::float),
  ('64',    360::float,   324::float,    36::float, 600::float,   180::float,   780::float),
  ('65',   4383::float,  4327::float,    56::float, 600::float,   280::float,   880::float),
  ('66',   1727::float,  1662::float,    65::float, 600::float,   325::float,   925::float),
  ('67',   2524::float,  1565::float,   959::float, 600::float,  4795::float,  5395::float),
  ('68',   1218::float,  1070::float,   148::float, 600::float,   740::float,  1340::float),
  ('69',     66::float,    43::float,    23::float, 600::float,   115::float,   715::float),
  ('70',   2120::float,  2069::float,    51::float, 600::float,   255::float,   855::float),
  ('71',    555::float,   518::float,    37::float, 600::float,   185::float,   785::float),
  ('72',    265::float,   208::float,    57::float, 600::float,   285::float,   885::float),
  ('73',   3614::float,  3560::float,    54::float, 600::float,   270::float,   870::float),
  ('74',   3938::float,  3861::float,    77::float, 600::float,   385::float,   985::float),
  ('75',   4215::float,  4167::float,    48::float, 600::float,   240::float,   840::float),
  ('76',   3672::float,  3628::float,    44::float, 600::float,   220::float,   820::float),
  ('77',   2490::float,  2458::float,    32::float, 600::float,   160::float,   760::float),
  ('78',     82::float,    46::float,    36::float, 600::float,   180::float,   780::float),
  ('79',   2338::float,  2255::float,    83::float, 600::float,   415::float,  1015::float),
  ('80',   3524::float,  3492::float,    32::float, 600::float,   160::float,   760::float),
  ('81',   2268::float,  2201::float,    67::float, 600::float,   335::float,   935::float),
  ('82',   2223::float,  2183::float,    40::float, 600::float,   200::float,   800::float),
  ('83',   4188::float,  4489::float,  -301::float, 600::float, -1505::float,  -905::float),
  ('84',   4784::float,  4724::float,    60::float, 600::float,   300::float,   900::float),
  ('85',   4209::float,  4174::float,    35::float, 600::float,   175::float,   775::float),
  ('86',    479::float,   394::float,    85::float, 600::float,   425::float,  1025::float),
  ('87',   3962::float,  3905::float,    57::float, 600::float,   285::float,   885::float),
  ('88',   6171::float,  6098::float,    73::float, 600::float,   365::float,   965::float),
  ('89',   2618::float,  2588::float,    30::float, 600::float,   150::float,   750::float),
  ('90',   2539::float,  2459::float,    80::float, 600::float,   400::float,  1000::float),
  ('91',   4763::float,  4672::float,    91::float, 600::float,   455::float,  1055::float),
  ('92',   3454::float,  3384::float,    70::float, 600::float,   350::float,   950::float),
  ('93',     83::float,    79::float,     4::float, 600::float,    20::float,   620::float),
  ('94',    336::float,   334::float,     2::float, 600::float,    10::float,   610::float),
  ('67/1',  215::float,   128::float,    87::float, 600::float,   435::float,  1035::float),
  ('68/2', 1928::float,  1852::float,    76::float, 600::float,   380::float,   980::float),
  ('69/3', 1963::float,  1895::float,    68::float, 600::float,   340::float,   940::float)
),
society AS (
  SELECT id FROM societies WHERE name = 'Pathik Society' LIMIT 1
),
bill AS (
  SELECT id FROM monthly_bills
  WHERE "societyId" = (SELECT id FROM society)
    AND year = 2026 AND month = 8
  LIMIT 1
)
INSERT INTO bill_entries (
  id, "monthlyBillId", "houseId",
  hv, av, unit, v, falo, total,
  "isNegative", "hvAutoFilled", "isManualHv",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  (SELECT id FROM bill),
  h.id,
  bd.hv, bd.av, bd.unit, bd.v, bd.falo, bd.total,
  (bd.unit < 0),
  false,
  true,
  NOW(),
  NOW()
FROM bill_data bd
JOIN houses h ON h."houseNo" = bd."houseNo"
  AND h."societyId" = (SELECT id FROM society);


-- ─────────────────────────────────────────────────────────────
-- VERIFICATION
-- ─────────────────────────────────────────────────────────────

SELECT 'users'         AS table_name, COUNT(*) AS count FROM users;
SELECT 'societies'     AS table_name, COUNT(*) AS count FROM societies;
SELECT 'houses'        AS table_name, COUNT(*) AS count FROM houses;
SELECT 'residents'     AS table_name, COUNT(*) AS count FROM residents;
SELECT 'monthly_bills' AS table_name, COUNT(*) AS count FROM monthly_bills;
SELECT 'bill_entries'  AS table_name, COUNT(*) AS count FROM bill_entries;

-- Grand total check — PDF bottom row = 74810
SELECT SUM(total) AS grand_total_should_be_74810
FROM bill_entries be
JOIN monthly_bills mb ON be."monthlyBillId" = mb.id
WHERE mb.year = 2026 AND mb.month = 8;
