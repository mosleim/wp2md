import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import {config, Export, Item, Post, PostImage, PostType} from './types'
import { getPostContent, initTurndownService } from './translator';
import { dateOfItem, getFilenameFromUrl } from './utils';
import { frontmatter_fields } from './settings';
import * as frontmatter from './frontmatter';
import { DateTime } from 'luxon';

export async function parseFilePromise():Promise<Post[]> {
	console.log('\nParsing...');
	const content = await fs.promises.readFile(config.input, 'utf8');
	const allData = await xml2js.parseStringPromise(content, {
		trim: true,
		tagNameProcessors: [xml2js.processors.stripPrefix]
	}).then(data => data as Export);

	const channelData = allData.rss.channel[0].item;

	const postTypes = getPostTypes(channelData);
	const posts = collectPosts(channelData, postTypes);

	const images: PostImage[] = [];
	if (config.saveAttachedImages) {
		images.push(...collectAttachedImages(channelData));
	}
	if (config.saveScrapedImages) {
		images.push(...collectScrapedImages(channelData, postTypes));
	}
	
	mergeImagesIntoPosts(images, posts);
	populatePosts(posts);
	populateFrontmatter(posts);

	return posts;
}

function getPostTypes(channelData: Item[]):PostType[] {
	if (config.includeOtherTypes) {
		// search export file for all post types minus some default types we don't want
		// effectively this will be 'post', 'page', and custom post types
		const types = channelData
			.map(item => item.post_type[0])
			.filter(type => !['attachment', 'revision', 'nav_menu_item', 'custom_css', 'customize_changeset', 'et_body_layout','et_footer_layout','et_header_layout','et_pb_layout','et_template', 'wp_global_styles'].includes(type));
		return [...new Set(types)]; // remove duplicates
	} else {
		return ['post'];
	}
}

function getItemsOfType(channelData: Item[], type: PostType) {
	return channelData.filter(item => item.post_type[0] === type);
}

function collectPosts(channelData: Item[], postTypes: PostType[]) {
	// this is passed into getPostContent() for the markdown conversion

	let allPosts: Post[] = [];
	postTypes.forEach(postType => {
		const postsForType: Post[] = getItemsOfType(channelData, postType)
			.filter(postData => postData.status[0] !== 'trash' && postData.status[0] !== 'draft')
			.map<Post>(postData => ({
				// raw post data, used by frontmatter getters
				data: postData,

				// meta data isn't written to file, but is used to help with other things
				meta: {
					id: getPostId(postData),
					slug: getPostSlug(postData),
					coverImageId: getPostCoverImageId(postData),
					type: postType,
					imageUrls: [], // possibly set later in mergeImagesIntoPosts()
					date: dateOfItem(postData),
				},
				// contents of the post in markdown
				// content: getPostContent(postData, turndownService),
				frontmatter: {}
			}));

		if (postTypes.length > 1) {
			console.log(`${postsForType.length} "${postType}" posts found.`);
		}

		allPosts.push(...postsForType);
	});

	if (postTypes.length === 1) {
		console.log(allPosts.length + ' posts found.');
	}
	return allPosts;
}



function getPostId(postData: Item) {
	return postData.post_id[0];
}

function getPostSlug(postData: Item) {
	return decodeURIComponent(postData.post_name[0]);
}

function getPostCoverImageId(postData: Item) {
	if (postData.postmeta === undefined) {
		return undefined;
	}

	const postmeta = postData.postmeta.find(postmeta => postmeta.meta_key[0] === '_thumbnail_id');
	const id = postmeta ? postmeta.meta_value[0] : undefined;
	return id;
}


function collectAttachedImages(channelData: Item[]): PostImage[] {
	const images:PostImage[] = getItemsOfType(channelData, 'attachment')
		// filter to certain image file types
		.filter(attachment => attachment.attachment_url && (/\.(gif|jpe?g|png|webp)$/i).test(attachment.attachment_url[0]))
		.map(attachment => ({
			id: attachment.post_id[0],
			postId: attachment.post_parent[0],
			url: (attachment.attachment_url??[''])[0]
		}));

	console.log(images.length + ' attached images found.');
	return images;
}


function collectScrapedImages(channelData: Item[], postTypes: PostType[]) {
	const images: PostImage[] = [];
	postTypes.forEach(postType => {
		getItemsOfType(channelData, postType).forEach(postData => {
			const postId = postData.post_id[0];
			const postContent = postData.encoded[0];
			const postLink = postData.link[0];

			const matches = [...postContent.matchAll(/<img[^>]*src="(.+?\.(?:gif|jpe?g|png|webp))"[^>]*>/gi)];
			matches.forEach(match => {
				// base the matched image URL relative to the post URL
				const url = new URL(match[1], postLink).href;
				images.push({
					id: -1,
					postId: postId,
					url
				});
			});
		});
	});

	console.log(images.length + ' images scraped from post body content.');
	return images;
}
function populatePosts(posts:Post[]) {
	const turndownService = initTurndownService();
	posts.forEach(post=>{
		post.content= getPostContent(post, turndownService);
	})
}
function mergeImagesIntoPosts(images: PostImage[], posts: Post[]) {
	images.forEach(image => {
		posts.forEach(post => {
			let shouldAttach = false;

			// this image was uploaded as an attachment to this post
			if (image.postId === post.meta.id) {
				shouldAttach = true;
			}

			// this image was set as the featured image for this post
			if (image.id === post.meta.coverImageId) {
				shouldAttach = true;
				post.coverImage = getFilenameFromUrl(image.url);
			}

			if (shouldAttach && !post.meta.imageUrls.includes(image.url)) {
				post.meta.imageUrls.push(image.url);
			}
		});
	});
}

function populateFrontmatter(posts: Post[]) {
	// Membuat `Record` dari semua fungsi yang diekspor
	const frontmatterGetters: Record<string, (post:Post)=>string|string[]|DateTime > = {};

	// Memasukkan semua fungsi ke dalam `functionsRecord`
	for (const key of Object.keys(frontmatter) as Array<keyof typeof frontmatter>) {
		if (typeof frontmatter[key] === "function") {
			frontmatterGetters[key] = frontmatter[key] as (post:Post)=>string|string[];
		}
	}

	posts.forEach(post => {
		const frontmatter:Record<string, string|string[]|DateTime> = {};
		frontmatter_fields.forEach(field => {
			const [key, alias] = field.split(':');
			let frontmatterGetter = frontmatterGetters[key];
			if (!frontmatterGetter) {
				throw `Could not find a frontmatter getter named "${key}".`;
			}

			frontmatter[alias || key] = frontmatterGetter(post)
		});
		post.frontmatter = frontmatter;
	});
}
