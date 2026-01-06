--
-- PostgreSQL database dump
--

\restrict 3Iq8Eya3NGHWF9BvzbMFA0MryglPN0ta1yy7OsbyXG1r3RLg1Bq4BdQbOQFCNfe

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
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_accounts (
    id integer NOT NULL,
    "accountNumber" character varying(50) NOT NULL,
    "bankName" character varying(100) NOT NULL,
    "accountName" character varying(200) NOT NULL,
    description text,
    is_company_account boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bank_accounts OWNER TO postgres;

--
-- Name: bank_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bank_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.bank_accounts_id_seq OWNER TO postgres;

--
-- Name: bank_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bank_accounts_id_seq OWNED BY public.bank_accounts.id;


--
-- Name: bank_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_ledger (
    id integer NOT NULL,
    bank_account_id integer NOT NULL,
    store_id integer,
    ref_type character varying(50) NOT NULL,
    ref_id integer,
    bank_in numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    bank_out numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bank_ledger OWNER TO postgres;

--
-- Name: bank_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bank_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.bank_ledger_id_seq OWNER TO postgres;

--
-- Name: bank_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bank_ledger_id_seq OWNED BY public.bank_ledger.id;


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
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    payment_method character varying(20) DEFAULT 'CASH'::character varying NOT NULL
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
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    superseded_by_shift_id integer
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
    notes text,
    type character varying(20) DEFAULT 'EXTERNAL'::character varying NOT NULL
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
    notes text,
    superseded_by_shift_id integer
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
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_categories (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.expense_categories OWNER TO postgres;

--
-- Name: expense_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expense_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.expense_categories_id_seq OWNER TO postgres;

--
-- Name: expense_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expense_categories_id_seq OWNED BY public.expense_categories.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    store_id integer NOT NULL,
    shift_id integer,
    expense_category_id integer NOT NULL,
    amount numeric(18,2) NOT NULL,
    description text NOT NULL,
    expense_date date NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    payment_method character varying(20) DEFAULT 'CASH'::character varying NOT NULL
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.expenses_id_seq OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: inventory_document_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_document_items (
    id integer NOT NULL,
    document_id integer NOT NULL,
    product_id integer,
    quantity numeric(18,3),
    unit_price numeric(18,2),
    tank_id integer
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
    status character varying(20),
    supplier_name character varying(255),
    invoice_number character varying(50),
    license_plate character varying(20)
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
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    tank_id integer,
    superseded_by_shift_id integer
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
-- Name: inventory_loss_calculations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_loss_calculations (
    id integer NOT NULL,
    document_id integer NOT NULL,
    expansion_coefficient numeric(10,6),
    loss_coefficient numeric(10,6),
    total_truck_volume numeric(18,3),
    total_actual_volume numeric(18,3),
    total_received_volume numeric(18,3),
    total_loss_volume numeric(18,3),
    allowed_loss_volume numeric(18,3),
    excess_shortage_volume numeric(18,3),
    temperature_adjustment_volume numeric(18,3),
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_loss_calculations OWNER TO postgres;

--
-- Name: COLUMN inventory_loss_calculations.expansion_coefficient; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_loss_calculations.expansion_coefficient IS 'Hệ số giãn nở (β)';


--
-- Name: COLUMN inventory_loss_calculations.loss_coefficient; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_loss_calculations.loss_coefficient IS 'Hệ số hao hụt vận chuyển (α)';


--
-- Name: COLUMN inventory_loss_calculations.total_truck_volume; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_loss_calculations.total_truck_volume IS 'Tổng thể tích tại xe téc (lít)';


--
-- Name: COLUMN inventory_loss_calculations.total_actual_volume; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_loss_calculations.total_actual_volume IS 'Tổng thể tích thực tế (lít)';


--
-- Name: COLUMN inventory_loss_calculations.total_received_volume; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_loss_calculations.total_received_volume IS 'Tổng lượng thực nhận (lít)';


--
-- Name: COLUMN inventory_loss_calculations.total_loss_volume; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_loss_calculations.total_loss_volume IS 'Tổng hao hụt (lít)';


--
-- Name: COLUMN inventory_loss_calculations.allowed_loss_volume; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_loss_calculations.allowed_loss_volume IS 'Hao hụt cho phép (lít)';


--
-- Name: COLUMN inventory_loss_calculations.excess_shortage_volume; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_loss_calculations.excess_shortage_volume IS 'Lượng thừa/thiếu (lít) - Dương: thừa, Âm: thiếu';


--
-- Name: COLUMN inventory_loss_calculations.temperature_adjustment_volume; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_loss_calculations.temperature_adjustment_volume IS 'Lượng điều chỉnh do nhiệt độ (lít)';


--
-- Name: inventory_loss_calculations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_loss_calculations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.inventory_loss_calculations_id_seq OWNER TO postgres;

--
-- Name: inventory_loss_calculations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_loss_calculations_id_seq OWNED BY public.inventory_loss_calculations.id;


--
-- Name: inventory_truck_compartments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_truck_compartments (
    id integer NOT NULL,
    document_id integer NOT NULL,
    product_id integer,
    compartment_number integer NOT NULL,
    compartment_height numeric(10,2),
    truck_temperature numeric(5,2),
    truck_volume numeric(18,3),
    warehouse_height numeric(10,2),
    actual_temperature numeric(5,2),
    actual_volume numeric(18,3),
    received_volume numeric(18,3),
    loss_volume numeric(18,3),
    height_loss_truck numeric(10,2),
    height_loss_warehouse numeric(10,2),
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_truck_compartments OWNER TO postgres;

--
-- Name: COLUMN inventory_truck_compartments.compartment_height; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_truck_compartments.compartment_height IS 'Chiều cao téc tại ngăn (cm)';


--
-- Name: COLUMN inventory_truck_compartments.truck_temperature; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_truck_compartments.truck_temperature IS 'Nhiệt độ tại xe téc (°C)';


--
-- Name: COLUMN inventory_truck_compartments.truck_volume; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_truck_compartments.truck_volume IS 'Thể tích tại nhiệt độ xe téc (lít)';


--
-- Name: COLUMN inventory_truck_compartments.warehouse_height; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_truck_compartments.warehouse_height IS 'Chiều cao téc tại kho (cm)';


--
-- Name: COLUMN inventory_truck_compartments.actual_temperature; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_truck_compartments.actual_temperature IS 'Nhiệt độ thực tế (°C)';


--
-- Name: COLUMN inventory_truck_compartments.actual_volume; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_truck_compartments.actual_volume IS 'Thể tích tại nhiệt độ thực tế (lít)';


--
-- Name: COLUMN inventory_truck_compartments.received_volume; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_truck_compartments.received_volume IS 'Lượng thực nhận (lít)';


--
-- Name: COLUMN inventory_truck_compartments.loss_volume; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_truck_compartments.loss_volume IS 'Lượng hao hụt (lít)';


--
-- Name: COLUMN inventory_truck_compartments.height_loss_truck; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_truck_compartments.height_loss_truck IS 'Hao hụt chiều cao đo đạc tại xe (cm)';


--
-- Name: COLUMN inventory_truck_compartments.height_loss_warehouse; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_truck_compartments.height_loss_warehouse IS 'Hao hụt chiều cao téc tại kho (cm)';


--
-- Name: inventory_truck_compartments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_truck_compartments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.inventory_truck_compartments_id_seq OWNER TO postgres;

--
-- Name: inventory_truck_compartments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_truck_compartments_id_seq OWNED BY public.inventory_truck_compartments.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


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
    pump_id integer,
    unit_price numeric(18,2)
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
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    payment_method character varying(20) DEFAULT 'CASH'::character varying NOT NULL
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
    customer_id integer,
    payment_method character varying(20) DEFAULT 'CASH'::character varying NOT NULL
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
    status character varying(20) DEFAULT 'OPEN'::character varying NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    adjusted_from_shift_id integer,
    is_active boolean DEFAULT true NOT NULL
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
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    current_stock numeric(18,3) DEFAULT '0'::numeric NOT NULL
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
-- Name: user_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_tokens (
    id character varying NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_revoked boolean DEFAULT false NOT NULL
);


ALTER TABLE public.user_tokens OWNER TO postgres;

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
-- Name: bank_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts ALTER COLUMN id SET DEFAULT nextval('public.bank_accounts_id_seq'::regclass);


--
-- Name: bank_ledger id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_ledger ALTER COLUMN id SET DEFAULT nextval('public.bank_ledger_id_seq'::regclass);


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
-- Name: expense_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories ALTER COLUMN id SET DEFAULT nextval('public.expense_categories_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


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
-- Name: inventory_loss_calculations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_loss_calculations ALTER COLUMN id SET DEFAULT nextval('public.inventory_loss_calculations_id_seq'::regclass);


--
-- Name: inventory_truck_compartments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_truck_compartments ALTER COLUMN id SET DEFAULT nextval('public.inventory_truck_compartments_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


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
13	shifts	19	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-06T10:00:00.000Z"}	\N	2026-01-06 10:00:48.394255
14	shifts	20	CLOSE	{"status": "OPEN", "closedAt": null}	{"status": "CLOSED", "closedAt": "2026-01-06T12:33:00.000Z"}	\N	2026-01-06 12:34:02.961378
\.


--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_accounts (id, "accountNumber", "bankName", "accountName", description, is_company_account, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: bank_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_ledger (id, bank_account_id, store_id, ref_type, ref_id, bank_in, bank_out, notes, created_at) FROM stdin;
\.


--
-- Data for Name: cash_deposits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_deposits (id, store_id, shift_id, amount, deposit_date, deposit_time, receiver_name, notes, created_by, created_at, payment_method) FROM stdin;
8	1	19	11876500.00	2026-01-06	\N	\N	Nộp tiền bán hàng	\N	2026-01-06 10:00:48.394255	CASH
9	1	20	739800.00	2026-01-06	\N	\N	Nop tien hang	\N	2026-01-06 12:34:02.961378	CASH
\.


--
-- Data for Name: cash_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_ledger (id, store_id, ref_type, ref_id, cash_in, cash_out, created_at, superseded_by_shift_id) FROM stdin;
20	1	SHIFT_CLOSE	19	12822000.00	0.00	2026-01-06 10:00:48.394255	\N
21	1	DEPOSIT	8	0.00	11876500.00	2026-01-06 10:00:48.394255	\N
22	1	SHIFT_CLOSE	20	912300.00	0.00	2026-01-06 12:34:02.961378	\N
23	1	DEPOSIT	9	0.00	739800.00	2026-01-06 12:34:02.961378	\N
\.


--
-- Data for Name: customer_stores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer_stores (customer_id, store_id) FROM stdin;
24	1
25	16
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (id, code, name, tax_code, address, phone, credit_limit, notes, type) FROM stdin;
1	KH001	CÔNG TY TNHH O SUNG RF VINA	2301035391	Lô CN1-1, Khu công nghiệp Quế Võ 3, Phường Quế Võ, Tỉnh Bắc Ninh, Việt Nam	\N	\N	\N	EXTERNAL
2	KH0002	CÔNG TY TNHH TUẤN MẠNH MD	2301101703	Thôn Mộ Đạo, Phường Bồng Lai, Tỉnh Bắc Ninh, Việt Nam	\N	\N	\N	EXTERNAL
24	KH00002	abc	\N	1232131	031225666	\N	\N	INTERNAL
25	KH00003	zxc	\N	zzzz	0915856356	\N	\N	INTERNAL
\.


--
-- Data for Name: debt_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.debt_ledger (id, customer_id, store_id, ref_type, ref_id, debit, credit, created_at, notes, superseded_by_shift_id) FROM stdin;
18	2	1	DEBT_SALE	16	945500.00	0.00	2026-01-06 10:00:48.394255	Xuất công nợ tuấn mạnh	\N
19	2	1	DEBT_SALE	17	172500.00	0.00	2026-01-06 12:34:02.961378	Bán công nợ	\N
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_categories (id, code, name, description, is_active, created_at, updated_at) FROM stdin;
1	642	Chi phí quản lý doanh nghiệp	Chi phí quản lý DN theo TT200	t	2026-01-03 14:51:37.34881	2026-01-03 14:51:37.34881
2	641	Chi phí bán hàng	Chi phí phát sinh trong quá trình tiêu thụ sản phẩm	t	2026-01-03 14:51:37.34881	2026-01-03 14:51:37.34881
3	627	Chi phí dịch vụ mua ngoài	Chi phí dịch vụ thuê ngoài	t	2026-01-03 14:51:37.34881	2026-01-03 14:51:37.34881
4	811	Chi phí khác	Các khoản chi phí khác	t	2026-01-03 14:51:37.34881	2026-01-03 14:51:37.34881
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, store_id, shift_id, expense_category_id, amount, description, expense_date, created_by, created_at, payment_method) FROM stdin;
\.


--
-- Data for Name: inventory_document_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_document_items (id, document_id, product_id, quantity, unit_price, tank_id) FROM stdin;
\.


--
-- Data for Name: inventory_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_documents (id, warehouse_id, doc_type, doc_date, ref_shift_id, status, supplier_name, invoice_number, license_plate) FROM stdin;
\.


--
-- Data for Name: inventory_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_ledger (id, warehouse_id, product_id, ref_type, ref_id, quantity_in, quantity_out, created_at, tank_id, superseded_by_shift_id) FROM stdin;
32	2	2	ADJUSTMENT	\N	11000.000	0.000	2026-01-06 08:19:18.268447	\N	\N
33	2	3	ADJUSTMENT	\N	11000.000	0.000	2026-01-06 08:19:18.268447	\N	\N
39	1	3	SHIFT_SALE	19	0.000	120.000	2026-01-06 10:00:48.394255	3	\N
40	1	3	SHIFT_SALE	19	0.000	130.000	2026-01-06 10:00:48.394255	3	\N
41	1	2	SHIFT_SALE	19	0.000	140.000	2026-01-06 10:00:48.394255	1	\N
42	1	2	SHIFT_SALE	19	0.000	150.000	2026-01-06 10:00:48.394255	2	\N
43	1	2	SHIFT_SALE	19	0.000	160.000	2026-01-06 10:00:48.394255	2	\N
30	1	2	ADJUSTMENT	\N	10000.000	0.000	2026-01-01 07:45:33.488	\N	\N
31	1	3	ADJUSTMENT	\N	10000.000	0.000	2026-01-01 07:45:33.488163	\N	\N
44	1	3	SHIFT_SALE	20	0.000	20.000	2026-01-06 12:34:02.961378	\N	\N
45	1	2	SHIFT_SALE	20	0.000	30.000	2026-01-06 12:34:02.961378	\N	\N
\.


--
-- Data for Name: inventory_loss_calculations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_loss_calculations (id, document_id, expansion_coefficient, loss_coefficient, total_truck_volume, total_actual_volume, total_received_volume, total_loss_volume, allowed_loss_volume, excess_shortage_volume, temperature_adjustment_volume, notes, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_truck_compartments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_truck_compartments (id, document_id, product_id, compartment_number, compartment_height, truck_temperature, truck_volume, warehouse_height, actual_temperature, actual_volume, received_volume, loss_volume, height_loss_truck, height_loss_warehouse, created_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
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

COPY public.pump_readings (id, shift_id, pump_code, product_id, start_value, end_value, quantity, pump_id, unit_price) FROM stdin;
66	19	V1	3	0.000	120.000	120.000	\N	17250.00
67	19	V2	3	0.000	130.000	130.000	\N	17250.00
68	19	V3	2	0.000	140.000	140.000	\N	18910.00
69	19	V4	2	0.000	150.000	150.000	\N	18910.00
70	19	V5	2	0.000	160.000	160.000	\N	18910.00
71	20	V1	3	120.000	130.000	10.000	\N	17250.00
72	20	V2	3	130.000	140.000	10.000	\N	17250.00
73	20	V3	2	140.000	150.000	10.000	\N	18910.00
74	20	V4	2	150.000	160.000	10.000	\N	18910.00
75	20	V5	2	160.000	170.000	10.000	\N	18910.00
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

COPY public.receipts (id, store_id, shift_id, receipt_type, amount, created_at, payment_method) FROM stdin;
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

COPY public.sales (id, shift_id, store_id, product_id, quantity, unit_price, amount, customer_id, payment_method) FROM stdin;
69	19	1	3	120.000	17250.00	2070000.00	\N	CASH
70	19	1	3	130.000	17250.00	2242500.00	\N	CASH
71	19	1	2	140.000	18910.00	2647400.00	\N	CASH
72	19	1	2	150.000	18910.00	2836500.00	\N	CASH
73	19	1	2	160.000	18910.00	3025600.00	\N	CASH
74	19	1	2	50.000	18910.00	945500.00	2	CASH
75	20	1	3	10.000	17250.00	172500.00	\N	CASH
76	20	1	3	10.000	17250.00	172500.00	\N	CASH
77	20	1	2	10.000	18910.00	189100.00	\N	CASH
78	20	1	2	10.000	18910.00	189100.00	\N	CASH
79	20	1	2	10.000	18910.00	189100.00	\N	CASH
80	20	1	3	10.000	17250.00	172500.00	2	CASH
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
16	19	2	2	50.000	18910.00	945500.00	Xuất công nợ tuấn mạnh	2026-01-06 10:00:48.394255
17	20	2	3	10.000	17250.00	172500.00	\N	2026-01-06 12:34:02.961378
\.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shifts (id, store_id, shift_date, shift_no, opened_at, closed_at, status, version, adjusted_from_shift_id, is_active) FROM stdin;
19	1	2026-01-06	1	2026-01-06 16:58:00	2026-01-06 17:00:00	CLOSED	1	\N	t
20	1	2026-01-06	2	2026-01-06 17:10:00	2026-01-06 19:33:00	CLOSED	1	\N	t
\.


--
-- Data for Name: stores; Type: TABLE DATA; Schema: public; Owner: postgres
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
-- Data for Name: tanks; Type: TABLE DATA; Schema: public; Owner: postgres
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
-- Data for Name: user_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_tokens (id, user_id, expires_at, created_at, is_revoked) FROM stdin;
e4b9f35c-4b9a-4f6f-a0ae-520f70b04767	1	2026-01-13 16:55:38.358	2026-01-06 09:55:38.363994	f
87e30ab4-af70-4713-bfd7-8ff5bcf4f468	1	2026-01-13 16:55:38.362	2026-01-06 09:55:38.369223	f
47daff9b-b5b7-41a2-8e1d-d3c21550f074	1	2026-01-13 16:55:38.364	2026-01-06 09:55:38.369552	f
f201da91-5a6b-4fb6-9298-87b60304bb69	1	2026-01-12 12:44:29.096	2026-01-05 05:44:29.101329	f
b86b2308-cc88-4577-bbed-27799a0dbdcc	1	2026-01-12 12:44:29.103	2026-01-05 05:44:29.10628	f
24beeaf0-bf57-46c7-8f1c-682492da58f6	4	2026-01-13 18:03:36.161	2026-01-06 11:03:36.162607	f
bd856ffd-9f67-4286-8831-1c4275910962	4	2026-01-13 19:26:42.596	2026-01-06 12:26:42.598671	f
2e47c1c9-597f-40bf-bdf1-ebea2e2f4a1a	4	2026-01-12 15:30:09.156	2026-01-05 08:30:09.158119	f
cab25bf7-2873-410d-847a-e9fade14b2bf	4	2026-01-12 15:30:09.163	2026-01-05 08:30:09.165227	f
9cf786cb-6e27-4c58-be96-80841cd5f210	4	2026-01-12 15:30:09.166	2026-01-05 08:30:09.17083	f
7c2127a8-df31-43bd-804a-0a98b94c2692	4	2026-01-12 15:30:10.213	2026-01-05 08:30:10.216731	f
f7711c63-11cf-4c29-99c8-8b8f99dcda5b	6	2026-01-12 16:22:23.515	2026-01-05 09:22:23.517081	f
ee821f1d-44fe-4778-b5eb-ce9f7a086f27	4	2026-01-12 17:42:27.493	2026-01-05 10:42:27.496747	f
89136f18-f46d-4ed2-a30a-7a7f8adc8ac3	1	2026-01-13 00:52:50.304	2026-01-05 17:52:50.306191	f
bdd33cb9-345d-41f9-b9e1-1d8951012721	1	2026-01-13 00:52:52.796	2026-01-05 17:52:52.798059	f
41ecd550-7e44-443e-916d-5fe5a7377151	4	2026-01-13 11:44:07.592	2026-01-06 04:44:07.595677	f
c2d009fb-5919-4adf-9167-eb16de931f99	1	2026-01-13 13:22:49.133	2026-01-06 06:22:49.142394	f
0859bf82-2a88-45d8-9356-ae7e7d6501f3	1	2026-01-13 15:20:30.509	2026-01-06 08:20:30.511533	f
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, full_name, role_id, store_id, is_active, created_at) FROM stdin;
1	admin	$2b$10$ut6jSmhyLaPp0rsEgmzXt.lm.28tTn8E20o/dhpFi/mKlSL2YPBRm	Administrator	1	\N	t	2026-01-01 15:28:14.236209
5	ch10	$2b$10$UaKaGNx8MH57lpudce9M5e0O0wgkbjnUN1oApvIYXhd.No1FDDawe	HTT	5	2	t	2026-01-02 15:42:27.402355
6	ch11	$2b$10$xev.vAwfgzcTu57K2q1OXOPgPfQYqyFmpsdKHM5p.xWM7ulWFVKhm	ch11	5	3	t	2026-01-03 07:36:38.844602
4	ch81	$2b$10$86ZgJkgc3Izm63iLC6FpxeJXuSk3mUySDXJPQsnmY0bmHbAaQber.	Tây Nam 81	5	1	t	2026-01-01 18:01:34.674572
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouses (id, type, store_id) FROM stdin;
1	STORE	1
2	STORE	15
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 14, true);


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bank_accounts_id_seq', 1, false);


--
-- Name: bank_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bank_ledger_id_seq', 1, false);


--
-- Name: cash_deposits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cash_deposits_id_seq', 9, true);


--
-- Name: cash_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cash_ledger_id_seq', 23, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customers_id_seq', 25, true);


--
-- Name: debt_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.debt_ledger_id_seq', 19, true);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_categories_id_seq', 20, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expenses_id_seq', 1, false);


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

SELECT pg_catalog.setval('public.inventory_ledger_id_seq', 45, true);


--
-- Name: inventory_loss_calculations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_loss_calculations_id_seq', 1, false);


--
-- Name: inventory_truck_compartments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_truck_compartments_id_seq', 1, false);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 4, true);


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

SELECT pg_catalog.setval('public.pump_readings_id_seq', 75, true);


--
-- Name: pumps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pumps_id_seq', 9, true);


--
-- Name: receipt_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.receipt_details_id_seq', 2, true);


--
-- Name: receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.receipts_id_seq', 2, true);


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

SELECT pg_catalog.setval('public.sales_id_seq', 80, true);


--
-- Name: shift_adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shift_adjustments_id_seq', 1, false);


--
-- Name: shift_debt_sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shift_debt_sales_id_seq', 17, true);


--
-- Name: shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shifts_id_seq', 20, true);


--
-- Name: stores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stores_id_seq', 16, true);


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

SELECT pg_catalog.setval('public.warehouses_id_seq', 2, true);


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
-- Name: bank_ledger PK_318068fbd0f3cdf21a7dc2ccd9f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_ledger
    ADD CONSTRAINT "PK_318068fbd0f3cdf21a7dc2ccd9f" PRIMARY KEY (id);


--
-- Name: product_prices PK_31c33ddacf759f7c0e5d327c4bb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_prices
    ADD CONSTRAINT "PK_31c33ddacf759f7c0e5d327c4bb" PRIMARY KEY (id);


--
-- Name: inventory_truck_compartments PK_32337000fb1a252c82e79cd9969; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_truck_compartments
    ADD CONSTRAINT "PK_32337000fb1a252c82e79cd9969" PRIMARY KEY (id);


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
-- Name: user_tokens PK_63764db9d9aaa4af33e07b2f4bf; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT "PK_63764db9d9aaa4af33e07b2f4bf" PRIMARY KEY (id);


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
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: permissions PK_920331560282b8bd21bb02290df; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY (id);


--
-- Name: inventory_loss_calculations PK_941904ffc1c538cfafdfa06d741; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_loss_calculations
    ADD CONSTRAINT "PK_941904ffc1c538cfafdfa06d741" PRIMARY KEY (id);


--
-- Name: expenses PK_94c3ceb17e3140abc9282c20610; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "PK_94c3ceb17e3140abc9282c20610" PRIMARY KEY (id);


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
-- Name: bank_accounts PK_c872de764f2038224a013ff25ed; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT "PK_c872de764f2038224a013ff25ed" PRIMARY KEY (id);


--
-- Name: customer_stores PK_ca5f36854f424425ea3f0655091; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_stores
    ADD CONSTRAINT "PK_ca5f36854f424425ea3f0655091" PRIMARY KEY (customer_id, store_id);


--
-- Name: expense_categories PK_d0ef31e189d9523461215b62775; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT "PK_d0ef31e189d9523461215b62775" PRIMARY KEY (id);


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
-- Name: inventory_loss_calculations UQ_6da3cc3f555f3d3d30e8d21fbd4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_loss_calculations
    ADD CONSTRAINT "UQ_6da3cc3f555f3d3d30e8d21fbd4" UNIQUE (document_id);


--
-- Name: expense_categories UQ_6e1e6e388d00c18c4bb5a2206e6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT "UQ_6e1e6e388d00c18c4bb5a2206e6" UNIQUE (code);


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
-- Name: idx_bank_ledger_account; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bank_ledger_account ON public.bank_ledger USING btree (bank_account_id, created_at);


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
-- Name: idx_expenses_shift; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_shift ON public.expenses USING btree (shift_id);


--
-- Name: idx_expenses_store; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_store ON public.expenses USING btree (store_id, created_at);


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
-- Name: expenses FK_0848ee9225a5825a95d9ab1da55; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "FK_0848ee9225a5825a95d9ab1da55" FOREIGN KEY (expense_category_id) REFERENCES public.expense_categories(id);


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
-- Name: inventory_truck_compartments FK_20e58b8745d3821c0a41f3a79f6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_truck_compartments
    ADD CONSTRAINT "FK_20e58b8745d3821c0a41f3a79f6" FOREIGN KEY (product_id) REFERENCES public.products(id);


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
-- Name: bank_ledger FK_5f19c3be73494094073e93a0fb0; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_ledger
    ADD CONSTRAINT "FK_5f19c3be73494094073e93a0fb0" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: pump_readings FK_5f25c3cde1b32a7f2f589642007; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pump_readings
    ADD CONSTRAINT "FK_5f25c3cde1b32a7f2f589642007" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: expenses FK_60dc343125132e11cb89abbd5aa; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "FK_60dc343125132e11cb89abbd5aa" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: inventory_truck_compartments FK_62869db8770693f851701d64133; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_truck_compartments
    ADD CONSTRAINT "FK_62869db8770693f851701d64133" FOREIGN KEY (document_id) REFERENCES public.inventory_documents(id);


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
-- Name: inventory_loss_calculations FK_6da3cc3f555f3d3d30e8d21fbd4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_loss_calculations
    ADD CONSTRAINT "FK_6da3cc3f555f3d3d30e8d21fbd4" FOREIGN KEY (document_id) REFERENCES public.inventory_documents(id);


--
-- Name: expenses FK_7c0c012c2f8e6578277c239ee61; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "FK_7c0c012c2f8e6578277c239ee61" FOREIGN KEY (created_by) REFERENCES public.users(id);


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
-- Name: user_tokens FK_9e144a67be49e5bba91195ef5de; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT "FK_9e144a67be49e5bba91195ef5de" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


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
-- Name: inventory_ledger FK_a576f26c6bff5945e12889eb9bc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_ledger
    ADD CONSTRAINT "FK_a576f26c6bff5945e12889eb9bc" FOREIGN KEY (tank_id) REFERENCES public.tanks(id);


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
-- Name: expenses FK_b8220647a9e8ba971320a94d49a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "FK_b8220647a9e8ba971320a94d49a" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


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
-- Name: inventory_document_items FK_cee3cd0fe35eda56420dd69d9c5; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_document_items
    ADD CONSTRAINT "FK_cee3cd0fe35eda56420dd69d9c5" FOREIGN KEY (tank_id) REFERENCES public.tanks(id);


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
-- Name: bank_ledger FK_f7d9067c7b84f0b7fd5cb5fd18a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_ledger
    ADD CONSTRAINT "FK_f7d9067c7b84f0b7fd5cb5fd18a" FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);


--
-- Name: inventory_document_items FK_ff5c9b654b5c227f10c20bb864b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_document_items
    ADD CONSTRAINT "FK_ff5c9b654b5c227f10c20bb864b" FOREIGN KEY (document_id) REFERENCES public.inventory_documents(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 3Iq8Eya3NGHWF9BvzbMFA0MryglPN0ta1yy7OsbyXG1r3RLg1Bq4BdQbOQFCNfe

