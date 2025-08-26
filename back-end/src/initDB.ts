import {Pool} from "pg";

export default async function initDB(pool: Pool): Promise<void> {
    // Create table if not exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS envelopes (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            budget NUMERIC NOT NULL,
            spent NUMERIC NOT NULL DEFAULT 0,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Create transfers table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS transfers (
            id SERIAL PRIMARY KEY,
            amount integer NOT NULL CHECK (amount > 0),
            date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "to" INTEGER NOT NULL REFERENCES envelopes(id) ON DELETE CASCADE,
            "from" INTEGER NOT NULL REFERENCES envelopes(id) ON DELETE CASCADE
        )
    `)

    // transactions table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            amount integer NOT NULL CHECK (amount > 0),
            date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "for" INTEGER NOT NULL REFERENCES envelopes(id) ON DELETE CASCADE 
        );
    `)

    // create a function to handle transfers
    await pool.query(`
        CREATE OR REPLACE FUNCTION make_transfer_func()
            RETURNS trigger AS $$
        BEGIN
            IF (SELECT (budget - spent) FROM envelopes WHERE id = NEW."from") >= NEW.amount THEN
                UPDATE envelopes
                SET budget = budget - NEW.amount
                WHERE id = NEW."from";
        
                UPDATE envelopes
                SET budget = budget + NEW.amount
                WHERE id = NEW."to";
        
                RETURN NEW;
            ELSE
                RAISE EXCEPTION 'Not enough budget in envelope named: % with id: %', (SELECT name FROM envelopes WHERE id = NEW."from"), NEW."from";
                RETURN NULL;
            END IF;
        END;
        $$ LANGUAGE plpgsql;
    `)

    // create a trigger to handle transfer on insert
    await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT * FROM pg_trigger WHERE tgname = 'make_transfer_trigger') THEN
            CREATE TRIGGER make_transfer_trigger
                BEFORE INSERT ON transfers
                FOR EACH ROW
            EXECUTE FUNCTION make_transfer_func();
            END IF;
        END;
    $$;`)


    // Create or replace trigger function that will handle updating envelope
    await pool.query(`
        CREATE OR REPLACE FUNCTION before_update_envelope_func()
        RETURNS trigger AS $$
            BEGIN
                -- Check that spent is valid compared to the NEW budget
                IF NEW.spent < 0 THEN
                    RAISE EXCEPTION 'Spent cannot be negative';
                ELSIF NEW.spent > NEW.budget THEN
                    RAISE EXCEPTION 'Spent (%) cannot exceed budget (%)', NEW.spent, NEW.budget;
                END IF;
            
                -- If budget is updated and now less than spent, reject
                IF NEW.budget < OLD.spent THEN
                    RAISE EXCEPTION 'new budget (%) cannot be less than current spent (%)', NEW.budget, OLD.spent;
                END IF;
            
                RETURN NEW;
            END;
        $$ LANGUAGE plpgsql;
    `);

    // this trigger will ensure that spent cannot exceed budget, or it goes below 0 and budget to go under spent
    await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_trigger WHERE tgname = 'before_update_envelope'
            ) THEN
                CREATE TRIGGER before_update_envelope
                BEFORE UPDATE ON envelopes
                FOR EACH ROW
                EXECUTE FUNCTION before_update_envelope_func();
            END IF;
        END;
        $$;
    `);

    // function to handle insert on transaction
    await pool.query(`
        CREATE OR REPLACE FUNCTION make_transaction_func()
                RETURNS trigger AS $$
            DECLARE
                env_budget NUMERIC;
                env_spent NUMERIC;
                env_name text;
            BEGIN
                
                SELECT budget, spent, name
                INTO env_budget, env_spent, env_name 
                FROM envelopes WHERE id = NEW.for_id;
            
                -- if the inserted amount plus the envelopes spent is less than the budget
                IF env_budget >= NEW.amount + env_spent THEN
                    
                    -- update spent
                    UPDATE envelopes
                    SET spent = spent + NEW.amount
                    WHERE id = NEW.for_id;
           
                    -- complete the insert
                    RETURN NEW;
                ELSE
                    -- else throw an error
                    RAISE EXCEPTION 'Not enough budget in envelope with id: % named: %', NEW.for_id, (env_name);
                end if;
            END;
            $$ LANGUAGE plpgsql;
    `)

    // trigger to handle inserts on transaction
    await pool.query(`
        DO $$
           BEGIN
             IF NOT EXISTS (SELECT * FROM pg_trigger WHERE tgname = 'make_transaction_trigger') THEN
                CREATE TRIGGER make_transaction_trigger
                    BEFORE INSERT ON transactions
                    FOR EACH ROW
                EXECUTE FUNCTION make_transaction_func();
                END IF;
            END;
        $$;
    `)

    // function to handle deletes
    await pool.query(`
        CREATE OR REPLACE FUNCTION on_transaction_delete()
            RETURNS trigger AS $$
        BEGIN
            UPDATE envelopes
            SET spent = spent - OLD.amount
            WHERE id = OLD.for_id;
        
            RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;
    `)

    // trigger to handle delete on transaction
    await pool.query(`
        DO $$
           BEGIN
             IF NOT EXISTS (SELECT * FROM pg_trigger WHERE tgname = 'make_transaction_trigger') THEN
                        CREATE TRIGGER transaction_delete_trigger
                        AFTER DELETE ON transactions
                        FOR EACH ROW
                        EXECUTE FUNCTION on_transaction_delete();
                END IF;
            END;
        $$;
    `)

    // function to handle transaction update
    await pool.query(`
        CREATE OR REPLACE FUNCTION on_transaction_update()
            RETURNS trigger AS $$
        DECLARE
            env_budget NUMERIC;
            env_spent NUMERIC;
            env_id NUMERIC;
            env_name TEXT;
        BEGIN
            -- get envelope info in one go
            SELECT budget, spent, name, id
            INTO env_budget, env_spent, env_name, env_id
            FROM envelopes
            WHERE id = NEW.for_id;
        
            env_spent := NEW.amount;
        
            IF OLD.for_id != NEW.for_id THEN
                UPDATE envelopes
                SET spent = spent - NEW.amount
                WHERE id = OLD.for_id;
            end if;
        
            IF env_spent <= env_budget AND env_spent >= 0 THEN
                -- update envelope’s spent
                UPDATE envelopes
                SET spent = env_spent
                WHERE id = NEW.for_id;
        
                -- update transaction’s date
                NEW.date := CURRENT_DATE;
        
                RETURN NEW;
            ELSE
                RAISE EXCEPTION 'Not enough budget on envelope: %', env_name;
            END IF;
        END;
        $$ LANGUAGE plpgsql;
    `)


    // trigger to handle update on transaction
    await pool.query(`
        DO $$
           BEGIN
             IF NOT EXISTS (SELECT * FROM pg_trigger WHERE tgname = 'on_transaction_update_trigger') THEN
                 CREATE TRIGGER on_transaction_update_trigger
                 BEFORE UPDATE ON transactions
                 FOR EACH ROW
                 EXECUTE FUNCTION on_transaction_update();
                END IF;
            END;
        $$;
    `)

}


