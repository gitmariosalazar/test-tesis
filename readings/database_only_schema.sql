--
-- PostgreSQL database dump
--

\restrict h9S7Q17xuDN0b9Krwb8266g18OPRCglgVYyrxUYcBYiRu518JQgInJXPw4VrRRp

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: topology; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA topology;


--
-- Name: SCHEMA topology; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA topology IS 'PostGIS Topology schema';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: postgis_raster; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_raster WITH SCHEMA public;


--
-- Name: EXTENSION postgis_raster; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis_raster IS 'PostGIS raster types and functions';


--
-- Name: postgis_topology; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_topology WITH SCHEMA topology;


--
-- Name: EXTENSION postgis_topology; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis_topology IS 'PostGIS topology spatial types and functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: fn_auditar_cambio_estado(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_auditar_cambio_estado() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_usuario_id UUID := 'e3400d18-86e1-4eee-9a8b-3e7eaf812a95'::UUID;
BEGIN
    BEGIN
        v_usuario_id := current_setting('app.usuario_id', TRUE)::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_usuario_id := 'e3400d18-86e1-4eee-9a8b-3e7eaf812a95'::UUID;
    END;

    INSERT INTO seguimiento_lectura (
        acometida_id,
        lectura_id,
        usuario_id,
        lectura_estado_id,
        lectura_estado_anterior_id,
        accion,
        descripcion
    ) VALUES (
        NEW.acometida_id,
        NEW.lectura_id,
        v_usuario_id,
        NEW.lectura_estado_id,
        OLD.lectura_estado_id,
        CASE WHEN TG_OP = 'INSERT' THEN 'CREACION' ELSE 'CAMBIO ESTADO' END,
        CASE WHEN TG_OP = 'UPDATE' THEN
            'De ' || COALESCE((SELECT nombre FROM lectura_estado WHERE lectura_estado_id = OLD.lectura_estado_id), 'DESCONOCIDO') ||
            ' a ' || COALESCE((SELECT nombre FROM lectura_estado WHERE lectura_estado_id = NEW.lectura_estado_id), 'DESCONOCIDO')
        ELSE 'Nueva lectura creada (automatica)'
        END
    );

    RETURN NEW;
END;
$$;


