const {getConfig} = require('./config');
const got = require('got');
const fs = require('fs');
const cherio = require('cheerio');

function getKeyForToday() {
	return new Date().toISOString().slice(0,10);
}

async function getPostForToday() {
	const link = getConfig().post[getKeyForToday()];
	if (link == null) {
		return;
	}
	const {body} = await got(link);
	return body;
}

async function getEmailForToday() {
	const post = await getPostForToday();
	const $ = cherio.load(post);
	const meteredContent = cherio.load($('article.meteredContent').html());
	const elems = meteredContent('h1,h2,blockquote,p');
	const output = [];
	const text = [];
	$(elems).each((_, x) => {
		if (x.tagName === 'p' && x.parent.tagName === 'blockquote') {
			return;
		}
		const html = $(x).html().replace(/<\s*([a-z][a-z0-9]*)\s.*?>/gi, '<$1>');
		output.push(`<${x.tagName}>${html}</${x.tagName}>`);
		text.push(`${$(x).text()}\n`);
	})
	return {text: text.join(''), html: output.join('')};
}

module.exports = {
	getEmailForToday,
	getKeyForToday
};