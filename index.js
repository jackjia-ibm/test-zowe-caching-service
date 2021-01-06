const https = require('https');
const util = require('util');
const fs = require('fs');
const axios = require('axios');

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
const hostname = "vm30101.svl.ibm.com";
const GATEWAY_PORT = 7554;
const GATEWAY_AUTH_URL = '/api/v1/gateway/auth/login';
const CACHING_SERVICE_URL = '/api/v1/cachingservice/cache';

const clientOptions = {
  cert: fs.readFileSync(`${__dirname}/keystore/localhost/localhost.keystore.cer`),
  key: fs.readFileSync(`${__dirname}/keystore/localhost/localhost.keystore.key-88591`),
};

const csq = axios.create({
  // keepAlive: false,
  baseURL: `https://${hostname}:${GATEWAY_PORT}/`,
  timeout: 10000,
  headers: {
    'Connection': 'Keep-Alive',
    'Accept-Encoding': 'gzip,deflate',
    'X-CSRF-ZOSMF-HEADER': '*'
  },
});

let apimlToken;

const request = async (method, url, opts) => {
  let response;
  let result = [];

  try {
    result.push(`>>>> ${method} ${url}`);
    if (apimlToken) {
      if (!opts) {
        opts = {};
      }
      if (!opts.headers) {
        opts.headers = {};
      }
      opts.headers['Cookie'] = apimlToken;
    }
    if (opts){
      result.push(`     ${JSON.stringify(opts)}`);
    }
    response = await csq.request({ method, url, ...opts });
  } catch (e) {
    result.push(`---- ${e.stack}`);
    response = e.response;
  }

  if (response) {
    result.push(`<<<< ${response.status}`);
    result.push(JSON.stringify(response.headers, null, 2));
    if (response.headers['set-cookie'] && response.headers['set-cookie'][0]) {
      apimlToken = response.headers['set-cookie'][0];
    }
    result.push(JSON.stringify(response.data, null, 2));
  }

  return result.join("\n");
}

(async () => {
  let result = [];

  // client certificate login
  // result.push(await request('post', GATEWAY_AUTH_URL, {
  //   rejectUnauthorized: false,
  //   httpsAgent: new https.Agent(clientOptions),
  // }));

  // regular login
  result.push(await request('post', GATEWAY_AUTH_URL, {
    data: {
      username: process.env.TEST_AUTH_USER,
      password: process.env.TEST_AUTH_PASSWORD,
    },
  }));

  // list all keys
  result.push(await request('get', `${CACHING_SERVICE_URL}`));

  // create key
  result.push(await request('post', `${CACHING_SERVICE_URL}`, {
    data: {
      key: 'test1',
      value: 'value1'
    },
    headers: {
      'Content-Type': 'application/json',
    },
  }));

  // list all keys
  result.push(await request('get', `${CACHING_SERVICE_URL}`));

  // check value
  result.push(await request('get', `${CACHING_SERVICE_URL}/test1`));

  // update
  result.push(await request('put', `${CACHING_SERVICE_URL}`, {
    data: {
      key: 'test1',
      value: 'value1-updated'
    },
    headers: {
      'Content-Type': 'application/json',
    },
  }));

  // check value
  result.push(await request('get', `${CACHING_SERVICE_URL}/test1`));

  // check value
  result.push(await request('get', `${CACHING_SERVICE_URL}/test2`));

  // update
  result.push(await request('put', `${CACHING_SERVICE_URL}`, {
    data: {
      key: 'test2',
      value: 'value2'
    },
    headers: {
      'Content-Type': 'application/json',
    },
  }));

  // check value
  result.push(await request('get', `${CACHING_SERVICE_URL}/test2`));

  console.log(result.join("\n\n"));
})();
