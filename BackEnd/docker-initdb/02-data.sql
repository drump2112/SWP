--
-- PostgreSQL database dump
--

\restrict Ea9ho1glZ2uTCAVuin7htbg5EXnigLyFPhmda0xXVddDwRjBAMcGHRvG26hzvAY

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg13+1)
-- Dumped by pg_dump version 15.15 (Debian 15.15-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: regions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.regions (id, name) FROM stdin;
1	Khu Vực 1
2	Khu Vực 2
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, code, name) FROM stdin;
1	ADMIN	Admin
2	DIRECTOR	Giám đốc
3	SALES	Phòng kinh doanh
4	ACCOUNTING	Phòng kế toán
5	STORE	Cửa hàng
\.


--
-- Data for Name: stores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stores (id, code, name, region_id, is_active, address, phone) FROM stdin;
1	CH81	Cửa Hàng Xăng Dầu 81	1	t	Bắc Ninh	0975478916
2	CH10	Cửa Hàng Xăng Dầu Số 10	2	t	Thái Nguyên 	0943696816
3	CH11	Cửa Hàng Xăng Dầu số 11	1	t	Hà Nội 	0911123412
4	CH79	Cửa Hàng 79	2	t	Nghệ An	0983145203
5	CH371	Cửa Hàng 371	2	t	Nghệ An 	0988655700
6	Ch372	Cửa Hàng 372	2	t	Nghệ An 	0969899767
7	CH373	Cửa Hàng 373	2	t	Nghệ An 	0989501779
8	CH374	Cửa Hàng 374	2	t	Nghệ An 	0849528694
9	CH375	Cửa Hàng 375	2	t	Nghệ An	0382952426
10	CH376	Cửa Hàng 376	2	t	Nghệ An 	0946162257
11	CH 378	Cửa Hàng 378	2	t	Nghệ An	0918603777
14	CHMH	Cửa Hàng Mỹ Hà 	1	t	Bắc Giang	0918273645
15	CHSK	Cửa Hàng Song Khê	1	t	Bắc Giang	0948536965
16	CH98	Cửa hàng 98	1	t	Bắc Giang	0335613623
13	CH100	Cửa Hàng 100	2	t	Nghệ An 	086531532
12	CH379	Cửa Hàng 379	2	t	Nghệ An	0396782854
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password_hash, full_name, role_id, store_id, is_active, created_at) FROM stdin;
1	admin	$2b$10$ut6jSmhyLaPp0rsEgmzXt.lm.28tTn8E20o/dhpFi/mKlSL2YPBRm	Administrator	1	\N	t	2026-01-01 15:28:14.236209
5	ch10	$2b$10$UaKaGNx8MH57lpudce9M5e0O0wgkbjnUN1oApvIYXhd.No1FDDawe	HTT	5	2	t	2026-01-02 15:42:27.402355
6	ch11	$2b$10$xev.vAwfgzcTu57K2q1OXOPgPfQYqyFmpsdKHM5p.xWM7ulWFVKhm	ch11	5	3	t	2026-01-03 07:36:38.844602
4	ch81	$2b$10$86ZgJkgc3Izm63iLC6FpxeJXuSk3mUySDXJPQsnmY0bmHbAaQber.	Tây Nam 81	5	1	t	2026-01-01 18:01:34.674572
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, table_name, record_id, action, old_data, new_data, changed_by, changed_at) FROM stdin;
25	shifts	28	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-07T11:37:00.000Z"}	\N	2026-01-07 11:37:23.997483
26	shifts	28	REOPEN	{"status": "CLOSED", "version": 1, "closedAt": "2026-01-07T11:37:00.000Z"}	{"note": "Dữ liệu cũ được đánh dấu superseded, giữ nguyên timestamp", "status": "OPEN", "version": 2, "closedAt": null}	\N	2026-01-07 11:38:34.404949
27	shifts	28	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-07T11:39:00.000Z"}	\N	2026-01-07 11:39:17.486142
28	shifts	30	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-07T15:30:00.000Z"}	\N	2026-01-07 15:30:02.892461
29	shifts	30	REOPEN	{"status": "CLOSED", "closedAt": "2026-01-07T15:30:00.000Z"}	{"note": "Dữ liệu cũ được đánh dấu superseded, giữ nguyên timestamp", "status": "OPEN", "closedAt": null}	\N	2026-01-07 15:36:44.820402
30	shifts	31	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-07T16:10:00.000Z"}	\N	2026-01-07 16:10:49.861099
31	shifts	31	REOPEN	{"status": "CLOSED", "closedAt": "2026-01-07T16:10:00.000Z"}	{"note": "Dữ liệu cũ được đánh dấu superseded, giữ nguyên timestamp", "status": "OPEN", "closedAt": null}	\N	2026-01-07 16:11:18.131895
32	shifts	31	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-07T16:16:00.000Z"}	\N	2026-01-07 16:16:36.232522
33	shifts	32	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-11T16:59:00.000Z"}	\N	2026-01-11 11:01:05.474792
34	shifts	33	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-12T16:50:00.000Z"}	\N	2026-01-11 11:04:24.506001
35	shifts	34	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-11T13:20:00.000Z"}	\N	2026-01-11 13:20:57.396787
36	shifts	35	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-12T13:23:00.000Z"}	\N	2026-01-11 13:23:10.672845
37	shifts	37	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-11T16:13:00.000Z"}	\N	2026-01-11 16:14:02.943276
38	shifts	38	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-12T16:18:00.000Z"}	\N	2026-01-11 16:18:07.884222
39	shifts	39	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-11T16:37:00.000Z"}	\N	2026-01-11 16:37:49.872868
40	shifts	40	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-12T16:39:00.000Z"}	\N	2026-01-11 16:39:13.534195
41	shifts	41	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-11T16:51:00.000Z"}	\N	2026-01-11 16:51:18.620584
42	shifts	42	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-12T16:53:00.000Z"}	\N	2026-01-11 16:53:15.805675
43	shifts	43	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-12T16:59:00.000Z"}	\N	2026-01-11 17:01:54.274295
44	shifts	45	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-11T17:28:00.000Z"}	\N	2026-01-11 17:28:31.286601
45	shifts	46	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-12T17:30:00.000Z"}	\N	2026-01-11 17:30:19.433947
46	shifts	46	CLOSE	{"status": "OPEN", "closedAt": "2026-01-12T17:30:00.000Z"}	{"status": "CLOSED", "closedAt": "2026-01-12T18:05:00.000Z"}	\N	2026-01-11 18:05:56.677617
47	shifts	47	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-11T18:22:00.000Z"}	\N	2026-01-11 18:22:18.138278
48	shifts	48	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-12T18:23:00.000Z"}	\N	2026-01-11 18:23:32.153719
49	shifts	48	CLOSE	{"status": "OPEN", "closedAt": "2026-01-12T18:23:00.000Z"}	{"status": "CLOSED", "closedAt": "2026-01-12T18:24:00.000Z"}	\N	2026-01-11 18:24:32.325707
50	shifts	48	CLOSE	{"status": "OPEN", "closedAt": "2026-01-12T18:24:00.000Z"}	{"status": "CLOSED", "closedAt": "2026-01-13T10:58:00.000Z"}	\N	2026-01-12 10:58:11.249991
51	shifts	49	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-12T15:14:00.000Z"}	\N	2026-01-12 11:10:42.697199
52	shifts	50	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-13T11:11:00.000Z"}	\N	2026-01-12 11:11:49.816509
53	shifts	50	CLOSE	{"status": "OPEN", "closedAt": "2026-01-13T11:11:00.000Z"}	{"status": "CLOSED", "closedAt": "2026-01-13T11:13:00.000Z"}	\N	2026-01-12 11:13:17.494414
54	shifts	51	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-12T11:52:00.000Z"}	\N	2026-01-12 11:53:01.415756
55	shifts	52	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-13T11:54:00.000Z"}	\N	2026-01-12 11:54:22.996311
56	shifts	52	CLOSE	{"status": "OPEN", "closedAt": "2026-01-13T11:54:00.000Z"}	{"status": "CLOSED", "closedAt": "2026-01-13T11:55:00.000Z"}	\N	2026-01-12 11:55:27.398832
57	shifts	52	CLOSE	{"status": "OPEN", "closedAt": "2026-01-13T11:55:00.000Z"}	{"status": "CLOSED", "closedAt": "2026-01-13T15:27:00.000Z"}	\N	2026-01-12 15:27:51.315539
58	shifts	54	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-12T15:57:00.000Z"}	\N	2026-01-12 15:57:33.162742
59	shifts	55	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-13T15:59:00.000Z"}	\N	2026-01-12 15:59:29.049159
60	shifts	55	CLOSE	{"status": "OPEN", "closedAt": "2026-01-13T15:59:00.000Z"}	{"status": "CLOSED", "closedAt": "2026-01-13T16:00:00.000Z"}	\N	2026-01-12 16:00:48.330554
61	shifts	56	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-13T14:56:00.000Z"}	\N	2026-01-13 02:56:23.438312
62	shifts	57	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-14T02:59:00.000Z"}	\N	2026-01-13 02:59:33.862051
63	shifts	57	CLOSE	{"status": "OPEN", "closedAt": "2026-01-14T02:59:00.000Z"}	{"status": "CLOSED", "closedAt": "2026-01-14T15:03:00.000Z"}	\N	2026-01-13 03:03:30.051702
64	shifts	58	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-13T07:06:00.000Z"}	\N	2026-01-13 07:06:35.060709
65	shifts	58	CLOSE	{"status": "OPEN", "closedAt": "2026-01-13T07:06:00.000Z"}	{"status": "CLOSED", "closedAt": "2026-01-13T07:26:00.000Z"}	\N	2026-01-13 07:26:10.814685
\.


