import { Post } from "../types";


// get simple post title, but not decoded like other frontmatter string fields
export const title = (post: Post):string => {
	return post.data.title[0];
};
