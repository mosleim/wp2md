// get cover image filename, previously decoded and set on post.meta

import path from "path";
import { Post } from "../types";
import { getPostPath } from "../utils";


// this one is unique as it relies on special logic executed by the parser
export const image = (post: Post):string => {
	if(post.coverImage){
		const pathImg = path.join(getPostPath(post, true, true), post.coverImage);
		return pathImg;
	}
	return ''
};