--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bank_accounts (id, "accountNumber", "bankName", "accountName", description, is_company_account, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: bank_ledger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bank_ledger (id, bank_account_id, store_id, ref_type, ref_id, bank_in, bank_out, notes, created_at) FROM stdin;
\.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shifts (id, store_id, shift_date, shift_no, opened_at, closed_at, status, version, adjusted_from_shift_id, is_active) FROM stdin;
58	1	2026-01-13	1	2026-01-13 01:44:00	2026-01-13 14:26:00	CLOSED	1	\N	t
59	1	2026-01-14	1	2026-01-14 02:36:00	\N	OPEN	1	\N	t
\.


--
-- Data for Name: cash_deposits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cash_deposits (id, store_id, shift_id, amount, deposit_date, deposit_time, receiver_name, notes, created_by, created_at, payment_method) FROM stdin;
85	1	58	10574400.00	2026-01-13	\N	Công ty SWP	Nộp tiền Ca #1	\N	2026-01-13 07:26:10.814685	CASH
\.


--
-- Data for Name: cash_ledger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cash_ledger (id, store_id, ref_type, ref_id, cash_in, cash_out, created_at, superseded_by_shift_id, shift_id) FROM stdin;
172	1	SHIFT_CLOSE	58	10574400.00	0.00	2026-01-13 07:26:10.814685	\N	58
173	1	DEPOSIT	85	0.00	10574400.00	2026-01-13 07:26:10.814685	\N	58
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (id, code, name, tax_code, address, phone, credit_limit, notes, type) FROM stdin;
1	KH001	CÔNG TY TNHH O SUNG RF VINA	2301035391	Lô CN1-1, Khu công nghiệp Quế Võ 3, Phường Quế Võ, Tỉnh Bắc Ninh, Việt Nam	\N	\N	\N	EXTERNAL
2	KH0002	CÔNG TY TNHH TUẤN MẠNH MD	2301101703	Thôn Mộ Đạo, Phường Bồng Lai, Tỉnh Bắc Ninh, Việt Nam	\N	\N	\N	EXTERNAL
24	KH00002	abc	\N	1232131	031225666	\N	\N	INTERNAL
25	KH00003	zxc	\N	zzzz	0915856356	\N	\N	INTERNAL
\.


--
-- Data for Name: customer_stores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_stores (customer_id, store_id, credit_limit) FROM stdin;
24	1	\N
25	16	\N
1	1	10000000.00
2	1	\N
\.


--
-- Data for Name: debt_ledger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.debt_ledger (id, customer_id, store_id, ref_type, ref_id, debit, credit, created_at, notes, superseded_by_shift_id, shift_id) FROM stdin;
66	2	1	OPENING_BALANCE	\N	5000000.00	0.00	2025-12-31 07:00:00	Số dư đầu kỳ công nợ	\N	\N
64	1	1	OPENING_BALANCE	\N	10000000.00	0.00	2025-12-31 07:00:00	Số dư đầu kỳ công nợ	\N	\N
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expense_categories (id, code, name, description, is_active, created_at, updated_at) FROM stdin;
1	642	Chi phí quản lý doanh nghiệp	Chi phí quản lý DN theo TT200	t	2026-01-03 14:51:37.34881	2026-01-03 14:51:37.34881
2	641	Chi phí bán hàng	Chi phí phát sinh trong quá trình tiêu thụ sản phẩm	t	2026-01-03 14:51:37.34881	2026-01-03 14:51:37.34881
3	627	Chi phí dịch vụ mua ngoài	Chi phí dịch vụ thuê ngoài	t	2026-01-03 14:51:37.34881	2026-01-03 14:51:37.34881
4	811	Chi phí khác	Các khoản chi phí khác	t	2026-01-03 14:51:37.34881	2026-01-03 14:51:37.34881
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expenses (id, store_id, shift_id, expense_category_id, amount, description, expense_date, created_by, created_at, payment_method) FROM stdin;
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.warehouses (id, type, store_id) FROM stdin;
1	STORE	1
2	STORE	15
\.


--
-- Data for Name: inventory_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_documents (id, warehouse_id, doc_type, doc_date, ref_shift_id, status, supplier_name, invoice_number, license_plate) FROM stdin;
55	1	EXPORT	2026-01-13	58	\N	Xuất bán ca #1	\N	\N
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, code, name, unit, is_fuel) FROM stdin;
2	RON95	Xăng RON 95	Lít	t
3	DO05	Dầu Diesel 0,05%S	Lít	t
6	D0001	Dầu Diesel 0,001%S	Lít	t
\.


