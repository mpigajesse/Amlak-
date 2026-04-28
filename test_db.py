import psycopg
import os

PASSWORD = "b0FKdJrr4VHdrvq3"  # no shell escaping issues here

for port, mode in [(5432, "Session"), (6543, "Transaction")]:
    for user in ["postgres.epmlfqjqejulbuxbhpdi", "postgres"]:
        try:
            conn = psycopg.connect(
                host="aws-1-eu-central-1.pooler.supabase.com",
                port=port,
                dbname="postgres",
                user=user,
                password=PASSWORD,
                sslmode="require",
                connect_timeout=10,
            )
            cur = conn.cursor()
            cur.execute("SELECT version()")
            print(f"OK port={port} ({mode}) user={user}: {cur.fetchone()[0][:60]}")
            conn.close()
        except Exception as e:
            msg = str(e).split("\n")[0][:150]
            print(f"FAIL port={port} ({mode}) user={user}: {msg}")
