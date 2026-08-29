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

    const network = [];
    const failed = [];
    const candidates = [];

    page.on('requestfailed', request => {
      failed.push({
        url: request.url(),
        method: request.method(),
        error: request.failure()?.errorText || 'request failed'
      });
    });

    page.on('response', async response => {
      const responseUrl = response.url();

      if (!/vote4dance/i.test(responseUrl)) return;

      const contentType =
        response.headers()['content-type'] || '';

      network.push({
        url: responseUrl,
        status: response.status(),
        method: response.request().method(),
        contentType
      });

      if (
        /application\/json|text\/json/i.test(contentType) ||
        /api\.vote4dance\.com/i.test(responseUrl)
      ) {
        try {
          const text = await response.text();

          if (!text || text.length > 2000000) return;

          let data;

          try {
            data = JSON.parse(text);
          } catch {
            return;
          }

          candidates.push({
            url: responseUrl,
            status: response.status(),
            data
          });
        } catch {}
      }
    });

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    await new Promise(resolve => setTimeout(resolve, 7000));

    const finalUrl = page.url();
    const title = await page.title();

    const bodyText = await page.evaluate(() =>
      document.body?.innerText?.trim() || ''
    );

    return res.status(200).json({
      ok: true,
      mode: /\/results\/\d+(?:[/?#]|$)/i.test(url)
        ? 'direct-result'
        : 'results',
      finalUrl,
      title,
      candidates,
      network,
      failed,
      bodyText: bodyText.slice(0, 50000)
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