--
-- Data for Name: tanks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tanks (id, store_id, tank_code, name, capacity, product_id, is_active, created_at, updated_at, current_stock) FROM stdin;
6	3	B01	Bồn 1 Xăng 95	23000.000	2	t	2026-01-03 07:37:23.762617	2026-01-04 14:18:13.944998	0.000
7	3	B02	Bể Dầu 05 	12000.000	3	t	2026-01-03 07:38:12.189685	2026-01-04 14:18:13.944998	0.000
4	2	B01	Bể Xăng Ron 95 số 1	10000.000	2	t	2026-01-02 15:43:25.920698	2026-01-05 03:52:26.727697	0.000
5	2	B02	Bể Dầu 05 Số 2	10000.000	3	t	2026-01-02 15:43:59.141073	2026-01-05 03:52:26.727697	0.000
3	1	B03	Bể Dầu 05 Số 3	25000.000	3	t	2026-01-02 05:12:37.203953	2026-01-05 06:16:54.885452	0.000
1	1	B01	Bể Xăng 95 Số 1	25000.000	2	t	2026-01-02 05:02:28.482246	2026-01-05 06:16:54.885452	0.000
2	1	B02	Bể Xăng 95 Số 2	25000.000	2	t	2026-01-02 05:12:07.082635	2026-01-05 06:16:54.885452	0.000
\.


