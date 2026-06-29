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
-- Name: regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.regions_id_seq', 2, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 5, true);


--
-- Name: stores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stores_id_seq', 16, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- PostgreSQL database dump complete
--

\unrestrict Ea9ho1glZ2uTCAVuin7htbg5EXnigLyFPhmda0xXVddDwRjBAMcGHRvG26hzvAY
