--
-- PostgreSQL database dump
--

\restrict fDXpZ1LmbtBzJcGoaOSDcMy3RRUhEk0O8c97SmXnceEd43uoJPkDPoD4DlDbEhx

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
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    table_name character varying(100),
    record_id integer,
    action character varying(20),
    old_data jsonb,
    new_data jsonb,
    changed_by integer,
    changed_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: cash_deposits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cash_deposits (
    id integer NOT NULL,
    store_id integer NOT NULL,
    shift_id integer,
    amount numeric(18,2) NOT NULL,
    deposit_date date NOT NULL,
    deposit_time time without time zone,
    receiver_name character varying(100),
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cash_deposits OWNER TO postgres;

--
-- Name: cash_deposits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cash_deposits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.cash_deposits_id_seq OWNER TO postgres;

--
-- Name: cash_deposits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cash_deposits_id_seq OWNED BY public.cash_deposits.id;


--
-- Name: cash_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cash_ledger (
    id integer NOT NULL,
    store_id integer NOT NULL,
    ref_type character varying(50),
    ref_id integer,
    cash_in numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    cash_out numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cash_ledger OWNER TO postgres;

--
-- Name: cash_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cash_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.cash_ledger_id_seq OWNER TO postgres;

--
-- Name: cash_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cash_ledger_id_seq OWNED BY public.cash_ledger.id;


--
-- Name: customer_stores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_stores (
    customer_id integer NOT NULL,
    store_id integer NOT NULL
);


ALTER TABLE public.customer_stores OWNER TO postgres;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255),
    tax_code character varying(50),
    address character varying(500),
    phone character varying(20),
    credit_limit numeric(15,2),
    notes text
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.customers_id_seq OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: debt_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.debt_ledger (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    store_id integer,
    ref_type character varying(50),
    ref_id integer,
    debit numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    credit numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    notes text
);


ALTER TABLE public.debt_ledger OWNER TO postgres;

--
-- Name: debt_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.debt_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.debt_ledger_id_seq OWNER TO postgres;

--
-- Name: debt_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.debt_ledger_id_seq OWNED BY public.debt_ledger.id;


--
-- Name: inventory_document_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_document_items (
    id integer NOT NULL,
    document_id integer NOT NULL,
    product_id integer,
    quantity numeric(18,3),
    unit_price numeric(18,2)
);


ALTER TABLE public.inventory_document_items OWNER TO postgres;

--
-- Name: inventory_document_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_document_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.inventory_document_items_id_seq OWNER TO postgres;

--
-- Name: inventory_document_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_document_items_id_seq OWNED BY public.inventory_document_items.id;


--
-- Name: inventory_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_documents (
    id integer NOT NULL,
    warehouse_id integer,
    doc_type character varying(50),
    doc_date date,
    ref_shift_id integer,
    status character varying(20)
);


ALTER TABLE public.inventory_documents OWNER TO postgres;

--
-- Name: inventory_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.inventory_documents_id_seq OWNER TO postgres;

--
-- Name: inventory_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_documents_id_seq OWNED BY public.inventory_documents.id;


--
-- Name: inventory_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_ledger (
    id integer NOT NULL,
    warehouse_id integer NOT NULL,
    product_id integer NOT NULL,
    ref_type character varying(50),
    ref_id integer,
    quantity_in numeric(18,3) DEFAULT '0'::numeric NOT NULL,
    quantity_out numeric(18,3) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_ledger OWNER TO postgres;

--
-- Name: inventory_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.inventory_ledger_id_seq OWNER TO postgres;

--
-- Name: inventory_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_ledger_id_seq OWNED BY public.inventory_ledger.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    description text
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.permissions_id_seq OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: product_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_prices (
    id integer NOT NULL,
    product_id integer NOT NULL,
    region_id integer NOT NULL,
    price numeric(18,2) NOT NULL,
    valid_from timestamp without time zone NOT NULL,
    valid_to timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_prices OWNER TO postgres;

--
-- Name: product_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_prices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.product_prices_id_seq OWNER TO postgres;

--
-- Name: product_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_prices_id_seq OWNED BY public.product_prices.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    code character varying(50),
    name character varying(255),
    unit character varying(50),
    is_fuel boolean DEFAULT false NOT NULL
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: pump_readings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pump_readings (
    id integer NOT NULL,
    shift_id integer NOT NULL,
    pump_code character varying(50),
    product_id integer,
    start_value numeric(18,3),
    end_value numeric(18,3),
    quantity numeric(18,3),
    pump_id integer
);


ALTER TABLE public.pump_readings OWNER TO postgres;

--
-- Name: pump_readings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pump_readings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pump_readings_id_seq OWNER TO postgres;

--
-- Name: pump_readings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pump_readings_id_seq OWNED BY public.pump_readings.id;


--
-- Name: pumps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pumps (
    id integer NOT NULL,
    store_id integer NOT NULL,
    tank_id integer NOT NULL,
    pump_code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    product_id integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.pumps OWNER TO postgres;

--
-- Name: pumps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pumps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pumps_id_seq OWNER TO postgres;

--
-- Name: pumps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pumps_id_seq OWNED BY public.pumps.id;


--
-- Name: receipt_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.receipt_details (
    id integer NOT NULL,
    receipt_id integer NOT NULL,
    customer_id integer,
    amount numeric(18,2)
);


ALTER TABLE public.receipt_details OWNER TO postgres;

--
-- Name: receipt_details_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.receipt_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.receipt_details_id_seq OWNER TO postgres;

--
-- Name: receipt_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.receipt_details_id_seq OWNED BY public.receipt_details.id;


--
-- Name: receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.receipts (
    id integer NOT NULL,
    store_id integer,
    shift_id integer,
    receipt_type character varying(50),
    amount numeric(18,2),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.receipts OWNER TO postgres;

--
-- Name: receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.receipts_id_seq OWNER TO postgres;

--
-- Name: receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.receipts_id_seq OWNED BY public.receipts.id;


--
-- Name: regions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.regions (
    id integer NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.regions OWNER TO postgres;

--
-- Name: regions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.regions_id_seq OWNER TO postgres;

--
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.regions_id_seq OWNED BY public.regions.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales (
    id integer NOT NULL,
    shift_id integer,
    store_id integer,
    product_id integer,
    quantity numeric(18,3),
    unit_price numeric(18,2),
    amount numeric(18,2),
    customer_id integer
);


ALTER TABLE public.sales OWNER TO postgres;

--
-- Name: sales_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sales_id_seq OWNER TO postgres;

--
-- Name: sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_id_seq OWNED BY public.sales.id;


--
-- Name: shift_adjustments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shift_adjustments (
    id integer NOT NULL,
    shift_id integer NOT NULL,
    adjustment_type character varying(50),
    reason text,
    created_by integer,
    approved_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shift_adjustments OWNER TO postgres;

--
-- Name: shift_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shift_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.shift_adjustments_id_seq OWNER TO postgres;

--
-- Name: shift_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shift_adjustments_id_seq OWNED BY public.shift_adjustments.id;


--
-- Name: shift_debt_sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shift_debt_sales (
    id integer NOT NULL,
    shift_id integer NOT NULL,
    customer_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(18,3) NOT NULL,
    unit_price numeric(18,2) NOT NULL,
    amount numeric(18,2) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shift_debt_sales OWNER TO postgres;

--
-- Name: shift_debt_sales_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shift_debt_sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.shift_debt_sales_id_seq OWNER TO postgres;

--
-- Name: shift_debt_sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shift_debt_sales_id_seq OWNED BY public.shift_debt_sales.id;


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shifts (
    id integer NOT NULL,
    store_id integer NOT NULL,
    shift_date date NOT NULL,
    shift_no integer NOT NULL,
    opened_at timestamp without time zone,
    closed_at timestamp without time zone,
    status character varying(20) DEFAULT 'OPEN'::character varying NOT NULL
);


ALTER TABLE public.shifts OWNER TO postgres;

--
-- Name: shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.shifts_id_seq OWNER TO postgres;

--
-- Name: shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shifts_id_seq OWNED BY public.shifts.id;


--
-- Name: stores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stores (
    id integer NOT NULL,
    code character varying(50),
    name character varying(255),
    region_id integer,
    is_active boolean DEFAULT true NOT NULL,
    address character varying(255),
    phone character varying(50)
);


ALTER TABLE public.stores OWNER TO postgres;

--
-- Name: stores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.stores_id_seq OWNER TO postgres;

--
-- Name: stores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stores_id_seq OWNED BY public.stores.id;


--
-- Name: tanks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tanks (
    id integer NOT NULL,
    store_id integer NOT NULL,
    tank_code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    capacity numeric(18,3) NOT NULL,
    product_id integer NOT NULL,
    current_stock numeric(18,3) DEFAULT '0'::numeric NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tanks OWNER TO postgres;

--
-- Name: COLUMN tanks.capacity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.tanks.capacity IS 'Dung tích tối đa (lít)';


--
-- Name: COLUMN tanks.current_stock; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.tanks.current_stock IS 'Tồn kho hiện tại (lít)';


--
-- Name: tanks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tanks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tanks_id_seq OWNER TO postgres;

--
-- Name: tanks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tanks_id_seq OWNED BY public.tanks.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password_hash text NOT NULL,
    full_name character varying(255),
    role_id integer,
    store_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouses (
    id integer NOT NULL,
    type character varying(20),
    store_id integer
);


ALTER TABLE public.warehouses OWNER TO postgres;

--
-- Name: warehouses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.warehouses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.warehouses_id_seq OWNER TO postgres;

--
-- Name: warehouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: cash_deposits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_deposits ALTER COLUMN id SET DEFAULT nextval('public.cash_deposits_id_seq'::regclass);


--
-- Name: cash_ledger id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_ledger ALTER COLUMN id SET DEFAULT nextval('public.cash_ledger_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: debt_ledger id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.debt_ledger ALTER COLUMN id SET DEFAULT nextval('public.debt_ledger_id_seq'::regclass);


--
-- Name: inventory_document_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_document_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_document_items_id_seq'::regclass);


--
-- Name: inventory_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_documents ALTER COLUMN id SET DEFAULT nextval('public.inventory_documents_id_seq'::regclass);


--
-- Name: inventory_ledger id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_ledger ALTER COLUMN id SET DEFAULT nextval('public.inventory_ledger_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: product_prices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_prices ALTER COLUMN id SET DEFAULT nextval('public.product_prices_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: pump_readings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pump_readings ALTER COLUMN id SET DEFAULT nextval('public.pump_readings_id_seq'::regclass);


--
-- Name: pumps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pumps ALTER COLUMN id SET DEFAULT nextval('public.pumps_id_seq'::regclass);


--
-- Name: receipt_details id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipt_details ALTER COLUMN id SET DEFAULT nextval('public.receipt_details_id_seq'::regclass);


--
-- Name: receipts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts ALTER COLUMN id SET DEFAULT nextval('public.receipts_id_seq'::regclass);


--
-- Name: regions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions ALTER COLUMN id SET DEFAULT nextval('public.regions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sales id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales ALTER COLUMN id SET DEFAULT nextval('public.sales_id_seq'::regclass);


--
-- Name: shift_adjustments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_adjustments ALTER COLUMN id SET DEFAULT nextval('public.shift_adjustments_id_seq'::regclass);


--
-- Name: shift_debt_sales id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_debt_sales ALTER COLUMN id SET DEFAULT nextval('public.shift_debt_sales_id_seq'::regclass);


--
-- Name: shifts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts ALTER COLUMN id SET DEFAULT nextval('public.shifts_id_seq'::regclass);


--
-- Name: stores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stores ALTER COLUMN id SET DEFAULT nextval('public.stores_id_seq'::regclass);


--
-- Name: tanks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tanks ALTER COLUMN id SET DEFAULT nextval('public.tanks_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, table_name, record_id, action, old_data, new_data, changed_by, changed_at) FROM stdin;
1	shifts	2	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-02T15:10:18.477Z"}	\N	2026-01-02 15:10:18.358462
2	shifts	5	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-02T15:57:22.104Z"}	\N	2026-01-02 15:57:22.087025
\.


--
-- Data for Name: cash_deposits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_deposits (id, store_id, shift_id, amount, deposit_date, deposit_time, receiver_name, notes, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: cash_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_ledger (id, store_id, ref_type, ref_id, cash_in, cash_out, created_at) FROM stdin;
3	1	SHIFT_CLOSE	2	10947581.09	0.00	2026-01-02 15:10:18.358462
4	2	SHIFT_CLOSE	5	10723000.00	0.00	2026-01-02 15:57:22.087025
\.


--
-- Data for Name: customer_stores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_stores (customer_id, store_id) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (id, code, name, tax_code, address, phone, credit_limit, notes) FROM stdin;
1	KH001	CÔNG TY TNHH O SUNG RF VINA	2301035391	Lô CN1-1, Khu công nghiệp Quế Võ 3, Phường Quế Võ, Tỉnh Bắc Ninh, Việt Nam	\N	\N	\N
2	KH00002	CÔNG TY TNHH TUẤN MẠNH MD	2301101703	Thôn Mộ Đạo, Phường Bồng Lai, Tỉnh Bắc Ninh, Việt Nam	\N	\N	\N
\.


--
-- Data for Name: debt_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.debt_ledger (id, customer_id, store_id, ref_type, ref_id, debit, credit, created_at, notes) FROM stdin;
10	1	1	DEBT_SALE	9	862500.00	0.00	2026-01-02 15:10:18.358462	\N
11	2	1	DEBT_SALE	10	862500.00	0.00	2026-01-02 15:10:18.358462	\N
12	1	2	DEBT_SALE	11	1759000.00	0.00	2026-01-02 15:57:22.087025	\N
\.


--
-- Data for Name: inventory_document_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_document_items (id, document_id, product_id, quantity, unit_price) FROM stdin;
\.


--
-- Data for Name: inventory_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_documents (id, warehouse_id, doc_type, doc_date, ref_shift_id, status) FROM stdin;
\.


--
-- Data for Name: inventory_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_ledger (id, warehouse_id, product_id, ref_type, ref_id, quantity_in, quantity_out, created_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, code, description) FROM stdin;
\.


--
-- Data for Name: product_prices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_prices (id, product_id, region_id, price, valid_from, valid_to, created_at) FROM stdin;
1	3	1	17250.00	2026-01-02 07:00:00	\N	2026-01-02 06:08:26.837321
2	2	1	18910.00	2026-01-02 07:00:00	\N	2026-01-02 06:08:26.851482
3	2	2	19280.00	2026-01-02 07:00:00	\N	2026-01-02 06:10:06.127007
4	3	2	17590.00	2026-01-02 07:00:00	\N	2026-01-02 06:10:06.137501
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, code, name, unit, is_fuel) FROM stdin;
1	E5	Xăng E5	Lít	t
2	RON95	Xăng RON 95	Lít	t
4	OIL	Dầu nhớt	Chai	f
3	DO05	Dầu Diesel 0,05%S	Lít	t
6	D0001	Dầu Diesel 0,001%S	Lít	t
\.


--
-- Data for Name: pump_readings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pump_readings (id, shift_id, pump_code, product_id, start_value, end_value, quantity, pump_id) FROM stdin;
31	2	V1	3	0.000	120.000	120.000	\N
32	2	V2	3	0.000	120.000	120.000	\N
33	2	V3	2	0.000	120.000	120.000	\N
34	2	V4	2	0.000	120.000	120.000	\N
35	2	V5	2	0.000	119.999	119.999	\N
36	5	V01	2	0.000	100.000	100.000	\N
37	5	V02	3	0.000	500.000	500.000	\N
\.


--
-- Data for Name: pumps; Type: TABLE DATA; Schema: public; Owner: postgres
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
-- Data for Name: receipt_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.receipt_details (id, receipt_id, customer_id, amount) FROM stdin;
\.


--
-- Data for Name: receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.receipts (id, store_id, shift_id, receipt_type, amount, created_at) FROM stdin;
\.


--
-- Data for Name: regions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.regions (id, name) FROM stdin;
1	Khu Vực 1
2	Khu Vực 2
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (role_id, permission_id) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, code, name) FROM stdin;
1	ADMIN	Admin
2	DIRECTOR	Giám đốc
3	SALES	Phòng kinh doanh
4	ACCOUNTING	Phòng kế toán
5	STORE	Cửa hàng
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales (id, shift_id, store_id, product_id, quantity, unit_price, amount, customer_id) FROM stdin;
27	2	1	3	120.000	17250.00	2070000.00	\N
28	2	1	3	120.000	17250.00	2070000.00	\N
29	2	1	2	120.000	18910.00	2269200.00	\N
30	2	1	2	120.000	18910.00	2269200.00	\N
31	2	1	2	119.999	18910.00	2269181.09	\N
32	2	1	3	50.000	17250.00	862500.00	1
33	2	1	3	50.000	17250.00	862500.00	2
34	5	2	2	100.000	19280.00	1928000.00	\N
35	5	2	3	500.000	17590.00	8795000.00	\N
36	5	2	3	100.000	17590.00	1759000.00	1
\.


--
-- Data for Name: shift_adjustments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shift_adjustments (id, shift_id, adjustment_type, reason, created_by, approved_by, created_at) FROM stdin;
\.


--
-- Data for Name: shift_debt_sales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shift_debt_sales (id, shift_id, customer_id, product_id, quantity, unit_price, amount, notes, created_at) FROM stdin;
9	2	1	3	50.000	17250.00	862500.00	\N	2026-01-02 15:10:18.358462
10	2	2	3	50.000	17250.00	862500.00	\N	2026-01-02 15:10:18.358462
11	5	1	3	100.000	17590.00	1759000.00	\N	2026-01-02 15:57:22.087025
\.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shifts (id, store_id, shift_date, shift_no, opened_at, closed_at, status) FROM stdin;
2	1	2026-01-02	1	2026-01-02 05:30:00	2026-01-02 22:10:18.477	CLOSED
5	2	2026-01-02	1	2026-01-02 17:30:00	2026-01-02 22:57:22.104	CLOSED
8	1	2026-01-02	2	2026-01-02 22:11:00	\N	OPEN
9	3	2026-01-03	1	2026-01-03 05:30:00	\N	OPEN
\.


--
-- Data for Name: stores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stores (id, code, name, region_id, is_active, address, phone) FROM stdin;
1	CH81	Cửa Hàng Xăng Dầu 81	1	t	Bắc Ninh	0975478916
2	CH10	Cửa Hàng Xăng Dầu Số 10	2	t	Thái Nguyên 	0943696816
3	CH11	Cửa Hàng Xăng Dầu số 11	1	t	Hà Nội 	0911123412
\.


--
-- Data for Name: tanks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tanks (id, store_id, tank_code, name, capacity, product_id, current_stock, is_active, created_at, updated_at) FROM stdin;
3	1	B03	Bể Dầu 05 Số 3	25000.000	3	8141.500	t	2026-01-02 05:12:37.203953	2026-01-02 15:10:18.358462
1	1	B01	Bể Xăng 95 Số 1	25000.000	2	1713.000	t	2026-01-02 05:02:28.482246	2026-01-02 15:10:18.358462
2	1	B02	Bể Xăng 95 Số 2	25000.000	2	3896.001	t	2026-01-02 05:12:07.082635	2026-01-02 15:10:18.358462
4	2	B01	Bể Xăng Ron 95 số 1	10000.000	2	1134.000	t	2026-01-02 15:43:25.920698	2026-01-02 15:57:22.087025
5	2	B02	Bể Dầu 05 Số 2	10000.000	3	1845.000	t	2026-01-02 15:43:59.141073	2026-01-02 15:57:22.087025
6	3	B01	Bồn 1 Xăng 95	23000.000	2	12000.000	t	2026-01-03 07:37:23.762617	2026-01-03 07:37:53.386173
7	3	B02	Bể Dầu 05 	12000.000	3	10000.000	t	2026-01-03 07:38:12.189685	2026-01-03 07:38:12.189685
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, full_name, role_id, store_id, is_active, created_at) FROM stdin;
1	admin	$2b$10$ut6jSmhyLaPp0rsEgmzXt.lm.28tTn8E20o/dhpFi/mKlSL2YPBRm	Administrator	1	\N	t	2026-01-01 15:28:14.236209
4	canh81	$2b$10$86ZgJkgc3Izm63iLC6FpxeJXuSk3mUySDXJPQsnmY0bmHbAaQber.	nguyen thi canh	5	1	t	2026-01-01 18:01:34.674572
5	ch10	$2b$10$UaKaGNx8MH57lpudce9M5e0O0wgkbjnUN1oApvIYXhd.No1FDDawe	HTT	5	2	t	2026-01-02 15:42:27.402355
6	ch11	$2b$10$xev.vAwfgzcTu57K2q1OXOPgPfQYqyFmpsdKHM5p.xWM7ulWFVKhm	ch11	5	3	t	2026-01-03 07:36:38.844602
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouses (id, type, store_id) FROM stdin;
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 2, true);


--
-- Name: cash_deposits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cash_deposits_id_seq', 1, true);


--
-- Name: cash_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cash_ledger_id_seq', 4, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customers_id_seq', 2, true);


--
-- Name: debt_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.debt_ledger_id_seq', 12, true);


--
-- Name: inventory_document_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_document_items_id_seq', 1, false);


--
-- Name: inventory_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_documents_id_seq', 1, false);


--
-- Name: inventory_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_ledger_id_seq', 29, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 1, false);


--
-- Name: product_prices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_prices_id_seq', 4, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 6, true);


--
-- Name: pump_readings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pump_readings_id_seq', 37, true);


--
-- Name: pumps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pumps_id_seq', 9, true);


--
-- Name: receipt_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.receipt_details_id_seq', 1, true);


--
-- Name: receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.receipts_id_seq', 1, true);


--
-- Name: regions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.regions_id_seq', 6, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 6, true);


--
-- Name: sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_id_seq', 36, true);


--
-- Name: shift_adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shift_adjustments_id_seq', 1, false);


--
-- Name: shift_debt_sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shift_debt_sales_id_seq', 11, true);


--
-- Name: shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shifts_id_seq', 9, true);


--
-- Name: stores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stores_id_seq', 3, true);


--
-- Name: tanks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tanks_id_seq', 7, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: warehouses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.warehouses_id_seq', 1, false);


--
-- Name: products PK_0806c755e0aca124e67c0cf6d7d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY (id);


--
-- Name: customers PK_133ec679a801fab5e070f73d3ea; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY (id);


--
-- Name: cash_ledger PK_1645445a91d6ac4d07e754da573; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_ledger
    ADD CONSTRAINT "PK_1645445a91d6ac4d07e754da573" PRIMARY KEY (id);


--
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);


--
-- Name: role_permissions PK_25d24010f53bb80b78e412c9656; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY (role_id, permission_id);


--
-- Name: product_prices PK_31c33ddacf759f7c0e5d327c4bb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_prices
    ADD CONSTRAINT "PK_31c33ddacf759f7c0e5d327c4bb" PRIMARY KEY (id);


--
-- Name: inventory_document_items PK_3e80345f40e8b5a4b4b5fb60fee; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_document_items
    ADD CONSTRAINT "PK_3e80345f40e8b5a4b4b5fb60fee" PRIMARY KEY (id);


--
-- Name: sales PK_4f0bc990ae81dba46da680895ea; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "PK_4f0bc990ae81dba46da680895ea" PRIMARY KEY (id);


--
-- Name: regions PK_4fcd12ed6a046276e2deb08801c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT "PK_4fcd12ed6a046276e2deb08801c" PRIMARY KEY (id);


--
-- Name: warehouses PK_56ae21ee2432b2270b48867e4be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT "PK_56ae21ee2432b2270b48867e4be" PRIMARY KEY (id);


--
-- Name: inventory_ledger PK_56ba7cef08f3263f90418ddfeef; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_ledger
    ADD CONSTRAINT "PK_56ba7cef08f3263f90418ddfeef" PRIMARY KEY (id);


--
-- Name: shift_debt_sales PK_5c99332b10500ef379ed507d228; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_debt_sales
    ADD CONSTRAINT "PK_5c99332b10500ef379ed507d228" PRIMARY KEY (id);


--
-- Name: receipts PK_5e8182d7c29e023da6e1ff33bfe; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT "PK_5e8182d7c29e023da6e1ff33bfe" PRIMARY KEY (id);


--
-- Name: inventory_documents PK_67c1a6358723ad4b9b0c16d8dd4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_documents
    ADD CONSTRAINT "PK_67c1a6358723ad4b9b0c16d8dd4" PRIMARY KEY (id);


--
-- Name: tanks PK_6f4aa0dd55c110e1ca7cac7b504; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tanks
    ADD CONSTRAINT "PK_6f4aa0dd55c110e1ca7cac7b504" PRIMARY KEY (id);


--
-- Name: stores PK_7aa6e7d71fa7acdd7ca43d7c9cb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT "PK_7aa6e7d71fa7acdd7ca43d7c9cb" PRIMARY KEY (id);


--
-- Name: shifts PK_84d692e367e4d6cdf045828768c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT "PK_84d692e367e4d6cdf045828768c" PRIMARY KEY (id);


--
-- Name: permissions PK_920331560282b8bd21bb02290df; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: cash_deposits PK_c05034891f3240aff6551ae6993; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_deposits
    ADD CONSTRAINT "PK_c05034891f3240aff6551ae6993" PRIMARY KEY (id);


--
-- Name: roles PK_c1433d71a4838793a49dcad46ab; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY (id);


--
-- Name: pumps PK_c29366e8b65bd472501df54a31c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pumps
    ADD CONSTRAINT "PK_c29366e8b65bd472501df54a31c" PRIMARY KEY (id);


--
-- Name: customer_stores PK_ca5f36854f424425ea3f0655091; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_stores
    ADD CONSTRAINT "PK_ca5f36854f424425ea3f0655091" PRIMARY KEY (customer_id, store_id);


--
-- Name: debt_ledger PK_d4296414b55de3627fa8443cc26; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.debt_ledger
    ADD CONSTRAINT "PK_d4296414b55de3627fa8443cc26" PRIMARY KEY (id);


--
-- Name: receipt_details PK_d4ca646404cc70b76ccc9200d32; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipt_details
    ADD CONSTRAINT "PK_d4ca646404cc70b76ccc9200d32" PRIMARY KEY (id);


--
-- Name: pump_readings PK_dc5d348c15e5a21c4e87669e678; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pump_readings
    ADD CONSTRAINT "PK_dc5d348c15e5a21c4e87669e678" PRIMARY KEY (id);


--
-- Name: shift_adjustments PK_f662575f03ec154f35ff26b2c71; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_adjustments
    ADD CONSTRAINT "PK_f662575f03ec154f35ff26b2c71" PRIMARY KEY (id);


--
-- Name: stores UQ_72bdebc754d6a689b3c169cab8a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT "UQ_72bdebc754d6a689b3c169cab8a" UNIQUE (code);


--
-- Name: products UQ_7cfc24d6c24f0ec91294003d6b8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "UQ_7cfc24d6c24f0ec91294003d6b8" UNIQUE (code);


--
-- Name: permissions UQ_8dad765629e83229da6feda1c1d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE (code);


--
-- Name: customers UQ_f2eee14aa1fe3e956fe193c142f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "UQ_f2eee14aa1fe3e956fe193c142f" UNIQUE (code);


--
-- Name: roles UQ_f6d54f95c31b73fb1bdd8e91d0c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "UQ_f6d54f95c31b73fb1bdd8e91d0c" UNIQUE (code);


--
-- Name: users UQ_fe0bb3f6520ee0469504521e710; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE (username);


--
-- Name: idx_cash_deposits_shift; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_deposits_shift ON public.cash_deposits USING btree (shift_id);


--
-- Name: idx_cash_deposits_store; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_deposits_store ON public.cash_deposits USING btree (store_id, deposit_date);


--
-- Name: idx_cash_ledger_store; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_ledger_store ON public.cash_ledger USING btree (store_id, created_at);


--
-- Name: idx_debt_ledger_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_debt_ledger_customer ON public.debt_ledger USING btree (customer_id, created_at);


--
-- Name: idx_inventory_ledger_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_ledger_lookup ON public.inventory_ledger USING btree (warehouse_id, product_id, created_at);


--
-- Name: idx_product_prices_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_prices_lookup ON public.product_prices USING btree (product_id, region_id, valid_from, valid_to);


--
-- Name: idx_shift_debt_sales_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shift_debt_sales_customer ON public.shift_debt_sales USING btree (customer_id);


--
-- Name: idx_shift_debt_sales_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shift_debt_sales_product ON public.shift_debt_sales USING btree (product_id);


--
-- Name: idx_shift_debt_sales_shift; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shift_debt_sales_shift ON public.shift_debt_sales USING btree (shift_id);


--
-- Name: ux_shift_store_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_shift_store_date ON public.shifts USING btree (store_id, shift_date, shift_no);


--
-- Name: receipts FK_03db286bb378d5fb8db44b7b761; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT "FK_03db286bb378d5fb8db44b7b761" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: cash_deposits FK_0f1cf7bccf18a7f8ca8657df289; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_deposits
    ADD CONSTRAINT "FK_0f1cf7bccf18a7f8ca8657df289" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: sales FK_10a00ff24a92e0043beaf9c1661; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "FK_10a00ff24a92e0043beaf9c1661" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: tanks FK_12ad7a6b710243af89cf49d1049; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tanks
    ADD CONSTRAINT "FK_12ad7a6b710243af89cf49d1049" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: pumps FK_163e206d1f7fca65aecf7e86b00; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pumps
    ADD CONSTRAINT "FK_163e206d1f7fca65aecf7e86b00" FOREIGN KEY (tank_id) REFERENCES public.tanks(id);


--
-- Name: role_permissions FK_17022daf3f885f7d35423e9971e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: role_permissions FK_178199805b901ccd220ab7740ec; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: cash_ledger FK_17d5d0e7cf92a1e99c88dab55eb; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_ledger
    ADD CONSTRAINT "FK_17d5d0e7cf92a1e99c88dab55eb" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: inventory_documents FK_189b0fd0da6b028c10d99135b79; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_documents
    ADD CONSTRAINT "FK_189b0fd0da6b028c10d99135b79" FOREIGN KEY (ref_shift_id) REFERENCES public.shifts(id);


--
-- Name: stores FK_20d8079f3a0833a4b044d69bc19; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT "FK_20d8079f3a0833a4b044d69bc19" FOREIGN KEY (region_id) REFERENCES public.regions(id);


--
-- Name: receipt_details FK_2e8881782bed950943198d904b2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipt_details
    ADD CONSTRAINT "FK_2e8881782bed950943198d904b2" FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: customer_stores FK_2fd47829af8623371c451061321; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_stores
    ADD CONSTRAINT "FK_2fd47829af8623371c451061321" FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: shift_adjustments FK_349fe5de23d6fbdf6e6f604c369; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_adjustments
    ADD CONSTRAINT "FK_349fe5de23d6fbdf6e6f604c369" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: shift_debt_sales FK_37f3a7668cb8e9cf845bcea3ae0; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_debt_sales
    ADD CONSTRAINT "FK_37f3a7668cb8e9cf845bcea3ae0" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: receipts FK_39bff60923066ebb4b6a46ae7fc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT "FK_39bff60923066ebb4b6a46ae7fc" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: shifts FK_39e04f82d2ccc83f89df4767a8d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT "FK_39e04f82d2ccc83f89df4767a8d" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: tanks FK_3eb887d82bb0f2744d6d01363c9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tanks
    ADD CONSTRAINT "FK_3eb887d82bb0f2744d6d01363c9" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: sales FK_5015e2759303d7baaf47fc53cc8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "FK_5015e2759303d7baaf47fc53cc8" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: pumps FK_5a9f0971140947f16efafb912dc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pumps
    ADD CONSTRAINT "FK_5a9f0971140947f16efafb912dc" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: audit_logs FK_5b72a4910a614ce2167a602977f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "FK_5b72a4910a614ce2167a602977f" FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: shift_debt_sales FK_5e3438f1b052c8171b41ff9bd44; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_debt_sales
    ADD CONSTRAINT "FK_5e3438f1b052c8171b41ff9bd44" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: pump_readings FK_5f25c3cde1b32a7f2f589642007; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pump_readings
    ADD CONSTRAINT "FK_5f25c3cde1b32a7f2f589642007" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: inventory_ledger FK_6bfc43bdb3bd3dd0b3c1920acc7; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_ledger
    ADD CONSTRAINT "FK_6bfc43bdb3bd3dd0b3c1920acc7" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: sales FK_6c1fae113ae666969a94d79d637; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "FK_6c1fae113ae666969a94d79d637" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: product_prices FK_8218c69c7f5a3706662101fa788; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_prices
    ADD CONSTRAINT "FK_8218c69c7f5a3706662101fa788" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: shift_adjustments FK_860b56606e2b1b43fdb53397e1c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_adjustments
    ADD CONSTRAINT "FK_860b56606e2b1b43fdb53397e1c" FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: pump_readings FK_864dd5ac876e007fa6126a67df8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pump_readings
    ADD CONSTRAINT "FK_864dd5ac876e007fa6126a67df8" FOREIGN KEY (pump_id) REFERENCES public.pumps(id);


--
-- Name: warehouses FK_934bc794b9487057960519b2318; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT "FK_934bc794b9487057960519b2318" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: customer_stores FK_988070e0adb9ad1266b2c3a7393; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_stores
    ADD CONSTRAINT "FK_988070e0adb9ad1266b2c3a7393" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: users FK_98a52595c9031d60f5c8d280ca4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_98a52595c9031d60f5c8d280ca4" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: pumps FK_a27f91279cfb33205ffa8d89ea1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pumps
    ADD CONSTRAINT "FK_a27f91279cfb33205ffa8d89ea1" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: users FK_a2cecd1a3531c0b041e29ba46e1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: inventory_document_items FK_a5f3fd828dd5ae58d73a4b105b4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_document_items
    ADD CONSTRAINT "FK_a5f3fd828dd5ae58d73a4b105b4" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: product_prices FK_b1123feb1f3fbc7112d507827ce; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_prices
    ADD CONSTRAINT "FK_b1123feb1f3fbc7112d507827ce" FOREIGN KEY (region_id) REFERENCES public.regions(id);


--
-- Name: inventory_documents FK_bd1906a5fb15935f25cf1f864dd; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_documents
    ADD CONSTRAINT "FK_bd1906a5fb15935f25cf1f864dd" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: cash_deposits FK_bdf8e90e00202d5af6ce6df0b3a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_deposits
    ADD CONSTRAINT "FK_bdf8e90e00202d5af6ce6df0b3a" FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: pump_readings FK_be01d9eccf8d39878d7b9181be7; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pump_readings
    ADD CONSTRAINT "FK_be01d9eccf8d39878d7b9181be7" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: inventory_ledger FK_c1e0ac7aaa9f72d841672ed4d71; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_ledger
    ADD CONSTRAINT "FK_c1e0ac7aaa9f72d841672ed4d71" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: sales FK_c51005b2b06cec7aa17462c54f5; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "FK_c51005b2b06cec7aa17462c54f5" FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: debt_ledger FK_c7b52a38708463dea8622d6c28d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.debt_ledger
    ADD CONSTRAINT "FK_c7b52a38708463dea8622d6c28d" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: shift_adjustments FK_d00ce9f5f177a3199b378364d7b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_adjustments
    ADD CONSTRAINT "FK_d00ce9f5f177a3199b378364d7b" FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: debt_ledger FK_d1f82b556f966e70d292aa6de89; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.debt_ledger
    ADD CONSTRAINT "FK_d1f82b556f966e70d292aa6de89" FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: receipt_details FK_dea0966382acaf257eb68e30e16; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipt_details
    ADD CONSTRAINT "FK_dea0966382acaf257eb68e30e16" FOREIGN KEY (receipt_id) REFERENCES public.receipts(id);


--
-- Name: shift_debt_sales FK_f40d74abaa942cdfa970568a66c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_debt_sales
    ADD CONSTRAINT "FK_f40d74abaa942cdfa970568a66c" FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: cash_deposits FK_f59ec7413da98e2350e3c2d9baa; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_deposits
    ADD CONSTRAINT "FK_f59ec7413da98e2350e3c2d9baa" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: inventory_document_items FK_ff5c9b654b5c227f10c20bb864b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_document_items
    ADD CONSTRAINT "FK_ff5c9b654b5c227f10c20bb864b" FOREIGN KEY (document_id) REFERENCES public.inventory_documents(id);


--
-- PostgreSQL database dump complete
--

\unrestrict fDXpZ1LmbtBzJcGoaOSDcMy3RRUhEk0O8c97SmXnceEd43uoJPkDPoD4DlDbEhx

