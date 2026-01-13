--
-- PostgreSQL database dump
--

\restrict Vj98Wb67QvaD3St4lUnijTRlnfR4c5N9GshKOCMqQUI80jnMMt1aMYpbyrtgtY4

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
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bank_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bank_accounts_id_seq OWNED BY public.bank_accounts.id;


--
-- Name: bank_ledger; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: bank_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bank_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bank_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bank_ledger_id_seq OWNED BY public.bank_ledger.id;


--
-- Name: cash_deposits; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: cash_deposits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cash_deposits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cash_deposits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cash_deposits_id_seq OWNED BY public.cash_deposits.id;


--
-- Name: cash_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_ledger (
    id integer NOT NULL,
    store_id integer NOT NULL,
    ref_type character varying(50),
    ref_id integer,
    cash_in numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    cash_out numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    superseded_by_shift_id integer,
    shift_id integer
);


--
-- Name: cash_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cash_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cash_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cash_ledger_id_seq OWNED BY public.cash_ledger.id;


--
-- Name: customer_stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_stores (
    customer_id integer NOT NULL,
    store_id integer NOT NULL,
    credit_limit numeric(15,2)
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: debt_ledger; Type: TABLE; Schema: public; Owner: -
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
    superseded_by_shift_id integer,
    shift_id integer
);


--
-- Name: debt_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.debt_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: debt_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.debt_ledger_id_seq OWNED BY public.debt_ledger.id;


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: expense_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expense_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expense_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expense_categories_id_seq OWNED BY public.expense_categories.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: inventory_document_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_document_items (
    id integer NOT NULL,
    document_id integer NOT NULL,
    product_id integer,
    quantity numeric(18,3),
    unit_price numeric(18,2),
    tank_id integer
);


--
-- Name: inventory_document_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_document_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_document_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_document_items_id_seq OWNED BY public.inventory_document_items.id;


--
-- Name: inventory_documents; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: inventory_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_documents_id_seq OWNED BY public.inventory_documents.id;


--
-- Name: inventory_ledger; Type: TABLE; Schema: public; Owner: -
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
    superseded_by_shift_id integer,
    shift_id integer
);


--
-- Name: inventory_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_ledger_id_seq OWNED BY public.inventory_ledger.id;


--
-- Name: inventory_loss_calculations; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: COLUMN inventory_loss_calculations.expansion_coefficient; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_loss_calculations.expansion_coefficient IS 'Hệ số giãn nở (β)';


--
-- Name: COLUMN inventory_loss_calculations.loss_coefficient; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_loss_calculations.loss_coefficient IS 'Hệ số hao hụt vận chuyển (α)';


--
-- Name: COLUMN inventory_loss_calculations.total_truck_volume; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_loss_calculations.total_truck_volume IS 'Tổng thể tích tại xe téc (lít)';


--
-- Name: COLUMN inventory_loss_calculations.total_actual_volume; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_loss_calculations.total_actual_volume IS 'Tổng thể tích thực tế (lít)';


--
-- Name: COLUMN inventory_loss_calculations.total_received_volume; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_loss_calculations.total_received_volume IS 'Tổng lượng thực nhận (lít)';


--
-- Name: COLUMN inventory_loss_calculations.total_loss_volume; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_loss_calculations.total_loss_volume IS 'Tổng hao hụt (lít)';


--
-- Name: COLUMN inventory_loss_calculations.allowed_loss_volume; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_loss_calculations.allowed_loss_volume IS 'Hao hụt cho phép (lít)';


--
-- Name: COLUMN inventory_loss_calculations.excess_shortage_volume; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_loss_calculations.excess_shortage_volume IS 'Lượng thừa/thiếu (lít) - Dương: thừa, Âm: thiếu';


--
-- Name: COLUMN inventory_loss_calculations.temperature_adjustment_volume; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_loss_calculations.temperature_adjustment_volume IS 'Lượng điều chỉnh do nhiệt độ (lít)';


