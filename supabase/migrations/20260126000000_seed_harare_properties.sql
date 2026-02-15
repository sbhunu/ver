-- Seed Harare properties for development and demo
-- All properties are within Harare metropolitan area
-- Coordinates: Harare CBD and suburbs (EPSG:4326, lon/lat order)

INSERT INTO ver_properties (
  id,
  property_no,
  address,
  owner_name,
  geom,
  status,
  registration_date,
  metadata,
  created_at,
  updated_at
) VALUES
-- Harare CBD (Central Business District)
(
  gen_random_uuid(),
  'HRB-2024-001',
  '123 Jason Moyo Avenue, Harare CBD',
  'Tendai Chikwanha',
  ST_SetSRID(ST_GeomFromText('POLYGON((31.048 -17.828, 31.049 -17.828, 31.049 -17.829, 31.048 -17.829, 31.048 -17.828))'), 4326),
  'active',
  '2022-03-15',
  '{"district": "CBD", "ward": "1", "zone": "commercial"}'::jsonb,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'HRB-2024-002',
  '45 Sam Nujoma Street, Harare CBD',
  'Zimbabwe Land Registry Trust',
  ST_SetSRID(ST_GeomFromText('POLYGON((31.047 -17.827, 31.048 -17.827, 31.048 -17.828, 31.047 -17.828, 31.047 -17.827))'), 4326),
  'active',
  '2021-08-22',
  '{"district": "CBD", "ward": "1", "zone": "commercial"}'::jsonb,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'HRB-2024-003',
  '78 First Street, Harare CBD',
  'Mambo Properties (Pvt) Ltd',
  ST_SetSRID(ST_GeomFromText('POLYGON((31.049 -17.829, 31.050 -17.829, 31.050 -17.830, 31.049 -17.830, 31.049 -17.829))'), 4326),
  'active',
  '2023-01-10',
  '{"district": "CBD", "ward": "2", "zone": "commercial"}'::jsonb,
  NOW(),
  NOW()
),
-- Avondale
(
  gen_random_uuid(),
  'HRB-2024-004',
  '12 Borrowdale Road, Avondale',
  'Sarah Moyo',
  ST_SetSRID(ST_GeomFromText('POLYGON((31.042 -17.792, 31.043 -17.792, 31.043 -17.793, 31.042 -17.793, 31.042 -17.792))'), 4326),
  'active',
  '2020-05-18',
  '{"district": "Avondale", "ward": "18", "zone": "residential"}'::jsonb,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'HRB-2024-005',
  '56 Fife Avenue, Avondale',
  'Chiedza Kambanje',
  ST_SetSRID(ST_GeomFromText('POLYGON((31.041 -17.791, 31.042 -17.791, 31.042 -17.792, 31.041 -17.792, 31.041 -17.791))'), 4326),
  'active',
  '2019-11-30',
  '{"district": "Avondale", "ward": "18", "zone": "residential"}'::jsonb,
  NOW(),
  NOW()
),
-- Borrowdale
(
  gen_random_uuid(),
  'HRB-2024-006',
  '23 Enterprise Road, Borrowdale',
  'Borrowdale Holdings Ltd',
  ST_SetSRID(ST_GeomFromText('POLYGON((31.072 -17.774, 31.073 -17.774, 31.073 -17.775, 31.072 -17.775, 31.072 -17.774))'), 4326),
  'active',
  '2022-07-14',
  '{"district": "Borrowdale", "ward": "22", "zone": "commercial"}'::jsonb,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'HRB-2024-007',
  '8 Hampstead Road, Borrowdale Brooke',
  'Robert Ncube',
  ST_SetSRID(ST_GeomFromText('POLYGON((31.068 -17.768, 31.069 -17.768, 31.069 -17.769, 31.068 -17.769, 31.068 -17.768))'), 4326),
  'active',
  '2021-04-20',
  '{"district": "Borrowdale", "ward": "22", "zone": "residential"}'::jsonb,
  NOW(),
  NOW()
),
-- Mbare
(
  gen_random_uuid(),
  'HRB-2024-008',
  '34 Machipisa Road, Mbare',
  'Mbare Housing Cooperative',
  ST_SetSRID(ST_GeomFromText('POLYGON((31.018 -17.837, 31.019 -17.837, 31.019 -17.838, 31.018 -17.838, 31.018 -17.837))'), 4326),
  'active',
  '2018-09-05',
  '{"district": "Mbare", "ward": "6", "zone": "residential"}'::jsonb,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'HRB-2024-009',
  '15 Mukuvisi Road, Mbare',
  'Stadium Close Residents Association',
  ST_SetSRID(ST_GeomFromText('POLYGON((31.017 -17.835, 31.018 -17.835, 31.018 -17.836, 31.017 -17.836, 31.017 -17.835))'), 4326),
  'active',
  '2017-12-12',
  '{"district": "Mbare", "ward": "6", "zone": "residential"}'::jsonb,
  NOW(),
  NOW()
),
-- Mount Pleasant
(
  gen_random_uuid(),
  'HRB-2024-010',
  '67 Mount Pleasant Drive, Mount Pleasant',
  'Patience Dube',
  ST_SetSRID(ST_GeomFromText('POLYGON((31.075 -17.783, 31.076 -17.783, 31.076 -17.784, 31.075 -17.784, 31.075 -17.783))'), 4326),
  'active',
  '2023-06-01',
  '{"district": "Mount Pleasant", "ward": "20", "zone": "residential"}'::jsonb,
  NOW(),
  NOW()
),
-- Highlands
(
  gen_random_uuid(),
  'HRB-2024-011',
  '22 Enterprise Road, Highlands',
  'Highlands Estate (Pvt) Ltd',
  ST_SetSRID(ST_GeomFromText('POLYGON((31.065 -17.808, 31.066 -17.808, 31.066 -17.809, 31.065 -17.809, 31.065 -17.808))'), 4326),
  'active',
  '2020-02-28',
  '{"district": "Highlands", "ward": "16", "zone": "residential"}'::jsonb,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'HRB-2024-012',
  '5 Sandringham Drive, Highlands',
  'Farai Mutasa',
  ST_SetSRID(ST_GeomFromText('POLYGON((31.064 -17.807, 31.065 -17.807, 31.065 -17.808, 31.064 -17.808, 31.064 -17.807))'), 4326),
  'active',
  '2019-07-15',
  '{"district": "Highlands", "ward": "16", "zone": "residential"}'::jsonb,
  NOW(),
  NOW()
),
-- Hatfield
(
  gen_random_uuid(),
  'HRB-2024-013',
  '89 Mazoe Road, Hatfield',
  'Hatfield Properties',
  ST_SetSRID(ST_GeomFromText('POLYGON((31.038 -17.802, 31.039 -17.802, 31.039 -17.803, 31.038 -17.803, 31.038 -17.802))'), 4326),
  'active',
  '2022-11-20',
  '{"district": "Hatfield", "ward": "14", "zone": "mixed"}'::jsonb,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'HRB-2024-014',
  '41 Central Avenue, Hatfield',
  'Emmanuel Phiri',
  ST_SetSRID(ST_GeomFromText('POLYGON((31.037 -17.801, 31.038 -17.801, 31.038 -17.802, 31.037 -17.802, 31.037 -17.801))'), 4326),
  'active',
  '2021-01-08',
  '{"district": "Hatfield", "ward": "14", "zone": "residential"}'::jsonb,
  NOW(),
  NOW()
),
-- Greendale
(
  gen_random_uuid(),
  'HRB-2024-015',
  '18 Lytton Road, Greendale',
  'Greendale Gardens (Pvt) Ltd',
  ST_SetSRID(ST_GeomFromText('POLYGON((31.055 -17.818, 31.056 -17.818, 31.056 -17.819, 31.055 -17.819, 31.055 -17.818))'), 4326),
  'active',
  '2020-10-25',
  '{"district": "Greendale", "ward": "12", "zone": "residential"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (property_no) DO NOTHING;

-- Note: If property_no is not unique, remove the ON CONFLICT clause.
-- Check schema: ver_properties has UNIQUE on property_no.
COMMENT ON TABLE ver_properties IS 'Property registry; seed data includes Harare CBD and suburbs';
