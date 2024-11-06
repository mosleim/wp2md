import { Post } from "../types";

import {filter_categories} from '../settings';

// get array of decoded category names, filtered as specified in settings
export const categories = (post: Post):string[]=>{
	if (!post.data.category) {
		return [];
	}

	const categories = post.data.category
		.filter(category => category.$.domain === 'category')
		.map(({ $: attributes }) => decodeURIComponent(attributes.nicename));

	return categories.filter(category => !filter_categories.includes(category));
}