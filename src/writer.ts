import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import chalk from 'chalk';
import fs from 'fs';
import http from 'http';
import https from 'https';
import luxon, { DateTime } from 'luxon';
import path, { dirname } from 'path';

import * as settings from './settings';
import * as utils from './utils';
import { config, Post } from './types';
import { getFilenameFromUrl, getPostPath } from './utils';

export async function writeFilesPromise(posts: Post[]) {
	await writeMarkdownFilesPromise(posts);
	await writeImageFilesPromise(posts);
}

type Payload<T extends Post|string> = {
    item: T;
    name: string;
    destinationPath: string;
    delay: number;
}

async function processPayloadsPromise<T extends Post|string>(
	payloads: Payload<T>[],
	loadFunc: (post: T) => Promise<string>| Promise<Buffer>,
) {
	const promises = payloads.map(payload => new Promise((resolve, reject) => {
		setTimeout(async () => {
			try {
				const data = await loadFunc(payload.item);
				await writeFile(payload.destinationPath, data);
				console.log(chalk.green('[OK]') + ' ' + payload.name);
				resolve(null);
			} catch (ex) {
				console.log(chalk.red('[FAILED]') + ' ' + payload.name + ' ' + chalk.red('(' + ex + ')'));
				reject();
			}
		}, payload.delay);
	}));

	const results = await Promise.allSettled(promises);
	const failedCount = results.filter(result => result.status === 'rejected').length;
	if (failedCount === 0) {
		console.log('Done, got them all!');
	} else {
		console.log('Done, but with ' + chalk.red(failedCount + ' failed') + '.');
	}
}

async function writeFile(destinationPath: string, data: string| Buffer) {
	await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
	await fs.promises.writeFile(destinationPath, data);
}

async function writeMarkdownFilesPromise(posts: Post[]) {
	// package up posts into payloads
	let skipCount = 0;
	let delay = 0;
	const payloads = posts.flatMap(post => {
		const destinationPath =  getPostPath(post, false, false);
		if (checkFile(destinationPath)) {
			// already exists, don't need to save again
			skipCount++;
			return [];
		} else {
			const payload:Payload<Post> = {
				item: post,
				name: (config.includeOtherTypes ? post.meta.type + ' - ' : '') + post.meta.slug,
				destinationPath,
				delay
			};
			delay += settings.markdown_file_write_delay;
			return [payload];
		}
	});

	const remainingCount = payloads.length;
	if (remainingCount + skipCount === 0) {
		console.log('\nNo posts to save...');
	} else {
		console.log(`\nSaving ${remainingCount} posts (${skipCount} already exist)...`);
		await processPayloadsPromise(payloads, loadMarkdownFilePromise);
	}
}

async function loadMarkdownFilePromise(post: Post) {
	let output = '---\n';

	Object.entries(post.frontmatter).forEach(([key, value]) => {
		let outputValue;
		if (Array.isArray(value)) {
			if (value.length > 0) {
				// array of one or more strings
				outputValue = value.reduce((list, item) => `${list}\n  - "${item}"`, '');
			}
		}else if(value instanceof DateTime){
			outputValue = value.toISO()
		} 
		else {
			// single string value
			const escapedValue = (value || '').replace(/"/g, '\\"');
			if (escapedValue.length > 0) {
				outputValue = `"${escapedValue}"`;
			}
		}

		if (outputValue !== undefined) {
			output += `${key}: ${outputValue}\n`;
		}
	});

	output += `---\n\n${post.content}\n`;
	return output;
}

async function writeImageFilesPromise(posts: Post[]) {
	// collect image data from all posts into a single flattened array of payloads
	let skipCount = 0;
	let delay = 0;
	const payloads = posts.flatMap(post => {
		const postPath = getPostPath(post, true, false);
		
		return post.meta.imageUrls.flatMap(imageUrl => {
			const filename = getFilenameFromUrl(imageUrl);
			const destinationPath = path.join(postPath, filename);
			
			if (checkFile(destinationPath)) {
				// already exists, don't need to save again
				skipCount++;
				return [];
			} else {
				const payload: Payload<string> = {
					item: imageUrl,
					name: filename,
					destinationPath,
					delay
				};
				delay += settings.image_file_request_delay;
				return [payload];
			}
		});
	});

	const remainingCount = payloads.length;
	if (remainingCount + skipCount === 0) {
		console.log('\nNo images to download and save...');
	} else {
		console.log(`\nDownloading and saving ${remainingCount} images (${skipCount} already exist)...`);
		await processPayloadsPromise(payloads, loadImageFilePromise);
	}
}

async function loadImageFilePromise(imageUrl: string){
	// only encode the URL if it doesn't already have encoded characters
	const url = (/%[\da-f]{2}/i).test(imageUrl) ? imageUrl : encodeURI(imageUrl);

	const config: AxiosRequestConfig = {
		method: 'get',
		url,
		headers: {
			'User-Agent': 'wordpress-export-to-markdown'
		},
		responseType: 'arraybuffer'
	};

	if (!settings.strict_ssl) {
		// custom agents to disable SSL errors (adding both http and https, just in case)
		config.httpAgent = new https.Agent({ rejectUnauthorized: false });
		config.httpsAgent = new https.Agent({ rejectUnauthorized: false });
	}

	try {
		const response = await axios(config);
		return Buffer.from(response.data, 'binary');
	} catch (ex) {
		if (ex instanceof AxiosError && ex.response) {
			throw 'StatusCodeError: ' + ex.response.status;
		} else {
			throw ex;
		}
	}

	
}


function checkFile(path: string) {
	return fs.existsSync(path);
}


export default writeFilesPromise;
