import os
import psycopg2

def update_pwd():
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("No DATABASE_URL found")
        return
    
    # Connect directly to Postgres
    conn = psycopg2.connect(url)
    try:
        cur = conn.cursor()
        hash_val = "$2b$12$H0MKJxApzmWj3HqB43g5h.TJdq3ySCg71TuhpATh4W82s167wOrge"
        cur.execute("UPDATE users SET hashed_password = %s WHERE role = 'superadmin'", (hash_val,))
        conn.commit()
        print(f"Updated {cur.rowcount} rows.")
    finally:
        conn.close()

if __name__ == "__main__":
    update_pwd()
