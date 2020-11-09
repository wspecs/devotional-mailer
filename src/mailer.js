const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const {serialize, deserialize} = require("serializr");
const adapter = new FileSync('db.json');
const db = low(adapter);
const {getEmailForToday, getKeyForToday} = require('./post');
db.defaults({ subscribers: [], notications: {}}).write();
const crypto = require('crypto');
const nodemailer = require("nodemailer");
require('dotenv').config();

const transporter = nodemailer.createTransport({
	host: "box.wspecs.com",
	port: 587,
	secure: false, // true for 465, false for other ports
	auth: {
		user: process.env.MAIL_USER,
		pass: process.env.MAIL_AUTH,
	},
});

function skipEmailing() {
	return +new Date().toISOString().substr(11, 2) < 15
}

async function sendNotification(email, text, html) {
	const emailHash = crypto.createHash('sha1').update(email + getKeyForToday()).digest('base64');
	if (db.has(`notications.${emailHash}`).value()) {
		console.log('skipping sending email.')
		return;
	}
	await transporter.sendMail({
		from: `"Devotional Reading" <${process.env.MAIL_USER}>`,
		to: email,
		subject: `${getKeyForToday()} - Devotional Reading`,
		text,
		html
  });
	db.set(`notications.${emailHash}`, 1).write();
}

async function sendNotifications() {
	if (skipEmailing()) {
		console.log("It's not time to send the email");
		return;
	}

	const {text, html} = await getEmailForToday();
	if (!text) {
		console.log('no email content found.')
		return;
	}
	for (const email of db.get('subscribers').value()) {
		await sendNotification(email, text, html);
	}
}
		
(async() => {
	await sendNotifications();
})();

module.exports = {};