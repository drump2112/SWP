--
-- PostgreSQL database dump
--

\restrict apC1u2qf7ZcZnvR5bG7H99qLCyYfysKv5EzsiIBg28phcr2kv8Clrjoh3ipb6yc

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

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


--
-- Name: check_stock_available(integer, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_stock_available(p_batch_id integer, p_quantity numeric) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_remaining NUMERIC(18,3);
BEGIN
    SELECT remaining_quantity INTO v_remaining
    FROM import_batches
    WHERE id = p_batch_id AND status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lô hàng không tồn tại hoặc đã hết: %', p_batch_id;
    END IF;

    IF v_remaining < p_quantity THEN
        RAISE EXCEPTION 'Không đủ hàng. Còn lại: % lít, xuất: % lít', v_remaining, p_quantity;
    END IF;

    RETURN TRUE;
END;
$$;


ALTER FUNCTION public.check_stock_available(p_batch_id integer, p_quantity numeric) OWNER TO postgres;

--
-- Name: FUNCTION check_stock_available(p_batch_id integer, p_quantity numeric); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.check_stock_available(p_batch_id integer, p_quantity numeric) IS 'Kiểm tra đủ hàng trước khi xuất - throw exception nếu không đủ';


--
-- Name: get_current_stock(integer, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_current_stock(p_warehouse_id integer, p_product_id integer, p_supplier_id integer DEFAULT NULL::integer) RETURNS TABLE(supplier_id integer, supplier_name character varying, total_quantity numeric, total_batches integer, total_value numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.name,
        COALESCE(SUM(ib.remaining_quantity), 0),
        COUNT(ib.id)::INTEGER,
        COALESCE(SUM(ib.remaining_quantity * ib.final_unit_price), 0)
    FROM suppliers s
    LEFT JOIN import_batches ib ON ib.supplier_id = s.id
        AND ib.warehouse_id = p_warehouse_id
        AND ib.product_id = p_product_id
        AND ib.status = 'ACTIVE'
        AND ib.remaining_quantity > 0
    WHERE (p_supplier_id IS NULL OR s.id = p_supplier_id)
    GROUP BY s.id, s.name
    HAVING COALESCE(SUM(ib.remaining_quantity), 0) > 0
    ORDER BY s.name;
END;
$$;


ALTER FUNCTION public.get_current_stock(p_warehouse_id integer, p_product_id integer, p_supplier_id integer) OWNER TO postgres;

--
-- Name: FUNCTION get_current_stock(p_warehouse_id integer, p_product_id integer, p_supplier_id integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_current_stock(p_warehouse_id integer, p_product_id integer, p_supplier_id integer) IS 'Lấy tồn kho hiện tại theo kho, sản phẩm, nhà cung cấp';


--
-- Name: insert_opening_balance(integer, integer, integer, numeric, numeric, date, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.insert_opening_balance(p_warehouse_id integer, p_supplier_id integer, p_product_id integer, p_quantity numeric, p_unit_cost numeric, p_opening_date date DEFAULT CURRENT_DATE, p_notes text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_batch_id INTEGER;
    v_batch_code VARCHAR(50);
BEGIN
    -- Tạo mã lô tồn đầu
    v_batch_code := 'OPENING-' || p_warehouse_id || '-' || p_product_id || '-' || p_supplier_id;

    -- Kiểm tra đã có tồn đầu chưa
    SELECT id INTO v_batch_id
    FROM import_batches
    WHERE batch_code = v_batch_code;

    IF FOUND THEN
        -- Đã có -> Cập nhật
        UPDATE import_batches SET
            import_quantity = p_quantity,
            remaining_quantity = p_quantity,
            unit_price = p_unit_cost,
            final_unit_price = p_unit_cost,
            subtotal = p_quantity * p_unit_cost,
            total_amount = p_quantity * p_unit_cost,
            notes = COALESCE(p_notes, 'Tồn đầu kỳ - Cập nhật'),
            updated_at = NOW()
        WHERE id = v_batch_id;

        RAISE NOTICE 'Cập nhật tồn đầu kỳ: Kho %, NCC %, SP %, SL: %',
            p_warehouse_id, p_supplier_id, p_product_id, p_quantity;
    ELSE
        -- Chưa có -> Thêm mới
        INSERT INTO import_batches (
            batch_code, warehouse_id, supplier_id, product_id,
            import_quantity, remaining_quantity, exported_quantity,
            unit_price, discount_percent, discount_amount, final_unit_price,
            import_date, import_time,
            vat_percent, vat_amount,
            environmental_tax_rate, environmental_tax_amount,
            subtotal, total_amount,
            status, notes
        ) VALUES (
            v_batch_code, p_warehouse_id, p_supplier_id, p_product_id,
            p_quantity, p_quantity, 0,
            p_unit_cost, 0, 0, p_unit_cost,
            p_opening_date, '00:00:00',
            0, 0,
            0, 0,
            p_quantity * p_unit_cost, p_quantity * p_unit_cost,
            'ACTIVE', COALESCE(p_notes, 'Tồn đầu kỳ')
        ) RETURNING id INTO v_batch_id;

        RAISE NOTICE 'Thêm tồn đầu kỳ: Kho %, NCC %, SP %, SL: %',
            p_warehouse_id, p_supplier_id, p_product_id, p_quantity;
    END IF;

    RETURN v_batch_id;
END;
$$;


ALTER FUNCTION public.insert_opening_balance(p_warehouse_id integer, p_supplier_id integer, p_product_id integer, p_quantity numeric, p_unit_cost numeric, p_opening_date date, p_notes text) OWNER TO postgres;

--
-- Name: FUNCTION insert_opening_balance(p_warehouse_id integer, p_supplier_id integer, p_product_id integer, p_quantity numeric, p_unit_cost numeric, p_opening_date date, p_notes text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.insert_opening_balance(p_warehouse_id integer, p_supplier_id integer, p_product_id integer, p_quantity numeric, p_unit_cost numeric, p_opening_date date, p_notes text) IS 'Nhập tồn đầu kỳ khi bắt đầu sử dụng hệ thống. Nếu đã có sẽ cập nhật, chưa có sẽ thêm mới';


--
-- Name: suggest_optimal_batches(integer, integer, numeric, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.suggest_optimal_batches(p_warehouse_id integer, p_product_id integer, p_quantity numeric, p_discount_percent numeric DEFAULT 0) RETURNS TABLE(batch_id integer, batch_code character varying, supplier_name character varying, available_quantity numeric, suggested_quantity numeric, cost_price numeric, current_price numeric, after_discount_price numeric, unit_profit numeric, total_profit numeric, priority_score numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE
    remaining_qty NUMERIC := p_quantity;
    batch_rec RECORD;
BEGIN
    -- Lấy danh sách lô hàng theo thứ tự ưu tiên
    FOR batch_rec IN (
        SELECT
            v.*
        FROM v_batch_optimization v
        WHERE v.warehouse_id = p_warehouse_id
            AND v.product_id = p_product_id
        ORDER BY v.priority_score DESC
    ) LOOP
        IF remaining_qty <= 0 THEN
            EXIT;
        END IF;

        batch_id := batch_rec.batch_id;
        batch_code := batch_rec.batch_code;
        supplier_name := batch_rec.supplier_name;
        available_quantity := batch_rec.remaining_quantity;
        suggested_quantity := LEAST(batch_rec.remaining_quantity, remaining_qty);
        cost_price := batch_rec.cost_price;
        current_price := batch_rec.current_market_price;
        after_discount_price := batch_rec.current_market_price * (1 - p_discount_percent / 100);
        unit_profit := after_discount_price - batch_rec.cost_price;
        total_profit := unit_profit * suggested_quantity;
        priority_score := batch_rec.priority_score;

        remaining_qty := remaining_qty - suggested_quantity;

        RETURN NEXT;
    END LOOP;
END;
$$;


ALTER FUNCTION public.suggest_optimal_batches(p_warehouse_id integer, p_product_id integer, p_quantity numeric, p_discount_percent numeric) OWNER TO postgres;

--
-- Name: FUNCTION suggest_optimal_batches(p_warehouse_id integer, p_product_id integer, p_quantity numeric, p_discount_percent numeric); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.suggest_optimal_batches(p_warehouse_id integer, p_product_id integer, p_quantity numeric, p_discount_percent numeric) IS 'Gợi ý lô hàng tối ưu khi xuất - tự động phân bổ số lượng';


--
-- Name: update_batch_on_export(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_batch_on_export() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    qty_diff NUMERIC(18,3);
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Thêm mới: Trừ tồn kho
        UPDATE import_batches SET
            remaining_quantity = remaining_quantity - NEW.quantity,
            exported_quantity = exported_quantity + NEW.quantity,
            status = CASE
                WHEN remaining_quantity - NEW.quantity <= 0 THEN 'DEPLETED'
                ELSE 'ACTIVE'
            END,
            updated_at = NOW()
        WHERE id = NEW.import_batch_id;

        -- Kiểm tra có đủ hàng không
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Lô hàng không tồn tại: %', NEW.import_batch_id;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Sửa: Hoàn trả số cũ, trừ số mới
        qty_diff := NEW.quantity - OLD.quantity;

        -- Nếu đổi lô hàng
        IF NEW.import_batch_id != OLD.import_batch_id THEN
            -- Hoàn trả lô cũ
            UPDATE import_batches SET
                remaining_quantity = remaining_quantity + OLD.quantity,
                exported_quantity = exported_quantity - OLD.quantity,
                status = 'ACTIVE',
                updated_at = NOW()
            WHERE id = OLD.import_batch_id;

            -- Trừ từ lô mới
            UPDATE import_batches SET
                remaining_quantity = remaining_quantity - NEW.quantity,
                exported_quantity = exported_quantity + NEW.quantity,
                status = CASE
                    WHEN remaining_quantity - NEW.quantity <= 0 THEN 'DEPLETED'
                    ELSE 'ACTIVE'
                END,
                updated_at = NOW()
            WHERE id = NEW.import_batch_id;
        ELSE
            -- Cùng lô: Chỉ điều chỉnh số lượng
            UPDATE import_batches SET
                remaining_quantity = remaining_quantity - qty_diff,
                exported_quantity = exported_quantity + qty_diff,
                status = CASE
                    WHEN remaining_quantity - qty_diff <= 0 THEN 'DEPLETED'
                    ELSE 'ACTIVE'
                END,
                updated_at = NOW()
            WHERE id = NEW.import_batch_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        -- Xóa: Hoàn trả toàn bộ
        UPDATE import_batches SET
            remaining_quantity = remaining_quantity + OLD.quantity,
            exported_quantity = exported_quantity - OLD.quantity,
            status = 'ACTIVE',
            updated_at = NOW()
        WHERE id = OLD.import_batch_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.update_batch_on_export() OWNER TO postgres;

--
-- Name: update_customer_debt(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_customer_debt() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_balance NUMERIC(18,2);
BEGIN
    -- Tính số dư hiện tại
    SELECT COALESCE(SUM(debit - credit), 0)
    INTO current_balance
    FROM commercial_debt_ledger
    WHERE customer_id = NEW.customer_id;

    -- Cập nhật số dư vào bản ghi mới
    NEW.balance := current_balance + NEW.debit - NEW.credit;

    -- Cập nhật vào bảng khách hàng
    UPDATE commercial_customers SET
        current_debt = NEW.balance,
        updated_at = NOW()
    WHERE id = NEW.customer_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_customer_debt() OWNER TO postgres;

--
-- Name: update_export_order_totals(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_export_order_totals() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE export_orders SET
        subtotal = (SELECT COALESCE(SUM(subtotal), 0) FROM export_order_items WHERE export_order_id = COALESCE(NEW.export_order_id, OLD.export_order_id)),
        total_discount = (SELECT COALESCE(SUM(discount_amount), 0) FROM export_order_items WHERE export_order_id = COALESCE(NEW.export_order_id, OLD.export_order_id)),
        total_vat = (SELECT COALESCE(SUM(vat_amount), 0) FROM export_order_items WHERE export_order_id = COALESCE(NEW.export_order_id, OLD.export_order_id)),
        total_environmental_tax = (SELECT COALESCE(SUM(environmental_tax_amount), 0) FROM export_order_items WHERE export_order_id = COALESCE(NEW.export_order_id, OLD.export_order_id)),
        total_amount = (SELECT COALESCE(SUM(total_amount), 0) FROM export_order_items WHERE export_order_id = COALESCE(NEW.export_order_id, OLD.export_order_id)),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.export_order_id, OLD.export_order_id);

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.update_export_order_totals() OWNER TO postgres;

--
-- Name: update_inventory_on_import(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_inventory_on_import() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Upsert vào bảng tổng hợp tồn kho
    INSERT INTO commercial_inventory_summary (
        warehouse_id, product_id, supplier_id,
        total_quantity, total_value, total_batches,
        oldest_batch_date, newest_batch_date
    )
    VALUES (
        NEW.warehouse_id, NEW.product_id, NEW.supplier_id,
        NEW.import_quantity,
        NEW.total_amount,
        1,
        NEW.import_date,
        NEW.import_date
    )
    ON CONFLICT (warehouse_id, product_id, supplier_id)
    DO UPDATE SET
        total_quantity = commercial_inventory_summary.total_quantity + NEW.import_quantity,
        total_value = commercial_inventory_summary.total_value + NEW.total_amount,
        total_batches = commercial_inventory_summary.total_batches + 1,
        oldest_batch_date = LEAST(commercial_inventory_summary.oldest_batch_date, NEW.import_date),
        newest_batch_date = GREATEST(commercial_inventory_summary.newest_batch_date, NEW.import_date),
        updated_at = NOW();

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_inventory_on_import() OWNER TO postgres;

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
    deposit_date date,
    deposit_time time without time zone,
    receiver_name character varying(100),
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    payment_method character varying(20) DEFAULT 'CASH'::character varying NOT NULL,
    deposit_at timestamp without time zone,
    ref_type character varying(50) DEFAULT NULL::character varying
);


ALTER TABLE public.cash_deposits OWNER TO postgres;

--
-- Name: COLUMN cash_deposits.deposit_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cash_deposits.deposit_at IS 'Thời gian nộp tiền do người dùng chọn';


--
-- Name: COLUMN cash_deposits.ref_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cash_deposits.ref_type IS 'RETAIL = nộp tiền bán lẻ, RECEIPT = nộp tiền từ phiếu thu nợ';


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
    superseded_by_shift_id integer,
    shift_id integer,
    ledger_at timestamp without time zone
);


ALTER TABLE public.cash_ledger OWNER TO postgres;

--
-- Name: COLUMN cash_ledger.ledger_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.cash_ledger.ledger_at IS 'Thời gian giao dịch do người dùng chọn (theo closedAt của ca)';


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
-- Name: commercial_customer_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.commercial_customer_groups (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    credit_limit numeric(18,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.commercial_customer_groups OWNER TO postgres;

--
-- Name: TABLE commercial_customer_groups; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.commercial_customer_groups IS 'Nhóm khách hàng: Đại lý 1, Đại lý 2, Cửa hàng, VIP...';


--
-- Name: COLUMN commercial_customer_groups.credit_limit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.commercial_customer_groups.credit_limit IS 'Hạn mức công nợ mặc định - áp dụng khi tạo khách hàng mới';


--
-- Name: commercial_customer_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.commercial_customer_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.commercial_customer_groups_id_seq OWNER TO postgres;

--
-- Name: commercial_customer_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.commercial_customer_groups_id_seq OWNED BY public.commercial_customer_groups.id;


--
-- Name: commercial_customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.commercial_customers (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    customer_group_id integer,
    tax_code character varying(50),
    address character varying(500),
    phone character varying(20),
    email character varying(100),
    contact_person character varying(100),
    credit_limit numeric(18,2) DEFAULT 0,
    current_debt numeric(18,2) DEFAULT 0,
    payment_terms character varying(100),
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.commercial_customers OWNER TO postgres;

--
-- Name: TABLE commercial_customers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.commercial_customers IS 'Khách hàng thương mại: Đại lý, Cửa hàng con (CH10, CH11...), Công ty...';


--
-- Name: COLUMN commercial_customers.current_debt; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.commercial_customers.current_debt IS 'Công nợ hiện tại - cập nhật real-time';


--
-- Name: commercial_customers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.commercial_customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.commercial_customers_id_seq OWNER TO postgres;

--
-- Name: commercial_customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.commercial_customers_id_seq OWNED BY public.commercial_customers.id;


--
-- Name: commercial_debt_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.commercial_debt_ledger (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    warehouse_id integer,
    ref_type character varying(50) NOT NULL,
    ref_id integer,
    debit numeric(18,2) DEFAULT 0 NOT NULL,
    credit numeric(18,2) DEFAULT 0 NOT NULL,
    balance numeric(18,2) DEFAULT 0,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.commercial_debt_ledger OWNER TO postgres;

--
-- Name: TABLE commercial_debt_ledger; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.commercial_debt_ledger IS 'Sổ công nợ khách hàng thương mại';


--
-- Name: COLUMN commercial_debt_ledger.balance; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.commercial_debt_ledger.balance IS 'Số dư sau giao dịch - tăng tốc query';


--
-- Name: commercial_debt_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.commercial_debt_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.commercial_debt_ledger_id_seq OWNER TO postgres;

--
-- Name: commercial_debt_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.commercial_debt_ledger_id_seq OWNED BY public.commercial_debt_ledger.id;


--
-- Name: commercial_debt_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.commercial_debt_payments (
    id integer NOT NULL,
    payment_code character varying(50) NOT NULL,
    customer_id integer NOT NULL,
    warehouse_id integer,
    payment_date date NOT NULL,
    payment_time time without time zone,
    amount numeric(18,2) NOT NULL,
    payment_method character varying(20) NOT NULL,
    bank_name character varying(100),
    bank_account character varying(50),
    transaction_ref character varying(100),
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.commercial_debt_payments OWNER TO postgres;

--
-- Name: TABLE commercial_debt_payments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.commercial_debt_payments IS 'Phiếu thu thanh toán công nợ';


--
-- Name: commercial_debt_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.commercial_debt_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.commercial_debt_payments_id_seq OWNER TO postgres;

--
-- Name: commercial_debt_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.commercial_debt_payments_id_seq OWNED BY public.commercial_debt_payments.id;


--
-- Name: commercial_inventory_summary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.commercial_inventory_summary (
    id integer NOT NULL,
    warehouse_id integer NOT NULL,
    product_id integer NOT NULL,
    supplier_id integer NOT NULL,
    total_quantity numeric(18,3) DEFAULT 0,
    total_value numeric(18,2) DEFAULT 0,
    average_cost numeric(18,2) DEFAULT 0,
    total_batches integer DEFAULT 0,
    oldest_batch_date date,
    newest_batch_date date,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.commercial_inventory_summary OWNER TO postgres;

--
-- Name: TABLE commercial_inventory_summary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.commercial_inventory_summary IS 'Tổng hợp tồn kho - cập nhật real-time qua trigger';


--
-- Name: COLUMN commercial_inventory_summary.average_cost; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.commercial_inventory_summary.average_cost IS 'Giá vốn bình quân gia quyền';


--
-- Name: commercial_inventory_summary_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.commercial_inventory_summary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.commercial_inventory_summary_id_seq OWNER TO postgres;

--
-- Name: commercial_inventory_summary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.commercial_inventory_summary_id_seq OWNED BY public.commercial_inventory_summary.id;


--
-- Name: commercial_warehouses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.commercial_warehouses (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    address character varying(500),
    capacity numeric(18,3),
    manager_name character varying(100),
    phone character varying(20),
    region_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.commercial_warehouses OWNER TO postgres;

--
-- Name: TABLE commercial_warehouses; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.commercial_warehouses IS 'Kho hàng thương mại - riêng biệt với cửa hàng bán lẻ';


--
-- Name: commercial_warehouses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.commercial_warehouses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.commercial_warehouses_id_seq OWNER TO postgres;

--
-- Name: commercial_warehouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.commercial_warehouses_id_seq OWNED BY public.commercial_warehouses.id;


--
-- Name: customer_stores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_stores (
    customer_id integer NOT NULL,
    store_id integer NOT NULL,
    credit_limit numeric(15,2),
    bypass_credit_limit boolean DEFAULT false,
    bypass_until timestamp without time zone
);


ALTER TABLE public.customer_stores OWNER TO postgres;

--
-- Name: COLUMN customer_stores.bypass_credit_limit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.customer_stores.bypass_credit_limit IS 'Bỏ qua check hạn mức cho cửa hàng cụ thể';


--
-- Name: COLUMN customer_stores.bypass_until; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.customer_stores.bypass_until IS 'Thời hạn bypass, NULL = vô thời hạn';


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
    type character varying(20) DEFAULT 'EXTERNAL'::character varying NOT NULL,
    bypass_credit_limit boolean DEFAULT false,
    bypass_until timestamp without time zone,
    is_active boolean DEFAULT true
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: COLUMN customers.bypass_credit_limit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.customers.bypass_credit_limit IS 'Bỏ qua check hạn mức cho TẤT CẢ cửa hàng';


--
-- Name: COLUMN customers.bypass_until; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.customers.bypass_until IS 'Thời hạn bypass, NULL = vô thời hạn';


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
    superseded_by_shift_id integer,
    shift_id integer,
    ledger_at timestamp without time zone
);


ALTER TABLE public.debt_ledger OWNER TO postgres;

--
-- Name: COLUMN debt_ledger.ledger_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.debt_ledger.ledger_at IS 'Thời gian giao dịch do người dùng chọn (theo closedAt của ca)';


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
-- Name: export_order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.export_order_items (
    id integer NOT NULL,
    export_order_id integer NOT NULL,
    import_batch_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(18,3) NOT NULL,
    batch_unit_price numeric(18,2) NOT NULL,
    selling_price numeric(18,2) NOT NULL,
    markup_percent numeric(5,2) DEFAULT 0,
    discount_percent numeric(5,2) DEFAULT 0,
    discount_amount numeric(18,2) DEFAULT 0,
    vat_percent numeric(5,2) DEFAULT 0,
    vat_amount numeric(18,2) DEFAULT 0,
    environmental_tax_rate numeric(10,2) DEFAULT 0,
    environmental_tax_amount numeric(18,2) DEFAULT 0,
    subtotal numeric(18,2) NOT NULL,
    total_amount numeric(18,2) NOT NULL,
    profit_amount numeric(18,2) DEFAULT 0,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    customer_id integer
);


ALTER TABLE public.export_order_items OWNER TO postgres;

--
-- Name: TABLE export_order_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.export_order_items IS 'Chi tiết đơn xuất - mỗi dòng link đến 1 lô nhập cụ thể. SERVICE LAYER tính toán: subtotal, discount_amount, vat_amount, environmental_tax_amount, total_amount, profit_amount';


--
-- Name: COLUMN export_order_items.import_batch_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.export_order_items.import_batch_id IS 'QUAN TRỌNG: Liên kết đến lô hàng nhập để truy xuất nguồn gốc';


--
-- Name: COLUMN export_order_items.discount_percent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.export_order_items.discount_percent IS 'Chiết khấu do NGƯỜI DÙNG NHẬP khi tạo đơn xuất, không tự động';


--
-- Name: COLUMN export_order_items.environmental_tax_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.export_order_items.environmental_tax_rate IS 'Thuế BVMT theo đơn vị (VD: 2000đ/lít xăng)';


--
-- Name: COLUMN export_order_items.profit_amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.export_order_items.profit_amount IS 'Lợi nhuận gộp của dòng hàng';


--
-- Name: export_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.export_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.export_order_items_id_seq OWNER TO postgres;

--
-- Name: export_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.export_order_items_id_seq OWNED BY public.export_order_items.id;


--
-- Name: export_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.export_orders (
    id integer NOT NULL,
    order_code character varying(50) NOT NULL,
    warehouse_id integer,
    customer_id integer NOT NULL,
    order_date date NOT NULL,
    order_time time without time zone,
    delivery_date date,
    delivery_address character varying(500),
    vehicle_number character varying(50),
    driver_name character varying(100),
    driver_phone character varying(20),
    subtotal numeric(18,2) DEFAULT 0,
    total_discount numeric(18,2) DEFAULT 0,
    total_vat numeric(18,2) DEFAULT 0,
    total_environmental_tax numeric(18,2) DEFAULT 0,
    total_amount numeric(18,2) DEFAULT 0,
    payment_method character varying(20) DEFAULT 'DEBT'::character varying,
    payment_status character varying(20) DEFAULT 'UNPAID'::character varying,
    paid_amount numeric(18,2) DEFAULT 0,
    debt_amount numeric(18,2) DEFAULT 0,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    notes text,
    created_by integer,
    approved_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.export_orders OWNER TO postgres;

--
-- Name: TABLE export_orders; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.export_orders IS 'Đơn xuất hàng thương mại';


--
-- Name: COLUMN export_orders.total_environmental_tax; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.export_orders.total_environmental_tax IS 'Tổng thuế bảo vệ môi trường';


--
-- Name: export_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.export_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.export_orders_id_seq OWNER TO postgres;

--
-- Name: export_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.export_orders_id_seq OWNED BY public.export_orders.id;


--
-- Name: import_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_batches (
    id integer NOT NULL,
    batch_code character varying(50) NOT NULL,
    warehouse_id integer NOT NULL,
    supplier_id integer NOT NULL,
    product_id integer NOT NULL,
    price_at_import numeric(18,2),
    import_quantity numeric(18,3) NOT NULL,
    remaining_quantity numeric(18,3) NOT NULL,
    exported_quantity numeric(18,3) DEFAULT 0,
    unit_price numeric(18,2) NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0,
    discount_amount numeric(18,2) DEFAULT 0,
    final_unit_price numeric(18,2) NOT NULL,
    import_date date NOT NULL,
    import_time time without time zone,
    invoice_number character varying(100),
    vehicle_number character varying(50),
    vat_percent numeric(5,2) DEFAULT 0,
    vat_amount numeric(18,2) DEFAULT 0,
    environmental_tax_rate numeric(10,2) DEFAULT 0,
    environmental_tax_amount numeric(18,2) DEFAULT 0,
    subtotal numeric(18,2) NOT NULL,
    total_amount numeric(18,2) NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    discount_per_unit numeric(18,2) DEFAULT 0 NOT NULL,
    CONSTRAINT chk_quantities_valid CHECK (((exported_quantity >= (0)::numeric) AND (import_quantity >= (0)::numeric))),
    CONSTRAINT chk_remaining_not_negative CHECK ((remaining_quantity >= (0)::numeric))
);


ALTER TABLE public.import_batches OWNER TO postgres;

--
-- Name: TABLE import_batches; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.import_batches IS 'Lô hàng nhập - quản lý tồn kho theo batch (FIFO/FEFO). SERVICE LAYER tính toán các trường: discount_amount, final_unit_price, subtotal, vat_amount, environmental_tax_amount, total_amount';


--
-- Name: COLUMN import_batches.remaining_quantity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.import_batches.remaining_quantity IS 'Số lượng còn lại - TỰ ĐỘNG cập nhật bởi trigger khi xuất hàng';


--
-- Name: COLUMN import_batches.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.import_batches.status IS 'ACTIVE: còn hàng, DEPLETED: hết hàng, CANCELLED: hủy - TỰ ĐỘNG cập nhật bởi trigger';


--
-- Name: import_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.import_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.import_batches_id_seq OWNER TO postgres;

--
-- Name: import_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.import_batches_id_seq OWNED BY public.import_batches.id;


--
-- Name: inventory_checks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_checks (
    id integer NOT NULL,
    store_id integer NOT NULL,
    shift_id integer,
    check_at timestamp without time zone DEFAULT now() NOT NULL,
    member1_name character varying(100),
    member2_name character varying(100),
    tank_data jsonb,
    pump_data jsonb,
    reason text,
    conclusion text,
    total_difference numeric(15,3) DEFAULT 0,
    status character varying(20) DEFAULT 'DRAFT'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.inventory_checks OWNER TO postgres;

--
-- Name: inventory_checks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_checks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.inventory_checks_id_seq OWNER TO postgres;

--
-- Name: inventory_checks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_checks_id_seq OWNED BY public.inventory_checks.id;


--
-- Name: inventory_closing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_closing (
    id integer NOT NULL,
    store_id integer NOT NULL,
    tank_id integer NOT NULL,
    period_from date NOT NULL,
    period_to date NOT NULL,
    closing_date timestamp without time zone NOT NULL,
    opening_balance numeric(15,3) NOT NULL,
    import_quantity numeric(15,3) NOT NULL,
    export_quantity numeric(15,3) NOT NULL,
    loss_rate numeric(10,6) NOT NULL,
    loss_amount numeric(15,3) NOT NULL,
    closing_balance numeric(15,3) NOT NULL,
    loss_config_id integer,
    product_category character varying(20),
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.inventory_closing OWNER TO postgres;

--
-- Name: inventory_closing_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_closing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.inventory_closing_id_seq OWNER TO postgres;

--
-- Name: inventory_closing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_closing_id_seq OWNED BY public.inventory_closing.id;


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
    license_plate character varying(20),
    doc_at timestamp without time zone
);


ALTER TABLE public.inventory_documents OWNER TO postgres;

--
-- Name: COLUMN inventory_documents.doc_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.inventory_documents.doc_at IS 'Thời gian nhập hàng do người dùng chọn';


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
    superseded_by_shift_id integer,
    shift_id integer
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
-- Name: TABLE product_prices; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.product_prices IS 'Kì giá sản phẩm - DÙNG CHUNG cho bán lẻ và thương mại';


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
    is_fuel boolean DEFAULT false NOT NULL,
    category character varying(20) DEFAULT 'GASOLINE'::character varying
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
    unit_price numeric(18,2),
    test_export numeric(18,3) DEFAULT '0'::numeric
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
    payment_method character varying(20) DEFAULT 'CASH'::character varying NOT NULL,
    notes text,
    receipt_at timestamp without time zone
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
-- Name: COLUMN roles.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.roles.code IS 'Role codes: SUPER_ADMIN (highest), ADMIN, DIRECTOR, SALES, ACCOUNTING, STORE';


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
-- Name: shift_checkpoint_readings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shift_checkpoint_readings (
    id integer NOT NULL,
    checkpoint_id integer NOT NULL,
    pump_id integer,
    pump_code character varying(50),
    product_id integer NOT NULL,
    meter_value numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.shift_checkpoint_readings OWNER TO postgres;

--
-- Name: TABLE shift_checkpoint_readings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.shift_checkpoint_readings IS 'Số đồng hồ vòi bơm ghi nhận tại thời điểm kiểm kê';


--
-- Name: COLUMN shift_checkpoint_readings.meter_value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shift_checkpoint_readings.meter_value IS 'Số đồng hồ tại thời điểm kiểm kê';


--
-- Name: shift_checkpoint_readings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shift_checkpoint_readings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.shift_checkpoint_readings_id_seq OWNER TO postgres;

--
-- Name: shift_checkpoint_readings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shift_checkpoint_readings_id_seq OWNED BY public.shift_checkpoint_readings.id;


--
-- Name: shift_checkpoint_stocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shift_checkpoint_stocks (
    id integer NOT NULL,
    checkpoint_id integer NOT NULL,
    tank_id integer NOT NULL,
    product_id integer,
    system_quantity numeric(15,2),
    actual_quantity numeric(15,2) NOT NULL,
    difference numeric(15,2) GENERATED ALWAYS AS ((actual_quantity - COALESCE(system_quantity, (0)::numeric))) STORED,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.shift_checkpoint_stocks OWNER TO postgres;

--
-- Name: TABLE shift_checkpoint_stocks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.shift_checkpoint_stocks IS 'Tồn kho thực tế bể ghi nhận tại thời điểm kiểm kê';


--
-- Name: COLUMN shift_checkpoint_stocks.system_quantity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shift_checkpoint_stocks.system_quantity IS 'Tồn kho hệ thống tính tại thời điểm kiểm kê';


--
-- Name: COLUMN shift_checkpoint_stocks.actual_quantity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shift_checkpoint_stocks.actual_quantity IS 'Tồn kho thực tế đo được';


--
-- Name: COLUMN shift_checkpoint_stocks.difference; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shift_checkpoint_stocks.difference IS 'Chênh lệch = Thực tế - Hệ thống (tự động tính)';


--
-- Name: shift_checkpoint_stocks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shift_checkpoint_stocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.shift_checkpoint_stocks_id_seq OWNER TO postgres;

--
-- Name: shift_checkpoint_stocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shift_checkpoint_stocks_id_seq OWNED BY public.shift_checkpoint_stocks.id;


--
-- Name: shift_checkpoints; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shift_checkpoints (
    id integer NOT NULL,
    shift_id integer NOT NULL,
    checkpoint_no integer DEFAULT 1 NOT NULL,
    checkpoint_at timestamp without time zone NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.shift_checkpoints OWNER TO postgres;

--
-- Name: TABLE shift_checkpoints; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.shift_checkpoints IS 'Mốc kiểm kê trong ca - ghi nhận thời điểm kiểm kê mà không cần chốt ca';


--
-- Name: COLUMN shift_checkpoints.checkpoint_no; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shift_checkpoints.checkpoint_no IS 'Số thứ tự checkpoint trong ca (1, 2, 3...)';


--
-- Name: COLUMN shift_checkpoints.checkpoint_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shift_checkpoints.checkpoint_at IS 'Thời điểm thực hiện kiểm kê';


--
-- Name: shift_checkpoints_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shift_checkpoints_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.shift_checkpoints_id_seq OWNER TO postgres;

--
-- Name: shift_checkpoints_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shift_checkpoints_id_seq OWNED BY public.shift_checkpoints.id;


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
    is_active boolean DEFAULT true NOT NULL,
    receiver_name character varying(255),
    handover_name character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    opening_stock_json json
);


ALTER TABLE public.shifts OWNER TO postgres;

--
-- Name: COLUMN shifts.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shifts.created_at IS 'Thời gian tạo ca để kiểm soát/logging';


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
-- Name: store_loss_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.store_loss_config (
    id integer NOT NULL,
    store_id integer NOT NULL,
    product_category character varying(20) NOT NULL,
    loss_rate numeric(10,6) NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.store_loss_config OWNER TO postgres;

--
-- Name: store_loss_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.store_loss_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.store_loss_config_id_seq OWNER TO postgres;

--
-- Name: store_loss_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.store_loss_config_id_seq OWNED BY public.store_loss_config.id;


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
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    tax_code character varying(50),
    address character varying(500),
    phone character varying(20),
    email character varying(100),
    contact_person character varying(100),
    bank_account character varying(50),
    bank_name character varying(100),
    payment_terms character varying(100),
    credit_limit numeric(18,2) DEFAULT 0,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: TABLE suppliers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.suppliers IS 'Nhà cung cấp xăng dầu';


--
-- Name: COLUMN suppliers.payment_terms; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.suppliers.payment_terms IS 'VD: 30 ngày, 60 ngày, COD';


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.suppliers_id_seq OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


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
-- Name: v_batch_inventory; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_batch_inventory AS
 SELECT ib.id AS batch_id,
    ib.batch_code,
    w.code AS warehouse_code,
    w.name AS warehouse_name,
    s.code AS supplier_code,
    s.name AS supplier_name,
    p.code AS product_code,
    p.name AS product_name,
    ib.import_date,
    ib.import_quantity,
    ib.remaining_quantity,
    ib.exported_quantity,
    ib.final_unit_price,
    (ib.remaining_quantity * ib.final_unit_price) AS remaining_value,
    ib.status,
    (CURRENT_DATE - ib.import_date) AS age_days
   FROM (((public.import_batches ib
     JOIN public.commercial_warehouses w ON ((ib.warehouse_id = w.id)))
     JOIN public.suppliers s ON ((ib.supplier_id = s.id)))
     JOIN public.products p ON ((ib.product_id = p.id)))
  WHERE (((ib.status)::text = 'ACTIVE'::text) AND (ib.remaining_quantity > (0)::numeric));


ALTER TABLE public.v_batch_inventory OWNER TO postgres;

--
-- Name: VIEW v_batch_inventory; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_batch_inventory IS 'Tồn kho chi tiết theo lô - dễ query';


--
-- Name: v_batch_optimization; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_batch_optimization AS
 SELECT ib.id AS batch_id,
    ib.batch_code,
    ib.warehouse_id,
    ib.product_id,
    ib.supplier_id,
    w.name AS warehouse_name,
    s.name AS supplier_name,
    p.name AS product_name,
    ib.remaining_quantity,
    ib.final_unit_price AS cost_price,
    COALESCE(pp.price, (ib.final_unit_price * 1.1)) AS current_market_price,
    (COALESCE(pp.price, (ib.final_unit_price * 1.1)) - ib.final_unit_price) AS unit_profit,
    ((COALESCE(pp.price, (ib.final_unit_price * 1.1)) - ib.final_unit_price) * ib.remaining_quantity) AS total_potential_profit,
    round((((COALESCE(pp.price, (ib.final_unit_price * 1.1)) - ib.final_unit_price) / ib.final_unit_price) * (100)::numeric), 2) AS profit_margin_percent,
    ib.import_date,
    (CURRENT_DATE - ib.import_date) AS age_days,
    round((((((COALESCE(pp.price, (ib.final_unit_price * 1.1)) - ib.final_unit_price) / ib.final_unit_price) * (100)::numeric) * 0.7) + (((((CURRENT_DATE - ib.import_date))::numeric / 365.0) * (100)::numeric) * 0.3)), 2) AS priority_score
   FROM ((((public.import_batches ib
     JOIN public.commercial_warehouses w ON ((ib.warehouse_id = w.id)))
     JOIN public.suppliers s ON ((ib.supplier_id = s.id)))
     JOIN public.products p ON ((ib.product_id = p.id)))
     LEFT JOIN public.product_prices pp ON (((pp.product_id = ib.product_id) AND (pp.region_id = w.region_id) AND (pp.valid_from <= now()) AND ((pp.valid_to IS NULL) OR (pp.valid_to >= now())))))
  WHERE (((ib.status)::text = 'ACTIVE'::text) AND (ib.remaining_quantity > (0)::numeric))
  ORDER BY (round((((((COALESCE(pp.price, (ib.final_unit_price * 1.1)) - ib.final_unit_price) / ib.final_unit_price) * (100)::numeric) * 0.7) + (((((CURRENT_DATE - ib.import_date))::numeric / 365.0) * (100)::numeric) * 0.3)), 2)) DESC;


ALTER TABLE public.v_batch_optimization OWNER TO postgres;

--
-- Name: VIEW v_batch_optimization; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_batch_optimization IS 'Gợi ý lô hàng tối ưu - ưu tiên lợi nhuận cao và hàng cũ';


--
-- Name: v_batch_revenue_report; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_batch_revenue_report AS
 SELECT ib.id AS batch_id,
    ib.batch_code,
    w.name AS warehouse_name,
    s.name AS supplier_name,
    p.name AS product_name,
    ib.import_date,
    ib.import_quantity,
    ib.exported_quantity,
    ib.remaining_quantity,
    ib.final_unit_price AS cost_price,
    COALESCE(sum((eoi.quantity * eoi.selling_price)), (0)::numeric) AS total_revenue,
    COALESCE(sum((eoi.quantity * ib.final_unit_price)), (0)::numeric) AS total_cost,
    COALESCE(sum(eoi.profit_amount), (0)::numeric) AS gross_profit,
    COALESCE(sum(eoi.environmental_tax_amount), (0)::numeric) AS total_env_tax,
    count(DISTINCT eoi.export_order_id) AS total_orders
   FROM ((((public.import_batches ib
     JOIN public.commercial_warehouses w ON ((ib.warehouse_id = w.id)))
     JOIN public.suppliers s ON ((ib.supplier_id = s.id)))
     JOIN public.products p ON ((ib.product_id = p.id)))
     LEFT JOIN public.export_order_items eoi ON ((ib.id = eoi.import_batch_id)))
  GROUP BY ib.id, ib.batch_code, w.name, s.name, p.name, ib.import_date, ib.import_quantity, ib.exported_quantity, ib.remaining_quantity, ib.final_unit_price;


ALTER TABLE public.v_batch_revenue_report OWNER TO postgres;

--
-- Name: VIEW v_batch_revenue_report; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_batch_revenue_report IS 'Báo cáo doanh thu và lợi nhuận theo lô hàng';


--
-- Name: v_customer_debt_report; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_customer_debt_report AS
 SELECT c.id AS customer_id,
    c.code AS customer_code,
    c.name AS customer_name,
    cg.name AS customer_group,
    c.credit_limit,
    c.current_debt,
    (c.credit_limit - c.current_debt) AS available_credit,
    round(((c.current_debt / NULLIF(c.credit_limit, (0)::numeric)) * (100)::numeric), 2) AS debt_usage_percent,
        CASE
            WHEN (c.current_debt > c.credit_limit) THEN (c.current_debt - c.credit_limit)
            ELSE (0)::numeric
        END AS overdue_amount
   FROM (public.commercial_customers c
     LEFT JOIN public.commercial_customer_groups cg ON ((c.customer_group_id = cg.id)))
  WHERE (c.is_active = true)
  ORDER BY c.current_debt DESC;


ALTER TABLE public.v_customer_debt_report OWNER TO postgres;

--
-- Name: VIEW v_customer_debt_report; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_customer_debt_report IS 'Báo cáo công nợ khách hàng';


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
-- Name: commercial_customer_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_customer_groups ALTER COLUMN id SET DEFAULT nextval('public.commercial_customer_groups_id_seq'::regclass);


--
-- Name: commercial_customers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_customers ALTER COLUMN id SET DEFAULT nextval('public.commercial_customers_id_seq'::regclass);


--
-- Name: commercial_debt_ledger id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_debt_ledger ALTER COLUMN id SET DEFAULT nextval('public.commercial_debt_ledger_id_seq'::regclass);


--
-- Name: commercial_debt_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_debt_payments ALTER COLUMN id SET DEFAULT nextval('public.commercial_debt_payments_id_seq'::regclass);


--
-- Name: commercial_inventory_summary id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_inventory_summary ALTER COLUMN id SET DEFAULT nextval('public.commercial_inventory_summary_id_seq'::regclass);


--
-- Name: commercial_warehouses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_warehouses ALTER COLUMN id SET DEFAULT nextval('public.commercial_warehouses_id_seq'::regclass);


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
-- Name: export_order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_order_items ALTER COLUMN id SET DEFAULT nextval('public.export_order_items_id_seq'::regclass);


--
-- Name: export_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_orders ALTER COLUMN id SET DEFAULT nextval('public.export_orders_id_seq'::regclass);


--
-- Name: import_batches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches ALTER COLUMN id SET DEFAULT nextval('public.import_batches_id_seq'::regclass);


--
-- Name: inventory_checks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_checks ALTER COLUMN id SET DEFAULT nextval('public.inventory_checks_id_seq'::regclass);


--
-- Name: inventory_closing id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_closing ALTER COLUMN id SET DEFAULT nextval('public.inventory_closing_id_seq'::regclass);


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
-- Name: shift_checkpoint_readings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_checkpoint_readings ALTER COLUMN id SET DEFAULT nextval('public.shift_checkpoint_readings_id_seq'::regclass);


--
-- Name: shift_checkpoint_stocks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_checkpoint_stocks ALTER COLUMN id SET DEFAULT nextval('public.shift_checkpoint_stocks_id_seq'::regclass);


--
-- Name: shift_checkpoints id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_checkpoints ALTER COLUMN id SET DEFAULT nextval('public.shift_checkpoints_id_seq'::regclass);


--
-- Name: shift_debt_sales id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_debt_sales ALTER COLUMN id SET DEFAULT nextval('public.shift_debt_sales_id_seq'::regclass);


--
-- Name: shifts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts ALTER COLUMN id SET DEFAULT nextval('public.shifts_id_seq'::regclass);


--
-- Name: store_loss_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_loss_config ALTER COLUMN id SET DEFAULT nextval('public.store_loss_config_id_seq'::regclass);


--
-- Name: stores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stores ALTER COLUMN id SET DEFAULT nextval('public.stores_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


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
-- Name: commercial_customer_groups commercial_customer_groups_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_customer_groups
    ADD CONSTRAINT commercial_customer_groups_code_key UNIQUE (code);


--
-- Name: commercial_customer_groups commercial_customer_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_customer_groups
    ADD CONSTRAINT commercial_customer_groups_pkey PRIMARY KEY (id);


--
-- Name: commercial_customers commercial_customers_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_customers
    ADD CONSTRAINT commercial_customers_code_key UNIQUE (code);


--
-- Name: commercial_customers commercial_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_customers
    ADD CONSTRAINT commercial_customers_pkey PRIMARY KEY (id);


--
-- Name: commercial_debt_ledger commercial_debt_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_debt_ledger
    ADD CONSTRAINT commercial_debt_ledger_pkey PRIMARY KEY (id);


--
-- Name: commercial_debt_payments commercial_debt_payments_payment_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_debt_payments
    ADD CONSTRAINT commercial_debt_payments_payment_code_key UNIQUE (payment_code);


--
-- Name: commercial_debt_payments commercial_debt_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_debt_payments
    ADD CONSTRAINT commercial_debt_payments_pkey PRIMARY KEY (id);


--
-- Name: commercial_inventory_summary commercial_inventory_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_inventory_summary
    ADD CONSTRAINT commercial_inventory_summary_pkey PRIMARY KEY (id);


--
-- Name: commercial_warehouses commercial_warehouses_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_warehouses
    ADD CONSTRAINT commercial_warehouses_code_key UNIQUE (code);


--
-- Name: commercial_warehouses commercial_warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_warehouses
    ADD CONSTRAINT commercial_warehouses_pkey PRIMARY KEY (id);


--
-- Name: export_order_items export_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_order_items
    ADD CONSTRAINT export_order_items_pkey PRIMARY KEY (id);


--
-- Name: export_orders export_orders_order_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_orders
    ADD CONSTRAINT export_orders_order_code_key UNIQUE (order_code);


--
-- Name: export_orders export_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_orders
    ADD CONSTRAINT export_orders_pkey PRIMARY KEY (id);


--
-- Name: import_batches import_batches_batch_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_batch_code_key UNIQUE (batch_code);


--
-- Name: import_batches import_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_pkey PRIMARY KEY (id);


--
-- Name: inventory_checks inventory_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_checks
    ADD CONSTRAINT inventory_checks_pkey PRIMARY KEY (id);


--
-- Name: inventory_closing inventory_closing_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_closing
    ADD CONSTRAINT inventory_closing_pkey PRIMARY KEY (id);


--
-- Name: inventory_closing inventory_closing_store_id_tank_id_period_from_period_to_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_closing
    ADD CONSTRAINT inventory_closing_store_id_tank_id_period_from_period_to_key UNIQUE (store_id, tank_id, period_from, period_to);


--
-- Name: shift_checkpoint_readings shift_checkpoint_readings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_checkpoint_readings
    ADD CONSTRAINT shift_checkpoint_readings_pkey PRIMARY KEY (id);


--
-- Name: shift_checkpoint_stocks shift_checkpoint_stocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_checkpoint_stocks
    ADD CONSTRAINT shift_checkpoint_stocks_pkey PRIMARY KEY (id);


--
-- Name: shift_checkpoints shift_checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_checkpoints
    ADD CONSTRAINT shift_checkpoints_pkey PRIMARY KEY (id);


--
-- Name: store_loss_config store_loss_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_loss_config
    ADD CONSTRAINT store_loss_config_pkey PRIMARY KEY (id);


--
-- Name: store_loss_config store_loss_config_store_id_product_category_effective_from_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_loss_config
    ADD CONSTRAINT store_loss_config_store_id_product_category_effective_from_key UNIQUE (store_id, product_category, effective_from);


--
-- Name: suppliers suppliers_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_code_key UNIQUE (code);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: shift_checkpoints uq_shift_checkpoint_no; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_checkpoints
    ADD CONSTRAINT uq_shift_checkpoint_no UNIQUE (shift_id, checkpoint_no);


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
-- Name: idx_checkpoint_readings_checkpoint_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checkpoint_readings_checkpoint_id ON public.shift_checkpoint_readings USING btree (checkpoint_id);


--
-- Name: idx_checkpoint_readings_pump_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checkpoint_readings_pump_id ON public.shift_checkpoint_readings USING btree (pump_id);


--
-- Name: idx_checkpoint_stocks_checkpoint_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checkpoint_stocks_checkpoint_id ON public.shift_checkpoint_stocks USING btree (checkpoint_id);


--
-- Name: idx_checkpoint_stocks_tank_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checkpoint_stocks_tank_id ON public.shift_checkpoint_stocks USING btree (tank_id);


--
-- Name: idx_commercial_customers_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_commercial_customers_active ON public.commercial_customers USING btree (is_active);


--
-- Name: idx_commercial_customers_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_commercial_customers_code ON public.commercial_customers USING btree (code);


--
-- Name: idx_commercial_customers_debt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_commercial_customers_debt ON public.commercial_customers USING btree (current_debt);


--
-- Name: idx_commercial_customers_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_commercial_customers_group ON public.commercial_customers USING btree (customer_group_id);


--
-- Name: idx_commercial_debt_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_commercial_debt_customer ON public.commercial_debt_ledger USING btree (customer_id, created_at);


--
-- Name: idx_commercial_debt_ref; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_commercial_debt_ref ON public.commercial_debt_ledger USING btree (ref_type, ref_id);


--
-- Name: idx_commercial_debt_warehouse; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_commercial_debt_warehouse ON public.commercial_debt_ledger USING btree (warehouse_id);


--
-- Name: idx_commercial_warehouses_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_commercial_warehouses_active ON public.commercial_warehouses USING btree (is_active);


--
-- Name: idx_commercial_warehouses_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_commercial_warehouses_code ON public.commercial_warehouses USING btree (code);


--
-- Name: idx_commercial_warehouses_region; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_commercial_warehouses_region ON public.commercial_warehouses USING btree (region_id);


--
-- Name: idx_customer_groups_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_groups_code ON public.commercial_customer_groups USING btree (code);


--
-- Name: idx_customer_stores_bypass; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_stores_bypass ON public.customer_stores USING btree (bypass_credit_limit) WHERE (bypass_credit_limit = true);


--
-- Name: idx_customer_stores_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_stores_lookup ON public.customer_stores USING btree (customer_id, store_id);


--
-- Name: idx_customers_bypass; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customers_bypass ON public.customers USING btree (bypass_credit_limit) WHERE (bypass_credit_limit = true);


--
-- Name: idx_debt_ledger_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_debt_ledger_customer ON public.debt_ledger USING btree (customer_id, created_at);


--
-- Name: idx_debt_payments_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_debt_payments_customer ON public.commercial_debt_payments USING btree (customer_id);


--
-- Name: idx_debt_payments_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_debt_payments_date ON public.commercial_debt_payments USING btree (payment_date);


--
-- Name: idx_expenses_shift; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_shift ON public.expenses USING btree (shift_id);


--
-- Name: idx_expenses_store; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_store ON public.expenses USING btree (store_id, created_at);


--
-- Name: idx_export_items_batch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_export_items_batch ON public.export_order_items USING btree (import_batch_id);


--
-- Name: idx_export_items_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_export_items_order ON public.export_order_items USING btree (export_order_id);


--
-- Name: idx_export_items_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_export_items_product ON public.export_order_items USING btree (product_id);


--
-- Name: idx_export_orders_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_export_orders_code ON public.export_orders USING btree (order_code);


--
-- Name: idx_export_orders_customer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_export_orders_customer ON public.export_orders USING btree (customer_id);


--
-- Name: idx_export_orders_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_export_orders_date ON public.export_orders USING btree (order_date);


--
-- Name: idx_export_orders_payment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_export_orders_payment ON public.export_orders USING btree (payment_status);


--
-- Name: idx_export_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_export_orders_status ON public.export_orders USING btree (status);


--
-- Name: idx_export_orders_warehouse; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_export_orders_warehouse ON public.export_orders USING btree (warehouse_id);


--
-- Name: idx_import_batches_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_import_batches_date ON public.import_batches USING btree (import_date);


--
-- Name: idx_import_batches_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_import_batches_lookup ON public.import_batches USING btree (warehouse_id, product_id, supplier_id, status) WHERE (((status)::text = 'ACTIVE'::text) AND (remaining_quantity > (0)::numeric));


--
-- Name: idx_import_batches_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_import_batches_product ON public.import_batches USING btree (product_id);


--
-- Name: idx_import_batches_remaining; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_import_batches_remaining ON public.import_batches USING btree (warehouse_id, product_id, supplier_id, remaining_quantity) WHERE (remaining_quantity > (0)::numeric);


--
-- Name: idx_import_batches_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_import_batches_status ON public.import_batches USING btree (status);


--
-- Name: idx_import_batches_supplier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_import_batches_supplier ON public.import_batches USING btree (supplier_id);


--
-- Name: idx_import_batches_warehouse; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_import_batches_warehouse ON public.import_batches USING btree (warehouse_id);


--
-- Name: idx_inventory_checks_check_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_checks_check_at ON public.inventory_checks USING btree (check_at DESC);


--
-- Name: idx_inventory_checks_shift_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_checks_shift_id ON public.inventory_checks USING btree (shift_id);


--
-- Name: idx_inventory_checks_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_checks_store_id ON public.inventory_checks USING btree (store_id);


--
-- Name: idx_inventory_ledger_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_ledger_lookup ON public.inventory_ledger USING btree (warehouse_id, product_id, created_at);


--
-- Name: idx_inventory_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_product ON public.commercial_inventory_summary USING btree (product_id);


--
-- Name: idx_inventory_supplier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_supplier ON public.commercial_inventory_summary USING btree (supplier_id);


--
-- Name: idx_inventory_warehouse; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_warehouse ON public.commercial_inventory_summary USING btree (warehouse_id);


--
-- Name: idx_product_prices_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_prices_lookup ON public.product_prices USING btree (product_id, region_id, valid_from, valid_to);


--
-- Name: idx_shift_checkpoints_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shift_checkpoints_at ON public.shift_checkpoints USING btree (checkpoint_at);


--
-- Name: idx_shift_checkpoints_shift_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shift_checkpoints_shift_id ON public.shift_checkpoints USING btree (shift_id);


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
-- Name: idx_suppliers_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suppliers_active ON public.suppliers USING btree (is_active);


--
-- Name: idx_suppliers_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suppliers_code ON public.suppliers USING btree (code);


--
-- Name: ux_inventory_summary; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_inventory_summary ON public.commercial_inventory_summary USING btree (warehouse_id, product_id, supplier_id);


--
-- Name: ux_shift_store_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_shift_store_date ON public.shifts USING btree (store_id, shift_date, shift_no);


--
-- Name: export_order_items trg_update_batch_export; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_batch_export AFTER INSERT OR DELETE OR UPDATE ON public.export_order_items FOR EACH ROW EXECUTE FUNCTION public.update_batch_on_export();


--
-- Name: commercial_debt_ledger trg_update_customer_debt; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_customer_debt BEFORE INSERT ON public.commercial_debt_ledger FOR EACH ROW EXECUTE FUNCTION public.update_customer_debt();


--
-- Name: export_order_items trg_update_export_totals; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_export_totals AFTER INSERT OR DELETE OR UPDATE ON public.export_order_items FOR EACH ROW EXECUTE FUNCTION public.update_export_order_totals();


--
-- Name: import_batches trg_update_inventory_import; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_inventory_import BEFORE INSERT ON public.import_batches FOR EACH ROW EXECUTE FUNCTION public.update_inventory_on_import();


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
-- Name: commercial_customers commercial_customers_customer_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_customers
    ADD CONSTRAINT commercial_customers_customer_group_id_fkey FOREIGN KEY (customer_group_id) REFERENCES public.commercial_customer_groups(id);


--
-- Name: commercial_debt_ledger commercial_debt_ledger_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_debt_ledger
    ADD CONSTRAINT commercial_debt_ledger_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.commercial_customers(id);


--
-- Name: commercial_debt_ledger commercial_debt_ledger_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_debt_ledger
    ADD CONSTRAINT commercial_debt_ledger_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.commercial_warehouses(id);


--
-- Name: commercial_debt_payments commercial_debt_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_debt_payments
    ADD CONSTRAINT commercial_debt_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: commercial_debt_payments commercial_debt_payments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_debt_payments
    ADD CONSTRAINT commercial_debt_payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.commercial_customers(id);


--
-- Name: commercial_debt_payments commercial_debt_payments_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_debt_payments
    ADD CONSTRAINT commercial_debt_payments_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.commercial_warehouses(id);


--
-- Name: commercial_inventory_summary commercial_inventory_summary_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_inventory_summary
    ADD CONSTRAINT commercial_inventory_summary_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: commercial_inventory_summary commercial_inventory_summary_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_inventory_summary
    ADD CONSTRAINT commercial_inventory_summary_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: commercial_inventory_summary commercial_inventory_summary_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_inventory_summary
    ADD CONSTRAINT commercial_inventory_summary_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.commercial_warehouses(id);


--
-- Name: commercial_warehouses commercial_warehouses_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_warehouses
    ADD CONSTRAINT commercial_warehouses_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id);


--
-- Name: export_order_items export_order_items_export_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_order_items
    ADD CONSTRAINT export_order_items_export_order_id_fkey FOREIGN KEY (export_order_id) REFERENCES public.export_orders(id) ON DELETE CASCADE;


--
-- Name: export_order_items export_order_items_import_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_order_items
    ADD CONSTRAINT export_order_items_import_batch_id_fkey FOREIGN KEY (import_batch_id) REFERENCES public.import_batches(id);


--
-- Name: export_order_items export_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_order_items
    ADD CONSTRAINT export_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: export_orders export_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_orders
    ADD CONSTRAINT export_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: export_orders export_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_orders
    ADD CONSTRAINT export_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: export_orders export_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_orders
    ADD CONSTRAINT export_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.commercial_customers(id);


--
-- Name: export_orders export_orders_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_orders
    ADD CONSTRAINT export_orders_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.commercial_warehouses(id);


--
-- Name: cash_ledger fk_cash_ledger_shift; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_ledger
    ADD CONSTRAINT fk_cash_ledger_shift FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: debt_ledger fk_debt_ledger_shift; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.debt_ledger
    ADD CONSTRAINT fk_debt_ledger_shift FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: export_order_items fk_export_order_items_customer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_order_items
    ADD CONSTRAINT fk_export_order_items_customer FOREIGN KEY (customer_id) REFERENCES public.commercial_customers(id) ON DELETE CASCADE;


--
-- Name: export_orders fk_export_orders_customer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_orders
    ADD CONSTRAINT fk_export_orders_customer FOREIGN KEY (customer_id) REFERENCES public.commercial_customers(id) ON DELETE SET NULL;


--
-- Name: inventory_ledger fk_inventory_ledger_shift; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_ledger
    ADD CONSTRAINT fk_inventory_ledger_shift FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: import_batches import_batches_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: import_batches import_batches_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: import_batches import_batches_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: import_batches import_batches_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.commercial_warehouses(id);


--
-- Name: inventory_checks inventory_checks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_checks
    ADD CONSTRAINT inventory_checks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: inventory_checks inventory_checks_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_checks
    ADD CONSTRAINT inventory_checks_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: inventory_checks inventory_checks_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_checks
    ADD CONSTRAINT inventory_checks_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: inventory_closing inventory_closing_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_closing
    ADD CONSTRAINT inventory_closing_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: inventory_closing inventory_closing_loss_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_closing
    ADD CONSTRAINT inventory_closing_loss_config_id_fkey FOREIGN KEY (loss_config_id) REFERENCES public.store_loss_config(id);


--
-- Name: inventory_closing inventory_closing_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_closing
    ADD CONSTRAINT inventory_closing_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: inventory_closing inventory_closing_tank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_closing
    ADD CONSTRAINT inventory_closing_tank_id_fkey FOREIGN KEY (tank_id) REFERENCES public.tanks(id);


--
-- Name: shift_checkpoint_readings shift_checkpoint_readings_checkpoint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_checkpoint_readings
    ADD CONSTRAINT shift_checkpoint_readings_checkpoint_id_fkey FOREIGN KEY (checkpoint_id) REFERENCES public.shift_checkpoints(id) ON DELETE CASCADE;


--
-- Name: shift_checkpoint_readings shift_checkpoint_readings_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_checkpoint_readings
    ADD CONSTRAINT shift_checkpoint_readings_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: shift_checkpoint_readings shift_checkpoint_readings_pump_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_checkpoint_readings
    ADD CONSTRAINT shift_checkpoint_readings_pump_id_fkey FOREIGN KEY (pump_id) REFERENCES public.pumps(id);


--
-- Name: shift_checkpoint_stocks shift_checkpoint_stocks_checkpoint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_checkpoint_stocks
    ADD CONSTRAINT shift_checkpoint_stocks_checkpoint_id_fkey FOREIGN KEY (checkpoint_id) REFERENCES public.shift_checkpoints(id) ON DELETE CASCADE;


--
-- Name: shift_checkpoint_stocks shift_checkpoint_stocks_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_checkpoint_stocks
    ADD CONSTRAINT shift_checkpoint_stocks_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: shift_checkpoint_stocks shift_checkpoint_stocks_tank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_checkpoint_stocks
    ADD CONSTRAINT shift_checkpoint_stocks_tank_id_fkey FOREIGN KEY (tank_id) REFERENCES public.tanks(id);


--
-- Name: shift_checkpoints shift_checkpoints_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_checkpoints
    ADD CONSTRAINT shift_checkpoints_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: shift_checkpoints shift_checkpoints_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_checkpoints
    ADD CONSTRAINT shift_checkpoints_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE;


--
-- Name: store_loss_config store_loss_config_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_loss_config
    ADD CONSTRAINT store_loss_config_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: store_loss_config store_loss_config_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_loss_config
    ADD CONSTRAINT store_loss_config_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- PostgreSQL database dump complete
--

\unrestrict apC1u2qf7ZcZnvR5bG7H99qLCyYfysKv5EzsiIBg28phcr2kv8Clrjoh3ipb6yc

