import type { Dataset } from '../types';

/** 入門課程用的「小商店」資料庫（仿 w3schools 範例資料庫的結構，資料為自建）。 */
export const shop: Dataset = {
  id: 'shop',
  name: '小商店資料庫',
  description: '顧客、商品、分類、供應商、員工、貨運商與訂單。入門課程全部使用這份資料。',
  schemaSql: `
CREATE TABLE categories (
  category_id   INTEGER PRIMARY KEY,
  category_name VARCHAR(50) NOT NULL,
  description   VARCHAR(200)
);
CREATE TABLE suppliers (
  supplier_id   INTEGER PRIMARY KEY,
  supplier_name VARCHAR(80) NOT NULL,
  contact_name  VARCHAR(80),
  city          VARCHAR(50),
  country       VARCHAR(50),
  phone         VARCHAR(30)
);
CREATE TABLE products (
  product_id   INTEGER PRIMARY KEY,
  product_name VARCHAR(80) NOT NULL,
  supplier_id  INTEGER REFERENCES suppliers(supplier_id),
  category_id  INTEGER REFERENCES categories(category_id),
  unit         VARCHAR(50),
  price        NUMERIC(10,2)
);
CREATE TABLE customers (
  customer_id   INTEGER PRIMARY KEY,
  customer_name VARCHAR(80) NOT NULL,
  contact_name  VARCHAR(80),
  address       VARCHAR(120),
  city          VARCHAR(50),
  postal_code   VARCHAR(20),
  country       VARCHAR(50)
);
CREATE TABLE employees (
  employee_id INTEGER PRIMARY KEY,
  last_name   VARCHAR(50) NOT NULL,
  first_name  VARCHAR(50) NOT NULL,
  title       VARCHAR(50),
  birth_date  DATE,
  hire_date   DATE,
  salary      NUMERIC(10,2),
  manager_id  INTEGER REFERENCES employees(employee_id)
);
CREATE TABLE shippers (
  shipper_id   INTEGER PRIMARY KEY,
  shipper_name VARCHAR(50) NOT NULL,
  phone        VARCHAR(30)
);
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(customer_id),
  employee_id INTEGER REFERENCES employees(employee_id),
  order_date  DATE NOT NULL,
  shipper_id  INTEGER REFERENCES shippers(shipper_id)
);
CREATE TABLE order_details (
  order_detail_id INTEGER PRIMARY KEY,
  order_id        INTEGER REFERENCES orders(order_id),
  product_id      INTEGER REFERENCES products(product_id),
  quantity        INTEGER NOT NULL
);
`,
  seedSql: `
INSERT INTO categories VALUES
 (1, 'Beverages',   'Coffee, tea, juice and soft drinks'),
 (2, 'Condiments',  'Sauces, spreads and seasonings'),
 (3, 'Snacks',      'Cookies, chips and candy'),
 (4, 'Dairy',       'Milk, cheese and yogurt'),
 (5, 'Grains',      'Bread, rice and noodles'),
 (6, 'Seafood',     NULL),
 (7, 'Bakery',      'Bread and pastries (coming soon)');

INSERT INTO suppliers VALUES
 (1, 'Formosa Tea Co.',     'Lin Mei',      'Taipei',    'Taiwan',  '02-2345-6789'),
 (2, 'Nordic Dairy AB',     'Erik Holm',    'Stockholm', 'Sweden',  '08-555-0101'),
 (3, 'Sunny Snacks Inc.',   'Amy Brooks',   'Chicago',   'USA',     '312-555-0144'),
 (4, 'Kyoto Pantry',        'Sato Ken',     'Kyoto',     'Japan',   '075-555-0199'),
 (5, 'Ocean Harvest Ltd.',  'Jack Turner',  'Sydney',    'Australia', NULL),
 (6, 'Andes Grains S.A.',   'Lucia Vargas', 'Lima',      'Peru',    '01-555-0123');

INSERT INTO products VALUES
 (1,  'Oolong Tea',        1, 1, '20 bags',        12.50),
 (2,  'Bubble Milk Tea',   1, 1, '6 bottles',      18.00),
 (3,  'Cold Brew Coffee',  3, 1, '12 cans',        24.00),
 (4,  'Soy Sauce',         4, 2, '500 ml bottle',   6.80),
 (5,  'Chili Oil',         1, 2, '200 g jar',       9.90),
 (6,  'Miso Paste',        4, 2, '1 kg box',       15.00),
 (7,  'Potato Chips',      3, 3, '10 bags',        11.00),
 (8,  'Chocolate Cookies', 3, 3, '24 pieces',      14.50),
 (9,  'Pineapple Cake',    1, 3, '12 pieces',      22.00),
 (10, 'Greek Yogurt',      2, 4, '6 cups',          8.40),
 (11, 'Aged Cheddar',      2, 4, '500 g',          27.00),
 (12, 'Fresh Milk',        2, 4, '1 liter',         3.20),
 (13, 'Jasmine Rice',      6, 5, '5 kg bag',       19.00),
 (14, 'Udon Noodles',      4, 5, '5 packs',         7.50),
 (15, 'Smoked Salmon',     5, 6, '200 g',          31.00),
 (16, 'Dried Squid',       5, 6, '100 g',          NULL);

INSERT INTO customers VALUES
 (1,  'Alpine Market',       'Hans Weber',    'Bahnhofstr. 12',     'Berlin',    '10115', 'Germany'),
 (2,  'Casa Lupita',         'Lupita Ruiz',   'Av. Reforma 222',    'Mexico City','06600', 'Mexico'),
 (3,  'Taco Fiesta',         'Diego Flores',  'Calle 5 de Mayo 9',  'Mexico City','06000', 'Mexico'),
 (4,  'Thames Grocers',      'Oliver Smith',  '120 Baker St.',      'London',    'NW1 6XE', 'UK'),
 (5,  'Nordlys Mat',         'Ingrid Larsen', 'Storgata 8',         'Oslo',      '0155',  'Norway'),
 (6,  'Rhein Feinkost',      'Anna Schulz',   'Hafenstr. 3',        'Mannheim',  '68159', 'Germany'),
 (7,  'Le Petit Panier',     'Claire Martin', '24 rue Kleber',      'Strasbourg','67000', 'France'),
 (8,  'Mercado Sol',         'Pablo Garcia',  'Calle Mayor 67',     'Madrid',    '28013', 'Spain'),
 (9,  'Bon Gout',            'Louis Bernard', '12 rue du Port',     'Marseille', '13002', 'France'),
 (10, 'Maple Leaf Foods',    'Emma Wilson',   '23 King St.',        'Toronto',   'M5H 1A1', 'Canada'),
 (11, 'Brew & Bean',         'Sophie Taylor', '8 Fleet St.',        'London',    'EC4Y 1AA', 'UK'),
 (12, 'Pampa Provisions',    'Mateo Silva',   'Florida 333',        'Buenos Aires','C1005', 'Argentina'),
 (13, 'Sakura Deli',         'Yuki Tanaka',   '1-2-3 Shibuya',      'Tokyo',     '150-0002', 'Japan'),
 (14, 'Swiss Corner',        'Luca Meier',    'Marktgasse 29',      'Bern',      '3011',  'Switzerland'),
 (15, 'Taipei Tea House',    NULL,            'Xinyi Rd. 100',      'Taipei',    NULL,    'Taiwan');

INSERT INTO employees VALUES
 (1, 'Wang',   'David',  'CEO',              '1975-03-14', '2015-01-05', 9800.00, NULL),
 (2, 'Lee',    'Grace',  'Sales Manager',    '1982-07-22', '2016-04-11', 7200.00, 1),
 (3, 'Chen',   'Kevin',  'Sales Rep',        '1990-11-02', '2018-09-03', 4800.00, 2),
 (4, 'Huang',  'Iris',   'Sales Rep',        '1993-01-30', '2019-02-18', 4600.00, 2),
 (5, 'Lin',    'Tony',   'Sales Rep',        '1988-05-17', '2020-06-01', 5000.00, 2),
 (6, 'Chang',  'Wendy',  'Operations Manager','1980-09-09', '2016-08-22', 7000.00, 1),
 (7, 'Wu',     'Sam',    'Warehouse Staff',  '1995-12-25', '2021-03-15', 3600.00, 6),
 (8, 'Tsai',   'Nina',   'Intern',           '2001-04-04', '2024-07-01', NULL,    6);

INSERT INTO shippers VALUES
 (1, 'Speedy Express', '02-5555-1111'),
 (2, 'United Package', '02-5555-2222'),
 (3, 'Federal Cargo',  NULL);

INSERT INTO orders VALUES
 (1001, 1,  3, '2024-01-03', 1),
 (1002, 2,  4, '2024-01-05', 2),
 (1003, 4,  3, '2024-01-12', 1),
 (1004, 1,  5, '2024-01-20', 3),
 (1005, 7,  4, '2024-02-02', 2),
 (1006, 11, 3, '2024-02-08', 1),
 (1007, 3,  5, '2024-02-14', 2),
 (1008, 9,  3, '2024-02-21', 1),
 (1009, 4,  4, '2024-03-01', 3),
 (1010, 13, 5, '2024-03-05', 1),
 (1011, 2,  3, '2024-03-11', 2),
 (1012, 6,  2, '2024-03-18', 1),
 (1013, 10, 4, '2024-03-25', 3),
 (1014, 1,  3, '2024-04-02', 1),
 (1015, 8,  5, '2024-04-09', 2),
 (1016, 11, 4, '2024-04-15', 1),
 (1017, 14, 3, '2024-04-22', NULL),
 (1018, 4,  5, '2024-05-03', 2),
 (1019, 7,  3, '2024-05-10', 1),
 (1020, 13, 4, '2024-05-17', 3);

INSERT INTO order_details VALUES
 (1,  1001, 1,  10), (2,  1001, 7,  5),
 (3,  1002, 4,  20), (4,  1002, 13, 3),
 (5,  1003, 2,  12), (6,  1003, 8,  6), (7, 1003, 11, 2),
 (8,  1004, 3,  4),
 (9,  1005, 9,  8),  (10, 1005, 12, 30),
 (11, 1006, 1,  15), (12, 1006, 3,  10),
 (13, 1007, 5,  7),  (14, 1007, 14, 9),
 (15, 1008, 10, 18), (16, 1008, 15, 2),
 (17, 1009, 6,  5),  (18, 1009, 7,  12),
 (19, 1010, 2,  20), (20, 1010, 9,  10), (21, 1010, 1, 6),
 (22, 1011, 13, 4),
 (23, 1012, 11, 3),  (24, 1012, 12, 24),
 (25, 1013, 8,  9),  (26, 1013, 4,  6),
 (27, 1014, 15, 5),  (28, 1014, 2,  8),
 (29, 1015, 14, 16),
 (30, 1016, 3,  6),  (31, 1016, 10, 10),
 (32, 1017, 6,  4),  (33, 1017, 5,  3),
 (34, 1018, 1,  25),
 (35, 1019, 7,  14), (36, 1019, 9,  4),
 (37, 1020, 2,  10), (38, 1020, 11, 1);
`,
  hiddenExtraSql: `
INSERT INTO categories VALUES (8, 'Frozen', 'Frozen dumplings and ice cream'), (9, 'Pet Food', NULL);
INSERT INTO suppliers VALUES (7, 'Harbor Frozen Foods', 'Mia Ho', 'Kaohsiung', 'Taiwan', '07-555-0177');
INSERT INTO products VALUES
 (101, 'Pork Dumplings',   7, 8, '30 pieces', 16.00),
 (102, 'Mango Ice Cream',  7, 8, '1 liter',   12.50),
 (103, 'Matcha Latte',     1, 1, '6 bottles', 21.00);
INSERT INTO customers VALUES
 (101, 'Kaohsiung Mart',   'Ben Hsu',   'Zhongzheng Rd. 5', 'Kaohsiung', '800', 'Taiwan'),
 (102, 'Golden Gate Goods','Ava Brown', '50 Market St.',    'San Francisco', '94105', 'USA'),
 (103, 'Quiet Customer',   NULL,        NULL,               'Berlin',    NULL,  'Germany'),
 (104, 'Highland Teas',    'Fiona Reid','5 Royal Mile',     'Edinburgh', 'EH1 1RE', 'UK');
INSERT INTO employees VALUES (9, 'Kuo', 'Leo', 'Sales Rep', '1997-08-08', '2023-01-09', 4500.00, 2);
INSERT INTO orders VALUES
 (2001, 101, 9, '2024-05-20', 1),
 (2002, 102, 9, '2024-06-02', 2),
 (2003, 101, 3, '2024-06-11', 1),
 (2004, 15,  4, '2024-06-15', 2);
INSERT INTO order_details VALUES
 (101, 2001, 101, 40), (102, 2001, 1, 5),
 (103, 2002, 103, 12), (104, 2002, 102, 7),
 (105, 2003, 101, 22),
 (106, 2004, 9, 3);
`,
};
