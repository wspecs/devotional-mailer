const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const {serialize, deserialize} = require("serializr");
const adapter = new FileSync('db.json');
const db = low(adapter);
const {getEmailForToday, getKeyForToday, getLinkForToday} = require('./post');
db.defaults({ subscribers: [], notications: {}}).write();
const crypto = require('crypto');
const nodemailer = require("nodemailer");
const axios = require('axios');
require('dotenv').config();

const WAIT_INTERVAL_BETWEEN_EMAIL_MS = 2000;
const LINK_FOR_DEVOTIONAL = getLinkForToday();

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

function getPhoneNumber(email) {
	const phoneNumber = parseInt(email.toString().replace(/( |-|\(|\))/g, ''));
	if (Number.isFinite(phoneNumber)) {
		return phoneNumber;
	}
	return null;
}

function sendTextNotification(phoneNumber, message) {
	console.log('sending text reminder');
  if (process.env.DRY_RUN_NOTIFICATION === 'yes') {
    console.log(phoneNumber, message);
    return;
  }
  axios.post(process.env.TEXT_URL, {
    number: phoneNumber,
    api_key: process.env.TEXT_API_KEY,
    message,
  }).catch(error => {
		console.error(error);
	})
}

async function sendNotification(email, text, html) {
	const emailHash = crypto.createHash('sha1').update(email + getKeyForToday()).digest('base64');
	if (db.has(`notications.${emailHash}`).value()) {
		console.log('skipping sending email.')
		return;
	}
	const phoneNumber = getPhoneNumber(email);
	if (phoneNumber) {
		sendTextNotification(phoneNumber, `Devotional Reading for ${getKeyForToday()} (${LINK_FOR_DEVOTIONAL})`);
	} else {
		await transporter.sendMail({
			from: `"Devotional Reading" <${process.env.MAIL_USER}>`,
			to: email,
			subject: `${getKeyForToday()} - Devotional Reading`,
			text,
			html
		});
	}
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
		return
	}
	for (const email of db.get('subscribers').value()) {
		await sendNotification(email, text, html);
		await new Promise(resolve => setTimeout(resolve, WAIT_INTERVAL_BETWEEN_EMAIL_MS));
	}
}
		
(async() => {
	await sendNotifications();
})();

module.exports = {};