--
-- Name: inventory_loss_calculations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_loss_calculations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_loss_calculations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_loss_calculations_id_seq OWNED BY public.inventory_loss_calculations.id;


--
-- Name: inventory_truck_compartments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: COLUMN inventory_truck_compartments.compartment_height; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_truck_compartments.compartment_height IS 'Chiều cao téc tại ngăn (cm)';


--
-- Name: COLUMN inventory_truck_compartments.truck_temperature; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_truck_compartments.truck_temperature IS 'Nhiệt độ tại xe téc (°C)';


--
-- Name: COLUMN inventory_truck_compartments.truck_volume; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_truck_compartments.truck_volume IS 'Thể tích tại nhiệt độ xe téc (lít)';


--
-- Name: COLUMN inventory_truck_compartments.warehouse_height; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_truck_compartments.warehouse_height IS 'Chiều cao téc tại kho (cm)';


--
-- Name: COLUMN inventory_truck_compartments.actual_temperature; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_truck_compartments.actual_temperature IS 'Nhiệt độ thực tế (°C)';


--
-- Name: COLUMN inventory_truck_compartments.actual_volume; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_truck_compartments.actual_volume IS 'Thể tích tại nhiệt độ thực tế (lít)';


--
-- Name: COLUMN inventory_truck_compartments.received_volume; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_truck_compartments.received_volume IS 'Lượng thực nhận (lít)';


--
-- Name: COLUMN inventory_truck_compartments.loss_volume; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_truck_compartments.loss_volume IS 'Lượng hao hụt (lít)';


--
-- Name: COLUMN inventory_truck_compartments.height_loss_truck; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_truck_compartments.height_loss_truck IS 'Hao hụt chiều cao đo đạc tại xe (cm)';


--
-- Name: COLUMN inventory_truck_compartments.height_loss_warehouse; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inventory_truck_compartments.height_loss_warehouse IS 'Hao hụt chiều cao téc tại kho (cm)';


--
-- Name: inventory_truck_compartments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_truck_compartments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_truck_compartments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_truck_compartments_id_seq OWNED BY public.inventory_truck_compartments.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    description text
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: product_prices; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: product_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_prices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_prices_id_seq OWNED BY public.product_prices.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    code character varying(50),
    name character varying(255),
    unit character varying(50),
    is_fuel boolean DEFAULT false NOT NULL
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: pump_readings; Type: TABLE; Schema: public; Owner: -
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
    unit_price numeric(18,2),
    test_export numeric(18,3) DEFAULT '0'::numeric
);


--
-- Name: pump_readings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pump_readings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pump_readings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pump_readings_id_seq OWNED BY public.pump_readings.id;


--
-- Name: pumps; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: pumps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pumps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pumps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pumps_id_seq OWNED BY public.pumps.id;


--
-- Name: receipt_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipt_details (
    id integer NOT NULL,
    receipt_id integer NOT NULL,
    customer_id integer,
    amount numeric(18,2)
);


--
-- Name: receipt_details_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.receipt_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: receipt_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.receipt_details_id_seq OWNED BY public.receipt_details.id;


--
-- Name: receipts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.receipts_id_seq OWNED BY public.receipts.id;


--
-- Name: regions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regions (
    id integer NOT NULL,
    name character varying(100) NOT NULL
);


--
-- Name: regions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.regions_id_seq OWNED BY public.regions.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: sales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_id_seq OWNED BY public.sales.id;


--
-- Name: shift_adjustments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: shift_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shift_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shift_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shift_adjustments_id_seq OWNED BY public.shift_adjustments.id;


--
-- Name: shift_debt_sales; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: shift_debt_sales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shift_debt_sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shift_debt_sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shift_debt_sales_id_seq OWNED BY public.shift_debt_sales.id;


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shifts_id_seq OWNED BY public.shifts.id;


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: stores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stores_id_seq OWNED BY public.stores.id;


