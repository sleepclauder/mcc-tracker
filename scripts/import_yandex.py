"""
Импорт торговых точек из Яндекс Places API в Oracle DB.

Запуск:
    python import_yandex.py --ll 37.617,55.756 --query "Пятёрочка"
    python import_yandex.py --ll 37.617,55.756 --query "Магнит" --spn 1.0,1.0

Требует файл .env (скопируй .env.example → .env и заполни).
"""
import os
import argparse
import requests
import oracledb
from dotenv import load_dotenv

load_dotenv()

YANDEX_API_KEY = os.environ["YANDEX_API_KEY"]
DB_USER        = os.environ["DB_USER"]
DB_PASSWORD    = os.environ["DB_PASSWORD"]
DB_DSN         = os.environ["DB_DSN"]
WALLET_DIR     = os.environ.get("WALLET_DIR", "")  # путь к распакованному Wallet


def search_places(query: str, ll: str, spn: str = "0.5,0.5", results: int = 50):
    """Поиск через Яндекс Places API (Геопоиск организаций)."""
    url = "https://search-maps.yandex.ru/v1/"
    params = {
        "apikey": YANDEX_API_KEY,
        "text":    query,
        "lang":    "ru_RU",
        "ll":      ll,
        "spn":     spn,
        "results": results,
        "type":    "biz"
    }
    r = requests.get(url, params=params, timeout=10)
    r.raise_for_status()
    return r.json().get("features", [])


def insert_location(cursor, feature):
    """UPSERT торговой точки через Oracle MERGE."""
    coords = feature["geometry"]["coordinates"]
    props  = feature["properties"]
    meta   = props.get("CompanyMetaData", {})

    cursor.execute("""
        MERGE INTO locations tgt
        USING (SELECT :yid AS yandex_id FROM dual) src
        ON (tgt.yandex_id = src.yandex_id)
        WHEN NOT MATCHED THEN
            INSERT (name, chain_name, address, lat, lon, yandex_id)
            VALUES (:name, :chain, :address, :lat, :lon, :yid)
        WHEN MATCHED THEN
            UPDATE SET
                name       = :name,
                chain_name = :chain,
                address    = :address
    """, {
        "name":    props.get("name", "")[:500],
        "chain":   meta.get("name", "")[:255],
        "address": props.get("description", "")[:1000],
        "lat":     coords[1],
        "lon":     coords[0],
        "yid":     meta.get("id", "")[:100]
    })


def main():
    parser = argparse.ArgumentParser(description="Импорт точек из Яндекс Places в Oracle")
    parser.add_argument("--ll",    required=True, help="lon,lat центра (напр. 37.617,55.756)")
    parser.add_argument("--query", required=True, help="Поисковый запрос (напр. Пятёрочка)")
    parser.add_argument("--spn",   default="0.5,0.5", help="Размер области поиска в градусах")
    parser.add_argument("--limit", type=int, default=50, help="Макс. результатов (до 50)")
    args = parser.parse_args()

    # Подключение через Wallet (Thick mode) или без него (Thin mode)
    if WALLET_DIR:
        oracledb.init_oracle_client()
        conn = oracledb.connect(
            user=DB_USER, password=DB_PASSWORD, dsn=DB_DSN,
            config_dir=WALLET_DIR, wallet_location=WALLET_DIR, wallet_password=""
        )
    else:
        conn = oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=DB_DSN)

    with conn:
        with conn.cursor() as cur:
            print(f"Поиск: '{args.query}' в районе {args.ll}...")
            features = search_places(args.query, args.ll, args.spn, args.limit)
            print(f"Найдено: {len(features)} точек")

            inserted = 0
            for f in features:
                insert_location(cur, f)
                inserted += 1

            conn.commit()
            print(f"Импортировано/обновлено: {inserted} точек")


if __name__ == "__main__":
    main()
