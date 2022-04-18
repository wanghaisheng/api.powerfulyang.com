import { Injectable } from '@nestjs/common';
import { parseString } from 'xml2js';
import type { RequestInit } from 'node-fetch';
import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';

@Injectable()
export class ProxyFetchService {
  private readonly agent;

  constructor() {
    /**
     * 如果没有代理设置 则不使用代理
     */
    if (process.env.BOT_SOCKS5_PROXY_HOST && process.env.BOT_SOCKS5_PROXY_PORT) {
      this.agent = new SocksProxyAgent({
        hostname: process.env.BOT_SOCKS5_PROXY_HOST,
        port: process.env.BOT_SOCKS5_PROXY_PORT,
        type: 5,
      });
    }
  }

  getAgent() {
    return this.agent;
  }

  proxyFetch(url: string, draft: RequestInit = {}) {
    draft.agent = this.agent;
    draft.timeout = 10000;
    return fetch(url, draft);
  }

  async proxyFetchJson<T>(url: string, draft: RequestInit = {}): Promise<T> {
    const res = await this.proxyFetch(url, draft);
    return (await res.json()) as Promise<T>;
  }

  async proxyFetchJsonFromRss<T>(rssUrl: string, draft: RequestInit = {}): Promise<T> {
    const res = await this.proxyFetch(rssUrl, draft);
    const content = await res.text();
    return new Promise((resolve, reject) => {
      parseString(content, (err, json) => {
        if (err) {
          reject(err);
        }
        resolve(json);
      });
    });
  }
}
