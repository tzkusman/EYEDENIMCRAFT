-- PostgreSQL Trigger Guard: Prevent any update to challans.dcNo column
-- This guarantees immutability at the database level even for raw SQL operations.

CREATE OR REPLACE FUNCTION prevent_dc_no_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.dcNo <> OLD.dcNo THEN
    RAISE EXCEPTION 'DC No is immutable and cannot be changed once created (OLD: %, NEW: %)', OLD.dcNo, NEW.dcNo;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_dc_no_update ON challans;

CREATE TRIGGER trg_prevent_dc_no_update
BEFORE UPDATE ON challans
FOR EACH ROW
EXECUTE FUNCTION prevent_dc_no_update();
