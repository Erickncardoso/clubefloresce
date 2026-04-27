const fetch = require('node-fetch');

async function test() {
  const url = "https://erickcardoso.uazapi.com/instance/fetchInstances";
  const apiKey = "9OMzgvPg59oYagHnqEsg385kG3BZP386EjGkkCrz0tCSpEbkAi";
  
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "apikey": apiKey }
    });
    console.log("Status fetchInstances:", res.status);
    console.log(await res.text());
  } catch(e) {
    console.error(e);
  }
}

test();
