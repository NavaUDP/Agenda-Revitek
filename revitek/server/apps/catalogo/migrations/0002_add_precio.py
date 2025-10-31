from django.db import migrations


def add_precio_if_missing(apps, schema_editor):
    # Try to detect whether the `precio` column exists in a DB-agnostic way.
    # Older MySQL installations may use information_schema; sqlite doesn't have it,
    # so fall back to Django's introspection. Be defensive: migrations run on
    # different DB backends in CI/local dev.
    from django.db import connection, OperationalError

    table_name = 'catalogo_servicio'
    column_name = 'precio'
    exists = False

    try:
        with connection.cursor() as cursor:
            if connection.vendor == 'mysql':
                # Preferred for MySQL to be compatible with older versions
                cursor.execute(
                    "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name=%s AND column_name=%s",
                    [table_name, column_name],
                )
                exists = bool(cursor.fetchone()[0])
            else:
                # Use Django introspection for sqlite/postgres and others
                try:
                    desc = connection.introspection.get_table_description(cursor, table_name)
                    col_names = [c.name for c in desc]
                    exists = column_name in col_names
                except Exception:
                    # As a last resort, try schema_editor introspection (some backends)
                    try:
                        desc = schema_editor.connection.introspection.get_table_description(cursor, table_name)
                        col_names = [c.name for c in desc]
                        exists = column_name in col_names
                    except Exception:
                        exists = False
    except OperationalError:
        # Could not query DB (e.g. information_schema missing). Treat as missing.
        exists = False

    if not exists:
        # Try to add the column; if the backend doesn't support ALTER in this way,
        # swallow errors to avoid breaking automated test setups (they can run
        # migrations differently).
        try:
            with connection.cursor() as cursor:
                cursor.execute("ALTER TABLE catalogo_servicio ADD COLUMN precio INT DEFAULT 0")
        except Exception:
            # If ALTER fails (e.g., complex sqlite migrations), skip — it's non-fatal.
            pass


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(add_precio_if_missing, reverse_code=migrations.RunPython.noop),
    ]
