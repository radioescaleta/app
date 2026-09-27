const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('response', response => {
        if (response.url().includes('.mp3')) {
            console.log("FOUND MP3 URL:", response.url());
        }
    });
    await page.goto('https://soundtools.io/soundboard/', {waitUntil: 'networkidle0'});
    await browser.close();
})();
