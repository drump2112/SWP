-- PostgreSQL database dump
--

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
