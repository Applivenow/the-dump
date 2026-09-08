const FAPI = "https://fapi.bitunix.com";

function randomHex(n = 16) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signedCall(apiKey, apiSecret, method, path, query, body) {
  const nonce = randomHex(16);
  const timestamp = String(Date.now());
  const payload = body ? JSON.stringify(body) : "";
  const digest = await sha256Hex(nonce + timestamp + apiKey + (query ?? "") + payload);
  const sign = await sha256Hex(digest + apiSecret);
  const res = await fetch(`${FAPI}${path}${query ? `?${query}` : ""}`, {
    method,
    headers: {
      "api-key": apiKey,
      nonce,
      timestamp,
      sign,
      language: "en-US",
      "Content-Type": "application/json",
    },
    body: method === "GET" ? undefined : payload || undefined,
  });
  const json = await res.json();
  return { code: json?.code, msg: json?.msg, data: json?.data };
}

function credsOk(body) {
  return (
    typeof body?.apiKey === "string" && body.apiKey.length > 0 &&
    typeof body?.apiSecret === "string" && body.apiSecret.length > 0
  );
}

function symbolOk(s) {
  return typeof s === "string" && /^[A-Z0-9]{2,20}USDT$/.test(s);
}

function qtyOk(q) {
  const n = Number(q);
  return Number.isFinite(n) && n > 0;
}

export default async function (req) {
  try {
    const body = await req.json();
    if (!credsOk(body)) return Response.json({ error: "Missing API credentials" }, { status: 400 });
    const { apiKey, apiSecret } = body;

    if (body.op === "account") {
      const r = await signedCall(apiKey, apiSecret, "GET", "/api/v1/futures/account");
      return Response.json(r);
    }

    if (body.op === "positions") {
      const r = await signedCall(apiKey, apiSecret, "GET", "/api/v1/futures/position/get_pending_positions");
      return Response.json(r);
    }

    if (body.op === "openShort") {
      const symbol = String(body.symbol ?? "");
      const qty = String(body.qty ?? "");
      if (!symbolOk(symbol) || !qtyOk(qty)) return Response.json({ error: "Invalid symbol or qty" }, { status: 400 });
      const leverage = Math.min(50, Math.max(1, Number(body.leverage ?? 10)));
      await signedCall(apiKey, apiSecret, "POST", "/api/v1/futures/account/change_leverage", undefined, {
        symbol,
        leverage,
        marginMode: "ISOLATION",
      }).catch(() =>
        signedCall(apiKey, apiSecret, "POST", "/api/v1/futures/account/change_leverage", undefined, {
          symbol,
          leverage,
          marginMode: "ISOLATED",
        }),
      );
      const order = await signedCall(apiKey, apiSecret, "POST", "/api/v1/futures/trade/place_order", undefined, {
        symbol,
        side: "SELL",
        tradeSide: "OPEN",
        orderType: "MARKET",
        qty,
        reduceOnly: false,
      });
      if (order.code != null && String(order.code) !== "0") return Response.json(order);
      const slPrice = Number(body.slPrice);
      if (Number.isFinite(slPrice) && slPrice > 0) {
        const positions = await signedCall(apiKey, apiSecret, "GET", "/api/v1/futures/position/get_pending_positions").catch(() => null);
        const rows = Array.isArray(positions?.data) ? positions.data : [];
        const pos = rows.find((p) => p && p.symbol === symbol);
        if (pos?.positionId) {
          await signedCall(apiKey, apiSecret, "POST", "/api/v1/futures/tpsl/position/place_order", undefined, {
            symbol,
            positionId: String(pos.positionId),
            slPrice: String(slPrice),
            slStopType: "LAST_PRICE",
          }).catch(() => null);
        }
      }
      return Response.json(order);
    }

    if (body.op === "flatten") {
      const positionId = String(body.positionId ?? "");
      if (!positionId) return Response.json({ error: "Missing positionId" }, { status: 400 });
      const r = await signedCall(apiKey, apiSecret, "POST", "/api/v1/futures/trade/flash_close_position", undefined, {
        positionId,
      });
      return Response.json(r);
    }

    if (body.op === "scale") {
      const symbol = String(body.symbol ?? "");
      const qty = String(body.qty ?? "");
      if (!symbolOk(symbol) || !qtyOk(qty)) return Response.json({ error: "Invalid symbol or qty" }, { status: 400 });
      const r = await signedCall(apiKey, apiSecret, "POST", "/api/v1/futures/trade/place_order", undefined, {
        symbol,
        side: "BUY",
        tradeSide: "CLOSE",
        orderType: "MARKET",
        qty,
        reduceOnly: true,
      });
      return Response.json(r);
    }

    return Response.json({ error: "Unknown op" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error?.message || "Trade proxy failed" }, { status: 500 });
  }
}