import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import "dotenv/config";

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PORT } = process.env;
const base = "https://api-m.sandbox.paypal.com";
const app = express();

app.use(cors());
app.use(express.json());

export const generateAccessToken = async () => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("MISSING_API_CREDENTIALS");
    }
    const auth = Buffer.from(
      PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET
    ).toString("base64");
    const response = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Failed to generate Access Token:", error);
  }
};

function getTotal(total, item) {
  return total + item.price;
}

export const createOrder = async (cart, shipping_address) => {
  const total = cart.reduce(getTotal, 0);
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders`;
  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: total,
        },
        shipping: {
          type: "SHIPPING",
          address: {
            address_line_1: "1234 Main St.",
            admin_area_2: "Anytown",
            admin_area_1: "CA",
            postal_code: "12345",
            country_code: "US",
          },
        },
      },
    ],
    payment_source: {
      paypal: {
        address: {       
          address_line_1: "12345 Main St.",
          admin_area_2: "Anytown",
          admin_area_1: "CA",
          postal_code: "12345",
          country_code: "US",
        },
      },
    },
  };

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    method: "POST",
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
};

export const captureOrder = async (orderID) => {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders/${orderID}/capture`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return handleResponse(response);
};

async function handleResponse(response) {
  try {
    const jsonResponse = await response.json();
    return {
      jsonResponse,
      httpStatusCode: response.status,
    };
  } catch (err) {
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
}

app.listen(PORT, () => {
    console.log(`Node server listening at http://localhost:${PORT}/`);
  });
  
export default app;