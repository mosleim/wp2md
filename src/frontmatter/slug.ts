import { Post } from "../types";


// get slug, previously decoded and set on post.meta
export const slug = (post: Post):string => {
	return post.meta.slug;
};
