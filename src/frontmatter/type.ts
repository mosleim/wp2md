// get type, often this will always be "post"

import { Post } from "../types";



// get simple post title, but not decoded like other frontmatter string fields
export const type = (post: Post):string => {
	return post.data.post_type[0];
}