--
-- Data for Name: inventory_document_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_document_items (id, document_id, product_id, quantity, unit_price, tank_id) FROM stdin;
100	55	3	240.000	17060.00	\N
101	55	2	360.000	18000.00	\N
\.


--
-- Data for Name: inventory_ledger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_ledger (id, warehouse_id, product_id, ref_type, ref_id, quantity_in, quantity_out, created_at, tank_id, superseded_by_shift_id, shift_id) FROM stdin;
101	1	3	ADJUSTMENT	\N	10400.000	0.000	2026-01-01 00:00:00.410999	\N	\N	\N
102	1	2	ADJUSTMENT	\N	11000.000	0.000	2026-01-01 00:00:00.410999	\N	\N	\N
169	1	3	EXPORT	55	0.000	240.000	2026-01-13 07:26:10.814685	\N	\N	58
170	1	2	EXPORT	55	0.000	360.000	2026-01-13 07:26:10.814685	\N	\N	58
\.


--
-- Data for Name: inventory_loss_calculations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_loss_calculations (id, document_id, expansion_coefficient, loss_coefficient, total_truck_volume, total_actual_volume, total_received_volume, total_loss_volume, allowed_loss_volume, excess_shortage_volume, temperature_adjustment_volume, notes, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_truck_compartments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_truck_compartments (id, document_id, product_id, compartment_number, compartment_height, truck_temperature, truck_volume, warehouse_height, actual_temperature, actual_volume, received_volume, loss_volume, height_loss_truck, height_loss_warehouse, created_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permissions (id, code, description) FROM stdin;
\.


--
-- Data for Name: product_prices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_prices (id, product_id, region_id, price, valid_from, valid_to, created_at) FROM stdin;
9	2	1	18000.00	2025-12-31 07:00:00	\N	2026-01-13 06:45:36.922334
10	3	1	17060.00	2025-12-31 07:00:00	\N	2026-01-13 06:45:36.932985
11	2	2	17250.00	2025-12-31 07:00:00	\N	2026-01-13 06:46:02.822235
12	3	2	17150.00	2025-12-31 07:00:00	\N	2026-01-13 06:46:02.831641
\.


--
-- Data for Name: pumps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pumps (id, store_id, tank_id, pump_code, name, product_id, is_active, created_at, updated_at) FROM stdin;
1	1	3	V1	Máy 1	3	t	2026-01-02 05:13:54.291295	2026-01-02 05:14:40.626427
2	1	3	V2	Máy 2	3	t	2026-01-02 05:14:55.038101	2026-01-02 05:14:55.038101
3	1	1	V3	Máy 3	2	t	2026-01-02 05:17:18.678144	2026-01-02 05:17:31.434435
5	1	2	V5	Máy 5	2	t	2026-01-02 05:18:18.402463	2026-01-02 05:18:18.402463
4	1	2	V4	Máy 4	2	t	2026-01-02 05:17:48.04214	2026-01-02 05:18:22.764609
6	2	4	V01	Máy 1	2	t	2026-01-02 15:44:36.837906	2026-01-02 15:44:36.837906
7	2	5	V02	Máy 2	3	t	2026-01-02 15:45:00.527855	2026-01-02 15:45:00.527855
8	3	6	V01	Máy 1	2	t	2026-01-03 09:32:11.007318	2026-01-03 09:32:11.007318
9	3	7	V02	Máy 2	3	t	2026-01-03 09:32:34.546058	2026-01-03 09:32:34.546058
\.


--
-- Data for Name: pump_readings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pump_readings (id, shift_id, pump_code, product_id, start_value, end_value, quantity, pump_id, unit_price, test_export) FROM stdin;
336	58	V1	3	0.000	120.000	120.000	\N	17060.00	0.000
337	58	V2	3	0.000	120.000	120.000	\N	17060.00	0.000
338	58	V3	2	0.000	120.000	120.000	\N	18000.00	0.000
339	58	V4	2	0.000	120.000	120.000	\N	18000.00	0.000
340	58	V5	2	0.000	120.000	120.000	\N	18000.00	0.000
\.


--
-- Data for Name: receipts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.receipts (id, store_id, shift_id, receipt_type, amount, created_at, payment_method) FROM stdin;
\.


--
-- Data for Name: receipt_details; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.receipt_details (id, receipt_id, customer_id, amount) FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permissions (role_id, permission_id) FROM stdin;
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sales (id, shift_id, store_id, product_id, quantity, unit_price, amount, customer_id, payment_method) FROM stdin;
364	58	1	3	120.000	17060.00	2047200.00	\N	CASH
365	58	1	3	120.000	17060.00	2047200.00	\N	CASH
366	58	1	2	120.000	18000.00	2160000.00	\N	CASH
367	58	1	2	120.000	18000.00	2160000.00	\N	CASH
368	58	1	2	120.000	18000.00	2160000.00	\N	CASH
\.


--
-- Data for Name: shift_adjustments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shift_adjustments (id, shift_id, adjustment_type, reason, created_by, approved_by, created_at) FROM stdin;
\.


--
-- Data for Name: shift_debt_sales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shift_debt_sales (id, shift_id, customer_id, product_id, quantity, unit_price, amount, notes, created_at) FROM stdin;
\.


--
-- Data for Name: user_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_tokens (id, user_id, expires_at, created_at, is_revoked) FROM stdin;
9e54dcc5-aac2-4f31-9805-d8e351ecac6a	1	2026-01-14 22:30:12.392	2026-01-07 15:30:12.392919	f
cbc08db2-a531-43b1-89db-8d2d4551a193	4	2026-01-14 23:01:34.044	2026-01-07 16:01:34.055474	f
e4b9f35c-4b9a-4f6f-a0ae-520f70b04767	1	2026-01-13 16:55:38.358	2026-01-06 09:55:38.363994	f
87e30ab4-af70-4713-bfd7-8ff5bcf4f468	1	2026-01-13 16:55:38.362	2026-01-06 09:55:38.369223	f
2e702a8f-99f3-4f9b-9acc-ceb4df44ac9c	4	2026-01-14 23:01:34.048	2026-01-07 16:01:34.055905	f
cba3ed4e-b006-45ea-adad-1593e61083c3	4	2026-01-14 23:01:34.05	2026-01-07 16:01:34.056182	f
116663c3-f114-4282-84a7-2c490f184986	4	2026-01-14 23:01:34.058	2026-01-07 16:01:34.066391	f
f201da91-5a6b-4fb6-9298-87b60304bb69	1	2026-01-12 12:44:29.096	2026-01-05 05:44:29.101329	f
b86b2308-cc88-4577-bbed-27799a0dbdcc	1	2026-01-12 12:44:29.103	2026-01-05 05:44:29.10628	f
7ef6a128-1415-41c2-b8d7-9ae7a6fc6ad3	4	2026-01-14 23:01:34.053	2026-01-07 16:01:34.066687	f
1dabf13c-3717-49d7-925e-e647060abd75	1	2026-01-14 23:05:04.061	2026-01-07 16:05:04.064055	f
24beeaf0-bf57-46c7-8f1c-682492da58f6	4	2026-01-13 18:03:36.161	2026-01-06 11:03:36.162607	f
0659535c-67ef-4da7-855d-3e92da27ec61	4	2026-01-15 13:11:39.338	2026-01-08 06:11:39.34657	f
8f12c1a8-5a29-4b99-a8dc-fb7457d28235	1	2026-01-15 14:20:09.02	2026-01-08 07:20:09.025903	f
20f859dc-0658-475e-b54a-033977cff316	1	2026-01-15 14:57:27.364	2026-01-08 07:57:27.368596	f
2e47c1c9-597f-40bf-bdf1-ebea2e2f4a1a	4	2026-01-12 15:30:09.156	2026-01-05 08:30:09.158119	f
cab25bf7-2873-410d-847a-e9fade14b2bf	4	2026-01-12 15:30:09.163	2026-01-05 08:30:09.165227	f
9cf786cb-6e27-4c58-be96-80841cd5f210	4	2026-01-12 15:30:09.166	2026-01-05 08:30:09.17083	f
ce2ff149-714b-4bdb-bcf8-978249aaa327	1	2026-01-15 16:01:12.163	2026-01-08 09:01:12.166782	f
7c2127a8-df31-43bd-804a-0a98b94c2692	4	2026-01-12 15:30:10.213	2026-01-05 08:30:10.216731	f
17b0f910-360d-40dd-911d-d39299fee134	1	2026-01-15 16:01:12.167	2026-01-08 09:01:12.170456	f
b529ebc2-0bfb-4803-9fec-4475bc8e8cb5	1	2026-01-15 16:01:12.168	2026-01-08 09:01:12.170602	f
f7711c63-11cf-4c29-99c8-8b8f99dcda5b	6	2026-01-12 16:22:23.515	2026-01-05 09:22:23.517081	f
206e7145-e612-4733-8b73-34a0587060c7	1	2026-01-15 16:01:12.173	2026-01-08 09:01:12.176703	f
91c260de-7e92-4f3e-ad07-52ec9ebb12ba	1	2026-01-15 16:01:12.177	2026-01-08 09:01:12.18153	f
81b39de9-b9aa-4b76-a534-8a56513900cb	1	2026-01-18 17:47:50.47	2026-01-11 10:47:50.477056	f
f9419472-4edd-4519-9881-3d8f9dafc527	1	2026-01-18 17:47:50.474	2026-01-11 10:47:50.4784	f
9036d18a-607c-40ad-a2eb-935ada7864bd	1	2026-01-18 17:47:50.472	2026-01-11 10:47:50.477197	f
c11ccd1b-82fc-4a05-a075-8ca2487a3918	1	2026-01-18 17:47:50.476	2026-01-11 10:47:50.47847	f
fd6f7195-fe09-4ef0-957f-9eb795d845b7	1	2026-01-18 17:47:50.473	2026-01-11 10:47:50.481328	f
f3372edd-4f86-4d0e-b239-e7cf348abbfb	1	2026-01-14 09:59:55.884	2026-01-07 02:59:55.891172	f
dcf10dce-8d84-44ea-8fea-a854b8abbc3e	1	2026-01-14 10:32:35.13	2026-01-07 03:32:35.13494	f
f3c962b4-ae83-4cd5-a2d5-d158d72d5b71	4	2026-01-18 17:54:23.572	2026-01-11 10:54:23.573712	f
ee821f1d-44fe-4778-b5eb-ce9f7a086f27	4	2026-01-12 17:42:27.493	2026-01-05 10:42:27.496747	f
2f100b73-4833-4b1b-b256-9740a65504e6	1	2026-01-18 17:55:17.362	2026-01-11 10:55:17.365498	f
89136f18-f46d-4ed2-a30a-7a7f8adc8ac3	1	2026-01-13 00:52:50.304	2026-01-05 17:52:50.306191	f
bdd33cb9-345d-41f9-b9e1-1d8951012721	1	2026-01-13 00:52:52.796	2026-01-05 17:52:52.798059	f
02b1395a-43f8-4a5b-8d2d-b31857add7fe	1	2026-01-18 17:55:17.364	2026-01-11 10:55:17.365607	f
26d3103f-35b9-42df-a86e-46c14fd6e914	1	2026-01-18 17:55:17.368	2026-01-11 10:55:17.369643	f
ced9014a-5d08-4e33-b5eb-935f87b64455	1	2026-01-14 14:50:54.461	2026-01-07 07:50:54.468528	f
d97664d7-b502-442d-a381-b6152598ae7a	1	2026-01-18 17:55:17.365	2026-01-11 10:55:17.369162	f
095dd883-ea25-4e6c-8bf6-266c38d57098	1	2026-01-14 14:50:55.579	2026-01-07 07:50:55.580435	f
41ecd550-7e44-443e-916d-5fe5a7377151	4	2026-01-13 11:44:07.592	2026-01-06 04:44:07.595677	f
645911c6-32af-4516-9ecc-f444234ebdd5	1	2026-01-14 14:50:55.577	2026-01-07 07:50:55.580595	f
c2d009fb-5919-4adf-9167-eb16de931f99	1	2026-01-13 13:22:49.133	2026-01-06 06:22:49.142394	f
4f04c7d1-2cf8-40b7-84af-9a28e9cd3402	1	2026-01-18 18:53:58.035	2026-01-11 11:53:58.037416	f
f69c0dca-e607-478d-a25e-3bb9931aca37	1	2026-01-18 22:24:13.103	2026-01-11 15:24:13.104949	f
7259f789-28e3-4f99-aeab-f731b49402ea	4	2026-01-14 17:07:48.417	2026-01-07 10:07:48.420699	f
0859bf82-2a88-45d8-9356-ae7e7d6501f3	1	2026-01-13 15:20:30.509	2026-01-06 08:20:30.511533	f
b3e2207f-ca2f-4df7-b1be-40f984c343fe	4	2026-01-14 17:07:48.413	2026-01-07 10:07:48.420965	f
d0658192-fa9c-4486-a723-0d2b39575272	4	2026-01-18 22:31:20.368	2026-01-11 15:31:20.369465	f
84c35ca2-4a33-493b-bd3c-a4c15885152b	4	2026-01-14 17:13:47.22	2026-01-07 10:13:47.221727	f
e20cd643-6398-4c31-b1a2-34fc298037bc	1	2026-01-14 17:52:24.396	2026-01-07 10:52:24.400529	f
fa3f9a77-c24b-43f2-8c7f-86efe9f9e8d8	1	2026-01-14 17:52:24.398	2026-01-07 10:52:24.402905	f
e4e96660-6c2e-46d4-8429-893475ff2348	1	2026-01-14 17:52:24.399	2026-01-07 10:52:24.403033	f
9287b067-9604-4ce8-9aa0-5505e7cf6d18	1	2026-01-14 17:52:24.401	2026-01-07 10:52:24.403683	f
09f377e0-1aeb-430d-afb7-282aab97c61b	1	2026-01-14 17:52:24.406	2026-01-07 10:52:24.410505	f
1e6a1268-cdbb-4fda-9ca3-8e6ddc84a400	4	2026-01-14 18:20:05.943	2026-01-07 11:20:05.944728	f
0fd4170c-f899-49b7-b719-78a00eeca037	4	2026-01-19 00:07:38.029	2026-01-11 17:07:38.033875	f
937a4cdc-dc32-4c6d-bef6-9c2aced98305	4	2026-01-19 00:07:38.03	2026-01-11 17:07:38.033976	f
778c663b-539b-49af-b65c-b51c497bc727	4	2026-01-19 00:07:38.031	2026-01-11 17:07:38.034071	f
f7d3d71d-7642-4a4b-af86-938624c70b6c	4	2026-01-14 21:45:19.11	2026-01-07 14:45:19.115537	f
22e76361-596a-42fd-a90e-53811d2a8b21	4	2026-01-19 00:07:38.032	2026-01-11 17:07:38.034161	f
376e16ec-8f9d-4390-9103-5bae8f1e9a46	4	2026-01-19 00:07:38.027	2026-01-11 17:07:38.03425	f
9eade95f-fb67-4e06-9dea-579c71d74a76	4	2026-01-19 00:07:38.033	2026-01-11 17:07:38.034998	f
29528bbc-5b30-4b7f-9b72-75c7e695c97f	4	2026-01-19 01:21:29.249	2026-01-11 18:21:29.25121	f
2de99b5b-5c5b-47d2-8f12-59cf34326633	1	2026-01-19 23:46:32.171	2026-01-12 16:46:32.176263	f
9bd69d71-24c3-4f90-a183-8a3f28afcbc3	1	2026-01-19 23:46:32.172	2026-01-12 16:46:32.176384	f
4ad394f6-8871-4143-b767-ee741c0f836b	1	2026-01-19 23:46:32.173	2026-01-12 16:46:32.176476	f
8f9507fe-8160-4379-8a3a-abf969641b81	1	2026-01-19 23:46:32.174	2026-01-12 16:46:32.176574	f
451191a3-4b46-4411-bd8f-c7c30d73ad34	1	2026-01-19 23:46:32.168	2026-01-12 16:46:32.176667	f
784598d4-0d8e-41d7-9d3c-9430c3462276	1	2026-01-20 00:46:38.802	2026-01-12 17:46:38.805836	f
c135caf8-2295-45c4-ac65-295c38bbf4a2	1	2026-01-20 09:49:29.64	2026-01-13 02:49:29.643495	f
ac470322-c830-47b3-a41f-381bc9df8cd6	1	2026-01-20 09:52:55.612	2026-01-13 02:52:55.613634	f
28eefea9-9487-47b7-9f27-82a36d32eeaf	1	2026-01-20 11:21:20.083	2026-01-13 04:21:20.085018	f
168edc53-9be9-4e70-aaa6-f26b584300c7	1	2026-01-20 11:21:20.08	2026-01-13 04:21:20.085163	f
32eb6f6a-71ee-4494-b1f7-927ef35eefcc	1	2026-01-20 11:59:15.654	2026-01-13 04:59:15.655421	f
93187394-0103-42e1-8694-aa648ca3d933	1	2026-01-20 13:44:33.599	2026-01-13 06:44:33.603069	f
d0734ee1-fbcd-48f7-aded-4656076d88c3	1	2026-01-20 13:44:33.6	2026-01-13 06:44:33.603212	f
e86d033e-6cd2-4da7-a787-57f01fe85687	1	2026-01-20 13:44:33.602	2026-01-13 06:44:33.604934	f
da35ff14-c9f7-45eb-b66e-ba4f1ceee49c	4	2026-01-20 14:16:36.761	2026-01-13 07:16:36.767423	f
cd33b947-fb6e-498a-a1b6-b9377fec58c7	4	2026-01-20 14:16:36.762	2026-01-13 07:16:36.767561	f
cb96dcfb-23c1-42be-8803-4ce4fc2eeeee	4	2026-01-20 14:16:36.764	2026-01-13 07:16:36.76774	f
fa7b30ea-0dd6-4b68-b9f3-2667a730109c	4	2026-01-20 14:16:36.765	2026-01-13 07:16:36.767883	f
fdc027b0-2043-447d-a276-0a38634f0a66	4	2026-01-20 14:16:36.759	2026-01-13 07:16:36.768043	f
dbfceb34-c791-42bc-8d10-bdd65fc1b9e2	4	2026-01-20 15:07:04.486	2026-01-13 08:07:04.489536	f
13b8d46e-ccb9-4ce3-9bcb-4a994405971b	1	2026-01-20 15:18:46.354	2026-01-13 08:18:46.356379	f
12dff1ef-2e22-42d5-89de-39d67039381b	1	2026-01-20 15:18:46.355	2026-01-13 08:18:46.35664	f
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 65, true);


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bank_accounts_id_seq', 1, false);


--
-- Name: bank_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bank_ledger_id_seq', 1, false);


--
-- Name: cash_deposits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cash_deposits_id_seq', 85, true);


--
-- Name: cash_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cash_ledger_id_seq', 175, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customers_id_seq', 25, true);


