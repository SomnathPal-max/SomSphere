const cheerio = require('cheerio');

fetch('https://www.jiscollege.ac.in/notice-board.php')
  .then(res => res.text())
  .then(html => {
    const $ = cheerio.load(html);
    const notices = [];
    $('a').each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href');
      if (text && href && (href.includes('pdf') || href.includes('notice'))) {
        notices.push({ text, href });
      }
    });
    console.log(notices.slice(0, 10));
  });
