
import * as  settings from './settings';
import {DateTime} from 'luxon';
import path from 'path';
import { config, Item, Post } from './types';

export function getFilenameFromUrl(url: string) {
	let filename = url.split('/').slice(-1)[0];
	try {
		filename = decodeURIComponent(filename)
	} catch (ex) {
		// filename could not be decoded because of improper encoding with %
		// leave filename as-is and continue
	}
	return filename;
}



export function getPostPath(post: Post,  isImage: boolean=false, asAssets =false) {
	let dt;
	if (settings.custom_date_formatting) {
		dt = DateTime.fromFormat(post.meta.date, settings.custom_date_formatting);
	} else {
		dt = DateTime.fromISO(post.meta.date);
	}

	// start with base output dir
	const pathSegments:string[] = [];
	
	asAssets?pathSegments.push("~/assets"): pathSegments.push(config.output)

	// create segment for post type if we're dealing with more than just "post"
	if (isImage) {
		pathSegments.push('images');
	}

	// create segment for post type if we're dealing with more than just "post"
	if (config.includeOtherTypes) {
		pathSegments.push(post.meta.type);
	}

	if (config.yearFolders) {
		pathSegments.push(dt.toFormat('yyyy'));
	}

	if (config.monthFolders) {
		pathSegments.push(dt.toFormat('LL'));
	}

	if (isImage) return path.join(...pathSegments)
	// create slug fragment, possibly date prefixed
	let slugFragment = post.meta.slug;
	if (config.prefixDate) {
		slugFragment = dt.toFormat('yyyy-LL-dd') + '-' + slugFragment;
	}

	// use slug fragment as folder or filename as specified
	if (config.postFolders) {
		pathSegments.push(slugFragment, 'index.md');
	} else {
		pathSegments.push(slugFragment + '.md');
	}

	return path.join(...pathSegments);
}

export const dateOfItem = (item:Item)=>{
	
	const dateTime = DateTime.fromRFC2822(item.pubDate[0], { zone: settings.custom_date_timezone });
	console.log(dateTime.toISODate());

	if (settings.custom_date_formatting) {
		return dateTime.toFormat(settings.custom_date_formatting);
	} else if (settings.include_time_with_date) {
		return dateTime.toISO()??'';
	} 
	return dateTime.toISODate()??'';
}
