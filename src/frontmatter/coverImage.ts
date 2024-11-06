// get cover image filename, previously decoded and set on post.meta

import { Post } from "../types";


// this one is unique as it relies on special logic executed by the parser
export const coverImage = (post: Post):string => {
	return post.coverImage??'';
};