--
-- Name: debt_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.debt_ledger_id_seq', 66, true);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expense_categories_id_seq', 20, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expenses_id_seq', 1, false);


--
-- Name: inventory_document_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_document_items_id_seq', 101, true);


--
-- Name: inventory_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_documents_id_seq', 55, true);


--
-- Name: inventory_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_ledger_id_seq', 170, true);


--
-- Name: inventory_loss_calculations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_loss_calculations_id_seq', 2, true);


--
-- Name: inventory_truck_compartments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_truck_compartments_id_seq', 2, true);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 4, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.permissions_id_seq', 1, false);


--
-- Name: product_prices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.product_prices_id_seq', 12, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 6, true);


--
-- Name: pump_readings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pump_readings_id_seq', 350, true);


--
-- Name: pumps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pumps_id_seq', 9, true);


--
-- Name: receipt_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.receipt_details_id_seq', 23, true);


--
-- Name: receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.receipts_id_seq', 23, true);


--
-- Name: regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.regions_id_seq', 6, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 6, true);


--
-- Name: sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sales_id_seq', 378, true);


--
-- Name: shift_adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shift_adjustments_id_seq', 1, false);


--
-- Name: shift_debt_sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shift_debt_sales_id_seq', 40, true);


--
-- Name: shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shifts_id_seq', 59, true);


--
-- Name: stores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stores_id_seq', 16, true);


--
-- Name: tanks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tanks_id_seq', 7, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: warehouses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.warehouses_id_seq', 2, true);


--
-- PostgreSQL database dump complete
--

\unrestrict Ea9ho1glZ2uTCAVuin7htbg5EXnigLyFPhmda0xXVddDwRjBAMcGHRvG26hzvAY