--
-- Name: tanks; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: COLUMN tanks.capacity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tanks.capacity IS 'Dung tích tối đa (lít)';


--
-- Name: COLUMN tanks.current_stock; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tanks.current_stock IS 'Tồn kho hiện tại (lít)';


--
-- Name: tanks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tanks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tanks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tanks_id_seq OWNED BY public.tanks.id;


--
-- Name: user_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_tokens (
    id character varying NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_revoked boolean DEFAULT false NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouses (
    id integer NOT NULL,
    type character varying(20),
    store_id integer
);


--
-- Name: warehouses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: bank_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts ALTER COLUMN id SET DEFAULT nextval('public.bank_accounts_id_seq'::regclass);


--
-- Name: bank_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_ledger ALTER COLUMN id SET DEFAULT nextval('public.bank_ledger_id_seq'::regclass);


--
-- Name: cash_deposits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_deposits ALTER COLUMN id SET DEFAULT nextval('public.cash_deposits_id_seq'::regclass);


--
-- Name: cash_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_ledger ALTER COLUMN id SET DEFAULT nextval('public.cash_ledger_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: debt_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debt_ledger ALTER COLUMN id SET DEFAULT nextval('public.debt_ledger_id_seq'::regclass);


--
-- Name: expense_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories ALTER COLUMN id SET DEFAULT nextval('public.expense_categories_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: inventory_document_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_document_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_document_items_id_seq'::regclass);


--
-- Name: inventory_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_documents ALTER COLUMN id SET DEFAULT nextval('public.inventory_documents_id_seq'::regclass);


--
-- Name: inventory_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_ledger ALTER COLUMN id SET DEFAULT nextval('public.inventory_ledger_id_seq'::regclass);


--
-- Name: inventory_loss_calculations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_loss_calculations ALTER COLUMN id SET DEFAULT nextval('public.inventory_loss_calculations_id_seq'::regclass);


--
-- Name: inventory_truck_compartments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_truck_compartments ALTER COLUMN id SET DEFAULT nextval('public.inventory_truck_compartments_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: product_prices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_prices ALTER COLUMN id SET DEFAULT nextval('public.product_prices_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: pump_readings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pump_readings ALTER COLUMN id SET DEFAULT nextval('public.pump_readings_id_seq'::regclass);


--
-- Name: pumps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pumps ALTER COLUMN id SET DEFAULT nextval('public.pumps_id_seq'::regclass);


--
-- Name: receipt_details id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_details ALTER COLUMN id SET DEFAULT nextval('public.receipt_details_id_seq'::regclass);


--
-- Name: receipts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts ALTER COLUMN id SET DEFAULT nextval('public.receipts_id_seq'::regclass);


--
-- Name: regions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions ALTER COLUMN id SET DEFAULT nextval('public.regions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales ALTER COLUMN id SET DEFAULT nextval('public.sales_id_seq'::regclass);


--
-- Name: shift_adjustments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_adjustments ALTER COLUMN id SET DEFAULT nextval('public.shift_adjustments_id_seq'::regclass);


--
-- Name: shift_debt_sales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_debt_sales ALTER COLUMN id SET DEFAULT nextval('public.shift_debt_sales_id_seq'::regclass);


--
-- Name: shifts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts ALTER COLUMN id SET DEFAULT nextval('public.shifts_id_seq'::regclass);


--
-- Name: stores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores ALTER COLUMN id SET DEFAULT nextval('public.stores_id_seq'::regclass);


--
-- Name: tanks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tanks ALTER COLUMN id SET DEFAULT nextval('public.tanks_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Name: products PK_0806c755e0aca124e67c0cf6d7d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY (id);


--
-- Name: customers PK_133ec679a801fab5e070f73d3ea; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY (id);


--
-- Name: cash_ledger PK_1645445a91d6ac4d07e754da573; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_ledger
    ADD CONSTRAINT "PK_1645445a91d6ac4d07e754da573" PRIMARY KEY (id);


--
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);


--
-- Name: role_permissions PK_25d24010f53bb80b78e412c9656; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY (role_id, permission_id);


--
-- Name: bank_ledger PK_318068fbd0f3cdf21a7dc2ccd9f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_ledger
    ADD CONSTRAINT "PK_318068fbd0f3cdf21a7dc2ccd9f" PRIMARY KEY (id);


--
-- Name: product_prices PK_31c33ddacf759f7c0e5d327c4bb; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_prices
    ADD CONSTRAINT "PK_31c33ddacf759f7c0e5d327c4bb" PRIMARY KEY (id);


--
-- Name: inventory_truck_compartments PK_32337000fb1a252c82e79cd9969; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_truck_compartments
    ADD CONSTRAINT "PK_32337000fb1a252c82e79cd9969" PRIMARY KEY (id);


--
-- Name: inventory_document_items PK_3e80345f40e8b5a4b4b5fb60fee; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_document_items
    ADD CONSTRAINT "PK_3e80345f40e8b5a4b4b5fb60fee" PRIMARY KEY (id);


--
-- Name: sales PK_4f0bc990ae81dba46da680895ea; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "PK_4f0bc990ae81dba46da680895ea" PRIMARY KEY (id);


--
-- Name: regions PK_4fcd12ed6a046276e2deb08801c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT "PK_4fcd12ed6a046276e2deb08801c" PRIMARY KEY (id);


--
-- Name: warehouses PK_56ae21ee2432b2270b48867e4be; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT "PK_56ae21ee2432b2270b48867e4be" PRIMARY KEY (id);


--
-- Name: inventory_ledger PK_56ba7cef08f3263f90418ddfeef; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_ledger
    ADD CONSTRAINT "PK_56ba7cef08f3263f90418ddfeef" PRIMARY KEY (id);


--
-- Name: shift_debt_sales PK_5c99332b10500ef379ed507d228; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_debt_sales
    ADD CONSTRAINT "PK_5c99332b10500ef379ed507d228" PRIMARY KEY (id);


--
-- Name: receipts PK_5e8182d7c29e023da6e1ff33bfe; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT "PK_5e8182d7c29e023da6e1ff33bfe" PRIMARY KEY (id);


--
-- Name: user_tokens PK_63764db9d9aaa4af33e07b2f4bf; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT "PK_63764db9d9aaa4af33e07b2f4bf" PRIMARY KEY (id);


--
-- Name: inventory_documents PK_67c1a6358723ad4b9b0c16d8dd4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_documents
    ADD CONSTRAINT "PK_67c1a6358723ad4b9b0c16d8dd4" PRIMARY KEY (id);


--
-- Name: tanks PK_6f4aa0dd55c110e1ca7cac7b504; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tanks
    ADD CONSTRAINT "PK_6f4aa0dd55c110e1ca7cac7b504" PRIMARY KEY (id);


--
-- Name: stores PK_7aa6e7d71fa7acdd7ca43d7c9cb; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT "PK_7aa6e7d71fa7acdd7ca43d7c9cb" PRIMARY KEY (id);


--
-- Name: shifts PK_84d692e367e4d6cdf045828768c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT "PK_84d692e367e4d6cdf045828768c" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: permissions PK_920331560282b8bd21bb02290df; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY (id);


--
-- Name: inventory_loss_calculations PK_941904ffc1c538cfafdfa06d741; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_loss_calculations
    ADD CONSTRAINT "PK_941904ffc1c538cfafdfa06d741" PRIMARY KEY (id);


--
-- Name: expenses PK_94c3ceb17e3140abc9282c20610; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "PK_94c3ceb17e3140abc9282c20610" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: cash_deposits PK_c05034891f3240aff6551ae6993; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_deposits
    ADD CONSTRAINT "PK_c05034891f3240aff6551ae6993" PRIMARY KEY (id);


--
-- Name: roles PK_c1433d71a4838793a49dcad46ab; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY (id);


--
-- Name: pumps PK_c29366e8b65bd472501df54a31c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pumps
    ADD CONSTRAINT "PK_c29366e8b65bd472501df54a31c" PRIMARY KEY (id);


--
-- Name: bank_accounts PK_c872de764f2038224a013ff25ed; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT "PK_c872de764f2038224a013ff25ed" PRIMARY KEY (id);


--
-- Name: customer_stores PK_ca5f36854f424425ea3f0655091; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_stores
    ADD CONSTRAINT "PK_ca5f36854f424425ea3f0655091" PRIMARY KEY (customer_id, store_id);


--
-- Name: expense_categories PK_d0ef31e189d9523461215b62775; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT "PK_d0ef31e189d9523461215b62775" PRIMARY KEY (id);


--
-- Name: debt_ledger PK_d4296414b55de3627fa8443cc26; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debt_ledger
    ADD CONSTRAINT "PK_d4296414b55de3627fa8443cc26" PRIMARY KEY (id);


--
-- Name: receipt_details PK_d4ca646404cc70b76ccc9200d32; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_details
    ADD CONSTRAINT "PK_d4ca646404cc70b76ccc9200d32" PRIMARY KEY (id);


--
-- Name: pump_readings PK_dc5d348c15e5a21c4e87669e678; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pump_readings
    ADD CONSTRAINT "PK_dc5d348c15e5a21c4e87669e678" PRIMARY KEY (id);


--
-- Name: shift_adjustments PK_f662575f03ec154f35ff26b2c71; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_adjustments
    ADD CONSTRAINT "PK_f662575f03ec154f35ff26b2c71" PRIMARY KEY (id);


--
-- Name: inventory_loss_calculations UQ_6da3cc3f555f3d3d30e8d21fbd4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_loss_calculations
    ADD CONSTRAINT "UQ_6da3cc3f555f3d3d30e8d21fbd4" UNIQUE (document_id);


--
-- Name: expense_categories UQ_6e1e6e388d00c18c4bb5a2206e6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT "UQ_6e1e6e388d00c18c4bb5a2206e6" UNIQUE (code);


--
-- Name: stores UQ_72bdebc754d6a689b3c169cab8a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT "UQ_72bdebc754d6a689b3c169cab8a" UNIQUE (code);


--
-- Name: products UQ_7cfc24d6c24f0ec91294003d6b8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "UQ_7cfc24d6c24f0ec91294003d6b8" UNIQUE (code);


--
-- Name: permissions UQ_8dad765629e83229da6feda1c1d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE (code);


--
-- Name: customers UQ_f2eee14aa1fe3e956fe193c142f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "UQ_f2eee14aa1fe3e956fe193c142f" UNIQUE (code);


--
-- Name: roles UQ_f6d54f95c31b73fb1bdd8e91d0c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "UQ_f6d54f95c31b73fb1bdd8e91d0c" UNIQUE (code);


--
-- Name: users UQ_fe0bb3f6520ee0469504521e710; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE (username);


--
-- Name: idx_bank_ledger_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_ledger_account ON public.bank_ledger USING btree (bank_account_id, created_at);


--
-- Name: idx_cash_deposits_shift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_deposits_shift ON public.cash_deposits USING btree (shift_id);


--
-- Name: idx_cash_deposits_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_deposits_store ON public.cash_deposits USING btree (store_id, deposit_date);


--
-- Name: idx_cash_ledger_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_ledger_store ON public.cash_ledger USING btree (store_id, created_at);


--
-- Name: idx_customer_stores_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_stores_lookup ON public.customer_stores USING btree (customer_id, store_id);


--
-- Name: idx_debt_ledger_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_debt_ledger_customer ON public.debt_ledger USING btree (customer_id, created_at);


--
-- Name: idx_expenses_shift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_shift ON public.expenses USING btree (shift_id);


--
-- Name: idx_expenses_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_store ON public.expenses USING btree (store_id, created_at);


--
-- Name: idx_inventory_ledger_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_ledger_lookup ON public.inventory_ledger USING btree (warehouse_id, product_id, created_at);


--
-- Name: idx_product_prices_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_prices_lookup ON public.product_prices USING btree (product_id, region_id, valid_from, valid_to);


--
-- Name: idx_shift_debt_sales_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_debt_sales_customer ON public.shift_debt_sales USING btree (customer_id);


--
-- Name: idx_shift_debt_sales_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_debt_sales_product ON public.shift_debt_sales USING btree (product_id);


--
-- Name: idx_shift_debt_sales_shift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shift_debt_sales_shift ON public.shift_debt_sales USING btree (shift_id);


--
-- Name: ux_shift_store_date; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_shift_store_date ON public.shifts USING btree (store_id, shift_date, shift_no);


--
-- Name: receipts FK_03db286bb378d5fb8db44b7b761; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT "FK_03db286bb378d5fb8db44b7b761" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: expenses FK_0848ee9225a5825a95d9ab1da55; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "FK_0848ee9225a5825a95d9ab1da55" FOREIGN KEY (expense_category_id) REFERENCES public.expense_categories(id);


--
-- Name: cash_deposits FK_0f1cf7bccf18a7f8ca8657df289; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_deposits
    ADD CONSTRAINT "FK_0f1cf7bccf18a7f8ca8657df289" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: sales FK_10a00ff24a92e0043beaf9c1661; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "FK_10a00ff24a92e0043beaf9c1661" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: tanks FK_12ad7a6b710243af89cf49d1049; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tanks
    ADD CONSTRAINT "FK_12ad7a6b710243af89cf49d1049" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: pumps FK_163e206d1f7fca65aecf7e86b00; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pumps
    ADD CONSTRAINT "FK_163e206d1f7fca65aecf7e86b00" FOREIGN KEY (tank_id) REFERENCES public.tanks(id);


--
-- Name: role_permissions FK_17022daf3f885f7d35423e9971e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: role_permissions FK_178199805b901ccd220ab7740ec; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: cash_ledger FK_17d5d0e7cf92a1e99c88dab55eb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_ledger
    ADD CONSTRAINT "FK_17d5d0e7cf92a1e99c88dab55eb" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: inventory_documents FK_189b0fd0da6b028c10d99135b79; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_documents
    ADD CONSTRAINT "FK_189b0fd0da6b028c10d99135b79" FOREIGN KEY (ref_shift_id) REFERENCES public.shifts(id);


--
-- Name: stores FK_20d8079f3a0833a4b044d69bc19; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT "FK_20d8079f3a0833a4b044d69bc19" FOREIGN KEY (region_id) REFERENCES public.regions(id);


--
-- Name: inventory_truck_compartments FK_20e58b8745d3821c0a41f3a79f6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_truck_compartments
    ADD CONSTRAINT "FK_20e58b8745d3821c0a41f3a79f6" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: receipt_details FK_2e8881782bed950943198d904b2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_details
    ADD CONSTRAINT "FK_2e8881782bed950943198d904b2" FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: customer_stores FK_2fd47829af8623371c451061321; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_stores
    ADD CONSTRAINT "FK_2fd47829af8623371c451061321" FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: shift_adjustments FK_349fe5de23d6fbdf6e6f604c369; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_adjustments
    ADD CONSTRAINT "FK_349fe5de23d6fbdf6e6f604c369" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: shift_debt_sales FK_37f3a7668cb8e9cf845bcea3ae0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_debt_sales
    ADD CONSTRAINT "FK_37f3a7668cb8e9cf845bcea3ae0" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: receipts FK_39bff60923066ebb4b6a46ae7fc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT "FK_39bff60923066ebb4b6a46ae7fc" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: shifts FK_39e04f82d2ccc83f89df4767a8d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT "FK_39e04f82d2ccc83f89df4767a8d" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: tanks FK_3eb887d82bb0f2744d6d01363c9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tanks
    ADD CONSTRAINT "FK_3eb887d82bb0f2744d6d01363c9" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: sales FK_5015e2759303d7baaf47fc53cc8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "FK_5015e2759303d7baaf47fc53cc8" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: pumps FK_5a9f0971140947f16efafb912dc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pumps
    ADD CONSTRAINT "FK_5a9f0971140947f16efafb912dc" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: audit_logs FK_5b72a4910a614ce2167a602977f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "FK_5b72a4910a614ce2167a602977f" FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: shift_debt_sales FK_5e3438f1b052c8171b41ff9bd44; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_debt_sales
    ADD CONSTRAINT "FK_5e3438f1b052c8171b41ff9bd44" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: bank_ledger FK_5f19c3be73494094073e93a0fb0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_ledger
    ADD CONSTRAINT "FK_5f19c3be73494094073e93a0fb0" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: pump_readings FK_5f25c3cde1b32a7f2f589642007; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pump_readings
    ADD CONSTRAINT "FK_5f25c3cde1b32a7f2f589642007" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: expenses FK_60dc343125132e11cb89abbd5aa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "FK_60dc343125132e11cb89abbd5aa" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: inventory_truck_compartments FK_62869db8770693f851701d64133; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_truck_compartments
    ADD CONSTRAINT "FK_62869db8770693f851701d64133" FOREIGN KEY (document_id) REFERENCES public.inventory_documents(id);


--
-- Name: inventory_ledger FK_6bfc43bdb3bd3dd0b3c1920acc7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_ledger
    ADD CONSTRAINT "FK_6bfc43bdb3bd3dd0b3c1920acc7" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: sales FK_6c1fae113ae666969a94d79d637; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "FK_6c1fae113ae666969a94d79d637" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: inventory_loss_calculations FK_6da3cc3f555f3d3d30e8d21fbd4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_loss_calculations
    ADD CONSTRAINT "FK_6da3cc3f555f3d3d30e8d21fbd4" FOREIGN KEY (document_id) REFERENCES public.inventory_documents(id);


--
-- Name: expenses FK_7c0c012c2f8e6578277c239ee61; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "FK_7c0c012c2f8e6578277c239ee61" FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: product_prices FK_8218c69c7f5a3706662101fa788; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_prices
    ADD CONSTRAINT "FK_8218c69c7f5a3706662101fa788" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: shift_adjustments FK_860b56606e2b1b43fdb53397e1c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_adjustments
    ADD CONSTRAINT "FK_860b56606e2b1b43fdb53397e1c" FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: pump_readings FK_864dd5ac876e007fa6126a67df8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pump_readings
    ADD CONSTRAINT "FK_864dd5ac876e007fa6126a67df8" FOREIGN KEY (pump_id) REFERENCES public.pumps(id);


--
-- Name: warehouses FK_934bc794b9487057960519b2318; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT "FK_934bc794b9487057960519b2318" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: customer_stores FK_988070e0adb9ad1266b2c3a7393; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_stores
    ADD CONSTRAINT "FK_988070e0adb9ad1266b2c3a7393" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: users FK_98a52595c9031d60f5c8d280ca4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_98a52595c9031d60f5c8d280ca4" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: user_tokens FK_9e144a67be49e5bba91195ef5de; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tokens
    ADD CONSTRAINT "FK_9e144a67be49e5bba91195ef5de" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: pumps FK_a27f91279cfb33205ffa8d89ea1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pumps
    ADD CONSTRAINT "FK_a27f91279cfb33205ffa8d89ea1" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: users FK_a2cecd1a3531c0b041e29ba46e1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: inventory_ledger FK_a576f26c6bff5945e12889eb9bc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_ledger
    ADD CONSTRAINT "FK_a576f26c6bff5945e12889eb9bc" FOREIGN KEY (tank_id) REFERENCES public.tanks(id);


--
-- Name: inventory_document_items FK_a5f3fd828dd5ae58d73a4b105b4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_document_items
    ADD CONSTRAINT "FK_a5f3fd828dd5ae58d73a4b105b4" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: product_prices FK_b1123feb1f3fbc7112d507827ce; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_prices
    ADD CONSTRAINT "FK_b1123feb1f3fbc7112d507827ce" FOREIGN KEY (region_id) REFERENCES public.regions(id);


--
-- Name: expenses FK_b8220647a9e8ba971320a94d49a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT "FK_b8220647a9e8ba971320a94d49a" FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: inventory_documents FK_bd1906a5fb15935f25cf1f864dd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_documents
    ADD CONSTRAINT "FK_bd1906a5fb15935f25cf1f864dd" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: cash_deposits FK_bdf8e90e00202d5af6ce6df0b3a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_deposits
    ADD CONSTRAINT "FK_bdf8e90e00202d5af6ce6df0b3a" FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: pump_readings FK_be01d9eccf8d39878d7b9181be7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pump_readings
    ADD CONSTRAINT "FK_be01d9eccf8d39878d7b9181be7" FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: inventory_ledger FK_c1e0ac7aaa9f72d841672ed4d71; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_ledger
    ADD CONSTRAINT "FK_c1e0ac7aaa9f72d841672ed4d71" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: sales FK_c51005b2b06cec7aa17462c54f5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "FK_c51005b2b06cec7aa17462c54f5" FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: debt_ledger FK_c7b52a38708463dea8622d6c28d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debt_ledger
    ADD CONSTRAINT "FK_c7b52a38708463dea8622d6c28d" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: inventory_document_items FK_cee3cd0fe35eda56420dd69d9c5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_document_items
    ADD CONSTRAINT "FK_cee3cd0fe35eda56420dd69d9c5" FOREIGN KEY (tank_id) REFERENCES public.tanks(id);


--
-- Name: shift_adjustments FK_d00ce9f5f177a3199b378364d7b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_adjustments
    ADD CONSTRAINT "FK_d00ce9f5f177a3199b378364d7b" FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: debt_ledger FK_d1f82b556f966e70d292aa6de89; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debt_ledger
    ADD CONSTRAINT "FK_d1f82b556f966e70d292aa6de89" FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: receipt_details FK_dea0966382acaf257eb68e30e16; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipt_details
    ADD CONSTRAINT "FK_dea0966382acaf257eb68e30e16" FOREIGN KEY (receipt_id) REFERENCES public.receipts(id);


--
-- Name: shift_debt_sales FK_f40d74abaa942cdfa970568a66c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shift_debt_sales
    ADD CONSTRAINT "FK_f40d74abaa942cdfa970568a66c" FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: cash_deposits FK_f59ec7413da98e2350e3c2d9baa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_deposits
    ADD CONSTRAINT "FK_f59ec7413da98e2350e3c2d9baa" FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: bank_ledger FK_f7d9067c7b84f0b7fd5cb5fd18a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_ledger
    ADD CONSTRAINT "FK_f7d9067c7b84f0b7fd5cb5fd18a" FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);


--
-- Name: inventory_document_items FK_ff5c9b654b5c227f10c20bb864b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_document_items
    ADD CONSTRAINT "FK_ff5c9b654b5c227f10c20bb864b" FOREIGN KEY (document_id) REFERENCES public.inventory_documents(id);


--
-- Name: cash_ledger fk_cash_ledger_shift; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_ledger
    ADD CONSTRAINT fk_cash_ledger_shift FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: debt_ledger fk_debt_ledger_shift; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debt_ledger
    ADD CONSTRAINT fk_debt_ledger_shift FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: inventory_ledger fk_inventory_ledger_shift; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_ledger
    ADD CONSTRAINT fk_inventory_ledger_shift FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Vj98Wb67QvaD3St4lUnijTRlnfR4c5N9GshKOCMqQUI80jnMMt1aMYpbyrtgtY4

