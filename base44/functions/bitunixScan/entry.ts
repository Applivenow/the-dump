const FAPI = "https://fapi.bitunix.com";
const LIST_URL =
  "https://support.bitunix.com/api/v2/help_center/en-us/sections/13762037166105/articles.json?page=1&per_page=20";
const DELIST_URL =
  "https://support.bitunix.com/api/v2/help_center/en-us/sections/13762038956057/articles.json?page=1&per_page=10";

export default async function (req) {
  try {
    const body = await req.json();
    const endpoint = body?.endpoint;

    if (endpoint === "tickers") {
      const res = await fetch(`${FAPI}/api/v1/futures/market/tickers`, {
        headers: { Accept: "application/json" },
      });
      const json = await res.json();
      return Response.json(json);
    }

    if (endpoint === "kline") {
      const symbol = encodeURIComponent(String(body?.symbol ?? ""));
      const interval = String(body?.interval ?? "4h");
      const limit = Number(body?.limit ?? 12);
      const url = `${FAPI}/api/v1/futures/market/kline?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const json = await res.json();
      return Response.json(json);
    }

    if (endpoint === "listings") {
      const [listRes, delistRes] = await Promise.all([
        fetch(LIST_URL, { headers: { Accept: "application/json" } })
          .then((r) => r.json())
          .catch(() => ({ articles: [] })),
        fetch(DELIST_URL, { headers: { Accept: "application/json" } })
          .then((r) => r.json())
          .catch(() => ({ articles: [] })),
      ]);
      const articles = [
        ...((listRes && listRes.articles) || []),
        ...((delistRes && delistRes.articles) || []),
      ].slice(0, 20);
      return Response.json({ articles });
    }

    return Response.json({ error: "Unknown endpoint" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error?.message || "Proxy failed" }, { status: 500 });
  }
}