import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const config = { maxDuration: 60 };

chromium.setGraphicsMode = false;

export default async function handler(req, res) {
  let browser;

  try {
    const url = String(req.query?.url || '').trim();

    if (
      !/^https?:\/\/(?:www\.)?vote4dance\.com\/public\/event\/\d+\/comp\/\d+\/results(?:\/\d+)?(?:[/?#].*)?$/i.test(url)
    ) {
      return res.status(400).json({
        ok: false,
        error: 'Ogiltig Vote4Dance-resultatlänk.'
      });
    }

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        width: 390,
        height: 844,
        deviceScaleFactor: 1
      },
      executablePath: await chromium.executablePath(),
      headless: 'shell'
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
    );

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    await new Promise(resolve => setTimeout(resolve, 7000));

    const debug = await page.evaluate(() => {
      const text = el => (el?.innerText || el?.textContent || '').trim();

      const tables = [...document.querySelectorAll('table')].map((table, i) => ({
        index: i,
        text: text(table).slice(0, 12000),
        html: table.outerHTML.slice(0, 25000),
        rows: [...table.querySelectorAll('tr')].map((tr, ri) => ({
          row: ri,
          text: text(tr),
          cells: [...tr.querySelectorAll('th,td')].map((cell, ci) => ({
            cell: ci,
            text: text(cell),
            html: cell.outerHTML.slice(0, 3000)
          }))
        }))
      }));

      const links = [...document.querySelectorAll('a')]
        .map(a => ({
          text: text(a),
          href: a.href
        }))
        .filter(x => x.text || x.href);

      const interesting = [...document.querySelectorAll('body *')]
        .map((el, i) => {
          const t = text(el);
          const cls =
            typeof el.className === 'string'
              ? el.className
              : el.getAttribute('class') || '';

          return {
            i,
            tag: el.tagName,
            id: el.id || '',
            className: cls,
            text: t.slice(0, 1000)
          };
        })
        .filter(x =>
          x.text &&
          (
            /391|372|397|382|403|343|369|411|357|407|405|338/.test(x.text) ||
            /plac|sum|final|kvarts|ranking|omdans/i.test(x.text)
          )
        )
        .slice(0, 500);

      return {
        title: document.title,
        bodyText: text(document.body).slice(0, 50000),
        tables,
        links: links.slice(0, 500),
        interesting
      };
    });

    return res.status(200).json({
      ok: true,
      mode: 'dom-debug',
      finalUrl: page.url(),
      ...debug
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || String(error)
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}