--
-- Name: fn_block_duplicate_lectura(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_block_duplicate_lectura() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    cnt_normal INTEGER := 0;
    cnt_especial INTEGER := 0;
    mes CHAR(7);
    inicio_periodo DATE;
    fin_periodo DATE;
    existe_periodo BOOLEAN := FALSE;
BEGIN
    mes := fn_mes_lectura(NEW.fecha_lectura);

    SELECT EXISTS (SELECT 1 FROM siguiente_lectura WHERE siguiente_lectura.acometida_id = NEW.acometida_id),
           fecha_inicio_periodo,
           fecha_fin_periodo
    INTO existe_periodo, inicio_periodo, fin_periodo
    FROM siguiente_lectura
    WHERE siguiente_lectura.acometida_id = NEW.acometida_id;

    IF NOT existe_periodo THEN
        IF NEW.novedad LIKE '%INICIAL%' OR NEW.novedad LIKE '%CAMBIO DE MEDIDOR%' THEN
            RAISE NOTICE 'PRIMERA LECTURA PERMITIDA | Acometida: % | Fecha: %', NEW.acometida_id, NEW.fecha_lectura;
            RETURN NEW;
        ELSE
            RAISE EXCEPTION 'Primera lectura DEBE ser INICIAL o CAMBIO DE MEDIDOR para acometida %', NEW.acometida_id;
        END IF;
    END IF;

    IF NEW.fecha_lectura::DATE < inicio_periodo THEN
        RAISE EXCEPTION 'Prohibido: Lectura antes del periodo (% < %)',
                        NEW.fecha_lectura::DATE, inicio_periodo;
    END IF;

    SELECT COUNT(*) INTO cnt_normal
    FROM lectura
    WHERE lectura.acometida_id = NEW.acometida_id
      AND fn_mes_lectura(lectura.fecha_lectura) = mes
      AND lectura.novedad NOT LIKE '%INICIAL%'
      AND lectura.novedad NOT LIKE '%CAMBIO DE MEDIDOR%';

    SELECT COUNT(*) INTO cnt_especial
    FROM lectura
    WHERE lectura.acometida_id = NEW.acometida_id
      AND fn_mes_lectura(lectura.fecha_lectura) = mes
      AND (lectura.novedad LIKE '%INICIAL%' OR lectura.novedad LIKE '%CAMBIO DE MEDIDOR%');

    IF (NEW.novedad NOT LIKE '%INICIAL%' AND NEW.novedad NOT LIKE '%CAMBIO DE MEDIDOR%' AND cnt_normal >= 1)
       OR ((NEW.novedad LIKE '%INICIAL%' OR NEW.novedad LIKE '%CAMBIO DE MEDIDOR%') AND cnt_especial >= 2) THEN
        RAISE EXCEPTION 'Duplicado: Maximo % % por mes (%)',
              CASE WHEN NEW.novedad LIKE '%INICIAL%' OR NEW.novedad LIKE '%CAMBIO DE MEDIDOR%' THEN 2 ELSE 1 END,
              CASE WHEN NEW.novedad LIKE '%INICIAL%' OR NEW.novedad LIKE '%CAMBIO DE MEDIDOR%' THEN 'especiales' ELSE 'normales' END,
              mes;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en bloqueo: %', SQLERRM;
        RAISE;
END;
$$;


--
-- Name: fn_control_siguiente_lectura_mensual(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_control_siguiente_lectura_mensual() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    fecha_base DATE;
    ultima_fecha_ideal DATE;
    proxima_fecha_ideal DATE;
    v_acometida_id VARCHAR(10) := NEW.acometida_id;
BEGIN
    PERFORM 1 FROM acometida WHERE acometida.acometida_id = v_acometida_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Acometida % no encontrada', v_acometida_id;
    END IF;

    SELECT COALESCE(fecha_inicio_lecturas, NEW.fecha_lectura::DATE) INTO fecha_base
    FROM acometida WHERE acometida.acometida_id = v_acometida_id;

    IF fecha_base IS NULL THEN
        fecha_base := NEW.fecha_lectura::DATE;
        UPDATE acometida SET fecha_inicio_lecturas = fecha_base WHERE acometida.acometida_id = v_acometida_id;
    END IF;

    SELECT fecha_siguiente_lectura INTO ultima_fecha_ideal
    FROM siguiente_lectura WHERE siguiente_lectura.acometida_id = v_acometida_id;
    IF ultima_fecha_ideal IS NULL THEN
        ultima_fecha_ideal := fecha_base;
    END IF;

    proxima_fecha_ideal := ultima_fecha_ideal + INTERVAL '1 month';

    IF EXTRACT(DAY FROM proxima_fecha_ideal) <> EXTRACT(DAY FROM fecha_base) THEN
        proxima_fecha_ideal := date_trunc('month', proxima_fecha_ideal) + INTERVAL '1 month - 1 day';
    END IF;

    INSERT INTO siguiente_lectura (
        acometida_id, ultima_lectura_id, fecha_siguiente_lectura,
        fecha_inicio_periodo, fecha_fin_periodo, created_at, updated_at
    ) VALUES (
        v_acometida_id, NEW.lectura_id, proxima_fecha_ideal,
        proxima_fecha_ideal - INTERVAL '5 days',
        proxima_fecha_ideal + INTERVAL '5 days',
        NOW(), NOW()
    )
    ON CONFLICT (acometida_id) DO UPDATE SET
        ultima_lectura_id = EXCLUDED.ultima_lectura_id,
        fecha_siguiente_lectura = EXCLUDED.fecha_siguiente_lectura,
        fecha_inicio_periodo = EXCLUDED.fecha_siguiente_lectura - INTERVAL '5 days',
        fecha_fin_periodo = EXCLUDED.fecha_siguiente_lectura + INTERVAL '5 days',
        updated_at = NOW();

    RAISE NOTICE 'Siguiente lectura para %: %', v_acometida_id, proxima_fecha_ideal;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en control siguiente: %', SQLERRM;
        RAISE;
END;
$$;


--
-- Name: fn_inicializar_siguiente_lectura(character varying, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_inicializar_siguiente_lectura(p_acometida_id character varying, p_fecha_base date) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF p_acometida_id IS NULL THEN
        RAISE EXCEPTION 'Parametro p_acometida_id requerido';
    END IF;
    IF p_fecha_base IS NULL THEN
        RAISE EXCEPTION 'Parametro p_fecha_base requerido';
    END IF;

    DECLARE
        proxima_fecha_ideal DATE := p_fecha_base + INTERVAL '1 month';
        dia_base INTEGER := EXTRACT(DAY FROM p_fecha_base);
    BEGIN
        IF EXTRACT(DAY FROM proxima_fecha_ideal) <> dia_base THEN
            proxima_fecha_ideal := date_trunc('month', proxima_fecha_ideal) + INTERVAL '1 month - 1 day';
        END IF;

        INSERT INTO siguiente_lectura (
            acometida_id,
            ultima_lectura_id,
            fecha_siguiente_lectura,
            fecha_inicio_periodo,
            fecha_fin_periodo,
            created_at,
            updated_at
        ) VALUES (
            p_acometida_id,
            NULL,
            proxima_fecha_ideal,
            proxima_fecha_ideal - INTERVAL '5 days',
            proxima_fecha_ideal + INTERVAL '5 days',
            NOW(),
            NOW()
        )
        ON CONFLICT (acometida_id) DO NOTHING;

        RAISE NOTICE 'SiguienteLectura inicializada para % en fecha %', p_acometida_id, proxima_fecha_ideal;
    END;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error al inicializar SiguienteLectura para %: %', p_acometida_id, SQLERRM;
        RAISE;
END;
$$;


--
-- Name: fn_insert_cambio_medidor_reading(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_insert_cambio_medidor_reading() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    pend_id INTEGER;
    fecha_base DATE := CURRENT_DATE;
BEGIN
    IF NEW.numero_medidor = OLD.numero_medidor THEN
        RETURN NEW;
    END IF;

    SELECT lectura_estado_id INTO pend_id
    FROM lectura_estado WHERE codigo = 'PEND' LIMIT 1;

    IF pend_id IS NULL THEN
        RAISE EXCEPTION 'Estado PEND no encontrado';
    END IF;

    INSERT INTO lectura (
        acometida_id, fecha_lectura, hora_lectura, sector, cuenta, clave_catastral,
        valor_lectura, tasa_alcantarillado, lectura_anterior, lectura_actual,
        codigo_ingreso_renta, novedad, codigo_ingreso, tipo_novedad_lectura_id, lectura_estado_id
    ) VALUES (
        NEW.acometida_id, fecha_base, CURRENT_TIME, NEW.sector, NEW.cuenta, NEW.clave_catastral,
        0, 0, 0, 0, NULL, 'CAMBIO DE MEDIDOR AUTOMATICO', NULL, 8, pend_id
    );

    UPDATE acometida
    SET fecha_inicio_lecturas = COALESCE(fecha_inicio_lecturas, fecha_base)
    WHERE acometida_id = NEW.acometida_id;

    RAISE NOTICE 'Lectura cambio medidor para %', NEW.acometida_id;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en cambio medidor: %', SQLERRM;
        RAISE;
END;
$$;


--
-- Name: fn_insert_initial_reading_full(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_insert_initial_reading_full() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    pend_id INTEGER;
    fecha_base DATE := CURRENT_DATE;
BEGIN
    IF NEW.acometida_id IS NULL THEN RAISE EXCEPTION 'acometida_id requerido'; END IF;
    IF NEW.sector IS NULL THEN RAISE EXCEPTION 'sector requerido'; END IF;
    IF NEW.cuenta IS NULL THEN RAISE EXCEPTION 'cuenta requerida'; END IF;
    IF NEW.clave_catastral IS NULL THEN RAISE EXCEPTION 'clave_catastral requerida'; END IF;

    SELECT lectura_estado_id INTO pend_id
    FROM lectura_estado
    WHERE codigo = 'PEND' LIMIT 1;

    IF pend_id IS NULL THEN
        RAISE EXCEPTION 'Estado PEND no encontrado';
    END IF;

    INSERT INTO lectura (
        acometida_id, fecha_lectura, hora_lectura, sector, cuenta, clave_catastral,
        valor_lectura, tasa_alcantarillado, lectura_anterior, lectura_actual,
        codigo_ingreso_renta, novedad, codigo_ingreso, tipo_novedad_lectura_id, lectura_estado_id
    ) VALUES (
        NEW.acometida_id, fecha_base, CURRENT_TIME, NEW.sector, NEW.cuenta, NEW.clave_catastral,
        0, 0, 0, 0, NULL, 'LECTURA INICIAL AUTOMATICA', NULL, 8, pend_id
    );

    UPDATE acometida
    SET fecha_inicio_lecturas = fecha_base
    WHERE acometida_id = NEW.acometida_id;

    RAISE NOTICE 'Lectura inicial creada para %', NEW.acometida_id;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en lectura inicial: %', SQLERRM;
        RAISE;
END;
$$;


--
-- Name: fn_mes_lectura(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_mes_lectura(p_fecha date) RETURNS character
    LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
    AS $$
BEGIN
    IF p_fecha IS NULL THEN
        RAISE EXCEPTION 'Fecha requerida para fn_mes_lectura';
    END IF;
    RETURN TO_CHAR(p_fecha, 'YYYY-MM');
END;
$$;


--
-- Name: fn_mes_lectura(timestamp without time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_mes_lectura(ts timestamp without time zone) RETURNS character
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT TO_CHAR(ts::date, 'YYYY-MM');
$$;


--
-- Name: fn_update_meter_reading_initial(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_meter_reading_initial() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    pend_id INTEGER;
    lectura_id INTEGER;
    fecha_base DATE;
    count_completadas INTEGER := 0;
    proxima_ideal DATE;
BEGIN
    IF (OLD.numero_medidor IS DISTINCT FROM NEW.numero_medidor)
       AND NEW.numero_medidor IS NOT NULL THEN

        IF NEW.acometida_id IS NULL THEN
            RAISE EXCEPTION 'acometida_id requerido';
        END IF;
        IF NEW.sector IS NULL THEN
            RAISE EXCEPTION 'sector requerido en acometida %', NEW.acometida_id;
        END IF;
        IF NEW.cuenta IS NULL THEN
            RAISE EXCEPTION 'cuenta requerida en acometida %', NEW.acometida_id;
        END IF;
        IF NEW.clave_catastral IS NULL THEN
            RAISE EXCEPTION 'clave_catastral requerida en acometida %', NEW.acometida_id;
        END IF;

        SELECT lectura_estado_id INTO pend_id
        FROM lectura_estado
        WHERE codigo = 'PEND' LIMIT 1;

        IF pend_id IS NULL THEN
            RAISE EXCEPTION 'Estado PEND no encontrado';
        END IF;

        INSERT INTO lectura (
            acometida_id,
            fecha_lectura,
            hora_lectura,
            sector,
            cuenta,
            clave_catastral,
            valor_lectura,
            tasa_alcantarillado,
            lectura_anterior,
            lectura_actual,
            codigo_ingreso_renta,
            novedad,
            codigo_ingreso,
            tipo_novedad_lectura_id,
            lectura_estado_id
        ) VALUES (
            NEW.acometida_id,
            CURRENT_DATE,
            CURRENT_TIME,
            NEW.sector,
            NEW.cuenta,
            NEW.clave_catastral,
            0,
            0,
            0,
            0,
            NULL,
            'LECTURA INICIAL POR CAMBIO DE MEDIDOR: ' || NEW.numero_medidor,
            NULL,
            8,
            pend_id
        ) RETURNING lectura_id INTO lectura_id;

        SELECT fecha_inicio_lecturas INTO fecha_base
        FROM acometida
        WHERE acometida_id = NEW.acometida_id;

        IF fecha_base IS NULL THEN
            RAISE EXCEPTION 'fecha_inicio_lecturas no seteada. Crea acometida primero.';
        END IF;

        SELECT COUNT(*) INTO count_completadas
        FROM lectura l
        JOIN lectura_estado le ON le.lectura_estado_id = l.lectura_estado_id
        WHERE l.acometida_id = NEW.acometida_id
          AND le.codigo IN ('REAL', 'FACT');

        proxima_ideal := fecha_base + INTERVAL '1 month' * (count_completadas + 1);

        INSERT INTO siguiente_lectura (
            acometida_id,
            ultima_lectura_id,
            fecha_siguiente_lectura,
            fecha_inicio_periodo,
            fecha_fin_periodo
        ) VALUES (
            NEW.acometida_id,
            lectura_id,
            proxima_ideal,
            proxima_ideal - INTERVAL '5 days',
            proxima_ideal + INTERVAL '5 days'
        )
        ON CONFLICT (acometida_id) DO UPDATE SET
            ultima_lectura_id = EXCLUDED.ultima_lectura_id,
            fecha_siguiente_lectura = EXCLUDED.fecha_siguiente_lectura,
            fecha_inicio_periodo = EXCLUDED.fecha_inicio_periodo,
            fecha_fin_periodo = EXCLUDED.fecha_fin_periodo;

        RAISE NOTICE 'Cambio medidor para % | Fecha base INMUTABLE: % | Proxima recalculada: % (rango: % a %)',
                     NEW.acometida_id, fecha_base, proxima_ideal,
                     proxima_ideal - INTERVAL '5 days', proxima_ideal + INTERVAL '5 days';
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: trg_update_is_locked_out(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_update_is_locked_out() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.is_locked_out := (NEW.lockout_until IS NOT NULL AND NEW.lockout_until > CURRENT_TIMESTAMP);
    RETURN NEW;
END;
$$;


--
-- Name: update_cliente_usuario_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_cliente_usuario_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$;


--
-- Name: update_consumo_promedio(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_consumo_promedio() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO consumo_promedio (acometida_id, average_consumption, updated_at)
    VALUES (
        NEW.acometida_id,
        ROUND(
          GREATEST(
            COALESCE((
              SELECT AVG(CASE
                            WHEN (sub.lectura_actual - sub.lectura_anterior) >= 0
                            THEN (sub.lectura_actual - sub.lectura_anterior)
                        END)
              FROM (
                SELECT lectura_actual, lectura_anterior
                FROM lectura
                WHERE acometida_id = NEW.acometida_id
                  AND fecha_lectura IS NOT NULL
                ORDER BY fecha_lectura DESC
                LIMIT 10
              ) sub
            ), 0),
          0),
        2),
        NOW()
    )
    ON CONFLICT (acometida_id)
    DO UPDATE SET
        average_consumption = EXCLUDED.average_consumption,
        updated_at = NOW();

    RETURN NEW;
END;
$$;


--
-- Name: update_empleados_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_empleados_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$;


--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: acometida; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.acometida (
    acometida_id character varying(10) NOT NULL,
    cliente_id character varying(13) NOT NULL,
    tarifa_id integer NOT NULL,
    numero_medidor character varying(20),
    sector integer NOT NULL,
    cuenta integer NOT NULL,
    clave_catastral character varying(10) NOT NULL,
    numero_contrato character varying(20),
    alcantarillado boolean NOT NULL,
    estado boolean,
    observaciones character varying(255),
    direccion character varying(255),
    fecha_instalacion timestamp without time zone,
    numero_personas integer,
    zona integer,
    coordenadas public.geometry(Point,4326),
    referencia character varying(255),
    metadata jsonb,
    altitud double precision,
    "precision" double precision,
    fecha_geolocalizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    zona_geometrica public.geometry(Polygon,4326),
    predio_clave_catastral character varying(25),
    fecha_inicio_lecturas date,
    zona_id integer
);


--
-- Name: canton; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.canton (
    canton_id character varying(8) NOT NULL,
    nombre character varying(100) NOT NULL,
    provincia_id character varying(8) NOT NULL
);


--
-- Name: cargo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cargo (
    cargo_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    nivel_jerarquico smallint DEFAULT 0,
    activo boolean DEFAULT true
);


--
-- Name: cargo_cargo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cargo_cargo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cargo_cargo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cargo_cargo_id_seq OWNED BY public.cargo.cargo_id;


--
-- Name: categoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categoria (
    categoria_id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text
);


--
-- Name: categoria_categoria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categoria_categoria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categoria_categoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categoria_categoria_id_seq OWNED BY public.categoria.categoria_id;


--
-- Name: ciudadano; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ciudadano (
    ciudadano_id character varying(10) NOT NULL,
    nombres character varying(100) DEFAULT 'SIN NOMBRE'::character varying,
    apellidos character varying(100) DEFAULT 'SIN APELLIDO'::character varying,
    fecha_nacimiento date,
    fallecido boolean DEFAULT false NOT NULL,
    sexo_id integer NOT NULL,
    estado_civil_id integer NOT NULL,
    profesion_id integer NOT NULL,
    parroquia_id character varying(10) NOT NULL,
    direccion character varying(255) DEFAULT 'SIN DIRECCION'::character varying,
    pais_origen character varying(100),
    updated_at timestamp without time zone
);


--
-- Name: cliente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cliente (
    cliente_id character varying(13) NOT NULL,
    tipo_identificacion_id character varying(5) NOT NULL,
    cliente_id_valido character varying(20) NOT NULL,
    create_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    update_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: correo_electronico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.correo_electronico (
    correo_electronico_id integer NOT NULL,
    email character varying(150) CONSTRAINT correo_electronico_correo_not_null NOT NULL,
    cliente_id character varying(13) NOT NULL
);


--
-- Name: telefono; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telefono (
    telefono_id integer NOT NULL,
    cliente_id character varying(13) NOT NULL,
    numero character varying(20) NOT NULL,
    tipo_telefono_id integer NOT NULL,
    es_valido boolean DEFAULT false CONSTRAINT telefono_es_validado_not_null NOT NULL
);


--
-- Name: cliente_contacto; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cliente_contacto AS
 SELECT c.cliente_id,
    COALESCE(json_agg(DISTINCT jsonb_build_object('telefono_id', t.telefono_id, 'numero', t.numero)) FILTER (WHERE (t.telefono_id IS NOT NULL)), '[]'::json) AS phones,
    COALESCE(json_agg(DISTINCT jsonb_build_object('correo_electronico_id', ce.correo_electronico_id, 'correo', ce.email)) FILTER (WHERE (ce.correo_electronico_id IS NOT NULL)), '[]'::json) AS correos
   FROM ((public.cliente c
     LEFT JOIN public.telefono t ON (((t.cliente_id)::text = (c.cliente_id)::text)))
     LEFT JOIN public.correo_electronico ce ON (((ce.cliente_id)::text = (c.cliente_id)::text)))
  GROUP BY c.cliente_id;


--
-- Name: cliente_persona_natural; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cliente_persona_natural (
    cliente_persona_natural_id integer NOT NULL,
    ciudadano_id character varying(10) NOT NULL,
    cliente_id character varying(13) NOT NULL,
    direccion_acometida character varying(255) DEFAULT 'SIN DIRECCION'::character varying NOT NULL
);


--
-- Name: cliente_persona_natural_cliente_persona_natural_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cliente_persona_natural_cliente_persona_natural_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cliente_persona_natural_cliente_persona_natural_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cliente_persona_natural_cliente_persona_natural_id_seq OWNED BY public.cliente_persona_natural.cliente_persona_natural_id;


--
-- Name: cliente_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cliente_usuario (
    cliente_usuario_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cliente_id character varying(13) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255),
    auth_method character varying(50) DEFAULT 'PASSWORD'::character varying NOT NULL,
    auth_provider character varying(50),
    estado_cliente_usuario_id integer DEFAULT 2 NOT NULL,
    is_active boolean GENERATED ALWAYS AS ((estado_cliente_usuario_id = 1)) STORED NOT NULL,
    fecha_registro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_ultimo_acceso timestamp with time zone,
    failed_attempts integer DEFAULT 0,
    lockout_until timestamp with time zone,
    is_locked_out boolean DEFAULT false NOT NULL,
    two_factor_enabled boolean DEFAULT false,
    two_factor_secret character varying(255),
    two_factor_backup_codes text[],
    email_verified boolean DEFAULT false,
    telefono_verified boolean DEFAULT false,
    verification_token character varying(255),
    verification_expiry timestamp with time zone,
    reset_token character varying(255),
    reset_token_expiry timestamp with time zone,
    preferencias jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_reset_expiry CHECK (((reset_token_expiry IS NULL) OR (reset_token_expiry > CURRENT_TIMESTAMP))),
    CONSTRAINT cliente_usuario_failed_attempts_check CHECK ((failed_attempts >= 0))
);


--
-- Name: componentes_fijos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.componentes_fijos (
    id integer NOT NULL,
    tarifa_id integer NOT NULL,
    servicio_id integer,
    componente_nombre character varying(100) NOT NULL,
    valor numeric(10,4) NOT NULL
);


--
-- Name: componentes_fijos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.componentes_fijos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: componentes_fijos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.componentes_fijos_id_seq OWNED BY public.componentes_fijos.id;


--
-- Name: consumo_promedio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consumo_promedio (
    acometida_id character varying(50) NOT NULL,
    average_consumption numeric(18,2) NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    lecturas_usadas integer DEFAULT 0
);


--
-- Name: correo_electronico_correo_electronico_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.correo_electronico_correo_electronico_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: correo_electronico_correo_electronico_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.correo_electronico_correo_electronico_id_seq OWNED BY public.correo_electronico.correo_electronico_id;


--
-- Name: correo_empresa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.correo_empresa (
    correo_empresa_id integer NOT NULL,
    correo_electronico_id integer NOT NULL,
    empresa_id uuid NOT NULL
);


--
-- Name: correo_empresa_correo_empresa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.correo_empresa_correo_empresa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: correo_empresa_correo_empresa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.correo_empresa_correo_empresa_id_seq OWNED BY public.correo_empresa.correo_empresa_id;


--
-- Name: correo_persona_natural; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.correo_persona_natural (
    correo_persona_natural_id integer NOT NULL,
    correo_electronico_id integer NOT NULL,
    cliente_persona_natural_id integer NOT NULL
);


--
-- Name: correo_persona_natural_correo_persona_natural_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.correo_persona_natural_correo_persona_natural_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: correo_persona_natural_correo_persona_natural_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.correo_persona_natural_correo_persona_natural_id_seq OWNED BY public.correo_persona_natural.correo_persona_natural_id;


--
-- Name: direccion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.direccion (
    direccion_id integer NOT NULL,
    calle_principal character varying(100) NOT NULL,
    calle_secundaria character varying(100),
    numero character varying(20),
    parroquia_id character varying(10) NOT NULL
);


--
-- Name: direccion_direccion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.direccion_direccion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: direccion_direccion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.direccion_direccion_id_seq OWNED BY public.direccion.direccion_id;


--
-- Name: empleado_zona; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empleado_zona (
    empleado_id uuid NOT NULL,
    zona_id integer NOT NULL,
    fecha_asignacion date DEFAULT CURRENT_DATE,
    fecha_fin date,
    es_principal boolean DEFAULT false
);


--
-- Name: empleados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empleados (
    empleado_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    ciudadano_id character varying(10),
    cedula character varying(10),
    nombres character varying(100) DEFAULT 'SIN NOMBRE'::character varying NOT NULL,
    apellidos character varying(100) DEFAULT 'SIN APELLIDO'::character varying NOT NULL,
    fecha_nacimiento date,
    sexo_id integer,
    cargo_id integer NOT NULL,
    tipo_contrato_id integer NOT NULL,
    estado_empleado_id integer DEFAULT 1 NOT NULL,
    fecha_ingreso date NOT NULL,
    fecha_salida date,
    salario_base numeric(12,2),
    supervisor_id uuid,
    zonas_asignadas integer[],
    licencia_conducir character varying(20),
    tiene_vehiculo_empresa boolean DEFAULT false,
    telefono_interno character varying(20),
    email_interno character varying(150),
    foto_url character varying(255),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_fecha_salida CHECK (((fecha_salida IS NULL) OR (fecha_salida > fecha_ingreso)))
);


--
-- Name: empresa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresa (
    empresa_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre_comercial character varying(255),
    razon_social character varying(255),
    ruc character varying(13),
    direccion character varying(255) DEFAULT 'SIN DIRECCION'::character varying,
    parroquia_id character varying(10) NOT NULL,
    cliente_id character varying(13) NOT NULL,
    create_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    update_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    pais character varying(100)
);


--
-- Name: estado_civil; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estado_civil (
    estado_civil_id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(255)
);


--
-- Name: estado_civil_estado_civil_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estado_civil_estado_civil_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estado_civil_estado_civil_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estado_civil_estado_civil_id_seq OWNED BY public.estado_civil.estado_civil_id;


--
-- Name: estado_cliente_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estado_cliente_usuario (
    estado_cliente_usuario_id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    permite_login boolean DEFAULT true NOT NULL,
    requiere_verificacion boolean DEFAULT false,
    color_ui character varying(20) DEFAULT '#000000'::character varying,
    activo boolean DEFAULT true
);


--
-- Name: estado_cliente_usuario_estado_cliente_usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estado_cliente_usuario_estado_cliente_usuario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estado_cliente_usuario_estado_cliente_usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estado_cliente_usuario_estado_cliente_usuario_id_seq OWNED BY public.estado_cliente_usuario.estado_cliente_usuario_id;


--
-- Name: estado_empleado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estado_empleado (
    estado_empleado_id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    permite_acceso_sistema boolean DEFAULT true
);


--
-- Name: estado_empleado_estado_empleado_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estado_empleado_estado_empleado_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estado_empleado_estado_empleado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estado_empleado_estado_empleado_id_seq OWNED BY public.estado_empleado.estado_empleado_id;


--
-- Name: estado_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estado_pago (
    estado_pago_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255)
);


--
-- Name: estado_pago_estado_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estado_pago_estado_pago_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estado_pago_estado_pago_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estado_pago_estado_pago_id_seq OWNED BY public.estado_pago.estado_pago_id;


--
-- Name: factura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.factura (
    factura_id integer NOT NULL,
    cliente_id character varying(13) NOT NULL,
    forma_pago_id integer NOT NULL,
    estado_pago_id integer NOT NULL,
    numero_factura character varying(20) NOT NULL,
    fecha_pago timestamp without time zone,
    fecha_vencimiento timestamp without time zone NOT NULL,
    numero_serie character varying(20) NOT NULL,
    generado_xml boolean DEFAULT false NOT NULL,
    numero_xml character varying(20),
    valor_factura numeric(18,2) NOT NULL,
    iva numeric(18,2) NOT NULL,
    sub_total numeric(18,2) NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    descripcion character varying(255)
);


--
-- Name: factura_factura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.factura_factura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: factura_factura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.factura_factura_id_seq OWNED BY public.factura.factura_id;


--
-- Name: forma_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forma_pago (
    forma_pago_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255)
);


--
-- Name: forma_pago_forma_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forma_pago_forma_pago_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forma_pago_forma_pago_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forma_pago_forma_pago_id_seq OWNED BY public.forma_pago.forma_pago_id;


--
-- Name: foto_acometida; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.foto_acometida (
    foto_acometida_id integer NOT NULL,
    acometida_id character varying(10) NOT NULL,
    imagen_url character varying(255) NOT NULL,
    descripcion character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: foto_acometida_foto_acometida_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.foto_acometida_foto_acometida_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: foto_acometida_foto_acometida_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.foto_acometida_foto_acometida_id_seq OWNED BY public.foto_acometida.foto_acometida_id;


--
-- Name: foto_lectura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.foto_lectura (
    foto_lectura_id integer NOT NULL,
    lectura_id integer NOT NULL,
    imagen_url character varying(255) NOT NULL,
    clave_catastral character varying(10) NOT NULL,
    descripcion character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: foto_lectura_foto_lectura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.foto_lectura_foto_lectura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: foto_lectura_foto_lectura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.foto_lectura_foto_lectura_id_seq OWNED BY public.foto_lectura.foto_lectura_id;


--
-- Name: lectura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lectura (
    lectura_id integer NOT NULL,
    acometida_id character varying(10) NOT NULL,
    fecha_lectura timestamp without time zone DEFAULT now(),
    hora_lectura time without time zone DEFAULT (now())::time without time zone,
    sector integer NOT NULL,
    cuenta integer NOT NULL,
    clave_catastral character varying(10) NOT NULL,
    valor_lectura numeric(18,2),
    tasa_alcantarillado numeric(18,2),
    lectura_anterior numeric(10,2),
    lectura_actual numeric(10,2),
    codigo_ingreso_renta integer,
    novedad character varying(255),
    codigo_ingreso integer,
    tipo_novedad_lectura_id integer,
    lectura_estado_id integer,
    mes_lectura character(7)
);


--
-- Name: lectura_estado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lectura_estado (
    lectura_estado_id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    tipo_estado_lectura_id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(255),
    activo boolean DEFAULT true NOT NULL,
    orden smallint DEFAULT 0 NOT NULL,
    es_inicial boolean DEFAULT false NOT NULL
);


--
-- Name: lectura_estado_lectura_estado_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lectura_estado_lectura_estado_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lectura_estado_lectura_estado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lectura_estado_lectura_estado_id_seq OWNED BY public.lectura_estado.lectura_estado_id;


--
-- Name: lectura_lectura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lectura_lectura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lectura_lectura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lectura_lectura_id_seq OWNED BY public.lectura.lectura_id;


--
-- Name: observacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.observacion (
    observacion_id integer NOT NULL,
    titulo_observacion character varying(100) NOT NULL,
    detalle_observacion character varying(255) NOT NULL
);


--
-- Name: observacion_acometida; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.observacion_acometida (
    observacion_acometida_id integer NOT NULL,
    observacion_id integer NOT NULL,
    acometida_id character varying(10) NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: observacion_acometida_observacion_acometida_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.observacion_acometida_observacion_acometida_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: observacion_acometida_observacion_acometida_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.observacion_acometida_observacion_acometida_id_seq OWNED BY public.observacion_acometida.observacion_acometida_id;


--
-- Name: observacion_factura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.observacion_factura (
    observacion_factura_id integer NOT NULL,
    observacion_id integer NOT NULL,
    factura_id integer NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: observacion_factura_observacion_factura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.observacion_factura_observacion_factura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: observacion_factura_observacion_factura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.observacion_factura_observacion_factura_id_seq OWNED BY public.observacion_factura.observacion_factura_id;


--
-- Name: observacion_lectura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.observacion_lectura (
    observacion_lectura_id integer NOT NULL,
    observacion_id integer NOT NULL,
    lectura_id integer NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: observacion_lectura_observacion_lectura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.observacion_lectura_observacion_lectura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: observacion_lectura_observacion_lectura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.observacion_lectura_observacion_lectura_id_seq OWNED BY public.observacion_lectura.observacion_lectura_id;


--
-- Name: observacion_observacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.observacion_observacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: observacion_observacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.observacion_observacion_id_seq OWNED BY public.observacion.observacion_id;


--
-- Name: pais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pais (
    pais_id character varying(3) NOT NULL,
    nombre character varying(100) NOT NULL
);


--
-- Name: parroquia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parroquia (
    parroquia_id character varying(10) NOT NULL,
    nombre character varying(100) NOT NULL,
    canton_id character varying(8) NOT NULL,
    tipo_parroquia_id character varying(5) NOT NULL
);


--
-- Name: permiso_categoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permiso_categoria (
    categoria_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255),
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: permiso_categoria_categoria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permiso_categoria_categoria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permiso_categoria_categoria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permiso_categoria_categoria_id_seq OWNED BY public.permiso_categoria.categoria_id;


--
-- Name: permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permisos (
    permiso_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255),
    scopes text,
    activo boolean DEFAULT true NOT NULL,
    categoria_id integer
);


--
-- Name: permisos_permiso_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permisos_permiso_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permisos_permiso_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permisos_permiso_id_seq OWNED BY public.permisos.permiso_id;


--
-- Name: predio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.predio (
    predio_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    clave_catastral character varying(25),
    cliente_id character varying(13) NOT NULL,
    callejon character varying(150) NOT NULL,
    sector character varying(100) NOT NULL,
    tipo_predio_id integer NOT NULL,
    direccion character varying(255) NOT NULL,
    area_terreno numeric(10,2),
    area_construccion numeric(10,2),
    valor_terreno numeric(18,2),
    valor_construccion numeric(18,2),
    valor_comercial numeric(18,2),
    referencia character varying(255),
    altitud double precision,
    "precision" double precision,
    fecha_geolocalizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    zona_geometrica public.geometry(Polygon,4326),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    coordenadas public.geometry(Point,4326)
);


--
-- Name: profesion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profesion (
    profesion_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255)
);


--
-- Name: profesion_profesion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.profesion_profesion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: profesion_profesion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.profesion_profesion_id_seq OWNED BY public.profesion.profesion_id;


--
-- Name: provincia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provincia (
    provincia_id character varying(8) NOT NULL,
    nombre character varying(100) NOT NULL,
    pais_id character varying(3) NOT NULL
);


--
-- Name: qrcode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qrcode (
    qrcode_id integer NOT NULL,
    acometida_id character varying(10) NOT NULL,
    imagen_bytea bytea,
    qrcode_url text,
    updated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: qrcode_qrcode_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.qrcode_qrcode_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: qrcode_qrcode_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.qrcode_qrcode_id_seq OWNED BY public.qrcode.qrcode_id;


--
-- Name: rangos_variables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rangos_variables (
    id integer NOT NULL,
    tarifa_id integer NOT NULL,
    servicio_id integer NOT NULL,
    min_consumo numeric(10,2) NOT NULL,
    max_consumo numeric(10,2),
    tasa_por_m3 numeric(10,4) NOT NULL,
    CONSTRAINT chk_rangos CHECK (((max_consumo IS NULL) OR (max_consumo > min_consumo)))
);


--
-- Name: rangos_variables_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rangos_variables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rangos_variables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rangos_variables_id_seq OWNED BY public.rangos_variables.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id bigint NOT NULL,
    usuario_id uuid NOT NULL,
    token_hash text NOT NULL,
    jti uuid DEFAULT gen_random_uuid(),
    expires_at timestamp with time zone NOT NULL,
    revoked boolean DEFAULT false,
    revoked_at timestamp with time zone,
    device_info text,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now(),
    last_used_at timestamp with time zone DEFAULT now()
);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: rol_permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rol_permisos (
    rol_permiso_id integer NOT NULL,
    rol_id integer NOT NULL,
    permiso_id integer NOT NULL
);


--
-- Name: rol_permisos_rol_permiso_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rol_permisos_rol_permiso_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rol_permisos_rol_permiso_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rol_permisos_rol_permiso_id_seq OWNED BY public.rol_permisos.rol_permiso_id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    rol_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255),
    parent_rol_id integer,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: roles_rol_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_rol_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_rol_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_rol_id_seq OWNED BY public.roles.rol_id;


--
-- Name: seguimiento_lectura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seguimiento_lectura (
    seguimiento_lectura_id integer NOT NULL,
    acometida_id character varying(10) NOT NULL,
    lectura_id integer NOT NULL,
    usuario_id uuid DEFAULT 'e3400d18-86e1-4eee-9a8b-3e7eaf812a95'::uuid,
    lectura_estado_id integer NOT NULL,
    lectura_estado_anterior_id integer,
    accion character varying(100) NOT NULL,
    descripcion character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: seguimiento_lectura_seguimiento_lectura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seguimiento_lectura_seguimiento_lectura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seguimiento_lectura_seguimiento_lectura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.seguimiento_lectura_seguimiento_lectura_id_seq OWNED BY public.seguimiento_lectura.seguimiento_lectura_id;


--
-- Name: servicio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.servicio (
    servicio_id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text
);


--
-- Name: servicio_servicio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.servicio_servicio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: servicio_servicio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.servicio_servicio_id_seq OWNED BY public.servicio.servicio_id;


--
-- Name: sexo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sexo (
    sexo_id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(255)
);


--
-- Name: sexo_sexo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sexo_sexo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sexo_sexo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sexo_sexo_id_seq OWNED BY public.sexo.sexo_id;


--
-- Name: siguiente_lectura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.siguiente_lectura (
    siguiente_lectura_id integer NOT NULL,
    acometida_id character varying(10) NOT NULL,
    ultima_lectura_id integer,
    fecha_siguiente_lectura timestamp without time zone NOT NULL,
    fecha_inicio_periodo timestamp without time zone NOT NULL,
    fecha_fin_periodo timestamp without time zone NOT NULL,
    dias_tolerancia smallint DEFAULT 5 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_siguiente_lectura_fechas CHECK ((fecha_fin_periodo >= fecha_inicio_periodo)),
    CONSTRAINT siguiente_lectura_dias_tolerancia_check CHECK ((dias_tolerancia >= 0))
);


--
-- Name: siguiente_lectura_siguiente_lectura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.siguiente_lectura_siguiente_lectura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: siguiente_lectura_siguiente_lectura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.siguiente_lectura_siguiente_lectura_id_seq OWNED BY public.siguiente_lectura.siguiente_lectura_id;


--
-- Name: tarifa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tarifa (
    tarifa_id integer NOT NULL,
    categoria_id integer NOT NULL,
    effective_date date NOT NULL,
    end_date date,
    descripcion text,
    CONSTRAINT chk_dates CHECK (((end_date IS NULL) OR (end_date > effective_date)))
);


--
-- Name: tarifa_tarifa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tarifa_tarifa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tarifa_tarifa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tarifa_tarifa_id_seq OWNED BY public.tarifa.tarifa_id;


--
-- Name: telefono_empresa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telefono_empresa (
    telefono_empresa_id integer NOT NULL,
    telefono_id integer NOT NULL,
    empresa_id uuid NOT NULL
);


--
-- Name: telefono_empresa_telefono_empresa_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.telefono_empresa_telefono_empresa_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: telefono_empresa_telefono_empresa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.telefono_empresa_telefono_empresa_id_seq OWNED BY public.telefono_empresa.telefono_empresa_id;


--
-- Name: telefono_persona_natural; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telefono_persona_natural (
    telefono_persona_natural_id integer NOT NULL,
    telefono_id integer NOT NULL,
    cliente_persona_natural_id integer NOT NULL
);


--
-- Name: telefono_persona_natural_telefono_persona_natural_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.telefono_persona_natural_telefono_persona_natural_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: telefono_persona_natural_telefono_persona_natural_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.telefono_persona_natural_telefono_persona_natural_id_seq OWNED BY public.telefono_persona_natural.telefono_persona_natural_id;


--
-- Name: telefono_telefono_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.telefono_telefono_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: telefono_telefono_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.telefono_telefono_id_seq OWNED BY public.telefono.telefono_id;


--
-- Name: tipo_contrato; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_contrato (
    tipo_contrato_id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    duracion_max_meses smallint
);


--
-- Name: tipo_contrato_tipo_contrato_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipo_contrato_tipo_contrato_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipo_contrato_tipo_contrato_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipo_contrato_tipo_contrato_id_seq OWNED BY public.tipo_contrato.tipo_contrato_id;


--
-- Name: tipo_estado_lectura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_estado_lectura (
    tipo_estado_lectura_id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(255),
    permite_facturar boolean DEFAULT true NOT NULL
);


--
-- Name: tipo_estado_lectura_tipo_estado_lectura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipo_estado_lectura_tipo_estado_lectura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipo_estado_lectura_tipo_estado_lectura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipo_estado_lectura_tipo_estado_lectura_id_seq OWNED BY public.tipo_estado_lectura.tipo_estado_lectura_id;


--
-- Name: tipo_identificacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_identificacion (
    tipo_identificacion_id character varying(5) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255)
);


--
-- Name: tipo_novedad_lectura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_novedad_lectura (
    tipo_novedad_lectura_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255),
    min_porcentaje numeric(5,2),
    max_porcentaje numeric(5,2),
    accion_recomendada text
);


--
-- Name: tipo_novedad_lectura_tipo_novedad_lectura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipo_novedad_lectura_tipo_novedad_lectura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipo_novedad_lectura_tipo_novedad_lectura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipo_novedad_lectura_tipo_novedad_lectura_id_seq OWNED BY public.tipo_novedad_lectura.tipo_novedad_lectura_id;


--
-- Name: tipo_parroquia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_parroquia (
    tipo_parroquia_id character varying(5) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255)
);


--
-- Name: tipo_predio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_predio (
    tipo_predio_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255)
);


--
-- Name: tipo_predio_tipo_predio_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipo_predio_tipo_predio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipo_predio_tipo_predio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipo_predio_tipo_predio_id_seq OWNED BY public.tipo_predio.tipo_predio_id;


--
-- Name: tipo_relacion_familiar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_relacion_familiar (
    tipo_relacion_familiar_id integer NOT NULL,
    parentesco character varying(50) NOT NULL,
    descripcion character varying(255)
);


--
-- Name: tipo_relacion_familiar_tipo_relacion_familiar_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipo_relacion_familiar_tipo_relacion_familiar_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipo_relacion_familiar_tipo_relacion_familiar_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipo_relacion_familiar_tipo_relacion_familiar_id_seq OWNED BY public.tipo_relacion_familiar.tipo_relacion_familiar_id;


--
-- Name: tipo_telefono; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_telefono (
    tipo_telefono_id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(255)
);


--
-- Name: tipo_telefono_tipo_telefono_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipo_telefono_tipo_telefono_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipo_telefono_tipo_telefono_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipo_telefono_tipo_telefono_id_seq OWNED BY public.tipo_telefono.tipo_telefono_id;


--
-- Name: tipo_titulo_dato; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_titulo_dato (
    tipo_titulo_dato_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255)
);


--
-- Name: tipo_titulo_dato_tipo_titulo_dato_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tipo_titulo_dato_tipo_titulo_dato_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tipo_titulo_dato_tipo_titulo_dato_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tipo_titulo_dato_tipo_titulo_dato_id_seq OWNED BY public.tipo_titulo_dato.tipo_titulo_dato_id;


--
-- Name: titulo_dato; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.titulo_dato (
    titulo_dato_id integer NOT NULL,
    tipo_titulo_dato_id integer NOT NULL,
    cliente_id character varying(13) NOT NULL,
    descripcion character varying(255),
    fecha_emision date,
    fecha_vencimiento date,
    monto numeric(15,4) NOT NULL,
    estado character varying(50) DEFAULT 'PENDIENTE'::character varying NOT NULL
);


--
-- Name: titulo_dato_titulo_dato_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.titulo_dato_titulo_dato_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: titulo_dato_titulo_dato_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.titulo_dato_titulo_dato_id_seq OWNED BY public.titulo_dato.titulo_dato_id;


--
-- Name: usuario_factura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_factura (
    usuario_factura_id integer NOT NULL,
    usuario_id uuid NOT NULL,
    factura_id integer NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    descripcion character varying(255)
);


--
-- Name: usuario_factura_usuario_factura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuario_factura_usuario_factura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuario_factura_usuario_factura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuario_factura_usuario_factura_id_seq OWNED BY public.usuario_factura.usuario_factura_id;


--
-- Name: usuario_lectura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_lectura (
    usuario_lectura_id integer NOT NULL,
    usuario_id uuid NOT NULL,
    lectura_id integer NOT NULL,
    create_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    update_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: usuario_lectura_usuario_lectura_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuario_lectura_usuario_lectura_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuario_lectura_usuario_lectura_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuario_lectura_usuario_lectura_id_seq OWNED BY public.usuario_lectura.usuario_lectura_id;


--
-- Name: usuario_permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_permisos (
    usuario_permiso_id integer NOT NULL,
    usuario_id uuid NOT NULL,
    permiso_id integer NOT NULL,
    fecha_asignacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_expiracion timestamp without time zone
);


--
-- Name: usuario_permisos_usuario_permiso_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuario_permisos_usuario_permiso_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuario_permisos_usuario_permiso_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuario_permisos_usuario_permiso_id_seq OWNED BY public.usuario_permisos.usuario_permiso_id;


--
-- Name: usuario_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario_roles (
    usuario_rol_id integer NOT NULL,
    usuario_id uuid NOT NULL,
    rol_id integer NOT NULL,
    fecha_asignacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: usuario_roles_usuario_rol_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuario_roles_usuario_rol_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuario_roles_usuario_rol_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuario_roles_usuario_rol_id_seq OWNED BY public.usuario_roles.usuario_rol_id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    usuario_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    email character varying(100) NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login timestamp without time zone,
    failed_attempts integer DEFAULT 0 NOT NULL,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    observaciones character varying(255),
    CONSTRAINT usuarios_failed_attempts_check CHECK ((failed_attempts >= 0))
);


--
-- Name: vw_calendario_completo; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_calendario_completo AS
 WITH lecturas_historicas AS (
         SELECT l.acometida_id,
            a.direccion,
            to_char(l.fecha_lectura, 'YYYY-MM'::text) AS mes,
            l.fecha_lectura,
            le.nombre AS estado,
            l.valor_lectura,
            'HISTORICA'::text AS tipo
           FROM ((public.lectura l
             JOIN public.lectura_estado le ON ((le.lectura_estado_id = l.lectura_estado_id)))
             JOIN public.acometida a ON (((a.acometida_id)::text = (l.acometida_id)::text)))
        ), proxima AS (
         SELECT sl.acometida_id,
            a.direccion,
            to_char(sl.fecha_siguiente_lectura, 'YYYY-MM'::text) AS mes,
            sl.fecha_siguiente_lectura AS fecha_lectura,
            'PROXIMA'::text AS estado,
            NULL::numeric AS valor_lectura,
            'PROGRAMADA'::text AS tipo
           FROM (public.siguiente_lectura sl
             JOIN public.acometida a ON (((a.acometida_id)::text = (sl.acometida_id)::text)))
        )
 SELECT lecturas_historicas.acometida_id,
    lecturas_historicas.direccion,
    lecturas_historicas.mes,
    lecturas_historicas.fecha_lectura,
    lecturas_historicas.estado,
    lecturas_historicas.valor_lectura,
    lecturas_historicas.tipo
   FROM lecturas_historicas
UNION ALL
 SELECT proxima.acometida_id,
    proxima.direccion,
    proxima.mes,
    proxima.fecha_lectura,
    proxima.estado,
    proxima.valor_lectura,
    proxima.tipo
   FROM proxima;


--
-- Name: vw_calendario_lecturas; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_calendario_lecturas AS
 WITH historial AS (
         SELECT l.acometida_id,
            a.direccion,
            to_char(l.fecha_lectura, 'YYYY-MM'::text) AS mes,
            l.fecha_lectura,
            le.nombre AS estado,
            'REALIZADA'::text AS tipo
           FROM ((public.lectura l
             JOIN public.lectura_estado le ON ((le.lectura_estado_id = l.lectura_estado_id)))
             JOIN public.acometida a ON (((a.acometida_id)::text = (l.acometida_id)::text)))
          WHERE ((le.codigo)::text = ANY ((ARRAY['REAL'::character varying, 'FACT'::character varying])::text[]))
        ), proxima AS (
         SELECT sl.acometida_id,
            a.direccion,
            to_char(sl.fecha_siguiente_lectura, 'YYYY-MM'::text) AS mes,
            sl.fecha_siguiente_lectura,
            'PROGRAMADA'::text AS estado,
            'PROXIMA'::text AS tipo
           FROM (public.siguiente_lectura sl
             JOIN public.acometida a ON (((a.acometida_id)::text = (sl.acometida_id)::text)))
        )
 SELECT historial.acometida_id,
    historial.direccion,
    historial.mes,
    historial.fecha_lectura,
    historial.estado,
    historial.tipo
   FROM historial
UNION ALL
 SELECT proxima.acometida_id,
    proxima.direccion,
    proxima.mes,
    proxima.fecha_siguiente_lectura AS fecha_lectura,
    proxima.estado,
    proxima.tipo
   FROM proxima;


--
-- Name: vw_historial_lectura; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_historial_lectura AS
 SELECT s.seguimiento_lectura_id,
    s.acometida_id,
    s.lectura_id,
    le.nombre AS estado_actual,
    lea.nombre AS estado_anterior,
    u.username AS usuario,
    s.accion,
    s.descripcion,
    s.created_at
   FROM (((public.seguimiento_lectura s
     JOIN public.lectura_estado le ON ((le.lectura_estado_id = s.lectura_estado_id)))
     LEFT JOIN public.lectura_estado lea ON ((lea.lectura_estado_id = s.lectura_estado_anterior_id)))
     JOIN public.usuarios u ON ((u.usuario_id = s.usuario_id)))
  ORDER BY s.created_at DESC;


--
-- Name: zona; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zona (
    zona_id integer NOT NULL,
    codigo character varying(25) NOT NULL,
    nombre character varying(100),
    descripcion character varying(255)
);


--
-- Name: zona_zona_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zona_zona_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zona_zona_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zona_zona_id_seq OWNED BY public.zona.zona_id;


--
-- Name: cargo cargo_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargo ALTER COLUMN cargo_id SET DEFAULT nextval('public.cargo_cargo_id_seq'::regclass);


--
-- Name: categoria categoria_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria ALTER COLUMN categoria_id SET DEFAULT nextval('public.categoria_categoria_id_seq'::regclass);


--
-- Name: cliente_persona_natural cliente_persona_natural_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_persona_natural ALTER COLUMN cliente_persona_natural_id SET DEFAULT nextval('public.cliente_persona_natural_cliente_persona_natural_id_seq'::regclass);


--
-- Name: componentes_fijos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.componentes_fijos ALTER COLUMN id SET DEFAULT nextval('public.componentes_fijos_id_seq'::regclass);


--
-- Name: correo_electronico correo_electronico_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correo_electronico ALTER COLUMN correo_electronico_id SET DEFAULT nextval('public.correo_electronico_correo_electronico_id_seq'::regclass);


--
-- Name: correo_empresa correo_empresa_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correo_empresa ALTER COLUMN correo_empresa_id SET DEFAULT nextval('public.correo_empresa_correo_empresa_id_seq'::regclass);


--
-- Name: correo_persona_natural correo_persona_natural_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correo_persona_natural ALTER COLUMN correo_persona_natural_id SET DEFAULT nextval('public.correo_persona_natural_correo_persona_natural_id_seq'::regclass);


--
-- Name: direccion direccion_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direccion ALTER COLUMN direccion_id SET DEFAULT nextval('public.direccion_direccion_id_seq'::regclass);


--
-- Name: estado_civil estado_civil_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_civil ALTER COLUMN estado_civil_id SET DEFAULT nextval('public.estado_civil_estado_civil_id_seq'::regclass);


--
-- Name: estado_cliente_usuario estado_cliente_usuario_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_cliente_usuario ALTER COLUMN estado_cliente_usuario_id SET DEFAULT nextval('public.estado_cliente_usuario_estado_cliente_usuario_id_seq'::regclass);


--
-- Name: estado_empleado estado_empleado_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_empleado ALTER COLUMN estado_empleado_id SET DEFAULT nextval('public.estado_empleado_estado_empleado_id_seq'::regclass);


--
-- Name: estado_pago estado_pago_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_pago ALTER COLUMN estado_pago_id SET DEFAULT nextval('public.estado_pago_estado_pago_id_seq'::regclass);


--
-- Name: factura factura_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura ALTER COLUMN factura_id SET DEFAULT nextval('public.factura_factura_id_seq'::regclass);


--
-- Name: forma_pago forma_pago_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forma_pago ALTER COLUMN forma_pago_id SET DEFAULT nextval('public.forma_pago_forma_pago_id_seq'::regclass);


--
-- Name: foto_acometida foto_acometida_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foto_acometida ALTER COLUMN foto_acometida_id SET DEFAULT nextval('public.foto_acometida_foto_acometida_id_seq'::regclass);


--
-- Name: foto_lectura foto_lectura_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foto_lectura ALTER COLUMN foto_lectura_id SET DEFAULT nextval('public.foto_lectura_foto_lectura_id_seq'::regclass);


--
-- Name: lectura lectura_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lectura ALTER COLUMN lectura_id SET DEFAULT nextval('public.lectura_lectura_id_seq'::regclass);


--
-- Name: lectura_estado lectura_estado_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lectura_estado ALTER COLUMN lectura_estado_id SET DEFAULT nextval('public.lectura_estado_lectura_estado_id_seq'::regclass);


--
-- Name: observacion observacion_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observacion ALTER COLUMN observacion_id SET DEFAULT nextval('public.observacion_observacion_id_seq'::regclass);


--
-- Name: observacion_acometida observacion_acometida_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observacion_acometida ALTER COLUMN observacion_acometida_id SET DEFAULT nextval('public.observacion_acometida_observacion_acometida_id_seq'::regclass);


--
-- Name: observacion_factura observacion_factura_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observacion_factura ALTER COLUMN observacion_factura_id SET DEFAULT nextval('public.observacion_factura_observacion_factura_id_seq'::regclass);


--
-- Name: observacion_lectura observacion_lectura_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observacion_lectura ALTER COLUMN observacion_lectura_id SET DEFAULT nextval('public.observacion_lectura_observacion_lectura_id_seq'::regclass);


--
-- Name: permiso_categoria categoria_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_categoria ALTER COLUMN categoria_id SET DEFAULT nextval('public.permiso_categoria_categoria_id_seq'::regclass);


--
-- Name: permisos permiso_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos ALTER COLUMN permiso_id SET DEFAULT nextval('public.permisos_permiso_id_seq'::regclass);


--
-- Name: profesion profesion_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profesion ALTER COLUMN profesion_id SET DEFAULT nextval('public.profesion_profesion_id_seq'::regclass);


--
-- Name: qrcode qrcode_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qrcode ALTER COLUMN qrcode_id SET DEFAULT nextval('public.qrcode_qrcode_id_seq'::regclass);


--
-- Name: rangos_variables id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rangos_variables ALTER COLUMN id SET DEFAULT nextval('public.rangos_variables_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: rol_permisos rol_permiso_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_permisos ALTER COLUMN rol_permiso_id SET DEFAULT nextval('public.rol_permisos_rol_permiso_id_seq'::regclass);


--
-- Name: roles rol_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN rol_id SET DEFAULT nextval('public.roles_rol_id_seq'::regclass);


--
-- Name: seguimiento_lectura seguimiento_lectura_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimiento_lectura ALTER COLUMN seguimiento_lectura_id SET DEFAULT nextval('public.seguimiento_lectura_seguimiento_lectura_id_seq'::regclass);


--
-- Name: servicio servicio_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicio ALTER COLUMN servicio_id SET DEFAULT nextval('public.servicio_servicio_id_seq'::regclass);


--
-- Name: sexo sexo_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sexo ALTER COLUMN sexo_id SET DEFAULT nextval('public.sexo_sexo_id_seq'::regclass);


--
-- Name: siguiente_lectura siguiente_lectura_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siguiente_lectura ALTER COLUMN siguiente_lectura_id SET DEFAULT nextval('public.siguiente_lectura_siguiente_lectura_id_seq'::regclass);


--
-- Name: tarifa tarifa_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarifa ALTER COLUMN tarifa_id SET DEFAULT nextval('public.tarifa_tarifa_id_seq'::regclass);


--
-- Name: telefono telefono_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telefono ALTER COLUMN telefono_id SET DEFAULT nextval('public.telefono_telefono_id_seq'::regclass);


--
-- Name: telefono_empresa telefono_empresa_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telefono_empresa ALTER COLUMN telefono_empresa_id SET DEFAULT nextval('public.telefono_empresa_telefono_empresa_id_seq'::regclass);


--
-- Name: telefono_persona_natural telefono_persona_natural_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telefono_persona_natural ALTER COLUMN telefono_persona_natural_id SET DEFAULT nextval('public.telefono_persona_natural_telefono_persona_natural_id_seq'::regclass);


--
-- Name: tipo_contrato tipo_contrato_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_contrato ALTER COLUMN tipo_contrato_id SET DEFAULT nextval('public.tipo_contrato_tipo_contrato_id_seq'::regclass);


--
-- Name: tipo_estado_lectura tipo_estado_lectura_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_estado_lectura ALTER COLUMN tipo_estado_lectura_id SET DEFAULT nextval('public.tipo_estado_lectura_tipo_estado_lectura_id_seq'::regclass);


--
-- Name: tipo_novedad_lectura tipo_novedad_lectura_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_novedad_lectura ALTER COLUMN tipo_novedad_lectura_id SET DEFAULT nextval('public.tipo_novedad_lectura_tipo_novedad_lectura_id_seq'::regclass);


--
-- Name: tipo_predio tipo_predio_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_predio ALTER COLUMN tipo_predio_id SET DEFAULT nextval('public.tipo_predio_tipo_predio_id_seq'::regclass);


--
-- Name: tipo_relacion_familiar tipo_relacion_familiar_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_relacion_familiar ALTER COLUMN tipo_relacion_familiar_id SET DEFAULT nextval('public.tipo_relacion_familiar_tipo_relacion_familiar_id_seq'::regclass);


--
-- Name: tipo_telefono tipo_telefono_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_telefono ALTER COLUMN tipo_telefono_id SET DEFAULT nextval('public.tipo_telefono_tipo_telefono_id_seq'::regclass);


--
-- Name: tipo_titulo_dato tipo_titulo_dato_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_titulo_dato ALTER COLUMN tipo_titulo_dato_id SET DEFAULT nextval('public.tipo_titulo_dato_tipo_titulo_dato_id_seq'::regclass);


--
-- Name: titulo_dato titulo_dato_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titulo_dato ALTER COLUMN titulo_dato_id SET DEFAULT nextval('public.titulo_dato_titulo_dato_id_seq'::regclass);


--
-- Name: usuario_factura usuario_factura_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_factura ALTER COLUMN usuario_factura_id SET DEFAULT nextval('public.usuario_factura_usuario_factura_id_seq'::regclass);


--
-- Name: usuario_lectura usuario_lectura_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_lectura ALTER COLUMN usuario_lectura_id SET DEFAULT nextval('public.usuario_lectura_usuario_lectura_id_seq'::regclass);


--
-- Name: usuario_permisos usuario_permiso_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_permisos ALTER COLUMN usuario_permiso_id SET DEFAULT nextval('public.usuario_permisos_usuario_permiso_id_seq'::regclass);


--
-- Name: usuario_roles usuario_rol_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_roles ALTER COLUMN usuario_rol_id SET DEFAULT nextval('public.usuario_roles_usuario_rol_id_seq'::regclass);


--
-- Name: zona zona_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zona ALTER COLUMN zona_id SET DEFAULT nextval('public.zona_zona_id_seq'::regclass);


--
-- Name: acometida acometida_clave_catastral_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acometida
    ADD CONSTRAINT acometida_clave_catastral_key UNIQUE (clave_catastral);


--
-- Name: cargo cargo_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargo
    ADD CONSTRAINT cargo_nombre_key UNIQUE (nombre);


--
-- Name: cargo cargo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cargo
    ADD CONSTRAINT cargo_pkey PRIMARY KEY (cargo_id);


--
-- Name: categoria categoria_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria
    ADD CONSTRAINT categoria_nombre_key UNIQUE (nombre);


--
-- Name: cliente_usuario cliente_usuario_cliente_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_usuario
    ADD CONSTRAINT cliente_usuario_cliente_id_key UNIQUE (cliente_id);


--
-- Name: cliente_usuario cliente_usuario_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_usuario
    ADD CONSTRAINT cliente_usuario_email_key UNIQUE (email);


--
-- Name: cliente_usuario cliente_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_usuario
    ADD CONSTRAINT cliente_usuario_pkey PRIMARY KEY (cliente_usuario_id);


--
-- Name: componentes_fijos componentes_fijos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.componentes_fijos
    ADD CONSTRAINT componentes_fijos_pkey PRIMARY KEY (id);


--
-- Name: consumo_promedio consumo_promedio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumo_promedio
    ADD CONSTRAINT consumo_promedio_pkey PRIMARY KEY (acometida_id);


--
-- Name: empleado_zona empleado_zona_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_zona
    ADD CONSTRAINT empleado_zona_pkey PRIMARY KEY (empleado_id, zona_id);


--
-- Name: empleados empleados_cedula_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_cedula_key UNIQUE (cedula);


--
-- Name: empleados empleados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_pkey PRIMARY KEY (empleado_id);


--
-- Name: empleados empleados_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_usuario_id_key UNIQUE (usuario_id);


--
-- Name: estado_cliente_usuario estado_cliente_usuario_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_cliente_usuario
    ADD CONSTRAINT estado_cliente_usuario_codigo_key UNIQUE (codigo);


--
-- Name: estado_cliente_usuario estado_cliente_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_cliente_usuario
    ADD CONSTRAINT estado_cliente_usuario_pkey PRIMARY KEY (estado_cliente_usuario_id);


--
-- Name: estado_empleado estado_empleado_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_empleado
    ADD CONSTRAINT estado_empleado_codigo_key UNIQUE (codigo);


--
-- Name: estado_empleado estado_empleado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_empleado
    ADD CONSTRAINT estado_empleado_pkey PRIMARY KEY (estado_empleado_id);


--
-- Name: lectura_estado lectura_estado_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lectura_estado
    ADD CONSTRAINT lectura_estado_codigo_key UNIQUE (codigo);


--
-- Name: permiso_categoria permiso_categoria_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_categoria
    ADD CONSTRAINT permiso_categoria_nombre_key UNIQUE (nombre);


--
-- Name: permiso_categoria permiso_categoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permiso_categoria
    ADD CONSTRAINT permiso_categoria_pkey PRIMARY KEY (categoria_id);


--
-- Name: permisos permisos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_nombre_key UNIQUE (nombre);


--
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (permiso_id);


--
-- Name: acometida pk_acometida; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acometida
    ADD CONSTRAINT pk_acometida PRIMARY KEY (acometida_id);


--
-- Name: canton pk_canton; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canton
    ADD CONSTRAINT pk_canton PRIMARY KEY (canton_id);


--
-- Name: categoria pk_categoria; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria
    ADD CONSTRAINT pk_categoria PRIMARY KEY (categoria_id);


--
-- Name: ciudadano pk_ciudadano; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciudadano
    ADD CONSTRAINT pk_ciudadano PRIMARY KEY (ciudadano_id);


--
-- Name: cliente pk_cliente; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT pk_cliente PRIMARY KEY (cliente_id);


--
-- Name: cliente_persona_natural pk_cliente_persona_natural; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_persona_natural
    ADD CONSTRAINT pk_cliente_persona_natural PRIMARY KEY (cliente_persona_natural_id);


--
-- Name: correo_electronico pk_correo_electronico; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correo_electronico
    ADD CONSTRAINT pk_correo_electronico PRIMARY KEY (correo_electronico_id);


--
-- Name: correo_empresa pk_correo_empresa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correo_empresa
    ADD CONSTRAINT pk_correo_empresa PRIMARY KEY (correo_empresa_id);


--
-- Name: correo_persona_natural pk_correo_persona_natural; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correo_persona_natural
    ADD CONSTRAINT pk_correo_persona_natural PRIMARY KEY (correo_persona_natural_id);


--
-- Name: direccion pk_direccion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direccion
    ADD CONSTRAINT pk_direccion PRIMARY KEY (direccion_id);


--
-- Name: empresa pk_empresa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa
    ADD CONSTRAINT pk_empresa PRIMARY KEY (empresa_id);


--
-- Name: estado_civil pk_estado_civil; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_civil
    ADD CONSTRAINT pk_estado_civil PRIMARY KEY (estado_civil_id);


--
-- Name: estado_pago pk_estado_pago; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_pago
    ADD CONSTRAINT pk_estado_pago PRIMARY KEY (estado_pago_id);


--
-- Name: factura pk_factura; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura
    ADD CONSTRAINT pk_factura PRIMARY KEY (factura_id);


--
-- Name: forma_pago pk_forma_pago; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forma_pago
    ADD CONSTRAINT pk_forma_pago PRIMARY KEY (forma_pago_id);


--
-- Name: foto_acometida pk_foto_acometida; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foto_acometida
    ADD CONSTRAINT pk_foto_acometida PRIMARY KEY (foto_acometida_id);


--
-- Name: foto_lectura pk_foto_lectura; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foto_lectura
    ADD CONSTRAINT pk_foto_lectura PRIMARY KEY (foto_lectura_id);


--
-- Name: lectura pk_lectura; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lectura
    ADD CONSTRAINT pk_lectura PRIMARY KEY (lectura_id);


--
-- Name: lectura_estado pk_lectura_estado; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lectura_estado
    ADD CONSTRAINT pk_lectura_estado PRIMARY KEY (lectura_estado_id);


--
-- Name: observacion pk_observacion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observacion
    ADD CONSTRAINT pk_observacion PRIMARY KEY (observacion_id);


--
-- Name: observacion_acometida pk_observacion_acometida; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observacion_acometida
    ADD CONSTRAINT pk_observacion_acometida PRIMARY KEY (observacion_acometida_id);


--
-- Name: observacion_factura pk_observacion_factura; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observacion_factura
    ADD CONSTRAINT pk_observacion_factura PRIMARY KEY (observacion_factura_id);


--
-- Name: observacion_lectura pk_observacion_lectura; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observacion_lectura
    ADD CONSTRAINT pk_observacion_lectura PRIMARY KEY (observacion_lectura_id);


--
-- Name: pais pk_pais; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pais
    ADD CONSTRAINT pk_pais PRIMARY KEY (pais_id);


--
-- Name: parroquia pk_parroquia; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parroquia
    ADD CONSTRAINT pk_parroquia PRIMARY KEY (parroquia_id);


--
-- Name: predio pk_predio; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predio
    ADD CONSTRAINT pk_predio PRIMARY KEY (predio_id);


--
-- Name: profesion pk_profesion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profesion
    ADD CONSTRAINT pk_profesion PRIMARY KEY (profesion_id);


--
-- Name: provincia pk_provincia; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provincia
    ADD CONSTRAINT pk_provincia PRIMARY KEY (provincia_id);


--
-- Name: servicio pk_servicio; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicio
    ADD CONSTRAINT pk_servicio PRIMARY KEY (servicio_id);


--
-- Name: sexo pk_sexo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sexo
    ADD CONSTRAINT pk_sexo PRIMARY KEY (sexo_id);


--
-- Name: tarifa pk_tarifa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarifa
    ADD CONSTRAINT pk_tarifa PRIMARY KEY (tarifa_id);


--
-- Name: telefono pk_telefono; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telefono
    ADD CONSTRAINT pk_telefono PRIMARY KEY (telefono_id);


--
-- Name: telefono_empresa pk_telefono_empresa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telefono_empresa
    ADD CONSTRAINT pk_telefono_empresa PRIMARY KEY (telefono_empresa_id);


--
-- Name: telefono_persona_natural pk_telefono_persona_natural; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telefono_persona_natural
    ADD CONSTRAINT pk_telefono_persona_natural PRIMARY KEY (telefono_persona_natural_id);


--
-- Name: tipo_estado_lectura pk_tipo_estado_lectura; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_estado_lectura
    ADD CONSTRAINT pk_tipo_estado_lectura PRIMARY KEY (tipo_estado_lectura_id);


--
-- Name: tipo_identificacion pk_tipo_identificacion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_identificacion
    ADD CONSTRAINT pk_tipo_identificacion PRIMARY KEY (tipo_identificacion_id);


--
-- Name: tipo_novedad_lectura pk_tipo_novedad_lectura; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_novedad_lectura
    ADD CONSTRAINT pk_tipo_novedad_lectura PRIMARY KEY (tipo_novedad_lectura_id);


--
-- Name: tipo_parroquia pk_tipo_parroquia; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_parroquia
    ADD CONSTRAINT pk_tipo_parroquia PRIMARY KEY (tipo_parroquia_id);


--
-- Name: tipo_relacion_familiar pk_tipo_relacion_familiar; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_relacion_familiar
    ADD CONSTRAINT pk_tipo_relacion_familiar PRIMARY KEY (tipo_relacion_familiar_id);


--
-- Name: tipo_telefono pk_tipo_telefono; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_telefono
    ADD CONSTRAINT pk_tipo_telefono PRIMARY KEY (tipo_telefono_id);


--
-- Name: tipo_titulo_dato pk_tipo_titulo_dato; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_titulo_dato
    ADD CONSTRAINT pk_tipo_titulo_dato PRIMARY KEY (tipo_titulo_dato_id);


--
-- Name: tipo_predio pk_tipopredio; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_predio
    ADD CONSTRAINT pk_tipopredio PRIMARY KEY (tipo_predio_id);


--
-- Name: titulo_dato pk_titulo_dato; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titulo_dato
    ADD CONSTRAINT pk_titulo_dato PRIMARY KEY (titulo_dato_id);


--
-- Name: usuario_factura pk_usuario_factura; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_factura
    ADD CONSTRAINT pk_usuario_factura PRIMARY KEY (usuario_factura_id);


--
-- Name: usuario_lectura pk_usuario_lectura; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_lectura
    ADD CONSTRAINT pk_usuario_lectura PRIMARY KEY (usuario_lectura_id);


--
-- Name: zona pk_zona; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zona
    ADD CONSTRAINT pk_zona PRIMARY KEY (zona_id);


--
-- Name: predio predio_clavecatastral_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predio
    ADD CONSTRAINT predio_clavecatastral_key UNIQUE (clave_catastral);


--
-- Name: qrcode qrcode_acometida_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qrcode
    ADD CONSTRAINT qrcode_acometida_id_key UNIQUE (acometida_id);


--
-- Name: qrcode qrcode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qrcode
    ADD CONSTRAINT qrcode_pkey PRIMARY KEY (qrcode_id);


--
-- Name: rangos_variables rangos_variables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rangos_variables
    ADD CONSTRAINT rangos_variables_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_jti_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_jti_key UNIQUE (jti);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: rol_permisos rol_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_permisos
    ADD CONSTRAINT rol_permisos_pkey PRIMARY KEY (rol_permiso_id);


--
-- Name: rol_permisos rol_permisos_rol_id_permiso_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_permisos
    ADD CONSTRAINT rol_permisos_rol_id_permiso_id_key UNIQUE (rol_id, permiso_id);


--
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (rol_id);


--
-- Name: seguimiento_lectura seguimiento_lectura_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimiento_lectura
    ADD CONSTRAINT seguimiento_lectura_pkey PRIMARY KEY (seguimiento_lectura_id);


--
-- Name: servicio servicio_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicio
    ADD CONSTRAINT servicio_nombre_key UNIQUE (nombre);


--
-- Name: siguiente_lectura siguiente_lectura_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siguiente_lectura
    ADD CONSTRAINT siguiente_lectura_pkey PRIMARY KEY (siguiente_lectura_id);


--
-- Name: tipo_contrato tipo_contrato_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_contrato
    ADD CONSTRAINT tipo_contrato_nombre_key UNIQUE (nombre);


--
-- Name: tipo_contrato tipo_contrato_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_contrato
    ADD CONSTRAINT tipo_contrato_pkey PRIMARY KEY (tipo_contrato_id);


--
-- Name: tipo_estado_lectura tipo_estado_lectura_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_estado_lectura
    ADD CONSTRAINT tipo_estado_lectura_codigo_key UNIQUE (codigo);


--
-- Name: tipo_estado_lectura tipo_estado_lectura_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_estado_lectura
    ADD CONSTRAINT tipo_estado_lectura_nombre_key UNIQUE (nombre);


--
-- Name: tipo_novedad_lectura tipo_novedad_lectura_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_novedad_lectura
    ADD CONSTRAINT tipo_novedad_lectura_nombre_key UNIQUE (nombre);


--
-- Name: tipo_predio tipopredio_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_predio
    ADD CONSTRAINT tipopredio_nombre_key UNIQUE (nombre);


--
-- Name: empresa uq_empresa_ruc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa
    ADD CONSTRAINT uq_empresa_ruc UNIQUE (ruc);


--
-- Name: lectura_estado uq_lectura_estado_nombre; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lectura_estado
    ADD CONSTRAINT uq_lectura_estado_nombre UNIQUE (nombre);


--
-- Name: siguiente_lectura uq_siguiente_lectura_acometida; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siguiente_lectura
    ADD CONSTRAINT uq_siguiente_lectura_acometida UNIQUE (acometida_id);


--
-- Name: usuario_permisos usuario_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_permisos
    ADD CONSTRAINT usuario_permisos_pkey PRIMARY KEY (usuario_permiso_id);


--
-- Name: usuario_permisos usuario_permisos_usuario_id_permiso_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_permisos
    ADD CONSTRAINT usuario_permisos_usuario_id_permiso_id_key UNIQUE (usuario_id, permiso_id);


--
-- Name: usuario_roles usuario_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_roles
    ADD CONSTRAINT usuario_roles_pkey PRIMARY KEY (usuario_rol_id);


--
-- Name: usuario_roles usuario_roles_usuario_id_rol_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_roles
    ADD CONSTRAINT usuario_roles_usuario_id_rol_id_key UNIQUE (usuario_id, rol_id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (usuario_id);


--
-- Name: usuarios usuarios_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_username_key UNIQUE (username);


--
-- Name: zona zona_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zona
    ADD CONSTRAINT zona_codigo_key UNIQUE (codigo);


--
-- Name: idx_acometida_clave_catastral; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acometida_clave_catastral ON public.acometida USING btree (clave_catastral);


--
-- Name: idx_acometida_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acometida_cliente_id ON public.acometida USING btree (cliente_id);


--
-- Name: idx_acometida_cuenta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acometida_cuenta ON public.acometida USING btree (cuenta);


--
-- Name: idx_acometida_fecha_instalacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acometida_fecha_instalacion ON public.acometida USING btree (fecha_instalacion);


--
-- Name: idx_acometida_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acometida_sector ON public.acometida USING btree (sector);


--
-- Name: idx_acometida_tarifa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acometida_tarifa_id ON public.acometida USING btree (tarifa_id);


--
-- Name: idx_acometida_zona_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acometida_zona_id ON public.acometida USING btree (zona_id);


--
-- Name: idx_canton_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_canton_nombre ON public.canton USING btree (nombre);


--
-- Name: idx_canton_provincia_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_canton_provincia_id ON public.canton USING btree (provincia_id);


--
-- Name: idx_categoria_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categoria_nombre ON public.categoria USING btree (nombre);


--
-- Name: idx_ciudadano_apellidos; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ciudadano_apellidos ON public.ciudadano USING btree (apellidos);


--
-- Name: idx_ciudadano_estado_civil_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ciudadano_estado_civil_id ON public.ciudadano USING btree (estado_civil_id);


--
-- Name: idx_ciudadano_nombres; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ciudadano_nombres ON public.ciudadano USING btree (nombres);


--
-- Name: idx_ciudadano_parroquia_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ciudadano_parroquia_id ON public.ciudadano USING btree (parroquia_id);


--
-- Name: idx_ciudadano_profesion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ciudadano_profesion_id ON public.ciudadano USING btree (profesion_id);


--
-- Name: idx_ciudadano_sexo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ciudadano_sexo_id ON public.ciudadano USING btree (sexo_id);


--
-- Name: idx_cliente_persona_natural_ciudadano_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_persona_natural_ciudadano_id ON public.cliente_persona_natural USING btree (ciudadano_id);


--
-- Name: idx_cliente_persona_natural_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_persona_natural_cliente_id ON public.cliente_persona_natural USING btree (cliente_id);


--
-- Name: idx_cliente_tipo_identificacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_tipo_identificacion_id ON public.cliente USING btree (tipo_identificacion_id);


--
-- Name: idx_cliente_usuario_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_usuario_cliente_id ON public.cliente_usuario USING btree (cliente_id);


--
-- Name: idx_cliente_usuario_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_usuario_created_at ON public.cliente_usuario USING btree (created_at);


--
-- Name: idx_cliente_usuario_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_usuario_deleted_at ON public.cliente_usuario USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_cliente_usuario_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_usuario_email ON public.cliente_usuario USING btree (email);


--
-- Name: idx_cliente_usuario_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_usuario_estado ON public.cliente_usuario USING btree (estado_cliente_usuario_id);


--
-- Name: idx_cliente_usuario_failed_attempts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_usuario_failed_attempts ON public.cliente_usuario USING btree (failed_attempts);


--
-- Name: idx_cliente_usuario_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_usuario_is_active ON public.cliente_usuario USING btree (is_active);


--
-- Name: idx_cliente_usuario_locked_out; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_usuario_locked_out ON public.cliente_usuario USING btree (cliente_usuario_id) WHERE (is_locked_out = true);


--
-- Name: idx_componentes_fijos_servicio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_componentes_fijos_servicio_id ON public.componentes_fijos USING btree (servicio_id);


--
-- Name: idx_componentes_fijos_tarifa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_componentes_fijos_tarifa_id ON public.componentes_fijos USING btree (tarifa_id);


--
-- Name: idx_consumo_promedio_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumo_promedio_updated_at ON public.consumo_promedio USING btree (updated_at);


--
-- Name: idx_correo_electronico_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correo_electronico_cliente_id ON public.correo_electronico USING btree (cliente_id);


--
-- Name: idx_correo_electronico_correo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correo_electronico_correo ON public.correo_electronico USING btree (email);


--
-- Name: idx_correo_empresa_correo_electronico_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correo_empresa_correo_electronico_id ON public.correo_empresa USING btree (correo_electronico_id);


--
-- Name: idx_correo_empresa_empresa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correo_empresa_empresa_id ON public.correo_empresa USING btree (empresa_id);


--
-- Name: idx_correo_persona_natural_cliente_persona_natural_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correo_persona_natural_cliente_persona_natural_id ON public.correo_persona_natural USING btree (cliente_persona_natural_id);


--
-- Name: idx_correo_persona_natural_correo_electronico_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correo_persona_natural_correo_electronico_id ON public.correo_persona_natural USING btree (correo_electronico_id);


--
-- Name: idx_direccion_parroquia_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direccion_parroquia_id ON public.direccion USING btree (parroquia_id);


--
-- Name: idx_empleados_cargo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_cargo_id ON public.empleados USING btree (cargo_id);


--
-- Name: idx_empleados_ciudadano_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_ciudadano_id ON public.empleados USING btree (ciudadano_id);


--
-- Name: idx_empleados_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_deleted_at ON public.empleados USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_empleados_estado_empleado_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_estado_empleado_id ON public.empleados USING btree (estado_empleado_id);


--
-- Name: idx_empleados_fecha_ingreso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_fecha_ingreso ON public.empleados USING btree (fecha_ingreso);


--
-- Name: idx_empleados_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empleados_usuario_id ON public.empleados USING btree (usuario_id);


--
-- Name: idx_empresa_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empresa_cliente_id ON public.empresa USING btree (cliente_id);


--
-- Name: idx_empresa_nombre_comercial; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empresa_nombre_comercial ON public.empresa USING btree (nombre_comercial);


--
-- Name: idx_empresa_parroquia_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empresa_parroquia_id ON public.empresa USING btree (parroquia_id);


--
-- Name: idx_empresa_razon_social; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empresa_razon_social ON public.empresa USING btree (razon_social);


--
-- Name: idx_empresa_ruc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_empresa_ruc ON public.empresa USING btree (ruc);


--
-- Name: idx_estado_civil_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estado_civil_nombre ON public.estado_civil USING btree (nombre);


--
-- Name: idx_estado_pago_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estado_pago_nombre ON public.estado_pago USING btree (nombre);


--
-- Name: idx_factura_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_cliente_id ON public.factura USING btree (cliente_id);


--
-- Name: idx_factura_estado_pago_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_estado_pago_id ON public.factura USING btree (estado_pago_id);


--
-- Name: idx_factura_fecha_registro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_fecha_registro ON public.factura USING btree (fecha_registro);


--
-- Name: idx_factura_fecha_vencimiento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_fecha_vencimiento ON public.factura USING btree (fecha_vencimiento);


--
-- Name: idx_factura_forma_pago_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_forma_pago_id ON public.factura USING btree (forma_pago_id);


--
-- Name: idx_factura_numero_factura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_numero_factura ON public.factura USING btree (numero_factura);


--
-- Name: idx_forma_pago_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forma_pago_nombre ON public.forma_pago USING btree (nombre);


--
-- Name: idx_foto_acometida_acometida_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_foto_acometida_acometida_id ON public.foto_acometida USING btree (acometida_id);


--
-- Name: idx_foto_acometida_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_foto_acometida_created_at ON public.foto_acometida USING btree (created_at);


--
-- Name: idx_foto_lectura_clave_catastral; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_foto_lectura_clave_catastral ON public.foto_lectura USING btree (clave_catastral);


--
-- Name: idx_foto_lectura_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_foto_lectura_created_at ON public.foto_lectura USING btree (created_at);


--
-- Name: idx_foto_lectura_lectura_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_foto_lectura_lectura_id ON public.foto_lectura USING btree (lectura_id);


--
-- Name: idx_lectura_acometida_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lectura_acometida_id ON public.lectura USING btree (acometida_id);


--
-- Name: idx_lectura_clave_catastral; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lectura_clave_catastral ON public.lectura USING btree (clave_catastral);


--
-- Name: idx_lectura_cuenta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lectura_cuenta ON public.lectura USING btree (cuenta);


--
-- Name: idx_lectura_estado_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lectura_estado_codigo ON public.lectura_estado USING btree (codigo);


--
-- Name: idx_lectura_estado_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lectura_estado_nombre ON public.lectura_estado USING btree (nombre);


--
-- Name: idx_lectura_estado_tipo_estado_lectura_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lectura_estado_tipo_estado_lectura_id ON public.lectura_estado USING btree (tipo_estado_lectura_id);


--
-- Name: idx_lectura_fecha_lectura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lectura_fecha_lectura ON public.lectura USING btree (fecha_lectura);


--
-- Name: idx_lectura_lectura_estado_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lectura_lectura_estado_id ON public.lectura USING btree (lectura_estado_id);


--
-- Name: idx_lectura_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lectura_sector ON public.lectura USING btree (sector);


--
-- Name: idx_lectura_tipo_novedad_lectura_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lectura_tipo_novedad_lectura_id ON public.lectura USING btree (tipo_novedad_lectura_id);


--
-- Name: idx_observacion_acometida_acometida_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_observacion_acometida_acometida_id ON public.observacion_acometida USING btree (acometida_id);


--
-- Name: idx_observacion_acometida_fecha_registro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_observacion_acometida_fecha_registro ON public.observacion_acometida USING btree (fecha_registro);


--
-- Name: idx_observacion_acometida_observacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_observacion_acometida_observacion_id ON public.observacion_acometida USING btree (observacion_id);


--
-- Name: idx_observacion_factura_factura_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_observacion_factura_factura_id ON public.observacion_factura USING btree (factura_id);


--
-- Name: idx_observacion_factura_fecha_registro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_observacion_factura_fecha_registro ON public.observacion_factura USING btree (fecha_registro);


--
-- Name: idx_observacion_factura_observacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_observacion_factura_observacion_id ON public.observacion_factura USING btree (observacion_id);


--
-- Name: idx_observacion_lectura_fecha_registro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_observacion_lectura_fecha_registro ON public.observacion_lectura USING btree (fecha_registro);


--
-- Name: idx_observacion_lectura_lectura_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_observacion_lectura_lectura_id ON public.observacion_lectura USING btree (lectura_id);


--
-- Name: idx_observacion_lectura_observacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_observacion_lectura_observacion_id ON public.observacion_lectura USING btree (observacion_id);


--
-- Name: idx_observacion_titulo_observacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_observacion_titulo_observacion ON public.observacion USING btree (titulo_observacion);


--
-- Name: idx_pais_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pais_nombre ON public.pais USING btree (nombre);


--
-- Name: idx_parroquia_canton_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parroquia_canton_id ON public.parroquia USING btree (canton_id);


--
-- Name: idx_parroquia_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parroquia_nombre ON public.parroquia USING btree (nombre);


--
-- Name: idx_parroquia_tipo_parroquia_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parroquia_tipo_parroquia_id ON public.parroquia USING btree (tipo_parroquia_id);


--
-- Name: idx_permisos_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permisos_nombre ON public.permisos USING btree (nombre);


--
-- Name: idx_predio_altitud; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_altitud ON public.predio USING btree (altitud);


--
-- Name: idx_predio_area_construccion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_area_construccion ON public.predio USING btree (area_construccion);


--
-- Name: idx_predio_area_terreno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_area_terreno ON public.predio USING btree (area_terreno);


--
-- Name: idx_predio_callejon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_callejon ON public.predio USING btree (callejon);


--
-- Name: idx_predio_clave_catastral; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_clave_catastral ON public.predio USING btree (clave_catastral);


--
-- Name: idx_predio_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_cliente_id ON public.predio USING btree (cliente_id);


--
-- Name: idx_predio_coordenadas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_coordenadas ON public.predio USING gist (coordenadas);


--
-- Name: idx_predio_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_created_at ON public.predio USING btree (created_at);


--
-- Name: idx_predio_direccion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_direccion ON public.predio USING btree (direccion);


--
-- Name: idx_predio_fecha_geolocalizacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_fecha_geolocalizacion ON public.predio USING btree (fecha_geolocalizacion);


--
-- Name: idx_predio_precision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_precision ON public.predio USING btree ("precision");


--
-- Name: idx_predio_referencia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_referencia ON public.predio USING btree (referencia);


--
-- Name: idx_predio_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_sector ON public.predio USING btree (sector);


--
-- Name: idx_predio_tipo_predio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_tipo_predio_id ON public.predio USING btree (tipo_predio_id);


--
-- Name: idx_predio_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_updated_at ON public.predio USING btree (updated_at);


--
-- Name: idx_predio_valor_comercial; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_valor_comercial ON public.predio USING btree (valor_comercial);


--
-- Name: idx_predio_valor_construccion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_valor_construccion ON public.predio USING btree (valor_construccion);


--
-- Name: idx_predio_valor_terreno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_valor_terreno ON public.predio USING btree (valor_terreno);


--
-- Name: idx_predio_zona_geometrica; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predio_zona_geometrica ON public.predio USING gist (zona_geometrica);


--
-- Name: idx_profesion_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profesion_nombre ON public.profesion USING btree (nombre);


--
-- Name: idx_provincia_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provincia_nombre ON public.provincia USING btree (nombre);


--
-- Name: idx_provincia_pais_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provincia_pais_id ON public.provincia USING btree (pais_id);


--
-- Name: idx_qrcode_acometida_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qrcode_acometida_id ON public.qrcode USING btree (acometida_id);


--
-- Name: idx_qrcode_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qrcode_created_at ON public.qrcode USING btree (created_at);


--
-- Name: idx_rangos_variables_servicio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rangos_variables_servicio_id ON public.rangos_variables USING btree (servicio_id);


--
-- Name: idx_rangos_variables_tarifa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rangos_variables_tarifa_id ON public.rangos_variables USING btree (tarifa_id, min_consumo);


--
-- Name: idx_refresh_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_expires ON public.refresh_tokens USING btree (expires_at);


--
-- Name: idx_refresh_revoked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_revoked ON public.refresh_tokens USING btree (revoked) WHERE (revoked = false);


--
-- Name: idx_refresh_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_user ON public.refresh_tokens USING btree (usuario_id);


--
-- Name: idx_rol_permisos_permiso_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rol_permisos_permiso_id ON public.rol_permisos USING btree (permiso_id);


--
-- Name: idx_rol_permisos_rol_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rol_permisos_rol_id ON public.rol_permisos USING btree (rol_id);


--
-- Name: idx_roles_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roles_nombre ON public.roles USING btree (nombre);


--
-- Name: idx_roles_parent_rol_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roles_parent_rol_id ON public.roles USING btree (parent_rol_id);


--
-- Name: idx_seguimiento_lectura_acometida_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seguimiento_lectura_acometida_id ON public.seguimiento_lectura USING btree (acometida_id);


--
-- Name: idx_seguimiento_lectura_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seguimiento_lectura_created_at ON public.seguimiento_lectura USING btree (created_at);


--
-- Name: idx_seguimiento_lectura_lectura_estado_anterior_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seguimiento_lectura_lectura_estado_anterior_id ON public.seguimiento_lectura USING btree (lectura_estado_anterior_id);


--
-- Name: idx_seguimiento_lectura_lectura_estado_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seguimiento_lectura_lectura_estado_id ON public.seguimiento_lectura USING btree (lectura_estado_id);


--
-- Name: idx_seguimiento_lectura_lectura_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seguimiento_lectura_lectura_id ON public.seguimiento_lectura USING btree (lectura_id);


--
-- Name: idx_seguimiento_lectura_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seguimiento_lectura_usuario_id ON public.seguimiento_lectura USING btree (usuario_id);


--
-- Name: idx_servicio_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_servicio_nombre ON public.servicio USING btree (nombre);


--
-- Name: idx_sexo_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sexo_nombre ON public.sexo USING btree (nombre);


--
-- Name: idx_siguiente_lectura_acometida_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_siguiente_lectura_acometida_id ON public.siguiente_lectura USING btree (acometida_id);


--
-- Name: idx_siguiente_lectura_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_siguiente_lectura_created_at ON public.siguiente_lectura USING btree (created_at);


--
-- Name: idx_siguiente_lectura_fecha_siguiente_lectura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_siguiente_lectura_fecha_siguiente_lectura ON public.siguiente_lectura USING btree (fecha_siguiente_lectura);


--
-- Name: idx_siguiente_lectura_ultima_lectura_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_siguiente_lectura_ultima_lectura_id ON public.siguiente_lectura USING btree (ultima_lectura_id);


--
-- Name: idx_tarifa_categoria_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tarifa_categoria_id ON public.tarifa USING btree (categoria_id);


--
-- Name: idx_tarifa_effective_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tarifa_effective_date ON public.tarifa USING btree (effective_date, categoria_id);


--
-- Name: idx_telefono_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telefono_cliente_id ON public.telefono USING btree (cliente_id);


--
-- Name: idx_telefono_empresa_empresa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telefono_empresa_empresa_id ON public.telefono_empresa USING btree (empresa_id);


--
-- Name: idx_telefono_empresa_telefono_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telefono_empresa_telefono_id ON public.telefono_empresa USING btree (telefono_id);


--
-- Name: idx_telefono_numero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telefono_numero ON public.telefono USING btree (numero);


--
-- Name: idx_telefono_persona_natural_cliente_persona_natural_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telefono_persona_natural_cliente_persona_natural_id ON public.telefono_persona_natural USING btree (cliente_persona_natural_id);


--
-- Name: idx_telefono_persona_natural_telefono_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telefono_persona_natural_telefono_id ON public.telefono_persona_natural USING btree (telefono_id);


--
-- Name: idx_telefono_tipo_telefono_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telefono_tipo_telefono_id ON public.telefono USING btree (tipo_telefono_id);


--
-- Name: idx_tipo_estado_lectura_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tipo_estado_lectura_codigo ON public.tipo_estado_lectura USING btree (codigo);


--
-- Name: idx_tipo_estado_lectura_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tipo_estado_lectura_nombre ON public.tipo_estado_lectura USING btree (nombre);


--
-- Name: idx_tipo_identificacion_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tipo_identificacion_nombre ON public.tipo_identificacion USING btree (nombre);


--
-- Name: idx_tipo_novedad_lectura_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tipo_novedad_lectura_nombre ON public.tipo_novedad_lectura USING btree (nombre);


--
-- Name: idx_tipo_parroquia_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tipo_parroquia_nombre ON public.tipo_parroquia USING btree (nombre);


--
-- Name: idx_tipo_relacion_familiar_parentesco; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tipo_relacion_familiar_parentesco ON public.tipo_relacion_familiar USING btree (parentesco);


--
-- Name: idx_tipo_telefono_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tipo_telefono_nombre ON public.tipo_telefono USING btree (nombre);


--
-- Name: idx_tipo_titulo_dato_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tipo_titulo_dato_nombre ON public.tipo_titulo_dato USING btree (nombre);


--
-- Name: idx_titulo_dato_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_titulo_dato_cliente_id ON public.titulo_dato USING btree (cliente_id);


--
-- Name: idx_titulo_dato_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_titulo_dato_estado ON public.titulo_dato USING btree (estado);


--
-- Name: idx_titulo_dato_fecha_emision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_titulo_dato_fecha_emision ON public.titulo_dato USING btree (fecha_emision);


--
-- Name: idx_titulo_dato_fecha_vencimiento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_titulo_dato_fecha_vencimiento ON public.titulo_dato USING btree (fecha_vencimiento);


--
-- Name: idx_titulo_dato_tipo_titulo_dato_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_titulo_dato_tipo_titulo_dato_id ON public.titulo_dato USING btree (tipo_titulo_dato_id);


--
-- Name: idx_usuario_factura_factura_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_factura_factura_id ON public.usuario_factura USING btree (factura_id);


--
-- Name: idx_usuario_factura_fecha_registro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_factura_fecha_registro ON public.usuario_factura USING btree (fecha_registro);


--
-- Name: idx_usuario_factura_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_factura_usuario_id ON public.usuario_factura USING btree (usuario_id);


--
-- Name: idx_usuario_lectura_lectura_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_lectura_lectura_id ON public.usuario_lectura USING btree (lectura_id);


--
-- Name: idx_usuario_lectura_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_lectura_usuario_id ON public.usuario_lectura USING btree (usuario_id);


--
-- Name: idx_usuario_permisos_permiso_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_permisos_permiso_id ON public.usuario_permisos USING btree (permiso_id);


--
-- Name: idx_usuario_permisos_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_permisos_usuario_id ON public.usuario_permisos USING btree (usuario_id);


--
-- Name: idx_usuario_roles_rol_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_roles_rol_id ON public.usuario_roles USING btree (rol_id);


--
-- Name: idx_usuario_roles_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_roles_usuario_id ON public.usuario_roles USING btree (usuario_id);


--
-- Name: idx_usuarios_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_email ON public.usuarios USING btree (email);


--
-- Name: idx_usuarios_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_username ON public.usuarios USING btree (username);


--
-- Name: idx_zona_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zona_codigo ON public.zona USING btree (codigo);


--
-- Name: idx_zona_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zona_nombre ON public.zona USING btree (nombre);


--
-- Name: lectura trg_auditar_lectura; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditar_lectura AFTER INSERT OR UPDATE OF lectura_estado_id ON public.lectura FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambio_estado();


--
-- Name: lectura trg_block_duplicate_lectura; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_block_duplicate_lectura BEFORE INSERT ON public.lectura FOR EACH ROW EXECUTE FUNCTION public.fn_block_duplicate_lectura();


--
-- Name: cliente_usuario trg_cliente_usuario_lockout; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cliente_usuario_lockout BEFORE INSERT OR UPDATE OF lockout_until ON public.cliente_usuario FOR EACH ROW EXECUTE FUNCTION public.trg_update_is_locked_out();


--
-- Name: lectura trg_control_siguiente_mensual; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_control_siguiente_mensual AFTER INSERT ON public.lectura FOR EACH ROW EXECUTE FUNCTION public.fn_control_siguiente_lectura_mensual();


--
-- Name: acometida trg_insert_cambio_medidor_reading; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_insert_cambio_medidor_reading AFTER UPDATE OF numero_medidor ON public.acometida FOR EACH ROW WHEN (((old.numero_medidor)::text IS DISTINCT FROM (new.numero_medidor)::text)) EXECUTE FUNCTION public.fn_insert_cambio_medidor_reading();


--
-- Name: acometida trg_insert_initial_reading_full; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_insert_initial_reading_full AFTER INSERT ON public.acometida FOR EACH ROW EXECUTE FUNCTION public.fn_insert_initial_reading_full();


--
-- Name: cliente_usuario trg_update_cliente_usuario_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_cliente_usuario_timestamp BEFORE UPDATE ON public.cliente_usuario FOR EACH ROW EXECUTE FUNCTION public.update_cliente_usuario_timestamp();


--
-- Name: lectura trg_update_consumo_promedio; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_consumo_promedio AFTER INSERT OR UPDATE ON public.lectura FOR EACH ROW EXECUTE FUNCTION public.update_consumo_promedio();


--
-- Name: empleados trg_update_empleados_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_empleados_timestamp BEFORE UPDATE ON public.empleados FOR EACH ROW EXECUTE FUNCTION public.update_empleados_timestamp();


--
-- Name: acometida trg_update_meter_reading; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_meter_reading AFTER UPDATE OF numero_medidor ON public.acometida FOR EACH ROW WHEN ((((old.numero_medidor)::text IS DISTINCT FROM (new.numero_medidor)::text) AND (new.numero_medidor IS NOT NULL))) EXECUTE FUNCTION public.fn_update_meter_reading_initial();


--
-- Name: seguimiento_lectura trg_update_timestamp_seguimiento_lectura; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_timestamp_seguimiento_lectura BEFORE UPDATE ON public.seguimiento_lectura FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: siguiente_lectura trg_update_timestamp_siguiente_lectura; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_timestamp_siguiente_lectura BEFORE UPDATE ON public.siguiente_lectura FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: cliente_usuario cliente_usuario_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_usuario
    ADD CONSTRAINT cliente_usuario_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(usuario_id);


--
-- Name: cliente_usuario cliente_usuario_estado_cliente_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_usuario
    ADD CONSTRAINT cliente_usuario_estado_cliente_usuario_id_fkey FOREIGN KEY (estado_cliente_usuario_id) REFERENCES public.estado_cliente_usuario(estado_cliente_usuario_id);


--
-- Name: cliente_usuario cliente_usuario_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_usuario
    ADD CONSTRAINT cliente_usuario_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.usuarios(usuario_id);


--
-- Name: componentes_fijos componentes_fijos_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.componentes_fijos
    ADD CONSTRAINT componentes_fijos_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicio(servicio_id);


--
-- Name: componentes_fijos componentes_fijos_tarifa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.componentes_fijos
    ADD CONSTRAINT componentes_fijos_tarifa_id_fkey FOREIGN KEY (tarifa_id) REFERENCES public.tarifa(tarifa_id);


--
-- Name: empleado_zona empleado_zona_empleado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_zona
    ADD CONSTRAINT empleado_zona_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados(empleado_id) ON DELETE CASCADE;


--
-- Name: empleado_zona empleado_zona_zona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleado_zona
    ADD CONSTRAINT empleado_zona_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.zona(zona_id) ON DELETE CASCADE;


--
-- Name: empleados empleados_cargo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_cargo_id_fkey FOREIGN KEY (cargo_id) REFERENCES public.cargo(cargo_id);


--
-- Name: empleados empleados_ciudadano_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_ciudadano_id_fkey FOREIGN KEY (ciudadano_id) REFERENCES public.ciudadano(ciudadano_id) ON DELETE SET NULL;


--
-- Name: empleados empleados_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(usuario_id);


--
-- Name: empleados empleados_estado_empleado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_estado_empleado_id_fkey FOREIGN KEY (estado_empleado_id) REFERENCES public.estado_empleado(estado_empleado_id);


--
-- Name: empleados empleados_sexo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_sexo_id_fkey FOREIGN KEY (sexo_id) REFERENCES public.sexo(sexo_id);


--
-- Name: empleados empleados_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.empleados(empleado_id);


--
-- Name: empleados empleados_tipo_contrato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_tipo_contrato_id_fkey FOREIGN KEY (tipo_contrato_id) REFERENCES public.tipo_contrato(tipo_contrato_id);


--
-- Name: empleados empleados_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT empleados_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.usuarios(usuario_id);


--
-- Name: acometida fk_acometida_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acometida
    ADD CONSTRAINT fk_acometida_cliente FOREIGN KEY (cliente_id) REFERENCES public.cliente(cliente_id);


--
-- Name: acometida fk_acometida_predio; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acometida
    ADD CONSTRAINT fk_acometida_predio FOREIGN KEY (predio_clave_catastral) REFERENCES public.predio(clave_catastral) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: acometida fk_acometida_tarifa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acometida
    ADD CONSTRAINT fk_acometida_tarifa FOREIGN KEY (tarifa_id) REFERENCES public.tarifa(tarifa_id);


--
-- Name: acometida fk_acometida_zona; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acometida
    ADD CONSTRAINT fk_acometida_zona FOREIGN KEY (zona_id) REFERENCES public.zona(zona_id);


--
-- Name: canton fk_canton_provincia; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canton
    ADD CONSTRAINT fk_canton_provincia FOREIGN KEY (provincia_id) REFERENCES public.provincia(provincia_id);


--
-- Name: ciudadano fk_ciudadano_estado_civil; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciudadano
    ADD CONSTRAINT fk_ciudadano_estado_civil FOREIGN KEY (estado_civil_id) REFERENCES public.estado_civil(estado_civil_id);


--
-- Name: ciudadano fk_ciudadano_parroquia; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciudadano
    ADD CONSTRAINT fk_ciudadano_parroquia FOREIGN KEY (parroquia_id) REFERENCES public.parroquia(parroquia_id);


--
-- Name: ciudadano fk_ciudadano_profesion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciudadano
    ADD CONSTRAINT fk_ciudadano_profesion FOREIGN KEY (profesion_id) REFERENCES public.profesion(profesion_id);


--
-- Name: ciudadano fk_ciudadano_sexo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciudadano
    ADD CONSTRAINT fk_ciudadano_sexo FOREIGN KEY (sexo_id) REFERENCES public.sexo(sexo_id);


--
-- Name: cliente_persona_natural fk_cliente_persona_natural_ciudadano; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_persona_natural
    ADD CONSTRAINT fk_cliente_persona_natural_ciudadano FOREIGN KEY (ciudadano_id) REFERENCES public.ciudadano(ciudadano_id);


--
-- Name: cliente_persona_natural fk_cliente_persona_natural_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_persona_natural
    ADD CONSTRAINT fk_cliente_persona_natural_cliente FOREIGN KEY (cliente_id) REFERENCES public.cliente(cliente_id);


--
-- Name: predio fk_cliente_predio; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predio
    ADD CONSTRAINT fk_cliente_predio FOREIGN KEY (cliente_id) REFERENCES public.cliente(cliente_id);


--
-- Name: cliente fk_cliente_tipo_identificacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT fk_cliente_tipo_identificacion FOREIGN KEY (tipo_identificacion_id) REFERENCES public.tipo_identificacion(tipo_identificacion_id);


--
-- Name: cliente_usuario fk_cliente_usuario_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_usuario
    ADD CONSTRAINT fk_cliente_usuario_cliente FOREIGN KEY (cliente_id) REFERENCES public.cliente(cliente_id) ON DELETE CASCADE;


--
-- Name: consumo_promedio fk_consumo_promedio_acometida; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumo_promedio
    ADD CONSTRAINT fk_consumo_promedio_acometida FOREIGN KEY (acometida_id) REFERENCES public.acometida(acometida_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: correo_electronico fk_correo_electronico_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correo_electronico
    ADD CONSTRAINT fk_correo_electronico_cliente FOREIGN KEY (cliente_id) REFERENCES public.cliente(cliente_id);


--
-- Name: correo_empresa fk_correo_empresa_correo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correo_empresa
    ADD CONSTRAINT fk_correo_empresa_correo FOREIGN KEY (correo_electronico_id) REFERENCES public.correo_electronico(correo_electronico_id);


--
-- Name: correo_empresa fk_correo_empresa_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correo_empresa
    ADD CONSTRAINT fk_correo_empresa_empresa FOREIGN KEY (empresa_id) REFERENCES public.empresa(empresa_id);


--
-- Name: correo_persona_natural fk_correo_persona_natural_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correo_persona_natural
    ADD CONSTRAINT fk_correo_persona_natural_cliente FOREIGN KEY (cliente_persona_natural_id) REFERENCES public.cliente_persona_natural(cliente_persona_natural_id);


--
-- Name: correo_persona_natural fk_correo_persona_natural_correo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correo_persona_natural
    ADD CONSTRAINT fk_correo_persona_natural_correo FOREIGN KEY (correo_electronico_id) REFERENCES public.correo_electronico(correo_electronico_id);


--
-- Name: direccion fk_direccion_parroquia; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direccion
    ADD CONSTRAINT fk_direccion_parroquia FOREIGN KEY (parroquia_id) REFERENCES public.parroquia(parroquia_id);


--
-- Name: empleados fk_empleados_ciudadano; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT fk_empleados_ciudadano FOREIGN KEY (ciudadano_id) REFERENCES public.ciudadano(ciudadano_id) ON DELETE SET NULL;


--
-- Name: empleados fk_empleados_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT fk_empleados_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(usuario_id) ON DELETE CASCADE;


--
-- Name: empresa fk_empresa_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa
    ADD CONSTRAINT fk_empresa_cliente FOREIGN KEY (cliente_id) REFERENCES public.cliente(cliente_id);


--
-- Name: empresa fk_empresa_parroquia; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa
    ADD CONSTRAINT fk_empresa_parroquia FOREIGN KEY (parroquia_id) REFERENCES public.parroquia(parroquia_id);


--
-- Name: factura fk_factura_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura
    ADD CONSTRAINT fk_factura_cliente FOREIGN KEY (cliente_id) REFERENCES public.cliente(cliente_id);


--
-- Name: factura fk_factura_estado_pago; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura
    ADD CONSTRAINT fk_factura_estado_pago FOREIGN KEY (estado_pago_id) REFERENCES public.estado_pago(estado_pago_id);


--
-- Name: factura fk_factura_forma_pago; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura
    ADD CONSTRAINT fk_factura_forma_pago FOREIGN KEY (forma_pago_id) REFERENCES public.forma_pago(forma_pago_id);


--
-- Name: foto_acometida fk_foto_acometida_acometida; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foto_acometida
    ADD CONSTRAINT fk_foto_acometida_acometida FOREIGN KEY (acometida_id) REFERENCES public.acometida(acometida_id) ON DELETE CASCADE;


--
-- Name: foto_lectura fk_foto_lectura_lectura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.foto_lectura
    ADD CONSTRAINT fk_foto_lectura_lectura FOREIGN KEY (lectura_id) REFERENCES public.lectura(lectura_id);


--
-- Name: lectura fk_lectura_acometida; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lectura
    ADD CONSTRAINT fk_lectura_acometida FOREIGN KEY (acometida_id) REFERENCES public.acometida(acometida_id);


--
-- Name: lectura_estado fk_lectura_estado_tipo_estado_lectura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lectura_estado
    ADD CONSTRAINT fk_lectura_estado_tipo_estado_lectura FOREIGN KEY (tipo_estado_lectura_id) REFERENCES public.tipo_estado_lectura(tipo_estado_lectura_id);


--
-- Name: lectura fk_lectura_lectura_estado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lectura
    ADD CONSTRAINT fk_lectura_lectura_estado FOREIGN KEY (lectura_estado_id) REFERENCES public.lectura_estado(lectura_estado_id);


--
-- Name: lectura fk_lectura_tipo_novedad_lectura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lectura
    ADD CONSTRAINT fk_lectura_tipo_novedad_lectura FOREIGN KEY (tipo_novedad_lectura_id) REFERENCES public.tipo_novedad_lectura(tipo_novedad_lectura_id);


--
-- Name: observacion_acometida fk_observacion_acometida_acometida; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observacion_acometida
    ADD CONSTRAINT fk_observacion_acometida_acometida FOREIGN KEY (acometida_id) REFERENCES public.acometida(acometida_id);


--
-- Name: observacion_acometida fk_observacion_acometida_observacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observacion_acometida
    ADD CONSTRAINT fk_observacion_acometida_observacion FOREIGN KEY (observacion_id) REFERENCES public.observacion(observacion_id);


--
-- Name: observacion_factura fk_observacion_factura_factura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observacion_factura
    ADD CONSTRAINT fk_observacion_factura_factura FOREIGN KEY (factura_id) REFERENCES public.factura(factura_id);


--
-- Name: observacion_factura fk_observacion_factura_observacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observacion_factura
    ADD CONSTRAINT fk_observacion_factura_observacion FOREIGN KEY (observacion_id) REFERENCES public.observacion(observacion_id);


--
-- Name: observacion_lectura fk_observacion_lectura_lectura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observacion_lectura
    ADD CONSTRAINT fk_observacion_lectura_lectura FOREIGN KEY (lectura_id) REFERENCES public.lectura(lectura_id);


--
-- Name: observacion_lectura fk_observacion_lectura_observacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observacion_lectura
    ADD CONSTRAINT fk_observacion_lectura_observacion FOREIGN KEY (observacion_id) REFERENCES public.observacion(observacion_id);


--
-- Name: parroquia fk_parroquia_canton; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parroquia
    ADD CONSTRAINT fk_parroquia_canton FOREIGN KEY (canton_id) REFERENCES public.canton(canton_id);


--
-- Name: parroquia fk_parroquia_tipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parroquia
    ADD CONSTRAINT fk_parroquia_tipo FOREIGN KEY (tipo_parroquia_id) REFERENCES public.tipo_parroquia(tipo_parroquia_id);


--
-- Name: permisos fk_permisos_categoria; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT fk_permisos_categoria FOREIGN KEY (categoria_id) REFERENCES public.permiso_categoria(categoria_id) ON DELETE SET NULL;


--
-- Name: predio fk_predio_tipo_predio; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predio
    ADD CONSTRAINT fk_predio_tipo_predio FOREIGN KEY (tipo_predio_id) REFERENCES public.tipo_predio(tipo_predio_id);


--
-- Name: provincia fk_provincia_pais; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provincia
    ADD CONSTRAINT fk_provincia_pais FOREIGN KEY (pais_id) REFERENCES public.pais(pais_id);


--
-- Name: telefono fk_telefono_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telefono
    ADD CONSTRAINT fk_telefono_cliente FOREIGN KEY (cliente_id) REFERENCES public.cliente(cliente_id);


--
-- Name: telefono_empresa fk_telefono_empresa_empresa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telefono_empresa
    ADD CONSTRAINT fk_telefono_empresa_empresa FOREIGN KEY (empresa_id) REFERENCES public.empresa(empresa_id);


--
-- Name: telefono_empresa fk_telefono_empresa_telefono; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telefono_empresa
    ADD CONSTRAINT fk_telefono_empresa_telefono FOREIGN KEY (telefono_id) REFERENCES public.telefono(telefono_id);


--
-- Name: telefono_persona_natural fk_telefono_persona_natural_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telefono_persona_natural
    ADD CONSTRAINT fk_telefono_persona_natural_cliente FOREIGN KEY (cliente_persona_natural_id) REFERENCES public.cliente_persona_natural(cliente_persona_natural_id);


--
-- Name: telefono_persona_natural fk_telefono_persona_natural_telefono; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telefono_persona_natural
    ADD CONSTRAINT fk_telefono_persona_natural_telefono FOREIGN KEY (telefono_id) REFERENCES public.telefono(telefono_id);


--
-- Name: telefono fk_telefono_tipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telefono
    ADD CONSTRAINT fk_telefono_tipo FOREIGN KEY (tipo_telefono_id) REFERENCES public.tipo_telefono(tipo_telefono_id);


--
-- Name: titulo_dato fk_titulo_dato_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titulo_dato
    ADD CONSTRAINT fk_titulo_dato_cliente FOREIGN KEY (cliente_id) REFERENCES public.cliente(cliente_id);


--
-- Name: titulo_dato fk_titulo_dato_tipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titulo_dato
    ADD CONSTRAINT fk_titulo_dato_tipo FOREIGN KEY (tipo_titulo_dato_id) REFERENCES public.tipo_titulo_dato(tipo_titulo_dato_id);


--
-- Name: usuario_factura fk_usuario_factura_factura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_factura
    ADD CONSTRAINT fk_usuario_factura_factura FOREIGN KEY (factura_id) REFERENCES public.factura(factura_id);


--
-- Name: usuario_factura fk_usuario_factura_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_factura
    ADD CONSTRAINT fk_usuario_factura_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(usuario_id);


--
-- Name: usuario_lectura fk_usuario_lectura_lectura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_lectura
    ADD CONSTRAINT fk_usuario_lectura_lectura FOREIGN KEY (lectura_id) REFERENCES public.lectura(lectura_id);


--
-- Name: usuario_lectura fk_usuario_lectura_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_lectura
    ADD CONSTRAINT fk_usuario_lectura_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios(usuario_id);


--
-- Name: qrcode qrcode_acometida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qrcode
    ADD CONSTRAINT qrcode_acometida_id_fkey FOREIGN KEY (acometida_id) REFERENCES public.acometida(acometida_id) ON DELETE CASCADE;


--
-- Name: rangos_variables rangos_variables_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rangos_variables
    ADD CONSTRAINT rangos_variables_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES public.servicio(servicio_id);


--
-- Name: rangos_variables rangos_variables_tarifa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rangos_variables
    ADD CONSTRAINT rangos_variables_tarifa_id_fkey FOREIGN KEY (tarifa_id) REFERENCES public.tarifa(tarifa_id);


--
-- Name: refresh_tokens refresh_tokens_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(usuario_id) ON DELETE CASCADE;


--
-- Name: rol_permisos rol_permisos_permiso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_permisos
    ADD CONSTRAINT rol_permisos_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES public.permisos(permiso_id) ON DELETE CASCADE;


--
-- Name: rol_permisos rol_permisos_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_permisos
    ADD CONSTRAINT rol_permisos_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(rol_id) ON DELETE CASCADE;


--
-- Name: roles roles_parent_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_parent_rol_id_fkey FOREIGN KEY (parent_rol_id) REFERENCES public.roles(rol_id);


--
-- Name: seguimiento_lectura seguimiento_lectura_acometida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimiento_lectura
    ADD CONSTRAINT seguimiento_lectura_acometida_id_fkey FOREIGN KEY (acometida_id) REFERENCES public.acometida(acometida_id);


--
-- Name: seguimiento_lectura seguimiento_lectura_lectura_estado_anterior_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimiento_lectura
    ADD CONSTRAINT seguimiento_lectura_lectura_estado_anterior_id_fkey FOREIGN KEY (lectura_estado_anterior_id) REFERENCES public.lectura_estado(lectura_estado_id);


--
-- Name: seguimiento_lectura seguimiento_lectura_lectura_estado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimiento_lectura
    ADD CONSTRAINT seguimiento_lectura_lectura_estado_id_fkey FOREIGN KEY (lectura_estado_id) REFERENCES public.lectura_estado(lectura_estado_id);


--
-- Name: seguimiento_lectura seguimiento_lectura_lectura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimiento_lectura
    ADD CONSTRAINT seguimiento_lectura_lectura_id_fkey FOREIGN KEY (lectura_id) REFERENCES public.lectura(lectura_id);


--
-- Name: seguimiento_lectura seguimiento_lectura_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimiento_lectura
    ADD CONSTRAINT seguimiento_lectura_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(usuario_id);


--
-- Name: siguiente_lectura siguiente_lectura_acometida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siguiente_lectura
    ADD CONSTRAINT siguiente_lectura_acometida_id_fkey FOREIGN KEY (acometida_id) REFERENCES public.acometida(acometida_id);


--
-- Name: siguiente_lectura siguiente_lectura_ultima_lectura_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siguiente_lectura
    ADD CONSTRAINT siguiente_lectura_ultima_lectura_id_fkey FOREIGN KEY (ultima_lectura_id) REFERENCES public.lectura(lectura_id);


--
-- Name: tarifa tarifa_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarifa
    ADD CONSTRAINT tarifa_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categoria(categoria_id);


--
-- Name: usuario_permisos usuario_permisos_permiso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_permisos
    ADD CONSTRAINT usuario_permisos_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES public.permisos(permiso_id) ON DELETE CASCADE;


--
-- Name: usuario_permisos usuario_permisos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_permisos
    ADD CONSTRAINT usuario_permisos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(usuario_id) ON DELETE CASCADE;


--
-- Name: usuario_roles usuario_roles_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_roles
    ADD CONSTRAINT usuario_roles_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(rol_id) ON DELETE CASCADE;


--
-- Name: usuario_roles usuario_roles_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario_roles
    ADD CONSTRAINT usuario_roles_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(usuario_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict h9S7Q17xuDN0b9Krwb8266g18OPRCglgVYyrxUYcBYiRu518JQgInJXPw4VrRRp

