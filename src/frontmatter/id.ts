import { Post } from "../types";


// get ID
export const id = (post: Post):string => {
	return post.data.post_id[0];
}
