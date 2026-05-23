-- Atomic public employee ID allocation (PS-EMP-###)
CREATE SEQUENCE IF NOT EXISTS employee_public_id_seq;

SELECT setval(
  'employee_public_id_seq',
  GREATEST(
    COALESCE(
      (
        SELECT MAX(
          CAST(NULLIF(regexp_replace("employeeId", '\D', '', 'g'), '') AS INTEGER)
        )
        FROM "employees"
      ),
      0
    ),
    1
  )
);
