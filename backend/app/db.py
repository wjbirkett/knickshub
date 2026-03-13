import logging
import httpx
logger = logging.getLogger(__name__)

def get_supabase():
    from app.config import settings
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        logger.warning("Supabase credentials not set — DB features disabled.")
        return None
    return SupabaseHTTPClient(settings.SUPABASE_URL, settings.SUPABASE_KEY)

class SupabaseHTTPClient:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    def table(self, name: str):
        return SupabaseTable(self.url, self.headers, name)

class SupabaseTable:
    def __init__(self, url: str, headers: dict, table: str):
        self.url = url
        self.headers = headers
        self.table_name = table
        self._select = "*"
        self._filters = {}
        self._order = None
        self._limit = None
        self._desc = False

    def select(self, cols="*"):
        self._select = cols
        return self

    def eq(self, col, val):
        self._filters[col] = f"eq.{val}"
        return self

    def order(self, col, desc=False):
        self._order = col
        self._desc = desc
        return self

    def limit(self, n):
        self._limit = n
        return self

    def single(self):
        self._limit = 1
        return self

    def execute(self):
        params = f"select={self._select}"
        for col, val in self._filters.items():
            params += f"&{col}={val}"
        if self._order:
            params += f"&order={self._order}.{'desc' if self._desc else 'asc'}"
        if self._limit:
            params += f"&limit={self._limit}"
        r = httpx.get(
            f"{self.url}/rest/v1/{self.table_name}?{params}",
            headers=self.headers
        )
        r.raise_for_status()
        data = r.json()
        if isinstance(data, list) and self._limit == 1:
            data = data[0] if data else None
        return type("Result", (), {"data": data})()

    def upsert(self, data: dict, on_conflict: str = None):
        headers = {**self.headers, "Prefer": f"resolution=merge-duplicates,return=representation"}
        r = httpx.post(
            f"{self.url}/rest/v1/{self.table_name}",
            headers=headers,
            json=data
        )
        r.raise_for_status()
        return type("Result", (), {"data": r.json()})()

    def delete(self):
        return self

    def eq_delete(self, col, val):
        r = httpx.delete(
            f"{self.url}/rest/v1/{self.table_name}?{col}=eq.{val}",
            headers=self.headers
        )
        r.raise_for_status()
        return type("Result", (), {"data": r.json()})()